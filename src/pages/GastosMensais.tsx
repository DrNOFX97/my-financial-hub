import { categoryData, monthlyData } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";

const GastosMensais = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gastos Mensais</h1>
        <p className="text-muted-foreground text-sm">Análise detalhada dos gastos fixos e variáveis</p>
      </div>

      {/* Fixed Expenses */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Gastos Fixos Mensais</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categoryData.map((cat) => (
            <div key={cat.name} className="p-4 rounded-lg bg-secondary/50 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full" style={{ background: cat.cor }} />
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
              <p className="text-xl font-bold tabular-nums">€{cat.valor.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">por mês</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Comparison Chart */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Comparação por Categoria (Anual)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220 10% 50%)" angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 50%)" />
            <Tooltip formatter={(value: number) => [`€${value}`, undefined]} />
            <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
              {categoryData.map((entry, i) => (
                <Cell key={i} fill={entry.cor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default GastosMensais;
