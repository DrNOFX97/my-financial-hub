export const monthlyData = [
  { month: "Jan", receitas: 2800, despesas: 2100 },
  { month: "Fev", receitas: 2800, despesas: 2350 },
  { month: "Mar", receitas: 3100, despesas: 1980 },
  { month: "Abr", receitas: 2800, despesas: 2200 },
  { month: "Mai", receitas: 2800, despesas: 2450 },
  { month: "Jun", receitas: 3200, despesas: 2100 },
  { month: "Jul", receitas: 2800, despesas: 2300 },
  { month: "Ago", receitas: 2800, despesas: 2150 },
  { month: "Set", receitas: 2800, despesas: 2400 },
  { month: "Out", receitas: 3000, despesas: 2250 },
  { month: "Nov", receitas: 2800, despesas: 2500 },
  { month: "Dez", receitas: 3500, despesas: 2800 },
];

export const categoryData = [
  { name: "Alimentação", valor: 450, cor: "hsl(220, 60%, 50%)" },
  { name: "Casa", valor: 650, cor: "hsl(160, 60%, 42%)" },
  { name: "Telecomunicações", valor: 85, cor: "hsl(280, 60%, 50%)" },
  { name: "Eletricidade", valor: 75, cor: "hsl(38, 92%, 50%)" },
  { name: "Água", valor: 35, cor: "hsl(200, 70%, 50%)" },
  { name: "Seguros", valor: 180, cor: "hsl(340, 60%, 50%)" },
  { name: "Combustível", valor: 120, cor: "hsl(15, 70%, 50%)" },
  { name: "Lazer", valor: 200, cor: "hsl(270, 50%, 55%)" },
];

export const recentTransactions = [
  { id: 1, descricao: "Supermercado Continente", categoria: "Alimentação", valor: -87.45, data: "2026-03-03" },
  { id: 2, descricao: "Salário", categoria: "Receita", valor: 2800.00, data: "2026-03-01" },
  { id: 3, descricao: "EDP - Eletricidade", categoria: "Eletricidade", valor: -74.30, data: "2026-02-28" },
  { id: 4, descricao: "Vodafone", categoria: "Telecomunicações", valor: -42.99, data: "2026-02-27" },
  { id: 5, descricao: "GALP - Combustível", categoria: "Combustível", valor: -65.00, data: "2026-02-26" },
  { id: 6, descricao: "Renda Apartamento", categoria: "Casa", valor: -650.00, data: "2026-02-25" },
  { id: 7, descricao: "Jantar c/ amigos", categoria: "Lazer", valor: -35.50, data: "2026-02-24" },
  { id: 8, descricao: "Seguro Automóvel", categoria: "Seguros", valor: -45.00, data: "2026-02-23" },
];

export const upcomingPayments = [
  { id: 1, descricao: "Renda Apartamento", valor: 650.00, dataVencimento: "2026-03-25", categoria: "Casa" },
  { id: 2, descricao: "Vodafone", valor: 42.99, dataVencimento: "2026-03-15", categoria: "Telecomunicações" },
  { id: 3, descricao: "EDP", valor: 74.30, dataVencimento: "2026-03-20", categoria: "Eletricidade" },
  { id: 4, descricao: "Água - EPAL", valor: 35.00, dataVencimento: "2026-03-18", categoria: "Água" },
];

export const invoices = [
  { id: 1, emitente: "Continente", nif: "500100144", valor: 87.45, data: "2026-03-03", categoria: "Alimentação", estado: "Validada" as const },
  { id: 2, emitente: "EDP Comercial", nif: "503504564", valor: 74.30, data: "2026-02-28", categoria: "Eletricidade", estado: "Pendente" as const },
  { id: 3, emitente: "Vodafone Portugal", nif: "502683895", valor: 42.99, data: "2026-02-27", categoria: "Telecomunicações", estado: "Validada" as const },
  { id: 4, emitente: "GALP Energia", nif: "504999927", valor: 65.00, data: "2026-02-26", categoria: "Combustível", estado: "Pendente" as const },
  { id: 5, emitente: "Seguro Directo", nif: "503322660", valor: 45.00, data: "2026-02-23", categoria: "Seguros", estado: "Validada" as const },
  { id: 6, emitente: "Restaurante Sol", nif: "509876543", valor: 35.50, data: "2026-02-24", categoria: "Lazer", estado: "Manual" as const },
];
