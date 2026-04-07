import chalk from 'chalk';
import * as importService from '../services/importService.js';

export default function importCommand(filePath, options) {
  console.log(chalk.gray(`\n⌛ Importando dados de: ${filePath}...`));

  let result;
  if (options.source === 'csv' || options.source === 'toggl') {
    result = importService.importFromCsv(filePath, options);
  } else {
    result = importService.importFromJson(filePath, options);
  }

  if (result.importedCount === 0) {
    console.log(chalk.yellow('\n⚠ Nenhuma sessão nova foi importada.'));
    if (result.skippedCount > 0) {
      console.log(chalk.gray(`${result.skippedCount} sessões ignoradas por já existirem.`));
    }
    return;
  }

  console.log(chalk.green(`\n✔ Importação concluída com sucesso!`));
  console.log(`- Sessões importadas: ${chalk.cyan(result.importedCount)}`);
  if (result.skippedCount > 0) {
    console.log(`- Sessões ignoradas (duplicadas): ${chalk.gray(result.skippedCount)}`);
  }
}
