// Configuração da API
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const AUTH_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || "http://localhost:3001";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || json.message || `HTTP ${response.status}`);
    } catch (e: any) {
      if (e.message && !e.message.startsWith('HTTP')) throw e;
      throw new Error(text || `HTTP error! status: ${response.status}`);
    }
  }
  return response.json();
}

// Obter spreadsheetId do localStorage
const getSpreadsheetId = () => localStorage.getItem('spreadsheet_id');

// Headers com autenticação
const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  const spreadsheetId = getSpreadsheetId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return { headers, spreadsheetId };
};

export const api = {
  // Auth
  loginWithGoogle: () => {
    window.location.href = `${AUTH_BASE_URL}/auth/google`;
  },

  // Dashboard
  getDashboardStats: (params?: { spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/dashboard/stats${id ? `?spreadsheetId=${id}` : ''}`, { headers })
      .then(handleResponse);
  },

  getMonthlyData: (params?: { spreadsheetId?: string; year?: number }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params?.spreadsheetId || spreadsheetId;
    const year = params?.year || new Date().getFullYear();
    return fetch(`${API_BASE_URL}/dashboard/monthly?spreadsheetId=${id || ''}&year=${year}`, { headers })
      .then(handleResponse);
  },

  getCategoryData: (params?: { spreadsheetId?: string; month?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/dashboard/categories?spreadsheetId=${id || ''}${params?.month ? `&month=${params.month}` : ''}`, { headers })
      .then(handleResponse);
  },

  // Transações
  getTransactions: (params?: { spreadsheetId?: string; limit?: number }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/transactions?spreadsheetId=${id || ''}${params?.limit ? `&limit=${params.limit}` : ''}`, { headers })
      .then(handleResponse);
  },

  // Faturas
  getInvoices: (params?: { spreadsheetId?: string; status?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/invoices?spreadsheetId=${id || ''}${params?.status ? `&status=${params.status}` : ''}`, { headers })
      .then(handleResponse);
  },

  // Pagamentos próximos
  getUpcomingPayments: (params?: { spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/payments/upcoming?spreadsheetId=${id || ''}`, { headers })
      .then(handleResponse);
  },

  // Extrato
  processExtract: (params: { text: string; spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/extract/process`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: params.text, spreadsheetId: id }),
    }).then(handleResponse);
  },

  // Upload Fatura
  uploadInvoice: async (params: { file: File; spreadsheetId?: string }) => {
    const { spreadsheetId } = getHeaders();
    const id = params.spreadsheetId || spreadsheetId;

    const formData = new FormData();
    formData.append('file', params.file);
    if (id) formData.append('spreadsheetId', id);

    const response = await fetch(`${API_BASE_URL}/invoices/upload`, {
      method: "POST",
      body: formData,
    });

    return handleResponse(response);
  },

  // Reconciliar
  reconcile: (params: { faturaId: string; movimentoId: string; spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/reconcile`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        faturaId: params.faturaId,
        movimentoId: params.movimentoId,
        spreadsheetId: id,
      }),
    }).then(handleResponse);
  },

  getRecurringPatterns: (params?: { spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/patterns/recurring?spreadsheetId=${id || ''}`, { headers })
      .then(handleResponse);
  },

  scanGmail: (params: { spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/automation/gmail-scan`, {
      method: "POST",
      headers,
      body: JSON.stringify({ spreadsheetId: id }),
    }).then(handleResponse);
  },

  deduplicateTransactions: (params?: { spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const sid = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/transactions/deduplicate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ spreadsheetId: sid }),
    }).then(handleResponse);
  },

  deleteTransaction: (id: string, params?: { spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const sid = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/transactions/${id}?spreadsheetId=${sid}`, {
      method: "DELETE",
      headers,
    }).then(handleResponse);
  },

  clearAllInvoices: (params?: { spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const sid = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/invoices?spreadsheetId=${sid}`, {
      method: "DELETE",
      headers,
    }).then(handleResponse);
  },

  deleteInvoice: (id: string, params?: { spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const sid = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/invoices/${id}?spreadsheetId=${sid}`, {
      method: "DELETE",
      headers,
    }).then(handleResponse);
  },

  updateInvoice: (id: string, params: { fluxo?: string; spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const sid = params.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/invoices/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ ...params, spreadsheetId: sid }),
    }).then(handleResponse);
  },

  getReconcileSuggestions: (params?: { spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/reconcile/suggestions?spreadsheetId=${id || ''}`, { headers })
      .then(handleResponse);
  },

  resetAll: (params?: { spreadsheetId?: string }) => {
    const { headers, spreadsheetId } = getHeaders();
    const sid = params?.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/reset-all`, {
      method: "POST",
      headers,
      body: JSON.stringify({ spreadsheetId: sid }),
    }).then(handleResponse);
  },

  addManualTransaction: (params: {
    descricao: string;
    valor: number;
    data?: string;
    categoria?: string;
    tipo?: string;
    spreadsheetId?: string;
  }) => {
    const { headers, spreadsheetId } = getHeaders();
    const id = params.spreadsheetId || spreadsheetId;
    return fetch(`${API_BASE_URL}/transactions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...params, spreadsheetId: id }),
    }).then(handleResponse);
  },
};
