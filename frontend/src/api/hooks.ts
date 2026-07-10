// React Query hooks over the BFF. Status-changing mutations invalidate the
// list + the affected detail so the UI reflects the new state immediately.
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { anomaliesApi } from "./anomalies";
import { authApi } from "./auth";

const keys = {
  anomalies: (status?: string) => ["anomalies", status ?? "all"] as const,
  anomaly: (guid: string) => ["anomaly", guid] as const,
  suppliers: ["suppliers"] as const,
  signature: ["signature"] as const,
  me: ["me"] as const,
};

/** The signed-in user (Django session or Entra). 401 → isError, no retries. */
export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useAnomalies(status?: string) {
  return useQuery({
    queryKey: keys.anomalies(status),
    queryFn: () => anomaliesApi.list(status),
  });
}

export function useAnomaly(guid: string | null) {
  return useQuery({
    queryKey: keys.anomaly(guid ?? ""),
    queryFn: () => anomaliesApi.get(guid as string),
    enabled: !!guid,
  });
}

export function useSuppliers() {
  return useQuery({ queryKey: keys.suppliers, queryFn: anomaliesApi.suppliers });
}

export function useSignature() {
  return useQuery({ queryKey: keys.signature, queryFn: anomaliesApi.getSignature });
}

export function useSetSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (signature: string) => anomaliesApi.setSignature(signature),
    onSuccess: (data) => qc.setQueryData(keys.signature, data),
  });
}

/** Shared invalidation after a status change. */
function useStatusMutation(
  fn: (guid: string, comment: string) => Promise<unknown>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ guid, comment }: { guid: string; comment: string }) =>
      fn(guid, comment),
    onSuccess: (_data, { guid }) => {
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      qc.invalidateQueries({ queryKey: keys.anomaly(guid) });
    },
  });
}

export const useCloseAnomaly = () =>
  useStatusMutation((g, c) => anomaliesApi.close(g, c));

export const useUntrainAnomaly = () =>
  useStatusMutation((g, c) => anomaliesApi.untrain(g, c));

export const useCancelAnomaly = () =>
  useStatusMutation((g, c) => anomaliesApi.cancel(g, c));

export function useRetrainAnomaly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ guid }: { guid: string }) => anomaliesApi.retrain(guid),
    onSuccess: (_data, { guid }) => {
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      qc.invalidateQueries({ queryKey: keys.anomaly(guid) });
    },
  });
}

/** Permanently deletes the given anomalies one by one. Resolves with the ids
 *  that failed (empty array = all gone). Always refreshes the lists — a
 *  partial failure still removed some rows. */
export function useDeleteAnomalies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (guids: string[]) => {
      const failed: string[] = [];
      for (const guid of guids) {
        try {
          await anomaliesApi.remove(guid);
        } catch {
          failed.push(guid);
        }
      }
      return failed;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["anomalies"] }),
  });
}
