import fs from 'fs';
import crypto from 'crypto';
import { parse, isValid } from 'date-fns';
import { sessionRepository } from '../core/repositories/sessionRepository.js';
import { migrate } from '../../data/schema/migrate.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';
import * as calculator from '../core/calculator.js';

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

function indexByHeader(headers) {
  return Object.fromEntries(
    headers.map((header, index) => [header.toLowerCase().trim(), index])
  );
}

function parseBooleanish(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'sim'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'nao', 'não'].includes(normalized)) return false;
  return fallback;
}

function parseTogglDateTime(dateStr, timeStr) {
  const dateTimeFormats = [
    'dd/MM/yyyy HH:mm:ss',
    'dd/MM/yyyy HH:mm',
    'MM/dd/yyyy HH:mm:ss',
    'MM/dd/yyyy HH:mm',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm'
  ];
  const input = `${dateStr} ${timeStr}`;
  for (const fmt of dateTimeFormats) {
    const parsed = parse(input, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }
  return null;
}

function persistImportedSessions(sessions, dedupKeyFn) {
  const currentSessions = sessionRepository.getAll();
  const currentKeys = new Set(currentSessions.map(dedupKeyFn));

  let importedCount = 0;
  let skippedCount = 0;

  for (const session of sessions) {
    const key = dedupKeyFn(session);
    if (!key || currentKeys.has(key)) {
      skippedCount++;
      continue;
    }

    currentKeys.add(key);
    sessionRepository.add(session);
    importedCount++;
  }

  return { importedCount, skippedCount };
}

/**
 * Importa sessões de um arquivo JSON externo.
 * @param {string} filePath Caminho do arquivo a ser importado.
 * @param {Object} options Opções de importação (ex: merge ou overwrite).
 */
export function importFromJson(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new AppError(ERROR_CODES.E_INVALID_INPUT, `Arquivo não encontrado: ${filePath}`);
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const payload = Array.isArray(parsed) ? { sessions: parsed } : parsed;

    // Utiliza a lógica de migração existente para validar e normalizar os dados importados
    const { data: importedData } = migrate(payload);

    return persistImportedSessions(importedData.sessions, session => session.id);
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    throw new AppError(
      ERROR_CODES.E_INVALID_INPUT,
      'Falha ao processar arquivo de importação. Certifique-se que é um JSON válido do ttrack-cli.',
      { filePath },
      cause
    );
  }
}

/**
 * Importa sessões de um CSV exportado pelo ttrack-cli ou pelo Toggl Track.
 * Detecta automaticamente o layout pela linha de cabeçalho.
 * @param {string} filePath Caminho do arquivo CSV
 * @param {Object} options Opções (override de billable, etc.)
 */
export function importFromCsv(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    throw new AppError(ERROR_CODES.E_INVALID_INPUT, `Arquivo não encontrado: ${filePath}`);
  }

  const lines = readLines(filePath);

  if (lines.length < 2) {
    return { importedCount: 0, skippedCount: 0 };
  }

  const headers = parseCsvLine(lines[0]);
  const headerIndex = indexByHeader(headers);
  const isFttCsv = headerIndex.starttime !== undefined && headerIndex.endtime !== undefined;
  const isTogglCsv = headerIndex['start date'] !== undefined && headerIndex['start time'] !== undefined;

  if (!isFttCsv && !isTogglCsv) {
    throw new AppError(
      ERROR_CODES.E_INVALID_INPUT,
      'CSV inválido: cabeçalho não reconhecido para importação.',
      { filePath }
    );
  }

  const sessions = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;

    if (isFttCsv) {
      const task = headerIndex.task !== undefined ? cols[headerIndex.task] : cols[1];
      const project = headerIndex.project !== undefined ? cols[headerIndex.project] || null : null;
      const startTime = headerIndex.starttime !== undefined ? cols[headerIndex.starttime] : null;
      const endTime = headerIndex.endtime !== undefined ? cols[headerIndex.endtime] || null : null;
      const durationMs = headerIndex.duration_ms !== undefined ? Number(cols[headerIndex.duration_ms]) : NaN;
      const billable = headerIndex.billable !== undefined ? parseBooleanish(cols[headerIndex.billable], true) : true;
      const hourlyRate = headerIndex.hourlyrate !== undefined ? Number(cols[headerIndex.hourlyrate]) : 0;
      const tags = headerIndex.tags !== undefined && cols[headerIndex.tags]
        ? cols[headerIndex.tags].split(',').map(t => t.trim()).filter(Boolean)
        : [];

      if (!startTime) continue;

      const duration = Number.isFinite(durationMs)
        ? durationMs
        : (endTime ? calculator.calculateIntervalDuration(startTime, endTime) : 0);

      sessions.push({
        id: headerIndex.id !== undefined && cols[headerIndex.id] ? cols[headerIndex.id] : crypto.randomUUID(),
        task: task || 'Importado do CSV',
        project,
        tags,
        notes: headerIndex.notes !== undefined ? cols[headerIndex.notes] || null : null,
        startTime,
        endTime,
        duration,
        billable,
        hourlyRate: Number.isFinite(hourlyRate) ? hourlyRate : 0,
        isPaused: false,
        intervals: endTime ? [{ startTime, endTime }] : []
      });
      continue;
    }

    const colDescription = headerIndex.description;
    const colProject = headerIndex.project;
    const colBillable = headerIndex.billable;
    const colStartDate = headerIndex['start date'];
    const colStartTime = headerIndex['start time'];
    const colEndDate = headerIndex['end date'];
    const colEndTime = headerIndex['end time'];
    const colTags = headerIndex.tags;

    const task = colDescription !== undefined ? cols[colDescription] : cols[0];
    const project = colProject !== undefined ? (cols[colProject] || null) : null;
    const billable = colBillable !== undefined ? parseBooleanish(cols[colBillable], true) : true;

    const startDateStr = colStartDate !== undefined ? cols[colStartDate] : null;
    const startTimeStr = colStartTime !== undefined ? cols[colStartTime] : null;
    const endDateStr = colEndDate !== undefined ? cols[colEndDate] : null;
    const endTimeStr = colEndTime !== undefined ? cols[colEndTime] : null;

    if (!startDateStr || !startTimeStr) { continue; }

    const startParsed = parseTogglDateTime(startDateStr, startTimeStr);
    const endParsed = endDateStr && endTimeStr ? parseTogglDateTime(endDateStr, endTimeStr) : null;
    if (!startParsed) {
      continue;
    }

    const startISO = startParsed.toISOString();
    const endISO = endParsed ? endParsed.toISOString() : null;

    const duration = endISO ? calculator.calculateIntervalDuration(startISO, endISO) : 0;
    const tags = colTags !== undefined && cols[colTags]
      ? cols[colTags].split(',').map(t => t.trim()).filter(Boolean)
      : [];

    sessions.push({
      id: crypto.randomUUID(),
      task: task || 'Importado do Toggl',
      project,
      tags,
      notes: null,
      startTime: startISO,
      endTime: endISO,
      duration,
      billable,
      hourlyRate: 0,
      isPaused: false,
      intervals: endISO ? [{ startTime: startISO, endTime: endISO }] : []
    });
  }

  const dedupKeyFn = session => (
    isFttCsv
      ? (session.id || `${session.task}|${session.project}|${session.startTime}`)
      : `${session.task}|${session.project}|${session.startTime}`
  );

  return persistImportedSessions(sessions, dedupKeyFn);
}

export function importFromTogglCsv(filePath, options = {}) {
  return importFromCsv(filePath, { ...options, source: 'toggl' });
}
