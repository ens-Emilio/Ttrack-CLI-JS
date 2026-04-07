import chalk from 'chalk';
import Table from 'cli-table3';
import * as formatter from '../utils/formatter.js';
import { getConfig } from '../../config/manager.js';
import * as templateService from '../services/templateService.js';

export function templateSaveCommand(name, options) {
  const template = templateService.saveTemplate(name, options);
  console.log(chalk.green(`✔ Template "${template.name}" salvo.`));
  if (template.project) console.log(chalk.blue(`  Projeto: ${template.project}`));
  if (template.tags.length) console.log(chalk.blue(`  Tags: ${template.tags.join(', ')}`));
  if (template.hourlyRate !== null) {
    const cfg = getConfig();
    console.log(chalk.blue(`  Valor/hora: ${formatter.formatCurrency(template.hourlyRate, cfg.currency)}`));
  }
}

export function templateListCommand() {
  const templates = templateService.listTemplates();

  if (templates.length === 0) {
    console.log(chalk.yellow('ℹ Nenhum template salvo.'));
    return;
  }

  const table = new Table({
    head: [chalk.cyan('Nome'), chalk.cyan('Tarefa'), chalk.cyan('Projeto'), chalk.cyan('Tags'), chalk.cyan('Valor/h'), chalk.cyan('$')]
  });

  const cfg = getConfig();
  for (const t of templates) {
    table.push([
      t.name,
      t.task,
      t.project || '-',
      t.tags?.join(', ') || '-',
      t.hourlyRate !== null ? formatter.formatCurrency(t.hourlyRate, cfg.currency) : chalk.gray('-'),
      t.billable !== false ? chalk.green('$') : chalk.gray('-')
    ]);
  }

  console.log(table.toString());
}

export function templateDeleteCommand(name) {
  templateService.deleteTemplate(name);
  console.log(chalk.green(`✔ Template "${name}" removido.`));
}

export function templateShowCommand(name) {
  const template = templateService.loadTemplate(name);
  console.log(`\n${chalk.bold.cyan(`Template: ${template.name}`)}`);
  console.log(chalk.gray('----------------------------'));
  console.log(`${chalk.cyan('Tarefa:')}  ${template.task}`);
  if (template.project) console.log(`${chalk.cyan('Projeto:')} ${template.project}`);
  if (template.tags?.length) console.log(`${chalk.cyan('Tags:')}    ${template.tags.join(', ')}`);
  if (template.notes) console.log(`${chalk.cyan('Notas:')}   ${template.notes}`);
  if (template.hourlyRate !== null) {
    const cfg = getConfig();
    console.log(`${chalk.cyan('Valor/hora:')} ${formatter.formatCurrency(template.hourlyRate, cfg.currency)}`);
  }
  console.log(`${chalk.cyan('Faturável:')} ${template.billable !== false ? chalk.green('Sim') : chalk.gray('Não')}`);
}
