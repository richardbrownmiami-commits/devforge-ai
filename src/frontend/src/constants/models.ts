// OpenRouter free models
export const OPENROUTER_MODELS = [
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder 480B" },
  { id: "openai/gpt-oss-120b:free", name: "GPT-OSS 120B" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1" },
  { id: "google/gemma-3-27b-it:free", name: "Google Gemma 27B" },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 24B",
  },
  { id: "openrouter/auto", name: "Auto (Best available)" },
] as const;

// Google Gemini direct models (via AI Studio)
export const GEMINI_MODELS = [
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
] as const;

// DeepSeek direct models
export const DEEPSEEK_MODELS = [
  { id: "deepseek-chat", name: "DeepSeek V3 (Chat)" },
  { id: "deepseek-reasoner", name: "DeepSeek R1 (Reasoner)" },
] as const;

// Combined for display
export const FREE_MODELS = OPENROUTER_MODELS;

export type AIProvider = "openrouter" | "gemini" | "deepseek" | "auto";

export const DEFAULT_MODEL_ID = "qwen/qwen3-coder:free";
export const DEFAULT_PROVIDER: AIProvider = "openrouter";

export function getModelName(id: string): string {
  const all = [...OPENROUTER_MODELS, ...GEMINI_MODELS, ...DEEPSEEK_MODELS];
  return all.find((m) => m.id === id)?.name ?? id;
}

export function shortModelName(id: string): string {
  const name = getModelName(id);
  if (name.length > 20) return `${name.slice(0, 18)}…`;
  return name;
}
