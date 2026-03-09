/**
 * BankStatementService
 * Parsers suportados:
 *  - CGD Caixadirecta (tabela copiada da página, incluindo Ctrl+A completo)
 *  - Millennium BCP (formato exportado)
 *  - Genérico (fallback)
 */

// ---------------------------------------------------------------------------
// parseMoney — PT (X.XXX,XX) e EN (X,XXX.XX)
// ---------------------------------------------------------------------------
function parseMoney(str) {
    if (!str) return 0;
    str = str.trim().replace(/\s/g, '');
    if (!str) return 0;
    if (/\d\.\d{3},\d{2}/.test(str)) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (/\d,\d{3}\.\d{2}/.test(str)) {
        return parseFloat(str.replace(/,/g, '')) || 0;
    }
    if (/^\d+,\d{2}$/.test(str)) {
        return parseFloat(str.replace(',', '.')) || 0;
    }
    if (/^\d+\.\d{2}$/.test(str)) {
        return parseFloat(str) || 0;
    }
    return 0;
}

// ---------------------------------------------------------------------------
// detectCategory — CGD descriptions
// ---------------------------------------------------------------------------
function detectCategory(desc) {
    const d = desc.toUpperCase();
    if (/CONTIN|PINGO\s*D|ALDI|LIDL|AUCHAN|MERCADO|ALIMENTAR|HIPERPOR|MINIPRECO|INTERMAR|SUPER\s*C|ALGARTA/.test(d)) return 'Alimentação';
    if (/REPSOL|GALP|BP\s|MOEVE|CEPSA|COMBUSTIVEL|GASOLINA|\bPA\s+FARO\b/.test(d)) return 'Combustível';
    if (/BOLT\.EU|UBER\b/.test(d)) return 'Transportes';
    if (/VODAFONE|MEO\s|NOS\b|INTERNET|TELECOMUNIC/.test(d)) return 'Telecomunicações';
    if (/NETFLIX|SPOTIFY|CLAUDE\.AI|GOOGLE\s*CLOUD|GOOGLE\s*PLAY|MICROIO|HIPAY|EASYPAY|AMAZON\s*PRIME|APPLE\.COM|EUPAGO/.test(d)) return 'Assinaturas';
    if (/COMPANHIA\s*DE\s*SEGUROS|FIDELIDADE|REALVSEGUROS|SECURITAS|ALLIANZ|AGEAS|TRANQUILIDADE|SEGURO/.test(d)) return 'Seguros';
    if (/FARMACI|CLINICA|CL.NICA|MEDICO|SAUDE|HOSP|DRMT|WELLS|DENT|OPTICA|PALMA\s*B|MODUSLA|ANALISE|LABORAT/.test(d)) return 'Saúde';
    if (/MCDON|KFC|PIZZA|BK\d|ALO\s*PIZ|RESTAUR|CAFE\b|CAFI|PASTELARIA|TAKEAWAY|BAFO|HANAMI|TERRAZZ|DOM\s*LUI|PRAIASU|O\s*ADRO|O\s*BECO|NATSU|REST\s*IR|TOMA|REST\s*KO|MONTE\s*D|FARO\s*DO|TRIGO\s*D|MIMINHO|PORTUGA|YOKOHAM/.test(d)) return 'Restauração';
    if (/SPORTING\s+CLUBE|GINASIO|GYM\b|FITNESS|PADEL|PISCINA|NATACAO/.test(d)) return 'Desporto';
    if (/AMBIFARO|PARQUIM|EMEL\b|SMASUL/.test(d)) return 'Transportes';
    if (/PAPELAR|CHAMAQU/.test(d)) return 'Papelaria';
    if (/ZARA|H3\s|HM\s|PRIMARK|PARFOIS|OYSHO|LEFTIES|PULL\b|ADIDAS|TEZENIS|MO\s*FARO|NORMALA|WINK|CHAPEUS|LE\s*JARD|EL\s*CORT|FC\s*R|DESPORT|KONNICH|BANGLA|BAGGA|WOMEN\s*S/.test(d)) return 'Roupa';
    if (/IKEA|WORTEN|FNAC|AMAZON|XIAOMI|MAKINA|NUMEROS|NOTE\s*I|CONQUISTA|LOJA|D\s*ORO\s*J/.test(d)) return 'Compras';
    if (/COBRANCA\s*PRESTACAO|HIPOTECA|CREDITO\s*HAB/.test(d)) return 'Habitação';
    if (/MANUT.*CONTA|COMISSAO|IMPOSTO\s*SELO/.test(d)) return 'Banco';
    if (/LEVANTAMENTO/.test(d)) return 'Numerário';
    if (/CAR\s*WAL|CARTAO.*REVOL/.test(d)) return 'Cartão';
    if (/PAG.*PAG-ESTADO|FINANCAS|IRS|AT\.GOV/.test(d)) return 'Impostos';
    if (/TRF|TRANSFER|TFI\b/.test(d)) return 'Transferências';
    return 'Outros';
}

// ---------------------------------------------------------------------------
// isLikelyCredit — heurística para transações onde a comparação de saldo falha
// ---------------------------------------------------------------------------
function isLikelyCredit(desc) {
    const d = desc.toUpperCase();
    // TRF + nome externo (não via app CGD nem MBWay saída)
    if (/^TRF\s+/.test(d) && !/^TRF\s+(CXDAPP|MBWAY)/i.test(d)) return true;
    // TFI = transferência recebida
    if (/^TFI\s/.test(d)) return true;
    // Devoluções / créditos explícitos
    if (/^CREDIT\s+VOUCHER|^DEVOLUCAO|^ESTORNO|^REEMBOLSO|^ABONO/.test(d)) return true;
    return false;
}

// ---------------------------------------------------------------------------
// parseCGD — suporta o Ctrl+A completo da página Caixadirecta
// ---------------------------------------------------------------------------
function parseCGD(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    // --- 1. Filtrar só as linhas de transação ---
    // Uma linha de transação começa com DD-MM-YYYY
    const DATE_RE = /^(\d{2}-\d{2}-\d{4})\s/;
    const txLines = lines.filter(l => DATE_RE.test(l));
    if (txLines.length === 0) return [];

    // --- 2. Padrão PT de valor monetário ---
    // Captura: 1.027,22 | 44.810,19 | 2,50 (mas não datas como 28-02-2026)
    const PT_NUM_RE = /\d{1,3}(?:\.\d{3})*,\d{2}/g;

    // --- 3. Extrair campos de cada linha ---
    const rows = [];
    for (const line of txLines) {
        const dateStr = line.match(/^(\d{2}-\d{2}-\d{4})/)[1];
        const [d, m, y] = dateStr.split('-');
        const data = `${y}-${m}-${d}`;

        // Texto depois da data
        const rest = line.slice(10).trim();

        // Todos os valores PT na linha
        const nums = [...rest.matchAll(PT_NUM_RE)].map(m => parseMoney(m[0]));
        if (nums.length < 2) continue; // precisa pelo menos amount + saldo

        // Último par = saldo contabilístico + saldo disponível
        // Primeiro(s) valor(es) = transação
        const saldo = nums[nums.length - 2]; // saldo contabilístico após movimento

        // Descrição: tudo antes do primeiro número
        const firstNumPos = rest.search(PT_NUM_RE);
        const descricao = rest.slice(0, firstNumPos).trim();
        if (!descricao) continue;

        // Valor da transação: primeiro número antes dos saldos
        const amount = nums[0];

        rows.push({ data, descricao, amount, saldo, line });
    }

    if (rows.length === 0) return [];

    // --- 4. Determinar débito/crédito pela variação de saldo ---
    // Lista está newest-first: rows[i] aconteceu DEPOIS de rows[i+1]
    // sign = sign(saldo[i] - saldo[i+1]):
    //   negativo → débito (saldo baixou)
    //   positivo → crédito (saldo subiu)
    const movements = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let isCredit = false;

        if (i < rows.length - 1) {
            const diff = row.saldo - rows[i + 1].saldo;
            const matchesAmount = Math.abs(Math.abs(diff) - row.amount) < 0.02;
            if (matchesAmount) {
                isCredit = diff > 0;
            } else {
                // Saldos não batem (transações simultâneas, pendentes, etc.)
                // Usar heurística de descrição
                isCredit = isLikelyCredit(row.descricao);
            }
        } else {
            // Última linha (mais antiga): só heurística
            isCredit = isLikelyCredit(row.descricao);
        }

        const valor = isCredit ? row.amount : -row.amount;

        movements.push({
            id: `ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            data: row.data,
            descricao: row.descricao,
            valor,
            tipo: isCredit ? 'receita' : 'despesa',
            estado: 'Pendente',
            categoria: detectCategory(row.descricao),
        });
    }

    return movements;
}

// ---------------------------------------------------------------------------
// parseMillennium — formato Millennium BCP
// ---------------------------------------------------------------------------
function parseMillennium(rawText) {
    const movements = [];
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    // Millennium: "DD-MM-YYYY DESCRIPTION AMOUNT" ou com separador ;
    const RE = /^(\d{2}[-/]\d{2}[-/]\d{4})[;\t\s]+(.+?)[;\t\s]+(-?[\d.,]+)/;
    for (const line of lines) {
        const m = line.match(RE);
        if (!m) continue;
        const [, dateStr, desc, amtStr] = m;
        const [d, mo, y] = dateStr.split(/[-/]/);
        const valor = parseMoney(amtStr.replace(/\./g, '').replace(',', '.')) * (amtStr.startsWith('-') ? -1 : 1);
        movements.push({
            id: `ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            data: `${y}-${mo}-${d}`,
            descricao: desc.trim(),
            valor,
            tipo: valor >= 0 ? 'receita' : 'despesa',
            estado: 'Pendente',
            categoria: detectCategory(desc),
        });
    }
    return movements;
}

// ---------------------------------------------------------------------------
// parseGeneric — fallback para outros formatos
// ---------------------------------------------------------------------------
function parseGeneric(rawText) {
    const movements = [];
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const RE = /(\d{2}[-/]\d{2}[-/]\d{4})\s+(.+?)\s+(-?[\d.,]+(?:\s*€)?)\s*$/;
    for (const line of lines) {
        const m = line.match(RE);
        if (!m) continue;
        const [, dateStr, desc, amtStr] = m;
        const [d, mo, y] = dateStr.split(/[-/]/);
        const raw = amtStr.replace(/€/g, '').trim();
        const valor = parseMoney(raw) * (raw.startsWith('-') ? -1 : 1);
        if (valor === 0) continue;
        movements.push({
            id: `ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            data: `${y}-${mo}-${d}`,
            descricao: desc.trim(),
            valor,
            tipo: valor >= 0 ? 'receita' : 'despesa',
            estado: 'Pendente',
            categoria: detectCategory(desc),
        });
    }
    return movements;
}

// ---------------------------------------------------------------------------
// Deteção de banco pelo conteúdo do texto
// ---------------------------------------------------------------------------
function detectBank(text) {
    const t = text.toLowerCase();
    if (/caixadirecta|cgd|caixa\s*geral\s*de\s*dep|saldo\s*contabilístico/.test(t)) return 'cgd';
    if (/millenniumbcp|m\.bcp|millennium\s*bcp/.test(t)) return 'millennium';
    return 'generic';
}

// ---------------------------------------------------------------------------
// BankStatementService
// ---------------------------------------------------------------------------
class BankStatementService {
    parse(text) {
        if (!text || typeof text !== 'string') return [];

        const bank = detectBank(text);

        if (bank === 'cgd') {
            const result = parseCGD(text);
            if (result.length > 0) return result;
        }

        if (bank === 'millennium') {
            const result = parseMillennium(text);
            if (result.length > 0) return result;
        }

        // Tentar CGD independentemente (mesmo sem deteção)
        const cgd = parseCGD(text);
        if (cgd.length > 0) return cgd;

        return parseGeneric(text);
    }
}

export default new BankStatementService();
