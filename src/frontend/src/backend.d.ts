import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Settings {
    githubRepo: string;
    githubToken: string;
    masterAiModel: string;
    openRouterApiKey: string;
    defaultModel: string;
    termuxUrl: string;
}
export type Time = bigint;
export interface Project {
    created: Time;
    name: string;
    aiModel: string;
    lastModified: Time;
}
export interface backendInterface {
    claimMasterModel(modelId: string): Promise<void>;
    createProject(name: string): Promise<void>;
    deleteProject(name: string): Promise<void>;
    getClaimedModels(): Promise<Array<[string, string]>>;
    getSettings(): Promise<Settings | null>;
    listProjects(): Promise<Array<Project>>;
    saveSettings(newSettings: Settings): Promise<void>;
    setProjectModel(projectName: string, modelId: string): Promise<void>;
}
