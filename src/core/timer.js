import crypto from 'crypto';
import * as storage from './storage.js';
import * as calculator from './calculator.js';

export function startTimer(task, options = {}) {
  const data = storage.loadData();
  
  if (data.activeSession) {
    throw new Error('Já existe um timer em execução. Pare o atual primeiro.');
  }

  const newSession = {
    id: crypto.randomUUID(),
    task,
    project: options.project || null,
    tags: options.tags ? options.tags.split(',') : [],
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
    billable: options.billable !== undefined ? options.billable : true,
    hourlyRate: options.hourlyRate || 0
  };

  data.activeSession = newSession;
  storage.saveData(data);
  return newSession;
}

export function stopTimer() {
  const data = storage.loadData();
  
  if (!data.activeSession) {
    throw new Error('Não há nenhum timer em execução.');
  }

  const session = data.activeSession;
  session.endTime = new Date().toISOString();
  session.duration = calculator.calculateDuration(session.startTime, session.endTime);

  data.sessions.push(session);
  data.activeSession = null;
  storage.saveData(data);
  
  return session;
}

export function getActiveSession() {
  const data = storage.loadData();
  return data.activeSession;
}

export function getSessions() {
  const data = storage.loadData();
  return data.sessions;
}
