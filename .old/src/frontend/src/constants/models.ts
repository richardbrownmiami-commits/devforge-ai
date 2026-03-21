export const FREE_MODELS = [
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder 480B (Best for code)" },
  {
    id: "openai/gpt-oss-120b:free",
    name: "OpenAI GPT-OSS 120B (Best for reasoning)",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "NVIDIA Nemotron 120B",
  },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 24B",
  },
  { id: "google/gemma-3-27b-it:free", name: "Google Gemma 27B" },
  { id: "openrouter/free", name: "Auto (Best available free model)" },
] as const;

export type FreeModelId = (typeof FREE_MODELS)[number]["id"];

export const DEFAULT_MODEL_ID = "qwen/qwen3-coder:free";

export function getModelName(id: string): string {
  return FREE_MODELS.find((m) => m.id === id)?.name ?? id;
}

export function shortModelName(id: string): string {
  const name = getModelName(id);
  // Shorten for display in top bar
  if (name.length > 22) return `${name.slice(0, 20)}…`;
  return name;
}
