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
const phone = load('lib/phone.ts');
const tracking = load('lib/tracking.ts', { './phone': phone });
const values = new Map();
let timers, navigations;
function browser(search = '') {
  values.clear(); timers = []; navigations = [];
  globalThis.sessionStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  globalThis.localStorage = { removeItem() {} };
  globalThis.document = { cookie: '', domain: 'localhost' };
  globalThis.window = { location: { search, hostname: 'localhost', assign: url => navigations.push(url) }, dataLayer: [], setTimeout: callback => { timers.push(callback); return timers.length; } };
  globalThis.location = window.location;
}

test('WhatsApp paste, national formats and incremental typing produce the same E.164 value', () => {
  for (const value of ['5511999998888', '11 99999-8888', '(11) 99999-8888', '+55 (11) 99999-8888']) {
    assert.equal(phone.formatPhoneInput(value), '(11) 99999-8888');
    assert.equal(phone.applicationPhoneKey(value), '11999998888');
    assert.equal(tracking.userData(' ANA@example.invalid ', value).phone_number, '+5511999998888');
  }
  let input = '';
  for (const digit of '5511999998888') input = phone.formatPhoneInput(input + digit);
  assert.equal(input, '(11) 99999-8888');
  assert.equal(phone.applicationPhoneKey('(55) 99999-8888'), '55999998888');
  assert.equal(phone.formatPhoneInput('119999988881'), '119999988881');
  assert.equal(phone.phoneNumberE164('119999988881'), '');
});

test('checkout carries every GTM session parameter, decodes once and preserves destination parameters', () => {
  browser();
  const params = { fbclid: 'abc', gclid: 'google', utm_source: 'teste', utm_medium: 'paid+social', utm_campaign: 'a%C3%A7%C3%A3o', utm_content: '50%25', utm_term: 'clinica%2Bmedica' };
  values.set('x5_click_params', JSON.stringify(params));
  const url = new URL(tracking.decorateUrl('https://chk.eduzz.com/1W3223YQ92?existing=keep#checkout'));
  assert.deepEqual(Object.fromEntries(url.searchParams), { existing: 'keep', fbclid: 'abc', gclid: 'google', utm_source: 'teste', utm_medium: 'paid social', utm_campaign: 'ação', utm_content: '50%', utm_term: 'clinica+medica' });
  assert.equal(url.hash, '#checkout');
  window.location.search = '?utm_source=atual&fbclid=novo';
  assert.equal(tracking.readAttribution().utm_source, 'atual');
  assert.equal(new URL(tracking.decorateUrl('https://chk.eduzz.com/1W3223YQ92?utm_source=fixo')).searchParams.get('utm_source'), 'fixo');
  values.set('x5_click_params', '{broken');
  values.set('escalamed-attribution-v1', JSON.stringify({ utm_medium: 'legacy', unknown: 'ignored' }));
  assert.deepEqual(tracking.readAttribution(), { utm_medium: 'legacy', utm_source: 'atual', fbclid: 'novo' });
  for (const malformed of ['null', '[]', '123', '"text"']) {
    values.set('x5_click_params', malformed);
    assert.equal(tracking.readAttribution().utm_medium, 'legacy');
  }
});

test('real completion callback emits one Lead per submission and sign_up only for a valid free coupon', () => {
  for (const access of ['paid', 'free']) {
    browser('?utm_source=teste&fbclid=abc');
    const callbacks = [];
    const react = { useState: value => [value, () => {}], useRef: value => ({ current: value }), useEffect() {}, useCallback: callback => { callbacks.push(callback); return callback; } };
    const coupons = load('lib/coupons.ts');
    const component = load('components/application-form.tsx', {
      react,
      '@/components/ui/button': {}, '@/components/ui/input': {}, '@/components/ui/label': {}, '@/components/ui/native-select': {}, '@/components/ui/switch': {},
      '@/components/registration-success': { RegistrationSuccess: () => null },
      '@/lib/consent': load('lib/consent.ts'), '@/lib/coupons': coupons, '@/lib/phone': phone,
      '@/lib/application-validation': load('lib/application-validation.ts', { './coupons': coupons, './phone': phone }),
      '@/lib/tracking': tracking,
    });
    component.ApplicationForm();
    const finish = callbacks.find(fn => fn.toString().includes('trackedSubmissionsRef.current.has'));
    assert.ok(finish);
    const data = { email: 'ana@example.invalid', phone: '5511999998888', role: 'doctor', revenueRange: '70k-100k', couponCode: access === 'free' ? 'CONVITE' : '' };
    const result = { id: access, access, checkoutUrl: 'https://chk.eduzz.com/1W3223YQ92' };
    finish(data, result); finish(data, result);
    assert.equal(window.dataLayer.filter(e => e.event === 'generate_lead').length, 1);
    assert.equal(window.dataLayer.filter(e => e.event === 'sign_up').length, access === 'free' ? 1 : 0);
    assert.equal(window.dataLayer.find(e => e.event === 'generate_lead').user_data.phone_number, '+5511999998888');
    if (access === 'paid') {
      const checkout = window.dataLayer.find(e => e.event === 'begin_checkout');
      checkout.eventCallback();
      for (const callback of timers) callback();
      assert.equal(navigations.length, 1);
      assert.equal(new URL(navigations[0]).searchParams.get('utm_source'), 'teste');
      assert.equal(new URL(navigations[0]).searchParams.get('fbclid'), 'abc');
    }
  }
});
