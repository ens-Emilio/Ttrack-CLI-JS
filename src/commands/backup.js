import chalk from 'chalk';
import * as backupService from '../services/backupService.js';

export async function backupCreateCommand(options) {
  const result = backupService.createBackup(options.output);
  const kb = (result.size / 1024).toFixed(1);
  console.log(chalk.green(`Backup criado: ${chalk.bold(result.file)}`));
  console.log(chalk.gray(`Tamanho: ${kb} KB`));
}

export async function backupRestoreCommand(options) {
  if (!options.file) {
    console.log(chalk.yellow('Use: ftt backup restore --file <caminho>'));
    return;
  }
  const result = backupService.restoreBackup(options.file);
  console.log(chalk.green(`Backup restaurado com sucesso!`));
  console.log(chalk.gray(`  Versao do backup: ${result.version}`));
  console.log(chalk.gray(`  Exportado em: ${result.exportedAt}`));
  console.log(chalk.gray(`  Schema: v${result.schemaVersion}`));
  console.log(chalk.gray(`  Arquivos restaurados: ${result.restored.join(', ')}`));
}
