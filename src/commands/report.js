import chalk from 'chalk';
import Table from 'cli-table3';
import * as reportService from '../services/reportService.js';

export default function reportCommand(options) {
  const report = reportService.generateReport(options);

  if (report.rows.length === 0) {
    console.log(chalk.yellow(`ℹ Nenhuma sessão encontrada para: ${report.periodLabel}`));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan('Data'),
      chalk.cyan('Tarefa'),
      chalk.cyan('Projeto'),
      chalk.cyan('Duração')
    ]
  });

  report.rows.forEach(r => {
    table.push([r.date, r.task, r.project, r.duration]);
  });

  console.log(chalk.bold(`\nRelatório: ${report.periodLabel}`));
  console.log(table.toString());
  console.log(chalk.green(`\nTotal: ${chalk.bold(report.totalDurationStr)}\n`));
}
