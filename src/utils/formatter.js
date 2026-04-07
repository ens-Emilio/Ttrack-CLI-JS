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

export function formatDurationParts(ms) {
  const duration = intervalToDuration({ start: 0, end: ms });
  return {
    hours: duration.hours || 0,
    minutes: duration.minutes || 0,
    seconds: duration.seconds || 0
  };
}

export function formatCurrency(amount, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
}

export function formatPercent(value, decimals = 0) {
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
