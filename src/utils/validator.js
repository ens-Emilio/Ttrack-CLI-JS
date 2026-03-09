export function validateTaskName(name) {
  if (!name || name.trim().length === 0) {
    throw new Error('O nome da tarefa não pode estar vazio.');
  }
  if (name.length > 100) {
    throw new Error('O nome da tarefa é muito longo (máximo 100 caracteres).');
  }
  return name.trim();
}

export function validateDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Data inválida: ${dateStr}. Use o formato YYYY-MM-DD.`);
  }
  return date;
}
