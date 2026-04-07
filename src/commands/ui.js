/**
 * TUI interativo usando ink + react (dependências opcionais).
 * Install: npm install ink react
 */
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import * as timerService from '../services/timerService.js';
import * as goalService from '../services/goalService.js';
import * as budgetService from '../services/budgetService.js';
import * as reportService from '../services/reportService.js';
import * as calculator from '../core/calculator.js';
import * as formatter from '../utils/formatter.js';
import * as exportService from '../services/exportService.js';
import * as invoiceService from '../services/invoiceService.js';
import { writePdfToFile } from '../exporters/pdfExporter.js';
import { getConfig } from '../../config/manager.js';
import { getAppPaths } from '../constants/paths.js';

async function performExport(format = 'json') {
  try {
    const opts = { format, week: true };
    const built = exportService.buildExport(opts);
    if (built.filteredSessions.length === 0) {
      return chalk.yellow('Nenhuma sessão esta semana para exportar.');
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `export-${timestamp}.${format}`;
    const filePath = path.resolve(process.cwd(), filename);
    if (format === 'pdf') {
      const cfg = getConfig();
      await writePdfToFile(filePath, built.filteredSessions, opts, cfg);
    } else {
      fs.writeFileSync(filePath, built.content);
    }
    return chalk.green(`Exportado: ${chalk.bold(filename)} (${built.filteredSessions.length} sessoes)`);
  } catch (err) {
    return chalk.red(`Erro ao exportar: ${err.message}`);
  }
}

async function performInvoice() {
  try {
    const cfg = getConfig();
    const invoice = invoiceService.generateInvoice({
      from: null,
      to: null
    });
    if (invoice.sessions.length === 0) {
      return chalk.yellow('Nenhuma sessao faturavel encontrada.');
    }
    const markdown = invoiceService.renderInvoiceMarkdown(invoice, cfg);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `invoice-${timestamp}.md`;
    const filePath = path.resolve(process.cwd(), filename);
    fs.writeFileSync(filePath, markdown);
    return chalk.green(`Fatura ${invoice.number}: ${chalk.bold(filename)} (${invoice.totalHours.toFixed(2)}h | ${formatter.formatCurrency(invoice.totalAmount, invoice.currency)})`);
  } catch (err) {
    return chalk.red(`Erro ao gerar fatura: ${err.message}`);
  }
}

async function runInkUI() {
  let React, ink;
  try {
    React = (await import('react')).default;
    ink = await import('ink');
  } catch {
    return false;
  }

  const { render, Text, Box, useInput, useApp } = ink;
  const { useState, useEffect, useCallback } = React;

  function App() {
    const [tick, setTick] = useState(0);
    const [session, setSession] = useState(timerService.getActiveSession());
    const [feedback, setFeedback] = useState(null);
    const { exit } = useApp();
    const todaySummary = reportService.generateDashboardSummary({ today: true });
    const weekSummary = reportService.generateDashboardSummary({ week: true });
    const projectBudget = session?.project ? budgetService.getProjectBudgetStatus(session.project) : null;

    useEffect(() => {
      const iv = setInterval(() => {
        setTick(t => t + 1);
        setSession(timerService.getActiveSession());
      }, 1000);
      return () => clearInterval(iv);
    }, []);

    const handleExport = useCallback(async (format) => {
      const msg = await performExport(format);
      setFeedback(msg);
    }, []);

    const handleInvoice = useCallback(async () => {
      const msg = await performInvoice();
      setFeedback(msg);
    }, []);

    useInput((input) => {
      if (input === 'q') {
        exit();
      } else if (input === 's' && session) {
        timerService.stopTimer();
        exit();
      } else if (input === 'p' && session) {
        if (session.isPaused) timerService.resumeTimer();
        else timerService.pauseTimer();
        setSession(timerService.getActiveSession());
      } else if (input === 'e') {
        handleExport('json');
      } else if (input === 'i') {
        handleInvoice();
      }
    });

    useEffect(() => {
      if (feedback) {
        const t = setTimeout(() => setFeedback(null), 4000);
        return () => clearTimeout(t);
      }
    }, [feedback]);

    const progress = goalService.getGoalProgress();
    const sessions = timerService.getSessions().slice(-5).reverse();

    return React.createElement(Box, { flexDirection: 'column', padding: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, '  ttrack-cli TUI'),
      React.createElement(Text, { color: 'gray' }, '──────────────────────────────'),

      session
        ? React.createElement(Box, { flexDirection: 'column' },
            React.createElement(Text, null, `Tarefa: ${chalk.bold(session.task)}`),
            session.template && React.createElement(Text, null, `Template: ${session.template}`),
            session.project && React.createElement(Text, null, `Projeto: ${session.project}`),
            React.createElement(Text, null, `Duracao: ${formatter.formatMsToDuration(calculator.calculateTotalDuration(session))}`),
            React.createElement(Text, { color: session.isPaused ? 'yellow' : 'green' },
              session.isPaused ? 'PAUSADO' : 'RODANDO'
            )
          )
        : React.createElement(Text, { color: 'yellow' }, 'Nenhum timer ativo'),

      React.createElement(Text, { color: 'gray' }, ''),
      React.createElement(Text, { bold: true }, 'Resumo'),
      React.createElement(Text, null, `  Hoje: ${todaySummary.totalDurationStr} | ${todaySummary.totalEarningsStr}`),
      React.createElement(Text, null, `  Semana: ${weekSummary.totalDurationStr} | ${weekSummary.totalEarningsStr}`),
      React.createElement(Text, null, `  Meta Diaria: ${goalService.getProgressBar(progress.daily.percent)}`),
      React.createElement(Text, null, `  Meta Semanal: ${goalService.getProgressBar(progress.weekly.percent)}`),
      projectBudget && React.createElement(Text, { color: projectBudget.exceeded ? 'red' : projectBudget.warning ? 'yellow' : 'green' },
        `  Orcamento ${session.project}: ${projectBudget.usedHours.toFixed(1)}h / ${projectBudget.budgetHours}h (${projectBudget.percent.toFixed(0)}%)`
      ),

      React.createElement(Text, { color: 'gray' }, ''),
      React.createElement(Text, { bold: true }, 'Ultimas sessoes:'),
      ...sessions.map(s =>
        React.createElement(Text, { key: s.id, color: 'gray' },
          `  ${s.task} — ${formatter.formatMsToDuration(s.duration)}`
        )
      ),

      feedback && React.createElement(Text, { color: 'gray' }, ''),
      feedback && React.createElement(Text, null, feedback),

      React.createElement(Text, { color: 'gray' }, ''),
      React.createElement(Text, { color: 'gray' }, '[s] stop  [p] pause/resume  [e] export  [i] invoice  [q] sair')
    );
  }

  render(React.createElement(App));
  return true;
}

export default async function uiCommand() {
  const launched = await runInkUI();
  if (!launched) {
    console.log(chalk.cyan('\n  ttrack-cli — modo simples (instale ink + react para TUI completo)'));
    console.log(chalk.gray('Pressione Ctrl+C para sair | e=exportar | i=fatura\n'));

    let feedback = null;
    let feedbackTimer = null;

    const showFeedback = (msg) => {
      feedback = msg;
      if (feedbackTimer) clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => { feedback = null; }, 4000);
    };

    const render = () => {
      const session = timerService.getActiveSession();
      const progress = goalService.getGoalProgress();
      const todaySummary = reportService.generateDashboardSummary({ today: true });
      const weekSummary = reportService.generateDashboardSummary({ week: true });
      const projectBudget = session?.project ? budgetService.getProjectBudgetStatus(session.project) : null;
      process.stdout.write('\x1Bc');
      if (session) {
        const dur = formatter.formatMsToDuration(calculator.calculateTotalDuration(session));
        console.log(`${chalk.bold.cyan('Tarefa:')} ${session.task}  ${chalk.green(dur)}`);
        if (session.template) {
          console.log(`${chalk.bold.cyan('Template:')} ${session.template}`);
        }
        if (session.project) {
          console.log(`${chalk.bold.cyan('Projeto:')} ${session.project}`);
        }
      } else {
        console.log(chalk.yellow('Nenhum timer ativo'));
      }
      console.log(`Hoje: ${todaySummary.totalDurationStr} | ${todaySummary.totalEarningsStr}`);
      console.log(`Semana: ${weekSummary.totalDurationStr} | ${weekSummary.totalEarningsStr}`);
      console.log(`Meta Diaria: ${goalService.getProgressBar(progress.daily.percent)}`);
      console.log(`Meta Semanal: ${goalService.getProgressBar(progress.weekly.percent)}`);
      if (projectBudget) {
        const color = projectBudget.exceeded ? chalk.red : projectBudget.warning ? chalk.yellow : chalk.green;
        console.log(color(`Orcamento ${session.project}: ${projectBudget.usedHours.toFixed(1)}h / ${projectBudget.budgetHours}h (${projectBudget.percent.toFixed(0)}%)`));
      }
      if (feedback) {
        console.log(feedback);
      }
      console.log(chalk.gray('[Ctrl+C=sair | e=exportar semanal | i=fatura]'));
    };

    render();
    const iv = setInterval(render, 1000);

    const onKey = async (raw) => {
      const key = raw.toString().trim().toLowerCase();
      if (key === 'e') {
        const msg = await performExport('json');
        showFeedback(msg);
      } else if (key === 'i') {
        const msg = await performInvoice();
        showFeedback(msg);
      }
    };

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', onKey);
    }

    process.on('SIGINT', () => {
      clearInterval(iv);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onKey);
      }
      process.exit(0);
    });
  }
}
