const adminHeartbeats: Map<string, number> = new Map();

export function touchAdmin(key: string) {
  if (!key) return;
  adminHeartbeats.set(key, Date.now());
}

export function removeAdmin(key: string) {
  if (!key) return;
  adminHeartbeats.delete(key);
}

export function activeAdminsCount(timeoutMs = 30000) {
  const now = Date.now();
  let count = 0;
  for (const [k, ts] of adminHeartbeats.entries()) {
    if (now - ts <= timeoutMs) count++;
    else adminHeartbeats.delete(k);
  }
  return count;
}

export function listActiveAdmins(timeoutMs = 30000) {
  const now = Date.now();
  const out: string[] = [];
  for (const [k, ts] of adminHeartbeats.entries()) {
    if (now - ts <= timeoutMs) out.push(k);
    else adminHeartbeats.delete(k);
  }
  return out;
}

export function clearAll() {
  adminHeartbeats.clear();
}
