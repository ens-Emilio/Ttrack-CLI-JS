import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { addDays, format, startOfMonth } from 'date-fns';

import * as cfg from '../config/manager.js';
import * as storage from '../src/core/storage.js';
import * as reportService from '../src/services/reportService.js';
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

describe('Report service', () => {
  it('deve gerar um resumo consolidado com metas, faturamento e orçamento', () => {
    withTempHome(() => {
      cfg.set('hourlyRate', 100);
      seedData({
        sessions: [
          {
            id: 's1',
            task: 'Task A',
            project: 'Projeto X',
            tags: ['frontend'],
            startTime: '2026-03-01T10:00:00.000Z',
            endTime: '2026-03-01T11:00:00.000Z',
            duration: 60 * 60 * 1000,
            billable: true,
            hourlyRate: 100,
            isPaused: false,
            intervals: [{ startTime: '2026-03-01T10:00:00.000Z', endTime: '2026-03-01T11:00:00.000Z' }]
          },
          {
            id: 's2',
            task: 'Task B',
            project: 'Projeto X',
            tags: ['backend'],
            startTime: '2026-03-02T10:00:00.000Z',
            endTime: '2026-03-02T12:00:00.000Z',
            duration: 2 * 60 * 60 * 1000,
            billable: false,
            hourlyRate: 100,
            isPaused: false,
            intervals: [{ startTime: '2026-03-02T10:00:00.000Z', endTime: '2026-03-02T12:00:00.000Z' }]
          }
        ],
        projects: [
          { name: 'Projeto X', hourlyRate: 100, clientId: null, budgetHours: 10 }
        ]
      });

      const summary = reportService.generateDashboardSummary({ project: 'Projeto X' });

      expect(summary.sessionCount).to.equal(2);
      expect(summary.uniqueDays).to.equal(2);
      expect(summary.totalDuration).to.equal(3 * 60 * 60 * 1000);
      expect(summary.billableDuration).to.equal(1 * 60 * 60 * 1000);
      expect(summary.nonBillableDuration).to.equal(2 * 60 * 60 * 1000);
      expect(summary.totalEarnings).to.equal(100);
      expect(summary.averageSessionDuration).to.equal(1.5 * 60 * 60 * 1000);
      expect(summary.billableShare).to.equal(33.33333333333333);
      expect(summary.budget).to.include({ budgetHours: 10, exceeded: false, warning: false });
    });
  });

  it('deve gerar heatmap para um intervalo fixo com tiers previsíveis', () => {
    withTempHome(() => {
      const monthStart = startOfMonth(new Date('2026-03-19T12:00:00.000Z'));
      const day1 = format(addDays(monthStart, 0), 'yyyy-MM-dd');
      const day2 = format(addDays(monthStart, 1), 'yyyy-MM-dd');
      seedData({
        sessions: [
          {
            id: 'h1',
            task: 'Short',
            startTime: `${day1}T10:00:00.000Z`,
            endTime: `${day1}T11:30:00.000Z`,
            duration: 90 * 60 * 1000,
            billable: true,
            hourlyRate: 0,
            isPaused: false,
            intervals: [{ startTime: `${day1}T10:00:00.000Z`, endTime: `${day1}T11:30:00.000Z` }]
          },
          {
            id: 'h2',
            task: 'Long',
            startTime: `${day2}T10:00:00.000Z`,
            endTime: `${day2}T15:30:00.000Z`,
            duration: 5.5 * 60 * 60 * 1000,
            billable: true,
            hourlyRate: 0,
            isPaused: false,
            intervals: [{ startTime: `${day2}T10:00:00.000Z`, endTime: `${day2}T15:30:00.000Z` }]
          }
        ]
      });

      const days = reportService.generateHeatmap({ from: day1, to: day2 });
      expect(days).to.have.length(2);
      expect(days[0]).to.include({ date: day1, tier: 1 });
      expect(days[1]).to.include({ date: day2, tier: 3 });
    });
  });
});
