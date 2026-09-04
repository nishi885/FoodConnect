const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const BASE = process.env.BASE_URL || 'http://localhost:5001';

function parseSetCookie(setCookie) {
  if (!setCookie) return '';
  if (Array.isArray(setCookie)) setCookie = setCookie[0];
  return setCookie.split(';')[0];
}

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const text = await res.text();
  const cookies = res.headers.get('set-cookie');
  return { ok: res.ok, status: res.status, cookies: parseSetCookie(cookies), body: text };
}

async function createDonation(cookie, donation) {
  const res = await fetch(`${BASE}/api/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(donation)
  });
  return res.json().catch(() => ({ status: res.status, ok: res.ok }));
}

async function getNotifications(cookie) {
  const res = await fetch(`${BASE}/notifications`, { headers: { Cookie: cookie } });
  return res.json().catch(() => ({ status: res.status }));
}

async function main() {
  console.log('Logging in as donor...');
  const donor = await login('donor@example.com', 'Password1@');
  if (!donor.ok) { console.error('Donor login failed', donor); process.exit(1); }
  console.log('Donor cookie:', donor.cookies);

  console.log('Creating donation as donor...');
  const donation = await createDonation(donor.cookies, {
    foodType: 'Vegetarian Meal', quantity: '5 boxes', cookingTime: new Date().toISOString(), address: 'MG Road, Pune, India', phone: 9876543210
  });
  console.log('Donation response:', donation);

  console.log('Logging in as admin...');
  const admin = await login('admin@example.com', 'Password1@');
  if (!admin.ok) { console.error('Admin login failed', admin); process.exit(1); }
  console.log('Admin cookie:', admin.cookies);

  console.log('Fetching notifications as admin...');
  const notifs = await getNotifications(admin.cookies);
  console.log('Notifications result:', JSON.stringify(notifs, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
