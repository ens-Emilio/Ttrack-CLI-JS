import chalk from 'chalk';
import * as timerService from '../services/timerService.js';
import * as formatter from '../utils/formatter.js';

export default function pauseCommand() {
  const session = timerService.pauseTimer();
  console.log(chalk.yellow(`\n⏸  Timer pausado: ${chalk.bold(session.task)}`));
  console.log(`${chalk.gray('Duração acumulada:')} ${formatter.formatDuration(session.duration)}`);
}
