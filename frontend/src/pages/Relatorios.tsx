import { useDashboardStats, useMonthlyData, useCategoryData } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Download, TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { MonthlyData } from "@/types";

const Relatorios = () => {
  const { spreadsheetId } = useAuth();
  const { data: stats } = useDashboardStats(spreadsheetId!);
  const { data: monthlyData } = useMonthlyData(spreadsheetId!);
  const { data: categoryData } = useCategoryData(spreadsheetId!);

  const totalReceitas = monthlyData?.reduce((acc, m) => acc + m.receitas, 0) ?? 0;
  const totalDespesas = monthlyData?.reduce((acc, m) => acc + m.despesas, 0) ?? 0;

  const melhorMes = monthlyData?.reduce<MonthlyData | null>(
    (best, m) => (!best || m.receitas - m.despesas > best.receitas - best.despesas ? m : best), null
  );
  const piorMes = monthlyData?.reduce<MonthlyData | null>(
    (worst, m) => (!worst || m.receitas - m.despesas < worst.receitas - worst.despesas ? m : worst), null
  );

  const summaryCards = [
    { label: "Total Receitas", value: `€${totalReceitas.toFixed(2)}`, icon: TrendingUp, colorClass: "text-income bg-income/10" },
    { label: "Total Despesas", value: `€${totalDespesas.toFixed(2)}`, icon: TrendingDown, colorClass: "text-expense bg-expense/10" },
    { label: "Saldo Actual", value: `€${(stats as any)?.saldoAtual?.toFixed(2) ?? "0.00"}`, icon: Wallet, colorClass: "text-primary bg-primary/10" },
    { label: "Poupança Total", value: `€${(totalReceitas - totalDespesas).toFixed(2)}`, icon: PiggyBank, colorClass: "text-income bg-income/10" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Resumo financeiro detalhado</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Download className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, colorClass }) => (
          <div key={label} className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {monthlyData && monthlyData.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Desempenho Mensal
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Mês</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Receitas</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Despesas</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Poupança</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m) => {
                  const poupanca = m.receitas - m.despesas;
                  const taxa = m.receitas > 0 ? ((poupanca / m.receitas) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={m.month} className="border-b border-border/20 hover:bg-secondary/20">
                      <td className="p-3 font-medium">{m.month}</td>
                      <td className="p-3 text-right text-income tabular-nums">€{m.receitas.toFixed(2)}</td>
                      <td className="p-3 text-right text-expense tabular-nums">€{m.despesas.toFixed(2)}</td>
                      <td className={`p-3 text-right font-semibold tabular-nums ${poupanca >= 0 ? "text-income" : "text-expense"}`}>
                        {poupanca >= 0 ? "+" : ""}€{poupanca.toFixed(2)}
                      </td>
                      <td className={`p-3 text-right text-xs font-medium ${parseFloat(taxa) >= 0 ? "text-income" : "text-expense"}`}>
                        {taxa}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {melhorMes && piorMes && melhorMes.month !== piorMes.month && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-4 border border-income/20 bg-income/5">
            <p className="text-xs font-semibold text-income uppercase tracking-wider mb-1">Melhor Mês</p>
            <p className="text-lg font-bold">{melhorMes.month}</p>
            <p className="text-sm text-muted-foreground">Poupança: €{(melhorMes.receitas - melhorMes.despesas).toFixed(2)}</p>
          </div>
          <div className="glass-card rounded-xl p-4 border border-expense/20 bg-expense/5">
            <p className="text-xs font-semibold text-expense uppercase tracking-wider mb-1">Mês Mais Crítico</p>
            <p className="text-lg font-bold">{piorMes.month}</p>
            <p className="text-sm text-muted-foreground">Poupança: €{(piorMes.receitas - piorMes.despesas).toFixed(2)}</p>
          </div>
        </div>
      )}

      {categoryData && categoryData.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Top Categorias de Despesa</h3>
          <div className="space-y-3">
            {[...categoryData].sort((a, b) => b.valor - a.valor).map((cat) => {
              const total = categoryData.reduce((s, c) => s + c.valor, 0);
              const pct = total > 0 ? (cat.valor / total * 100).toFixed(1) : "0";
              return (
                <div key={cat.name} className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cat.cor }} />
                  <span className="text-sm flex-1">{cat.name}</span>
                  <div className="flex-1 bg-secondary/50 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.cor }} />
                  </div>
                  <span className="text-sm font-semibold tabular-nums w-20 text-right">€{cat.valor.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Relatorios;
