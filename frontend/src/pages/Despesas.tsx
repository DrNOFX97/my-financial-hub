import { useTransactions, useCategoryData } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { ArrowDownRight, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const Despesas = () => {
  const { spreadsheetId } = useAuth();
  const { data: transactions, isLoading } = useTransactions(spreadsheetId!, 2000);
  const { data: categoryData } = useCategoryData(spreadsheetId!);

  const despesas = transactions?.filter((t) => t.valor < 0) ?? [];
  const totalDespesas = despesas.reduce((acc, t) => acc + Math.abs(t.valor), 0);

  const byMonth: Record<string, number> = {};
  despesas.forEach((t) => {
    const d = new Date(t.data);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth[key] = (byMonth[key] || 0) + Math.abs(t.valor);
  });
  const monthlyData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, valor]) => {
      const [y, m] = key.split("-");
      const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      return { month: `${months[Number(m) - 1]} ${y.slice(-2)}`, valor };
    });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
        <p className="text-muted-foreground text-sm">Todas as saídas financeiras</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-expense/10 flex items-center justify-center">
            <TrendingDown className="h-6 w-6 text-expense" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Despesas</p>
            <p className="text-3xl font-bold text-expense tabular-nums">€{totalDespesas.toFixed(2)}</p>
          </div>
        </div>

        {categoryData && categoryData.length > 0 && (
          <div className="glass-card rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-2">Distribuição por Categoria</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={categoryData} dataKey="valor" cx="50%" cy="50%" outerRadius={58} paddingAngle={2}>
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`€${v}`, undefined]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1 flex-1">
                {categoryData.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-1.5 text-[11px]">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: cat.cor }} />
                    <span className="text-muted-foreground truncate">{cat.name}</span>
                    <span className="font-semibold ml-auto">€{cat.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {monthlyData.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Evolução de Despesas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`€${v.toFixed(2)}`, "Despesas"]} />
              <Bar dataKey="valor" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-4 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Categoria</th>
              <th className="text-right p-4 font-medium text-muted-foreground">Valor</th>
              <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Data</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">A carregar...</td></tr>
            ) : despesas.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Sem despesas registadas</td></tr>
            ) : (
              despesas.map((t) => (
                <tr key={t.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="h-4 w-4 text-expense shrink-0" />
                      {t.descricao}
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell">{t.categoria}</td>
                  <td className="p-4 text-right font-semibold text-expense tabular-nums">-€{Math.abs(t.valor).toFixed(2)}</td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">{new Date(t.data).toLocaleDateString("pt-PT")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default Despesas;
