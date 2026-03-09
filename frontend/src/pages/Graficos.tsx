import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { motion } from "framer-motion";
import { useMonthlyData, useCategoryData } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";

const Graficos = () => {
  const { spreadsheetId } = useAuth();
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyData(spreadsheetId!);
  const { data: categoryData, isLoading: categoryLoading } = useCategoryData(spreadsheetId!);

  const isLoading = monthlyLoading || categoryLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">A carregar gráficos...</p>
      </div>
    );
  }

  const noData = (!monthlyData || monthlyData.length === 0) && (!categoryData || categoryData.length === 0);

  if (noData) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gráficos</h1>
          <p className="text-muted-foreground text-sm">Visualização detalhada das finanças</p>
        </div>
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Sem dados suficientes para gerar gráficos.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Importa um extrato bancário ou adiciona movimentos para começar.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gráficos</h1>
        <p className="text-muted-foreground text-sm">Visualização detalhada das finanças</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {monthlyData && monthlyData.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Evolução Mensal</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220 10% 50%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 50%)" />
                <Tooltip formatter={(value: number) => [`€${value}`, undefined]} />
                <Area type="monotone" dataKey="receitas" stroke="hsl(160, 60%, 42%)" fill="hsl(160, 60%, 42%)" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="despesas" stroke="hsl(4, 72%, 56%)" fill="hsl(4, 72%, 56%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {categoryData && categoryData.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Distribuição de Despesas</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} dataKey="valor" nameKey="name" cx="50%" cy="50%" outerRadius={100} paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`€${value}`, undefined]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {monthlyData && monthlyData.length > 0 && (
          <div className="glass-card rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-4">Poupança Mensal (Receitas - Despesas)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData.map(d => ({ ...d, poupanca: d.receitas - d.despesas }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220 10% 50%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 50%)" />
                <Tooltip formatter={(value: number) => [`€${value}`, undefined]} />
                <Bar dataKey="poupanca" radius={[6, 6, 0, 0]}>
                  {monthlyData.map((d, i) => (
                    <Cell key={i} fill={d.receitas - d.despesas >= 0 ? "hsl(160, 60%, 42%)" : "hsl(4, 72%, 56%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Graficos;
