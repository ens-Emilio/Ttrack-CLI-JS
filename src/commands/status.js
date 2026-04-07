import chalk from 'chalk';
import * as timerService from '../services/timerService.js';
import * as formatter from '../utils/formatter.js';
import * as calculator from '../core/calculator.js';
import * as goalService from '../services/goalService.js';
import * as reportService from '../services/reportService.js';
import * as budgetService from '../services/budgetService.js';
import { getConfig } from '../../config/manager.js';

export default function statusCommand() {
  const cfg = getConfig();
  const session = timerService.getActiveSession();
  const progress = goalService.getGoalProgress();
  const todaySummary = reportService.generateDashboardSummary({ today: true });
  const weekSummary = reportService.generateDashboardSummary({ week: true });
  const budget = session?.project ? budgetService.getProjectBudgetStatus(session.project) : null;

  if (!session) {
    console.log(chalk.yellow('\nℹ Nenhum timer em execução no momento.'));
    console.log(`${chalk.bold('Hoje:')} ${todaySummary.totalDurationStr} | ${todaySummary.totalEarningsStr}`);
    console.log(`${chalk.bold('Semana:')} ${weekSummary.totalDurationStr} | ${weekSummary.totalEarningsStr}`);
    if (cfg.dailyGoal > 0) console.log(`${chalk.bold('Meta Diária:')} ${goalService.getProgressBar(progress.daily.percent)}`);
    if (cfg.weeklyGoal > 0) console.log(`${chalk.bold('Meta Semanal:')} ${goalService.getProgressBar(progress.weekly.percent)}`);
    return;
  }

  const durationMs = calculator.calculateTotalDuration(session);
  const durationStr = formatter.formatMsToDuration(durationMs);
  const startTimeStr = formatter.formatDateTime(session.startTime, cfg);

  console.log(`\n${chalk.bold.cyan('⏱️  TIMER EM EXECUÇÃO')}`);
  console.log(chalk.gray('----------------------------------------'));
  console.log(`${chalk.cyan('Tarefa:')}    ${chalk.bold(session.task)}`);
  if (session.project) {
    console.log(`${chalk.cyan('Projeto:')}   ${session.project}`);
  }
  if (session.tags?.length) {
    console.log(`${chalk.cyan('Tags:')}      ${session.tags.join(', ')}`);
  }
  const billableStr = session.billable !== false ? chalk.green('Sim') : chalk.gray('Não');
  console.log(`${chalk.cyan('Faturável:')} ${billableStr}`);
  if (session.isPaused) {
    console.log(`${chalk.yellow('Status:')}    PAUSADO`);
  }
  console.log(`${chalk.cyan('Início:')}    ${startTimeStr}`);
  console.log(`${chalk.cyan('Duração:')}   ${durationStr}`);

  console.log(`\n${chalk.bold('Resumo:')}`);
  console.log(`- Hoje: ${todaySummary.totalDurationStr} | ${todaySummary.totalEarningsStr}`);
  console.log(`- Semana: ${weekSummary.totalDurationStr} | ${weekSummary.totalEarningsStr}`);

  if (cfg.dailyGoal > 0) {
    console.log(`\n${chalk.bold('Meta Diária:')} ${goalService.getProgressBar(progress.daily.percent)}`);
    if (progress.daily.percent >= 100) {
      console.log(chalk.green('🎉 Meta batida! Bom trabalho.'));
    }
  }
  if (cfg.weeklyGoal > 0) {
    console.log(`${chalk.bold('Meta Semanal:')} ${goalService.getProgressBar(progress.weekly.percent)}`);
  }
  if (budget) {
    const color = budget.exceeded ? chalk.red : budget.warning ? chalk.yellow : chalk.green;
    console.log(`${chalk.bold('Orçamento:')} ${color(`${budget.usedHours.toFixed(1)}h / ${budget.budgetHours}h (${budget.percent.toFixed(0)}%)`)}`);
  }
}
