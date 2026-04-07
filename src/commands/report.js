import chalk from 'chalk';
import Table from 'cli-table3';
import * as reportService from '../services/reportService.js';
import * as budgetService from '../services/budgetService.js';
import * as aiService from '../services/aiService.js';
import * as formatter from '../utils/formatter.js';
import { getConfig } from '../../config/manager.js';

const HEATMAP_CHARS = [
  chalk.gray('·'),
  chalk.green('▁'),
  chalk.yellow('▃'),
  chalk.red('▆'),
  chalk.bold.red('█')
];

function printSummary(summary) {
  console.log(`\n${chalk.bold.cyan('Resumo rápido')}`);
  console.log(chalk.gray('----------------------------------------'));
  console.log(`- Dias ativos: ${chalk.cyan(summary.uniqueDays)}`);
  console.log(`- Sessões: ${chalk.cyan(summary.sessionCount)}`);
  console.log(`- Média por sessão: ${chalk.green(summary.averageSessionDurationStr)}`);
  console.log(`- Faturável: ${chalk.green(summary.billableShareStr)}`);
  console.log(`- Ganhos estimados: ${chalk.bold.green(summary.totalEarningsStr)}`);
  console.log(`- Meta diária: ${summary.progress.daily.current.toFixed(1)}/${summary.progress.daily.goal}h (${summary.progress.daily.percent.toFixed(0)}%)`);
  console.log(`- Meta semanal: ${summary.progress.weekly.current.toFixed(1)}/${summary.progress.weekly.goal}h (${summary.progress.weekly.percent.toFixed(0)}%)`);
  if (summary.budget) {
    const color = summary.budget.exceeded ? chalk.red : summary.budget.warning ? chalk.yellow : chalk.green;
    console.log(`- Orçamento: ${color(`${summary.budget.usedHours.toFixed(1)}h / ${summary.budget.budgetHours}h (${summary.budget.percent.toFixed(0)}%)`)}`);
  }
}

export default function reportCommand(options) {
  const cfg = getConfig();

  // Efficiency report
  if (options.efficiency) {
    const stats = aiService.analyzeEfficiency();
    console.log(`\n${chalk.bold.cyan('⚡ ANÁLISE DE EFICIÊNCIA (POR HORA DO DIA)')}`);
    console.log(chalk.gray('----------------------------------------'));
    const t = new Table({
      head: [chalk.cyan('Hora'), chalk.cyan('Sessões'), chalk.cyan('Tempo Total'), chalk.cyan('Média')]
    });
    stats.forEach(s => {
      if (s.count > 0) {
        t.push([
          `${s.hour.toString().padStart(2, '0')}:00`,
          s.count,
          formatter.formatMsToDuration(s.duration),
          formatter.formatMsToDuration(s.avgDuration)
        ]);
      }
    });
    console.log(t.toString());
    const peakHour = [...stats].sort((a, b) => b.duration - a.duration)[0];
    if (peakHour && peakHour.duration > 0) {
      console.log(chalk.gray(`\n💡 Dica: Seu horário de maior produtividade é às ${chalk.bold(peakHour.hour + ':00')}.`));
    }
    return;
  }

  // Profitability report
  if (options.profitability) {
    const summary = reportService.generateDashboardSummary(options);
    const rows = reportService.generateProfitabilityReport(options);
    if (rows.length === 0) {
      console.log(chalk.yellow('\nℹ Nenhum dado para relatório de lucratividade.'));
      return;
    }
    console.log(`\n${chalk.bold.cyan('💰 RELATÓRIO DE LUCRATIVIDADE')}`);
    console.log(chalk.gray('----------------------------------------'));
    printSummary(summary);
    const t = new Table({
      head: [chalk.cyan('Projeto'), chalk.cyan('Total h'), chalk.cyan('Faturável h'), chalk.cyan('Receita'), chalk.cyan('Sessões')]
    });
    rows.forEach(r => t.push([r.project, r.totalHours, r.billableHours, r.earningsStr, r.sessionCount]));
    console.log(t.toString());
    return;
  }

  // Heatmap
  if (options.heatmap) {
    const summary = reportService.generateDashboardSummary(options);
    const days = reportService.generateHeatmap(options);
    console.log(`\n${chalk.bold.cyan('🔥 HEATMAP DE PRODUTIVIDADE')}`);
    console.log(chalk.gray('----------------------------------------'));
    printSummary(summary);
    // Render week rows
    let weekDays = [];
    for (const d of days) {
      const char = HEATMAP_CHARS[d.tier];
      weekDays.push(`${char} `);
      if (weekDays.length === 7) {
        console.log(weekDays.join(''));
        weekDays = [];
      }
    }
    if (weekDays.length) console.log(weekDays.join(''));
    console.log(chalk.gray('· =sem  ▁=baixo  ▃=médio  ▆=alto  █=intenso'));
    return;
  }

  // Period comparison
  if (options.compare) {
    const { current, previous, currentFrom, currentTo, previousFrom, previousTo } = reportService.generateComparison(options.compare);
    console.log(`\n${chalk.bold.cyan('📈 COMPARAÇÃO DE PERÍODOS')}`);
    console.log(chalk.gray('----------------------------------------'));
    const t = new Table({
      head: [chalk.cyan('Período'), chalk.cyan('Sessões'), chalk.cyan('Duração'), chalk.cyan('Ganhos')]
    });
    t.push([`${previousFrom} → ${previousTo}`, previous.sessionCount, previous.totalDurationStr, previous.totalEarningsStr]);
    t.push([`${currentFrom} → ${currentTo} (atual)`, current.sessionCount, current.totalDurationStr, current.totalEarningsStr]);
    console.log(t.toString());
    return;
  }

  // Default report
  const report = reportService.generateDashboardSummary(options);

  if (report.sessionCount === 0) {
    console.log(chalk.yellow('\nℹ Nenhuma sessão encontrada para este relatório.'));
    return;
  }

  console.log(`\n${chalk.bold.cyan('📊 RELATÓRIO DE ATIVIDADES')}`);
  console.log(chalk.gray('----------------------------------------'));
  printSummary(report);

  if (Object.keys(report.groups).length > 0) {
    const groupTable = new Table({
      head: [
        chalk.cyan(options.groupBy === 'project' ? 'Projeto' : options.groupBy === 'tag' ? 'Tag' : 'Dia'),
        chalk.cyan('Sessões'),
        chalk.cyan('Duração'),
        chalk.cyan('Ganhos')
      ]
    });

    const sortedGroups = Object.entries(report.groups).sort(([a], [b]) => a.localeCompare(b));
    for (const [key, data] of sortedGroups) {
      groupTable.push([
        key,
        data.count,
        formatter.formatMsToDuration(data.duration),
        formatter.formatCurrency(data.earnings, cfg.currency)
      ]);
    }
    console.log(groupTable.toString());
  }

  console.log(`\n${chalk.bold('Totais:')}`);
  console.log(`- Sessões: ${chalk.cyan(report.sessionCount)}`);
  console.log(`- Duração Total: ${chalk.green(report.totalDurationStr)}`);
  console.log(`- Faturável: ${chalk.green(report.billableDurationStr)}`);
  console.log(`- Não Faturável: ${chalk.yellow(report.nonBillableDurationStr)}`);
  console.log(`- Ganhos Estimados: ${chalk.bold.green(report.totalEarningsStr)}`);

  // Budget status when filtering by project
  if (options.project) {
    const budget = budgetService.getProjectBudgetStatus(options.project);
    if (budget) {
      const color = budget.exceeded ? chalk.red : budget.warning ? chalk.yellow : chalk.green;
      console.log(`\n${chalk.bold('Orçamento:')} ${color(`${budget.usedHours.toFixed(1)}h / ${budget.budgetHours}h (${budget.percent.toFixed(0)}%)`)}`);
    }
  }
}
