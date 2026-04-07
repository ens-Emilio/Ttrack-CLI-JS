import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as cfg from '../config/manager.js';
import * as storage from '../src/core/storage.js';
import * as clientService from '../src/services/clientService.js';
import * as projectService from '../src/services/projectService.js';
import { clientListCommand } from '../src/commands/client.js';
import { projectListCommand } from '../src/commands/project.js';
import { getAppPaths } from '../src/constants/paths.js';
import { AppError } from '../src/errors/AppError.js';
import { ERROR_CODES } from '../src/errors/codes.js';

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

function captureLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    fn();
    return logs;
  } finally {
    console.log = originalLog;
  }
}

describe('Project and client commands', () => {
  it('deve listar projetos vinculados a clientes', () => {
    withTempHome(() => {
      cfg.set('currency', 'BRL');
      const client = clientService.addClient('Cliente Alpha');
      projectService.setProjectRate('App', 120);
      projectService.setProjectBudget('App', 40);
      projectService.setProjectClient('App', client.id);

      const clientOutput = captureLogs(() => clientListCommand()).join('\n');
      const projectOutput = captureLogs(() => projectListCommand()).join('\n');

      expect(clientOutput).to.include('Cliente Alpha');
      expect(projectOutput).to.include('App');
      expect(projectOutput).to.include('40h');
      expect(projectOutput).to.include('Cliente Alpha');
    });
  });

  it('deve impedir a remoção de cliente referenciado por projeto', () => {
    withTempHome(() => {
      const client = clientService.addClient('Cliente Beta');
      projectService.setProjectRate('Site', 100);
      projectService.setProjectClient('Site', client.id);

      expect(() => clientService.deleteClient('Cliente Beta'))
        .to.throw(AppError)
        .that.satisfies(err => err.code === ERROR_CODES.E_INVALID_INPUT);
    });
  });
});
