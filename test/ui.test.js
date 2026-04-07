import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as cfg from '../config/manager.js';
import * as storage from '../src/core/storage.js';
import * as timerService from '../src/services/timerService.js';
import * as goalService from '../src/services/goalService.js';
import * as budgetService from '../src/services/budgetService.js';
import * as reportService from '../src/services/reportService.js';
import * as calculator from '../src/core/calculator.js';
import * as formatter from '../src/utils/formatter.js';
import { getAppPaths } from '../src/constants/paths.js';

function withTempHome(fn) {
  const prev = process.env.FTT_HOME;
  const prevDisable = process.env.FTT_DISABLE_LEGACY_ADOPT;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-home-'));
  process.env.FTT_HOME = tmp;
  process.env.FTT_DISABLE_LEGACY_ADOPT = '1';
  try {
    return fn(tmp);
  } finally {
    if (prev === undefined) delete process.env.FTT_HOME;
    else process.env.FTT_HOME = prev;
    if (prevDisable === undefined) delete process.env.FTT_DISABLE_LEGACY_ADOPT;
    else process.env.FTT_DISABLE_LEGACY_ADOPT = prevDisable;
  }
}

function seedData(data) {
  const { dataFile } = getAppPaths();
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  storage.saveData({
    schemaVersion: 4,
    sessions: [],
    activeSession: null,
    projects: [],
    clients: [],
    templates: [],
    ...data
  });
}

describe('TUI - data rendering', () => {
  it('deve exibir sessao ativa com dados corretos', () => {
    withTempHome(() => {
      const session = {
        id: 'tui-1',
        task: 'Tarefa TUI',
        template: 'backend',
        project: 'Projeto TUI',
        tags: ['dev'],
        notes: null,
        startTime: '2026-03-31T10:00:00.000Z',
        endTime: null,
        duration: 60 * 60 * 1000,
        billable: true,
        hourlyRate: 100,
        isPaused: false,
        intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: null }]
      };
      seedData({ activeSession: session });

      const active = timerService.getActiveSession();
      expect(active).to.not.be.null;
      expect(active.task).to.equal('Tarefa TUI');
      expect(active.template).to.equal('backend');
      expect(active.project).to.equal('Projeto TUI');

      const dur = formatter.formatMsToDuration(calculator.calculateTotalDuration(active));
      expect(dur).to.include('h');
    });
  });

  it('deve exibir Nenhum timer ativo quando nao ha sessao', () => {
    withTempHome(() => {
      seedData({ activeSession: null });

      const active = timerService.getActiveSession();
      expect(active).to.be.null;
    });
  });

  it('deve exibir estado pausado corretamente', () => {
    withTempHome(() => {
      const session = {
        id: 'tui-2',
        task: 'Pausada',
        template: null,
        project: null,
        tags: [],
        notes: null,
        startTime: '2026-03-31T10:00:00.000Z',
        endTime: null,
        duration: 30 * 60 * 1000,
        billable: true,
        hourlyRate: 100,
        isPaused: true,
        intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: null }]
      };
      seedData({ activeSession: session });

      const active = timerService.getActiveSession();
      expect(active.isPaused).to.be.true;
    });
  });

  it('deve exibir resumo do dashboard', () => {
    withTempHome(() => {
      seedData({
        sessions: [
          {
            id: 'dash-1',
            task: 'Task Hoje',
            project: 'Proj A',
            tags: [],
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            duration: 3600000,
            billable: true,
            hourlyRate: 100,
            isPaused: false,
            intervals: []
          }
        ]
      });

      const today = reportService.generateDashboardSummary({ today: true });
      expect(today).to.have.property('totalDurationStr');
      expect(today).to.have.property('totalEarningsStr');

      const week = reportService.generateDashboardSummary({ week: true });
      expect(week).to.have.property('totalDurationStr');
      expect(week).to.have.property('totalEarningsStr');
    });
  });

  it('deve exibir progresso de metas', () => {
    withTempHome(() => {
      cfg.set('dailyGoal', 8);
      cfg.set('weeklyGoal', 40);
      seedData({ sessions: [] });

      const progress = goalService.getGoalProgress();
      expect(progress).to.have.property('daily');
      expect(progress).to.have.property('weekly');
      expect(progress.daily).to.have.property('percent');
      expect(progress.daily).to.have.property('current');
      expect(progress.weekly).to.have.property('percent');
    });
  });

  it('deve exibir orcamento do projeto ativo', () => {
    withTempHome(() => {
      seedData({
        projects: [
          { name: 'Projeto TUI', hourlyRate: 100, clientId: null, budgetHours: 20 }
        ],
        activeSession: {
          id: 'tui-3',
          task: 'Tarefa Oramento',
          template: null,
          project: 'Projeto TUI',
          tags: [],
          notes: null,
          startTime: '2026-03-31T10:00:00.000Z',
          endTime: null,
          duration: 5 * 3600000,
          billable: true,
          hourlyRate: 100,
          isPaused: false,
          intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: null }]
        },
        sessions: [
          {
            id: 'tui-3-done',
            task: 'Tarefa Oramento',
            project: 'Projeto TUI',
            tags: [],
            startTime: '2026-03-30T10:00:00.000Z',
            endTime: '2026-03-30T15:00:00.000Z',
            duration: 5 * 3600000,
            billable: true,
            hourlyRate: 100,
            isPaused: false,
            intervals: [{ startTime: '2026-03-30T10:00:00.000Z', endTime: '2026-03-30T15:00:00.000Z' }]
          }
        ]
      });

      const budget = budgetService.getProjectBudgetStatus('Projeto TUI');
      expect(budget).to.not.be.null;
      expect(budget).to.have.property('usedHours');
      expect(budget).to.have.property('budgetHours');
      expect(budget).to.have.property('percent');
    });
  });

  it('deve exibir ultimas sessoes', () => {
    withTempHome(() => {
      const sessions = Array.from({ length: 7 }, (_, i) => ({
        id: `last-${i}`,
        task: `Task ${i}`,
        project: 'Proj',
        tags: [],
        startTime: `2026-03-${String(25 + i).padStart(2, '0')}T10:00:00.000Z`,
        endTime: `2026-03-${String(25 + i).padStart(2, '0')}T11:00:00.000Z`,
        duration: 3600000,
        billable: true,
        hourlyRate: 100,
        isPaused: false,
        intervals: []
      }));
      seedData({ sessions });

      const all = timerService.getSessions();
      expect(all.length).to.be.greaterThanOrEqual(5);
    });
  });

  it('deve ter progress bar formatacao valida', () => {
    withTempHome(() => {
      const bar = goalService.getProgressBar(0);
      expect(bar).to.be.a('string');
      expect(bar.length).to.be.greaterThan(0);

      const barFull = goalService.getProgressBar(100);
      expect(barFull).to.be.a('string');
    });
  });
});
