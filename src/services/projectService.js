import { projectRepository } from '../core/repositories/projectRepository.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

export function listProjects() {
  return projectRepository.getAll();
}

export function getOrCreateProject(name) {
  const existing = projectRepository.findByName(name);
  if (existing) return existing;
  const project = { name, hourlyRate: null, clientId: null, budgetHours: null };
  projectRepository.add(project);
  return project;
}

export function getProjectRate(name) {
  const project = projectRepository.findByName(name);
  return project?.hourlyRate ?? null;
}

export function setProjectRate(name, rate) {
  const num = Number(rate);
  if (!Number.isFinite(num) || num < 0) {
    throw new AppError(ERROR_CODES.E_INVALID_CONFIG, 'Valor/hora inválido.', { rate });
  }
  const existing = projectRepository.findByName(name);
  if (!existing) {
    projectRepository.add({ name, hourlyRate: num, clientId: null, budgetHours: null });
  } else {
    projectRepository.update(name, { hourlyRate: num });
  }
}

export function setProjectBudget(name, hours) {
  const num = Number(hours);
  if (!Number.isFinite(num) || num <= 0) {
    throw new AppError(ERROR_CODES.E_INVALID_CONFIG, 'Horas de orçamento inválidas.', { hours });
  }
  const existing = projectRepository.findByName(name);
  if (!existing) {
    throw new AppError(ERROR_CODES.E_PROJECT_NOT_FOUND, `Projeto não encontrado: ${name}`);
  }
  projectRepository.update(name, { budgetHours: num });
}

export function setProjectClient(projectName, clientId) {
  const existing = projectRepository.findByName(projectName);
  if (!existing) {
    throw new AppError(ERROR_CODES.E_PROJECT_NOT_FOUND, `Projeto não encontrado: ${projectName}`);
  }
  projectRepository.update(projectName, { clientId });
}

export function deleteProject(name) {
  const deleted = projectRepository.delete(name);
  if (!deleted) {
    throw new AppError(ERROR_CODES.E_PROJECT_NOT_FOUND, `Projeto não encontrado: ${name}`);
  }
}
