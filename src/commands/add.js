import chalk from 'chalk';
import * as sessionService from '../services/sessionService.js';
import * as formatter from '../utils/formatter.js';

export default function addCommand(task, options) {
  const session = sessionService.addManualSession(task, options);
  const durationStr = formatter.formatMsToDuration(session.duration);

  console.log(chalk.green(`✔ Sessão adicionada: ${chalk.bold(durationStr)} para "${chalk.bold(session.task)}"`));
  if (session.project) {
    console.log(chalk.blue(`📁 Projeto: ${session.project}`));
  }
  console.log(chalk.gray(`   ${formatter.formatTime(session.startTime)} → ${formatter.formatTime(session.endTime)}`));
}
