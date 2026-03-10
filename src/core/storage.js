import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';
import { getAppPaths, getLegacyRepoDataFile } from '../constants/paths.js';
import { migrate } from '../../data/schema/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INITIAL_DATA = {
  schemaVersion: 1,
  sessions: [],
  activeSession: null
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonAtomic(filePath, obj) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, filePath);
}

function adoptLegacyDataIfPresent(targetFile) {
  const disable =
    process.env.FTT_DISABLE_LEGACY_ADOPT === '1' || process.env.FTT_DISABLE_LEGACY_ADOPT === 'true';
  if (disable) return;
  if (fs.existsSync(targetFile)) return;

  // Repo root relative to this module, works in repo checkout and inside node_modules.
  const repoRoot = path.join(__dirname, '../../');
  const legacyFile = getLegacyRepoDataFile(repoRoot);
  if (!fs.existsSync(legacyFile)) return;

  const raw = fs.readFileSync(legacyFile, 'utf8');
  // If legacy is unreadable, let the normal parse path throw on next load.
  ensureDir(path.dirname(targetFile));
  fs.writeFileSync(targetFile, raw);
}

function initDataFile() {
  const { dataDir, dataFile } = getAppPaths();
  ensureDir(dataDir);

  adoptLegacyDataIfPresent(dataFile);

  if (!fs.existsSync(dataFile)) {
    writeJsonAtomic(dataFile, INITIAL_DATA);
  }
  return dataFile;
}

export function loadData() {
  const dataFile = initDataFile();
  const rawData = fs.readFileSync(dataFile, 'utf8');
  try {
    const parsed = JSON.parse(rawData);
    const { data, migrated } = migrate(parsed);
    if (migrated) saveData(data);
    return data;
  } catch (cause) {
    throw new AppError(
      ERROR_CODES.DATA_CORRUPT,
      'Erro ao ler arquivo de dados (JSON inválido ou schema corrompido).',
      { file: dataFile },
      cause
    );
  }
}

export function saveData(data) {
  const dataFile = initDataFile();
  try {
    writeJsonAtomic(dataFile, data);
  } catch (cause) {
    throw new AppError(ERROR_CODES.IO_ERROR, 'Erro ao salvar arquivo de dados.', { file: dataFile }, cause);
  }
}
