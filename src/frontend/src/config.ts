const WORKER_API = "https://brainforge-api.richard-brown-miami.workers.dev";

export interface Config {
  workerApi: string;
}

let configCache: Config | null = null;

export async function loadConfig(): Promise<Config> {
  if (configCache) return configCache;
  configCache = { workerApi: WORKER_API };
  return configCache;
}

export function getWorkerApi(): string {
  return WORKER_API;
}