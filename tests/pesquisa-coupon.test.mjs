import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';

function load(file, mocks = {}) {
  const mod = new Module(file);
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : Module.createRequire(import.meta.url)(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, file);
  return mod.exports;
}
const coupons = load('lib/coupons.ts');

test('PESQUISA coupon is canonical and URL prefill preserves drafts for invalid or missing input', () => {
  for (const value of ['PESQUISA', 'pes quisa', ' Pesquisa ']) assert.equal(coupons.normalizeCoupon(value), 'PESQUISA');
  assert.equal(coupons.normalizeCoupon('SAUDE'), 'SAUDE');
  assert.equal(coupons.initialCouponCode('?cupom=pes%20quisa', 'SAUDE'), 'PESQUISA');
  assert.equal(coupons.initialCouponCode('?coupon=PESQUISA'), 'PESQUISA');
  for (const search of ['', '?cupom=unknown', '?utm_campaign=test']) assert.equal(coupons.initialCouponCode(search, 'SAUDE'), 'SAUDE');
  assert.equal(coupons.initialCouponCode('?cupom=SAUDE&coupon=PESQUISA'), 'SAUDE');
});

test('opening a coupon link does not schedule CRM autosave until the visitor supplies an answer', () => {
 const previousWindow=globalThis.window;
 try {
  for (const name of ['', 'Ana']) {
   const effects=[],events=[]; let scheduled=0,stateIndex=0;
   globalThis.window={setTimeout(){scheduled++;return 1;},clearTimeout(){}};
   const react={
    useState(value){const index=stateIndex++;return [index===0?{...value,name,couponCode:'PESQUISA'}:index===1?true:value,()=>{}];},
    useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn),
   };
   const noopJsx=()=>null;
   const component=load('components/application-form.tsx',{
    react,'react/jsx-runtime':{jsx:noopJsx,jsxs:noopJsx},'lucide-react':{},
    '@/components/ui/button':{},'@/components/ui/input':{},'@/components/ui/label':{},'@/components/ui/native-select':{},'@/components/ui/switch':{},'@/components/registration-success':{},
    '@/lib/consent':{},'@/lib/coupons':coupons,'@/lib/phone':{},'@/lib/instagram':{},'@/lib/application-validation':{},
    '@/lib/tracking':{pushTrackingEvent:event=>events.push(event)},
   });
   component.ApplicationForm();
   const autosave=effects.find(fn=>fn.toString().includes('!draftReady'));
   assert.ok(autosave);autosave();
   assert.equal(scheduled,name?1:0);
   assert.deepEqual(events,[]);
  }
 } finally { globalThis.window=previousWindow; }
});

test('PESQUISA coupon uses the same complimentary server path as SAUDE and forwards its own code', async () => {
  const validation = load('lib/application-validation.ts', { './coupons': coupons, './phone': load('lib/phone.ts'), './instagram': load('lib/instagram.ts') });
  const received = [];
  const route = load('app/api/leads/route.ts', {
    'next/server': { NextResponse: { json: Response.json } },
    '@/lib/application-validation': validation,
    '@/lib/instagram': load('lib/instagram.ts'), '@/lib/coupons': coupons,
    '@/lib/consent': { META_CAPI_CONSENT_VERSION: 'test', WHATSAPP_EVENT_REGISTRATION_CONSENT_TEXT: 'test' },
    '@/lib/metrics': { MetricsSyncError: class extends Error {}, syncLeadToMetrics: async lead => { received.push(lead); return {}; } },
  });
  for (const couponCode of ['SAUDE', 'pes quisa']) {
    const body = { name: 'Ana Souza', email: 'ana@example.invalid', phone: '11912345678', instagram: '@ana.souza', role: 'doctor', revenueRange: '70k-100k', couponCode, whatsappConsent: true, metaAdsConsent: false, pageUrl: 'https://formulario-escalamed.x5med.com.br/?cupom=PESQUISA', sourceLeadId: 'c0dec0de-0000-4000-8000-000000000016' };
    const response = await route.POST(new Request('https://example.invalid/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    const result = await response.json();
    assert.equal(response.status, 201, JSON.stringify(result));
    assert.equal(result.access, 'free');
  }
  assert.deepEqual(received.map(lead => lead.couponCode), ['SAUDE', 'PESQUISA']);
  assert.ok(received.every(lead => lead.registrationType === 'complimentary'));
  assert.ok(received.every(lead => lead.whatsappConsent === true && lead.metaAdsConsent === false && lead.priceCents === 249700));
  const base = { name: 'Ana Souza', email: 'ana@example.invalid', phone: '11912345678', instagram: '@ana.souza', role: 'doctor', revenueRange: '70k-100k', couponCode: 'PESQUISA', whatsappConsent: true, metaAdsConsent: false, pageUrl: 'https://formulario-escalamed.x5med.com.br/?cupom=PESQUISA', sourceLeadId: 'c0dec0de-0000-4000-8000-000000000016' };
  const send = body => route.POST(new Request('https://example.invalid/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  for (const invalid of [{ ...base, couponCode: 'PESQUISA-INVALIDO' }, { ...base, whatsappConsent: false }]) {
    assert.equal((await send(invalid)).status, 400);
    assert.equal(received.length, 2);
  }
  const paid = await send({ ...base, couponCode: '' });
  assert.equal(paid.status, 201);
  assert.equal((await paid.json()).access, 'paid');
  assert.equal(received[2].registrationType, 'payment_pending');
  assert.equal(received[2].couponCode, null);
});
