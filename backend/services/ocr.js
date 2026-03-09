import Tesseract from 'tesseract.js';
import { PDFParse } from 'pdf-parse';

// ---------------------------------------------------------------------------
// parseMoney — suporta PT (1.830,01), EN (1,830.01), espaço-milhar (1 830,01)
// ---------------------------------------------------------------------------
function parseMoney(str) {
    if (!str) return 0;
    str = str.trim().replace(/\s/g, ''); // remover espaços (milhar por espaço)
    const hasDot = str.includes('.');
    const hasComma = str.includes(',');
    let normalized;
    if (hasDot && hasComma) {
        const lastDot = str.lastIndexOf('.');
        const lastComma = str.lastIndexOf(',');
        if (lastComma > lastDot) {
            // PT: 1.830,01 → 1830.01
            normalized = str.replace(/\./g, '').replace(',', '.');
        } else {
            // EN: 1,830.01 → 1830.01
            normalized = str.replace(/,/g, '');
        }
    } else if (hasComma) {
        const afterComma = str.split(',').pop();
        normalized = afterComma?.length === 2 ? str.replace(',', '.') : str.replace(',', '');
    } else {
        normalized = str;
    }
    const v = parseFloat(normalized);
    return isNaN(v) ? 0 : v;
}

// Padrão monetário: captura formatos PT e EN com ou sem separador de milhar
const NUM = '([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2}|[0-9]+[.,][0-9]{2})';

// ---------------------------------------------------------------------------
// detectDocumentType — devolve 'Fatura' | 'Recibo' | 'Orçamento' | etc.
// Procura sinais EXPLÍCITOS de orçamento/proposta antes de assumir fatura.
// ---------------------------------------------------------------------------
function detectDocumentType(text) {
    const tl = text.toLowerCase();

    // 1. Recibo de vencimento — sinais muito específicos, têm prioridade máxima
    const isPayslip =
        /recibo\s+de\s+(?:vencimento|ordenado|remunera|sal[aá]rio)/.test(tl) ||
        /\bpayslip\b|\bpay\s+slip\b|\bpay\s+stub\b/.test(tl) ||
        (/\babonos\b/.test(tl) && /\bdescontos\b/.test(tl)) ||
        /\bvencimento\s+base\b|\bsal[aá]rio\s+bruto\b/.test(tl) ||
        /l[ií]quido\s+a\s+receber/.test(tl);
    if (isPayslip) return 'Recibo de Vencimento';

    // 2. Nota de crédito / débito — específicos
    if (/\bnota\s+de\s+cr[eé]dito\b|\bcredit\s+note\b/.test(tl)) return 'Nota de Crédito';
    if (/\bnota\s+de\s+d[eé]bito\b|\bdebit\s+note\b/.test(tl)) return 'Nota de Débito';

    // 3. Comprovativo / MBWay
    if (/\bmbway\b|\bmb\s+way\b/.test(tl) && /\bpagamento\b|\btransfer/.test(tl)) return 'Comprovativo';
    if (/\bcomprovativo\b|\bcomprovante\b/.test(tl)) return 'Comprovativo';

    // 4. Fatura / Recibo — têm prioridade sobre Orçamento
    // Uma fatura que referencia um orçamento ("conforme orçamento n.º X") é ainda uma fatura
    if (/\bfatur[ar]\b|\bfactur[ar]\b|\binvoice\b/.test(tl)) return 'Fatura';
    if (/\brecibo\b|\breceipt\b/.test(tl)) return 'Recibo';

    // 5. Orçamento / Proforma / Cotação — só chegam aqui se não há sinal de fatura/recibo
    if (/\bor[cç]amento\b|\bproposta\s+(?:de\s+)?or[cç]amento\b|\bquote\b|\bestimate\b/.test(tl)) return 'Orçamento';
    if (/\bproforma\b|\bpro-forma\b/.test(tl)) return 'Proforma';
    if (/\bcota[cç][aã]o\b/.test(tl)) return 'Cotação';

    return 'Fatura';
}

// ---------------------------------------------------------------------------
// fluxoFromTipo — 'entrada' | 'saída' | '' conforme tipo de documento
// ---------------------------------------------------------------------------
function fluxoFromTipo(tipo) {
    switch (tipo) {
        case 'Recibo de Vencimento':
        case 'Nota de Crédito':
            return 'entrada';
        case 'Orçamento':
        case 'Proforma':
        case 'Cotação':
            return '';           // ainda não houve troca de dinheiro
        default:                 // Fatura, Recibo, Comprovativo, Nota de Débito
            return 'saída';
    }
}

// ---------------------------------------------------------------------------
// extractValorPayslip — estratégia específica para recibos de vencimento
// O valor líquido é o NUM € que aparece imediatamente antes do IBAN de transferência
// ---------------------------------------------------------------------------
function extractValorPayslip(text) {
    // 1. Último "NUM €" antes da linha do IBAN (= montante transferido = líquido)
    const ibanPos = text.search(/\bIBAN\b/i);
    if (ibanPos > 0) {
        const beforeIban = text.slice(0, ibanPos);
        const matches = [...beforeIban.matchAll(new RegExp(`${NUM}\\s*€`, 'g'))];
        if (matches.length > 0) {
            const v = parseMoney(matches[matches.length - 1][1]);
            if (v > 0) return v;
        }
    }
    // 2. "Líquido a receber: X" explícito (alguns formatos colocam o valor na mesma linha)
    const m = text.match(new RegExp(`l[ií]quido\\s+a\\s+receber\\s*:?\\s*(?:[€$]|EUR)?\\s*${NUM}`, 'i'));
    if (m) {
        const v = parseMoney(m[1]);
        if (v > 0) return v;
    }
    // 3. Fallback: último NUM € no documento
    const allEuro = [...text.matchAll(new RegExp(`${NUM}\\s*€`, 'g'))];
    if (allEuro.length > 0) {
        const v = parseMoney(allEuro[allEuro.length - 1][1]);
        if (v > 0) return v;
    }
    return 0;
}

// ---------------------------------------------------------------------------
// extractValor — extração em tiers, com consciência de IVA
// ---------------------------------------------------------------------------
function extractValor(text, docType = 'Fatura') {
    // Recibos de vencimento têm estrutura diferente (bruto vs líquido)
    if (docType === 'Recibo de Vencimento') {
        const v = extractValorPayslip(text);
        if (v > 0) return v;
    }
    // ---- Tier 1: etiquetas explícitas de valor final ----
    // Ordem: do mais específico (com IVA) para o mais genérico
    const tier1 = [
        // "Valor a pagar / Total a pagar / liquidar / receber: X" (com €, EUR, USD ou sem)
        new RegExp(`(?:TOTAL|VALOR)\\s+A\\s+(?:PAGAR|LIQUIDAR|RECEBER)\\s*:?\\s*(?:[€$]|EUR|USD|GBP)?\\s*${NUM}`, 'i'),
        // "Valor a pagar X EUR" — moeda depois do número
        new RegExp(`(?:TOTAL|VALOR)\\s+A\\s+(?:PAGAR|LIQUIDAR|RECEBER)\\s*:?\\s*${NUM}\\s*(?:[€$]|EUR|USD|GBP)`, 'i'),
        // "Total com IVA / c/ IVA / incl. IVA"
        new RegExp(`TOTAL\\s+(?:COM|C\\/|INCLUINDO|INCL\\.?|INC\\.?)\\s*IVA\\s*:?\\s*[€$]?\\s*${NUM}`, 'i'),
        // "Total incl. impostos / taxes"
        new RegExp(`TOTAL\\s+(?:INCL|COM)\\s+(?:IMPOSTOS|TAXES)\\s*:?\\s*[€$]?\\s*${NUM}`, 'i'),
        // "Amount due / Grand total / Total due / Total payable / Balance due"
        // aceita €, $, EUR, USD, GBP, etc. antes ou depois do número
        new RegExp(`(?:amount\\s+due|grand\\s+total|total\\s+due|total\\s+payable|balance\\s+due)\\s*:?\\s*(?:[€$]|EUR|USD|GBP)?\\s*${NUM}`, 'i'),
        new RegExp(`(?:amount\\s+due|grand\\s+total|total\\s+due|total\\s+payable|balance\\s+due)\\s*${NUM}\\s*(?:[€$]|EUR|USD|GBP)`, 'i'),
        // "Montante a pagar / devido"
        new RegExp(`MONTANTE\\s+(?:A\\s+PAGAR|DEVIDO)\\s*:?\\s*[€$]?\\s*${NUM}`, 'i'),
        // "Total da fatura / factura"
        new RegExp(`TOTAL\\s+(?:DA\\s+)?FATUR[AR]\\s*:?\\s*[€$]?\\s*${NUM}`, 'i'),
        // "Total Invoice / Total Invoice Amount"
        new RegExp(`TOTAL\\s+INVOICE(?:\\s+AMOUNT)?\\s*:?\\s*[€$]?\\s*${NUM}`, 'i'),
        // "Líquido a receber" / "Vencimento líquido" (recibos de vencimento)
        new RegExp(`L[IÍ]QUIDO\\s+A\\s+RECEBER\\s*:?\\s*(?:[€$]|EUR)?\\s*${NUM}`, 'i'),
        new RegExp(`VENCIMENTO\\s+L[IÍ]QUIDO\\s*:?\\s*(?:[€$]|EUR)?\\s*${NUM}`, 'i'),
        new RegExp(`(?:NET\\s+PAY|TAKE\\s+HOME|NET\\s+SALARY)\\s*:?\\s*(?:[€$]|EUR)?\\s*${NUM}`, 'i'),
        // "Pago a pronto" (desconto de pagamento imediato — valor efetivo)
        new RegExp(`PAGO\\s+A\\s+PRONTO\\s*:?\\s*[€$]?\\s*${NUM}`, 'i'),
        // Valor na linha SEGUINTE a "total a pagar" (multiline)
        new RegExp(`(?:TOTAL|VALOR)\\s+A\\s+(?:PAGAR|LIQUIDAR)[^\\d\\n]*\\n\\s*[€$]?\\s*${NUM}`, 'i'),
        new RegExp(`(?:amount\\s+due|balance\\s+due)[^\\d\\n]*\\n\\s*[€$]?\\s*${NUM}`, 'i'),
    ];

    for (const p of tier1) {
        const m = text.match(p);
        if (m) {
            const v = parseMoney(m[1]);
            if (v > 0) return v;
        }
    }

    // ---- Tier 2: TOTAL após a última linha de IVA ----
    // O total com IVA aparece DEPOIS da linha de IVA no documento
    const ivaMatches = [...text.matchAll(/\bIVA\b/gi)];
    const lastIvaIdx = ivaMatches.length > 0 ? ivaMatches[ivaMatches.length - 1].index : -1;
    const afterIva = lastIvaIdx >= 0 ? text.slice(lastIvaIdx) : text;

    // "TOTAL LÍQUIDO" depois do IVA = total com IVA incluído
    const totalLiquidoAfterIva = afterIva.match(
        new RegExp(`TOTAL\\s+L[IÍ]QUIDO\\s*(?:A\\s+(?:PAGAR|RECEBER))?\\s*:?\\s*[€$]?\\s*${NUM}`, 'i')
    );
    if (totalLiquidoAfterIva) {
        const v = parseMoney(totalLiquidoAfterIva[1]);
        if (v > 0) return v;
    }

    // TOTAL genérico depois do IVA — excluindo padrões de subtotal
    // Negative lookahead: não seguido de SEM, BRUTO, ILÍQUIDO, ANTES, BASE, DESCONTO
    const totalAfterIva = afterIva.match(
        new RegExp(
            `\\bTOTAL\\b(?!\\s*(?:SEM\\b|BRUTO\\b|IL[IÍ]QUIDO\\b|ANTES\\b|BASE\\b|DE\\s+DESCONTO|DESCONTO))` +
            `\\s*:?\\s*[€$]?\\s*${NUM}`,
            'i'
        )
    );
    if (totalAfterIva) {
        const v = parseMoney(totalAfterIva[1]);
        if (v > 0) return v;
    }

    // ---- Tier 3: último TOTAL no documento (excluindo subtotais) ----
    const allTotals = [...text.matchAll(
        new RegExp(
            `\\bTOTAL\\b(?!\\s*(?:SEM\\b|BRUTO\\b|IL[IÍ]QUIDO\\b|ANTES\\b|BASE\\b|DE\\s+DESCONTO|DESCONTO))` +
            `\\s*:?\\s*[€$]?\\s*${NUM}`,
            'gi'
        )
    )];
    if (allTotals.length > 0) {
        const v = parseMoney(allTotals[allTotals.length - 1][1]);
        if (v > 0) return v;
    }

    // ---- Tier 4: "TOTAL LÍQUIDO" em qualquer posição ----
    const totalLiquido = text.match(
        new RegExp(`TOTAL\\s+L[IÍ]QUIDO\\s*:?\\s*[€$]?\\s*${NUM}`, 'i')
    );
    if (totalLiquido) {
        const v = parseMoney(totalLiquido[1]);
        if (v > 0) return v;
    }

    // ---- Tier 5: Comprovativos — QUANTIA / MONTANTE / VALOR ---
    const quantia = text.match(new RegExp(`\\b(?:QUANTIA|MONTANTE|VALOR)\\s+(?:TRANSFERID[AO]|PAGO|ENVIADO|DO\\s+PAGAMENTO)\\s*:?\\s*[€$]?\\s*${NUM}`, 'i'));
    if (quantia) {
        const v = parseMoney(quantia[1]);
        if (v > 0) return v;
    }

    // ---- Tier 5b: MONTANTE standalone ----
    const montante = text.match(new RegExp(`\\bMONTANTE\\b\\s*:?\\s*[€$]?\\s*${NUM}`, 'i'));
    if (montante) {
        const v = parseMoney(montante[1]);
        if (v > 0) return v;
    }

    // ---- Tier 6: Último valor em € no texto após IVA (último recurso) ----
    for (const zone of [afterIva, text]) {
        const matches = [
            ...zone.matchAll(new RegExp(`${NUM}\\s*€`, 'g')),
            ...zone.matchAll(new RegExp(`[€$]\\s*${NUM}`, 'g')),
        ].sort((a, b) => b.index - a.index); // ordenar do mais próximo do fim
        if (matches.length > 0) {
            const v = parseMoney(matches[0][1]);
            if (v > 0) return v;
        }
    }

    return 0;
}

// ---------------------------------------------------------------------------
// extractData — preferir datas com etiqueta explícita
// ---------------------------------------------------------------------------
function extractData(text) {
    // Padrões a EXCLUIR do fallback — datas futuras de documentos de utilidades
    const EXCLUDE_LABELS = /(?:próxim|proxim|leitura\s+estimada|estimativa|prazo\s+limite|data\s+limite|validade|valid[ao]\s+at[eé]|pagamento\s+at[eé]|limite\s+de\s+pagamento|due\s+date|expir)/i;

    // Padrões com etiqueta explícita de emissão (mais fiáveis, do mais específico ao mais genérico)
    const labeled = [
        /(?:data\s+(?:da\s+)?fatura|data\s+da\s+factura|invoice\s+date|issue\s+date|data\s+de\s+emiss[aã]o|emitid[ao]\s+em|faturad[ao]\s+em)\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
        /(?:data\s+(?:da\s+)?fatura|data\s+da\s+factura|invoice\s+date|issue\s+date|data\s+de\s+emiss[aã]o|emitid[ao]\s+em|faturad[ao]\s+em)\s*:?\s*(\d{4}[\/\-]\d{2}[\/\-]\d{2})/i,
        /(?:^|\n)\s*data\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/im,
    ];
    for (const p of labeled) {
        const m = text.match(p);
        if (m) {
            const d = normalizeDate(m[1]);
            if (isSaneDate(d)) return d;
        }
    }

    // Fallback: todas as datas DD/MM/YYYY no documento, excluindo as precedidas por labels de vencimento futuro
    const datePattern = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/g;
    let m;
    while ((m = datePattern.exec(text)) !== null) {
        // Verificar se os ~60 chars antes têm label de exclusão
        const before = text.slice(Math.max(0, m.index - 60), m.index);
        if (EXCLUDE_LABELS.test(before)) continue;
        const d = normalizeDate(m[1]);
        if (isSaneDate(d)) return d;
    }

    // Fallback YYYY-MM-DD
    const iso = text.match(/\b(\d{4}[\/\-]\d{2}[\/\-]\d{2})\b/);
    if (iso) {
        const d = normalizeDate(iso[1]);
        if (isSaneDate(d)) return d;
    }

    return new Date().toISOString().split('T')[0];
}

// Valida que a data está entre há 10 anos e 60 dias no futuro (evita datas de próxima leitura, etc.)
function isSaneDate(isoDate) {
    const d = new Date(isoDate).getTime();
    const now = Date.now();
    const tenYearsAgo = now - 10 * 365.25 * 24 * 60 * 60 * 1000;
    const sixtyDaysAhead = now + 60 * 24 * 60 * 60 * 1000;
    return d >= tenYearsAgo && d <= sixtyDaysAhead;
}

function normalizeDate(raw) {
    const s = raw.replace(/\//g, '-');
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
        const [d, mo, y] = s.split('-');
        // Validar: mês entre 1-12, dia entre 1-31
        if (parseInt(mo) >= 1 && parseInt(mo) <= 12 && parseInt(d) >= 1 && parseInt(d) <= 31) {
            return `${y}-${mo}-${d}`;
        }
        return new Date().toISOString().split('T')[0];
    }
    return s; // já em YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// extractNumero — número de fatura/recibo/documento
// ---------------------------------------------------------------------------
function extractNumero(text) {
    const patterns = [
        // "Fatura n.º FA 2024/0001" ou "Invoice #INV-2024-001"
        /(?:fatura|factura|recibo|invoice|receipt|n[.º°]|number|#)\s*:?\s*([A-Z]{1,4}\s*[0-9]{4}[\/\-][0-9]{1,6})/i,
        // "N.º documento: 2024/0123" ou "Doc. n.º: ..."
        /n\.?[oº°]?\s*(?:doc(?:umento)?|fatura|factura|invoice)?\s*:?\s*([A-Z]{0,4}\s*[0-9]{4}[\/\-][0-9]{1,6})/i,
        // Serie/número: "FS 2024/1" "FT 2024/1234"
        /\b((?:FT|FS|FR|FA|ND|NC|RC|OR)\s*[0-9]{4}[\/\-][0-9]{1,6})\b/i,
        // Só "YYYY/NNNN" no contexto de fatura
        /(?:fatura|factura|invoice)\D{1,30}?([0-9]{4}[\/\-][0-9]{1,6})/i,
    ];

    for (const p of patterns) {
        const m = text.match(p);
        if (m) {
            const n = m[1].trim();
            // Excluir NIFs (9 dígitos começados por 1,2,5,6,8,9)
            if (/^[125689]\d{8}$/.test(n.replace(/\s/g, ''))) continue;
            return n;
        }
    }
    return '';
}

// ---------------------------------------------------------------------------
// OCRService
// ---------------------------------------------------------------------------
class OCRService {
    async processInvoice(buffer) {
        try {
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText({ maxPages: 3 });
            let text = result.text;

            if (text.trim().length < 100) {
                console.log('PDF parece ser imagem — OCR por Tesseract seria necessário.');
                // Tesseract flow omitido; pdf-parse cobre a maioria dos PDFs digitais
            }

            return this.parseInvoiceText(text);
        } catch (error) {
            console.error('Erro ao processar PDF:', error);
            throw error;
        }
    }

    parseInvoiceText(text) {
        const result = {
            emitente: 'Desconhecido',
            nif: '',
            valor: 0,
            data: new Date().toISOString().split('T')[0],
            numero: '',
            categoria: 'Outros',
            tipo: 'Fatura',
            fluxo: 'saída',
        };

        // --- Tipo de documento e fluxo ---
        result.tipo = detectDocumentType(text);
        result.fluxo = fluxoFromTipo(result.tipo);

        // --- NIF do emitente ---
        // Preferir NIF com etiqueta explícita; se houver vários, o emitente é tipicamente o primeiro
        const nifLabeled = text.match(/(?:NIF|N\.I\.F\.|Contribuinte)\s*:?\s*((?:PT)?[125689]\d{8})/i);
        if (nifLabeled) {
            result.nif = nifLabeled[1].replace(/^PT/i, '');
        } else {
            const nifAny = text.match(/\b([125689]\d{8})\b/);
            if (nifAny) result.nif = nifAny[0];
        }

        // --- Valor ---
        result.valor = extractValor(text, result.tipo);

        // --- Data ---
        result.data = extractData(text);

        // --- Número ---
        result.numero = extractNumero(text);

        // --- Emitente ---
        const SKIP = /^(page\s*\d|folha\s*n|original|duplicado|recibo\s*de|remuner|invoice$|receipt$|fatura$|factura$|or[cç]amento$|\d+\s*of\s*\d+)/i;
        const COMPANY = /\b(LDA|S\.?A\.?|UNIPESSOAL|LTD|INC|CORP|PBC|LMTD|LTDA|SL\b|NV\b)\b/i;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 4);
        const companyLine = lines.find(l => COMPANY.test(l) && !SKIP.test(l));
        if (companyLine) {
            result.emitente = companyLine.slice(0, 80);
        } else {
            const fallback = lines.find(l => !SKIP.test(l));
            if (fallback) result.emitente = fallback.slice(0, 80);
        }

        // --- Categoria ---
        const tl = text.toLowerCase();
        // Salário deve ser testado primeiro (antes de outras categorias) para evitar falsos positivos
        if (result.tipo === 'Recibo de Vencimento')                                            result.categoria = 'Salário';
        else if (/supermercado|continente|pingo\s*doce|lidl|aldi|mercado|alimentar/.test(tl)) result.categoria = 'Alimentação';
        else if (/\bedp\b|eletricidade|electricidade|\bgás\b|\bgas\b|\bágua\b|\bagua\b|saneamento/.test(tl)) result.categoria = 'Utilities';
        // NOS como operador telecom: evitar "nos" como palavra PT genérica
        else if (/telecomunica[cç]|nos\s+s\.?a\.?|nos\s+telecom|\bmeo\b|\bvodafone\b|internet|telefone/.test(tl)) result.categoria = 'Telecomunicações';
        else if (/\bseguro\b|seguradora|allianz|fidelidade|ageas/.test(tl))                    result.categoria = 'Seguros';
        else if (/sa[úu]de|farm[áa]cia|m[eé]dico|cl[ií]nica|hospital/.test(tl))              result.categoria = 'Saúde';
        else if (/combust[ií]vel|repsol|\bbp\b|\bgalp\b|posto/.test(tl))                      result.categoria = 'Transportes';
        else if (/restaurante|caf[eé]|pastelaria|pizz|takeaway/.test(tl))                     result.categoria = 'Restauração';
        else if (/amazon|fnac|worten|ikea|leroy/.test(tl))                                    result.categoria = 'Compras';

        return result;
    }
}

export default new OCRService();
