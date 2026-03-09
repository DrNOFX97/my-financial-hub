import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer({ storage: multer.memoryStorage() });

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Middleware para autenticação
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Armazenamento em memória para spreadsheet IDs (depois guardar na DB/session)
let userSheets = new Map();

// ==================== AUTH ====================

// Redirect para Google OAuth
app.get('/auth/google', async (req, res) => {
  const { oauth2Client } = await import('./services/googleSheets.js');
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/gmail.readonly',
    'openid',
    'email',
    'profile',
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
  res.redirect(url);
});

// Callback do Google OAuth
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
  const GoogleDriveService = (await import('./services/googleDrive.js')).default;
  const tokenStorage = (await import('./services/tokenStorage.js')).default;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Obter info do utilizador do ID Token
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const userId = payload['sub'];
    const userEmail = payload['email'];
    const userName = payload['name'] || userEmail.split('@')[0];

    // Guardar tokens (especialmente refresh_token)
    tokenStorage.setTokens(userId, tokens);

    // 1. Inicializar estrutura do Google Drive (não-bloqueante)
    const driveService = new GoogleDriveService(oauth2Client);
    driveService.setupStructure().catch(e => console.warn('Drive setup ignorado:', e.message));

    // 2. Inicializar estrutura do Google Sheets
    const sheetsService = new SheetsService(oauth2Client);

    // Verificar se já tem spreadsheet registrada
    let spreadsheetId = userSheets.get(userId);

    if (!spreadsheetId) {
      const result = await sheetsService.createSpreadsheet('Financas_Pessoais');
      spreadsheetId = result.spreadsheetId;
      userSheets.set(userId, spreadsheetId);
    }

    // 3. Criar JWT para o frontend
    const appToken = jwt.sign({ userId, email: userEmail, name: userName }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Redirect para frontend com dados
    const params = new URLSearchParams({ token: appToken, spreadsheetId, userId, email: userEmail, name: userName });
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?${params}`);
  } catch (error) {
    console.error('Erro OAuth:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
});

// ==================== DASHBOARD ====================

app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const spreadsheetId = req.query.spreadsheetId;

    if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' });

    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const AnalyticsService = (await import('./services/analytics.js')).default;
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    const movimentos = await sheetsService.getMovimentos(spreadsheetId);
    const stats = AnalyticsService.getStats(movimentos);

    res.json(stats);
  } catch (error) {
    console.error('Erro stats:', error);
    res.status(500).json({ error: 'Erro ao calcular estatísticas' });
  }
});

app.get('/api/dashboard/monthly', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const spreadsheetId = req.query.spreadsheetId;

    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const AnalyticsService = (await import('./services/analytics.js')).default;
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    const movimentos = await sheetsService.getMovimentos(spreadsheetId);
    const data = AnalyticsService.getMonthlyEvolution(movimentos);

    res.json(data);
  } catch (error) {
    res.status(500).json([]);
  }
});

app.get('/api/dashboard/categories', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const spreadsheetId = req.query.spreadsheetId;

    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const AnalyticsService = (await import('./services/analytics.js')).default;
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    const movimentos = await sheetsService.getMovimentos(spreadsheetId);
    const data = AnalyticsService.getCategoryTotals(movimentos);

    res.json(data);
  } catch (error) {
    res.status(500).json([]);
  }
});

// ==================== TRANSAÇÕES ====================

app.get('/api/transactions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const spreadsheetId = req.query.spreadsheetId;
    const limit = parseInt(req.query.limit) || 5000;

    if (!spreadsheetId) return res.json([]);

    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;
    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    const movimentos = await sheetsService.getMovimentos(spreadsheetId);
    res.json(movimentos.slice(0, limit));
  } catch (error) {
    console.error('Erro transações:', error);
    res.json([]);
  }
});

// ==================== FATURAS ====================

app.get('/api/invoices', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const spreadsheetId = req.query.spreadsheetId;
    const status = req.query.status;

    if (!spreadsheetId) return res.json([]);

    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;
    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    let faturas = await sheetsService.getFaturas(spreadsheetId);
    if (status) faturas = faturas.filter(f => f.estado === status);

    res.json(faturas);
  } catch (error) {
    console.error('Erro faturas:', error);
    res.json([]);
  }
});

// ==================== PAGAMENTOS ====================

app.get('/api/patterns/recurring', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const spreadsheetId = req.query.spreadsheetId;

    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const AnalyticsService = (await import('./services/analytics.js')).default;
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    const movimentos = await sheetsService.getMovimentos(spreadsheetId);
    const patterns = AnalyticsService.detectRecurringPatterns(movimentos);

    res.json(patterns);
  } catch (error) {
    res.status(500).json([]);
  }
});

// ==================== PAGAMENTOS PRÓXIMOS ====================

app.get('/api/payments/upcoming', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const spreadsheetId = req.query.spreadsheetId;
  if (!spreadsheetId) return res.json([]);

  try {
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    const gastosFixos = await sheetsService.getGastosFixos(spreadsheetId);
    const ativos = gastosFixos.filter(g => g.ativo && g.valor > 0);

    const now = new Date();
    const upcoming = ativos.map((g) => {
      const dueDay = g.diaVencimento;
      let dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
      if (dueDate <= now) {
        dueDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
      }
      return {
        id: g.id,
        descricao: g.descricao,
        valor: g.valor,
        dataVencimento: dueDate.toISOString().split('T')[0],
        categoria: g.categoria,
      };
    });

    upcoming.sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));
    res.json(upcoming);
  } catch (error) {
    console.error('Erro pagamentos próximos:', error);
    res.status(500).json([]);
  }
});

// ==================== TRANSAÇÃO MANUAL ====================

app.post('/api/transactions', requireAuth, async (req, res) => {
  const { descricao, valor, data, categoria, tipo, spreadsheetId } = req.body;
  const userId = req.user.userId;

  if (!spreadsheetId || !descricao || valor === undefined) {
    return res.status(400).json({ error: 'descricao, valor e spreadsheetId são obrigatórios' });
  }

  try {
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    const valorNum = parseFloat(valor);
    const movimento = {
      id: Date.now().toString(),
      data: data || new Date().toISOString().split('T')[0],
      descricao,
      categoria: categoria || 'Outros',
      valor: valorNum,
      tipo: tipo || (valorNum > 0 ? 'receita' : 'despesa'),
      estado: 'Manual',
    };

    await sheetsService.addMovimento(spreadsheetId, movimento);
    res.json({ success: true, movimento });
  } catch (error) {
    console.error('Erro ao adicionar movimento:', error);
    res.status(500).json({ error: 'Erro ao adicionar movimento' });
  }
});

// Limpar movimentos duplicados (mantém o primeiro de cada data+descrição+valor)
app.post('/api/transactions/deduplicate', requireAuth, async (req, res) => {
  const { spreadsheetId } = req.body;
  const userId = req.user.userId;
  if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' });

  try {
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;
    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    const movimentos = await sheetsService.getMovimentos(spreadsheetId);
    const seen = new Set();
    const toDelete = [];
    for (const m of movimentos) {
      if (!m.id) continue; // ignorar linhas sem ID
      const key = `${m.data}|${m.descricao}|${parseFloat(m.valor).toFixed(2)}`;
      if (seen.has(key)) {
        toDelete.push(m.id);
      } else {
        seen.add(key);
      }
    }

    console.log(`[dedup] ${movimentos.length} movimentos, ${toDelete.length} duplicados a remover`);

    let removed = 0;
    for (const id of toDelete) {
      try {
        await sheetsService.deleteMovimento(spreadsheetId, id);
        removed++;
      } catch (e) {
        console.warn(`[dedup] falhou a apagar ${id}:`, e.message);
      }
    }

    res.json({ success: true, removed });
  } catch (error) {
    console.error('Erro deduplicar:', error);
    res.status(500).json({ error: 'Erro ao deduplicar movimentos' });
  }
});

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { spreadsheetId } = req.query;
  const userId = req.user.userId;

  if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' });

  try {
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;
    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);
    await sheetsService.deleteMovimento(spreadsheetId, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao eliminar movimento:', error);
    res.status(500).json({ error: 'Erro ao eliminar movimento' });
  }
});

// Helper: extrai nome legível do campo "From" do email
function _extractSenderName(from) {
  if (!from) return '';
  // "Nome Empresa <email@domain.com>" → "Nome Empresa"
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  // Só email: extrair domínio como nome
  const emailMatch = from.match(/@([^.>]+)/);
  return emailMatch ? emailMatch[1] : from;
}

// ==================== GMAIL AUTOMATION ====================

app.post('/api/automation/gmail-scan', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { spreadsheetId } = req.body;

  if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' });

  try {
    const GmailService = (await import('./services/gmail.js')).default;
    const OCRService = (await import('./services/ocr.js')).default;
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);

    const gmailService = new GmailService(oauth2Client);
    const sheetsService = new SheetsService(oauth2Client);

    // 1. Obter map de messageId → {rowNumber, estado} para upsert
    const gmailRowMap = await sheetsService.getGmailMessageRowMap(spreadsheetId);

    // 2. Scan Gmail: emails com PDF + emails de cobrança sem PDF
    const [pdfMessages, bodyMessages] = await Promise.all([
      gmailService.listInvoices(),
      gmailService.listBodyInvoices(),
    ]);

    // Combinar e deduplicar por messageId (dentro desta execução)
    const allMessages = [...pdfMessages, ...bodyMessages];
    const seenThisRun = new Set();
    let addedCount = 0;
    let updatedCount = 0;
    const results = [];

    for (const msgRef of allMessages) {
      // Dedup dentro desta execução (pode aparecer nas duas queries)
      if (seenThisRun.has(msgRef.id)) continue;
      seenThisRun.add(msgRef.id);

      const existingRow = gmailRowMap.get(msgRef.id); // {rowNumber, estado} ou undefined

      const message = await gmailService.getMessage(msgRef.id);
      const attachments = gmailService.extractAttachments(message);
      const meta = gmailService.getEmailMetadata(message);

      if (attachments.length > 0) {
        // Processar cada PDF do email
        for (const attachment of attachments) {
          const buffer = await gmailService.getAttachment(msgRef.id, attachment.attachmentId);
          const invoiceData = await OCRService.processInvoice(buffer);

          // Enriquecer com metadata do email se OCR não extraiu
          if (!invoiceData.emitente || invoiceData.emitente === 'Desconhecido') {
            invoiceData.emitente = _extractSenderName(meta.from) || meta.subject || 'Desconhecido';
          }
          if (invoiceData.data === new Date().toISOString().split('T')[0] && meta.date) {
            const d = new Date(meta.date);
            if (!isNaN(d.getTime())) invoiceData.data = d.toISOString().split('T')[0];
          }

          // Upload para Drive (não bloqueante)
          let urlDrive = '';
          try {
            const driveResult = await sheetsService.uploadFile(null, attachment.filename, attachment.mimeType, buffer);
            urlDrive = driveResult.url;
          } catch (e) {
            console.warn('Drive upload ignorado:', e.message);
          }

          const faturaData = { ...invoiceData, urlDrive, messageId: msgRef.id, estado: invoiceData.tipo === 'Fatura' || invoiceData.tipo === 'Recibo' ? 'Pendente' : (invoiceData.tipo || 'Pendente') };
          if (existingRow) {
            await sheetsService.updateFatura(spreadsheetId, existingRow.rowNumber, faturaData, existingRow.estado, existingRow.movimentoId, existingRow.id);
            updatedCount++;
          } else {
            await sheetsService.addFatura(spreadsheetId, faturaData);
            addedCount++;
          }

          results.push({ emitente: invoiceData.emitente, valor: invoiceData.valor, source: 'pdf' });
        }
      } else {
        // Sem PDF — extrair dados do corpo do email
        const bodyText = gmailService.extractEmailText(message);
        if (bodyText.trim().length < 50) continue; // email vazio ou muito curto

        const invoiceData = OCRService.parseInvoiceText(bodyText);

        // Enriquecer com metadata do email
        if (!invoiceData.emitente || invoiceData.emitente === 'Desconhecido') {
          invoiceData.emitente = _extractSenderName(meta.from) || meta.subject || 'Desconhecido';
        }
        if (meta.date) {
          const d = new Date(meta.date);
          if (!isNaN(d.getTime())) {
            invoiceData.data = d.toISOString().split('T')[0];
          }
        }

        // Só guardar se tiver valor > 0 (não guardar emails irrelevantes)
        if (invoiceData.valor <= 0) continue;

        const faturaData = { ...invoiceData, messageId: msgRef.id, estado: invoiceData.tipo === 'Fatura' || invoiceData.tipo === 'Recibo' ? 'Pendente' : (invoiceData.tipo || 'Pendente') };
        if (existingRow) {
          await sheetsService.updateFatura(spreadsheetId, existingRow.rowNumber, faturaData, existingRow.estado, existingRow.movimentoId, existingRow.id);
          updatedCount++;
        } else {
          await sheetsService.addFatura(spreadsheetId, faturaData);
          addedCount++;
        }

        results.push({ emitente: invoiceData.emitente, valor: invoiceData.valor, source: 'email' });
      }
    }

    const parts = [];
    if (addedCount > 0) parts.push(`${addedCount} novas`);
    if (updatedCount > 0) parts.push(`${updatedCount} atualizadas`);
    const message = parts.length > 0
      ? `${parts.join(', ')} faturas sincronizadas do Gmail.`
      : 'Sem alterações — Gmail já sincronizado.';

    res.json({ success: true, message, processed: results });

  } catch (error) {
    console.error('Erro Gmail Scan:', error);
    if (error.code === 403 || (error.errors && error.errors[0]?.reason === 'accessNotConfigured')) {
      return res.status(503).json({ error: 'Gmail API não está ativada no Google Cloud Console. Por favor, ativa a API em console.developers.google.com.' });
    }
    if (error.code === 401 || error.status === 401) {
      return res.status(401).json({ error: 'Sessão expirada. Volta a fazer login.' });
    }
    res.status(500).json({ error: `Erro ao sincronizar com o Gmail: ${error.message}` });
  }
});

// ==================== EXTRATO ====================

app.post('/api/extract/process', requireAuth, async (req, res) => {
  const { text, spreadsheetId } = req.body;
  const userId = req.user.userId;

  try {
    const BankStatementService = (await import('./services/bankStatement.js')).default;
    const ReconciliationService = (await import('./services/reconciliation.js')).default;
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    // 1. Parse text
    const movements = BankStatementService.parse(text);
    if (movements.length === 0) {
      return res.json({
        success: false,
        message: 'Nenhum movimento identificado no texto fornecido.'
      });
    }

    // 2. Setup auth for Sheets
    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    // 3. Deduplicar: remover movimentos que já existem (mesma data + descrição + valor)
    const existingMovimentos = await sheetsService.getMovimentos(spreadsheetId);
    const existingKeys = new Set(
      existingMovimentos.map(m => `${m.data}|${m.descricao}|${parseFloat(m.valor).toFixed(2)}`)
    );
    const newMovements = movements.filter(m => {
      const key = `${m.data}|${m.descricao}|${parseFloat(m.valor).toFixed(2)}`;
      return !existingKeys.has(key);
    });

    if (newMovements.length === 0) {
      return res.json({ success: true, message: 'Nenhum movimento novo (todos já importados).', added: 0 });
    }

    // 4. Get pending invoices for reconciliation
    const allInvoices = await sheetsService.getFaturas(spreadsheetId);
    const pendingInvoices = allInvoices.filter(f => f.estado === 'Pendente');

    // 5. Try to reconcile each movement
    let reconciledCount = 0;
    for (const move of newMovements) {
      const faturaId = await ReconciliationService.reconcile(move, pendingInvoices);
      if (faturaId) {
        move.faturaId = faturaId;
        move.estado = 'Reconciliado';
        reconciledCount++;

        // Remove from pending list so it doesn't match twice
        const idx = pendingInvoices.findIndex(f => f.id === faturaId);
        if (idx > -1) pendingInvoices.splice(idx, 1);
      }
    }

    // 6. Save to Sheets
    await sheetsService.addMovimentosBatch(spreadsheetId, newMovements);

    // 6. Update reconciled invoices status in Sheets (simplified for now: one by one or batch)
    // For now, if faturaId exists, the above logic marks movement as reconciled.
    // Ideally we should also update the Fatura row to 'Reconciliada'.
    for (const move of movements) {
      if (move.faturaId) {
        await sheetsService.reconciliar(spreadsheetId, move.faturaId, move.id);
      }
    }

    res.json({
      success: true,
      message: `${movements.length} movimentos processados. ${reconciledCount} reconciliados automaticamente.`,
      transactionsFound: movements.length,
      reconciledCount,
      movements
    });
  } catch (error) {
    console.error('Erro ao processar extrato:', error);
    res.status(500).json({ error: 'Erro ao processar extrato' });
  }
});

// ==================== UPLOAD FATURA ====================

app.post('/api/invoices/upload', requireAuth, upload.single('file'), async (req, res) => {
  const userId = req.user.userId;
  const spreadsheetId = req.body.spreadsheetId;

  if (!req.file) return res.status(400).json({ error: 'Ficheiro não enviado' });
  if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' });

  try {
    const OCRService = (await import('./services/ocr.js')).default;
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    // Run OCR / PDF parse
    const invoiceData = await OCRService.processInvoice(req.file.buffer);

    // Upload to Drive (non-blocking failure)
    let urlDrive = '';
    try {
      const driveResult = await sheetsService.uploadFile(null, req.file.originalname, req.file.mimetype, req.file.buffer);
      urlDrive = driveResult.url;
    } catch (driveErr) {
      console.warn('Drive upload falhou, continuando sem URL:', driveErr.message);
    }

    // Save to Sheets
    const uploadEstado = invoiceData.tipo === 'Fatura' || invoiceData.tipo === 'Recibo'
      ? 'Pendente'
      : (invoiceData.tipo || 'Pendente');
    await sheetsService.addFatura(spreadsheetId, {
      ...invoiceData,
      urlDrive,
      estado: uploadEstado,
    });

    res.json({ success: true, message: 'Fatura processada com sucesso.', invoiceData });
  } catch (error) {
    console.error('Erro upload fatura:', error);
    res.status(500).json({ error: 'Erro ao processar fatura' });
  }
});

// ==================== RECONCILIAR ====================

app.post('/api/reconcile', requireAuth, async (req, res) => {
  const { faturaId, movimentoId, spreadsheetId } = req.body;
  const userId = req.user.userId;

  try {
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;
    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);
    const result = await sheetsService.reconciliar(spreadsheetId, faturaId, movimentoId);
    res.json(result);
  } catch (error) {
    console.error('Erro reconciliação:', error);
    res.status(500).json({ error: 'Erro ao reconciliar' });
  }
});

app.get('/api/reconcile/suggestions', requireAuth, async (req, res) => {
  const { spreadsheetId } = req.query;
  const userId = req.user.userId;

  try {
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const ReconciliationService = (await import('./services/reconciliation.js')).default;
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    const movements = await sheetsService.getMovimentos(spreadsheetId);
    const pendingMovements = movements.filter(m => m.estado === 'Pendente');

    const invoices = await sheetsService.getFaturas(spreadsheetId);
    const pendingInvoices = invoices.filter(f => f.estado === 'Pendente');

    const suggestions = [];

    for (const move of pendingMovements) {
      const matches = await ReconciliationService.findMatches(move, pendingInvoices);
      const best = matches[0];

      if (best && best.score >= 0.5 && best.score < 0.85) {
        suggestions.push({
          movement: move,
          invoice: best.invoice,
          score: best.score
        });
      }
    }

    res.json(suggestions);
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    res.status(500).json({ error: 'Erro ao buscar sugestões' });
  }
});

// ==================== RESET COMPLETO ====================

app.post('/api/reset-all', requireAuth, async (req, res) => {
  const { spreadsheetId } = req.body;
  const userId = req.user.userId;
  if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' });
  try {
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;
    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);
    await sheetsService.clearMovimentos(spreadsheetId);
    await sheetsService.clearFaturas(spreadsheetId);
    res.json({ success: true, message: 'Todos os dados apagados.' });
  } catch (error) {
    console.error('Erro reset:', error);
    res.status(500).json({ error: 'Erro ao apagar dados' });
  }
});

// ==================== LIMPAR FATURAS ====================

app.delete('/api/invoices', requireAuth, async (req, res) => {
  const { spreadsheetId } = req.query;
  const userId = req.user.userId;

  if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' });

  try {
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;
    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);
    await sheetsService.clearFaturas(spreadsheetId);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao limpar faturas:', error);
    res.status(500).json({ error: 'Erro ao limpar faturas' });
  }
});

// ==================== UPDATE FATURA ====================

app.patch('/api/invoices/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { spreadsheetId, fluxo } = req.body;
  const userId = req.user.userId;

  if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' });

  try {
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;
    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);

    if (fluxo !== undefined) {
      await sheetsService.updateFaturaFluxo(spreadsheetId, id, fluxo);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar fatura:', error);
    res.status(500).json({ error: 'Erro ao atualizar fatura' });
  }
});

app.delete('/api/invoices/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { spreadsheetId } = req.query;
  const userId = req.user.userId;

  if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' });

  try {
    const { oauth2Client, SheetsService } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;
    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);
    const sheetsService = new SheetsService(oauth2Client);
    await sheetsService.deleteFatura(spreadsheetId, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao eliminar fatura:', error);
    res.status(500).json({ error: 'Erro ao eliminar fatura' });
  }
});

// ==================== DRIVE FILE PROXY ====================

app.get('/api/drive/file', async (req, res) => {
  // Auth via header OR query param (needed for iframe embeds which can't set headers)
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).send('Não autenticado');
  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch {
    return res.status(401).send('Token inválido');
  }

  const { fileId } = req.query;
  if (!fileId) return res.status(400).json({ error: 'fileId required' });

  if (!fileId) return res.status(400).json({ error: 'fileId required' });

  try {
    const { google } = await import('googleapis');
    const { oauth2Client } = await import('./services/googleSheets.js');
    const tokenStorage = (await import('./services/tokenStorage.js')).default;

    const tokens = tokenStorage.getTokens(userId);
    oauth2Client.setCredentials(tokens);

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Get file metadata to know the mimeType
    const meta = await drive.files.get({ fileId, fields: 'name,mimeType' });
    const mimeType = meta.data.mimeType || 'application/octet-stream';
    const name = meta.data.name || 'file';

    // Download file content
    const file = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`);
    file.data.pipe(res);
  } catch (error) {
    console.error('Erro ao servir ficheiro Drive:', error);
    res.status(500).json({ error: 'Erro ao obter ficheiro' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend FinGestão v1.0 a correr em http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/auth/google`);
});
