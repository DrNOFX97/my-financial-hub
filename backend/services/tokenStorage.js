import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_FILE = path.join(__dirname, '..', 'storage', 'tokens.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(STORAGE_FILE))) {
  fs.mkdirSync(path.dirname(STORAGE_FILE), { recursive: true });
}

class TokenStorage {
  constructor() {
    this.tokens = new Map();
    this.load();
  }

  load() {
    if (fs.existsSync(STORAGE_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
        this.tokens = new Map(Object.entries(data));
      } catch (e) {
        console.error('Erro ao carregar tokens:', e);
      }
    }
  }

  save() {
    try {
      const data = Object.fromEntries(this.tokens);
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Erro ao salvar tokens:', e);
    }
  }

  setTokens(userId, tokens) {
    this.tokens.set(userId, tokens);
    this.save();
  }

  getTokens(userId) {
    return this.tokens.get(userId);
  }
}

export default new TokenStorage();
