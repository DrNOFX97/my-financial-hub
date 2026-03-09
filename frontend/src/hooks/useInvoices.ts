import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Invoice } from "@/types";

export function useInvoices(status?: string) {
  return useQuery<Invoice[]>({
    queryKey: ["invoices", status],
    queryFn: () => api.getInvoices(status),
    staleTime: 2 * 60 * 1000,
  });
}

export function useProcessExtract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (extractText: string) => api.processExtract({ text: extractText }),
    onSuccess: () => {
      // Invalidar queries relevantes após processar extrato
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
