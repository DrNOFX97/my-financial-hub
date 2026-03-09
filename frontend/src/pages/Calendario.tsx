import { useUpcomingPayments } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";

const Calendario = () => {
  const { spreadsheetId } = useAuth();
  const { data: upcoming, isLoading } = useUpcomingPayments(spreadsheetId!);

  const today = new Date();

  const getDaysUntil = (dateStr: string) => {
    const due = new Date(dateStr);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const urgencyClass = (days: number) => {
    if (days <= 3) return "border-expense/30 bg-expense/5";
    if (days <= 7) return "border-yellow-500/30 bg-yellow-500/5";
    return "border-border/30";
  };

  const urgencyText = (days: number) => {
    if (days < 0) return `${Math.abs(days)} dias em atraso`;
    if (days === 0) return "Vence hoje";
    return `${days} dias`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendário Financeiro</h1>
        <p className="text-muted-foreground text-sm">Próximos pagamentos e vencimentos</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">A carregar...</div>
        ) : !upcoming || upcoming.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Sem pagamentos próximos agendados.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Os pagamentos são derivados dos Gastos Fixos configurados no Google Sheets.
            </p>
          </div>
        ) : (
          upcoming.map((p) => {
            const days = getDaysUntil(p.dataVencimento);
            return (
              <div
                key={p.id}
                className={`glass-card rounded-xl p-4 flex items-center justify-between border ${urgencyClass(days)}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary/50 flex flex-col items-center justify-center text-center leading-tight shrink-0">
                    <span className="text-xs font-bold">{new Date(p.dataVencimento).getDate()}</span>
                    <span className="text-[9px] uppercase opacity-60">
                      {new Date(p.dataVencimento).toLocaleDateString("pt-PT", { month: "short" })}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{p.descricao}</p>
                    <p className="text-xs text-muted-foreground">{p.categoria}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums">€{p.valor.toFixed(2)}</p>
                  <p className={`text-xs flex items-center gap-1 justify-end ${days < 0 ? "text-expense" : days <= 3 ? "text-expense" : days <= 7 ? "text-yellow-600" : "text-muted-foreground"}`}>
                    <Clock className="h-3 w-3" />
                    {urgencyText(days)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default Calendario;
