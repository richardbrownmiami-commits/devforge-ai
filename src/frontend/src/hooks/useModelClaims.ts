import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FREE_MODELS } from "../constants/models";
import { cfApi } from "../lib/cloudflareApi";

export function useClaimedModels() {
  return useQuery<Map<string, string>>({
    queryKey: ["claimedModels"],
    queryFn: async () => {
      try {
        const claims = await cfApi.getModelClaims();
        return new Map(claims.map((c) => [c.model_id, c.claimed_by]));
      } catch {
        return new Map();
      }
    },
    staleTime: 30000,
  });
}

export function useAvailableModels(currentOwner: string) {
  const { data: claimed = new Map() } = useClaimedModels();
  return FREE_MODELS.filter((m) => {
    const owner = claimed.get(m.id);
    return !owner || owner === currentOwner;
  });
}

export function useSetProjectModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectName,
      modelId,
    }: { projectName: string; modelId: string }) => {
      await cfApi.claimModel(modelId, projectName, "project");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claimedModels"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useClaimMasterModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      await cfApi.claimModel(modelId, "master", "master");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["claimedModels"] }),
  });
}
