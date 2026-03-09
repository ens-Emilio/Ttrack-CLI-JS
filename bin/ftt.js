#!/usr/bin/env node
import { program } from 'commander';
import startCommand from '../src/commands/start.js';
import stopCommand from '../src/commands/stop.js';
import statusCommand from '../src/commands/status.js';
import listCommand from '../src/commands/list.js';
import reportCommand from '../src/commands/report.js';
import exportCommand from '../src/commands/export.js';

program
  .name('ftt')
  .description('Time tracker para freelancers')
  .version('1.0.0');

program
  .command('start <task>')
  .description('Inicia um novo timer')
  .option('-p, --project <name>', 'Nome do projeto')
  .option('-t, --tags <tags>', 'Tags separadas por vírgula')
  .action(startCommand);

program
  .command('stop')
  .description('Para o timer ativo')
  .action(stopCommand);

program
  .command('status')
  .description('Mostra o timer atual em execução')
  .action(statusCommand);

program
  .command('list')
  .description('Lista as últimas sessões registradas')
  .option('-l, --limit <n>', 'Número máximo de sessões para exibir', parseInt)
  .action(listCommand);

program
  .command('report')
  .description('Gera relatório de horas')
  .option('--today', 'Hoje')
  .option('--week', 'Esta semana')
  .option('--month', 'Este mês')
  .option('--from <date>', 'Data inicial (YYYY-MM-DD)')
  .option('--to <date>', 'Data final (YYYY-MM-DD)')
  .action(reportCommand);

program
  .command('export')
  .description('Exporta os dados em formato JSON ou CSV')
  .option('--format <type>', 'Formato de exportação (json ou csv)', 'json')
  .option('--today', 'Hoje')
  .option('--week', 'Esta semana')
  .option('--month', 'Este mês')
  .option('--from <date>', 'Data inicial (YYYY-MM-DD)')
  .option('--to <date>', 'Data final (YYYY-MM-DD)')
  .action(exportCommand);

program.parse();
