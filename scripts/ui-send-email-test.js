#!/usr/bin/env node
import fetch from 'node-fetch';

async function run() {
  const url = 'http://127.0.0.1:5173/api/inquiry/send-email';
  const payload = {
    id: 3,
    email: 'ZachDHunt@gmail.com',
    message: 'Original message body for UI test',
    reply: 'UI test reply — show messageId in response.'
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log('status', res.status);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('status', res.status);
      console.log('non-json response:', text);
    }
  } catch (err) {
    console.error('request failed:', err.message || err);
    process.exit(1);
  }
}

run();
