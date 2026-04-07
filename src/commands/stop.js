import chalk from 'chalk';
import * as timerService from '../services/timerService.js';
import * as sessionService from '../services/sessionService.js';
import * as goalService from '../services/goalService.js';
import * as notificationService from '../services/notificationService.js';
import * as idleService from '../services/idleService.js';
import { fireWebhook } from '../integrations/webhookClient.js';
import * as formatter from '../utils/formatter.js';
import { getConfig } from '../../config/manager.js';

export default async function stopCommand() {
  const active = timerService.getActiveSession();

  // Stop idle monitor
  idleService.stopIdleMonitor();

  // Idle detection: check before stopping
  let adjustedEndTime = null;
  if (active) {
    const idleMs = idleService.detectIdleTime(active);
    const thresholdMs = idleService.getIdleThresholdMs();
    if (idleMs > thresholdMs) {
      const nowISO = new Date().toISOString();
      adjustedEndTime = await idleService.promptIdleAction(idleMs, nowISO);
    }
  }

  // Capture goal progress before stop for notification comparison
  const progressBefore = goalService.getGoalProgress();

  const session = timerService.stopTimer();

  // If user chose to remove idle time, update the session end/duration
  if (adjustedEndTime && adjustedEndTime !== new Date().toISOString()) {
    sessionService.updateSession(session.id, { endTime: adjustedEndTime });
    session.duration = new Date(adjustedEndTime) - new Date(session.startTime);
  }

  const durationStr = formatter.formatMsToDuration(session.duration);
  console.log(chalk.green(`✔ Timer finalizado: ${chalk.bold(durationStr)} registrados para "${chalk.bold(session.task)}"`));

  // Desktop notification if goal was just reached
  const progressAfter = goalService.getGoalProgress();
  if (progressBefore.daily.percent < 100 && progressAfter.daily.percent >= 100) {
    await notificationService.notifyGoalReached('daily', progressAfter.daily.goal);
  } else if (progressBefore.weekly.percent < 100 && progressAfter.weekly.percent >= 100) {
    await notificationService.notifyGoalReached('weekly', progressAfter.weekly.goal);
  }

  // Fire-and-forget notifications
  const cfg = getConfig();
  if (cfg.webhookUrl) {
    fireWebhook(cfg.webhookUrl, session, cfg);
    notificationService.notifySessionEvent('stop', session);
  }
}
