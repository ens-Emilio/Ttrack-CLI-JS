import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as storage from '../src/core/storage.js';
import * as importService from '../src/services/importService.js';
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

describe('Import service', () => {
  it('deve importar JSON com array puro de sessões e pular duplicadas', () => {
    withTempHome(() => {
      seedData({
        sessions: [
          {
            id: 'existing-1',
            task: 'Existente',
            project: 'Projeto X',
            tags: [],
            notes: null,
            startTime: '2026-03-01T10:00:00.000Z',
            endTime: '2026-03-01T11:00:00.000Z',
            duration: 60 * 60 * 1000,
            billable: true,
            hourlyRate: 0,
            isPaused: false,
            intervals: [{ startTime: '2026-03-01T10:00:00.000Z', endTime: '2026-03-01T11:00:00.000Z' }]
          }
        ]
      });

      const jsonFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-import-')), 'sessions.json');
      fs.writeFileSync(jsonFile, JSON.stringify([
        {
          id: 'existing-1',
          task: 'Existente',
          project: 'Projeto X',
          tags: [],
          notes: null,
          startTime: '2026-03-01T10:00:00.000Z',
          endTime: '2026-03-01T11:00:00.000Z',
          duration: 60 * 60 * 1000,
          billable: true,
          hourlyRate: 0,
          isPaused: false,
          intervals: [{ startTime: '2026-03-01T10:00:00.000Z', endTime: '2026-03-01T11:00:00.000Z' }]
        },
        {
          id: 'new-1',
          task: 'Novo',
          project: 'Projeto Y',
          tags: ['cli'],
          notes: null,
          startTime: '2026-03-02T10:00:00.000Z',
          endTime: '2026-03-02T11:30:00.000Z',
          duration: 90 * 60 * 1000,
          billable: true,
          hourlyRate: 120,
          isPaused: false,
          intervals: [{ startTime: '2026-03-02T10:00:00.000Z', endTime: '2026-03-02T11:30:00.000Z' }]
        }
      ], null, 2));

      const result = importService.importFromJson(jsonFile);
      expect(result.importedCount).to.equal(1);
      expect(result.skippedCount).to.equal(1);
      expect(storage.loadData().sessions).to.have.length(2);
    });
  });

  it('deve importar CSV do ttrack-cli e do Toggl automaticamente', () => {
    withTempHome(() => {
      const exportCsv = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-import-')), 'export.csv');
      fs.writeFileSync(exportCsv, [
        'id,task,project,startTime,endTime,duration_ms,duration_h',
        '"csv-1","Task CSV","Projeto CSV","2026-03-03T10:00:00.000Z","2026-03-03T11:00:00.000Z",3600000,1.00'
      ].join('\n'));

      const exportResult = importService.importFromCsv(exportCsv);
      expect(exportResult.importedCount).to.equal(1);
      expect(exportResult.skippedCount).to.equal(0);

      const togglCsv = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-import-')), 'toggl.csv');
      fs.writeFileSync(togglCsv, [
        'Description,Project,Billable,Start date,Start time,End date,End time,Tags',
        '"Task Toggl","Projeto Toggl","Yes","03/04/2026","10:00:00","03/04/2026","11:30:00","cli,api"'
      ].join('\n'));

      const togglResult = importService.importFromCsv(togglCsv, { source: 'toggl' });
      expect(togglResult.importedCount).to.equal(1);
      expect(togglResult.skippedCount).to.equal(0);

      const sessions = storage.loadData().sessions;
      expect(sessions).to.have.length(2);
      expect(sessions[0]).to.include({ task: 'Task CSV', project: 'Projeto CSV' });
      expect(sessions[1]).to.include({ task: 'Task Toggl', project: 'Projeto Toggl' });
      expect(sessions[1].tags).to.deep.equal(['cli', 'api']);
    });
  });
});
