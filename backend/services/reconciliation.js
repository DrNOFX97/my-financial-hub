class ReconciliationService {
    /**
     * Calculates a confidence score between 0 and 1.
     */
    calculateScore(movement, invoice) {
        let score = 0;

        // 1. Value (40%)
        // Movement value is usually negative (expense), invoice is positive
        const moveVal = Math.abs(movement.valor);
        const invVal = Math.abs(invoice.valor);

        if (moveVal === invVal) {
            score += 0.4;
        } else if (invVal > 0 && Math.abs(moveVal - invVal) / invVal < 0.01) {
            score += 0.2; // 1% tolerance
        }

        // 2. Date (30%)
        const moveDate = new Date(movement.data);
        const invDate = new Date(invoice.data);
        const diffTime = Math.abs(moveDate.getTime() - invDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) score += 0.3;
        else if (diffDays === 1) score += 0.25;
        else if (diffDays <= 3) score += 0.15;
        else if (diffDays <= 7) score += 0.05;

        // 3. Text Similarity (30%)
        const textSim = this.stringSimilarity(
            movement.descricao.toLowerCase(),
            invoice.emitente.toLowerCase()
        );
        score += textSim * 0.3;

        return Math.min(score, 1);
    }

    /**
     * Simple string similarity (Jaccard-like or inclusion)
     */
    stringSimilarity(s1, s2) {
        if (!s1 || !s2) return 0;

        // Clean strings (remove common bank prefixes/noise)
        const clean = (s) => s.replace(/compra|pagamento|tpa|atm|viz\./gi, '').trim();
        const c1 = clean(s1);
        const c2 = clean(s2);

        if (c1.includes(c2) || c2.includes(c1)) return 1;

        // Basic overlap of words
        const words1 = c1.split(/\s+/);
        const words2 = c2.split(/\s+/);
        const intersection = words1.filter(w => w.length > 2 && words2.includes(w));

        return intersection.length > 0 ? 0.8 : 0;
    }

    /**
     * Matches a movement with pending invoices and returns scored matches.
     */
    async findMatches(movement, pendingInvoices) {
        if (!pendingInvoices || pendingInvoices.length === 0) return [];

        return pendingInvoices
            .map(invoice => ({
                invoice,
                score: this.calculateScore(movement, invoice)
            }))
            .filter(m => m.score >= 0.5) // Only relevant ones
            .sort((a, b) => b.score - a.score);
    }

    // Deprecated: keeping old signature for compatibility if needed elsewhere
    async reconcile(movement, pendingInvoices) {
        const matches = await this.findMatches(movement, pendingInvoices);
        const best = matches[0];
        return (best && best.score >= 0.85) ? best.invoice.id : null;
    }
}

export default new ReconciliationService();
