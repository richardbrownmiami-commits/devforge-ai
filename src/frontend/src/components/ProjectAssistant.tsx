import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const SYSTEM_PROMPT = `Tu BrainForge ka AI assistant hai — naam hai "Nova".

Nova ek sharp, confident AI entity hai jo stellar knowledge rakhti hai — naam hi nova hai (star explosion), waise hi jawab bhi explosive aur direct hote hain.

Tu sirf teen cheezein help karta hai:
1. BrainForge mein banaye apps ko kaise use karein
2. Free AI API keys kaise milein (OpenRouter, Gemini, Groq)
3. Project mein koi problem/dikkat ho toh uska solution

Tu app NAHI banata, code NAHI likhta — uske liye user chat mein jaaye.

Nova ki personality:
- Sharp aur confident — seedha jawab, koi bakwaas nahi
- Thodi si wit mix hoti hai — kabhi kabhi ek line punchline
- "bhai", "sun", "dekh yaar" — casual Hinglish style
- Short replies, point pe aa jaa — ek sentence better hai teen se
- Space metaphors kabhi kabhi: "yeh koi rocket science nahi", "signal clear hai"
- Agar koi app banane ka bol raha hai toh bol: "Bhai woh kaam project chat mein hoga, main sirf BrainForge aur keys ke liye hoon ⚡"
- Kabhi khud ko "Nova" bolke introduce karo naturally

Free Keys Guide:
- OpenRouter: openrouter.ai → Sign up → API Keys → free tier mein DeepSeek, Kimi, Qwen milte hain
- Gemini: aistudio.google.com → "Get API key" → bilkul free
- Groq: console.groq.com → Sign up → API Keys → free mein Llama 3.3 milta hai
Teeno Settings → API Keys mein daalo — BrainForge auto use kar lega.

Response hamesha Hinglish mein dena. Short, sharp, helpful.`;

function getOrKey(): string {
  // Try all possible sources where OR key might be stored
  try {
    const s = JSON.parse(localStorage.getItem("bf_settings") || "{}");
    if (s.openRouterApiKey) return s.openRouterApiKey;
  } catch {}
  return localStorage.getItem("bf_default_or_key") || 
         localStorage.getItem("bf_or_key") || "";
}

function getGeminiKey(): string {
  try {
    const s = JSON.parse(localStorage.getItem("bf_settings") || "{}");
    if (s.geminiApiKey) return s.geminiApiKey;
  } catch {}
  return "";
}

function getGroqKey(): string {
  try {
    const s = JSON.parse(localStorage.getItem("bf_settings") || "{}");
    if (s.groqApiKey) return s.groqApiKey;
  } catch {}
  return "";
}

async function askAI(messages: Msg[]): Promise<string> {
  const orKey = getOrKey();
  const geminiKey = getGeminiKey();
  const groqKey = getGroqKey();

  const payload = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.text })),
  ];

  if (orKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${orKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://brainforge-7xn.pages.dev" },
        body: JSON.stringify({ model: "openrouter/auto", messages: payload, max_tokens: 400 }),
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    } catch {}
  }

  if (geminiKey) {
    try {
      const geminiPayload = {
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] })),
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: { maxOutputTokens: 400 },
      };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(geminiPayload) }
      );
      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text;
    } catch {}
  }

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: payload, max_tokens: 400 }),
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    } catch {}
  }

  return "Bhai abhi koi AI key available nahi hai. Settings → API Keys mein OpenRouter/Gemini key daalo — bilkul free hai. ⚡";
}

const QUICK_QUESTIONS = [
  "Free API keys kaise milein?",
  "App kaise use karein?",
  "OpenRouter key kahan milegi?",
  "Meri app mein error aa raha hai",
];

export function ProjectAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", text: "Main Nova hoon ⚡ — BrainForge ka sharp assistant. Free keys chahiye, app use karne mein help, ya koi issue? Seedha batao." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const newMsgs: Msg[] = [...msgs, { role: "user", text: msg }];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const reply = await askAI(newMsgs);
      setMsgs([...newMsgs, { role: "assistant", text: reply }]);
    } catch {
      setMsgs([...newMsgs, { role: "assistant", text: "Signal lost. Thodi der mein try karo bhai. ⚡" }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            type="button"
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.30 280), oklch(0.60 0.28 220))",
              boxShadow: "0 0 20px oklch(0.55 0.28 280 / 0.5)",
            }}
            title="Nova — BrainForge Assistant"
            data-ocid="nova.open_button"
          >
            <Zap className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-5 right-5 z-50 w-80 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
            style={{
              background: "oklch(0.09 0.025 280)",
              border: "1px solid oklch(0.25 0.10 280 / 0.5)",
              maxHeight: "480px",
              boxShadow: "0 0 30px oklch(0.55 0.25 280 / 0.2)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ background: "linear-gradient(90deg, oklch(0.55 0.28 280 / 0.15), oklch(0.60 0.25 220 / 0.15))", borderBottom: "1px solid oklch(0.20 0.08 280)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, oklch(0.55 0.30 280), oklch(0.60 0.28 220))", boxShadow: "0 0 8px oklch(0.55 0.28 280 / 0.5)" }}>
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Nova</p>
                  <p className="text-[9px] text-muted-foreground">BrainForge Assistant ⚡</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                    style={m.role === "user"
                      ? { background: "oklch(0.55 0.25 280 / 0.25)", border: "1px solid oklch(0.55 0.25 280 / 0.3)", color: "oklch(0.90 0.05 280)" }
                      : { background: "oklch(0.13 0.04 280)", border: "1px solid oklch(0.22 0.08 280)", color: "oklch(0.85 0.05 280)" }
                    }>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl" style={{ background: "oklch(0.13 0.04 280)", border: "1px solid oklch(0.22 0.08 280)" }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "oklch(0.65 0.25 280)" }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick questions */}
            {msgs.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button key={q} type="button" onClick={() => send(q)}
                    className="text-[10px] px-2 py-1 rounded-lg transition-colors"
                    style={{ background: "oklch(0.55 0.20 280 / 0.12)", border: "1px solid oklch(0.55 0.20 280 / 0.3)", color: "oklch(0.70 0.20 280)" }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-3 shrink-0" style={{ borderTop: "1px solid oklch(0.18 0.06 280)" }}>
              <div className="flex gap-2 items-end">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Nova se pucho..."
                  className="flex-1 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none resize-none"
                  style={{ background: "oklch(0.13 0.03 280)", border: "1px solid oklch(0.25 0.08 280 / 0.5)" }}
                />
                <button type="button" onClick={() => send()} disabled={!input.trim() || loading}
                  className="p-2 rounded-lg transition-all disabled:opacity-40 shrink-0"
                  style={{ background: "linear-gradient(135deg, oklch(0.55 0.28 280), oklch(0.60 0.25 220))" }}>
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
