import chalk from 'chalk';
import Table from 'cli-table3';
import { getConfig } from '../../config/manager.js';
import * as timerService from '../services/timerService.js';
import * as formatter from '../utils/formatter.js';
import { filterSessions } from '../services/filterService.js';

export default function listCommand(options) {
  const cfg = getConfig();
  let sessions = timerService.getSessions();
  
  // Aplica filtros se fornecidos
  sessions = filterSessions(sessions, options);

  if (sessions.length === 0) {
    console.log(chalk.yellow('ℹ Nenhuma sessão encontrada com os critérios informados.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Tarefa'),
      chalk.cyan('Projeto'),
      chalk.cyan('Tags'),
      chalk.cyan('$'),
      chalk.cyan('Data/Hora'),
      chalk.cyan('Duração')
    ],
    colWidths: [10, 25, 18, 18, 4, 22, 12]
  });

  const limit = options.limit || 10;
  const lastSessions = sessions.slice(-limit).reverse();

  lastSessions.forEach(s => {
    const billableIndicator = s.billable !== false
      ? chalk.green('$')
      : chalk.gray('-');
    table.push([
      s.id.split('-')[0],
      s.task,
      s.project || '-',
      s.tags?.length ? s.tags.join(', ') : '-',
      billableIndicator,
      formatter.formatDateTime(s.startTime, cfg),
      formatter.formatMsToDuration(s.duration)
    ]);
  });

  console.log(table.toString());
}
