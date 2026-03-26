import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const SYSTEM_PROMPT = `Tu BrainForge ka help assistant hai — naam hai "Sharof".
Tu sirf teen cheezein help karta hai:
1. BrainForge mein banaye apps ko kaise use karein
2. Free AI API keys kaise milein (OpenRouter, Gemini, Groq)
3. Project mein koi problem/dikkat ho toh uska solution

Tu app NAHI banata, code NAHI likhta — uske liye user chat mein jaaye.

Teri personality:
- Bilkul seedha bhai wala style, casual Hinglish mein baat kar
- "bhai", "yaar", "dekh", "sun" — aise words use kar
- Short replies, point pe aa jaa — bakwaas mat kar
- Agar koi app banane ka bol raha hai toh bol: "Bhai woh kaam project chat mein hoga, main sirf help karta hoon app use karne mein aur keys dilwane mein 😄"
- Friendly aur confident tone rakh

Free Keys Guide:
- OpenRouter: openrouter.ai → Sign up → API Keys → free tier mein DeepSeek, Kimi, Qwen milte hain
- Gemini: aistudio.google.com → "Get API key" → bilkul free
- Groq: console.groq.com → Sign up → API Keys → free mein Llama 3.3 milta hai
Teeno Settings → API Keys mein daalo — BrainForge auto use kar lega.

Response Hinglish mein dena hamesha.`;

async function askAI(messages: Msg[]): Promise<string> {
  // Try OpenRouter first, then Gemini, then Groq
  const orKey = localStorage.getItem("bf_openrouter_key");
  const geminiKey = localStorage.getItem("bf_gemini_key");
  const groqKey = localStorage.getItem("bf_groq_key");

  const payload = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.text })),
  ];

  if (orKey) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${orKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://brainforge-7xn.pages.dev",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v3:free",
        messages: payload,
        max_tokens: 400,
      }),
    });
    const data = await res.json();
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
  }

  if (geminiKey) {
    const geminiPayload = {
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { maxOutputTokens: 400 },
    };
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );
    const data = await res.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
  }

  if (groqKey) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: payload,
        max_tokens: 400,
      }),
    });
    const data = await res.json();
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }
  }

  return "Bhai, pehle Settings mein ek AI key daalo (OpenRouter ya Gemini — dono free hain). Phir main help kar sakta hoon! 😊";
}

const QUICK_QUESTIONS = [
  "Free API keys kaise milein?",
  "Banaya app kaise use karein?",
  "Project mein error aa rahi hai",
  "OpenRouter ka free model konsa?",
];

export function ProjectAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Bhai, main Sharof hoon! 👋 App use karna hai, free keys chahiye, ya koi dikkat hai project mein? Bol de seedha.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    const newMessages: Msg[] = [...messages, { role: "user", text: q }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const reply = await askAI(newMessages);
      setMessages([...newMessages, { role: "assistant", text: reply }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", text: "Oops bhai, kuch gadbad ho gayi. Dobara try kar!" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-900/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        title="Need help?"
      >
        <MessageCircle className="w-5 h-5 text-white" />
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 z-50 w-80 max-h-[520px] flex flex-col rounded-2xl border border-violet-500/30 bg-[#0f0f14] shadow-2xl shadow-black/60 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-gradient-to-r from-violet-900/40 to-purple-900/30 shrink-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Sharof</p>
                <p className="text-[10px] text-violet-300/70">BrainForge Help</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick questions */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 pt-1 flex gap-2 shrink-0 border-t border-border">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Pooch kuch bhi..."
                className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 transition-colors"
              />
              <Button
                size="icon"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="h-8 w-8 shrink-0 bg-violet-600 hover:bg-violet-500"
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
