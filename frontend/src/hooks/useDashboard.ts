import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import type { Transaction, DashboardStats, MonthlyData, CategoryData, UpcomingPayment, Invoice, RecurringPattern } from "@/types";

export function useDashboardStats(spreadsheetId?: string) {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats", spreadsheetId],
    queryFn: () => api.getDashboardStats({ spreadsheetId }) as Promise<DashboardStats>,
    staleTime: 5 * 60 * 1000,
    enabled: !!spreadsheetId,
  });
}

export function useMonthlyData(spreadsheetId?: string, year?: number) {
  return useQuery<MonthlyData[]>({
    queryKey: ["dashboard", "monthly", spreadsheetId, year],
    queryFn: () => api.getMonthlyData({ spreadsheetId, year }) as Promise<MonthlyData[]>,
    staleTime: 10 * 60 * 1000,
    enabled: !!spreadsheetId,
  });
}

export function useCategoryData(spreadsheetId?: string, month?: string) {
  return useQuery<CategoryData[]>({
    queryKey: ["dashboard", "categories", spreadsheetId, month],
    queryFn: () => api.getCategoryData({ spreadsheetId, month }) as Promise<CategoryData[]>,
    staleTime: 10 * 60 * 1000,
    enabled: !!spreadsheetId,
  });
}

export function useTransactions(spreadsheetId?: string, limit?: number) {
  return useQuery<Transaction[]>({
    queryKey: ["transactions", spreadsheetId, limit],
    queryFn: () => api.getTransactions({ spreadsheetId, limit }) as Promise<Transaction[]>,
    staleTime: 2 * 60 * 1000,
    enabled: !!spreadsheetId,
  });
}

export function useUpcomingPayments(spreadsheetId?: string) {
  return useQuery<UpcomingPayment[]>({
    queryKey: ["payments", "upcoming", spreadsheetId],
    queryFn: () => api.getUpcomingPayments({ spreadsheetId }) as Promise<UpcomingPayment[]>,
    staleTime: 5 * 60 * 1000,
    enabled: !!spreadsheetId,
  });
}

export function useRecurringPatterns(spreadsheetId?: string) {
  return useQuery<RecurringPattern[]>({
    queryKey: ["dashboard", "patterns", spreadsheetId],
    queryFn: () => api.getRecurringPatterns({ spreadsheetId }) as Promise<RecurringPattern[]>,
    staleTime: 30 * 60 * 1000,
    enabled: !!spreadsheetId,
  });
}

export function useInvoices(spreadsheetId?: string, status?: string) {
  return useQuery<Invoice[]>({
    queryKey: ["invoices", spreadsheetId, status],
    queryFn: () => api.getInvoices({ spreadsheetId, status }) as Promise<Invoice[]>,
    staleTime: 2 * 60 * 1000,
    enabled: !!spreadsheetId,
  });
}

export function useProcessExtract(spreadsheetId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (extractText: string) => api.processExtract({ text: extractText, spreadsheetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUploadInvoice(spreadsheetId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => api.uploadInvoice({ file, spreadsheetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReconcile(spreadsheetId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ faturaId, movimentoId }: { faturaId: string; movimentoId: string }) =>
      api.reconcile({ faturaId, movimentoId, spreadsheetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useScanGmail(spreadsheetId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => api.scanGmail({ spreadsheetId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Gmail sincronizado",
        description: data?.message || "Sincronização concluída.",
      });
    },
    onError: (error: any) => {
      const msg = error?.message || "Erro desconhecido.";
      toast({
        variant: "destructive",
        title: "Erro ao sincronizar Gmail",
        description: msg,
      });
    },
  });
}

export function useUpdateInvoice(spreadsheetId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, fluxo }: { id: string; fluxo: string }) =>
      api.updateInvoice(id, { fluxo, spreadsheetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useDeduplicateTransactions(spreadsheetId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => api.deduplicateTransactions({ spreadsheetId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: data.removed > 0 ? `${data.removed} duplicado(s) removido(s)` : "Sem duplicados",
        description: data.removed > 0 ? "Movimentos duplicados eliminados." : "Nenhum movimento duplicado encontrado.",
      });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro", description: error?.message });
    },
  });
}

export function useDeleteTransaction(spreadsheetId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id, { spreadsheetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao eliminar", description: error?.message });
    },
  });
}

export function useClearInvoices(spreadsheetId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => api.clearAllInvoices({ spreadsheetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Lista limpa", description: "Todas as faturas foram removidas." });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao limpar", description: error?.message });
    },
  });
}

export function useDeleteInvoice(spreadsheetId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteInvoice(id, { spreadsheetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Fatura eliminada" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao eliminar", description: error?.message });
    },
  });
}

export function useAddTransaction(spreadsheetId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { descricao: string; valor: number; data?: string; categoria?: string; tipo?: string }) =>
      api.addManualTransaction({ ...params, spreadsheetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
