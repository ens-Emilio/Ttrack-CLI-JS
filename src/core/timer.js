import crypto from 'crypto';
import { sessionRepository } from './repositories/sessionRepository.js';
import * as calculator from './calculator.js';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/codes.js';

export function startTimer(task, options = {}) {
  const active = sessionRepository.getActive();
  
  if (active) {
    throw new AppError(
      ERROR_CODES.E_TIMER_ALREADY_RUNNING,
      'Já existe um timer em execução. Pare o atual primeiro.'
    );
  }

  const startTime = new Date().toISOString();
  const newSession = {
    id: crypto.randomUUID(),
    task,
    template: options.template || null,
    project: options.project || null,
    tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
    notes: options.notes || null,
    startTime,
    endTime: null,
    duration: 0,
    billable: options.billable !== undefined ? options.billable : true,
    hourlyRate: options.hourlyRate || 0,
    isPaused: false,
    lastActivityAt: startTime,
    githubContext: options.githubContext || null,
    intervals: [
      { startTime, endTime: null }
    ]
  };

  sessionRepository.setActive(newSession);
  return newSession;
}

export function pauseTimer() {
  const active = sessionRepository.getActive();
  
  if (!active) {
    throw new AppError(ERROR_CODES.E_NO_ACTIVE_SESSION, 'Não há nenhum timer em execução.');
  }

  if (active.isPaused) {
    return active; // Já pausado, idempotente
  }

  const session = { ...active, intervals: Array.isArray(active.intervals) ? [...active.intervals] : [] };
  const now = new Date().toISOString();

  // Fecha o intervalo atual (cria um se não existir)
  if (session.intervals.length === 0) {
    session.intervals = [{ startTime: session.startTime, endTime: now }];
  } else {
    const lastInterval = session.intervals[session.intervals.length - 1];
    lastInterval.endTime = now;
  }
  
  session.isPaused = true;
  session.lastActivityAt = now;
  session.duration = calculator.calculateTotalDuration(session);

  sessionRepository.setActive(session);
  return session;
}

export function resumeTimer() {
  const active = sessionRepository.getActive();
  
  if (!active) {
    throw new AppError(ERROR_CODES.E_NO_ACTIVE_SESSION, 'Não há nenhum timer em execução.');
  }

  if (!active.isPaused) {
    return active; // Já em execução, idempotente
  }

  const session = { ...active };
  const now = new Date().toISOString();
  
  // Abre um novo intervalo
  session.intervals.push({ startTime: now, endTime: null });
  session.isPaused = false;
  session.lastActivityAt = now;

  sessionRepository.setActive(session);
  return session;
}

export function stopTimer() {
  const active = sessionRepository.getActive();
  
  if (!active) {
    throw new AppError(ERROR_CODES.E_NO_ACTIVE_SESSION, 'Não há nenhum timer em execução.');
  }

  const session = { ...active, intervals: Array.isArray(active.intervals) ? [...active.intervals] : [] };
  const now = new Date().toISOString();

  // Garante que haja ao menos um intervalo (sessões legadas sem intervals)
  if (session.intervals.length === 0) {
    session.intervals = [{ startTime: session.startTime, endTime: now }];
  } else {
    // Fecha o último intervalo se estiver aberto
    const lastInterval = session.intervals[session.intervals.length - 1];
    if (!lastInterval.endTime) {
      lastInterval.endTime = now;
    }
  }

  session.endTime = now;
  session.isPaused = false;
  session.duration = calculator.calculateTotalDuration(session);

  sessionRepository.completeActive(session);
  
  return session;
}

export function getActiveSession() {
  return sessionRepository.getActive();
}

export function getSessions() {
  return sessionRepository.getAll();
}
