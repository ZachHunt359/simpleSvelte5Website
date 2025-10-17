#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import tls from 'tls';

function parseEnv(envText) {
  const lines = envText.split(/\r?\n/);
  const out = {};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const root = path.resolve(process.cwd());
const envPath = path.join(root, '.env');
if (!fs.existsSync(envPath)) {
  console.error('.env file not found at', envPath);
  process.exit(1);
}
const env = parseEnv(fs.readFileSync(envPath, 'utf8'));
const user = env.SMTP_USER;
const pass = env.SMTP_PASS;
if (!user || !pass) {
  console.error('SMTP_USER or SMTP_PASS missing in .env');
  process.exit(1);
}

const host = 'imap.gmail.com';
const port = 993;

function sendCmd(socket, tag, cmd) {
  return new Promise((resolve, reject) => {
    let data = '';
    const onData = (chunk) => {
      data += chunk.toString('utf8');
      // detect tagged response
      if (data.includes(`\r\n${tag} `)) {
        socket.removeListener('data', onData);
        resolve(data);
      }
    };
    socket.on('data', onData);
    socket.write(cmd + '\r\n');
  });
}

function imapLogin(socket, tag) {
  // escape username and password
  const u = user.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const p = pass.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return sendCmd(socket, tag, `${tag} LOGIN "${u}" "${p}"`);
}

async function trySelectSent(socket) {
  const candidates = ['"[Gmail]/Sent Mail"', '"Sent"', '"Sent Items"', '"INBOX.Sent"'];
  for (let i = 0; i < candidates.length; i++) {
    const tag = `ASEL${i}`;
    try {
      const resp = await sendCmd(socket, tag, `${tag} SELECT ${candidates[i]}`);
      if (resp.includes(`${tag} OK`) ) {
        return { folder: candidates[i], resp };
      }
    } catch (e) {
      // continue
    }
  }
  throw new Error('Could not select a Sent folder');
}

function parseSearchIds(resp) {
  // find a line like: * SEARCH 12 34 56
  const m = resp.match(/\* SEARCH ([0-9 ]+)/);
  if (!m) return [];
  return m[1].trim().split(/\s+/).filter(Boolean).map(Number);
}

function parseFetchEnvelope(resp) {
  // naive parse: find ENVELOPE ( ... ) and extract SUBJECT and MESSAGE-ID and TO
  const envMatch = resp.match(/ENVELOPE \(([^\)]*)\)/s);
  if (!envMatch) return null;
  const env = envMatch[1];
  // ENVELOPE structure: "subject" date "from" "sender" "reply-to" "to" "cc" "bcc" "in-reply-to" "message-id"
  // split top-level quoted strings (very naive)
  const parts = [];
  let cur = '';
  let inq = false;
  for (let i = 0; i < env.length; i++) {
    const ch = env[i];
    if (ch === '"') {
      if (!inq) { inq = true; cur = ''; continue; }
      else { inq = false; parts.push(cur); cur = ''; continue; }
    }
    if (inq) cur += ch;
  }
  // last items: to can be NIL or a list; message-id is last quoted
  const subject = parts[0] || '';
  const messageId = parts[parts.length - 1] || '';
  return { subject, messageId };
}

async function main() {
  console.log('Connecting to IMAP', host, port);
  const socket = tls.connect(port, host, { servername: host });
  await new Promise((res, rej) => socket.once('connect', res));
  // read initial greeting
  let initial = '';
  await new Promise((resolve) => {
    const onData = (chunk) => { initial += chunk.toString('utf8'); if (initial.includes('\r\n')) { socket.removeListener('data', onData); resolve(); } };
    socket.on('data', onData);
  });
  console.log('Server greeting:', initial.split('\r\n')[0]);

  const loginResp = await imapLogin(socket, 'A001');
  if (!loginResp.includes('A001 OK')) {
    console.error('Login failed:', loginResp);
    socket.end();
    process.exit(1);
  }
  console.log('Logged in as', user);

  const { folder } = await trySelectSent(socket);
  console.log('Selected Sent folder:', folder);

  const targets = ['Khayyin359@gmail.com', 'ZachDHunt@gmail.com'];
  for (const t of targets) {
    const tag = `ASEARCH${t.replace(/[^A-Za-z0-9]/g,'')}`;
    const searchCmd = `${tag} SEARCH TO "${t}"`;
    const searchResp = await sendCmd(socket, tag, searchCmd);
    const ids = parseSearchIds(searchResp);
    console.log(`\nSearch results for ${t}: ${ids.length} messages`);
    if (ids.length > 0) {
      // fetch envelope for each id
      const max = Math.min(ids.length, 10);
      for (let i = 0; i < max; i++) {
        const id = ids[i];
        const ftag = `AFETCH${id}`;
        const fetchResp = await sendCmd(socket, ftag, `${ftag} FETCH ${id} (ENVELOPE)`);
        const env = parseFetchEnvelope(fetchResp);
        console.log('UID', id, 'subject:', env?.subject, 'message-id:', env?.messageId);
      }
    }
  }

  socket.end();
}

main().catch(err => { console.error('IMAP check failed:', err); process.exit(1); });
