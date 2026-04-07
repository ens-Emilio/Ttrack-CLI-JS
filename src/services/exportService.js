import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import * as timerService from './timerService.js';
import * as validator from '../utils/validator.js';
import { filterSessions } from './filterService.js';

function buildFilters(options) {
  const filters = {
    project: options.project || undefined,
    tag: options.tag || undefined,
    billable: options.billable
  };

  if (options.today) {
    const today = new Date();
    filters.from = filters.to = format(today, 'yyyy-MM-dd');
  } else if (options.week) {
    const now = new Date();
    filters.from = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
    filters.to = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
  } else if (options.month) {
    const now = new Date();
    filters.from = format(startOfMonth(now), 'yyyy-MM-dd');
    filters.to = format(endOfMonth(now), 'yyyy-MM-dd');
  } else if (options.from || options.to) {
    if (options.from) validator.validateDate(options.from);
    if (options.to) validator.validateDate(options.to);
    filters.from = options.from;
    filters.to = options.to;
  }

  return filters;
}

function buildMetadata(options, filteredSessions, fmt) {
  const filters = buildFilters(options);
  return {
    generatedAt: new Date().toISOString(),
    format: fmt,
    totalSessions: filteredSessions.length,
    filters
  };
}

function escapeCsvField(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function buildExport(options = {}) {
  const sessions = timerService.getSessions();
  const filters = buildFilters(options);
  const filteredSessions = filterSessions(sessions, filters);

  const fmt = options.format || 'json';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = options.output || `export-${timestamp}.${fmt}`;
  const metadata = options.withMeta ? buildMetadata(options, filteredSessions, fmt) : null;

  let content = '';
  if (fmt === 'csv') {
    const header = 'id,task,project,startTime,endTime,duration_ms,duration_h\n';
    const rows = filteredSessions
      .map(s => {
        const durationH = (s.duration / (1000 * 60 * 60)).toFixed(2);
        return [
          escapeCsvField(s.id),
          escapeCsvField(s.task),
          escapeCsvField(s.project || ''),
          escapeCsvField(s.startTime),
          escapeCsvField(s.endTime),
          s.duration,
          durationH
        ].join(',');
      })
      .join('\n');
    content = header + rows;
  } else if (fmt === 'pdf') {
    // PDF content is written directly to file in exportCommand using pdfExporter
    content = null;
  } else {
    content = options.withMeta
      ? JSON.stringify({ metadata, sessions: filteredSessions }, null, 2)
      : JSON.stringify(filteredSessions, null, 2);
  }

  return { filteredSessions, filename, content, format: fmt, metadata };
}
