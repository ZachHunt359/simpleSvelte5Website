#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

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
    // Remove surrounding quotes
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

const smtpHost = env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(env.SMTP_PORT || 587);
const smtpUser = env.SMTP_USER;
const smtpPass = env.SMTP_PASS;
const smtpFrom = env.SMTP_FROM || 'no-reply@local';
const to = process.argv[2] || smtpUser || 'test@example.com';

if (!smtpUser || !smtpPass) {
  console.error('SMTP_USER or SMTP_PASS not found in .env; aborting.');
  process.exit(1);
}

console.log('Using SMTP host', smtpHost, 'port', smtpPort, 'user', smtpUser);

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for 587
  requireTLS: smtpPort === 587,
  auth: {
    user: smtpUser,
    pass: smtpPass
  },
  logger: true,
  debug: true
});

async function run() {
  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
  subject: 'Test message from simpleSvelte5Website',
      text: `Test email sent at ${new Date().toISOString()} to ${to}`
    });

    console.log('\n== sendMail result ==');
    console.log('messageId:', info.messageId);
    if (info.envelope) console.log('envelope:', info.envelope);
    if (info.accepted) console.log('accepted:', info.accepted);
    if (info.rejected) console.log('rejected:', info.rejected);
    if (info.response) console.log('response:', info.response);
    // If JSON transport, info.message will contain the raw JSON
    if (info.message) console.log('info.message:', info.message);
    // If nodemailer provides a test URL (ethereal) show it
    if (nodemailer.getTestMessageUrl) {
      const url = nodemailer.getTestMessageUrl(info);
      if (url) console.log('Preview URL:', url);
    }
  } catch (err) {
    console.error('sendMail error:', err && err.message ? err.message : err);
    if (err && err.response) console.error('SMTP response:', err.response);
    process.exit(1);
  }
}

run();
