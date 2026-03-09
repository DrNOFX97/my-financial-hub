// Types para FinGestão

export interface Transaction {
  id: number;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
}

export interface Invoice {
  id: number;
  emitente: string;
  nif: string;
  valor: number;
  data: string;
  numero?: string;
  categoria: string;
  estado: string;
  fluxo?: "entrada" | "saída" | "";
  urlDrive?: string;
  movimentoId?: string;
  messageId?: string;
}

export interface MonthlyData {
  month: string;
  receitas: number;
  despesas: number;
}

export interface CategoryData {
  name: string;
  valor: number;
  cor: string;
}

export interface UpcomingPayment {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  categoria: string;
}

export interface DashboardStats {
  saldoAtual: number;
  receitasMes: number;
  despesasMes: number;
  poupanca: number;
  variacaoSaldo: number;
  variacaoReceitas: number;
  variacaoDespesas: number;
  taxaPoupanca: number;
}

export interface RecurringPattern {
  descricao: string;
  valorMedio: number;
  frequencia: number;
  categoria: string;
}
