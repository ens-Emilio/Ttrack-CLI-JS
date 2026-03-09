import chalk from 'chalk';
import * as timer from '../core/timer.js';
import * as formatter from '../utils/formatter.js';
import * as calculator from '../core/calculator.js';

export default function statusCommand() {
  const session = timer.getActiveSession();
  
  if (!session) {
    console.log(chalk.yellow('ℹ Não há nenhum timer em execução no momento.'));
    return;
  }

  const durationMs = calculator.calculateDuration(session.startTime, new Date().toISOString());
  const durationStr = formatter.formatMsToDuration(durationMs);
  const startTimeStr = formatter.formatTime(session.startTime);

  console.log(chalk.cyan(`⏱️  Timer ativo: ${chalk.bold(session.task)}`));
  if (session.project) {
    console.log(chalk.blue(`📁 Projeto: ${session.project}`));
  }
  console.log(`   Iniciado: ${startTimeStr} (${durationStr} atrás)`);
}
