import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FREE_MODELS } from "../constants/models";
import { useActor } from "./useActor";

/** Returns all claimed models as Map<modelId, ownerName> */
export function useClaimedModels() {
  const { actor, isFetching } = useActor();
  return useQuery<Map<string, string>>({
    queryKey: ["claimedModels"],
    queryFn: async () => {
      if (!actor) return new Map();
      const pairs = await actor.getClaimedModels();
      return new Map(pairs);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Returns FREE_MODELS filtered to exclude models claimed by others (not currentOwner) */
export function useAvailableModels(currentOwner: string) {
  const { data: claimed = new Map() } = useClaimedModels();
  return FREE_MODELS.filter((m) => {
    const owner = claimed.get(m.id);
    return !owner || owner === currentOwner;
  });
}

export function useSetProjectModel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectName,
      modelId,
    }: { projectName: string; modelId: string }) => {
      if (!actor) throw new Error("Not connected");
      await actor.setProjectModel(projectName, modelId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claimedModels"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useClaimMasterModel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      if (!actor) throw new Error("Not connected");
      await actor.claimMasterModel(modelId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claimedModels"] });
    },
  });
}
