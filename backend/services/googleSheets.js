import { google } from 'googleapis';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Infere fluxo a partir do estado para registos antigos sem coluna Fluxo
function _inferFluxo(estado) {
  if (['Nota de Crédito', 'Recibo de Vencimento'].includes(estado)) return 'entrada';
  if (['Orçamento', 'Proforma', 'Cotação'].includes(estado)) return '';
  return 'saída'; // Fatura, Recibo, Comprovativo, Pendente, Reconciliada, Manual, etc.
}

// Sheets service
class SheetsService {
  constructor(auth) {
    this.sheets = google.sheets({ version: 'v4', auth });
    this.drive = google.drive({ version: 'v3', auth });
  }

  // Criar nova spreadsheet
  async createSpreadsheet(title) {
    const response = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [
          { properties: { title: 'Movimentos' } },
          { properties: { title: 'Faturas' } },
          { properties: { title: 'Categorias' } },
          { properties: { title: 'Gastos_Fixos' } },
          { properties: { title: 'Dashboard_Data' } },
        ],
      },
    });

    const spreadsheetId = response.data.spreadsheetId;

    // Inicializar cabeçalhos
    await this.initializeSheets(spreadsheetId);

    return { spreadsheetId, url: response.data.spreadsheetUrl };
  }

  // Inicializar sheets com cabeçalhos
  async initializeSheets(spreadsheetId) {
    const headers = {
      'Movimentos': ['ID', 'Data', 'Descrição', 'Categoria', 'Valor', 'Tipo', 'Estado', 'FaturaID'],
      'Faturas': ['ID', 'Data', 'Emitente', 'NIF', 'Valor', 'Categoria', 'Estado', 'URL_Drive', 'MovimentoID', 'Numero', 'MessageID', 'Fluxo'],
      'Categorias': ['ID', 'Nome', 'Tipo', 'Cor'],
      'Gastos_Fixos': ['ID', 'Descrição', 'Categoria', 'Valor', 'DiaVencimento', 'Ativo'],
      'Dashboard_Data': ['Mês', 'Receitas', 'Despesas', 'Poupança', 'Meta'],
    };

    for (const [sheetName, headerRow] of Object.entries(headers)) {
      try {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [headerRow],
          },
        });
      } catch (e) {
        console.error(`Erro ao inicializar sheet ${sheetName}:`, e.message);
      }
    }
  }

  // Ler dados de uma sheet
  async getData(spreadsheetId, range) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values || [];
  }

  // Adicionar movimento
  async addMovimento(spreadsheetId, movimento) {
    const values = [
      [
        movimento.id || Date.now().toString(),
        movimento.data,
        movimento.descricao,
        movimento.categoria,
        movimento.valor,
        movimento.tipo, // 'receita' ou 'despesa'
        movimento.estado || 'Reconciliado',
        movimento.faturaId || '',
      ],
    ];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Movimentos!A:H',
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return movimento;
  }

  // Limpar todas as faturas (mantém cabeçalho na linha 1)
  async clearFaturas(spreadsheetId) {
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Faturas!A2:Z',
    });
  }

  // Limpar todos os movimentos (mantém cabeçalho na linha 1)
  async clearMovimentos(spreadsheetId) {
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Movimentos!A2:Z',
    });
  }

  // Adicionar fatura
  async addFatura(spreadsheetId, fatura) {
    const values = [
      [
        fatura.id || Date.now().toString(),
        fatura.data,
        fatura.emitente,
        fatura.nif,
        fatura.valor,
        fatura.categoria,
        fatura.estado || 'Pendente',
        fatura.urlDrive || '',
        fatura.movimentoId || '',
        fatura.numero || '',
        fatura.messageId || '',
        fatura.fluxo || '',
      ],
    ];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Faturas!A:L',
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return fatura;
  }

  // Obter map de messageId → rowNumber (linha no sheet, base 2) para upsert
  async getGmailMessageRowMap(spreadsheetId) {
    const rows = await this.getData(spreadsheetId, 'Faturas!A2:L');
    const map = new Map(); // messageId → { rowNumber, estado, id, movimentoId }
    rows.forEach((row, idx) => {
      const msgId = row[10]; // coluna K = MessageID
      if (msgId) map.set(msgId, {
        rowNumber: idx + 2,
        estado: row[6],
        id: row[0],
        movimentoId: row[8] || '',
      });
    });
    return map;
  }

  // Atualizar fatura existente (preserva estado/id/movimentoId se já reconciliada)
  async updateFatura(spreadsheetId, rowNumber, fatura, existingEstado, existingMovimentoId = '', existingId = '') {
    const keepEstado = existingEstado === 'Reconciliada';
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Faturas!A${rowNumber}:L${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          existingId || fatura.id,
          fatura.data,
          fatura.emitente,
          fatura.nif,
          fatura.valor,
          fatura.categoria,
          keepEstado ? existingEstado : (fatura.estado || 'Pendente'),
          fatura.urlDrive || '',
          keepEstado ? existingMovimentoId : (fatura.movimentoId || ''),
          fatura.numero || '',
          fatura.messageId || '',
          fatura.fluxo || '',
        ]],
      },
    });
  }

  // Reconciliar fatura com movimento
  async reconciliar(spreadsheetId, faturaId, movimentoId) {
    // Atualizar fatura — só altera estado (G) e movimentoId (I), preserva restantes colunas
    const faturas = await this.getData(spreadsheetId, 'Faturas!A:L');
    const faturaIndex = faturas.findIndex(row => row[0] === faturaId);
    console.log(`[reconciliar] faturaId=${faturaId} → idx=${faturaIndex} → row=${faturaIndex + 1} | movimentoId=${movimentoId}`);

    if (faturaIndex >= 0) {
      const row = faturas[faturaIndex];
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Faturas!A${faturaIndex + 1}:L${faturaIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            row[0],  // ID
            row[1],  // Data
            row[2],  // Emitente
            row[3],  // NIF
            row[4],  // Valor
            row[5],  // Categoria
            'Reconciliada',
            row[7] || '',  // URL_Drive
            movimentoId,
            row[9] || '',  // Numero
            row[10] || '', // MessageID
            row[11] || '', // Fluxo
          ]],
        },
      });
    }

    // Atualizar movimento — só altera estado (G) e faturaId (H), preserva restantes colunas
    const movimentos = await this.getData(spreadsheetId, 'Movimentos!A:H');
    const movimentoIndex = movimentos.findIndex(row => row[0] === movimentoId);

    if (movimentoIndex >= 0) {
      const row = movimentos[movimentoIndex];
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Movimentos!A${movimentoIndex + 1}:H${movimentoIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            row[0], // ID
            row[1], // Data
            row[2], // Descrição
            row[3], // Categoria
            row[4], // Valor
            row[5], // Tipo
            'Reconciliado',
            faturaId,
          ]],
        },
      });
    }

    return { success: true };
  }

  // Parsear número em formato PT (ex: "-1.234,56") ou EN ("-1234.56")
  _parseNumber(str) {
    if (str === undefined || str === null || str === '') return 0;
    const s = String(str).trim().replace(/\s/g, '');
    if (/\d\.\d{3},/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    if (/\d,\d/.test(s)) return parseFloat(s.replace(',', '.')) || 0;
    return parseFloat(s) || 0;
  }

  // Obter todos os movimentos
  async getMovimentos(spreadsheetId) {
    const rows = await this.getData(spreadsheetId, 'Movimentos!A2:H');
    return rows.map(row => ({
      id: row[0],
      data: row[1],
      descricao: row[2],
      categoria: row[3],
      valor: this._parseNumber(row[4]),
      tipo: row[5],
      estado: row[6],
      faturaId: row[7],
    }));
  }

  // Obter todas as faturas
  async getFaturas(spreadsheetId) {
    const rows = await this.getData(spreadsheetId, 'Faturas!A2:L');
    return rows.map(row => ({
      id: row[0],
      data: row[1],
      emitente: row[2],
      nif: row[3],
      valor: parseFloat(row[4]) || 0,
      categoria: row[5],
      estado: row[6],
      urlDrive: row[7],
      movimentoId: row[8],
      numero: row[9] || '',
      messageId: row[10] || '',
      fluxo: row[11] || _inferFluxo(row[6]),
    }));
  }

  // Obter gastos fixos
  async getGastosFixos(spreadsheetId) {
    const rows = await this.getData(spreadsheetId, 'Gastos_Fixos!A2:F');
    return rows.map(row => ({
      id: row[0],
      descricao: row[1],
      categoria: row[2],
      valor: parseFloat(row[3]) || 0,
      diaVencimento: parseInt(row[4]) || 1,
      ativo: row[5] !== 'FALSE',
    }));
  }

  // Adicionar gasto fixo
  async addGastoFixo(spreadsheetId, gasto) {
    const values = [[
      gasto.id || Date.now().toString(),
      gasto.descricao,
      gasto.categoria,
      gasto.valor,
      gasto.diaVencimento || 1,
      gasto.ativo !== false ? 'TRUE' : 'FALSE',
    ]];
    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Gastos_Fixos!A:F',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    return gasto;
  }

  // Upload para Google Drive
  async uploadFile(folderId, fileName, mimeType, buffer) {
    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id, webViewLink',
    });

    return {
      fileId: response.data.id,
      url: response.data.webViewLink,
    };
  }

  // Criar pasta no Drive
  async createFolder(parentId, name) {
    const response = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      },
      fields: 'id, webViewLink',
    });

    return {
      folderId: response.data.id,
      url: response.data.webViewLink,
    };
  }
  // Eliminar movimento
  async deleteMovimento(spreadsheetId, movimentoId) {
    const rows = await this.getData(spreadsheetId, 'Movimentos!A:H');
    const idx = rows.findIndex(row => row[0] === movimentoId);
    if (idx < 0) throw new Error(`Movimento ${movimentoId} não encontrado`);
    const meta = await this.sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
    const sheet = meta.data.sheets.find(s => s.properties.title === 'Movimentos');
    if (!sheet) throw new Error('Sheet Movimentos não encontrada');
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId: sheet.properties.sheetId, dimension: 'ROWS', startIndex: idx, endIndex: idx + 1 },
          },
        }],
      },
    });
    return { success: true };
  }

  // Eliminar fatura (limpa a linha — não apaga para preservar índices de outras linhas)
  async deleteFatura(spreadsheetId, faturaId) {
    const faturas = await this.getData(spreadsheetId, 'Faturas!A:L');
    const idx = faturas.findIndex(row => row[0] === faturaId);
    if (idx < 0) throw new Error(`Fatura ${faturaId} não encontrada`);
    // Obter o sheetId da folha "Faturas"
    const meta = await this.sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
    const sheet = meta.data.sheets.find(s => s.properties.title === 'Faturas');
    if (!sheet) throw new Error('Sheet Faturas não encontrada');
    const sheetId = sheet.properties.sheetId;
    // idx é 0-based e inclui o cabeçalho (idx=0 = header, idx=1 = 1ª linha de dados)
    // startIndex de deleteDimension é também 0-based, por isso startIndex = idx
    const rowIndex = idx;
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
          },
        }],
      },
    });
    return { success: true };
  }

  // Atualizar fluxo de uma fatura (coluna L)
  async updateFaturaFluxo(spreadsheetId, faturaId, fluxo) {
    const faturas = await this.getData(spreadsheetId, 'Faturas!A:L');
    const idx = faturas.findIndex(row => row[0] === faturaId);
    if (idx < 0) throw new Error(`Fatura ${faturaId} não encontrada`);
    const row = faturas[idx];
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Faturas!L${idx + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[fluxo]] },
    });
    return { success: true };
  }

  // Adicionar múltiplos movimentos
  async addMovimentosBatch(spreadsheetId, movimentos) {
    const values = movimentos.map(m => [
      m.id || Date.now().toString(),
      m.data,
      m.descricao,
      m.categoria || 'Outros',
      m.valor,
      m.tipo,
      m.estado || 'Pendente',
      m.faturaId || '',
    ]);

    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Movimentos!A:H',
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return movimentos;
  }
}

export { oauth2Client, SheetsService };
