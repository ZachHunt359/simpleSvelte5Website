#!/usr/bin/env node
// Simple end-to-end auth test against local dev server
// 1) POST /login with test credentials
// 2) Inspect Set-Cookie header for auth_token
// 3) Call /api/whoami with cookie and print result

const base = process.env.TEST_BASE_URL || 'http://localhost:5173';
const email = process.env.TEST_ADMIN_EMAIL || 'test@example.com';
const password = process.env.TEST_ADMIN_PASSWORD || 'test1234';

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(base + '/login', { method: 'GET' });
      if (r.status === 200) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function extractSetCookie(headers) {
  // Node 18+ fetch (undici) supports getSetCookie(); fallback to get('set-cookie')
  const anyHeaders = /** @type {any} */ (headers);
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie();
  }
  const one = headers.get('set-cookie');
  return one ? [one] : [];
}

function findAuthCookie(setCookies) {
  for (const c of setCookies) {
    const name = c.split('=')[0].trim();
    if (name === 'auth_token') return c;
  }
  return null;
}

async function main() {
  const ok = await waitForServer();
  if (!ok) {
    console.error('Dev server not responding at', base, 'within timeout');
    process.exit(2);
  }

  const form = new URLSearchParams();
  form.set('email', email);
  form.set('password', password);

  const loginResp = await fetch(base + '/login?/', {
    // SvelteKit form actions often post to the same route; ensure POST to page endpoint
    method: 'POST',
    body: form,
    redirect: 'manual', // we want to inspect the initial response headers
    headers: { 'content-type': 'application/x-www-form-urlencoded' }
  });

  console.log('Login status:', loginResp.status, loginResp.statusText);
  if (loginResp.status !== 303 && loginResp.status !== 200) {
    const text = await loginResp.text().catch(() => '');
    console.error('Unexpected login response. Body snippet:', text.slice(0, 300));
  }

  const setCookies = extractSetCookie(loginResp.headers);
  console.log('Set-Cookie headers:', setCookies);
  const authCookie = findAuthCookie(setCookies);
  if (!authCookie) {
    console.error('auth_token cookie NOT found in response headers.');
    process.exit(3);
  }

  // Use cookie to call whoami
  const cookieHeader = authCookie.split(/;\s*/)[0]; // just name=value
  const whoami = await fetch(base + '/api/whoami', {
    headers: { cookie: cookieHeader }
  });
  const json = await whoami.json().catch(() => ({}));
  console.log('/api/whoami response:', json);

  if (!json || !json.authenticated) {
    console.error('whoami did not report authenticated.');
    process.exit(4);
  }

  console.log('Auth flow looks good: cookie set and whoami authenticated.');
}

main().catch((e) => { console.error(e); process.exit(1); });
