import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import ReconciliationSuggestions from "@/components/ReconciliationSuggestions";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useMonthlyData, useCategoryData, useTransactions, useUpcomingPayments, useDashboardStats, useRecurringPatterns } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const Index = () => {
  const { spreadsheetId } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats(spreadsheetId!);
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyData(spreadsheetId!);
  const { data: categoryData, isLoading: categoryLoading } = useCategoryData(spreadsheetId!);
  const { data: recentTransactions, isLoading: transactionsLoading } = useTransactions(spreadsheetId!, 6);
  const { data: upcomingPayments, isLoading: paymentsLoading } = useUpcomingPayments(spreadsheetId!);
  const { data: recurringPatterns, isLoading: patternsLoading } = useRecurringPatterns(spreadsheetId!);

  const isLoading = statsLoading || monthlyLoading || categoryLoading || transactionsLoading || paymentsLoading || patternsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">A carregar dashboard...</p>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Resumo financeiro de {new Date().toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
        </p>
      </motion.div>

      <motion.div variants={item}>
        <ReconciliationSuggestions />
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Atual"
          value={`€${(stats as any)?.saldoAtual?.toFixed(2) || "0,00"}`}
          change={`+${(stats as any)?.variacaoSaldo || 0}% vs. mês anterior`}
          changeType="positive"
          icon={Wallet}
        />
        <StatCard
          title="Receitas (Mês)"
          value={`€${(stats as any)?.receitasMes?.toFixed(2) || "0,00"}`}
          change={`+€${(stats as any)?.variacaoReceitas || 0} vs. fev`}
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="Despesas (Mês)"
          value={`€${(stats as any)?.despesasMes?.toFixed(2) || "0,00"}`}
          change={`-${(stats as any)?.variacaoDespesas || 0}% vs. fev`}
          changeType="positive"
          icon={TrendingDown}
        />
        <StatCard
          title="Poupança"
          value={`€${(stats as any)?.poupanca?.toFixed(2) || "0,00"}`}
          change={`${(stats as any)?.taxaPoupanca || 0}% taxa poupança`}
          changeType="positive"
          icon={PiggyBank}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Receitas vs. Despesas (Anual)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220 10% 50%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 50%)" />
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 100%)",
                  border: "1px solid hsl(220 15% 90%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`€${value}`, undefined]}
              />
              <Bar dataKey="receitas" fill="hsl(160, 60%, 42%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="hsl(4, 72%, 56%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {(categoryData as any)?.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`€${value}`, undefined]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {(categoryData as any)?.map((cat: any) => (
              <div key={cat.name} className="flex items-center gap-1.5 text-[11px]">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ background: cat.cor }} />
                <span className="text-muted-foreground truncate">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Bottom Row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Últimas Transações</h3>
          <div className="space-y-3">
            {(recentTransactions as any)?.slice(0, 6).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    tx.valor > 0 ? "bg-income/10" : "bg-expense/10"
                  )}>
                    {tx.valor > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-income" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-expense" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{tx.descricao}</p>
                    <p className="text-xs text-muted-foreground">{tx.categoria}</p>
                  </div>
                </div>
                <span className={cn(
                  "font-semibold tabular-nums shrink-0 ml-2",
                  tx.valor > 0 ? "text-income" : "text-expense"
                )}>
                  {tx.valor > 0 ? "+" : ""}€{Math.abs(tx.valor).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Pagamentos Próximos</h3>
          <div className="space-y-3">
            {(upcomingPayments as any)?.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-secondary/50">
                <div className="min-w-0">
                  <p className="font-medium">{p.descricao}</p>
                  <p className="text-xs text-muted-foreground">{p.categoria} · Vence {new Date(p.dataVencimento).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}</p>
                </div>
                <span className="font-semibold text-foreground tabular-nums shrink-0 ml-2">
                  €{p.valor.toFixed(2)}
                </span>
              </div>
            ))}
            {(!upcomingPayments || (upcomingPayments as any).length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-4">Sem pagamentos próximos agendados.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Recurring Patterns Section */}
      <motion.div variants={item}>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Padrões de Gastos Fixos Detectados</h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
              Motor Analítico
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recurringPatterns as any)?.map((pattern: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20 transition-all hover:bg-secondary/40">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{pattern.descricao}</p>
                  <p className="text-xs text-muted-foreground">{pattern.categoria} · {pattern.frequencia}x detetado</p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="font-bold text-sm">€{pattern.valorMedio.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">média/mês</p>
                </div>
              </div>
            ))}
            {(!recurringPatterns || (recurringPatterns as any).length === 0) && (
              <div className="col-span-full py-8 text-center bg-secondary/10 rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground">Ainda não foram detectados padrões recorrentes suficientes.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">O motor analítico precisa de pelo menos 2 meses de dados.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Index;
