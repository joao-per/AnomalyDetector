// React Query hooks over the BFF. Status-changing mutations invalidate the
// list + the affected detail so the UI reflects the new state immediately.
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { anomaliesApi } from "./anomalies";

const keys = {
  anomalies: (status?: string) => ["anomalies", status ?? "all"] as const,
  anomaly: (guid: string) => ["anomaly", guid] as const,
  suppliers: ["suppliers"] as const,
  signature: ["signature"] as const,
};

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
