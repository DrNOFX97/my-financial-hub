import { Plus, Search, Filter, RefreshCw, Eye, ExternalLink, FileText, ArrowDownLeft, ArrowUpRight, Link2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { useInvoices, useScanGmail, useTransactions, useReconcile, useUpdateInvoice, useDeleteInvoice, useClearInvoices } from "@/hooks/useDashboard";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Invoice } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const statusColor: Record<string, string> = {
  Validada:          "bg-income/10 text-income border-income/20",
  Pendente:          "bg-warning/10 text-warning border-warning/20",
  Associada:         "bg-primary/10 text-primary border-primary/20",
  Manual:            "bg-primary/10 text-primary border-primary/20",
  Reconciliada:      "bg-income/10 text-income border-income/20",
  Orçamento:         "bg-muted/60 text-muted-foreground border-border",
  Proforma:          "bg-muted/60 text-muted-foreground border-border",
  Cotação:           "bg-muted/60 text-muted-foreground border-border",
  "Nota de Crédito": "bg-expense/10 text-expense border-expense/20",
  "Nota de Débito":  "bg-expense/10 text-expense border-expense/20",
};

function getDriveFileId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([^/]+)/);
  return match ? match[1] : null;
}

function InvoiceViewer({ invoice, open, onClose }: { invoice: Invoice | null; open: boolean; onClose: () => void }) {
  if (!invoice) return null;
  const fileId = invoice.urlDrive ? getDriveFileId(invoice.urlDrive) : null;
  const token = localStorage.getItem('auth_token');
  const embedUrl = fileId ? `${API_BASE}/drive/file?fileId=${fileId}&token=${token}` : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-semibold">{invoice.emitente}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {invoice.nif && <span>NIF {invoice.nif}</span>}
                  <span>{invoice.data ? new Date(invoice.data).toLocaleDateString("pt-PT") : '—'}</span>
                  <span className="font-semibold text-foreground">€{(invoice.valor ?? 0).toFixed(2)}</span>
                  <Badge variant="outline" className={cn("text-xs", statusColor[invoice.estado] || "")}>
                    {invoice.estado}
                  </Badge>
                </div>
              </DialogDescription>
            </div>
            {invoice.urlDrive && (
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" asChild>
                <a href={invoice.urlDrive} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir no Drive
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {embedUrl ? (
            <iframe src={embedUrl} className="w-full h-full border-0" title={`Fatura ${invoice.emitente}`} allow="autoplay" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <FileText className="h-16 w-16 opacity-20" />
              <p className="text-sm">Documento não disponível para pré-visualização</p>
              {invoice.urlDrive ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={invoice.urlDrive} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />Abrir no Google Drive
                  </a>
                </Button>
              ) : (
                <p className="text-xs opacity-60">Este documento não foi carregado para o Google Drive.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssociarDialog({
  invoice,
  open,
  onClose,
  spreadsheetId,
}: {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  spreadsheetId: string;
}) {
  const [search, setSearch] = useState("");
  const { data: transactions } = useTransactions(spreadsheetId, 2000);
  const reconcileMutation = useReconcile(spreadsheetId);

  if (!invoice) return null;

  // Show unreconciled movements, sorted by proximity of value then date
  const movements = (transactions ?? [])
    .filter((t) => {
      if (t.estado === "Reconciliado") return false;
      const desc = t.descricao?.toLowerCase() ?? "";
      const q = search.toLowerCase();
      return q === "" || desc.includes(q) || t.data?.includes(q);
    })
    .sort((a, b) => {
      const diffA = Math.abs(Math.abs(a.valor) - (invoice.valor ?? 0));
      const diffB = Math.abs(Math.abs(b.valor) - (invoice.valor ?? 0));
      return diffA - diffB;
    });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Associar a movimento
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{invoice.emitente}</span>
            {" · "}€{(invoice.valor ?? 0).toFixed(2)}
            {" · "}{invoice.data ? new Date(invoice.data).toLocaleDateString("pt-PT") : "—"}
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Filtrar movimentos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-1"
        />
        <div className="overflow-y-auto flex-1 mt-2 space-y-1">
          {movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Sem movimentos disponíveis.</p>
          ) : (
            movements.map((t) => {
              const diff = Math.abs(Math.abs(t.valor) - (invoice.valor ?? 0));
              const isExact = diff < 0.02;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={reconcileMutation.isPending}
                  onClick={() => {
                    reconcileMutation.mutate(
                      { faturaId: String(invoice.id), movimentoId: String(t.id) },
                      { onSuccess: onClose }
                    );
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors hover:bg-secondary/60",
                    isExact ? "border-income/30 bg-income/5" : "border-border/30"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.descricao}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.data).toLocaleDateString("pt-PT")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-bold tabular-nums", t.valor < 0 ? "text-expense" : "text-income")}>
                        {t.valor > 0 ? "+" : ""}€{Math.abs(t.valor).toFixed(2)}
                      </p>
                      {isExact && <p className="text-[10px] text-income font-medium">valor exacto</p>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const Faturas = () => {
  const { spreadsheetId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [associarInvoice, setAssociarInvoice] = useState<Invoice | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const { data: invoices, isLoading } = useInvoices(spreadsheetId!, statusFilter);
  const scanMutation = useScanGmail(spreadsheetId!);
  const updateMutation = useUpdateInvoice(spreadsheetId!);
  const deleteMutation = useDeleteInvoice(spreadsheetId!);
  const clearMutation = useClearInvoices(spreadsheetId!);

  const filteredInvoices = invoices
    ?.filter((inv) =>
      inv.emitente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const da = a.data ? new Date(a.data).getTime() : 0;
      const db = b.data ? new Date(b.data).getTime() : 0;
      return db - da;
    });

  const badgeLabel = (inv: Invoice) => {
    if (inv.estado === "Pendente" && inv.movimentoId) return "Associada";
    return inv.estado;
  };

  const badgeClass = (inv: Invoice) => {
    const label = badgeLabel(inv);
    return statusColor[label] || statusColor[inv.estado] || "";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faturas & Recibos</h1>
          <p className="text-muted-foreground text-sm">Gerir e consultar todos os documentos</p>
        </div>
        <div className="flex gap-2">
          {confirmClear ? (
            <span className="inline-flex items-center gap-1">
              <span className="text-sm text-muted-foreground mr-1">Limpar tudo?</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => { clearMutation.mutate(); setConfirmClear(false); }}
                disabled={clearMutation.isPending}
              >Sim, limpar</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmClear(false)}>Cancelar</Button>
            </span>
          ) : (
            <Button
              variant="outline"
              onClick={() => setConfirmClear(true)}
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="h-4 w-4" />
              Limpar lista
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
          >
            <RefreshCw className={cn("h-4 w-4", scanMutation.isPending && "animate-spin")} />
            {scanMutation.isPending ? "Sincronizando..." : "Sincronizar Gmail"}
          </Button>
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            Nova Fatura
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar faturas..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setStatusFilter(statusFilter ? undefined : "Pendente")}
          className={statusFilter ? "bg-accent/20" : ""}
        >
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
                <th className="text-center p-4 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">A carregar faturas...</td>
                </tr>
              ) : filteredInvoices?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {searchTerm || statusFilter ? "Nenhuma fatura encontrada" : "Sem faturas — sincronize o Gmail para importar"}
                  </td>
                </tr>
              ) : (
                filteredInvoices?.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-medium">{inv.emitente}</td>
                    <td className="p-4 text-muted-foreground hidden sm:table-cell font-mono text-xs">{inv.nif}</td>
                    <td className="p-4 text-muted-foreground">{inv.categoria}</td>
                    <td className="p-4 text-right">
                      <span className={cn(
                        "inline-flex items-center gap-1 font-semibold tabular-nums",
                        inv.fluxo === "entrada" ? "text-income" : inv.fluxo === "saída" ? "text-expense" : ""
                      )}>
                        <button
                          type="button"
                          title={inv.fluxo === "entrada" ? "Entrada — clique para mudar para saída" : "Saída — clique para mudar para entrada"}
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: String(inv.id), fluxo: inv.fluxo === "entrada" ? "saída" : "entrada" })}
                          className="shrink-0 rounded hover:opacity-70 transition-opacity disabled:opacity-40"
                        >
                          {inv.fluxo === "entrada"
                            ? <ArrowDownLeft className="h-3.5 w-3.5" />
                            : <ArrowUpRight className="h-3.5 w-3.5" />}
                        </button>
                        €{(inv.valor ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">
                      {inv.data ? new Date(inv.data).toLocaleDateString("pt-PT") : '—'}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant="outline" className={cn("text-xs", badgeClass(inv))}>
                        {badgeLabel(inv)}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Associar manualmente: só para faturas não reconciliadas */}
                        {inv.estado !== "Reconciliada" && (
                          <button
                            type="button"
                            onClick={() => setAssociarInvoice(inv)}
                            title="Associar a movimento"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          title="Ver documento"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {confirmDeleteId === String(inv.id) ? (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { deleteMutation.mutate(String(inv.id)); setConfirmDeleteId(null); }}
                              disabled={deleteMutation.isPending}
                              className="h-6 px-2 text-[10px] font-semibold rounded bg-destructive text-white hover:bg-destructive/80 disabled:opacity-40"
                            >Sim</button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="h-6 px-2 text-[10px] font-semibold rounded bg-secondary hover:bg-secondary/80"
                            >Não</button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(String(inv.id))}
                            title="Eliminar"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceViewer
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      <AssociarDialog
        invoice={associarInvoice}
        open={!!associarInvoice}
        onClose={() => setAssociarInvoice(null)}
        spreadsheetId={spreadsheetId!}
      />
    </motion.div>
  );
};

export default Faturas;
