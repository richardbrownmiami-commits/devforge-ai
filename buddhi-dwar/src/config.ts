export interface ProviderEntry {
  baseUrl: string;
  type: 'openai' | 'anthropic' | 'builtin';
  models: string[];
  notes?: string;
}

export const PROVIDERS: Record<string, ProviderEntry> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    type: 'openai',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o3-mini'],
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    type: 'anthropic',
    models: ['claude-3-5-sonnet-latest', 'claude-3-opus-latest', 'claude-3-haiku', 'claude-3-sonnet'],
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    type: 'openai',
    models: ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  },
  cerebras: {
    baseUrl: 'https://api.cerebras.ai/v1',
    type: 'openai',
    models: ['cerebras-llama3.1-8b', 'cerebras-llama3.1-70b'],
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    type: 'openai',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    type: 'openai',
    models: ['mistral-large-latest', 'mistral-medium', 'mistral-small-latest', 'codestral-latest'],
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1',
    type: 'openai',
    models: ['together-mistral-7b', 'together-mixtral-8x7b', 'together-llama-2-70b'],
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    type: 'openai',
    models: ['openrouter/auto', 'openrouter/gpt-4o', 'openrouter/claude-3.5'],
  },
  huggingface: {
    baseUrl: 'https://api-inference.huggingface.co/v1',
    type: 'openai',
    models: ['huggingface/mistral-7b', 'huggingface/llama-2-7b'],
  },
  workers: {
    baseUrl: '',
    type: 'builtin',
    models: ['@cf/meta/llama-3.1-8b-instruct', '@cf/mistral/mistral-7b-instruct-v0.1'],
  },
  cohere: {
    baseUrl: 'https://api.cohere.ai/v1',
    type: 'openai',
    models: ['command-r-plus', 'command-r', 'command'],
  },
  perplexity: {
    baseUrl: 'https://api.perplexity.ai',
    type: 'openai',
    models: ['sonar-pro', 'sonar', 'mixtral-8x7b-instruct'],
  },
  replicate: {
    baseUrl: 'https://api.replicate.com/v1',
    type: 'openai',
    models: ['replicate/llama-2-70b', 'replicate/mixtral-8x7b'],
  },
  fireworks: {
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    type: 'openai',
    models: ['accounts/fireworks/models/llama-v3-70b', 'accounts/fireworks/models/mixtral-8x7b'],
  },
  lepton: {
    baseUrl: 'https://api.lepton.ai/v1',
    type: 'openai',
    models: ['lepton/llama-3-70b', 'lepton/mixtral-8x7b'],
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    type: 'openai',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
  },
  deepinfra: {
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    type: 'openai',
    models: ['deepinfra/llama-3-70b', 'deepinfra/mixtral-8x7b'],
  },
};
