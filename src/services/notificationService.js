import chalk from 'chalk';
import { fireWebhook } from '../integrations/webhookClient.js';
import { getConfig } from '../../config/manager.js';
import * as timerService from './timerService.js';
import { logger } from '../logger/index.js';

/**
 * Service to handle notification events to Discord/Slack.
 */
export function notifySessionEvent(event, session) {
  const cfg = getConfig();
  const webhookUrl = cfg.webhookUrl || process.env.FTT_WEBHOOK_URL;

  if (!webhookUrl) return;

  const isDiscord = webhookUrl.includes('discord.com');
  const isSlack = webhookUrl.includes('slack.com');

  let payload = {};

  if (isDiscord) {
    payload = {
      username: 'TTrack CLI',
      embeds: [{
        title: `Evento: ${event}`,
        description: `**Tarefa:** ${session.task}\n**Projeto:** ${session.project || 'Nenhum'}\n**Duração:** ${session.duration ? (session.duration / 3600000).toFixed(2) + 'h' : 'Iniciada'}`,
        color: event === 'start' ? 5763719 : 15158332, // Green for start, Red for stop
        timestamp: new Date().toISOString()
      }]
    };
  } else if (isSlack) {
    payload = {
      text: `*TTrack CLI Notification*\n*Evento:* ${event}\n*Tarefa:* ${session.task}\n*Projeto:* ${session.project || 'Nenhum'}`
    };
  } else {
    // Generic webhook
    payload = { event, session, timestamp: new Date().toISOString() };
  }

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(err => {
    logger.warn({ webhookUrl, err: err.message }, 'notification_failed');
  });
}
