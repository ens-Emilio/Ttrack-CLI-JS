import chalk from 'chalk';
import * as timerCore from '../core/timer.js';
import { getConfig } from '../../config/manager.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';
import { getProjectRate } from './projectService.js';
import { checkBudgetThresholds } from './budgetService.js';

export function startTimer(task, options = {}) {
  const cfg = getConfig();

  // Resolve hourlyRate: CLI flag → project rate → global config
  let hourlyRate;
  if (options.hourlyRate !== undefined && options.hourlyRate !== null) {
    hourlyRate = options.hourlyRate;
  } else if (options.project) {
    const projectRate = getProjectRate(options.project);
    hourlyRate = projectRate !== null ? projectRate : cfg.hourlyRate;
  } else {
    hourlyRate = cfg.hourlyRate;
  }

  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    throw new AppError(ERROR_CODES.E_INVALID_CONFIG, 'Valor/hora inválido.', { hourlyRate });
  }

  return timerCore.startTimer(task, { ...options, hourlyRate });
}

export function pauseTimer() {
  return timerCore.pauseTimer();
}

export function resumeTimer() {
  return timerCore.resumeTimer();
}

export function stopTimer() {
  const session = timerCore.stopTimer();

  // Check budget after stop
  if (session.project) {
    const budget = checkBudgetThresholds(session.project);
    if (budget) {
      if (budget.exceeded) {
        console.log(chalk.red(`⚠ Orçamento de "${session.project}" esgotado! (${budget.usedHours.toFixed(1)}h / ${budget.budgetHours}h)`));
      } else if (budget.warning) {
        console.log(chalk.yellow(`⚠ Atenção: ${budget.percent.toFixed(0)}% do orçamento de "${session.project}" utilizado.`));
      }
    }
  }

  return session;
}

export function getActiveSession() {
  return timerCore.getActiveSession();
}

export function getSessions() {
  return timerCore.getSessions();
}
