import { projectRepository } from '../core/repositories/projectRepository.js';
import { sessionRepository } from '../core/repositories/sessionRepository.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

/**
 * Returns budget status for a project: { budgetHours, usedHours, percent, exceeded, warning }.
 */
export function getProjectBudgetStatus(projectName) {
  const project = projectRepository.findByName(projectName);
  if (!project || project.budgetHours === null) return null;

  const sessions = sessionRepository.getAll();
  const usedMs = sessions
    .filter(s => s.project === projectName)
    .reduce((sum, s) => sum + (s.duration || 0), 0);
  const usedHours = usedMs / 3600000;
  const percent = (usedHours / project.budgetHours) * 100;

  return {
    budgetHours: project.budgetHours,
    usedHours,
    percent,
    exceeded: percent >= 100,
    warning: percent >= 80 && percent < 100
  };
}

/**
 * Checks budget after a session is added. Logs chalk warnings if thresholds are crossed.
 * Returns the status object or null.
 */
export function checkBudgetThresholds(projectName) {
  if (!projectName) return null;
  return getProjectBudgetStatus(projectName);
}

export function setBudget(projectName, hours) {
  const project = projectRepository.findByName(projectName);
  if (!project) {
    throw new AppError(ERROR_CODES.E_PROJECT_NOT_FOUND, `Projeto não encontrado: ${projectName}`);
  }
  const num = Number(hours);
  if (!Number.isFinite(num) || num <= 0) {
    throw new AppError(ERROR_CODES.E_INVALID_CONFIG, 'Horas de orçamento inválidas.', { hours });
  }
  projectRepository.update(projectName, { budgetHours: num });
}
