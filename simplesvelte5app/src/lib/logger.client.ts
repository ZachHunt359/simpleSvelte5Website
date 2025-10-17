export function writeLog(entry: { level?: string; msg: string; meta?: any }) {
  // Minimal client-side behavior: print to console. Avoid sending sensitive data.
  const level = entry.level || 'info';
  try {
    if (level === 'error') console.error('[client-log]', entry.msg, entry.meta ?? '');
    else console.log('[client-log]', entry.msg, entry.meta ?? '');
  } catch (e) {
    // swallow
  }
}

export function logError(msg: string, meta?: any) {
  writeLog({ level: 'error', msg, meta });
}

export function logInfo(msg: string, meta?: any) {
  writeLog({ level: 'info', msg, meta });
}

export default { writeLog, logError, logInfo };
