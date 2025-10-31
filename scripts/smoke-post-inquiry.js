#!/usr/bin/env node
import fetch from 'node-fetch';

async function run() {
  const url = 'http://localhost:5173/api/inquiry';
  const payload = {
    message: 'Smoke test from automated script',
    userId: 'test-user-smoketest',
    pageSentFrom: 'chapter-1/SmokeTest'
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log('status', res.status);
    console.log('body', text);
  } catch (err) {
    console.error('Request failed:', err.message);
    process.exit(1);
  }
}

run();
