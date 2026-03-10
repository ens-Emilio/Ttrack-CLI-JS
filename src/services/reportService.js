import { isToday, isThisWeek, isThisMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getConfig } from '../../config/manager.js';
import * as timerService from './timerService.js';
import * as formatter from '../utils/formatter.js';
import * as validator from '../utils/validator.js';

function buildInterval(options) {
  const from = options.from ? validator.validateDate(options.from) : null;
  const to = options.to ? validator.validateDate(options.to) : null;

  const start = from ? startOfDay(from) : new Date(0);
  const end = to ? endOfDay(to) : new Date();
  return { start, end };
}

export function generateReport(options = {}) {
  const cfg = getConfig();
  const sessions = timerService.getSessions();

  let filteredSessions = sessions;
  let periodLabel = 'Todas as sessões';

  if (options.today) {
    filteredSessions = sessions.filter(s => isToday(parseISO(s.startTime)));
    periodLabel = 'Hoje';
  } else if (options.week) {
    filteredSessions = sessions.filter(s => isThisWeek(parseISO(s.startTime), { locale: ptBR }));
    periodLabel = 'Esta Semana';
  } else if (options.month) {
    filteredSessions = sessions.filter(s => isThisMonth(parseISO(s.startTime)));
    periodLabel = 'Este Mês';
  } else if (options.from || options.to) {
    const { start, end } = buildInterval(options);
    filteredSessions = sessions.filter(s => isWithinInterval(parseISO(s.startTime), { start, end }));
    periodLabel = `Período de ${options.from || 'início'} até ${options.to || 'hoje'}`;
  }

  let totalDuration = 0;
  const rows = filteredSessions.map(s => {
    totalDuration += s.duration;
    return {
      date: formatter.formatDateTime(s.startTime, cfg),
      task: s.task,
      project: s.project || '-',
      duration: formatter.formatMsToDuration(s.duration)
    };
  });

  return { periodLabel, rows, totalDuration, totalDurationStr: formatter.formatMsToDuration(totalDuration) };
}

