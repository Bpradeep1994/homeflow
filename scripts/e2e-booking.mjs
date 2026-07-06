const BASE = 'http://localhost:4000';

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const step = (name, val) => console.log(`✔ ${name}`, typeof val === 'string' ? val : '');

// 1. Customer login via OTP
await api('/auth/otp/request', { method: 'POST', body: { phone: '+919876543210' } });
const cust = await api('/auth/otp/verify', {
  method: 'POST',
  body: { phone: '+919876543210', otp: '123456', name: 'Nayak' },
});
step('customer logged in', cust.user.name);

// 2. Provider login (seeded Ravi Kumar)
const prov = await api('/auth/otp/verify', {
  method: 'POST',
  body: { phone: '+919000000001', otp: '123456' },
});
step('provider logged in', `${prov.user.name} (${prov.user.role})`);

// 3. Customer books AC Service + AC Cleaning
const booking = await api('/bookings', {
  method: 'POST',
  token: cust.accessToken,
  body: {
    serviceIds: ['ac-service', 'ac-clean'],
    address: 'Flat 302, Sunrise Apartments, Madhapur, Hyderabad',
    date: '2026-07-06',
    timeSlot: '12:00 – 14:00',
  },
});
step('booking created', `${booking.id} · ₹${booking.amount} · ${booking.status}`);

// 4. Provider sees the offer and accepts
const offers = await api('/provider/offers', { token: prov.accessToken });
if (!offers.find((o) => o.id === booking.id)) throw new Error('offer not visible to provider');
step('offer visible to provider', `${offers.length} open offer(s)`);
const accepted = await api(`/provider/offers/${booking.id}/accept`, {
  method: 'POST',
  token: prov.accessToken,
});
step('offer accepted', accepted.status);

// 4b. Double-accept must fail (first-accept-wins)
const dup = await fetch(`${BASE}/provider/offers/${booking.id}/accept`, {
  method: 'POST',
  headers: { authorization: `Bearer ${prov.accessToken}` },
});
if (dup.status !== 409) throw new Error('expected 409 on double accept');
step('double-accept rejected', '409');

// 5. Lifecycle: ON_THE_WAY → IN_PROGRESS → COMPLETED
for (const status of ['ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED']) {
  const b = await api(`/provider/jobs/${booking.id}/status`, {
    method: 'POST',
    token: prov.accessToken,
    body: { status },
  });
  step('status advanced', b.status);
}

// 5b. Skipping a step must fail
const skip = await fetch(`${BASE}/provider/jobs/${booking.id}/status`, {
  method: 'POST',
  headers: { authorization: `Bearer ${prov.accessToken}`, 'content-type': 'application/json' },
  body: JSON.stringify({ status: 'IN_PROGRESS' }),
});
if (skip.status !== 409) throw new Error('expected 409 on invalid transition');
step('invalid transition rejected', '409');

// 6. Customer pays via UPI
const payment = await api(`/bookings/${booking.id}/pay`, {
  method: 'POST',
  token: cust.accessToken,
  body: { method: 'UPI' },
});
step('paid', `₹${payment.amount} (commission ₹${payment.commission}, payout ₹${payment.payout})`);

// 7. Customer reviews
await api(`/bookings/${booking.id}/review`, {
  method: 'POST',
  token: cust.accessToken,
  body: { rating: 5, comment: 'AC cools like new!' },
});
const provReviews = await api(`/providers/${prov.user.id}/reviews`);
step('review saved', `avg ${provReviews.average} from ${provReviews.count} review(s)`);

// Payment + review both in → booking auto-closes
const closed = await api(`/bookings/${booking.id}`, { token: cust.accessToken });
if (closed.status !== 'CLOSED') throw new Error(`expected CLOSED, got ${closed.status}`);
step('booking closed', closed.history.map((h) => h.status).join(' → '));

// 8. Notifications landed on both sides
const custNotifs = await api('/notifications', { token: cust.accessToken });
const provNotifs = await api('/notifications', { token: prov.accessToken });
step('notifications', `customer: ${custNotifs.length}, provider: ${provNotifs.length}`);
console.log('\ncustomer feed:', custNotifs.map((n) => n.title).join(' | '));
console.log('provider feed:', provNotifs.map((n) => n.title).join(' | '));

console.log('\n✅ E2E FLOW PASSED');
