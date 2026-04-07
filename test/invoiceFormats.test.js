import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as cfg from '../config/manager.js';
import * as storage from '../src/core/storage.js';
import invoiceCommand from '../src/commands/invoice.js';
import * as invoiceService from '../src/services/invoiceService.js';
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

describe('Invoice multi-formato', () => {
  it('deve gerar fatura em CSV via comando', async () => {
    await withTempHome(async () => {
      cfg.set('currency', 'BRL');
      seedData({
        clients: [{ id: 'fmt-c1', name: 'Cli FMT' }],
        projects: [{ name: 'Proj FMT', hourlyRate: 100, clientId: 'fmt-c1', budgetHours: 10 }],
        sessions: [{
          id: 'fmt-1', task: 'Task FMT', project: 'Proj FMT', tags: [],
          startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T12:00:00.000Z',
          duration: 2 * 3600000, billable: true, hourlyRate: 100, isPaused: false,
          intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T12:00:00.000Z' }]
        }]
      });

      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-cwd-'));
      const prevCwd = process.cwd();
      process.chdir(cwd);
      try {
        const logs = await captureLogs(() => invoiceCommand({
          client: 'Cli FMT',
          from: '2026-03-01',
          to: '2026-03-31',
          format: 'csv',
          output: 'invoice.csv'
        }));

        const file = path.join(cwd, 'invoice.csv');
        expect(fs.existsSync(file)).to.be.true;
        const content = fs.readFileSync(file, 'utf8');
        expect(content).to.include('task,project,start_time');
        expect(content).to.include('Task FMT');
        expect(content).to.include('200.00');
        expect(logs.join('\n')).to.include('Fatura gerada');
      } finally {
        process.chdir(prevCwd);
      }
    });
  });

  it('deve gerar fatura em CSV no stdout sem output', async () => {
    await withTempHome(async () => {
      cfg.set('currency', 'BRL');
      seedData({
        clients: [{ id: 'csv-stdout-c1', name: 'Cli CSV' }],
        projects: [{ name: 'Proj CSV', hourlyRate: 50, clientId: 'csv-stdout-c1', budgetHours: 10 }],
        sessions: [{
          id: 'csv-stdout-1', task: 'Task CSV', project: 'Proj CSV', tags: [],
          startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z',
          duration: 3600000, billable: true, hourlyRate: 50, isPaused: false,
          intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z' }]
        }]
      });

      const logs = await captureLogs(() => invoiceCommand({
        client: 'Cli CSV',
        format: 'csv'
      }));

      expect(logs.join('\n')).to.include('task,project');
      expect(logs.join('\n')).to.include('Task CSV');
      expect(logs.join('\n')).to.include('50.00');
    });
  });

  it('deve gerar fatura em markdown (default) com novos flags', async () => {
    await withTempHome(async () => {
      cfg.set('currency', 'BRL');
      seedData({
        clients: [{ id: 'md-c1', name: 'Cli MD' }],
        projects: [{ name: 'Proj MD', hourlyRate: 100, clientId: 'md-c1', budgetHours: 10 }],
        sessions: [{
          id: 'md-1', task: 'Task MD', project: 'Proj MD', tags: [],
          startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z',
          duration: 3600000, billable: true, hourlyRate: 100, isPaused: false,
          intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z' }]
        }]
      });

      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-cwd-'));
      const prevCwd = process.cwd();
      process.chdir(cwd);
      try {
        const logs = await captureLogs(() => invoiceCommand({
          client: 'Cli MD',
          from: '2026-03-01',
          to: '2026-03-31',
          format: 'markdown',
          output: 'invoice.md'
        }));

        const file = path.join(cwd, 'invoice.md');
        expect(fs.existsSync(file)).to.be.true;
        const content = fs.readFileSync(file, 'utf8');
        expect(content).to.include('## Resumo');
        expect(content).to.include('Proj MD');
      } finally {
        process.chdir(prevCwd);
      }
    });
  });

  it('deve reportar erro quando pdfkit nao disponivel', async () => {
    await withTempHome(async () => {
      cfg.set('currency', 'BRL');
      seedData({
        clients: [{ id: 'pdf-c1', name: 'Cli PDF' }],
        projects: [{ name: 'Proj PDF', hourlyRate: 100, clientId: 'pdf-c1', budgetHours: 10 }],
        sessions: [{
          id: 'pdf-1', task: 'Task PDF', project: 'Proj PDF', tags: [],
          startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z',
          duration: 3600000, billable: true, hourlyRate: 100, isPaused: false,
          intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z' }]
        }]
      });

      const logs = await captureLogs(() => invoiceCommand({
        client: 'Cli PDF',
        format: 'pdf',
        output: 'invoice.pdf'
      }));

      expect(logs.join('\n')).to.include('Erro ao gerar PDF');
    });
  });

  it('deve renderizar CSV com cabecalho de resumo', () => {
    withTempHome(() => {
      cfg.set('currency', 'BRL');
      seedData({
        clients: [{ id: 'csvr-c1', name: 'Cli' }],
        projects: [{ name: 'P', hourlyRate: 100, clientId: 'csvr-c1', budgetHours: 10 }],
        sessions: [{
          id: 'csvr-1', task: 'T', project: 'P', tags: [],
          startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z',
          duration: 3600000, billable: true, hourlyRate: 100, isPaused: false,
          intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z' }]
        }]
      });

      const invoice = invoiceService.generateInvoice({ clientName: 'Cli', from: '2026-03-01', to: '2026-03-31' });
      const csv = invoiceService.renderInvoiceCsv(invoice);
      const lines = csv.split('\n');
      expect(lines[0]).to.include(invoice.number);
      expect(lines[2]).to.equal('task,project,start_time,end_time,duration_h,rate,amount,currency');
    });
  });
});
