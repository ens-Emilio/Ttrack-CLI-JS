import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';
import { getAppPaths, getLegacyRepoDataFile } from '../constants/paths.js';
import { migrate } from '../../data/schema/migrate.js';
import { isDryRun, guardWrite } from '../utils/dryRun.js';

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

/**
 * Adquire um lock de escrita simples baseado em arquivo.
 * Aguarda alguns milissegundos se o lock estiver ocupado.
 */
function acquireLock(filePath, retries = 5) {
  const lockFile = `${filePath}.lock`;
  for (let i = 0; i < retries; i++) {
    try {
      // wx garante que falhe se o arquivo já existir
      fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' });
      return lockFile;
    } catch (e) {
      if (i === retries - 1) throw e;
      // Espera um pouco antes de tentar novamente
      const wait = 50 + Math.random() * 100;
      const start = Date.now();
      while (Date.now() - start < wait); 
    }
  }
}

function releaseLock(lockFile) {
  try {
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  } catch (e) {
    // Ignora falhas ao remover o lock
  }
}

/**
 * Rotates backup files: data.json → data.json.bak → data.json.bak2
 */
function rotateBackup(filePath) {
  const bak1 = `${filePath}.bak`;
  const bak2 = `${filePath}.bak2`;
  try {
    if (fs.existsSync(bak1)) {
      fs.copyFileSync(bak1, bak2);
    }
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, bak1);
    }
  } catch {
    // Backup failure is non-fatal
  }
}

function writeJsonAtomic(filePath, obj) {
  ensureDir(path.dirname(filePath));

  let lock = null;
  try {
    lock = acquireLock(filePath);
    rotateBackup(filePath);
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
    fs.renameSync(tmp, filePath);
  } finally {
    if (lock) releaseLock(lock);
  }
}

function adoptLegacyDataIfPresent(targetFile) {
  const disable =
    process.env.FTT_DISABLE_LEGACY_ADOPT === '1' || process.env.FTT_DISABLE_LEGACY_ADOPT === 'true';
  if (disable) return;
  if (fs.existsSync(targetFile)) return;

  const repoRoot = path.join(__dirname, '../../');
  const legacyFile = getLegacyRepoDataFile(repoRoot);
  if (!fs.existsSync(legacyFile)) return;

  const raw = fs.readFileSync(legacyFile, 'utf8');
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
      ERROR_CODES.E_DATA_CORRUPT,
      'Erro ao ler arquivo de dados (JSON inválido ou schema corrompido).',
      { file: dataFile },
      cause
    );
  }
}

export function saveData(data) {
  // Dry-run: skip persistence, just preview
  guardWrite('saveData', data);

  const dataFile = initDataFile();
  try {
    writeJsonAtomic(dataFile, data);
  } catch (cause) {
    throw new AppError(ERROR_CODES.E_IO_ERROR, 'Erro ao salvar arquivo de dados.', { file: dataFile }, cause);
  }
}
