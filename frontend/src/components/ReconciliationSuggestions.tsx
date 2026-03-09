import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function ReconciliationSuggestions() {
    const { spreadsheetId } = useAuth();
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [done, setDone] = useState<Set<string>>(new Set());

    const { data: suggestions, isLoading } = useQuery({
        queryKey: ["reconcile-suggestions", spreadsheetId],
        queryFn: () => api.getReconcileSuggestions({ spreadsheetId: spreadsheetId! }) as Promise<any[]>,
        enabled: !!spreadsheetId,
    });

    const reconcileMutation = useMutation({
        mutationFn: ({ faturaId, movimentoId }: { faturaId: string; movimentoId: string }) =>
            api.reconcile({ faturaId, movimentoId, spreadsheetId: spreadsheetId! }),
    });

    const key = (s: any) => `${s.movement.id}-${s.invoice.id}`;

    const toggleSelect = (k: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(k) ? next.delete(k) : next.add(k);
            return next;
        });
    };

    const reconcileOne = async (s: any) => {
        const k = key(s);
        await reconcileMutation.mutateAsync({ faturaId: s.invoice.id, movimentoId: s.movement.id });
        setDone(prev => new Set(prev).add(k));
        setSelected(prev => { const n = new Set(prev); n.delete(k); return n; });
        queryClient.invalidateQueries({ queryKey: ["reconcile-suggestions"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
    };

    const reconcileSelected = async () => {
        const toProcess = (suggestions ?? []).filter(s => selected.has(key(s)));
        for (const s of toProcess) {
            await reconcileOne(s);
        }
    };

    const allKeys = (suggestions ?? []).map(key);
    const allSelected = allKeys.length > 0 && allKeys.every(k => selected.has(k));
    const toggleAll = () => {
        if (allSelected) setSelected(new Set());
        else setSelected(new Set(allKeys));
    };

    if (isLoading || !suggestions || suggestions.length === 0) return null;

    const pending = suggestions.filter(s => !done.has(key(s)));
    if (pending.length === 0) return null;

    return (
        <Card className="border-primary/20 bg-primary/5 mb-6 overflow-hidden">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Sugestões de Reconciliação</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                    {selected.size > 0 && (
                        <Button
                            size="sm"
                            className="h-7 gap-1.5 text-xs bg-primary text-primary-foreground"
                            onClick={reconcileSelected}
                            disabled={reconcileMutation.isPending}
                        >
                            {reconcileMutation.isPending
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Check className="h-3 w-3" />}
                            Associar {selected.size} selecionadas
                        </Button>
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        {pending.length} {pending.length === 1 ? 'Sugestão' : 'Sugestões'}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-0 border-t border-primary/10">
                {/* Select all row */}
                <div className="px-3 py-2 border-b border-primary/5 flex items-center gap-3">
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        id="select-all"
                    />
                    <label htmlFor="select-all" className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium cursor-pointer select-none">
                        Selecionar todas
                    </label>
                </div>
                <AnimatePresence>
                    {pending.map((s: any) => {
                        const k = key(s);
                        const isChecked = selected.has(k);
                        const isPending = reconcileMutation.isPending;

                        return (
                            <motion.div
                                key={k}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                className={`p-3 border-b border-primary/5 last:border-0 flex items-center gap-3 transition-colors ${isChecked ? "bg-primary/10" : "hover:bg-primary/5"}`}
                            >
                                <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => toggleSelect(k)}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-primary">{Math.round(s.score * 100)}% Confiança</span>
                                        <span className="h-1 w-1 rounded-full bg-primary/30" />
                                        <span className="text-xs font-semibold">€{Math.abs(s.movement.valor).toFixed(2)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        <div className="min-w-0">
                                            <p className="text-muted-foreground uppercase text-[8px] font-bold">Movimento</p>
                                            <p className="truncate font-medium">{s.movement.descricao}</p>
                                            <p className="text-muted-foreground">{new Date(s.movement.data).toLocaleDateString("pt-PT")}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-muted-foreground uppercase text-[8px] font-bold">Fatura</p>
                                            <p className="truncate font-medium">{s.invoice.emitente}</p>
                                            <p className="text-muted-foreground">{new Date(s.invoice.data).toLocaleDateString("pt-PT")}</p>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant={isChecked ? "default" : "outline"}
                                    className="h-8 gap-1.5 shrink-0"
                                    onClick={() => reconcileOne(s)}
                                    disabled={isPending}
                                >
                                    {isPending
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <Check className="h-3 w-3" />}
                                    <span className="text-xs">Associar</span>
                                </Button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
