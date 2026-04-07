#!/usr/bin/env node
import { program } from 'commander';
import startCommand from '../src/commands/start.js';
import stopCommand from '../src/commands/stop.js';
import pauseCommand from '../src/commands/pause.js';
import resumeCommand from '../src/commands/resume.js';
import statusCommand from '../src/commands/status.js';
import listCommand from '../src/commands/list.js';
import reportCommand from '../src/commands/report.js';
import exportCommand from '../src/commands/export.js';
import importCommand from '../src/commands/import.js';
import editCommand from '../src/commands/edit.js';
import deleteCommand from '../src/commands/delete.js';
import addCommand from '../src/commands/add.js';
import tagsAnalyzeCommand from '../src/commands/tags.js';
import dashboardCommand from '../src/commands/dashboard.js';
import webCommand from '../src/commands/web.js';
import syncCommand from '../src/commands/sync.js';
import { syncWithToggl } from '../src/services/togglService.js';
import { statsCommand, achievementsCommand } from '../src/commands/gamification.js';
import {
  configGetCommand,
  configSetCommand,
  configListCommand,
  configResetCommand,
  configPathCommand
} from '../src/commands/config.js';
import {
  projectListCommand,
  projectSetRateCommand,
  projectSetBudgetCommand,
  projectSetClientCommand,
  projectDeleteCommand
} from '../src/commands/project.js';
import {
  clientAddCommand,
  clientListCommand,
  clientDeleteCommand
} from '../src/commands/client.js';
import invoiceCommand from '../src/commands/invoice.js';
import {
  templateSaveCommand,
  templateListCommand,
  templateDeleteCommand,
  templateShowCommand
} from '../src/commands/template.js';
import completionCommand from '../src/commands/completion.js';
import uiCommand from '../src/commands/ui.js';
import {
  backupCreateCommand,
  backupRestoreCommand
} from '../src/commands/backup.js';
import { handleError } from '../src/errors/handler.js';
import { HELP_EXAMPLES } from '../src/constants/help.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

async function loadPlugins(prog) {
  const pluginDir = path.join(os.homedir(), '.ttrack', 'plugins');
  if (!fs.existsSync(pluginDir)) return;

  const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const pluginPath = path.join(pluginDir, file);
    try {
      const plugin = await import(pluginPath);
      if (typeof plugin.register === 'function') {
        plugin.register(prog, { wrapAction });
      }
    } catch (err) {
      console.error(`⚠ Falha ao carregar plugin ${file}: ${err.message}`);
    }
  }
}

program
  .name('ftt')
  .description('Time tracker para freelancers')
  .version('1.0.0')
  .option('--dry-run', 'Simula a operação sem persistir dados', () => {
    process.env.FTT_DRY_RUN = '1';
  });
program.addHelpText('after', HELP_EXAMPLES);

program
  .command('start <task>')
  .alias('s')
  .description('Inicia um novo timer')
  .option('-p, --project <name>', 'Nome do projeto')
  .option('-t, --tags <tags>', 'Tags separadas por vírgula')
  .option('-n, --notes <text>', 'Notas sobre a tarefa')
  .option('--billable', 'Sessão faturável (padrão)', true)
  .option('--no-billable', 'Sessão não faturável')
  .option('--hourly-rate <n>', 'Valor/hora (override do default)', v => Number(v))
  .option('--template <name>', 'Usar template de sessão')
  .option('--github-issue <n>', 'Vincular a issue do GitHub', v => Number(v))
  .action(wrapAction(startCommand));

program
  .command('stop')
  .alias('sp')
  .description('Para o timer ativo')
  .action(wrapAction(stopCommand));

program
  .command('pause')
  .alias('p')
  .description('Pausa o timer ativo')
  .action(wrapAction(pauseCommand));

program
  .command('resume')
  .alias('res')
  .description('Retoma o timer pausado')
  .action(wrapAction(resumeCommand));

program
  .command('status')
  .alias('st')
  .description('Mostra o timer atual em execução')
  .action(wrapAction(statusCommand));

program
  .command('list')
  .alias('l')
  .description('Lista as últimas sessões registradas')
  .option('-l, --limit <n>', 'Número máximo de sessões para exibir', parseInt)
  .option('-p, --project <name>', 'Filtrar por projeto')
  .option('-t, --tag <name>', 'Filtrar por tag')
  .option('--from <date>', 'A partir de (YYYY-MM-DD)')
  .option('--to <date>', 'Até (YYYY-MM-DD)')
  .action(wrapAction(listCommand));

program
  .command('add <task>')
  .alias('a')
  .description('Adiciona uma sessão manualmente')
  .option('--start <time>', 'Hora de início (HH:MM)')
  .option('--end <time>', 'Hora de término (HH:MM)')
  .option('--date <date>', 'Data (YYYY-MM-DD, padrão: hoje)')
  .option('-p, --project <name>', 'Nome do projeto')
  .option('-t, --tags <tags>', 'Tags separadas por vírgula')
  .option('-n, --notes <text>', 'Notas sobre a tarefa')
  .option('--billable', 'Sessão faturável (padrão)', true)
  .option('--no-billable', 'Sessão não faturável')
  .option('--hourly-rate <n>', 'Valor/hora', v => Number(v))
  .action(wrapAction(addCommand));

program
  .command('report')
  .alias('r')
  .description('Gera relatório de horas')
  .option('--today', 'Hoje')
  .option('--week', 'Esta semana')
  .option('--month', 'Este mês')
  .option('--from <date>', 'Data inicial (YYYY-MM-DD)')
  .option('--to <date>', 'Até (YYYY-MM-DD)')
  .option('-p, --project <name>', 'Filtrar por projeto')
  .option('-t, --tag <name>', 'Filtrar por tag')
  .option('--group-by <type>', 'Agrupar por (project, tag, day)')
  .option('--profitability', 'Relatório de lucratividade por projeto')
  .option('--heatmap', 'Heatmap de produtividade')
  .option('--efficiency', 'Análise de eficiência por horário')
  .option('--compare <period>', 'Comparar períodos (last-week, last-month)')
  .action(wrapAction(reportCommand));

program
  .command('export')
  .alias('ex')
  .description('Exporta os dados em formato JSON, CSV ou PDF')
  .option('--format <type>', 'Formato de exportação (json, csv ou pdf)', 'json')
  .option('--output <path>', 'Caminho do arquivo de saída')
  .option('-p, --project <name>', 'Filtrar por projeto')
  .option('-t, --tag <name>', 'Filtrar por tag')
  .option('--billable', 'Apenas sessões faturáveis')
  .option('--no-billable', 'Inclui sessões não faturáveis')
  .option('--with-meta', 'Inclui metadados no JSON exportado')
  .option('--today', 'Hoje')
  .option('--week', 'Esta semana')
  .option('--month', 'Este mês')
  .option('--from <date>', 'Data inicial (YYYY-MM-DD)')
  .option('--to <date>', 'Data final (YYYY-MM-DD)')
  .action(wrapAction(exportCommand));

program
  .command('import <file>')
  .alias('im')
  .description('Importa sessões de um arquivo JSON ou CSV')
  .option('--source <type>', 'Fonte dos dados (json, csv, toggl)', 'json')
  .action(wrapAction(importCommand));

program
  .command('edit <id>')
  .alias('e')
  .description('Edita uma sessão existente')
  .option('--task <name>', 'Nome da tarefa')
  .option('--project <name>', 'Nome do projeto')
  .option('--tags <tags>', 'Tags separadas por vírgula')
  .option('--notes <text>', 'Notas sobre a tarefa')
  .option('--start-time <date>', 'Data/hora inicial (ISO)')
  .option('--end-time <date>', 'Data/hora final (ISO)')
  .option('--hourly-rate <n>', 'Valor/hora', v => Number(v))
  .option('--billable', 'Sessão faturável', true)
  .option('--no-billable', 'Sessão não faturável')
  .action(wrapAction(editCommand));

program
  .command('delete <id>')
  .alias('d')
  .description('Remove uma sessão do histórico')
  .option('--force', 'Remove sem pedir confirmação')
  .action(wrapAction(deleteCommand));

program
  .command('invoice')
  .alias('inv')
  .description('Gera fatura em markdown, CSV ou PDF')
  .option('--client <name>', 'Filtrar por cliente')
  .option('--from <date>', 'Data inicial (YYYY-MM-DD)')
  .option('--to <date>', 'Data final (YYYY-MM-DD)')
  .option('--output <path>', 'Salvar em arquivo')
  .option('--format <type>', 'Formato de saida (markdown, csv, pdf)', 'markdown')
  .action(wrapAction(invoiceCommand));

program
  .command('ui')
  .alias('u')
  .description('TUI interativo com timer e metas')
  .action(wrapAction(uiCommand));

program
  .command('dashboard')
  .alias('dash')
  .description('Dashboard com gráficos de produtividade')
  .action(wrapAction(dashboardCommand));

program
  .command('stats')
  .description('Exibe estatísticas de uso e sequências (streaks)')
  .option('--streak', 'Focar na sequência atual')
  .action(wrapAction(statsCommand));

program
  .command('achievements')
  .description('Exibe conquistas desbloqueadas')
  .action(wrapAction(achievementsCommand));

program
  .command('completion')
  .description('Gera script de auto-completar para o shell')
  .option('--shell <name>', 'Shell alvo (bash, zsh, fish)', 'bash')
  .action(wrapAction(completionCommand));

program
  .command('web')
  .description('API REST local para integrações')
  .option('--start-server', 'Inicia o servidor')
  .option('--port <n>', 'Porta do servidor (padrão: 3000)', v => Number(v))
  .action(wrapAction(webCommand));

program
  .command('sync')
  .description('Sincronização e exportação para Cloud/Calendar')
  .option('--provider <name>', 'Provedor de sync (google-calendar, ics, toggl)')
  .option('--token <token>', 'API Token do Toggl')
  .action(wrapAction(async (options) => {
    if (options.provider === 'toggl') {
      await syncWithToggl(options);
    } else {
      syncCommand(options);
    }
  }));

// Tags group
const tagsCmd = program.command('tags').alias('t').description('Gerencia e analisa tags');
tagsCmd.command('analyze').description('Mostra padrões de tempo por tag').action(wrapAction(tagsAnalyzeCommand));

// Config group
const configCmd = program.command('config').description('Gerencia preferências do usuário');
configCmd.command('list').description('Lista toda a config').action(wrapAction(configListCommand));
configCmd.command('get [key]').description('Lê uma chave ou a config inteira').action(wrapAction(configGetCommand));
configCmd.command('set <key> <value>').description('Define uma chave').action(wrapAction(configSetCommand));
configCmd.command('reset').description('Reseta para o padrão').action(wrapAction(configResetCommand));
configCmd.command('path').description('Mostra onde ficam config e dados').action(wrapAction(configPathCommand));

// Project group
const projectCmd = program.command('project').description('Gerencia projetos');
projectCmd.command('list').description('Lista projetos').action(wrapAction(projectListCommand));
projectCmd.command('set-rate <name> <rate>').description('Define valor/hora do projeto').action(wrapAction(projectSetRateCommand));
projectCmd
  .command('set-budget <name>')
  .description('Define orçamento em horas do projeto')
  .option('--hours <n>', 'Total de horas orçadas', v => Number(v))
  .action(wrapAction(projectSetBudgetCommand));
projectCmd.command('set-client <project> <client>').description('Vincula projeto a um cliente').action(wrapAction(projectSetClientCommand));
projectCmd.command('delete <name>').description('Remove projeto').action(wrapAction(projectDeleteCommand));

// Client group
const clientCmd = program.command('client').description('Gerencia clientes');
clientCmd.command('add <name>').description('Adiciona cliente').action(wrapAction(clientAddCommand));
clientCmd.command('list').description('Lista clientes').action(wrapAction(clientListCommand));
clientCmd.command('delete <name>').description('Remove cliente').action(wrapAction(clientDeleteCommand));

// Backup group
const backupCmd = program.command('backup').description('Backup e restauracao de dados');
backupCmd
  .command('create')
  .description('Cria backup completo do app')
  .option('--output <path>', 'Caminho do arquivo de backup')
  .action(wrapAction(backupCreateCommand));
backupCmd
  .command('restore')
  .description('Restaura dados de um backup')
  .option('--file <path>', 'Arquivo de backup (.json)')
  .action(wrapAction(backupRestoreCommand));

// Template group
const templateCmd = program.command('template').description('Gerencia templates de sessão');
templateCmd
  .command('save <name>')
  .description('Salva template de sessão atual')
  .option('--task <name>', 'Nome da tarefa')
  .option('-p, --project <name>', 'Projeto')
  .option('-t, --tags <tags>', 'Tags')
  .option('-n, --notes <text>', 'Notas')
  .option('--billable', 'Faturável', true)
  .option('--no-billable', 'Não faturável')
  .option('--hourly-rate <n>', 'Valor/hora', v => Number(v))
  .action(wrapAction(templateSaveCommand));
templateCmd.command('list').description('Lista templates').action(wrapAction(templateListCommand));
templateCmd.command('show <name>').description('Exibe detalhes de um template').action(wrapAction(templateShowCommand));
templateCmd.command('delete <name>').description('Remove template').action(wrapAction(templateDeleteCommand));

// Load plugins, then parse
await loadPlugins(program);
program.parse();
