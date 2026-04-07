import os from 'os';
import path from 'path';

function getHomeDir() {
  return process.env.FTT_HOME || os.homedir();
}

function getXdgConfigHome() {
  return process.env.XDG_CONFIG_HOME || path.join(getHomeDir(), '.config');
}

function getXdgDataHome() {
  return process.env.XDG_DATA_HOME || path.join(getHomeDir(), '.local', 'share');
}

function getWindowsConfigHome() {
  return process.env.APPDATA || path.join(getHomeDir(), 'AppData', 'Roaming');
}

function getWindowsDataHome() {
  return process.env.LOCALAPPDATA || path.join(getHomeDir(), 'AppData', 'Local');
}

function getPlatformConfigBase() {
  if (process.platform === 'win32') return getWindowsConfigHome();
  return getXdgConfigHome();
}

function getPlatformDataBase() {
  if (process.platform === 'win32') return getWindowsDataHome();
  return getXdgDataHome();
}

export function getAppPaths() {
  const appName = 'ttrack-cli';
  const configDir = path.join(getPlatformConfigBase(), appName);
  const dataDir = path.join(getPlatformDataBase(), appName);

  return {
    appName,
    configDir,
    dataDir,
    configFile: path.join(configDir, 'config.json'),
    dataFile: path.join(dataDir, 'sessions.json'),
    dbFile: path.join(dataDir, 'ttrack.db')
  };
}

export function getLegacyRepoDataFile(fromDir) {
  // This is only meaningful when running from a repo checkout or inside node_modules.
  // It lets us adopt the old `./data/sessions.json` if present.
  return path.join(fromDir, 'data', 'sessions.json');
}

