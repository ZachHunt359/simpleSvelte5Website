#!/usr/bin/env node
import http from 'http';

async function post() {
  const data = JSON.stringify({ email: 'test@example.local', message: 'smoke test after DB fix', userId: 'smoke-user' });
  const opts = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/inquiry',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(opts, (res) => {
    let body = '';
    res.on('data', (c) => body += c.toString());
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      try { console.log('Body:', JSON.parse(body)); } catch (e) { console.log('Body:', body); }
      process.exit(res.statusCode >= 400 ? 2 : 0);
    });
  });

  req.on('error', (e) => { console.error('Request error:', e && e.message); process.exit(3); });
  req.write(data);
  req.end();
}

post();
