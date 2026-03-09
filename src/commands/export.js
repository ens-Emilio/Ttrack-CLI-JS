import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { isToday, isThisWeek, isThisMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as timer from '../core/timer.js';

export default function exportCommand(options) {
  const sessions = timer.getSessions();
  let filteredSessions = sessions;

  if (options.today) {
    filteredSessions = sessions.filter(s => isToday(parseISO(s.startTime)));
  } else if (options.week) {
    filteredSessions = sessions.filter(s => isThisWeek(parseISO(s.startTime), { locale: ptBR }));
  } else if (options.month) {
    filteredSessions = sessions.filter(s => isThisMonth(parseISO(s.startTime)));
  } else if (options.from || options.to) {
    const start = options.from ? startOfDay(parseISO(options.from)) : new Date(0);
    const end = options.to ? endOfDay(parseISO(options.to)) : new Date();
    filteredSessions = sessions.filter(s => isWithinInterval(parseISO(s.startTime), { start, end }));
  }

  if (filteredSessions.length === 0) {
    console.log(chalk.yellow('ℹ Nenhuma sessão encontrada para exportar.'));
    return;
  }

  const format = options.format || 'json';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `export-${timestamp}.${format}`;
  const filePath = path.resolve(process.cwd(), filename);

  let content = '';
  if (format === 'csv') {
    const header = 'id,task,project,startTime,endTime,duration_ms,duration_h\n';
    const rows = filteredSessions.map(s => {
      const durationH = (s.duration / (1000 * 60 * 60)).toFixed(2);
      return `"${s.id}","${s.task}","${s.project || ''}","${s.startTime}","${s.endTime}",${s.duration},${durationH}`;
    }).join('\n');
    content = header + rows;
  } else {
    content = JSON.stringify(filteredSessions, null, 2);
  }

  fs.writeFileSync(filePath, content);
  console.log(chalk.green(`✔ Exportação concluída: ${chalk.bold(filename)}`));
}
