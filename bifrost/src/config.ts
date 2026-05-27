export interface ProviderDef {
  name: string;
  baseUrl: string;
  type: "openai" | "anthropic" | "gemini";
  models: string[];
  devConsole: string;
}

export const PROVIDERS: ProviderDef[] = [
  {
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    type: "openai",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it", "deepseek-r1-distill-llama-70b"],
    devConsole: "https://console.groq.com/keys",
  },
  {
    name: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    type: "gemini",
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash"],
    devConsole: "https://aistudio.google.com/app/apikey",
  },
  {
    name: "openai",
    baseUrl: "https://api.openai.com/v1",
    type: "openai",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "o1", "o3-mini"],
    devConsole: "https://platform.openai.com/api-keys",
  },
  {
    name: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    type: "anthropic",
    models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
    devConsole: "https://console.anthropic.com/settings/keys",
  },
  {
    name: "togetherai",
    baseUrl: "https://api.together.xyz/v1",
    type: "openai",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1", "deepseek-ai/DeepSeek-R1"],
    devConsole: "https://api.together.ai/settings/api-keys",
  },
  {
    name: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    type: "openai",
    models: ["deepseek-chat", "deepseek-reasoner"],
    devConsole: "https://platform.deepseek.com/api_keys",
  },
  {
    name: "cohere",
    baseUrl: "https://api.cohere.com/v2",
    type: "openai",
    models: ["command-a-03-2025", "command-r-plus-08-2024", "command-r-08-2024"],
    devConsole: "https://dashboard.cohere.com/api-keys",
  },
];

export function matchProvider(model: string): ProviderDef | null {
  const lower = model.toLowerCase();
  for (const p of PROVIDERS) {
    for (const m of p.models) {
      if (m.toLowerCase().includes(lower) || lower.includes(m.toLowerCase().split("/").pop() || m.toLowerCase())) return p;
    }
  }
  return null;
}