const BASE = 'http://localhost:4000';

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}
const ok = (r, what) => {
  if (r.status >= 400) throw new Error(`${what}: ${r.status} ${JSON.stringify(r.json)}`);
  return r.json;
};
const step = (name, val = '') => console.log(`✔ ${name}`, val);

// 1. Admin logs in with email + password
const adminLogin = ok(await api('/auth/login', { method: 'POST', body: { email: 'admin@homeflow.in', password: 'admin123' } }), 'admin login');
step('admin email+password login', adminLogin.user.role);

// 2. passwordHash never leaks — in login response or user listings
if ('passwordHash' in adminLogin.user) throw new Error('passwordHash leaked in login');
const users = ok(await api('/admin/users', { token: adminLogin.accessToken }), 'list users');
if (users.some((u) => 'passwordHash' in u)) throw new Error('passwordHash leaked in /admin/users');
step('passwordHash stripped from all responses');

// 3. Wrong password rejected
const bad = await api('/auth/login', { method: 'POST', body: { email: 'admin@homeflow.in', password: 'wrong' } });
if (bad.status !== 401) throw new Error('expected 401 on bad password');
step('wrong password rejected', '401');

// 4. Customer sets a password via OTP reset, then logs in with it
ok(await api('/auth/otp/verify', { method: 'POST', body: { phone: '+919876543210', otp: '123456', name: 'Nayak' } }), 'customer otp login');
ok(await api('/auth/password/reset', {
  method: 'POST',
  body: { phone: '+919876543210', otp: '123456', newPassword: 'nayak-secret-1', email: 'nayak@example.com' },
}), 'password reset');
const custLogin = ok(await api('/auth/login', { method: 'POST', body: { email: 'nayak@example.com', password: 'nayak-secret-1' } }), 'customer password login');
step('customer set password via OTP, then password login', custLogin.user.email);

// 5. Blocked user cannot log in (either way)
const cust = custLogin.user;
ok(await api(`/admin/users/${cust.id}/block`, { method: 'PATCH', token: adminLogin.accessToken, body: { blocked: true } }), 'block');
const blockedOtp = await api('/auth/otp/verify', { method: 'POST', body: { phone: '+919876543210', otp: '123456' } });
const blockedPwd = await api('/auth/login', { method: 'POST', body: { email: 'nayak@example.com', password: 'nayak-secret-1' } });
if (blockedOtp.status !== 401 || blockedPwd.status !== 401) throw new Error('blocked user could log in');
ok(await api(`/admin/users/${cust.id}/block`, { method: 'PATCH', token: adminLogin.accessToken, body: { blocked: false } }), 'unblock');
step('blocked user rejected on OTP and password login', '401 / 401');

// 6. Status field present
const me = users.find((u) => u.role === 'admin');
if (me.status !== 'ACTIVE') throw new Error('status field missing');
step('status field live', me.status);

console.log('\n✅ AUTH + SCHEMA E2E PASSED');
