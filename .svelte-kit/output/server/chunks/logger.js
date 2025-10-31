const __vite_import_meta_env__ = {};
async function logError(msg, meta) {
  if (__vite_import_meta_env__ && true) {
    const mod2 = await import("./logger.server.js");
    return mod2.logError(msg, meta);
  }
  const mod = await import("./logger.client.js");
  return mod.logError(msg, meta);
}
async function logInfo(msg, meta) {
  if (__vite_import_meta_env__ && true) {
    const mod2 = await import("./logger.server.js");
    return mod2.logInfo(msg, meta);
  }
  const mod = await import("./logger.client.js");
  return mod.logInfo(msg, meta);
}
export {
  logError as a,
  logInfo as l
};
