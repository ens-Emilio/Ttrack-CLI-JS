import { AppError } from '../../src/errors/AppError.js';
import { ERROR_CODES } from '../../src/errors/codes.js';

const CURRENT_SCHEMA_VERSION = 4;

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
    notes: s.notes ?? null,
    startTime: s.startTime ?? null,
    endTime: s.endTime ?? null,
    duration: typeof s.duration === 'number' ? s.duration : 0,
    billable: typeof s.billable === 'boolean' ? s.billable : true,
    hourlyRate: typeof s.hourlyRate === 'number' ? s.hourlyRate : 0,
    isPaused: typeof s.isPaused === 'boolean' ? s.isPaused : false,
    githubContext: s.githubContext ?? null,
    intervals: Array.isArray(s.intervals) ? s.intervals : []
  };
}

function ensureProjectShape(p) {
  if (!p || typeof p !== 'object') return null;
  return {
    name: p.name ?? '',
    hourlyRate: typeof p.hourlyRate === 'number' ? p.hourlyRate : null,
    clientId: p.clientId ?? null,
    budgetHours: typeof p.budgetHours === 'number' ? p.budgetHours : null
  };
}

function ensureClientShape(c) {
  if (!c || typeof c !== 'object') return null;
  return {
    id: c.id ?? null,
    name: c.name ?? ''
  };
}

function ensureTemplateShape(t) {
  if (!t || typeof t !== 'object') return null;
  return {
    name: t.name ?? '',
    task: t.task ?? '',
    project: t.project ?? null,
    tags: Array.isArray(t.tags) ? t.tags : [],
    notes: t.notes ?? null,
    billable: typeof t.billable === 'boolean' ? t.billable : true,
    hourlyRate: typeof t.hourlyRate === 'number' ? t.hourlyRate : null
  };
}

export function migrate(rawData) {
  let data = coerceBaseShape(rawData);
  let migrated = false;

  const version = Number.isFinite(data.schemaVersion) ? data.schemaVersion : 0;

  if (version === 0) {
    // v0 → v1: add schemaVersion and normalize shape
    migrated = true;
    data.schemaVersion = 1;
  }

  if (data.schemaVersion === 1) {
    // v1 → v2: add projects array
    migrated = true;
    if (!Array.isArray(data.projects)) data.projects = [];
    data.schemaVersion = 2;
  }

  if (data.schemaVersion === 2) {
    // v2 → v3: add clients array; add clientId/budgetHours to projects
    migrated = true;
    if (!Array.isArray(data.clients)) data.clients = [];
    if (Array.isArray(data.projects)) {
      data.projects = data.projects.map(p => ({
        clientId: null,
        budgetHours: null,
        ...p
      }));
    }
    data.schemaVersion = 3;
  }

  if (data.schemaVersion === 3) {
    // v3 → v4: add templates array
    migrated = true;
    if (!Array.isArray(data.templates)) data.templates = [];
    data.schemaVersion = 4;
  }

  if (data.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new AppError(
      ERROR_CODES.E_DATA_CORRUPT,
      `Versão de schema não suportada: ${data.schemaVersion}`,
      { schemaVersion: data.schemaVersion }
    );
  }

  if (migrated) {
    const sessions = [];
    for (const s of data.sessions) {
      const normalized = ensureSessionShape(s);
      if (normalized) sessions.push(normalized);
    }
    data.sessions = sessions;
    data.activeSession = data.activeSession ? ensureSessionShape(data.activeSession) : null;

    if (Array.isArray(data.projects)) {
      data.projects = data.projects.map(ensureProjectShape).filter(Boolean);
    }
    if (Array.isArray(data.clients)) {
      data.clients = data.clients.map(ensureClientShape).filter(Boolean);
    }
    if (Array.isArray(data.templates)) {
      data.templates = data.templates.map(ensureTemplateShape).filter(Boolean);
    }
  }

  return { data, migrated };
}

