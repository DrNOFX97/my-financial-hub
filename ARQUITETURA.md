# FinGestão - Arquitetura do Sistema

## Visão Geral

Sistema de gestão financeira pessoal com processamento inteligente de faturas e reconciliação automática.

## Fluxo de Dados

```
UTILIZADOR
│
├── Upload Foto/PDF
├── Colar Extrato Bancário
└── Inserir Movimento Manual
│
▼
CAMADA DE PROCESSAMENTO
│
├── OCR → Extrai dados da fatura
├── Normalizador → Estrutura dados
├── Classificador → Categoria automática
└── Motor de Reconciliação → Liga fatura a movimento
│
▼
ARMAZENAMENTO (CONTA GOOGLE DO UTILIZADOR)
│
├── Google Drive
│   └── Pastas Ano/Mês/Categoria
│
└── Google Sheets
    ├── Movimentos
    ├── Faturas
    ├── Categorias
    └── Gastos Fixos
│
▼
CAMADA ANALÍTICA
│
├── Agregações Mensais
├── Comparação Ano/Mês
├── Detecção de Recorrência
└── Despesas vs Receitas
│
▼
DASHBOARD WEB
│
├── Sidebar retrátil
├── Widgets personalizáveis
├── Filtros dinâmicos
├── Calendário financeiro
└── Alertas
```

## Stack Tecnológico

### Frontend
- React + TypeScript + Vite
- shadcn-ui + Tailwind CSS
- React Query (estado/server state)
- Framer Motion (animações)
- Recharts (gráficos)

### Backend
- Node.js + Express
- Google APIs (Drive, Sheets, Vision)
- Tesseract.js (OCR fallback)
- JWT (autenticação)

### Armazenamento
- Google Drive (ficheiros)
- Google Sheets (dados estruturados)

## Próximos Passos

1. **Google OAuth** - Autenticação com conta Google
2. **Google Sheets API** - Criar/ler folhas de cálculo
3. **Google Drive API** - Guardar faturas
4. **OCR** - Processar uploads de faturas
5. **Motor de Reconciliação** - Ligar faturas a movimentos
6. **Classificador** - Categorização automática com IA
