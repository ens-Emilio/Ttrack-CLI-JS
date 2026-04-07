import { getDb } from '../sqliteStorage.js';
import crypto from 'crypto';

class ClientRepository {
  getAll() {
    const db = getDb();
    return db.prepare('SELECT * FROM clients').all();
  }

  findByName(name) {
    const db = getDb();
    return db.prepare('SELECT * FROM clients WHERE name = ?').get() || null;
  }

  findById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM clients WHERE id = ?').get() || null;
  }

  add(client) {
    const db = getDb();
    const newClient = { id: crypto.randomUUID(), ...client };
    db.prepare('INSERT INTO clients (id, name) VALUES (?, ?)').run(newClient.id, newClient.name);
    return newClient;
  }

  delete(name) {
    const db = getDb();
    const result = db.prepare('DELETE FROM clients WHERE name = ?').run();
    return result.changes > 0;
  }
}

export const clientRepository = new ClientRepository();
