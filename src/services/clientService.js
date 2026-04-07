import { clientRepository } from '../core/repositories/clientRepository.js';
import { projectRepository } from '../core/repositories/projectRepository.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

export function addClient(name) {
  const existing = clientRepository.findByName(name);
  if (existing) {
    throw new AppError(ERROR_CODES.E_INVALID_INPUT, `Cliente já existe: ${name}`);
  }
  return clientRepository.add({ name });
}

export function listClients() {
  return clientRepository.getAll();
}

export function deleteClient(name) {
  const client = clientRepository.findByName(name);
  if (!client) {
    throw new AppError(ERROR_CODES.E_CLIENT_NOT_FOUND, `Cliente não encontrado: ${name}`);
  }
  // Guard: do not delete if projects reference this client
  const projects = projectRepository.getAll();
  const referenced = projects.filter(p => p.clientId === client.id);
  if (referenced.length > 0) {
    const names = referenced.map(p => p.name).join(', ');
    throw new AppError(
      ERROR_CODES.E_INVALID_INPUT,
      `Não é possível deletar: os projetos "${names}" referenciam este cliente.`
    );
  }
  clientRepository.delete(name);
}
