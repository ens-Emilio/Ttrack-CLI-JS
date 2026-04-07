import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as cfg from '../config/manager.js';
import startCommand from '../src/commands/start.js';
import {
  templateDeleteCommand,
  templateListCommand,
  templateSaveCommand,
  templateShowCommand
} from '../src/commands/template.js';
import {
  configGetCommand,
  configListCommand,
  configPathCommand,
  configResetCommand,
  configSetCommand
} from '../src/commands/config.js';
import { getAppPaths } from '../src/constants/paths.js';
import * as storage from '../src/core/storage.js';
import * as templateService from '../src/services/templateService.js';

async function withTempHome(fn) {
  const prevHome = process.env.FTT_HOME;
  const prevDisable = process.env.FTT_DISABLE_LEGACY_ADOPT;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-home-'));
  process.env.FTT_HOME = tmp;
  process.env.FTT_DISABLE_LEGACY_ADOPT = '1';
  try {
    return await fn(tmp);
  } finally {
    if (prevHome === undefined) delete process.env.FTT_HOME;
    else process.env.FTT_HOME = prevHome;
    if (prevDisable === undefined) delete process.env.FTT_DISABLE_LEGACY_ADOPT;
    else process.env.FTT_DISABLE_LEGACY_ADOPT = prevDisable;
  }
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

describe('Template and config commands', () => {
  it('deve salvar, listar, exibir e aplicar templates no start', async () => {
    await withTempHome(async () => {
      cfg.set('currency', 'BRL');

      const template = templateService.saveTemplate('Foco', {
        task: 'Sessão foco',
        project: 'Projeto X',
        tags: 'alpha, beta, , ',
        notes: 'Notas do template',
        billable: false,
        hourlyRate: 125
      });

      expect(template.tags).to.deep.equal(['alpha', 'beta']);

      const list = await captureLogs(() => templateListCommand());
      expect(list.logs.join('\n')).to.include('Foco');
      expect(list.logs.join('\n')).to.include('Sessão foco');
      expect(list.logs.join('\n')).to.include('Projeto X');
      expect(list.logs.join('\n')).to.match(/125,00/);

      const show = await captureLogs(() => templateShowCommand('Foco'));
      expect(show.logs.join('\n')).to.include('Template: Foco');
      expect(show.logs.join('\n')).to.include('Valor/hora:');
      expect(show.logs.join('\n')).to.include('Faturável:');
      expect(show.logs.join('\n')).to.include('Não');

      const start = await captureLogs(() => startCommand('', { template: 'Foco' }));
      expect(start.logs.join('\n')).to.include('Timer iniciado');
      expect(start.logs.join('\n')).to.include('Projeto: Projeto X');
      const persisted = storage.loadData().activeSession;
      expect(persisted.task).to.equal('Sessão foco');
      expect(persisted.template).to.equal('Foco');
      expect(persisted.project).to.equal('Projeto X');
      expect(persisted.tags).to.deep.equal(['alpha', 'beta']);
      expect(persisted.notes).to.equal('Notas do template');
      expect(persisted.billable).to.equal(false);
      expect(persisted.hourlyRate).to.equal(125);
    });
  });

  it('deve atualizar e resetar config via comandos', async () => {
    await withTempHome(async () => {
      const paths = getAppPaths();

      const listed = await captureLogs(() => configListCommand());
      expect(listed.logs.join('\n')).to.include('currency');

      const updated = await captureLogs(() => configSetCommand('hourlyRate', '150'));
      expect(updated.logs.join('\n')).to.include('Config atualizada');
      expect(updated.logs.join('\n')).to.include('150');
      expect(cfg.getConfig().hourlyRate).to.equal(150);
      expect(fs.existsSync(paths.configFile)).to.equal(true);

      const got = await captureLogs(() => configGetCommand('hourlyRate'));
      expect(got.logs.join('\n')).to.equal('150');

      const pathOutput = await captureLogs(() => configPathCommand());
      expect(pathOutput.logs.join('\n')).to.include(paths.configFile);

      const reset = await captureLogs(() => configResetCommand());
      expect(reset.logs.join('\n')).to.include('Config resetada para o padrão');
      expect(cfg.getConfig().hourlyRate).to.equal(0);
      expect(fs.existsSync(paths.configFile)).to.equal(false);
    });
  });
});
