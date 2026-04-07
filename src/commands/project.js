import chalk from 'chalk';
import Table from 'cli-table3';
import * as projectService from '../services/projectService.js';
import * as clientService from '../services/clientService.js';
import * as budgetService from '../services/budgetService.js';
import * as formatter from '../utils/formatter.js';
import { getConfig } from '../../config/manager.js';

export function projectListCommand() {
  const projects = projectService.listProjects();
  const cfg = getConfig();

  if (projects.length === 0) {
    console.log(chalk.yellow('ℹ Nenhum projeto cadastrado.'));
    return;
  }

  const table = new Table({
    head: [chalk.cyan('Nome'), chalk.cyan('Valor/h'), chalk.cyan('Orçamento (h)'), chalk.cyan('Cliente')]
  });

  for (const p of projects) {
    const rate = p.hourlyRate !== null
      ? formatter.formatCurrency(p.hourlyRate, cfg.currency)
      : chalk.gray('-');
    const budget = p.budgetHours !== null ? `${p.budgetHours}h` : chalk.gray('-');
    const clientName = p.clientId
      ? (clientService.listClients().find(c => c.id === p.clientId)?.name || p.clientId)
      : chalk.gray('-');
    table.push([p.name, rate, budget, clientName]);
  }

  console.log(table.toString());
}

export function projectSetRateCommand(name, rate) {
  projectService.setProjectRate(name, rate);
  console.log(chalk.green(`✔ Valor/hora de "${name}" definido como ${rate}`));
}

export function projectSetBudgetCommand(name, options) {
  budgetService.setBudget(name, options.hours);
  console.log(chalk.green(`✔ Orçamento de "${name}" definido como ${options.hours}h`));
}

export function projectSetClientCommand(projectName, clientName) {
  const clients = clientService.listClients();
  const client = clients.find(c => c.name === clientName);
  if (!client) {
    console.log(chalk.red(`✖ Cliente não encontrado: ${clientName}`));
    process.exit(2);
  }
  projectService.setProjectClient(projectName, client.id);
  console.log(chalk.green(`✔ Projeto "${projectName}" vinculado ao cliente "${clientName}"`));
}

export function projectDeleteCommand(name) {
  projectService.deleteProject(name);
  console.log(chalk.green(`✔ Projeto "${name}" removido.`));
}
