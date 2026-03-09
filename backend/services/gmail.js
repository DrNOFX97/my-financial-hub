import { google } from 'googleapis';

// Query para emails com anexo PDF (faturas digitais)
const INVOICE_QUERY_PDF = [
    'has:attachment filename:pdf',
    '(',
    'subject:fatura OR subject:factura OR subject:recibo OR subject:invoice OR subject:receipt',
    'OR subject:pagamento OR subject:comprovativo OR subject:"nota de débito"',
    'OR subject:"nota de crédito" OR subject:encomenda OR subject:compra',
    'OR from:noreply@mbway OR from:noreply@multibanco',
    'OR subject:"confirmação de pagamento" OR subject:"payment confirmation"',
    ')',
].join(' ');

// Query para emails de cobrança sem PDF (PayPal, AT, Stripe, bancos, etc.)
const INVOICE_QUERY_BODY = [
    '(',
    'from:paypal OR from:stripe OR from:amazon',
    'OR from:at.gov.pt OR from:portaldasfinancas OR from:efatura',
    'OR from:mbway OR from:sibs OR from:multibanco',
    'OR from:cgd.pt OR from:millenniumbcp.pt OR from:novobanco.pt OR from:santander.pt',
    'OR from:worten.pt OR from:fnac.pt OR from:ikea',
    'OR from:bolt.eu OR from:uber OR from:glovo',
    'OR from:spotify OR from:netflix OR from:apple',
    ')',
    '(',
    'subject:fatura OR subject:factura OR subject:recibo OR subject:invoice OR subject:receipt',
    'OR subject:pagamento OR subject:confirmação OR subject:payment OR subject:compra',
    'OR subject:"sua encomenda" OR subject:"order confirmation" OR subject:"débito"',
    ')',
    '-has:attachment',
].join(' ');

class GmailService {
    constructor(auth) {
        this.gmail = google.gmail({ version: 'v1', auth });
    }

    /**
     * Lista emails com PDF de faturas/recibos.
     */
    async listInvoices(query = INVOICE_QUERY_PDF) {
        const response = await this.gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 50
        });
        return response.data.messages || [];
    }

    /**
     * Lista emails de cobrança sem PDF (corpo do email).
     */
    async listBodyInvoices() {
        const response = await this.gmail.users.messages.list({
            userId: 'me',
            q: INVOICE_QUERY_BODY,
            maxResults: 30
        });
        return response.data.messages || [];
    }

    /**
     * Gets message details including snippets and attachment IDs.
     */
    async getMessage(id) {
        const response = await this.gmail.users.messages.get({
            userId: 'me',
            id: id,
            format: 'full',
        });
        return response.data;
    }

    /**
     * Retrieves an attachment's raw data.
     */
    async getAttachment(messageId, attachmentId) {
        const response = await this.gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: messageId,
            id: attachmentId
        });

        // Gmail returns base64url encoded data (replace - with + and _ with /)
        const data = response.data.data;
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(base64, 'base64');
    }

    /**
     * Recursively extracts PDF attachments from message parts (handles nested multipart).
     */
    extractAttachments(message) {
        const attachments = [];
        this._extractPartsRecursive(message.payload?.parts || [], attachments);
        return attachments;
    }

    _extractPartsRecursive(parts, result) {
        for (const part of parts) {
            // Recurse into nested multipart
            if (part.mimeType?.startsWith('multipart/') && part.parts) {
                this._extractPartsRecursive(part.parts, result);
            } else if (
                part.filename &&
                part.filename.toLowerCase().endsWith('.pdf') &&
                part.body?.attachmentId
            ) {
                result.push({
                    filename: part.filename,
                    attachmentId: part.body.attachmentId,
                    mimeType: part.mimeType || 'application/pdf',
                });
            }
        }
    }

    /**
     * Extracts plain text from the email body (for emails without PDF attachments).
     * Prefers text/plain, falls back to text/html with tags stripped.
     */
    extractEmailText(message) {
        const payload = message.payload;
        if (!payload) return '';

        // Single-part message with inline body
        if (!payload.parts && payload.body?.data) {
            const text = this._decodeBase64(payload.body.data);
            return payload.mimeType === 'text/html' ? this._stripHtml(text) : text;
        }

        return this._extractTextFromParts(payload.parts || []);
    }

    _extractTextFromParts(parts) {
        let plainText = '';
        let htmlText = '';

        for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
                plainText += this._decodeBase64(part.body.data);
            } else if (part.mimeType === 'text/html' && part.body?.data) {
                htmlText += this._stripHtml(this._decodeBase64(part.body.data));
            } else if (part.mimeType?.startsWith('multipart/') && part.parts) {
                const nested = this._extractTextFromParts(part.parts);
                if (nested) plainText += nested;
            }
        }

        return plainText || htmlText;
    }

    _decodeBase64(data) {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(base64, 'base64').toString('utf-8');
    }

    _stripHtml(html) {
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&euro;/g, '€')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Extracts From, Subject, Date headers from a message.
     */
    getEmailMetadata(message) {
        const headers = message.payload?.headers || [];
        const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
        return {
            from: get('From'),
            subject: get('Subject'),
            date: get('Date'),
        };
    }
}

export default GmailService;
