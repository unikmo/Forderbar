import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const handler = require('../api/send-demands.js');

function run(headers, env) {
  Object.assign(process.env, { SUPABASE_URL: 'http://sb', SUPABASE_SERVICE_ROLE_KEY: 'svc', RESEND_API_KEY: 'rk', MAIL_FROM: 'a@b.de', CRON_SECRET: 'sekret', REAL_CASES_SEND_ENABLED: 'true' }, env || {});
  let status = 0, body = null;
  const res = { setHeader() {}, status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  return handler({ method: 'POST', headers }, res).then(() => ({ status, body }));
}
function mockFetch(opts) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const j = (o, ok = true, st = 200) => ({ ok, status: st, text: async () => JSON.stringify(o), json: async () => o });
    if (url.includes('/rpc/forderbar_is_staff')) return j(opts.staff === true);
    if (url.includes('/app_flags')) return j([{ enabled: opts.flag !== false }]);
    if (url.includes('channel=eq.EMAIL')) return j(opts.letters || []);
    if (url.includes('channel=in.')) return j([{ id: 'p1' }]);
    if (url.includes('api.resend.com')) return opts.mailFails ? j({ message: 'bad' }, false, 422) : j({ id: 'mail-1' });
    if (url.includes('forderbar_mark_demand_sent')) return j(null);
    throw new Error('unexpected ' + url);
  };
  return calls;
}

test('refuses when env kill switch is off', async () => {
  mockFetch({});
  const r = await run({ authorization: 'Bearer sekret' }, { REAL_CASES_SEND_ENABLED: 'false' });
  assert.equal(r.status, 503);
});
test('refuses unauthorised callers', async () => {
  mockFetch({});
  const r = await run({ authorization: 'Bearer wrong' });
  assert.equal(r.status, 401);
});
test('refuses when database flag is off', async () => {
  mockFetch({ flag: false });
  const r = await run({ authorization: 'Bearer sekret' });
  assert.equal(r.status, 503);
});
test('sends released email letters once, with idempotency key, and records proof', async () => {
  const calls = mockFetch({ letters: [{ id: 'L1', recipient_email: 'x@y.de', subject: 'S', body: 'B' }] });
  const r = await run({ authorization: 'Bearer sekret' });
  assert.equal(r.status, 200);
  assert.equal(r.body.sent, 1);
  assert.equal(r.body.waiting_manual_post_fax, 1);
  const mail = calls.find(c => c.url.includes('resend'));
  assert.equal(mail.init.headers['Idempotency-Key'], 'demand-L1');
  const mark = calls.find(c => c.url.includes('forderbar_mark_demand_sent'));
  assert.equal(JSON.parse(mark.init.body).p_success, true);
});
test('records failure when the provider rejects', async () => {
  const calls = mockFetch({ letters: [{ id: 'L2', recipient_email: 'x@y.de', subject: 'S', body: 'B' }], mailFails: true });
  const r = await run({ authorization: 'Bearer sekret' });
  assert.equal(r.body.failed, 1);
  const mark = calls.find(c => c.url.includes('forderbar_mark_demand_sent'));
  assert.equal(JSON.parse(mark.init.body).p_success, false);
});
test('staff session token is accepted', async () => {
  mockFetch({ staff: true });
  const r = await run({ authorization: 'Bearer some-user-jwt' });
  assert.equal(r.status, 200);
});
