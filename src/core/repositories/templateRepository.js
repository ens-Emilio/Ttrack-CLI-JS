import { getDb } from '../sqliteStorage.js';

function mapRowToTemplate(row) {
  if (!row) return null;
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    billable: !!row.billable
  };
}

class TemplateRepository {
  getAll() {
    const db = getDb();
    return db.prepare('SELECT * FROM templates').all().map(mapRowToTemplate);
  }

  findByName(name) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM templates WHERE name = ?').get();
    return mapRowToTemplate(row);
  }

  save(template) {
    const db = getDb();
    db.prepare(`
      INSERT INTO templates (name, task, project, tags, notes, billable, hourlyRate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        task = excluded.task,
        project = excluded.project,
        tags = excluded.tags,
        notes = excluded.notes,
        billable = excluded.billable,
        hourlyRate = excluded.hourlyRate
    `).run(
      template.name, template.task, template.project, JSON.stringify(template.tags || []),
      template.notes, template.billable ? 1 : 0, template.hourlyRate
    );
  }

  delete(name) {
    const db = getDb();
    const result = db.prepare('DELETE FROM templates WHERE name = ?').run();
    return result.changes > 0;
  }
}

export const templateRepository = new TemplateRepository();
