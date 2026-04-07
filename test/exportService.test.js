import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as storage from '../src/core/storage.js';
import * as exportService from '../src/services/exportService.js';
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

describe('Export service', () => {
  it('deve exportar JSON com metadados quando solicitado', () => {
    withTempHome(() => {
      seedData({
        sessions: [
          {
            id: 's1',
            task: 'Task A',
            project: 'Projeto X',
            tags: ['cli'],
            startTime: '2026-03-01T10:00:00.000Z',
            endTime: '2026-03-01T11:00:00.000Z',
            duration: 60 * 60 * 1000,
            billable: true,
            hourlyRate: 0,
            isPaused: false,
            intervals: [{ startTime: '2026-03-01T10:00:00.000Z', endTime: '2026-03-01T11:00:00.000Z' }]
          },
          {
            id: 's2',
            task: 'Task B',
            project: 'Projeto Y',
            tags: ['other'],
            startTime: '2026-03-01T12:00:00.000Z',
            endTime: '2026-03-01T13:00:00.000Z',
            duration: 60 * 60 * 1000,
            billable: true,
            hourlyRate: 0,
            isPaused: false,
            intervals: [{ startTime: '2026-03-01T12:00:00.000Z', endTime: '2026-03-01T13:00:00.000Z' }]
          }
        ]
      });

      const built = exportService.buildExport({
        format: 'json',
        withMeta: true,
        project: 'Projeto X',
        from: '2026-03-01',
        to: '2026-03-01'
      });

      const parsed = JSON.parse(built.content);
      expect(built.metadata).to.include({ format: 'json', totalSessions: 1 });
      expect(built.metadata.filters).to.include({ project: 'Projeto X', from: '2026-03-01', to: '2026-03-01' });
      expect(parsed.metadata.totalSessions).to.equal(1);
      expect(parsed.sessions).to.have.length(1);
      expect(parsed.sessions[0].project).to.equal('Projeto X');
    });
  });

  it('deve exportar CSV com apenas as sessões filtradas por período', () => {
    withTempHome(() => {
      seedData({
        sessions: [
          {
            id: 's1',
            task: 'Task A',
            project: 'Projeto X',
            tags: ['cli'],
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

      const built = exportService.buildExport({
        format: 'csv',
        from: '2026-03-01',
        to: '2026-03-01'
      });

      const lines = built.content.trim().split('\n');
      expect(lines[0]).to.equal('id,task,project,startTime,endTime,duration_ms,duration_h');
      expect(lines).to.have.length(2);
      expect(lines[1]).to.include('"Task A"');
    });
  });
});
