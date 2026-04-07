import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as exportService from '../services/exportService.js';
import { writePdfToFile } from '../exporters/pdfExporter.js';
import { getConfig } from '../../config/manager.js';

export default async function exportCommand(options) {
  const cfg = getConfig();
  const built = exportService.buildExport(options);

  if (built.filteredSessions.length === 0) {
    console.log(chalk.yellow('ℹ Nenhuma sessão encontrada para exportar.'));
    return;
  }

  const filePath = path.resolve(process.cwd(), built.filename);

  if (built.format === 'pdf') {
    await writePdfToFile(filePath, built.filteredSessions, options, cfg);
  } else {
    fs.writeFileSync(filePath, built.content);
  }

  console.log(chalk.green(`✔ Exportação concluída: ${chalk.bold(built.filename)}`));
  if (built.metadata) {
    console.log(chalk.gray(`Metadados: ${built.metadata.totalSessions} sessão(ões) | ${built.metadata.format.toUpperCase()}`));
  }
}
