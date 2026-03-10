import { format, intervalToDuration } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DEFAULTS = {
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
  dateFormat: 'dd/MM/yyyy'
};

export function formatDateTime(date, config = null) {
  const fmt = config?.dateTimeFormat || DEFAULTS.dateTimeFormat;
  return format(new Date(date), fmt, { locale: ptBR });
}

export function formatDate(date, config = null) {
  const fmt = config?.dateFormat || DEFAULTS.dateFormat;
  return format(new Date(date), fmt, { locale: ptBR });
}

export function formatTime(date) {
  return format(new Date(date), "HH:mm");
}

export function formatMsToDuration(ms) {
  const duration = intervalToDuration({ start: 0, end: ms });
  
  const parts = [];
  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes) parts.push(`${duration.minutes}m`);
  if (duration.seconds || parts.length === 0) parts.push(`${duration.seconds || 0}s`);
  
  return parts.join(' ');
}
