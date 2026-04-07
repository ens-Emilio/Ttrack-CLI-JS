import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

/**
 * Parses "HH:MM" time string and anchors to a given date (default: today).
 * Returns a Date object.
 */
export function validateTimeString(timeStr, baseDate = new Date()) {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new AppError(ERROR_CODES.E_INVALID_TIME_RANGE, `Hora inválida: ${timeStr}. Use o formato HH:MM.`);
  }
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new AppError(ERROR_CODES.E_INVALID_TIME_RANGE, `Hora inválida: "${timeStr}". Use o formato HH:MM.`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new AppError(ERROR_CODES.E_INVALID_TIME_RANGE, `Hora fora do intervalo: "${timeStr}".`);
  }
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function validateTaskName(name) {
  if (!name || name.trim().length === 0) {
    throw new AppError(ERROR_CODES.E_INVALID_TASK, 'O nome da tarefa não pode estar vazio.');
  }
  if (name.length > 100) {
    throw new AppError(
      ERROR_CODES.E_INVALID_TASK,
      'O nome da tarefa é muito longo (máximo 100 caracteres).'
    );
  }
  return name.trim();
}

export function validateDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new AppError(
      ERROR_CODES.E_INVALID_DATE,
      `Data inválida: ${dateStr}. Use o formato YYYY-MM-DD.`
    );
  }
  return date;
}
