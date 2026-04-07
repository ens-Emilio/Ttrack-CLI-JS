import { getDb } from '../sqliteStorage.js';

function mapRowToSession(row) {
  if (!row) return null;
  const { is_active, ...session } = row;
  return {
    ...session,
    tags: JSON.parse(row.tags || '[]'),
    githubContext: JSON.parse(row.githubContext || 'null'),
    intervals: JSON.parse(row.intervals || '[]'),
    billable: !!row.billable,
    isPaused: !!row.isPaused
  };
}

class SessionRepository {
  getAll() {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM sessions WHERE is_active = 0 ORDER BY startTime DESC').all();
    return rows.map(mapRowToSession);
  }

  getActive() {
    const db = getDb();
    const row = db.prepare('SELECT * FROM sessions WHERE is_active = 1').get();
    return mapRowToSession(row);
  }

  setActive(session) {
    const db = getDb();
    db.transaction(() => {
      db.prepare('DELETE FROM sessions WHERE is_active = 1').run();
      if (session) {
        db.prepare(`
          INSERT INTO sessions (id, task, project, tags, notes, startTime, endTime, duration, billable, hourlyRate, isPaused, githubContext, intervals, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          session.id, session.task, session.project, JSON.stringify(session.tags || []),
          session.notes, session.startTime, session.endTime, session.duration,
          session.billable ? 1 : 0, session.hourlyRate, session.isPaused ? 1 : 0,
          JSON.stringify(session.githubContext || null), JSON.stringify(session.intervals || [])
        );
      }
    })();
  }

  completeActive(completedSession) {
    const db = getDb();
    db.transaction(() => {
      db.prepare('DELETE FROM sessions WHERE is_active = 1').run();
      this.add(completedSession);
    })();
  }

  add(s) {
    const db = getDb();
    db.prepare(`
      INSERT INTO sessions (id, task, project, tags, notes, startTime, endTime, duration, billable, hourlyRate, isPaused, githubContext, intervals, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      s.id, s.task, s.project, JSON.stringify(s.tags || []), s.notes,
      s.startTime, s.endTime, s.duration, s.billable ? 1 : 0, s.hourlyRate,
      s.isPaused ? 1 : 0, JSON.stringify(s.githubContext || null),
      JSON.stringify(s.intervals || [])
    );
  }

  update(id, updates) {
    const db = getDb();
    const current = db.prepare('SELECT * FROM sessions WHERE id = ?').get();
    if (!current) return false;

    const session = mapRowToSession(current);
    const updated = { ...session, ...updates };

    db.prepare(`
      UPDATE sessions SET
        task = ?, project = ?, tags = ?, notes = ?, startTime = ?, endTime = ?,
        duration = ?, billable = ?, hourlyRate = ?, isPaused = ?,
        githubContext = ?, intervals = ?
      WHERE id = ?
    `).run(
      updated.task, updated.project, JSON.stringify(updated.tags || []),
      updated.notes, updated.startTime, updated.endTime, updated.duration,
      updated.billable ? 1 : 0, updated.hourlyRate, updated.isPaused ? 1 : 0,
      JSON.stringify(updated.githubContext || null), JSON.stringify(updated.intervals || []),
      id
    );
    return true;
  }

  delete(id) {
    const db = getDb();
    const result = db.prepare('DELETE FROM sessions WHERE id = ? AND is_active = 0').run();
    return result.changes > 0;
  }

  getMetadata() {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE is_active = 0').get().count;
    return {
      schemaVersion: 'sqlite-v1',
      totalSessions: count
    };
  }
}

export const sessionRepository = new SessionRepository();
