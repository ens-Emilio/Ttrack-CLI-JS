import chalk from 'chalk';
import asciichart from 'asciichart';
import { subDays, eachDayOfInterval, format, parseISO } from 'date-fns';
import { generateDashboardSummary } from '../services/reportService.js';
import { getGoalProgress, getProgressBar } from '../services/goalService.js';
import { getSessions } from '../services/timerService.js';

export default function dashboardCommand(options) {
  const todaySummary = generateDashboardSummary({ today: true });
  const weekSummary = generateDashboardSummary({ week: true });
  const progress = getGoalProgress();

  console.log(chalk.bold.cyan('\n🚀 Dashboard de Produtividade\n'));

  console.log(`${chalk.bold('Hoje:')} ${todaySummary.totalDurationStr} | Receita: ${todaySummary.totalEarningsStr}`);
  console.log(`${chalk.bold('Meta Diária:')}   ${getProgressBar(progress.daily.percent)} ${Math.round(progress.daily.percent)}%`);
  console.log(`${chalk.bold('Semana:')} ${weekSummary.totalDurationStr} | Receita: ${weekSummary.totalEarningsStr}`);
  console.log(`${chalk.bold('Meta Semanal:')}  ${getProgressBar(progress.weekly.percent)} ${Math.round(progress.weekly.percent)}%\n`);

  const sessions = getSessions();
  const dayMap = {};
  sessions.forEach(s => {
    if (!s.startTime) return;
    const d = format(parseISO(s.startTime), 'yyyy-MM-dd');
    dayMap[d] = (dayMap[d] || 0) + (s.duration || 0);
  });

  const now = new Date();
  const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
  
  const data = days.map(d => {
    const key = format(d, 'yyyy-MM-dd');
    return (dayMap[key] || 0) / 3600000;
  });

  console.log(chalk.bold('Horas Trabalhadas (Últimos 14 dias):'));
  if (data.some(h => h > 0)) {
    console.log(chalk.cyan(asciichart.plot(data, { height: 10 })));
    const labels = days.map(d => format(d, 'dd/MM'));
    console.log(chalk.gray(`\n  De ${labels[0]} até ${labels[labels.length - 1]}`));
  } else {
    console.log(chalk.yellow('Nenhuma hora registrada nos últimos 14 dias.'));
  }
  console.log('');
}
