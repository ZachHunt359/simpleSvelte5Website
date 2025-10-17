// Wrapper that dispatches to server or client implementation at runtime.
// Import this from shared code to avoid bundling server-only modules into client bundles.

export async function logError(msg: string, meta?: any) {
  // Use Vite's SSR flag so that the client bundle doesn't try to resolve the server module
  if (import.meta.env && import.meta.env.SSR) {
    const mod = await import('./logger.server');
    return mod.logError(msg, meta);
  }
  const mod = await import('./logger.client');
  return mod.logError(msg, meta);
}

export async function logInfo(msg: string, meta?: any) {
  if (import.meta.env && import.meta.env.SSR) {
    const mod = await import('./logger.server');
    return mod.logInfo(msg, meta);
  }
  const mod = await import('./logger.client');
  return mod.logInfo(msg, meta);
}

export default { logError, logInfo };
