import { ClipboardPaste, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { recentTransactions } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

const Extrato = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Extrato Bancário</h1>
        <p className="text-muted-foreground text-sm">Cole o extrato do banco para associar automaticamente a faturas</p>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Colar Extrato</h3>
        <Textarea
          placeholder="Cole aqui o extrato do banco (copy/paste)..."
          className="min-h-[120px] font-mono text-xs bg-secondary/30"
        />
        <div className="flex gap-2 mt-3">
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <ClipboardPaste className="h-4 w-4" />
            Processar Extrato
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Movimentos Recentes</h3>
        <div className="space-y-2">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                  tx.valor > 0 ? "bg-income/10" : "bg-expense/10"
                )}>
                  {tx.valor > 0 ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{tx.descricao}</p>
                  <p className="text-xs text-muted-foreground">{tx.categoria} · {new Date(tx.data).toLocaleDateString("pt-PT")}</p>
                </div>
              </div>
              <span className={cn("font-semibold tabular-nums text-sm shrink-0 ml-2", tx.valor > 0 ? "text-income" : "text-expense")}>
                {tx.valor > 0 ? "+" : ""}€{Math.abs(tx.valor).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Extrato;
