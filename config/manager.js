import fs from 'fs';
import path from 'path';

import { AppError } from '../src/errors/AppError.js';
import { ERROR_CODES } from '../src/errors/codes.js';
import { getAppPaths } from '../src/constants/paths.js';

/**
 * Mapeamento de chaves de config para variáveis de ambiente.
 * Segue o padrão FTT_NOME_DA_CHAVE.
 */
const ENV_MAP = {
  currency: 'FTT_CURRENCY',
  hourlyRate: 'FTT_HOURLY_RATE',
  dateTimeFormat: 'FTT_DATE_TIME_FORMAT',
  dateFormat: 'FTT_DATE_FORMAT',
  timezone: 'FTT_TIMEZONE',
  dailyGoal: 'FTT_DAILY_GOAL',
  weeklyGoal: 'FTT_WEEKLY_GOAL',
  idleThresholdMinutes: 'FTT_IDLE_THRESHOLD',
  webhookUrl: 'FTT_WEBHOOK_URL',
  githubToken: 'FTT_GITHUB_TOKEN'
};

function readJsonFileOrNull(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (cause) {
    throw new AppError(
      ERROR_CODES.E_CONFIG_CORRUPT,
      `Config corrompida: ${filePath}`,
      { filePath },
      cause
    );
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonAtomic(filePath, obj) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, filePath);
}

let _cachedDefaults = null;

function loadDefaultConfig() {
  if (_cachedDefaults) return _cachedDefaults;
  const defaultsPath = new URL('./default.json', import.meta.url);
  const raw = fs.readFileSync(defaultsPath, 'utf8');
  _cachedDefaults = JSON.parse(raw);
  return _cachedDefaults;
}

/**
 * Coleta e valida valores de variáveis de ambiente.
 */
function getEnvConfig() {
  const numericKeys = new Set(['hourlyRate', 'dailyGoal', 'weeklyGoal', 'idleThresholdMinutes']);
  const envCfg = {};
  for (const [key, envVar] of Object.entries(ENV_MAP)) {
    const val = process.env[envVar];
    if (val !== undefined) {
      envCfg[key] = numericKeys.has(key) ? Number(val) : val;
    }
  }
  return envCfg;
}

/**
 * Valida uma chave de configuração.
 */
function validateAndCoercePatch(key, value) {
  switch (key) {
    case 'currency': {
      if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 10) {
        throw new AppError(ERROR_CODES.E_INVALID_CONFIG, 'Moeda inválida.', { key, value });
      }
      return value.trim().toUpperCase();
    }
    case 'hourlyRate': {
      const num = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(num) || num < 0) {
        throw new AppError(ERROR_CODES.E_INVALID_CONFIG, 'Valor/hora inválido.', { key, value });
      }
      return num;
    }
    case 'dateTimeFormat':
    case 'dateFormat': {
      if (typeof value !== 'string' || value.trim().length < 1) {
        throw new AppError(ERROR_CODES.E_INVALID_CONFIG, 'Formato de data inválido.', { key, value });
      }
      return value.trim();
    }
    case 'timezone': {
      if (value === null) return null;
      if (typeof value !== 'string' || value.trim().length < 1) {
        throw new AppError(ERROR_CODES.E_INVALID_CONFIG, 'Timezone inválido.', { key, value });
      }
      return value.trim();
    }
    case 'dailyGoal':
    case 'weeklyGoal': {
      const num = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(num) || num < 0) {
        throw new AppError(ERROR_CODES.E_INVALID_CONFIG, 'A meta deve ser um número positivo de horas.', { key, value });
      }
      return num;
    }
    default:
      throw new AppError(ERROR_CODES.E_INVALID_CONFIG, `Chave de config inválida: ${key}`, { key });
  }
}

export function getPaths() {
  return getAppPaths();
}

/**
 * Obtém a configuração final resolvida com a seguinte precedência:
 * 1. Variáveis de Ambiente (FTT_*)
 * 2. Arquivo de Configuração do Usuário (config.json)
 * 3. Valores Padrão (default.json)
 * 
 * NOTA: As Flags do CLI são tratadas diretamente nos comandos e têm prioridade sobre este retorno.
 */
export function getConfig() {
  const defaults = loadDefaultConfig();
  const { configFile } = getAppPaths();
  const userCfg = readJsonFileOrNull(configFile) ?? {};
  const envCfg = getEnvConfig();

  return { 
    ...defaults, 
    ...userCfg, 
    ...envCfg 
  };
}

export function get(key) {
  const cfg = getConfig();
  if (!key) return cfg;
  return cfg[key];
}

export function set(key, value) {
  const { configFile } = getAppPaths();
  const current = readJsonFileOrNull(configFile) ?? {};
  const coerced = validateAndCoercePatch(key, value);
  const next = { ...current, [key]: coerced };
  writeJsonAtomic(configFile, next);
  return getConfig();
}

export function reset() {
  const { configFile } = getAppPaths();
  if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
  return getConfig();
}
