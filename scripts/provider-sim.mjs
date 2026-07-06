// Simulates the provider side while the provider app isn't wired to the API yet.
// Usage: node scripts/provider-sim.mjs
// Each run: accepts the newest open offer as Ravi Kumar, or advances the
// current job one step (ASSIGNED → ON_THE_WAY → IN_PROGRESS → COMPLETED).

const BASE = process.env.API_URL ?? 'http://localhost:4000';

const api = async (path, { method = 'GET', token, body } = {}) => {
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
};

const { accessToken } = await api('/auth/otp/verify', {
  method: 'POST',
  body: { phone: '+919000000001', otp: '123456' }, // seeded provider: Ravi Kumar
});

const offers = await api('/provider/offers', { token: accessToken });
if (offers.length > 0) {
  const offer = offers[0];
  await api(`/provider/offers/${offer.id}/accept`, { method: 'POST', token: accessToken });
  console.log(`✔ Ravi accepted ${offer.id} (${offer.services.map((s) => s.name).join(', ')})`);
  process.exit(0);
}

const jobs = await api('/provider/jobs', { token: accessToken });
const next = { ASSIGNED: 'ON_THE_WAY', ON_THE_WAY: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED' };
const job = jobs.find((j) => next[j.status]);
if (!job) {
  console.log('Nothing to do — no open offers or advanceable jobs. Book something in the app!');
  process.exit(0);
}
const b = await api(`/provider/jobs/${job.id}/status`, {
  method: 'POST',
  token: accessToken,
  body: { status: next[job.status] },
});
console.log(`✔ ${job.id}: ${job.status} → ${b.status}`);
