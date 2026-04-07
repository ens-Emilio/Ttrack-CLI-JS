import chalk from 'chalk';
import inquirer from 'inquirer';
import * as sessionService from '../services/sessionService.js';

export default async function deleteCommand(id, options) {
  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Tem certeza que deseja remover a sessão ${chalk.bold(id)}?`,
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.gray('Operação cancelada.'));
      return;
    }
  }

  sessionService.deleteSession(id);
  console.log(chalk.green(`\n✔ Sessão ${chalk.bold(id)} removida com sucesso.`));
}
