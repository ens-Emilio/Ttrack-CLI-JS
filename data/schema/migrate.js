import { AppError } from '../../src/errors/AppError.js';
import { ERROR_CODES } from '../../src/errors/codes.js';

const CURRENT_SCHEMA_VERSION = 1;

function coerceBaseShape(data) {
  const out = typeof data === 'object' && data ? { ...data } : {};
  if (!Array.isArray(out.sessions)) out.sessions = [];
  if (!('activeSession' in out)) out.activeSession = null;
  if (out.activeSession === undefined) out.activeSession = null;
  return out;
}

function ensureSessionShape(s) {
  if (!s || typeof s !== 'object') return null;
  return {
    id: s.id ?? null,
    task: s.task ?? '',
    project: s.project ?? null,
    tags: Array.isArray(s.tags) ? s.tags : [],
    startTime: s.startTime ?? null,
    endTime: s.endTime ?? null,
    duration: typeof s.duration === 'number' ? s.duration : 0,
    billable: typeof s.billable === 'boolean' ? s.billable : true,
    hourlyRate: typeof s.hourlyRate === 'number' ? s.hourlyRate : 0
  };
}

export function migrate(rawData) {
  let data = coerceBaseShape(rawData);
  let migrated = false;

  const version = Number.isFinite(data.schemaVersion) ? data.schemaVersion : 0;
  if (version === 0) {
    // v0 -> v1: add schemaVersion and normalize shape
    migrated = true;
    data.schemaVersion = 1;
  }

  if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new AppError(
      ERROR_CODES.DATA_CORRUPT,
      `Versão de schema não suportada: ${data.schemaVersion}`,
      { schemaVersion: data.schemaVersion }
    );
  }

  // Se já migrou ou a versão mudou, normaliza. Caso contrário, confia no arquivo.
  if (migrated) {
    const sessions = [];
    for (const s of data.sessions) {
      const normalized = ensureSessionShape(s);
      if (normalized) sessions.push(normalized);
    }
    data.sessions = sessions;
    data.activeSession = data.activeSession ? ensureSessionShape(data.activeSession) : null;
  }

  return { data, migrated };
}

