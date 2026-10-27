import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const consent={};const m={exports:consent};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/consent.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,consent);
test('Meta consent is separate, optional, on by default and never carried by a saved draft',()=>{const ui=fs.readFileSync('components/application-form.tsx','utf8');assert.match(ui,/metaAdsConsent: true/);assert.match(ui,/data: \{\.\.\.data, metaAdsConsent:false\}/);assert.match(ui,/key === 'metaAdsConsent'\) data.metaAdsConsent = false/);assert.match(ui,/completed \? \{ whatsappConsent, metaAdsConsent \}/);assert.ok(!ui.match(/errors\.metaAdsConsent|!data\.metaAdsConsent/));assert.match(consent.META_CAPI_CONSENT_TEXT,/Recusar não impede minha inscrição/);assert.equal(consent.META_CAPI_CONSENT_VERSION,'escalamed-meta-capi-2026-10-15-v1');});
test('server stamps the notice version and only forwards an explicit boolean at completion',()=>{const source=fs.readFileSync('app/api/leads/route.ts','utf8');assert.match(source,/typeof payload.metaAdsConsent === 'boolean'/);assert.match(source,/metaAdsConsentVersion: META_CAPI_CONSENT_VERSION/);assert.match(source,/payload.metaAdsConsent !== undefined && typeof payload.metaAdsConsent !== 'boolean'/);});
