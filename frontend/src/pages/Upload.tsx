import { Upload, FileText, PenLine } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useProcessExtract, useAddTransaction } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Alimentação", "Casa", "Telecomunicações", "Eletricidade", "Água",
  "Seguros", "Combustível", "Lazer", "Saúde", "Educação", "Receita", "Outros",
];

const UploadPage = () => {
  const { spreadsheetId } = useAuth();
  const { toast } = useToast();
  const [extractText, setExtractText] = useState("");
  const processExtractMutation = useProcessExtract(spreadsheetId!);
  const addTransactionMutation = useAddTransaction(spreadsheetId!);

  const [manual, setManual] = useState({
    descricao: "",
    valor: "",
    data: new Date().toISOString().split("T")[0],
    categoria: "Outros",
    tipo: "despesa" as "despesa" | "receita",
  });

  const handleProcessExtract = () => {
    if (extractText.trim()) {
      processExtractMutation.mutate(extractText, {
        onSuccess: (data: any) => {
          toast({ title: "Extrato processado", description: data?.message || "Movimentos importados com sucesso." });
          setExtractText("");
        },
        onError: () => toast({ title: "Erro ao processar extrato", variant: "destructive" }),
      });
    }
  };

  const handleManualSubmit = () => {
    if (!manual.descricao.trim() || !manual.valor) {
      toast({ title: "Preenche todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const valorNum = parseFloat(manual.valor);
    if (isNaN(valorNum) || valorNum === 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    addTransactionMutation.mutate(
      {
        descricao: manual.descricao.trim(),
        valor: manual.tipo === "despesa" ? -Math.abs(valorNum) : Math.abs(valorNum),
        data: manual.data,
        categoria: manual.categoria,
        tipo: manual.tipo,
      },
      {
        onSuccess: () => {
          toast({ title: "Movimento adicionado", description: manual.descricao });
          setManual({ descricao: "", valor: "", data: new Date().toISOString().split("T")[0], categoria: "Outros", tipo: "despesa" });
        },
        onError: () => toast({ title: "Erro ao adicionar movimento", variant: "destructive" }),
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload de Documentos</h1>
        <p className="text-muted-foreground text-sm">
          Carrega faturas, recibos ou extratos bancários
        </p>
      </div>

      {/* Upload Fatura */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Upload de Fatura</h3>
            <p className="text-xs text-muted-foreground">PDF ou imagem (OCR automático)</p>
          </div>
        </div>
        <FileUpload />
      </div>

      {/* Colar Extrato */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Upload className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Colar Extrato Bancário</h3>
            <p className="text-xs text-muted-foreground">Copia e cola do homebanking</p>
          </div>
        </div>
        <Textarea
          placeholder="Cole aqui o extrato do banco (copy/paste do Millennium, Caixa, Santander, etc.)..."
          className="min-h-[150px] font-mono text-xs bg-secondary/30"
          value={extractText}
          onChange={(e) => setExtractText(e.target.value)}
        />
        <div className="flex gap-2 mt-3">
          <Button
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleProcessExtract}
            disabled={processExtractMutation.isPending || !extractText.trim()}
          >
            <Upload className="h-4 w-4" />
            {processExtractMutation.isPending ? "A processar..." : "Processar Extrato"}
          </Button>
        </div>
      </div>

      {/* Inserir Movimento Manual */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <PenLine className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Inserir Movimento Manual</h3>
            <p className="text-xs text-muted-foreground">Adiciona uma despesa ou receita manualmente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tipo */}
          <div className="sm:col-span-2 flex gap-2">
            {(["despesa", "receita"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setManual((m) => ({ ...m, tipo: t }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                  manual.tipo === t
                    ? t === "despesa"
                      ? "bg-expense/10 border-expense/30 text-expense"
                      : "bg-income/10 border-income/30 text-income"
                    : "border-border/30 text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                {t === "despesa" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Descrição *</label>
            <Input
              placeholder="Ex: Supermercado Continente"
              value={manual.descricao}
              onChange={(e) => setManual((m) => ({ ...m, descricao: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Valor (€) *</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={manual.valor}
              onChange={(e) => setManual((m) => ({ ...m, valor: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Data</label>
            <Input
              type="date"
              value={manual.data}
              onChange={(e) => setManual((m) => ({ ...m, data: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Categoria</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={manual.categoria}
              onChange={(e) => setManual((m) => ({ ...m, categoria: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <Button
          className="mt-4 w-full gap-2"
          onClick={handleManualSubmit}
          disabled={addTransactionMutation.isPending || !manual.descricao.trim() || !manual.valor}
        >
          <PenLine className="h-4 w-4" />
          {addTransactionMutation.isPending ? "A guardar..." : "Adicionar Movimento"}
        </Button>
      </div>
    </motion.div>
  );
};

export default UploadPage;
