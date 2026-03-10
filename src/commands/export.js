import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as exportService from '../services/exportService.js';

export default function exportCommand(options) {
  const built = exportService.buildExport(options);

  if (built.filteredSessions.length === 0) {
    console.log(chalk.yellow('ℹ Nenhuma sessão encontrada para exportar.'));
    return;
  }

  const filePath = path.resolve(process.cwd(), built.filename);

  fs.writeFileSync(filePath, built.content);
  console.log(chalk.green(`✔ Exportação concluída: ${chalk.bold(built.filename)}`));
}
