import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as cfg from '../config/manager.js';
import * as storage from '../src/core/storage.js';
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

describe('Invoice service', () => {
  it('deve gerar fatura com resumo e breakdown por projeto', () => {
    withTempHome(() => {
      cfg.set('currency', 'BRL');
      cfg.set('hourlyRate', 100);
      seedData({
        clients: [
          { id: 'c1', name: 'Cliente X' }
        ],
        projects: [
          { name: 'Projeto A', hourlyRate: 150, clientId: 'c1', budgetHours: 20 },
          { name: 'Projeto B', hourlyRate: 80, clientId: 'c2', budgetHours: 10 }
        ],
        sessions: [
          {
            id: 's1',
            task: 'Implementação',
            project: 'Projeto A',
            tags: ['api'],
            startTime: '2026-03-02T10:00:00.000Z',
            endTime: '2026-03-02T12:00:00.000Z',
            duration: 2 * 60 * 60 * 1000,
            billable: true,
            hourlyRate: 150,
            isPaused: false,
            intervals: [{ startTime: '2026-03-02T10:00:00.000Z', endTime: '2026-03-02T12:00:00.000Z' }]
          },
          {
            id: 's2',
            task: 'Reunião',
            project: 'Projeto A',
            tags: ['sync'],
            startTime: '2026-03-03T10:00:00.000Z',
            endTime: '2026-03-03T11:00:00.000Z',
            duration: 60 * 60 * 1000,
            billable: false,
            hourlyRate: 150,
            isPaused: false,
            intervals: [{ startTime: '2026-03-03T10:00:00.000Z', endTime: '2026-03-03T11:00:00.000Z' }]
          },
          {
            id: 's3',
            task: 'Outro cliente',
            project: 'Projeto B',
            tags: ['other'],
            startTime: '2026-03-04T10:00:00.000Z',
            endTime: '2026-03-04T11:00:00.000Z',
            duration: 60 * 60 * 1000,
            billable: true,
            hourlyRate: 80,
            isPaused: false,
            intervals: [{ startTime: '2026-03-04T10:00:00.000Z', endTime: '2026-03-04T11:00:00.000Z' }]
          }
        ]
      });

      const invoice = invoiceService.generateInvoice({
        clientName: 'Cliente X',
        from: '2026-03-01',
        to: '2026-03-31'
      });

      expect(invoice.sessions).to.have.length(1);
      expect(invoice.billableSessionCount).to.equal(1);
      expect(invoice.totalHours).to.equal(2);
      expect(invoice.totalAmount).to.equal(300);
      expect(invoice.projectBreakdown).to.have.length(1);
      expect(invoice.projectBreakdown[0]).to.include({ project: 'Projeto A', sessions: 1 });

      const markdown = invoiceService.renderInvoiceMarkdown(invoice);
      expect(markdown).to.include('## Resumo');
      expect(markdown).to.include('## Sessões');
      expect(markdown).to.include('## Por Projeto');
      expect(markdown).to.include('Projeto A');
      expect(markdown).to.include('Total de Horas');
      expect(markdown).to.include('Total:');
    });
  });
});
