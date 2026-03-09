import chalk from 'chalk';
import Table from 'cli-table3';
import { isToday, isThisWeek, isThisMonth, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as timer from '../core/timer.js';
import * as formatter from '../utils/formatter.js';

export default function reportCommand(options) {
  const sessions = timer.getSessions();
  
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
    const start = options.from ? startOfDay(parseISO(options.from)) : new Date(0);
    const end = options.to ? endOfDay(parseISO(options.to)) : new Date();
    filteredSessions = sessions.filter(s => 
      isWithinInterval(parseISO(s.startTime), { start, end })
    );
    periodLabel = `Período de ${options.from || 'início'} até ${options.to || 'hoje'}`;
  }

  if (filteredSessions.length === 0) {
    console.log(chalk.yellow(`ℹ Nenhuma sessão encontrada para: ${periodLabel}`));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('Data'),
      chalk.cyan('Tarefa'),
      chalk.cyan('Projeto'),
      chalk.cyan('Duração')
    ]
  });

  let totalDuration = 0;

  filteredSessions.forEach(s => {
    totalDuration += s.duration;
    table.push([
      formatter.formatDateTime(s.startTime),
      s.task,
      s.project || '-',
      formatter.formatMsToDuration(s.duration)
    ]);
  });

  console.log(chalk.bold(`\nRelatório: ${periodLabel}`));
  console.log(table.toString());
  console.log(chalk.green(`\nTotal: ${chalk.bold(formatter.formatMsToDuration(totalDuration))}\n`));
}
