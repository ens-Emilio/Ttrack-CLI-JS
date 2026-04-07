import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';
import { logger } from '../logger/index.js';

/**
 * Fire-and-forget POST webhook with session data.
 * @param {string} url Webhook URL
 * @param {Object} session Completed session
 * @param {Object} cfg App config
 */
export function fireWebhook(url, session, cfg = {}) {
  if (!url) return;

  const payload = {
    event: 'session.completed',
    session: {
      id: session.id,
      task: session.task,
      project: session.project,
      tags: session.tags,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      billable: session.billable,
      hourlyRate: session.hourlyRate
    },
    timestamp: new Date().toISOString()
  };

  // Fire and forget — do not await
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(err => {
    logger.warn({ url, err: err.message }, 'webhook_failed');
  });
}
