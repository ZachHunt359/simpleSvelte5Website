function writeLog(entry) {
  const level = entry.level || "info";
  try {
    if (level === "error") console.error("[client-log]", entry.msg, entry.meta ?? "");
    else console.log("[client-log]", entry.msg, entry.meta ?? "");
  } catch (e) {
  }
}
function logError(msg, meta) {
  writeLog({ level: "error", msg, meta });
}
function logInfo(msg, meta) {
  writeLog({ level: "info", msg, meta });
}
export {
  logError,
  logInfo,
  writeLog
};
