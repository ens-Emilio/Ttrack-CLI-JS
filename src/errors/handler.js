import chalk from 'chalk';
import { AppError } from './AppError.js';
import { ERROR_CODES } from './codes.js';
import { logger } from '../logger/index.js';
import { DryRunAbort } from '../utils/dryRun.js';

/**
 * Verifica se o modo debug está ativo.
 */
function isDebug() {
  return process.env.FTT_DEBUG === '1' || process.env.FTT_DEBUG === 'true';
}

/**
 * Mapeia códigos de erro para exit codes do processo.
 * 0: Sucesso
 * 1: Erro de infraestrutura ou inesperado
 * 2: Erro de uso ou input inválido (interação do usuário)
 * 3: Erro de estado interno (concorrência, arquivo ocupado)
 */
function getExitCode(err) {
  if (!(err instanceof AppError)) return 1;

  switch (err.code) {
    case ERROR_CODES.E_INVALID_TASK:
    case ERROR_CODES.E_INVALID_DATE:
    case ERROR_CODES.E_INVALID_INPUT:
    case ERROR_CODES.E_INVALID_CONFIG:
    case ERROR_CODES.E_TIMER_ALREADY_RUNNING:
    case ERROR_CODES.E_NO_ACTIVE_SESSION:
      return 2;
    case ERROR_CODES.E_DATA_CORRUPT:
    case ERROR_CODES.E_CONFIG_CORRUPT:
    case ERROR_CODES.E_IO_ERROR:
      return 3;
    default:
      return 1;
  }
}

/**
 * Centralizador de tratamento de erros do CLI.
 */
export function handleError(err) {
  // DryRunAbort exits cleanly with 0
  if (err instanceof DryRunAbort) {
    console.log(chalk.yellow(`\n[DRY-RUN] ${err.message}`));
    process.exit(0);
  }

  const code = err instanceof AppError ? err.code : ERROR_CODES.E_UNEXPECTED;
  const exitCode = getExitCode(err);

  // User-facing output
  const label = chalk.red(`✖ Erro:`);
  const message = err.message || 'Erro inesperado.';
  
  console.error(`${label} ${message}`);
  
  if (err instanceof AppError && isDebug()) {
    console.error(chalk.gray(`[Código: ${code}]`));
  }

  // Developer-facing logs
  logger.error({ code, err }, 'command_failed');

  if (isDebug()) {
    if (err?.stack) {
      console.error(chalk.gray('\nStack Trace:'));
      console.error(chalk.gray(err.stack));
    }
    if (err instanceof AppError && err.details) {
      console.error(chalk.gray('\nDetalhes:'));
      console.error(chalk.gray(JSON.stringify(err.details, null, 2)));
    }
  }

  // Define o exit code e encerra com segurança
  process.exit(exitCode);
}
