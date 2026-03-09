# Backend FinGestão - Configuração Google

## Variáveis de Ambiente

Cria um ficheiro `.env` na pasta `backend/`:

```bash
# Google Cloud Credentials
GOOGLE_CLIENT_ID=teu-client-id
GOOGLE_CLIENT_SECRET=teu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Google Sheets IDs (criados após autenticação)
SHEET_MOVIMENTOS_ID=
SHEET_FATURAS_ID=
SHEET_CATEGORIAS_ID=
SHEET_GASTOS_FIXOS_ID=

# JWT
JWT_SECRET=teu-segredo-jwt

# Port
PORT=3001
```

## Configurar Google Cloud

1. Vai a https://console.cloud.google.com
2. Cria um novo projeto
3. Ativa as APIs:
   - Google Drive API
   - Google Sheets API
   - Google Vision API (opcional, para OCR)
4. Cria credenciais OAuth 2.0
5. Adiciona redirect URI: `http://localhost:3001/auth/google/callback`
6. Download do JSON de credenciais

## Instalação

```bash
npm install
```

## Executar

```bash
npm run dev
```
