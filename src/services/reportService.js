import { parseISO, format, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getConfig } from '../../config/manager.js';
import * as timerService from './timerService.js';
import * as goalService from './goalService.js';
import * as budgetService from './budgetService.js';
import * as formatter from '../utils/formatter.js';
import { filterSessions } from './filterService.js';

function buildFilters(options = {}) {
  const filters = { ...options };
  if (options.today) filters.from = filters.to = format(new Date(), 'yyyy-MM-dd');
  return filters;
}

export function getFilteredSessions(options = {}) {
  const allSessions = timerService.getSessions();
  return filterSessions(allSessions, buildFilters(options));
}

/**
 * Gera um relatório consolidado com agrupamentos opcionais.
 */
export function generateReport(options = {}) {
  const cfg = getConfig();
  const sessions = getFilteredSessions(options);

  const stats = {
    totalDuration: 0,
    totalEarnings: 0,
    billableDuration: 0,
    nonBillableDuration: 0,
    sessionCount: sessions.length,
    groups: {}
  };

  const groupBy = options.groupBy || null; // 'project', 'tag', 'day'

  sessions.forEach(s => {
    const duration = s.duration || 0;
    const earnings = s.billable ? (duration / 3600000) * (s.hourlyRate || cfg.hourlyRate) : 0;

    stats.totalDuration += duration;
    stats.totalEarnings += earnings;
    
    if (s.billable) {
      stats.billableDuration += duration;
    } else {
      stats.nonBillableDuration += duration;
    }

    // Agrupamento
    if (groupBy) {
      let groupKey = 'Outros';
      if (groupBy === 'project') groupKey = s.project || 'Sem Projeto';
      else if (groupBy === 'tag') groupKey = s.tags?.[0] || 'Sem Tag';
      else if (groupBy === 'day') groupKey = format(parseISO(s.startTime), 'yyyy-MM-dd');

      if (!stats.groups[groupKey]) {
        stats.groups[groupKey] = { duration: 0, earnings: 0, count: 0 };
      }
      stats.groups[groupKey].duration += duration;
      stats.groups[groupKey].earnings += earnings;
      stats.groups[groupKey].count++;
    }
  });

  return {
    ...stats,
    totalDurationStr: formatter.formatMsToDuration(stats.totalDuration),
    billableDurationStr: formatter.formatMsToDuration(stats.billableDuration),
    nonBillableDurationStr: formatter.formatMsToDuration(stats.nonBillableDuration),
    totalEarningsStr: formatter.formatCurrency(stats.totalEarnings, cfg.currency)
  };
}

/**
 * Resumo de produtividade reutilizável para report, status e UI.
 */
export function generateDashboardSummary(options = {}) {
  const cfg = getConfig();
  const report = generateReport(options);
  const sessions = getFilteredSessions(options);
  const progress = goalService.getGoalProgress();
  const budget = options.project ? budgetService.getProjectBudgetStatus(options.project) : null;

  const uniqueDays = new Set(
    sessions.map(session => format(parseISO(session.startTime), 'yyyy-MM-dd'))
  ).size;

  const averageSessionDuration = report.sessionCount > 0
    ? report.totalDuration / report.sessionCount
    : 0;
  const billableShare = report.totalDuration > 0
    ? (report.billableDuration / report.totalDuration) * 100
    : 0;

  return {
    ...report,
    uniqueDays,
    averageSessionDuration,
    averageSessionDurationStr: formatter.formatMsToDuration(averageSessionDuration),
    billableShare,
    billableShareStr: `${billableShare.toFixed(1)}%`,
    progress,
    budget,
    currency: cfg.currency
  };
}

/**
 * Relatório de lucratividade: agrupa por projeto, calcula horas e receita.
 */
export function generateProfitabilityReport(options = {}) {
  const cfg = getConfig();
  const allSessions = timerService.getSessions();
  const sessions = filterSessions(allSessions, options);

  const projects = {};
  for (const s of sessions) {
    const key = s.project || 'Sem Projeto';
    if (!projects[key]) {
      projects[key] = { totalMs: 0, billableMs: 0, earnings: 0, sessionCount: 0 };
    }
    const duration = s.duration || 0;
    const rate = s.hourlyRate || cfg.hourlyRate || 0;
    const earnings = s.billable ? (duration / 3600000) * rate : 0;
    projects[key].totalMs += duration;
    if (s.billable) projects[key].billableMs += duration;
    projects[key].earnings += earnings;
    projects[key].sessionCount++;
  }

  return Object.entries(projects).map(([name, data]) => ({
    project: name,
    totalHours: (data.totalMs / 3600000).toFixed(2),
    billableHours: (data.billableMs / 3600000).toFixed(2),
    earnings: data.earnings,
    earningsStr: formatter.formatCurrency(data.earnings, cfg.currency),
    sessionCount: data.sessionCount
  }));
}

/**
 * Heatmap de produtividade: agrupa sessões por dia, retorna tiers de intensidade.
 * Tier: 0=sem, 1=baixo(<2h), 2=médio(<4h), 3=alto(<6h), 4=intenso(>=6h)
 */
export function generateHeatmap(options = {}) {
  const allSessions = timerService.getSessions();
  const sessions = filterSessions(allSessions, options);

  const dayMap = {};
  for (const s of sessions) {
    const day = format(parseISO(s.startTime), 'yyyy-MM-dd');
    dayMap[day] = (dayMap[day] || 0) + (s.duration || 0);
  }

  // Build ordered day list for the current month (or filtered period)
  const now = new Date();
  const from = options.from ? parseISO(options.from) : startOfMonth(now);
  const to = options.to ? parseISO(options.to) : endOfMonth(now);
  const days = eachDayOfInterval({ start: from, end: to });

  return days.map(d => {
    const key = format(d, 'yyyy-MM-dd');
    const ms = dayMap[key] || 0;
    const hours = ms / 3600000;
    let tier = 0;
    if (hours >= 6) tier = 4;
    else if (hours >= 4) tier = 3;
    else if (hours >= 2) tier = 2;
    else if (hours > 0) tier = 1;
    return { date: key, hours: parseFloat(hours.toFixed(2)), tier };
  });
}

/**
 * Compara dois períodos adjacentes: current vs previous.
 * @param {'last-week'|'last-month'} periodKey
 */
export function generateComparison(periodKey) {
  const now = new Date();
  let currentFrom, currentTo, previousFrom, previousTo;

  if (periodKey === 'last-week') {
    currentFrom = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
    currentTo = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
    const prevWeekStart = subWeeks(startOfWeek(now, { locale: ptBR }), 1);
    const prevWeekEnd = subWeeks(endOfWeek(now, { locale: ptBR }), 1);
    previousFrom = format(prevWeekStart, 'yyyy-MM-dd');
    previousTo = format(prevWeekEnd, 'yyyy-MM-dd');
  } else {
    currentFrom = format(startOfMonth(now), 'yyyy-MM-dd');
    currentTo = format(endOfMonth(now), 'yyyy-MM-dd');
    const prevMonthStart = subMonths(startOfMonth(now), 1);
    const prevMonthEnd = subMonths(endOfMonth(now), 1);
    previousFrom = format(prevMonthStart, 'yyyy-MM-dd');
    previousTo = format(prevMonthEnd, 'yyyy-MM-dd');
  }

  const current = generateReport({ from: currentFrom, to: currentTo });
  const previous = generateReport({ from: previousFrom, to: previousTo });

  return { current, previous, currentFrom, currentTo, previousFrom, previousTo };
}
