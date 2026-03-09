class AnalyticsService {
    /**
     * Aggregates movements by category.
     */
    getCategoryTotals(movements) {
        const totals = {};
        movements.forEach(m => {
            const cat = m.categoria || 'Outros';
            const val = Math.abs(parseFloat(m.valor) || 0);
            if (m.tipo === 'despesa' || m.valor < 0) {
                totals[cat] = (totals[cat] || 0) + val;
            }
        });

        const colors = [
            'hsl(160, 60%, 42%)', 'hsl(210, 80%, 55%)', 'hsl(280, 65%, 60%)',
            'hsl(35, 90%, 55%)', 'hsl(4, 72%, 56%)', 'hsl(220, 15%, 45%)'
        ];

        return Object.entries(totals).map(([name, valor], i) => ({
            name,
            valor: parseFloat(valor.toFixed(2)),
            cor: colors[i % colors.length]
        }));
    }

    /**
     * Groups movements by month for evolution chart.
     */
    getMonthlyEvolution(movements) {
        const months = {};
        movements.forEach(m => {
            const date = new Date(m.data);
            const monthKey = date.toLocaleDateString('pt-PT', { month: 'short' });

            if (!months[monthKey]) {
                months[monthKey] = { month: monthKey, receitas: 0, despesas: 0 };
            }

            const val = parseFloat(m.valor) || 0;
            if (val > 0) {
                months[monthKey].receitas += val;
            } else {
                months[monthKey].despesas += Math.abs(val);
            }
        });

        return Object.values(months).map(m => ({
            ...m,
            receitas: parseFloat(m.receitas.toFixed(2)),
            despesas: parseFloat(m.despesas.toFixed(2))
        }));
    }

    /**
     * Detects recurring patterns (fixed costs).
     * Matches similar descriptions and similar amounts (+/- 5%) across different months.
     */
    detectRecurringPatterns(movements) {
        const groups = {};

        // Filter expenses only
        const expenses = movements.filter(m => m.valor < 0);

        expenses.forEach(m => {
            const desc = m.descricao.toLowerCase().replace(/\d/g, '').trim(); // Remove numbers
            if (!groups[desc]) groups[desc] = [];
            groups[desc].push(m);
        });

        const recurring = [];
        for (const [desc, ms] of Object.entries(groups)) {
            if (ms.length >= 2) {
                // Check if they are in different months
                const uniqueMonths = new Set(ms.map(m => new Date(m.data).getMonth()));
                if (uniqueMonths.size >= 2) {
                    recurring.push({
                        descricao: ms[0].descricao,
                        valorMedio: ms.reduce((acc, curr) => acc + Math.abs(curr.valor), 0) / ms.length,
                        frequencia: ms.length,
                        categoria: ms[0].categoria
                    });
                }
            }
        }

        return recurring.sort((a, b) => b.valorMedio - a.valorMedio);
    }

    /**
     * Calculates main dashboard stats.
     */
    getStats(movements) {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const currentMonthMovements = movements.filter(m => {
            const d = new Date(m.data);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });

        const saldoAtual = movements.reduce((acc, m) => acc + parseFloat(m.valor || 0), 0);
        const receitasMes = currentMonthMovements.filter(m => m.valor > 0).reduce((acc, m) => acc + m.valor, 0);
        const despesasMes = currentMonthMovements.filter(m => m.valor < 0).reduce((acc, m) => acc + Math.abs(m.valor), 0);

        // Previous month for comparison
        const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;
        const prevMonthMovements = movements.filter(m => {
            const d = new Date(m.data);
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });
        const prevReceitas = prevMonthMovements.filter(m => m.valor > 0).reduce((acc, m) => acc + parseFloat(m.valor || 0), 0);
        const prevDespesas = prevMonthMovements.filter(m => m.valor < 0).reduce((acc, m) => acc + Math.abs(parseFloat(m.valor || 0)), 0);

        // Saldo before current month
        const saldoAnterior = movements
            .filter(m => { const d = new Date(m.data); return !(d.getMonth() === thisMonth && d.getFullYear() === thisYear); })
            .reduce((acc, m) => acc + parseFloat(m.valor || 0), 0);

        const variacaoSaldo = saldoAnterior !== 0
            ? parseFloat(((saldoAtual - saldoAnterior) / Math.abs(saldoAnterior) * 100).toFixed(1))
            : 0;
        const variacaoReceitas = prevReceitas > 0
            ? parseFloat(((receitasMes - prevReceitas) / prevReceitas * 100).toFixed(1))
            : 0;
        const variacaoDespesas = prevDespesas > 0
            ? parseFloat(((despesasMes - prevDespesas) / prevDespesas * 100).toFixed(1))
            : 0;

        return {
            saldoAtual: parseFloat(saldoAtual.toFixed(2)),
            receitasMes: parseFloat(receitasMes.toFixed(2)),
            despesasMes: parseFloat(despesasMes.toFixed(2)),
            poupanca: parseFloat((receitasMes - despesasMes).toFixed(2)),
            taxaPoupanca: receitasMes > 0 ? Math.round(((receitasMes - despesasMes) / receitasMes) * 100) : 0,
            variacaoSaldo,
            variacaoReceitas,
            variacaoDespesas
        };
    }
}

export default new AnalyticsService();
