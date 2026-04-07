import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as cfg from '../config/manager.js';
import * as storage from '../src/core/storage.js';
import statusCommand from '../src/commands/status.js';

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

describe('Status command', () => {
  it('deve mostrar resumo, metas e orçamento quando houver timer ativo', () => {
    withTempHome(() => {
      cfg.set('hourlyRate', 100);
      cfg.set('dailyGoal', 8);
      cfg.set('weeklyGoal', 40);

      const now = new Date();
      const start = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const end = now.toISOString();

      seedData({
        sessions: [
          {
            id: 's1',
            task: 'Completed task',
            project: 'Projeto X',
            tags: ['cli'],
            startTime: start,
            endTime: end,
            duration: 60 * 60 * 1000,
            billable: true,
            hourlyRate: 100,
            isPaused: false,
            intervals: [{ startTime: start, endTime: end }]
          }
        ],
        activeSession: {
          id: 'active-1',
          task: 'Running task',
          project: 'Projeto X',
          tags: ['cli'],
          notes: null,
          startTime: now.toISOString(),
          endTime: null,
          duration: 0,
          billable: true,
          hourlyRate: 100,
          isPaused: false,
          lastActivityAt: now.toISOString(),
          intervals: [{ startTime: now.toISOString(), endTime: null }]
        },
        projects: [
          { name: 'Projeto X', hourlyRate: 100, clientId: null, budgetHours: 1 }
        ]
      });

      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));
      try {
        statusCommand();
      } finally {
        console.log = originalLog;
      }

      const output = logs.join('\n');
      expect(output).to.include('TIMER EM EXECUÇÃO');
      expect(output).to.include('Resumo:');
      expect(output).to.include('Hoje:');
      expect(output).to.include('Semana:');
      expect(output).to.include('Meta Diária:');
      expect(output).to.include('Meta Semanal:');
      expect(output).to.include('Orçamento:');
    });
  });
});
