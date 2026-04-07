import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { AppError } from '../src/errors/AppError.js';
import { ERROR_CODES } from '../src/errors/codes.js';
import { getAppPaths } from '../src/constants/paths.js';
import * as storage from '../src/core/storage.js';

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

describe('Storage', () => {
  it('deve migrar automaticamente dados v0 (sem schemaVersion) para a versão atual e persistir', () => {
    withTempHome(() => {
      const { dataFile } = getAppPaths();
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });

      const v0 = {
        sessions: [],
        activeSession: null
      };
      fs.writeFileSync(dataFile, JSON.stringify(v0, null, 2));

      const loaded = storage.loadData();
      expect(loaded.schemaVersion).to.equal(4);
      expect(loaded.projects).to.deep.equal([]);
      expect(loaded.clients).to.deep.equal([]);
      expect(loaded.templates).to.deep.equal([]);

      const reread = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      expect(reread.schemaVersion).to.equal(4);
    });
  });

  it('deve lançar AppError(DATA_CORRUPT) para JSON inválido', () => {
    withTempHome(() => {
      const { dataFile } = getAppPaths();
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });
      fs.writeFileSync(dataFile, '{invalid');

      expect(() => storage.loadData()).to.throw(AppError).that.satisfies(err => err.code === ERROR_CODES.DATA_CORRUPT);
    });
  });
});
