import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { monthlyData, categoryData, recentTransactions, upcomingPayments } from "@/data/mockData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const Index = () => {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumo financeiro de Março 2026</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Saldo Atual" value="€4.230,50" change="+12% vs. mês anterior" changeType="positive" icon={Wallet} />
        <StatCard title="Receitas (Mês)" value="€2.800,00" change="+€200 vs. fev" changeType="positive" icon={TrendingUp} />
        <StatCard title="Despesas (Mês)" value="€1.245,24" change="-8% vs. fev" changeType="positive" icon={TrendingDown} />
        <StatCard title="Poupança" value="€1.554,76" change="55% taxa poupança" changeType="positive" icon={PiggyBank} />
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
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`€${value}`, undefined]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {categoryData.map((cat) => (
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
            {recentTransactions.slice(0, 6).map((tx) => (
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
            {upcomingPayments.map((p) => (
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
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Index;
