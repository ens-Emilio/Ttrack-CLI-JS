/**
 * Dry-run support utilities.
 * When --dry-run is active, write operations are skipped and previewed instead.
 */
import chalk from 'chalk';

export class DryRunAbort extends Error {
  constructor() {
    super('Dry-run: operação simulada, nenhum dado foi persistido.');
    this.name = 'DryRunAbort';
  }
}

export function isDryRun() {
  return process.env.FTT_DRY_RUN === '1' || process.env.FTT_DRY_RUN === 'true';
}

/**
 * If dry-run is active, prints the label and preview of what would be written,
 * then throws DryRunAbort to prevent actual persistence.
 */
export function guardWrite(label, data) {
  if (!isDryRun()) return;

  console.log(`\n${chalk.yellow('[DRY-RUN]')} ${label}`);
  console.log(chalk.gray(JSON.stringify(data, null, 2)));
  throw new DryRunAbort();
}
