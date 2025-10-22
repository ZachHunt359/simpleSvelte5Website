#!/usr/bin/env node
// End-to-end HTTP test for the /login action using a known email/password.
// Starts from the assumption the dev server is already running (vite dev or your deployed server).
// Usage (PowerShell):
//   node scripts/test-login-http.js http://localhost:5173 test.admin@example.com Password123!

const base = process.argv[2] || 'http://localhost:5173';
const email = (process.argv[3] || '').trim().toLowerCase();
const password = process.argv[4] || '';

if (!email || !password) {
  console.error('Usage: node scripts/test-login-http.js <baseUrl> <email> <password>');
  process.exit(1);
}

function formEncode(obj) {
  return Object.entries(obj)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
    .join('&');
}

async function main() {
  const url = new URL('/login', base).toString();
  const body = formEncode({ email, password });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      // SvelteKit CSRF protection requires matching Origin for POST form actions
      Origin: base
    },
    body,
    redirect: 'manual'
  });

  console.log('[test-login] status:', res.status);
  console.log('[test-login] location:', res.headers.get('location'));
  const setCookie = res.headers.get('set-cookie');
  console.log('[test-login] set-cookie:', setCookie);

  if (res.status >= 300 && res.status < 400 && setCookie) {
    console.log('[test-login] PASS: Received redirect and Set-Cookie');
  } else {
    const txt = await res.text();
    console.log('[test-login] response body preview:', txt.slice(0, 500));
    console.log('[test-login] FAIL: Expected redirect with Set-Cookie header');
    process.exit(2);
  }
}

main().catch((e) => {
  console.error('[test-login] error:', e && e.message ? e.message : e);
  process.exit(3);
});
