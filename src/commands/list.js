import chalk from 'chalk';
import Table from 'cli-table3';
import { getConfig } from '../../config/manager.js';
import * as timerService from '../services/timerService.js';
import * as formatter from '../utils/formatter.js';

export default function listCommand(options) {
  const cfg = getConfig();
  const sessions = timerService.getSessions();
  
  if (sessions.length === 0) {
    console.log(chalk.yellow('ℹ Nenhuma sessão registrada ainda.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Tarefa'),
      chalk.cyan('Projeto'),
      chalk.cyan('Data/Hora'),
      chalk.cyan('Duração')
    ],
    colWidths: [10, 30, 20, 25, 15]
  });

  const limit = options.limit || 10;
  const lastSessions = sessions.slice(-limit).reverse();

  lastSessions.forEach(s => {
    table.push([
      s.id.split('-')[0], // Short ID
      s.task,
      s.project || '-',
      formatter.formatDateTime(s.startTime, cfg),
      formatter.formatMsToDuration(s.duration)
    ]);
  });

  console.log(table.toString());
}
