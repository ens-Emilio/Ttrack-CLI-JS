import { templateRepository } from '../core/repositories/templateRepository.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

function normalizeTags(tags) {
  if (!tags) return [];
  return tags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

export function saveTemplate(name, options) {
  const template = {
    name,
    task: options.task || name,
    project: options.project || null,
    tags: normalizeTags(options.tags),
    notes: options.notes || null,
    billable: options.billable !== undefined ? options.billable : true,
    hourlyRate: options.hourlyRate !== undefined ? Number(options.hourlyRate) : null
  };
  templateRepository.save(template);
  return template;
}

export function loadTemplate(name) {
  const template = templateRepository.findByName(name);
  if (!template) {
    throw new AppError(ERROR_CODES.E_INVALID_INPUT, `Template não encontrado: ${name}`);
  }
  return template;
}

export function listTemplates() {
  return templateRepository.getAll();
}

export function deleteTemplate(name) {
  const deleted = templateRepository.delete(name);
  if (!deleted) {
    throw new AppError(ERROR_CODES.E_INVALID_INPUT, `Template não encontrado: ${name}`);
  }
}
