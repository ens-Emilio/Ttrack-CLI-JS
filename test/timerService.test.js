import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { AppError } from '../src/errors/AppError.js';
import { ERROR_CODES } from '../src/errors/codes.js';
import { getAppPaths } from '../src/constants/paths.js';
import * as cfg from '../config/manager.js';
import * as timerService from '../src/services/timerService.js';
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

describe('Timer service', () => {
  it('deve aplicar hourlyRate default da config quando não informado', () => {
    withTempHome(() => {
      cfg.set('hourlyRate', 123);
      const session = timerService.startTimer('Tarefa', { project: 'P1' });
      expect(session.hourlyRate).to.equal(123);
      timerService.stopTimer();
    });
  });

  it('deve lançar TIMER_ACTIVE ao tentar iniciar com timer já ativo', () => {
    withTempHome(() => {
      timerService.startTimer('Tarefa');
      expect(() => timerService.startTimer('Outra')).to.throw(AppError).that.satisfies(err => err.code === ERROR_CODES.TIMER_ACTIVE);
      timerService.stopTimer();
    });
  });

  it('deve lançar NO_ACTIVE_TIMER ao parar sem timer ativo', () => {
    withTempHome(() => {
      // Ensure empty data file exists for the test isolation.
      const paths = getAppPaths();
      fs.mkdirSync(path.dirname(paths.dataFile), { recursive: true });
      storage.saveData({ schemaVersion: 1, sessions: [], activeSession: null });

      expect(() => timerService.stopTimer()).to.throw(AppError).that.satisfies(err => err.code === ERROR_CODES.NO_ACTIVE_TIMER);
    });
  });
});
