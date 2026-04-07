import chalk from 'chalk';
import * as sessionService from '../services/sessionService.js';
import * as formatter from '../utils/formatter.js';

export default function editCommand(id, options) {
  const updates = {};
  if (options.task) updates.task = options.task;
  if (options.project) updates.project = options.project;
  if (options.tags) updates.tags = options.tags;
  if (options.notes) updates.notes = options.notes;
  if (options.startTime) updates.startTime = options.startTime;
  if (options.endTime) updates.endTime = options.endTime;
  if (options.hourlyRate) updates.hourlyRate = options.hourlyRate;
  if (options.billable !== undefined) updates.billable = options.billable;

  if (Object.keys(updates).length === 0) {
    console.log(chalk.yellow('\n⚠ Nenhuma alteração fornecida. Use flags como --task, --project, etc.'));
    return;
  }

  const updatedSession = sessionService.updateSession(id, updates);

  console.log(chalk.green(`\n✔ Sessão ${chalk.bold(id)} atualizada com sucesso!`));
  console.log(`${chalk.cyan('Tarefa:')} ${updatedSession.task}`);
  if (updatedSession.project) console.log(`${chalk.cyan('Projeto:')} ${updatedSession.project}`);
  console.log(`${chalk.cyan('Duração:')} ${formatter.formatDuration(updatedSession.duration)}`);
}
