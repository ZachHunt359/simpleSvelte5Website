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
  const u = user.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const p = pass.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return sendCmd(socket, tag, `${tag} LOGIN "${u}" "${p}"`);
}

async function selectSent(socket) {
  const tag = `A001`;
  const resp = await sendCmd(socket, tag, `${tag} SELECT "[Gmail]/Sent Mail"`);
  if (resp.includes(`${tag} OK`)) return resp;
  // fallback
  const tag2 = `A002`;
  const resp2 = await sendCmd(socket, tag2, `${tag2} SELECT "Sent"`);
  if (resp2.includes(`${tag2} OK`)) return resp2;
  throw new Error('Could not select Sent folder');
}

function extractHeaderFromFetch(resp) {
  // Look for the literal block after {<num>}\r\n
  const m = resp.match(/\{(\d+)\}\r\n([\s\S]*?)\r\n\)/);
  if (m) return m[2];
  // fallback: try to find between FETCH and tagged end
  const m2 = resp.match(/\* \d+ FETCH[\s\S]*?\r\n([\s\S]*?)\r\n[A-Z0-9]+ OK/s);
  if (m2) return m2[1];
  return resp;
}

async function main() {
  const uids = process.argv.slice(2).map(s => Number(s)).filter(Boolean);
  if (!uids.length) {
    console.error('Usage: node fetch-headers-imap.js <uid1> [uid2 ...]');
    process.exit(1);
  }

  console.log('Connecting to IMAP', host, port);
  const socket = tls.connect(port, host, { servername: host });
  await new Promise((res) => socket.once('connect', res));
  // read greeting
  await new Promise((resolve) => {
    const onData = (chunk) => { socket.removeListener('data', onData); resolve(); };
    socket.on('data', onData);
  });

  const loginResp = await imapLogin(socket, 'L001');
  if (!loginResp.includes('L001 OK')) {
    console.error('Login failed:', loginResp);
    socket.end();
    process.exit(1);
  }
  console.log('Logged in as', user);

  await selectSent(socket);
  console.log('Selected Sent folder');

  for (const uid of uids) {
    const tag = `F${uid}`;
    console.log('\nFetching headers for UID', uid);
    const resp = await sendCmd(socket, tag, `${tag} FETCH ${uid} (BODY.PEEK[HEADER])`);
    const header = extractHeaderFromFetch(resp);
    console.log('---- HEADERS START ----');
    console.log(header.trim());
    console.log('---- HEADERS END ----');
  }

  socket.end();
}

main().catch(err => { console.error('Error fetching headers:', err); process.exit(1); });
