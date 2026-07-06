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
const step = (name, val = '') => console.log(`✔ ${name}`, val);
const login = (phone, extra = {}) =>
  api('/auth/otp/verify', { method: 'POST', body: { phone, otp: '123456', ...extra } });

const admin = await login('+919000000000');
const cust = await login('+919876543210', { name: 'Nayak' });
const prov = await login('+919000000001');

// Booking → reschedule → accept → complete → pay
const mk = () =>
  api('/bookings', {
    method: 'POST',
    token: cust.accessToken,
    body: { serviceIds: ['ac-service'], address: 'Flat 302, Madhapur, Hyderabad', date: '2026-07-08', timeSlot: '10:00 – 12:00' },
  });

const baseline = (await api('/provider/payouts', { token: prov.accessToken })).pendingSettlement;

const b1 = await mk();
const r = await api(`/bookings/${b1.id}/reschedule`, {
  method: 'POST',
  token: cust.accessToken,
  body: { date: '2026-07-09', timeSlot: '16:00 – 18:00' },
});
step('rescheduled', `${b1.id}: ${r.date} · ${r.timeSlot}`);

await api(`/provider/offers/${b1.id}/accept`, { method: 'POST', token: prov.accessToken });
for (const s of ['ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'])
  await api(`/provider/jobs/${b1.id}/status`, { method: 'POST', token: prov.accessToken, body: { status: s } });
const pay1 = await api(`/bookings/${b1.id}/pay`, { method: 'POST', token: cust.accessToken, body: { method: 'UPI' } });
step('paid', `₹${pay1.amount} → payout ₹${pay1.payout}`);

// Provider payout summary (pre-settlement)
let payouts = await api('/provider/payouts', { token: prov.accessToken });
step('provider payouts', `earned ₹${payouts.totalEarned}, pending ₹${payouts.pendingSettlement}`);
if (payouts.pendingSettlement !== baseline + pay1.payout) throw new Error('pending settlement mismatch');

// Second booking → pay → refund it
const b2 = await mk();
await api(`/provider/offers/${b2.id}/accept`, { method: 'POST', token: prov.accessToken });
for (const s of ['ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'])
  await api(`/provider/jobs/${b2.id}/status`, { method: 'POST', token: prov.accessToken, body: { status: s } });
const pay2 = await api(`/bookings/${b2.id}/pay`, { method: 'POST', token: cust.accessToken, body: { method: 'CARD' } });
const refunded = await api(`/admin/payments/${pay2.id}/refund`, { method: 'POST', token: admin.accessToken });
step('admin refunded payment', `${refunded.status} ₹${refunded.amount}`);

// Refunded payment excluded from payouts
payouts = await api('/provider/payouts', { token: prov.accessToken });
if (payouts.pendingSettlement !== baseline + pay1.payout) throw new Error('refund leaked into payouts');
step('refund excluded from payouts', `pending still ₹${payouts.pendingSettlement}`);

// Admin payout batch → settle
const batch = await api('/admin/payouts', { token: admin.accessToken });
step('admin unsettled payouts', JSON.stringify(batch));
const settled = await api('/admin/payouts/settle', { method: 'POST', token: admin.accessToken });
step('weekly settlement run', `${settled.settledProviders} provider(s)`);
payouts = await api('/provider/payouts', { token: prov.accessToken });
if (payouts.pendingSettlement !== 0) throw new Error('settlement did not clear pending');
step('post-settlement', `pending ₹0, settled ₹${payouts.settled}`);

// Double refund blocked; settled refund blocked
const dup = await fetch(`${BASE}/admin/payments/${pay2.id}/refund`, {
  method: 'POST',
  headers: { authorization: `Bearer ${admin.accessToken}` },
});
if (dup.status !== 409) throw new Error('expected 409 double refund');
const late = await fetch(`${BASE}/admin/payments/${pay1.id}/refund`, {
  method: 'POST',
  headers: { authorization: `Bearer ${admin.accessToken}` },
});
if (late.status !== 409) throw new Error('expected 409 refund after settlement');
step('double refund + post-settlement refund both rejected', '409 / 409');

// Review → provider score
await api(`/bookings/${b1.id}/review`, { method: 'POST', token: cust.accessToken, body: { rating: 5, comment: 'Great!' } });
await api(`/bookings/${b2.id}/review`, { method: 'POST', token: cust.accessToken, body: { rating: 4 } });
const score = await api(`/providers/${prov.user.id}/score`);
step('provider score', `avg ${score.averageRating} · dist ${JSON.stringify(score.distribution)} · completion ${score.completionRate}%`);

console.log('\n✅ PAYMENTS + RESCHEDULE + SCORE E2E PASSED');
