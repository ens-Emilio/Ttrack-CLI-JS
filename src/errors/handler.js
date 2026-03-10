import chalk from 'chalk';

import { AppError } from './AppError.js';
import { ERROR_CODES } from './codes.js';
import { logger } from '../logger/index.js';

function isDebug() {
  return process.env.FTT_DEBUG === '1' || process.env.FTT_DEBUG === 'true';
}

function getFriendlyMessage(err) {
  if (err instanceof AppError) return err.message;
  if (err?.message) return err.message;
  return 'Erro inesperado.';
}

function getExitCode(err) {
  if (err instanceof AppError) {
    // Keep it simple; could map codes later.
    return 1;
  }
  return 1;
}

export function handleError(err) {
  const msg = getFriendlyMessage(err);
  const code = err instanceof AppError ? err.code : ERROR_CODES.IO_ERROR;

  // User-facing output.
  console.error(chalk.red(`✖ Erro: ${msg}`));

  // Developer-facing logs.
  logger.error({ code, err }, 'command_failed');

  if (isDebug()) {
    if (err?.stack) console.error(chalk.gray(err.stack));
    if (err instanceof AppError && err.details) {
      console.error(chalk.gray(JSON.stringify(err.details, null, 2)));
    }
  }

  process.exitCode = getExitCode(err);
}

