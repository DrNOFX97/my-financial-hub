import { Receipt, Plus, Search, Filter } from "lucide-react";
import { invoices } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const statusColor = {
  Validada: "bg-income/10 text-income border-income/20",
  Pendente: "bg-warning/10 text-warning border-warning/20",
  Manual: "bg-primary/10 text-primary border-primary/20",
};

const Faturas = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faturas & Recibos</h1>
          <p className="text-muted-foreground text-sm">Gerir e consultar todos os documentos</p>
        </div>
        <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4" />
          Nova Fatura
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar faturas..." className="pl-9" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Emitente</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">NIF</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Categoria</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Valor</th>
                <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Data</th>
                <th className="text-center p-4 font-medium text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer">
                  <td className="p-4 font-medium">{inv.emitente}</td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell font-mono text-xs">{inv.nif}</td>
                  <td className="p-4 text-muted-foreground">{inv.categoria}</td>
                  <td className="p-4 text-right font-semibold tabular-nums">€{inv.valor.toFixed(2)}</td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">
                    {new Date(inv.data).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="p-4 text-center">
                    <Badge variant="outline" className={cn("text-xs", statusColor[inv.estado])}>
                      {inv.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default Faturas;
