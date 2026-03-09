import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'sessions.json');

const INITIAL_DATA = {
  sessions: [],
  activeSession: null
};

function initData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2));
  }
}

export function loadData() {
  initData();
  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  try {
    return JSON.parse(rawData);
  } catch (err) {
    console.error('Erro ao ler arquivo de dados:', err);
    return INITIAL_DATA;
  }
}

export function saveData(data) {
  initData();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
