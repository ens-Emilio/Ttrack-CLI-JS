import inquirer from 'inquirer';
import { getConfig } from '../../config/manager.js';
import { logger } from '../logger/index.js';
import { fireWebhook } from '../integrations/webhookClient.js';
import * as timerCore from '../core/timer.js';

export function detectIdleTime(session) {
  if (!session?.lastActivityAt) return 0;
  return Date.now() - new Date(session.lastActivityAt).getTime();
}

export async function promptIdleAction(idleMs, sessionEndTime) {
  const idleMinutes = Math.round(idleMs / 60000);
  const adjustedEnd = new Date(new Date(sessionEndTime).getTime() - idleMs).toISOString();

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: `Detectado ${idleMinutes} min de inatividade. O que fazer?`,
      choices: [
        { name: `Remover tempo idle (termina ${idleMinutes} min antes)`, value: 'remove' },
        { name: `Manter tempo integral`, value: 'keep' }
      ]
    }
  ]);

  return action === 'remove' ? adjustedEnd : sessionEndTime;
}

export function getIdleThresholdMs() {
  const cfg = getConfig();
  const minutes = cfg.idleThresholdMinutes ?? 5;
  return minutes * 60 * 1000;
}

let _idleMonitor = null;

export function startIdleMonitor(session, onIdle) {
  stopIdleMonitor();
  const thresholdMs = getIdleThresholdMs();
  if (thresholdMs <= 0) return;

  _idleMonitor = setInterval(() => {
    const idleMs = detectIdleTime(session);
    if (idleMs >= thresholdMs) {
      logger.info({ idleMs, thresholdMs, sessionId: session.id }, 'idle_detected');
      stopIdleMonitor();
      if (typeof onIdle === 'function') {
        onIdle(idleMs, session);
      }
    }
  }, Math.min(thresholdMs / 2, 60000));
}

export function stopIdleMonitor() {
  if (_idleMonitor) {
    clearInterval(_idleMonitor);
    _idleMonitor = null;
  }
}

export function pauseForIdle(idleMs) {
  const active = timerCore.getActiveSession();
  if (!active || active.isPaused) return;
  timerCore.pauseTimer();
}

export function fireIdleWebhook(idleMs, session) {
  const cfg = getConfig();
  if (!cfg.webhookUrl) return;

  fireWebhook(cfg.webhookUrl, {
    ...session,
    idleMs,
    idleMinutes: Math.round(idleMs / 60000),
    event: 'session.idle'
  }, cfg);

  logger.info({ idleMs, sessionId: session.id }, 'idle_webhook_fired');
}
