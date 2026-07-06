// E2E: saved addresses, favorites, tickets, review photos + report,
// invoice, PATCH /me. Assumes API on :4000 with dev OTP.
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
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${typeof json === 'string' ? json.slice(0, 120) : JSON.stringify(json)}`);
  return json;
}
const step = (name, val = '') => console.log(`✔ ${name}`, val);
const login = (phone, extra = {}) =>
  api('/auth/otp/verify', { method: 'POST', body: { phone, otp: '123456', ...extra } });

const cust = await login('+919876543210', { name: 'Nayak' });
const prov = await login('+919000000001');
const t = cust.accessToken;

// --- Profile management ---
const me = await api('/auth/me', { method: 'PATCH', token: t, body: { name: 'Nayak Bhukya', email: 'nayak@example.com' } });
if (me.name !== 'Nayak Bhukya') throw new Error('updateMe failed');
step('profile updated', `${me.name} · ${me.email}`);

// --- Saved addresses (baseline-relative: DB persists between runs) ---
const before = (await api('/addresses', { token: t })).length;
const addr1 = await api('/addresses', { method: 'POST', token: t, body: { label: 'Home', line: 'Flat 302, Sunrise Apartments, Madhapur, Hyderabad 500081' } });
await api('/addresses', { method: 'POST', token: t, body: { label: 'Office', line: '2nd Floor, Cyber Towers, HITEC City, Hyderabad 500081' } });
let addrs = await api('/addresses', { token: t });
if (addrs.length !== before + 2) throw new Error('expected +2 addresses');
await api(`/addresses/${addr1.id}`, { method: 'DELETE', token: t });
addrs = await api('/addresses', { token: t });
if (addrs.length !== before + 1) throw new Error('delete failed');
step('addresses CRUD', `+2 then -1 (now ${addrs.length})`);

// --- Booking through to review with photo ---
const booking = await api('/bookings', {
  method: 'POST', token: t,
  body: { serviceIds: ['ac-service'], address: addrs[0].line, date: '2026-07-08', timeSlot: '10:00 – 12:00' },
});
await api(`/provider/offers/${booking.id}/accept`, { method: 'POST', token: prov.accessToken });
for (const s of ['ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'])
  await api(`/provider/jobs/${booking.id}/status`, { method: 'POST', token: prov.accessToken, body: { status: s } });
const payment = await api(`/bookings/${booking.id}/pay`, { method: 'POST', token: t, body: { method: 'UPI' } });

// photo upload → review with photo
const form = new FormData();
form.append('file', new Blob([new Uint8Array(900).fill(77)], { type: 'image/jpeg' }), 'after.jpg');
const up = await api('/uploads', { method: 'POST', token: t, raw: form });
const review = await api(`/bookings/${booking.id}/review`, {
  method: 'POST', token: t,
  body: { rating: 5, comment: 'Spotless work', photos: [up.url] },
});
if (review.photos?.[0] !== up.url) throw new Error('photo not stored on review');
step('review with photo', review.photos[0]);

// --- Report a review ---
const reported = await api(`/reviews/${review.id}/report`, {
  method: 'POST', token: prov.accessToken,
  body: { reason: 'Testing the moderation flow' },
});
if (!reported.reported) throw new Error('report failed');
const admin = await api('/auth/login', { method: 'POST', body: { email: 'admin@homeflow.in', password: 'admin123' } });
const flagged = await api('/admin/reviews/reported', { token: admin.accessToken });
if (!flagged.find((r) => r.id === review.id)) throw new Error('reported review missing from admin list');
step('review reported + visible to admin', `${flagged.length} flagged`);

// --- Invoice ---
const html = await api(`/payments/${payment.id}/invoice?token=${t}`);
if (!html.includes('Tax Invoice') || !html.includes(booking.id)) throw new Error('invoice html wrong');
step('invoice HTML served', `${html.length} bytes`);

// --- Favorites ---
await api(`/favorites/${prov.user.id}`, { method: 'POST', token: t });
let favs = await api('/favorites', { token: t });
if (favs.length !== 1 || !favs[0].profile) throw new Error('favorite with profile expected');
step('favorite added', `${favs[0].provider.name} · ⭐ ${favs[0].profile.rating}`);
await api(`/favorites/${prov.user.id}`, { method: 'DELETE', token: t });
favs = await api('/favorites', { token: t });
if (favs.length !== 0) throw new Error('unfavorite failed');
step('favorite removed');

// --- Support tickets ---
const ticket = await api('/support/tickets', {
  method: 'POST', token: t,
  body: { subject: 'AC still leaking', message: 'Water leakage came back a day after service.', bookingId: booking.id, priority: 'HIGH' },
});
const mine = await api('/support/tickets', { token: t });
if (!mine.find((x) => x.id === ticket.id)) throw new Error('ticket not listed');
const resolved = await api(`/admin/tickets/${ticket.id}`, { method: 'PATCH', token: admin.accessToken, body: { status: 'RESOLVED' } });
if (resolved.status !== 'RESOLVED') throw new Error('resolve failed');
step('ticket raised + resolved by admin', ticket.subject);

console.log('\n✅ CUSTOMER FEATURES E2E PASSED');
