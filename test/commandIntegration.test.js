import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as cfg from '../config/manager.js';
import * as storage from '../src/core/storage.js';
import importCommand from '../src/commands/import.js';
import exportCommand from '../src/commands/export.js';
import invoiceCommand from '../src/commands/invoice.js';
import { getAppPaths } from '../src/constants/paths.js';

async function withTempHome(fn) {
  const prev = process.env.FTT_HOME;
  const prevDisable = process.env.FTT_DISABLE_LEGACY_ADOPT;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-home-'));
  process.env.FTT_HOME = tmp;
  process.env.FTT_DISABLE_LEGACY_ADOPT = '1';
  try {
    return await fn(tmp);
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
    const value = await fn();
    return { logs, value };
  } finally {
    console.log = originalLog;
  }
}

describe('Command integration', () => {
  it('deve importar JSON e reportar o resultado na saída', () => {
    return withTempHome(() => {
      const importFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-import-')), 'import.json');
      fs.writeFileSync(importFile, JSON.stringify([
        {
          id: 'cmd-1',
          task: 'Task Importada',
          project: 'Projeto CLI',
          tags: ['cli'],
          notes: 'nota',
          startTime: '2026-03-05T10:00:00.000Z',
          endTime: '2026-03-05T11:00:00.000Z',
          duration: 60 * 60 * 1000,
          billable: true,
          hourlyRate: 100,
          isPaused: false,
          intervals: [{ startTime: '2026-03-05T10:00:00.000Z', endTime: '2026-03-05T11:00:00.000Z' }]
        }
      ], null, 2));

      return captureLogs(() => importCommand(importFile, { source: 'json' })).then(({ logs }) => {
      expect(logs.join('\n')).to.include('Importação concluída com sucesso');
      expect(logs.join('\n')).to.include('Sessões importadas');
      expect(storage.loadData().sessions).to.have.length(1);
      });
    });
  });

  it('deve exportar JSON para arquivo e anunciar metadados quando solicitados', async () => {
    await withTempHome(async () => {
      seedData({
        sessions: [
          {
            id: 'exp-1',
            task: 'Task Export',
            project: 'Projeto Export',
            tags: ['cli'],
            startTime: '2026-03-06T10:00:00.000Z',
            endTime: '2026-03-06T11:00:00.000Z',
            duration: 60 * 60 * 1000,
            billable: true,
            hourlyRate: 100,
            isPaused: false,
            intervals: [{ startTime: '2026-03-06T10:00:00.000Z', endTime: '2026-03-06T11:00:00.000Z' }]
          }
        ]
      });

      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-cwd-'));
      const prevCwd = process.cwd();
      process.chdir(cwd);
      try {
        const { logs } = await captureLogs(() => exportCommand({
          format: 'json',
          output: 'out.json',
          withMeta: true,
          from: '2026-03-06',
          to: '2026-03-06'
        }));

        const outputFile = path.join(cwd, 'out.json');
        expect(fs.existsSync(outputFile)).to.equal(true);
        const parsed = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        expect(parsed.metadata.totalSessions).to.equal(1);
        expect(logs.join('\n')).to.include('Exportação concluída');
        expect(logs.join('\n')).to.include('Metadados: 1 sessão(ões) | JSON');
      } finally {
        process.chdir(prevCwd);
      }
    });
  });

  it('deve gerar fatura markdown em arquivo', () => {
    withTempHome(() => {
      cfg.set('currency', 'BRL');
      seedData({
        clients: [
          { id: 'c1', name: 'Cliente CLI' }
        ],
        projects: [
          { name: 'Projeto CLI', hourlyRate: 100, clientId: 'c1', budgetHours: 10 }
        ],
        sessions: [
          {
            id: 'inv-1',
            task: 'Task Invoice',
            project: 'Projeto CLI',
            tags: ['billing'],
            startTime: '2026-03-07T10:00:00.000Z',
            endTime: '2026-03-07T12:00:00.000Z',
            duration: 2 * 60 * 60 * 1000,
            billable: true,
            hourlyRate: 100,
            isPaused: false,
            intervals: [{ startTime: '2026-03-07T10:00:00.000Z', endTime: '2026-03-07T12:00:00.000Z' }]
          }
        ]
      });

      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-cwd-'));
      const prevCwd = process.cwd();
      process.chdir(cwd);
      try {
        return captureLogs(() => invoiceCommand({
          client: 'Cliente CLI',
          from: '2026-03-01',
          to: '2026-03-31',
          output: 'invoice.md'
        })).then(({ logs }) => {

        const outputFile = path.join(cwd, 'invoice.md');
        expect(fs.existsSync(outputFile)).to.equal(true);
        const markdown = fs.readFileSync(outputFile, 'utf8');
        expect(markdown).to.include('## Resumo');
        expect(markdown).to.include('## Por Projeto');
        expect(logs.join('\n')).to.include('Fatura gerada');
        expect(logs.join('\n')).to.include('Número:');
        });
      } finally {
        process.chdir(prevCwd);
      }
    });
  });
});
