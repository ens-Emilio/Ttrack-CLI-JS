import chalk from 'chalk';
import * as timerService from '../services/timerService.js';
import * as formatter from '../utils/formatter.js';

export default function stopCommand() {
  const session = timerService.stopTimer();
  const durationStr = formatter.formatMsToDuration(session.duration);

  console.log(chalk.green(`✔ Timer finalizado: ${chalk.bold(durationStr)} registrados para "${chalk.bold(session.task)}"`));
}
