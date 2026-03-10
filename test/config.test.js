import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { getAppPaths } from '../src/constants/paths.js';
import * as cfg from '../config/manager.js';

function withTempHome(fn) {
  const prev = process.env.FTT_HOME;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ftt-home-'));
  process.env.FTT_HOME = tmp;
  try {
    return fn(tmp);
  } finally {
    if (prev === undefined) delete process.env.FTT_HOME;
    else process.env.FTT_HOME = prev;
  }
}

describe('Config manager', () => {
  it('deve mesclar defaults com overrides e persistir set()', () => {
    withTempHome(() => {
      const paths = getAppPaths();

      const initial = cfg.getConfig();
      expect(initial).to.have.property('currency');
      expect(initial).to.have.property('hourlyRate');

      const next = cfg.set('hourlyRate', '150');
      expect(next.hourlyRate).to.equal(150);
      expect(fs.existsSync(paths.configFile)).to.equal(true);

      const reread = cfg.getConfig();
      expect(reread.hourlyRate).to.equal(150);
    });
  });

  it('reset() deve remover o override', () => {
    withTempHome(() => {
      cfg.set('currency', 'usd');
      expect(cfg.getConfig().currency).to.equal('USD');
      const paths = getAppPaths();
      expect(fs.existsSync(paths.configFile)).to.equal(true);

      const reset = cfg.reset();
      expect(fs.existsSync(paths.configFile)).to.equal(false);
      expect(reset.currency).to.equal('BRL'); // default do pacote
    });
  });
});

