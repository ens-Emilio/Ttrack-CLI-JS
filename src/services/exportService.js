import { isToday, isThisWeek, isThisMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import * as timerService from './timerService.js';
import * as validator from '../utils/validator.js';

function buildInterval(options) {
  const from = options.from ? validator.validateDate(options.from) : null;
  const to = options.to ? validator.validateDate(options.to) : null;

  const start = from ? startOfDay(from) : new Date(0);
  const end = to ? endOfDay(to) : new Date();
  return { start, end };
}

export function buildExport(options = {}) {
  const sessions = timerService.getSessions();
  let filteredSessions = sessions;

  if (options.today) {
    filteredSessions = sessions.filter(s => isToday(parseISO(s.startTime)));
  } else if (options.week) {
    filteredSessions = sessions.filter(s => isThisWeek(parseISO(s.startTime), { locale: ptBR }));
  } else if (options.month) {
    filteredSessions = sessions.filter(s => isThisMonth(parseISO(s.startTime)));
  } else if (options.from || options.to) {
    const { start, end } = buildInterval(options);
    filteredSessions = sessions.filter(s => isWithinInterval(parseISO(s.startTime), { start, end }));
  }

  const format = options.format || 'json';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `export-${timestamp}.${format}`;

  let content = '';
  if (format === 'csv') {
    const header = 'id,task,project,startTime,endTime,duration_ms,duration_h\n';
    const rows = filteredSessions
      .map(s => {
        const durationH = (s.duration / (1000 * 60 * 60)).toFixed(2);
        return `"${s.id}","${s.task}","${s.project || ''}","${s.startTime}","${s.endTime}",${s.duration},${durationH}`;
      })
      .join('\n');
    content = header + rows;
  } else {
    content = JSON.stringify(filteredSessions, null, 2);
  }

  return { filteredSessions, filename, content };
}

