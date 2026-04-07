import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import * as timerService from '../services/timerService.js';
import * as reportService from '../services/reportService.js';
import { getGoalProgress } from '../services/goalService.js';

export default function webCommand(options) {
  if (!options.startServer) {
    console.log(chalk.yellow('Use a flag --start-server para iniciar a API REST local.'));
    return;
  }

  const app = express();
  const port = options.port || 3000;

  app.use(cors());
  app.use(express.json());

  // Rotas da API
  app.get('/api/sessions', (req, res) => {
    const sessions = timerService.getSessions();
    res.json(sessions);
  });

  app.get('/api/sessions/active', (req, res) => {
    const session = timerService.getActiveSession();
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({ error: 'Nenhum timer ativo no momento.' });
    }
  });

  app.post('/api/sessions/start', (req, res) => {
    const { task, project, tags } = req.body;
    if (!task) return res.status(400).json({ error: 'A tarefa (task) é obrigatória.' });
    
    try {
      const session = timerService.startTimer(task, { project, tags });
      res.json(session);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sessions/stop', (req, res) => {
    try {
      const session = timerService.stopTimer();
      res.json(session);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/dashboard', (req, res) => {
    const todaySummary = reportService.generateDashboardSummary({ today: true });
    const weekSummary = reportService.generateDashboardSummary({ week: true });
    const progress = getGoalProgress();
    
    res.json({
      today: todaySummary,
      week: weekSummary,
      progress
    });
  });

  app.listen(port, () => {
    console.log(chalk.green(`🚀 TTrack API Server rodando em http://localhost:${port}`));
    console.log(chalk.gray(`Pressione Ctrl+C para encerrar.`));
  });
}
