import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTransactions } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import type { Transaction } from "@/types";

const PT_MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const COLORS = [
  "hsl(160,60%,42%)", "hsl(210,80%,55%)", "hsl(280,65%,60%)",
  "hsl(35,90%,55%)",  "hsl(4,72%,56%)",   "hsl(220,15%,45%)",
  "hsl(50,90%,50%)",  "hsl(330,70%,55%)",
];

function toYYYYMM(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelMonth(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  return `${PT_MONTHS[Number(m) - 1]} ${y.slice(-2)}`;
}

function toCategoryData(txs: Transaction[]) {
  const map: Record<string, number> = {};
  txs.forEach((t) => {
    if (t.valor >= 0) return;
    const cat = t.categoria || "Outros";
    map[cat] = (map[cat] || 0) + Math.abs(t.valor);
  });
  return Object.entries(map)
    .map(([name, valor], i) => ({ name, valor: parseFloat(valor.toFixed(2)), cor: COLORS[i % COLORS.length] }))
    .sort((a, b) => b.valor - a.valor);
}

// ---------- shared sub-components ----------

function CategoryCards({ cats, onSelect }: { cats: ReturnType<typeof toCategoryData>; onSelect: (c: typeof cats[0]) => void }) {
  if (cats.length === 0)
    return <p className="text-muted-foreground text-center py-8 text-sm">Sem despesas neste período.</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {cats.map((cat) => (
        <button
          key={cat.name}
          onClick={() => onSelect(cat)}
          className="p-4 rounded-lg bg-secondary/50 border border-border/30 text-left hover:bg-secondary/80 hover:border-border transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ background: cat.cor }} />
            <span className="text-sm font-medium truncate">{cat.name}</span>
          </div>
          <p className="text-xl font-bold tabular-nums">€{cat.valor.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">ver detalhe →</p>
        </button>
      ))}
    </div>
  );
}

function CategoryBar({ cats }: { cats: ReturnType<typeof toCategoryData> }) {
  if (cats.length === 0) return null;
  return (
    <div className="glass-card rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4">Comparação por Categoria</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={cats}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220 10% 50%)" angle={-25} textAnchor="end" height={55} />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 50%)" />
          <Tooltip formatter={(v: number) => [`€${v.toFixed(2)}`, "Despesa"]} />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
            {cats.map((e, i) => <Cell key={i} fill={e.cor} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DrillDialog({
  cat, txs, open, onClose,
}: {
  cat: ReturnType<typeof toCategoryData>[0] | null;
  txs: Transaction[];
  open: boolean;
  onClose: () => void;
}) {
  if (!cat) return null;
  const filtered = txs
    .filter((t) => t.categoria === cat.name && t.valor < 0)
    .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ background: cat.cor }} />
            {cat.name}
            <span className="ml-auto text-lg font-bold tabular-nums">€{cat.valor.toFixed(2)}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">Transações da categoria {cat.name}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 mt-2">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Sem transações.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-1 font-medium text-muted-foreground">Descrição</th>
                  <th className="text-left py-2 px-1 font-medium text-muted-foreground hidden sm:table-cell">Data</th>
                  <th className="text-right py-2 px-1 font-medium text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/20 hover:bg-secondary/30">
                    <td className="py-2 px-1 font-medium">{t.descricao}</td>
                    <td className="py-2 px-1 text-muted-foreground hidden sm:table-cell">
                      {new Date(t.data).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="py-2 px-1 text-right font-semibold text-expense tabular-nums">
                      -€{Math.abs(t.valor).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Monthly tab ----------

function GastosMensaisTab({ transactions }: { transactions: Transaction[] }) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => { if (t.valor < 0 && t.data) set.add(toYYYYMM(t.data)); });
    return [...set].sort().reverse().slice(0, 6);
  }, [transactions]);

  const defaultMonth = availableMonths.includes(currentMonth) ? currentMonth : (availableMonths[0] ?? currentMonth);
  const [month, setMonth] = useState(defaultMonth);

  const filtered = useMemo(
    () => transactions.filter((t) => t.data && toYYYYMM(t.data) === month),
    [transactions, month]
  );
  const cats = useMemo(() => toCategoryData(filtered), [filtered]);
  const total = cats.reduce((s, c) => s + c.valor, 0);

  const [selected, setSelected] = useState<typeof cats[0] | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total despesas</p>
          <p className="text-2xl font-bold tabular-nums text-expense">€{total.toFixed(2)}</p>
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>{labelMonth(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Gastos por Categoria — {labelMonth(month)}</h3>
        <CategoryCards cats={cats} onSelect={setSelected} />
      </div>

      <CategoryBar cats={cats} />

      {/* Pie chart */}
      {cats.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Distribuição</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={cats} dataKey="valor" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {cats.map((e, i) => <Cell key={i} fill={e.cor} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `€${v.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <DrillDialog cat={selected} txs={filtered} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ---------- Annual tab ----------

function GastosAnuaisTab({ transactions }: { transactions: Transaction[] }) {
  const currentYear = String(new Date().getFullYear());

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => { if (t.valor < 0 && t.data) set.add(String(new Date(t.data).getFullYear())); });
    return [...set].sort().reverse().slice(0, 5);
  }, [transactions]);

  const defaultYear = availableYears.includes(currentYear) ? currentYear : (availableYears[0] ?? currentYear);
  const [year, setYear] = useState(defaultYear);

  const filtered = useMemo(
    () => transactions.filter((t) => t.data && String(new Date(t.data).getFullYear()) === year),
    [transactions, year]
  );
  const cats = useMemo(() => toCategoryData(filtered), [filtered]);
  const total = cats.reduce((s, c) => s + c.valor, 0);

  // Monthly evolution for the year
  const monthlyEvolution = useMemo(() => {
    const map: Record<number, number> = {};
    filtered.forEach((t) => {
      if (t.valor >= 0) return;
      const m = new Date(t.data).getMonth();
      map[m] = (map[m] || 0) + Math.abs(t.valor);
    });
    return PT_MONTHS.map((label, i) => ({
      month: label,
      valor: parseFloat((map[i] || 0).toFixed(2)),
    })).filter((_, i) => {
      // só mostrar até ao mês atual se for o ano corrente
      if (year === currentYear) return i <= new Date().getMonth();
      return true;
    });
  }, [filtered, year, currentYear]);

  const [selected, setSelected] = useState<typeof cats[0] | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total despesas {year}</p>
          <p className="text-2xl font-bold tabular-nums text-expense">€{total.toFixed(2)}</p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Monthly bar chart */}
      {monthlyEvolution.some((m) => m.valor > 0) && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Despesas por Mês — {year}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220 10% 50%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 10% 50%)" />
              <Tooltip formatter={(v: number) => [`€${v.toFixed(2)}`, "Despesas"]} />
              <Bar dataKey="valor" fill="hsl(4,72%,56%)" radius={[4, 4, 0, 0]} name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category cards */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Gastos por Categoria — {year}</h3>
        <CategoryCards cats={cats} onSelect={setSelected} />
      </div>

      <CategoryBar cats={cats} />

      <DrillDialog cat={selected} txs={filtered} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ---------- Main page ----------

const Gastos = () => {
  const { spreadsheetId } = useAuth();
  const { data: transactions = [], isLoading } = useTransactions(spreadsheetId!, 2000);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">A carregar gastos...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gastos</h1>
        <p className="text-muted-foreground text-sm">Análise detalhada dos gastos por período</p>
      </div>

      <Tabs defaultValue="mensais">
        <TabsList className="mb-4">
          <TabsTrigger value="mensais">Gastos Mensais</TabsTrigger>
          <TabsTrigger value="anuais">Gastos Anuais</TabsTrigger>
        </TabsList>
        <TabsContent value="mensais">
          <GastosMensaisTab transactions={transactions} />
        </TabsContent>
        <TabsContent value="anuais">
          <GastosAnuaisTab transactions={transactions} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Gastos;
