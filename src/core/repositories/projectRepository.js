import { getDb } from '../sqliteStorage.js';

class ProjectRepository {
  getAll() {
    const db = getDb();
    return db.prepare('SELECT * FROM projects').all();
  }

  findByName(name) {
    const db = getDb();
    return db.prepare('SELECT * FROM projects WHERE name = ?').get() || null;
  }

  add(project) {
    const db = getDb();
    db.prepare('INSERT INTO projects (name, hourlyRate, clientId, budgetHours) VALUES (?, ?, ?, ?)').run(
      project.name, project.hourlyRate, project.clientId, project.budgetHours
    );
  }

  update(name, updates) {
    const db = getDb();
    const current = db.prepare('SELECT * FROM projects WHERE name = ?').get();
    if (!current) return false;

    const updated = { ...current, ...updates };
    db.prepare('UPDATE projects SET hourlyRate = ?, clientId = ?, budgetHours = ? WHERE name = ?').run(
      updated.hourlyRate, updated.clientId, updated.budgetHours, name
    );
    return true;
  }

  delete(name) {
    const db = getDb();
    const result = db.prepare('DELETE FROM projects WHERE name = ?').run();
    return result.changes > 0;
  }
}

export const projectRepository = new ProjectRepository();
