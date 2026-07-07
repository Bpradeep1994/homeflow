const BASE = process.env.API_URL ?? 'http://localhost:4000';

async function api(path, { method = 'GET', token, body, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(raw ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const expectStatus = async (expected, path, opts) => {
  const res = await fetch(BASE + path, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status !== expected) throw new Error(`${path}: expected ${expected}, got ${res.status}`);
};

const step = (name, val = '') => console.log(`✔ ${name}`, val);

// Logins
const login = (phone, extra = {}) =>
  api('/auth/otp/verify', { method: 'POST', body: { phone, otp: '123456', ...extra } });

const admin = await login('+919000000000');
if (admin.user.role !== 'admin') throw new Error('admin seed missing');
step('admin logged in', admin.user.name);

// New provider registers → cannot see offers before approval
const svcId = 'ac-duct-' + String(Date.now()).slice(-6);
const freshPhone = '+9198' + String(Date.now()).slice(-8); // unique per run: DB persists
const newPro = await login(freshPhone, { role: 'provider', name: 'Abdul Rasheed' });
step('new provider registered', `${newPro.user.name} (${newPro.user.verificationStatus})`);
await expectStatus(403, '/provider/offers', { token: newPro.accessToken });
step('unverified provider blocked from offers', '403');

// ID upload (multipart)
const form = new FormData();
form.append('file', new Blob([new Uint8Array(1200).fill(65)], { type: 'image/png' }), 'aadhaar.png');
const upload = await api('/uploads', { method: 'POST', token: newPro.accessToken, raw: form });
step('ID document uploaded', upload.url);

// Submit verification
const profile = await api('/provider/verification', {
  method: 'POST',
  token: newPro.accessToken,
  body: {
    idDocumentUrl: upload.url,
    services: ['AC Repair', 'Electrician'],
    city: 'Hyderabad',
    serviceAreas: ['Tolichowki', 'Mehdipatnam'],
    experienceYears: 4,
  },
});
step('verification submitted', `${profile.verificationStatus} · ${profile.services.join('+')} · ${profile.experienceYears}y · ${profile.city}`);

// Admin sees it and approves
const pending = await api('/admin/verifications', { token: admin.accessToken });
if (!pending.find((p) => p.user.phone === freshPhone)) throw new Error('pending verification missing');
const approved = await api(`/admin/verifications/${newPro.user.id}`, {
  method: 'POST',
  token: admin.accessToken,
  body: { decision: 'approve' },
});
step('admin approved provider', approved.verificationStatus);

// Provider goes online, now sees offers (empty list, but 200)
await api('/provider/availability', { method: 'PATCH', token: newPro.accessToken, body: { online: true } });
const offers = await api('/provider/offers', { token: newPro.accessToken });
step('approved provider can view offers', `${offers.length} open`);

// Admin service management: new service, price change, deactivate
await api('/admin/categories/ac-repair/services', {
  method: 'POST',
  token: admin.accessToken,
  body: { id: svcId, name: 'Duct Cleaning', price: 899 },
});
await api('/admin/services/' + svcId, { method: 'PATCH', token: admin.accessToken, body: { price: 949 } });
step('admin created service + updated price', svcId + ' ₹949');

await api('/admin/services/el-doorbell', { method: 'PATCH', token: admin.accessToken, body: { active: false } });
const catalog = await api('/catalog');
const elec = catalog.find((c) => c.id === 'electrician');
if (elec.services.find((s) => s.id === 'el-doorbell')) throw new Error('inactive service still in catalog');
step('deactivated service hidden from catalog');

// Booking an inactive service is rejected
const cust = await login('+919876543210', { name: 'Nayak' });
await expectStatus(400, '/bookings', {
  method: 'POST',
  token: cust.accessToken,
  body: { serviceIds: ['el-doorbell'], address: 'Flat 302, Madhapur, Hyderabad', date: '2026-07-07', timeSlot: '10:00 – 12:00' },
});
step('booking inactive service rejected', '400');

// Non-admin cannot touch admin routes
await expectStatus(403, '/admin/users', { token: cust.accessToken });
step('customer blocked from admin routes', '403');

// Admin user management: block a customer → they cannot book
await api(`/admin/users/${cust.user.id}/block`, {
  method: 'PATCH',
  token: admin.accessToken,
  body: { blocked: true },
});
await expectStatus(403, '/bookings', {
  method: 'POST',
  token: cust.accessToken,
  body: { serviceIds: ['ac-service'], address: 'Flat 302, Madhapur, Hyderabad', date: '2026-07-07', timeSlot: '10:00 – 12:00' },
});
await api(`/admin/users/${cust.user.id}/block`, {
  method: 'PATCH',
  token: admin.accessToken,
  body: { blocked: false },
});
step('blocked customer cannot book; unblocked again', '403 → ok');

// Full dispatch still works with the newly approved provider
const booking = await api('/bookings', {
  method: 'POST',
  token: cust.accessToken,
  body: { serviceIds: [svcId], address: 'Flat 302, Madhapur, Hyderabad', date: '2026-07-07', timeSlot: '10:00 – 12:00' },
});
const acc = await api(`/provider/offers/${booking.id}/accept`, { method: 'POST', token: newPro.accessToken });
step('new provider accepted a real booking', `${booking.id} → ${acc.status}`);

console.log('\n✅ ADMIN + VERIFICATION E2E PASSED');
