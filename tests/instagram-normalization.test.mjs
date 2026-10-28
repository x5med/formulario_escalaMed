import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
function load(file, mocks = {}) {
  const mod = new Module(file);
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : Module.createRequire(import.meta.url)(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return mod.exports;
}
const instagram = load('lib/instagram.ts');
const coupons = load('lib/coupons.ts');
const validation = load('lib/application-validation.ts', { './coupons': coupons, './phone': load('lib/phone.ts'), './instagram': instagram });
const variants = ['@genisson.com', ' GENISSON.COM ', '@ Genisson .com ', '@@Genisson.com', '@Genis\u200Bson.\u00A0com', '＠Ｇｅｎｉｓｓｏｎ．ｃｏｍ', 'https://www.instagram.com/Genisson.com/?igsh=example', 'instagram.com/Genisson.com', 'https://m.instagram.com/%40Genisson.com/#profile'];
const valid = { name: 'Ana Validação', email: 'ana@example.invalid', phone: '11912345678', instagram: '@genisson.com', role: 'doctor', revenueRange: '70k-100k', couponCode: 'convite', whatsappConsent: true, pageUrl: 'https://example.invalid/', sourceLeadId: 'c0dec0de-0000-4000-8000-000000000016' };

test('common user and profile URL variations share one Metrics key without losing punctuation', () => {
  for (const value of variants) {
    assert.equal(instagram.normalizeInstagram(value), 'genisson.com', value);
    assert.deepEqual(validation.validateApplication({ ...valid, instagram: value }), {}, value);
  }
  assert.equal(instagram.normalizeInstagram(' @ Dr._Genisson '), 'dr._genisson');
  assert.notEqual(instagram.normalizeInstagram('@genisson.com'), instagram.normalizeInstagram('@genissoncom'));
});

test('emails, posts, lookalike hosts and malformed values never turn into another Instagram identity', () => {
  for (const value of ['', '@', 'a', 'a'.repeat(31), 'ana@gmail.com', 'https://example.com/ana', 'https://instagram.com.evil.test/ana', 'https://instagram.com@evil.test/ana', 'https://instagram.com/p/ABC', 'instagram.com/reel/ABC', 'https://instagram.com/reels/', 'https://instagram.com/%ZZ', 'https://instagram.com/ana/extra', '@ana!','@aná', null, 123]) {
    assert.equal(instagram.normalizeInstagram(value), '', String(value));
    assert.ok(validation.validateApplication({ ...valid, instagram: value }).instagram);
  }
});

test('POST and PATCH send the same canonical key and preserve the submission ID; invalid drafts omit the handle', async () => {
  const received = [];
  class MetricsSyncError extends Error { needsReview = false; }
  const route = load('app/api/leads/route.ts', {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/application-validation': validation, '@/lib/instagram': instagram, '@/lib/coupons': coupons,
    '@/lib/consent': { META_CAPI_CONSENT_VERSION: 'test', WHATSAPP_EVENT_REGISTRATION_CONSENT_TEXT: 'test' },
    '@/lib/metrics': { MetricsSyncError, syncLeadToMetrics: async lead => { received.push(lead); return {}; } },
  });
  for (const value of variants) for (const method of ['PATCH', 'POST']) {
    const response = await route[method](new Request('https://example.invalid/api/leads', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...valid, instagram: value }) }));
    assert.equal(response.status, method === 'POST' ? 201 : 200);
    assert.equal(received.at(-1).instagram, 'genisson.com');
    assert.equal(received.at(-1).sourceLeadId, valid.sourceLeadId);
  }
  const invalid = new Request('https://example.invalid/api/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceLeadId: valid.sourceLeadId, name: valid.name, instagram: 'ana@gmail.com' }) });
  assert.equal((await route.PATCH(invalid)).status, 200);
  assert.equal(received.at(-1).instagram, '');
  assert.equal(received.at(-1).name, valid.name);
});
