import chalk from 'chalk';
import * as timer from '../core/timer.js';
import * as formatter from '../utils/formatter.js';
import * as validator from '../utils/validator.js';

export default function startCommand(task, options) {
  try {
    const validatedTask = validator.validateTaskName(task);
    const session = timer.startTimer(validatedTask, options);
    const startTimeStr = formatter.formatTime(session.startTime);
    
    console.log(chalk.green(`✔ Timer iniciado: "${chalk.bold(validatedTask)}" às ${startTimeStr}`));
    if (session.project) {
      console.log(chalk.blue(`📁 Projeto: ${session.project}`));
    }
  } catch (err) {
    console.error(chalk.red(`✖ Erro: ${err.message}`));
  }
}
