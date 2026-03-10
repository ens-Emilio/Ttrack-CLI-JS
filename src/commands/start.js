import chalk from 'chalk';
import * as timerService from '../services/timerService.js';
import * as formatter from '../utils/formatter.js';
import * as validator from '../utils/validator.js';

export default function startCommand(task, options) {
  const validatedTask = validator.validateTaskName(task);
  const session = timerService.startTimer(validatedTask, options);
  const startTimeStr = formatter.formatTime(session.startTime);

  console.log(chalk.green(`✔ Timer iniciado: "${chalk.bold(validatedTask)}" às ${startTimeStr}`));
  if (session.project) {
    console.log(chalk.blue(`📁 Projeto: ${session.project}`));
  }
}
