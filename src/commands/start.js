import chalk from 'chalk';
import * as timerService from '../services/timerService.js';
import * as templateService from '../services/templateService.js';
import * as idleService from '../services/idleService.js';
import { resolveRepoFromGit, fetchIssueTitle, buildSessionGithubContext } from '../integrations/githubClient.js';
import * as formatter from '../utils/formatter.js';
import * as validator from '../utils/validator.js';
import { getConfig } from '../../config/manager.js';
import { logger } from '../logger/index.js';
import { notifySessionEvent } from '../services/notificationService.js';
import { predictSession } from '../services/aiService.js';

export default async function startCommand(task, options) {
  const cfg = getConfig();
  let resolvedTask = task;
  let resolvedOptions = { ...options };

  // AI Prediction & Auto-categorization
  if (resolvedTask) {
    const prediction = predictSession(resolvedTask);
    if (prediction && prediction.confidence > 0.6) {
      if (!resolvedOptions.project && prediction.suggestedProject) {
        resolvedOptions.project = prediction.suggestedProject;
        console.log(chalk.gray(`💡 Projeto sugerido (auto-aplicado): ${chalk.bold(prediction.suggestedProject)}`));
      }
      if (!resolvedOptions.tags && prediction.suggestedTags.length > 0) {
        resolvedOptions.tags = prediction.suggestedTags.join(',');
        console.log(chalk.gray(`💡 Tags sugeridas: ${chalk.bold(prediction.suggestedTags.join(', '))}`));
      }
      if (prediction.avgDuration > 0) {
        console.log(chalk.gray(`💡 Predição: Você costuma levar ${chalk.bold(prediction.avgDurationStr)} nesta tarefa.`));
      }
    }
  }

  // Apply template if specified (CLI flags take precedence)
  if (options.template) {
    const tmpl = templateService.loadTemplate(options.template);
    resolvedTask = resolvedTask || tmpl.task;
    resolvedOptions.template = options.template;
    if (!resolvedOptions.project && tmpl.project) resolvedOptions.project = tmpl.project;
    if (!resolvedOptions.tags && tmpl.tags?.length) resolvedOptions.tags = tmpl.tags.join(',');
    if (!resolvedOptions.notes && tmpl.notes) resolvedOptions.notes = tmpl.notes;
    if (resolvedOptions.billable === undefined && tmpl.billable !== undefined) {
      resolvedOptions.billable = tmpl.billable;
    }
    if (resolvedOptions.hourlyRate === undefined && tmpl.hourlyRate !== null) {
      resolvedOptions.hourlyRate = tmpl.hourlyRate;
    }
  }

  // GitHub issue title resolution
  if (options.githubIssue) {
    try {
      const repo = resolveRepoFromGit();
      if (repo) {
        const token = cfg.githubToken;
        const title = await fetchIssueTitle(repo.owner, repo.repo, options.githubIssue, token);
        resolvedTask = resolvedTask || `Fix #${options.githubIssue}: ${title}`;
        console.log(chalk.blue(`GitHub Issue #${options.githubIssue}: ${title}`));
      } else {
        console.log(chalk.yellow(`Nao foi possivel detectar o repositorio GitHub.`));
      }
    } catch (err) {
      console.log(chalk.yellow(`Falha ao buscar issue #${options.githubIssue}: ${err.message}`));
    }
  }

  // GitHub context: branch, commit
  const ghContext = buildSessionGithubContext({ issueNumber: options.githubIssue || null });
  if (ghContext) {
    resolvedOptions.githubContext = ghContext;
  }

  const validatedTask = validator.validateTaskName(resolvedTask);
  const session = timerService.startTimer(validatedTask, resolvedOptions);
  notifySessionEvent('start', session);
  const startTimeStr = formatter.formatTime(session.startTime);

  console.log(chalk.green(`Timer iniciado: "${chalk.bold(validatedTask)}" as ${startTimeStr}`));
  if (session.project) {
    console.log(chalk.blue(`Projeto: ${session.project}`));
  }
  if (ghContext?.branch) {
    console.log(chalk.gray(`  branch: ${ghContext.branch}`));
  }

  // Start idle monitor for auto-pause
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
