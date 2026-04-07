import chalk from 'chalk';
import * as timerService from '../services/timerService.js';
import * as idleService from '../services/idleService.js';
import * as formatter from '../utils/formatter.js';
import { logger } from '../logger/index.js';

export default function resumeCommand() {
  const session = timerService.resumeTimer();
  console.log(chalk.green(`Timer retomado: ${chalk.bold(session.task)}`));
  console.log(`${chalk.gray('Duracao anterior:')} ${formatter.formatMsToDuration(session.duration)}`);

  idleService.startIdleMonitor(session, (idleMs, sess) => {
    try {
      idleService.pauseForIdle(idleMs);
      logger.info({ idleMs, sessionId: sess.id }, 'auto_paused_idle');
      idleService.fireIdleWebhook(idleMs, sess);
    } catch (err) {
      logger.warn({ err: err.message }, 'idle_auto_pause_failed');
    }
  });
}
