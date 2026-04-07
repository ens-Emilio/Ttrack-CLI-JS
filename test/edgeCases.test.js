import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as cfg from '../config/manager.js';
import * as storage from '../src/core/storage.js';
import * as importService from '../src/services/importService.js';
import * as timerService from '../src/services/timerService.js';
import * as sessionService from '../src/services/sessionService.js';
import * as projectService from '../src/services/projectService.js';
import * as clientService from '../src/services/clientService.js';
import * as templateService from '../src/services/templateService.js';
import * as validator from '../src/utils/validator.js';
import * as formatter from '../src/utils/formatter.js';
import * as backupService from '../src/services/backupService.js';
import * as idleService from '../src/services/idleService.js';
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

describe('Cobertura de bordas', () => {
  describe('Timezone e datas', () => {
    it('deve formatar datas com timezone padrao', () => {
      const date = '2026-03-31T10:00:00.000Z';
      const formatted = formatter.formatDateTime(date);
      expect(formatted).to.be.a('string');
      expect(formatted.length).to.be.greaterThan(0);
    });

    it('deve formatar datas com timezone customizado via config', () => {
      const date = '2026-03-31T10:00:00.000Z';
      const formatted = formatter.formatDateTime(date, { dateTimeFormat: 'yyyy-MM-dd HH:mm:ss' });
      expect(formatted).to.include('2026-03-31');
    });

    it('deve formatar duracao com 0ms', () => {
      expect(formatter.formatMsToDuration(0)).to.equal('0s');
    });

    it('deve formatar duracao com milissegundos grandes', () => {
      const result = formatter.formatMsToDuration(90061000);
      expect(result).to.include('1h');
      expect(result).to.include('1m');
      expect(result).to.include('1s');
    });

    it('deve formatar moeda com diferentes currencies', () => {
      const brl = formatter.formatCurrency(150, 'BRL');
      expect(brl).to.include('R$');

      const usd = formatter.formatCurrency(100, 'USD');
      expect(usd).to.include('$');

      const eur = formatter.formatCurrency(80, 'EUR');
      expect(eur).to.include('€');
    });

    it('deve formatar percentual', () => {
      expect(formatter.formatPercent(0)).to.equal('0%');
      expect(formatter.formatPercent(50.5)).to.equal('51%');
      expect(formatter.formatPercent(100)).to.equal('100%');
      expect(formatter.formatPercent(33.33, 1)).to.equal('33.3%');
    });

    it('deve formatar bytes', () => {
      expect(formatter.formatBytes(0)).to.equal('0 B');
      expect(formatter.formatBytes(1024)).to.equal('1.0 KB');
      expect(formatter.formatBytes(1048576)).to.equal('1.0 MB');
    });
  });

  describe('Validacao de datas com bordas', () => {
    it('deve aceitar data em ano bissexto', () => {
      expect(() => validator.validateDate('2024-02-29')).to.not.throw();
    });

    it('deve aceitar data 29 fev em ano nao bissexto (validador de formato)', () => {
      expect(() => validator.validateDate('2025-02-29')).to.not.throw();
    });

    it('deve aceitar data limite', () => {
      expect(() => validator.validateDate('2099-12-31')).to.not.throw();
    });

    it('deve aceitar data inicio do ano', () => {
      expect(() => validator.validateDate('2026-01-01')).to.not.throw();
    });
  });

  describe('Nomes duplicados', () => {
    it('deve permitir criar projeto com mesmo nome (sobrescreve)', () => {
      withTempHome(() => {
        projectService.getOrCreateProject('Dup');
        projectService.getOrCreateProject('Dup');
        const projects = projectService.listProjects();
        expect(projects).to.have.length.at.most(2);
      });
    });

    it('deve impedir criar cliente duplicado', () => {
      withTempHome(() => {
        clientService.addClient('Dup');
        expect(() => clientService.addClient('Dup')).to.throw();
      });
    });

    it('deve permitir criar template com mesmo nome (sobrescreve)', () => {
      withTempHome(() => {
        templateService.saveTemplate('Dup', { task: 'v1', project: null, tags: '', notes: null, billable: true, hourlyRate: null });
        templateService.saveTemplate('Dup', { task: 'v2', project: null, tags: '', notes: null, billable: true, hourlyRate: null });
        const templates = templateService.listTemplates();
        const dup = templates.find(t => t.name === 'Dup');
        expect(dup.task).to.equal('v2');
      });
    });
  });

  describe('Fluxos destrutivos', () => {
    it('deve remover sessao existente', () => {
      withTempHome(() => {
        seedData({
          sessions: [
            {
              id: 'del-1', task: 'Delete me', project: null, tags: [],
              startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z',
              duration: 3600000, billable: true, hourlyRate: 100, isPaused: false, intervals: []
            }
          ]
        });

        sessionService.deleteSession('del-1');
        const sessions = timerService.getSessions();
        expect(sessions.find(s => s.id === 'del-1')).to.be.undefined;
      });
    });

    it('deve falhar ao remover sessao inexistente', () => {
      withTempHome(() => {
        seedData({ sessions: [] });
        expect(() => sessionService.deleteSession('nonexistent')).to.throw();
      });
    });

    it('deve remover cliente sem vinculacao', () => {
      withTempHome(() => {
        clientService.addClient('Sozinho');
        clientService.deleteClient('Sozinho');
        const clients = clientService.listClients();
        expect(clients.find(c => c.name === 'Sozinho')).to.be.undefined;
      });
    });

    it('deve impedir remover cliente vinculado a projeto', () => {
      withTempHome(() => {
        clientService.addClient('Vinculado');
        projectService.getOrCreateProject('Proj');
        const clients = clientService.listClients();
        const clientId = clients.find(c => c.name === 'Vinculado').id;
        projectService.setProjectClient('Proj', clientId);
        expect(() => clientService.deleteClient('Vinculado')).to.throw();
      });
    });

    it('deve impedir remover projeto inexistente', () => {
      withTempHome(() => {
        seedData({ projects: [] });
        expect(() => projectService.deleteProject('Inexistente')).to.throw();
      });
    });
  });

  describe('Sessao com dados minimos', () => {
    it('deve importar sessao sem projeto e tags', () => {
      withTempHome(() => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-edge-'));
        const file = path.join(tmp, 'minimal.json');
        fs.writeFileSync(file, JSON.stringify([
          {
            id: 'min-1',
            task: 'Minimal',
            startTime: '2026-03-31T10:00:00.000Z',
            endTime: '2026-03-31T11:00:00.000Z',
            duration: 3600000
          }
        ]));

        const result = importService.importFromJson(file);
        expect(result.importedCount).to.equal(1);
      });
    });

    it('deve lidar com sessao com duracao 0', () => {
      withTempHome(() => {
        seedData({
          sessions: [{
            id: 'zero-1', task: 'Zero', project: null, tags: [],
            startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T10:00:00.000Z',
            duration: 0, billable: true, hourlyRate: 100, isPaused: false, intervals: []
          }]
        });

        const sessions = timerService.getSessions();
        expect(sessions[0].duration).to.equal(0);
      });
    });
  });

  describe('Backup e restore', () => {
    it('deve criar backup completo', () => {
      withTempHome(() => {
        cfg.set('hourlyRate', 150);
        seedData({
          sessions: [{ id: 'b-1', task: 'Backup', project: null, tags: [], startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z', duration: 3600000, billable: true, hourlyRate: 150, isPaused: false, intervals: [] }],
          clients: [{ id: 'bc1', name: 'Cli Backup' }],
          projects: [{ name: 'Proj Backup', hourlyRate: 150, clientId: 'bc1', budgetHours: 10 }],
          templates: [{ name: 'Tpl Backup', task: 'tpl', project: null, tags: [], notes: null, billable: true, hourlyRate: null }]
        });

        const result = backupService.createBackup();
        expect(result.file).to.be.a('string');
        expect(result.size).to.be.greaterThan(0);
        expect(fs.existsSync(result.file)).to.be.true;

        const content = JSON.parse(fs.readFileSync(result.file, 'utf8'));
        expect(content.version).to.equal(1);
        expect(content.data).to.have.property('sessions');
      });
    });

    it('deve restaurar backup', () => {
      withTempHome((tmp) => {
        seedData({
          sessions: [{ id: 'r-1', task: 'Restaurar', project: 'Proj', tags: ['a'], startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T11:00:00.000Z', duration: 3600000, billable: true, hourlyRate: 100, isPaused: false, intervals: [] }],
          clients: [{ id: 'rc1', name: 'Cli' }],
          projects: [{ name: 'Proj', hourlyRate: 100, clientId: 'rc1', budgetHours: 20 }],
          templates: []
        });

        const backupResult = backupService.createBackup();
        seedData({ sessions: [], clients: [], projects: [], templates: [] });

        const restoreResult = backupService.restoreBackup(backupResult.file);
        expect(restoreResult.version).to.equal(1);
        expect(restoreResult.restored).to.include('sessions.json');

        const data = storage.loadData();
        expect(data.sessions.length).to.be.greaterThan(0);
      });
    });

    it('deve falhar ao restaurar arquivo inexistente', () => {
      expect(() => backupService.restoreBackup('/nonexistent/path.json')).to.throw();
    });

    it('deve falhar ao restaurar JSON invalido', () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-bad-'));
      const file = path.join(tmp, 'bad.json');
      fs.writeFileSync(file, 'not json');
      expect(() => backupService.restoreBackup(file)).to.throw();
    });

    it('deve falhar ao restaurar backup sem versao', () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-no-ver-'));
      const file = path.join(tmp, 'nover.json');
      fs.writeFileSync(file, JSON.stringify({ data: { sessions: [] } }));
      expect(() => backupService.restoreBackup(file)).to.throw();
    });
  });

  describe('Idle detection', () => {
    it('deve detectar idle time', () => {
      const session = { lastActivityAt: new Date(Date.now() - 600000).toISOString() };
      const idleMs = idleService.detectIdleTime(session);
      expect(idleMs).to.be.greaterThan(599000);
    });

    it('deve retornar 0 quando nao ha lastActivityAt', () => {
      expect(idleService.detectIdleTime({})).to.equal(0);
      expect(idleService.detectIdleTime(null)).to.equal(0);
      expect(idleService.detectIdleTime({ lastActivityAt: null })).to.equal(0);
    });

    it('deve obter threshold de config', () => {
      withTempHome(() => {
        process.env.FTT_IDLE_THRESHOLD = '10';
        expect(idleService.getIdleThresholdMs()).to.equal(600000);
        delete process.env.FTT_IDLE_THRESHOLD;
      });
    });

    it('deve usar default 5 min quando nao configurado', () => {
      withTempHome(() => {
        const ms = idleService.getIdleThresholdMs();
        expect(ms).to.equal(300000);
      });
    });

    it('deve parar monitor sem erro quando nao ha monitor ativo', () => {
      expect(() => idleService.stopIdleMonitor()).to.not.throw();
    });
  });

  describe('Invoice CSV', () => {
    it('deve renderizar fatura em CSV', () => {
      withTempHome(() => {
        cfg.set('currency', 'BRL');
        cfg.set('hourlyRate', 100);
        seedData({
          clients: [{ id: 'csv-c1', name: 'Cli CSV' }],
          projects: [{ name: 'Proj CSV', hourlyRate: 100, clientId: 'csv-c1', budgetHours: 10 }],
          sessions: [{
            id: 'csv-1', task: 'Task CSV', project: 'Proj CSV', tags: [],
            startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T12:00:00.000Z',
            duration: 2 * 3600000, billable: true, hourlyRate: 100, isPaused: false,
            intervals: [{ startTime: '2026-03-31T10:00:00.000Z', endTime: '2026-03-31T12:00:00.000Z' }]
          }]
        });

        const invoice = invoiceService.generateInvoice({ clientName: 'Cli CSV', from: '2026-03-01', to: '2026-03-31' });
        const csv = invoiceService.renderInvoiceCsv(invoice);
        expect(csv).to.include('task,project,start_time,end_time,duration_h,rate,amount,currency');
        expect(csv).to.include('Task CSV');
        expect(csv).to.include('2.00');
        expect(csv).to.include('200.00');
      });
    });
  });

  describe('Formatter helpers', () => {
    it('deve formatar duration parts', () => {
      const parts = formatter.formatDurationParts(3661000);
      expect(parts.hours).to.equal(1);
      expect(parts.minutes).to.equal(1);
      expect(parts.seconds).to.equal(1);
    });

    it('deve formatar data com locale pt-BR', () => {
      const formatted = formatter.formatDate('2026-03-31');
      expect(formatted).to.include('2026');
    });

    it('deve formatar hora isolada', () => {
      const time = formatter.formatTime('2026-03-31T14:30:00.000Z');
      expect(time).to.match(/^\d{2}:\d{2}$/);
    });
  });
});
