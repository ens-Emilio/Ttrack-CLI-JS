import crypto from 'crypto';
import { sessionRepository } from '../core/repositories/sessionRepository.js';
import * as validator from '../utils/validator.js';
import * as calculator from '../core/calculator.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

/**
 * Atualiza uma sessão existente com novos dados.
 * @param {string} id ID da sessão.
 * @param {Object} updates Campos a serem atualizados.
 */
export function updateSession(id, updates) {
  const sessions = sessionRepository.getAll();
  const session = sessions.find(s => s.id === id);

  if (!session) {
    throw new AppError(ERROR_CODES.E_INVALID_INPUT, `Sessão não encontrada com o ID: ${id}`);
  }

  const updatedData = { ...session };

  if (updates.task) {
    updatedData.task = validator.validateTaskName(updates.task);
  }

  if (updates.project !== undefined) {
    updatedData.project = updates.project || null;
  }

  if (updates.tags !== undefined) {
    updatedData.tags = updates.tags ? updates.tags.split(',').map(t => t.trim()) : [];
  }

  if (updates.notes !== undefined) {
    updatedData.notes = updates.notes || null;
  }

  if (updates.billable !== undefined) {
    updatedData.billable = updates.billable;
  }

  if (updates.hourlyRate !== undefined) {
    const rate = Number(updates.hourlyRate);
    if (isNaN(rate) || rate < 0) {
      throw new AppError(ERROR_CODES.E_INVALID_CONFIG, 'Valor/hora inválido.');
    }
    updatedData.hourlyRate = rate;
  }

  // Se mudar horários, recalcula duração
  if (updates.startTime || updates.endTime) {
    if (updates.startTime) {
      validator.validateDate(updates.startTime);
      updatedData.startTime = new Date(updates.startTime).toISOString();
    }
    if (updates.endTime) {
      validator.validateDate(updates.endTime);
      updatedData.endTime = new Date(updates.endTime).toISOString();
    }

    // Validação básica de ordem cronológica
    if (new Date(updatedData.startTime) > new Date(updatedData.endTime)) {
      throw new AppError(ERROR_CODES.E_INVALID_DATE, 'A data de início não pode ser posterior à data de término.');
    }

    // Nota: Para edições simples, limpamos intervalos se houver alteração manual de start/end
    // para manter consistência, ou poderíamos ajustar o primeiro/último intervalo.
    // Optaremos por simplificar a duração baseada nos campos root se editados manualmente.
    updatedData.duration = calculator.calculateIntervalDuration(updatedData.startTime, updatedData.endTime);
    updatedData.intervals = [
      { startTime: updatedData.startTime, endTime: updatedData.endTime }
    ];
  }

  sessionRepository.update(id, updatedData);
  return updatedData;
}

/**
 * Adiciona uma sessão manualmente com horários de início e fim.
 * @param {string} task Nome da tarefa.
 * @param {Object} options { start, end, date, project, tags, billable, notes, hourlyRate }
 */
export function addManualSession(task, options = {}) {
  const validatedTask = validator.validateTaskName(task);

  // Parse base date
  const baseDate = options.date ? new Date(options.date) : new Date();
  if (isNaN(baseDate.getTime())) {
    throw new AppError(ERROR_CODES.E_INVALID_DATE, `Data inválida: ${options.date}`);
  }

  const startDate = validator.validateTimeString(options.start, baseDate);
  const endDate = validator.validateTimeString(options.end, baseDate);

  if (startDate >= endDate) {
    throw new AppError(
      ERROR_CODES.E_INVALID_TIME_RANGE,
      'O horário de início deve ser anterior ao horário de término.'
    );
  }

  // Check overlap
  const existing = sessionRepository.getAll();
  const hasOverlap = existing.some(s => {
    if (!s.startTime || !s.endTime) return false;
    const sStart = new Date(s.startTime);
    const sEnd = new Date(s.endTime);
    return startDate < sEnd && endDate > sStart;
  });

  if (hasOverlap) {
    throw new AppError(
      ERROR_CODES.E_SESSION_OVERLAP,
      'O intervalo informado se sobrepõe com uma sessão existente.'
    );
  }

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  const duration = calculator.calculateIntervalDuration(startISO, endISO);

  const session = {
    id: crypto.randomUUID(),
    task: validatedTask,
    project: options.project || null,
    tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
    notes: options.notes || null,
    startTime: startISO,
    endTime: endISO,
    duration,
    billable: options.billable !== undefined ? options.billable : true,
    hourlyRate: options.hourlyRate !== undefined ? Number(options.hourlyRate) : 0,
    isPaused: false,
    intervals: [{ startTime: startISO, endTime: endISO }]
  };

  sessionRepository.add(session);
  return session;
}

/**
 * Remove uma sessão.
 */
export function deleteSession(id) {
  const success = sessionRepository.delete(id);
  if (!success) {
    throw new AppError(ERROR_CODES.E_INVALID_INPUT, `Sessão não encontrada com o ID: ${id}`);
  }
  return true;
}
