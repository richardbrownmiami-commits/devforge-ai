// Ara Telegram Bot -- Cloudflare Worker
// Behavior configured via ara-behavior.js (edit that file to change personality)

import { buildSystemPrompt } from "../ara-behavior.js";

async function getHistory(db, chatId) {
  try {
    const row = await db.prepare("SELECT history FROM telegram_chats WHERE chat_id=?").bind(chatId).first();
    if (!row) return [];
    return JSON.parse(row.history);
  } catch { return []; }
}

async function saveHistory(db, chatId, history) {
  const trimmed = history.slice(-30); // keep last 30 messages
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO telegram_chats (chat_id, history, updated_at) VALUES (?, ?, ?) ON CONFLICT(chat_id) DO UPDATE SET history=excluded.history, updated_at=excluded.updated_at")
    .bind(chatId, JSON.stringify(trimmed), now).run();
}

async function callAI(messages, apiKey) {
  // Use OpenRouter with a smart free model
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://brainforge-7xn.pages.dev",
      "X-Title": "Ara Telegram Bot",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1:free",
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    // Fallback to another free model if deepseek fails
    const res2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://brainforge-7xn.pages.dev",
        "X-Title": "Ara Telegram Bot",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });
    if (!res2.ok) throw new Error(`AI error: ${res2.status}`);
    const data2 = await res2.json();
    return data2.choices?.[0]?.message?.content || "No response";
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response";
}

async function sendTelegram(token, chatId, text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += 4000) chunks.push(text.slice(i, i + 4000));
  for (const chunk of chunks) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: "Markdown" }),
    });
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response(JSON.stringify({
        status: "Ara is alive",
        model: "deepseek/deepseek-r1:free (with llama fallback)",
        time: new Date().toISOString(),
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (request.method !== "POST") return new Response("OK");

    try {
      const body = await request.json();
      const message = body?.message;
      if (!message) return new Response("OK");

      const chatId = String(message.chat?.id);
      const text = message.text || "";
      const token = env.TELEGRAM_BOT_TOKEN;
      const apiKey = env.OPENROUTER_API_KEY;

      if (!token || !apiKey) {
        await sendTelegram(token || "", chatId, "Bot is not configured properly. Missing API keys.");
        return new Response("OK");
      }

      // Handle commands
      if (text === "/start") {
        await sendTelegram(token, chatId,
          `Hi, I'm *Ara* -- your personal AI assistant.\n\nI know about your projects (BrainForge, TradeArena), your infrastructure, and how to build and deploy apps.\n\nJust talk to me normally. What do you need?`
        );
        return new Response("OK");
      }

      if (text === "/clear") {
        await env.DB.prepare("DELETE FROM telegram_chats WHERE chat_id=?").bind(chatId).run();
        await sendTelegram(token, chatId, "Chat history cleared. My identity and knowledge are still intact.");
        return new Response("OK");
      }

      if (text === "/status") {
        await sendTelegram(token, chatId,
          `*Ara Status*\n\nModel: deepseek/deepseek-r1:free\nFallback: meta-llama/llama-3.3-70b-instruct:free\nBrainForge: https://brainforge-7xn.pages.dev\nWorker: Online\nMemory: D1 database`
        );
        return new Response("OK");
      }

      if (text === "/memory") {
        const history = await getHistory(env.DB, chatId);
        await sendTelegram(token, chatId,
          `I have ${history.length} messages in memory for this chat (max 30).\nMy full identity and project context is always loaded from the behavior config.`
        );
        return new Response("OK");
      }

      // Build messages with system prompt from behavior config
      const history = await getHistory(env.DB, chatId);
      const systemPrompt = buildSystemPrompt();

      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: text },
      ];

      const reply = await callAI(messages, apiKey);

      // Save updated history
      await saveHistory(env.DB, chatId, [
        ...history,
        { role: "user", content: text },
        { role: "assistant", content: reply },
      ]);

      await sendTelegram(token, chatId, reply);
      return new Response("OK");

    } catch (err) {
      console.error(err);
      return new Response("OK");
    }
  },
};
