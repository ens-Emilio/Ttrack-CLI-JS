#!/usr/bin/env node
import { program } from 'commander';
import startCommand from '../src/commands/start.js';
import stopCommand from '../src/commands/stop.js';
import statusCommand from '../src/commands/status.js';
import listCommand from '../src/commands/list.js';
import reportCommand from '../src/commands/report.js';
import exportCommand from '../src/commands/export.js';
import {
  configGetCommand,
  configSetCommand,
  configListCommand,
  configResetCommand,
  configPathCommand
} from '../src/commands/config.js';
import { handleError } from '../src/errors/handler.js';

function wrapAction(fn) {
  return (...args) => {
    try {
      const res = fn(...args);
      if (res && typeof res.then === 'function') {
        return res.catch(handleError);
      }
      return res;
    } catch (err) {
      handleError(err);
    }
  };
}

program
  .name('ftt')
  .description('Time tracker para freelancers')
  .version('1.0.0');

program
  .command('start <task>')
  .description('Inicia um novo timer')
  .option('-p, --project <name>', 'Nome do projeto')
  .option('-t, --tags <tags>', 'Tags separadas por vírgula')
  .option('--hourly-rate <n>', 'Valor/hora (override do default)', v => Number(v))
  .action(wrapAction(startCommand));

program
  .command('stop')
  .description('Para o timer ativo')
  .action(wrapAction(stopCommand));

program
  .command('status')
  .description('Mostra o timer atual em execução')
  .action(wrapAction(statusCommand));

program
  .command('list')
  .description('Lista as últimas sessões registradas')
  .option('-l, --limit <n>', 'Número máximo de sessões para exibir', parseInt)
  .action(wrapAction(listCommand));

program
  .command('report')
  .description('Gera relatório de horas')
  .option('--today', 'Hoje')
  .option('--week', 'Esta semana')
  .option('--month', 'Este mês')
  .option('--from <date>', 'Data inicial (YYYY-MM-DD)')
  .option('--to <date>', 'Data final (YYYY-MM-DD)')
  .action(wrapAction(reportCommand));

program
  .command('export')
  .description('Exporta os dados em formato JSON ou CSV')
  .option('--format <type>', 'Formato de exportação (json ou csv)', 'json')
  .option('--today', 'Hoje')
  .option('--week', 'Esta semana')
  .option('--month', 'Este mês')
  .option('--from <date>', 'Data inicial (YYYY-MM-DD)')
  .option('--to <date>', 'Data final (YYYY-MM-DD)')
  .action(wrapAction(exportCommand));

const configCmd = program.command('config').description('Gerencia preferências do usuário');

configCmd.command('list').description('Lista toda a config').action(wrapAction(configListCommand));
configCmd.command('get [key]').description('Lê uma chave ou a config inteira').action(wrapAction(configGetCommand));
configCmd.command('set <key> <value>').description('Define uma chave').action(wrapAction(configSetCommand));
configCmd.command('reset').description('Reseta para o padrão').action(wrapAction(configResetCommand));
configCmd.command('path').description('Mostra onde ficam config e dados').action(wrapAction(configPathCommand));

program.parse();
