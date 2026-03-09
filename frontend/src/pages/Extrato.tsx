import { ClipboardPaste, ArrowUpRight, ArrowDownRight, Receipt, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { useTransactions, useProcessExtract, useDeleteTransaction, useDeduplicateTransactions } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const Extrato = () => {
  const { spreadsheetId } = useAuth();
  const [extractText, setExtractText] = useState("");
  const { data: transactions, isLoading } = useTransactions(spreadsheetId!);
  const processExtractMutation = useProcessExtract(spreadsheetId!);
  const deleteMutation = useDeleteTransaction(spreadsheetId!);
  const deduplicateMutation = useDeduplicateTransactions(spreadsheetId!);

  const handleProcessExtract = () => {
    if (extractText.trim()) {
      processExtractMutation.mutate(extractText, {
        onSuccess: () => {
          setExtractText("");
        }
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Extrato Bancário</h1>
        <p className="text-muted-foreground text-sm">Cole o extrato do banco para associar automaticamente a faturas</p>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Colar Extrato</h3>
        <Textarea
          placeholder="Cole aqui o extrato do banco (copy/paste)... Ex: 05/03/2026 CONTINENTE -25.50"
          className="min-h-[150px] font-mono text-xs bg-secondary/30"
          value={extractText}
          onChange={(e) => setExtractText(e.target.value)}
        />
        <div className="flex justify-between items-center mt-3">
          <p className="text-[10px] text-muted-foreground">O parser identifica automaticamente data, descrição e valor.</p>
          <Button
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleProcessExtract}
            disabled={processExtractMutation.isPending || !extractText.trim()}
          >
            {processExtractMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                A processar...
              </span>
            ) : (
              <>
                <ClipboardPaste className="h-4 w-4" />
                Processar Extrato
              </>
            )}
          </Button>
        </div>
      </div>

      {processExtractMutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-income/10 border border-income/20 rounded-xl p-4 text-sm text-income-foreground"
        >
          {(processExtractMutation.data as any)?.message}
        </motion.div>
      )}
      {processExtractMutation.isError && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-expense/10 border border-expense/20 rounded-xl p-4 text-sm text-expense"
        >
          Erro: {(processExtractMutation.error as any)?.message || "Falha ao processar extrato"}
        </motion.div>
      )}

      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Movimentos Recentes</h3>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={() => deduplicateMutation.mutate()}
            disabled={deduplicateMutation.isPending}
          >
            <Trash2 className="h-3 w-3" />
            {deduplicateMutation.isPending ? "A limpar..." : "Limpar duplicados"}
          </Button>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">A carregar movimentos...</p>
        ) : (transactions as any)?.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-secondary rounded-lg">
            <Receipt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Nenhum movimento encontrado.</p>
            <p className="text-[10px] text-muted-foreground/60">Cole um extrato acima para começar.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {(transactions as any)?.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-all group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                    tx.valor > 0 ? "bg-income/10" : "bg-expense/10"
                  )}>
                    {tx.valor > 0 ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{tx.descricao}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{tx.categoria}</p>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                      <p className="text-[10px] text-muted-foreground">{new Date(tx.data).toLocaleDateString("pt-PT")}</p>
                      {tx.estado === 'Reconciliado' && (
                        <span className="text-[9px] bg-income/20 text-income-foreground px-1.5 rounded-sm font-medium">Reconciliado</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={cn("font-bold tabular-nums text-sm", tx.valor > 0 ? "text-income" : "text-expense")}>
                    {tx.valor > 0 ? "+" : "-"}€{Math.abs(tx.valor).toFixed(2).replace('.', ',')}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(String(tx.id))}
                    disabled={deleteMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-40"
                    title="Eliminar movimento"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Extrato;
