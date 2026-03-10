import chalk from 'chalk';

import * as cfg from '../../config/manager.js';

export function configListCommand() {
  const config = cfg.getConfig();
  console.log(chalk.cyan(JSON.stringify(config, null, 2)));
}

export function configGetCommand(key) {
  const val = cfg.get(key);
  if (key) {
    console.log(val === undefined ? '' : String(val));
  } else {
    console.log(chalk.cyan(JSON.stringify(val, null, 2)));
  }
}

export function configSetCommand(key, value) {
  const next = cfg.set(key, value);
  console.log(chalk.green('✔ Config atualizada.'));
  console.log(chalk.cyan(JSON.stringify(next, null, 2)));
}

export function configResetCommand() {
  const next = cfg.reset();
  console.log(chalk.green('✔ Config resetada para o padrão.'));
  console.log(chalk.cyan(JSON.stringify(next, null, 2)));
}

export function configPathCommand() {
  const paths = cfg.getPaths();
  console.log(chalk.cyan(JSON.stringify(paths, null, 2)));
}

