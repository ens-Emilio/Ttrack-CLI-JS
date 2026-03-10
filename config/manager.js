import fs from 'fs';
import path from 'path';

import { AppError } from '../src/errors/AppError.js';
import { ERROR_CODES } from '../src/errors/codes.js';
import { getAppPaths } from '../src/constants/paths.js';

function readJsonFileOrNull(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (cause) {
    throw new AppError(
      ERROR_CODES.CONFIG_CORRUPT,
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

let _cachedConfig = null;
let _cachedDefaults = null;

function loadDefaultConfig() {
  if (_cachedDefaults) return _cachedDefaults;
  const defaultsPath = new URL('./default.json', import.meta.url);
  const raw = fs.readFileSync(defaultsPath, 'utf8');
  _cachedDefaults = JSON.parse(raw);
  return _cachedDefaults;
}

function validateAndCoercePatch(key, value) {
  switch (key) {
    case 'currency': {
      if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 10) {
        throw new AppError(ERROR_CODES.INVALID_CONFIG, 'Moeda inválida.', { key, value });
      }
      return value.trim().toUpperCase();
    }
    case 'hourlyRate': {
      const num = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(num) || num < 0) {
        throw new AppError(ERROR_CODES.INVALID_CONFIG, 'Valor/hora inválido.', { key, value });
      }
      return num;
    }
    case 'dateTimeFormat':
    case 'dateFormat': {
      if (typeof value !== 'string' || value.trim().length < 1) {
        throw new AppError(ERROR_CODES.INVALID_CONFIG, 'Formato de data inválido.', { key, value });
      }
      return value.trim();
    }
    case 'timezone': {
      // Reservado para futura entrega (ex.: IANA TZ com date-fns-tz).
      if (value === null) return null;
      if (typeof value !== 'string' || value.trim().length < 1) {
        throw new AppError(ERROR_CODES.INVALID_CONFIG, 'Timezone inválido.', { key, value });
      }
      return value.trim();
    }
    default:
      throw new AppError(ERROR_CODES.INVALID_CONFIG, `Chave de config inválida: ${key}`, { key });
  }
}

export function getPaths() {
  return getAppPaths();
}

export function getConfig() {
  if (_cachedConfig) return _cachedConfig;
  const defaults = loadDefaultConfig();
  const { configFile } = getAppPaths();
  const userCfg = readJsonFileOrNull(configFile) ?? {};
  _cachedConfig = { ...defaults, ...userCfg };
  return _cachedConfig;
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
  _cachedConfig = null; // Invalida cache
  return getConfig();
}

export function reset() {
  const { configFile } = getAppPaths();
  if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
  _cachedConfig = null;
  return getConfig();
}

