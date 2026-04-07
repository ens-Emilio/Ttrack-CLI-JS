import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getAppPaths } from '../constants/paths.js';
import { loadData } from './storage.js';
import { logger } from '../logger/index.js';

let db = null;

export function getDb() {
  if (db) return db;

  const { dataDir, dbFile, dataFile } = getAppPaths();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const shouldMigrate = !fs.existsSync(dbFile) && fs.existsSync(dataFile);

  db = new Database(dbFile);
  db.pragma('journal_mode = WAL');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      task TEXT NOT NULL,
      project TEXT,
      tags TEXT,
      notes TEXT,
      startTime TEXT,
      endTime TEXT,
      duration INTEGER DEFAULT 0,
      billable INTEGER DEFAULT 1,
      hourlyRate REAL DEFAULT 0,
      isPaused INTEGER DEFAULT 0,
      githubContext TEXT,
      intervals TEXT,
      is_active INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      name TEXT PRIMARY KEY,
      hourlyRate REAL,
      clientId TEXT,
      budgetHours REAL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      name TEXT PRIMARY KEY,
      task TEXT NOT NULL,
      project TEXT,
      tags TEXT,
      notes TEXT,
      billable INTEGER DEFAULT 1,
      hourlyRate REAL
    );
  `);

  if (shouldMigrate) {
    migrateFromJsonToSqlite(db);
  }

  return db;
}

function migrateFromJsonToSqlite(db) {
  console.log('📦 Migrando dados do JSON para SQLite...');
  try {
    const data = loadData();

    const insertSession = db.prepare(`
      INSERT INTO sessions (id, task, project, tags, notes, startTime, endTime, duration, billable, hourlyRate, isPaused, githubContext, intervals, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertProject = db.prepare(`
      INSERT INTO projects (name, hourlyRate, clientId, budgetHours)
      VALUES (?, ?, ?, ?)
    `);

    const insertClient = db.prepare(`
      INSERT INTO clients (id, name)
      VALUES (?, ?)
    `);

    const insertTemplate = db.prepare(`
      INSERT INTO templates (name, task, project, tags, notes, billable, hourlyRate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      // Sessions
      if (Array.isArray(data.sessions)) {
        for (const s of data.sessions) {
          insertSession.run(
            s.id, s.task, s.project, JSON.stringify(s.tags || []), s.notes,
            s.startTime, s.endTime, s.duration, s.billable ? 1 : 0, s.hourlyRate,
            s.isPaused ? 1 : 0, JSON.stringify(s.githubContext || null),
            JSON.stringify(s.intervals || []), 0
          );
        }
      }

      // Active Session
      if (data.activeSession) {
        const s = data.activeSession;
        insertSession.run(
          s.id, s.task, s.project, JSON.stringify(s.tags || []), s.notes,
          s.startTime, s.endTime, s.duration, s.billable ? 1 : 0, s.hourlyRate,
          s.isPaused ? 1 : 0, JSON.stringify(s.githubContext || null),
          JSON.stringify(s.intervals || []), 1
        );
      }

      // Projects
      if (Array.isArray(data.projects)) {
        for (const p of data.projects) {
          insertProject.run(p.name, p.hourlyRate, p.clientId, p.budgetHours);
        }
      }

      // Clients
      if (Array.isArray(data.clients)) {
        for (const c of data.clients) {
          insertClient.run(c.id, c.name);
        }
      }

      // Templates
      if (Array.isArray(data.templates)) {
        for (const t of data.templates) {
          insertTemplate.run(
            t.name, t.task, t.project, JSON.stringify(t.tags || []),
            t.notes, t.billable ? 1 : 0, t.hourlyRate
          );
        }
      }
    })();

    console.log('✅ Migração concluída com sucesso!');
    // We keep sessions.json as a backup for now.
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
    logger.error({ err: err.message }, 'migration_failed');
  }
}
