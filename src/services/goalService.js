import chalk from 'chalk';
import { isToday, isThisWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getConfig } from '../../config/manager.js';
import { sessionRepository } from '../core/repositories/sessionRepository.js';

/**
 * Calcula o progresso das metas.
 */
export function getGoalProgress() {
  const cfg = getConfig();
  const sessions = sessionRepository.getAll();
  const active = sessionRepository.getActive();
  
  const allSessions = [...sessions];
  if (active) allSessions.push(active);

  let dailyDuration = 0;
  let weeklyDuration = 0;

  allSessions.forEach(s => {
    const start = parseISO(s.startTime);
    const duration = s.duration || 0;

    if (isToday(start)) dailyDuration += duration;
    if (isThisWeek(start, { locale: ptBR })) weeklyDuration += duration;
  });

  return {
    daily: {
      goal: cfg.dailyGoal,
      current: dailyDuration / 3600000, // em horas
      percent: cfg.dailyGoal > 0 ? (dailyDuration / 3600000 / cfg.dailyGoal) * 100 : 0
    },
    weekly: {
      goal: cfg.weeklyGoal,
      current: weeklyDuration / 3600000,
      percent: cfg.weeklyGoal > 0 ? (weeklyDuration / 3600000 / cfg.weeklyGoal) * 100 : 0
    }
  };
}

/**
 * Gera uma barra de progresso em texto colorido.
 */
export function getProgressBar(percent, length = 20) {
  const filledLength = Math.min(length, Math.round((percent / 100) * length));
  const emptyLength = length - filledLength;

  const filled = chalk.green('█'.repeat(filledLength));
  const empty = chalk.gray('░'.repeat(emptyLength));
  
  const color = percent >= 100 ? chalk.bold.green : percent >= 80 ? chalk.yellow : chalk.cyan;
  
  return `${filled}${empty} ${color(percent.toFixed(1) + '%')}`;
}
