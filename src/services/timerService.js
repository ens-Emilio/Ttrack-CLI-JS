import * as timerCore from '../core/timer.js';
import { getConfig } from '../../config/manager.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

export function startTimer(task, options = {}) {
  const cfg = getConfig();
  const hourlyRate =
    options.hourlyRate !== undefined && options.hourlyRate !== null
      ? options.hourlyRate
      : cfg.hourlyRate;

  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    throw new AppError(ERROR_CODES.INVALID_CONFIG, 'Valor/hora inválido.', { hourlyRate });
  }

  return timerCore.startTimer(task, { ...options, hourlyRate });
}

export function stopTimer() {
  return timerCore.stopTimer();
}

export function getActiveSession() {
  return timerCore.getActiveSession();
}

export function getSessions() {
  return timerCore.getSessions();
}
