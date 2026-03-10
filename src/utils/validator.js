import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

export function validateTaskName(name) {
  if (!name || name.trim().length === 0) {
    throw new AppError(ERROR_CODES.INVALID_TASK, 'O nome da tarefa não pode estar vazio.');
  }
  if (name.length > 100) {
    throw new AppError(
      ERROR_CODES.INVALID_TASK,
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
      ERROR_CODES.INVALID_DATE,
      `Data inválida: ${dateStr}. Use o formato YYYY-MM-DD.`
    );
  }
  return date;
}
