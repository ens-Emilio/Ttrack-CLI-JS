import chalk from 'chalk';
import Table from 'cli-table3';
import * as clientService from '../services/clientService.js';

export function clientAddCommand(name) {
  const client = clientService.addClient(name);
  console.log(chalk.green(`✔ Cliente "${client.name}" adicionado (ID: ${client.id})`));
}

export function clientListCommand() {
  const clients = clientService.listClients();

  if (clients.length === 0) {
    console.log(chalk.yellow('ℹ Nenhum cliente cadastrado.'));
    return;
  }

  const table = new Table({
    head: [chalk.cyan('ID'), chalk.cyan('Nome')]
  });

  for (const c of clients) {
    table.push([c.id.split('-')[0], c.name]);
  }

  console.log(table.toString());
}

export function clientDeleteCommand(name) {
  clientService.deleteClient(name);
  console.log(chalk.green(`✔ Cliente "${name}" removido.`));
}
