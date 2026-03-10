function levelToNum(level) {
  switch (level) {
    case 'debug':
      return 10;
    case 'info':
      return 20;
    case 'warn':
      return 30;
    case 'error':
      return 40;
    default:
      return 30;
  }
}

const currentLevel = levelToNum(process.env.FTT_LOG_LEVEL || 'warn');

function write(level, obj, msg) {
  if (levelToNum(level) < currentLevel) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...obj
  };
  // Keep logs off stdout so CLI output stays clean.
  process.stderr.write(`${JSON.stringify(line)}\n`);
}

export const logger = {
  debug(obj, msg) {
    write('debug', obj || {}, msg || 'debug');
  },
  info(obj, msg) {
    write('info', obj || {}, msg || 'info');
  },
  warn(obj, msg) {
    write('warn', obj || {}, msg || 'warn');
  },
  error(obj, msg) {
    write('error', obj || {}, msg || 'error');
  }
};

