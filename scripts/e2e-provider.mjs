// E2E: provider profile (photo/certificates/schedule), holiday-aware dispatch,
// provider job cancel with re-dispatch, earnings breakdown.
const BASE = process.env.API_URL ?? 'http://localhost:4000';

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
const step = (name, val = '') => console.log(`✔ ${name}`, val);
const login = (phone, extra = {}) =>
  api('/auth/otp/verify', { method: 'POST', body: { phone, otp: '123456', ...extra } });

const cust = await login('+919876543210', { name: 'Nayak' });
const ravi = await login('+919000000001'); // AC Repair, online (seeded)
const imran = await login('+919777766666', { role: 'provider', name: 'Imran Ali' });
const admin = await api('/auth/login', { method: 'POST', body: { email: 'admin@homeflow.in', password: 'admin123' } });

// Second AC provider: verify + approve + online (idempotent across runs)
const imranProfile = await api('/provider/profile', { token: imran.accessToken });
if (imranProfile?.verificationStatus !== 'APPROVED') {
  await api('/provider/verification', {
    method: 'POST', token: imran.accessToken,
    body: { idDocumentUrl: '/uploads/x.png', services: ['AC Repair'], city: 'Hyderabad', serviceAreas: ['Mehdipatnam'], experienceYears: 3 },
  });
  await api(`/admin/verifications/${imran.user.id}`, { method: 'POST', token: admin.accessToken, body: { decision: 'approve' } });
}
await api('/provider/availability', { method: 'PATCH', token: imran.accessToken, body: { online: true } });
step('second provider approved + online', imran.user.name);

// Profile: photo, certificates, working hours, holidays
const profile = await api('/provider/profile', {
  method: 'PATCH', token: ravi.accessToken,
  body: {
    photoUrl: '/uploads/ravi.jpg',
    certificates: ['/uploads/cert-hvac.pdf'],
    workingStart: '09:00',
    workingEnd: '18:00',
    holidays: ['2026-07-09'],
  },
});
if (profile.photoUrl !== '/uploads/ravi.jpg' || profile.workingStart !== '09:00') throw new Error('profile update failed');
step('photo + certificates + schedule saved', `${profile.workingStart}–${profile.workingEnd} · holiday ${profile.holidays[0]}`);

// Holiday-aware offers: booking on Ravi's holiday must not appear for him
const holidayBooking = await api('/bookings', {
  method: 'POST', token: cust.accessToken,
  body: { serviceIds: ['ac-service'], address: 'Flat 302, Madhapur, Hyderabad', date: '2026-07-09', timeSlot: '10:00 – 12:00' },
});
const raviOffers = await api('/provider/offers', { token: ravi.accessToken });
if (raviOffers.find((o) => o.id === holidayBooking.id)) throw new Error('holiday booking offered to Ravi');
const imranOffers = await api('/provider/offers', { token: imran.accessToken });
if (!imranOffers.find((o) => o.id === holidayBooking.id)) throw new Error('booking not offered to Imran');
step('holiday hides offer from Ravi, visible to Imran');
await api(`/provider/offers/${holidayBooking.id}/accept`, { method: 'POST', token: imran.accessToken });

// Provider cancel → re-dispatch: Imran cancels, booking back to PENDING, not re-offered to him
const cancelled = await api(`/provider/jobs/${holidayBooking.id}/cancel`, { method: 'POST', token: imran.accessToken });
if (cancelled.status !== 'PENDING' || cancelled.provider) throw new Error('re-dispatch failed');
const imranAgain = await api('/provider/offers', { token: imran.accessToken });
if (imranAgain.find((o) => o.id === holidayBooking.id)) throw new Error('re-offered to canceller');
step('provider cancel re-dispatches', cancelled.history.map((h) => h.status).join(' → '));

// Earnings breakdown: run one booking to paid completion for Ravi
const b2 = await api('/bookings', {
  method: 'POST', token: cust.accessToken,
  body: { serviceIds: ['ac-clean'], address: 'Flat 302, Madhapur, Hyderabad', date: '2026-07-07', timeSlot: '10:00 – 12:00' },
});
await api(`/provider/offers/${b2.id}/accept`, { method: 'POST', token: ravi.accessToken });
for (const s of ['ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED'])
  await api(`/provider/jobs/${b2.id}/status`, { method: 'POST', token: ravi.accessToken, body: { status: s } });
await api(`/bookings/${b2.id}/pay`, { method: 'POST', token: cust.accessToken, body: { method: 'UPI' } });
const payouts = await api('/provider/payouts', { token: ravi.accessToken });
if (payouts.today < 1 || payouts.thisWeek < payouts.today || payouts.thisMonth < payouts.thisWeek) {
  throw new Error('earnings breakdown wrong');
}
step('earnings breakdown', `today ₹${payouts.today} · week ₹${payouts.thisWeek} · month ₹${payouts.thisMonth} · pending ₹${payouts.pendingSettlement}`);

console.log('\n✅ PROVIDER FEATURES E2E PASSED');
