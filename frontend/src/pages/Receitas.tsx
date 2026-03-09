import { useTransactions } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Receitas = () => {
  const { spreadsheetId } = useAuth();
  const { data: transactions, isLoading } = useTransactions(spreadsheetId!, 2000);

  const receitas = transactions?.filter((t) => t.valor > 0) ?? [];
  const totalReceitas = receitas.reduce((acc, t) => acc + t.valor, 0);

  const byMonth: Record<string, number> = {};
  receitas.forEach((t) => {
    const d = new Date(t.data);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth[key] = (byMonth[key] || 0) + t.valor;
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
        <h1 className="text-2xl font-bold tracking-tight">Receitas</h1>
        <p className="text-muted-foreground text-sm">Todas as entradas financeiras</p>
      </div>

      <div className="glass-card rounded-xl p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-income/10 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-income" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Registado</p>
          <p className="text-3xl font-bold text-income tabular-nums">€{totalReceitas.toFixed(2)}</p>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Evolução de Receitas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`€${v.toFixed(2)}`, "Receitas"]} />
              <Bar dataKey="valor" fill="hsl(160, 60%, 42%)" radius={[4, 4, 0, 0]} />
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
            ) : receitas.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Sem receitas registadas</td></tr>
            ) : (
              receitas.map((t) => (
                <tr key={t.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-income shrink-0" />
                      {t.descricao}
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell">{t.categoria}</td>
                  <td className="p-4 text-right font-semibold text-income tabular-nums">+€{t.valor.toFixed(2)}</td>
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

export default Receitas;
