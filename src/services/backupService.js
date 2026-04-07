import fs from 'fs';
import path from 'path';
import { getAppPaths } from '../constants/paths.js';
import { sessionRepository } from '../core/repositories/sessionRepository.js';
import { projectRepository } from '../core/repositories/projectRepository.js';
import { clientRepository } from '../core/repositories/clientRepository.js';
import { templateRepository } from '../core/repositories/templateRepository.js';
import { getConfig } from '../../config/manager.js';

export function createBackup(outputPath) {
  const { configFile } = getAppPaths();
  const cfg = getConfig();

  const backupData = {
    version: 2, // New version for SQLite support
    exportedAt: new Date().toISOString(),
    schemaVersion: 4,
    data: {
      sessions: sessionRepository.getAll(),
      activeSession: sessionRepository.getActive(),
      projects: projectRepository.getAll(),
      clients: clientRepository.getAll(),
      templates: templateRepository.getAll()
    },
    config: {}
  };

  if (fs.existsSync(configFile)) {
    backupData.config.user = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  }

  backupData.config.defaults = cfg;

  const content = JSON.stringify(backupData, null, 2);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = outputPath ? path.resolve(process.cwd(), outputPath) : path.resolve(process.cwd(), `ttrack-backup-${timestamp}.json`);
  
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, content);
  
  return { file: filename, size: content.length };
}

export function restoreBackup(backupFilePath) {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Arquivo de backup não encontrado: ${backupFilePath}`);
  }

  const raw = fs.readFileSync(backupFilePath, 'utf8');
  let backup;
  try {
    backup = JSON.parse(raw);
  } catch {
    throw new Error('Arquivo de backup inválido: JSON malformado.');
  }

  const { dataFile, configFile, dbFile } = getAppPaths();
  const restored = [];

  // Write to sessions.json (legacy format used for migration)
  const legacyData = {
    schemaVersion: backup.schemaVersion || 4,
    sessions: backup.data.sessions || [],
    activeSession: backup.data.activeSession || null,
    projects: backup.data.projects || [],
    clients: backup.data.clients || [],
    templates: backup.data.templates || []
  };

  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(legacyData, null, 2));
  restored.push('sessions.json');

  // DELETE current SQLite DB to force re-migration on next run
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
    restored.push('ttrack.db (re-migrated)');
  }

  if (backup.config?.user && typeof backup.config.user === 'object') {
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify(backup.config.user, null, 2));
    restored.push('config.json');
  }

  return {
    version: backup.version,
    exportedAt: backup.exportedAt,
    schemaVersion: backup.schemaVersion,
    restored
  };
}
