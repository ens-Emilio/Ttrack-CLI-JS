import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as cfg from '../config/manager.js';
import * as storage from '../src/core/storage.js';
import * as backupService from '../src/services/backupService.js';
import { getAppPaths } from '../src/constants/paths.js';
import {
  backupCreateCommand,
  backupRestoreCommand
} from '../src/commands/backup.js';

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

async function captureLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await fn();
    return logs;
  } finally {
    console.log = originalLog;
  }
}

describe('Backup command', () => {
  it('deve criar backup via comando e gerar arquivo', async () => {
    await withTempHome(async (tmp) => {
      cfg.set('hourlyRate', 120);
      seedData({
        sessions: [
          {
            id: 'b-1', task: 'Sessao Backup', project: 'Proj', tags: ['a'],
            startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z',
            duration: 3600000, billable: true, hourlyRate: 120, isPaused: false,
            intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z' }]
          }
        ],
        clients: [{ id: 'c1', name: 'Cli' }],
        projects: [{ name: 'Proj', hourlyRate: 120, clientId: 'c1', budgetHours: 40 }],
        templates: [{ name: 'tpl', task: 'tpl', project: null, tags: [], notes: null, billable: true, hourlyRate: null }]
      });

      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-cwd-'));
      const prevCwd = process.cwd();
      process.chdir(cwd);
      try {
        const logs = await captureLogs(() => backupCreateCommand({}));
        expect(logs.join('\n')).to.include('Backup criado');
        const files = fs.readdirSync(cwd).filter(f => f.startsWith('ttrack-backup-'));
        expect(files.length).to.equal(1);

        const content = JSON.parse(fs.readFileSync(path.join(cwd, files[0]), 'utf8'));
        expect(content.version).to.equal(1);
        expect(content.data.sessions).to.be.an('object');
        expect(content.config.user).to.be.an('object');
      } finally {
        process.chdir(prevCwd);
      }
    });
  });

  it('deve restaurar backup via comando', async () => {
    await withTempHome(async (tmp) => {
      seedData({
        sessions: [
          {
            id: 'r-1', task: 'Para Restaurar', project: 'ProjR', tags: [],
            startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T12:00:00.000Z',
            duration: 2 * 3600000, billable: true, hourlyRate: 100, isPaused: false,
            intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T12:00:00.000Z' }]
          }
        ],
        clients: [],
        projects: [],
        templates: []
      });

      const backupResult = backupService.createBackup();

      const newTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-home-'));
      const origHome = process.env.FTT_HOME;
      const origDisable = process.env.FTT_DISABLE_LEGACY_ADOPT;
      process.env.FTT_HOME = newTmp;
      process.env.FTT_DISABLE_LEGACY_ADOPT = '1';

      try {
        const logs = await captureLogs(() => backupRestoreCommand({ file: backupResult.file }));
        expect(logs.join('\n')).to.include('restaurado com sucesso');
        expect(logs.join('\n')).to.include('sessions.json');

        const raw = fs.readFileSync(path.join(newTmp, '.local', 'share', 'ttrack-cli', 'sessions.json'), 'utf8');
        const parsed = JSON.parse(raw);
        expect(parsed.sessions).to.be.an('array');
        expect(parsed.sessions.length).to.be.greaterThan(0);
      } finally {
        process.env.FTT_HOME = origHome;
        process.env.FTT_DISABLE_LEGACY_ADOPT = origDisable;
      }
    });
  });

  it('deve mostrar erro quando --file nao informado no restore', async () => {
    const logs = await captureLogs(() => backupRestoreCommand({}));
    expect(logs.join('\n')).to.include('Use:');
  });
});
