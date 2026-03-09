import chalk from 'chalk';
import * as timer from '../core/timer.js';
import * as formatter from '../utils/formatter.js';

export default function stopCommand() {
  try {
    const session = timer.stopTimer();
    const durationStr = formatter.formatMsToDuration(session.duration);
    
    console.log(chalk.green(`✔ Timer finalizado: ${chalk.bold(durationStr)} registrados para "${chalk.bold(session.task)}"`));
  } catch (err) {
    console.error(chalk.red(`✖ Erro: ${err.message}`));
  }
}
