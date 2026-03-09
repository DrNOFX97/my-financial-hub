import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ExternalLink, User, Database, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { useQueryClient } from "@tanstack/react-query";

const Definicoes = () => {
  const { userId, spreadsheetId, logout } = useAuth();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await api.resetAll({ spreadsheetId: spreadsheetId! });
      queryClient.clear();
      setMessage("Todos os dados foram apagados.");
    } catch (e: any) {
      setMessage("Erro: " + (e.message || "falha ao apagar dados"));
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Definições</h1>
        <p className="text-muted-foreground text-sm">Configurações da conta e dados</p>
      </div>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4" /> Conta Google
        </h3>
        <div className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">User ID</span>
          <span className="font-mono text-xs truncate max-w-[200px] text-foreground">{userId || "—"}</span>
        </div>
        <Button variant="destructive" size="sm" onClick={logout} className="w-full">
          Terminar Sessão
        </Button>
      </div>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Database className="h-4 w-4" /> Google Sheets
        </h3>
        <div className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Spreadsheet ID</span>
          <span className="font-mono text-xs truncate max-w-[200px] text-foreground">{spreadsheetId || "—"}</span>
        </div>
        {spreadsheetId && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir no Google Sheets
          </Button>
        )}
      </div>

      <div className="glass-card rounded-xl p-5 space-y-4 border border-destructive/20">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4" /> Zona de Perigo
        </h3>
        <p className="text-sm text-muted-foreground">
          Apaga todos os movimentos e faturas do Google Sheets. Esta ação não pode ser desfeita.
        </p>
        {message && (
          <p className={`text-sm font-medium ${message.startsWith("Erro") ? "text-destructive" : "text-income"}`}>
            {message}
          </p>
        )}
        {!confirm ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirm(true)}
            disabled={!spreadsheetId}
          >
            <Trash2 className="h-4 w-4" />
            Repor todos os dados
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-destructive font-medium">Tens a certeza?</span>
            <Button size="sm" variant="destructive" onClick={handleReset} disabled={loading}>
              {loading ? "A apagar..." : "Sim, apagar tudo"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Info className="h-4 w-4" /> Sobre
        </h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">FinGestão v1.0</p>
          <p>
            Os seus dados financeiros são armazenados exclusivamente na sua conta Google (Drive + Sheets).
            Nenhum dado financeiro é guardado em servidores externos.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Definicoes;
