import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
function load(file,mocks={}) {
  const mod=new Module(file);
  mod.require=name=>Object.hasOwn(mocks,name)?mocks[name]:Module.createRequire(import.meta.url)(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
  return mod.exports;
}
const coupons=load('lib/coupons.ts');
const validation=load('lib/application-validation.ts',{'./coupons':coupons,'./phone':load('lib/phone.ts')});
const valid={name:"Ana D'Ávila Souza",email:'ana@example.invalid',phone:'(11) 91234-5678',instagram:'@ana.souza',role:'doctor',revenueRange:'70k-100k',couponCode:'Bioma100',whatsappConsent:true,metaAdsConsent:false,pageUrl:'https://formulario-escalamed.x5med.com.br',sourceLeadId:'c0dec0de-0000-4000-8000-000000000016'};

test('same validation accepts normal contacts, legacy mobile, international prefix and optional advertising consent',()=>{
  for(const phone of ['(11) 91234-5678','11 3123-4567','+55 (11) 91234-5678','0055 11 91234-5678','11 8123-4567']) assert.deepEqual(validation.validateApplication({...valid,phone}),{},phone);
  assert.equal(validation.applicationPhoneKey('11 8123-4567'),'11981234567');
  assert.equal(validation.applicationPhoneKey('+55 (11) 91234-5678'),'11912345678');
  assert.deepEqual(validation.validateApplication({...valid,couponCode:'',role:'other',otherRole:'Gestora R2'}),{});
});

test('invalid phone structures and placeholders have a specific message, not a connection error',()=>{
  for(const phone of ['(11) 0000-0000','11999999999','1177777777','123','119123456789','(00) 91234-5678','telefone 11912345678','11 0123-4567','']) {
    const errors=validation.validateApplication({...valid,phone});assert.deepEqual(Object.keys(errors),['phone'],phone);assert.match(errors.phone,/DDD/);assert.match(errors.phone,/Ex\./);
  }
});

test('every required field explains format or missing selection without silently truncating',()=>{
  const cases={name:['1234','Ana9','!!!','A','Ana😀','A'.repeat(121)],email:['ana@','ana @example.com','a@@b.com','a'.repeat(181)],instagram:['https://instagram.com/ana','@ana souza','@@ana','a'.repeat(31)],role:['unknown',''],revenueRange:['unknown',''],couponCode:['inexistente','x'.repeat(81)],whatsappConsent:[false,'true',null]};
  for(const [field,values] of Object.entries(cases)) for(const value of values) {
    const errors=validation.validateApplication({...valid,[field]:value});assert.ok(errors[field],`${field}: ${value}`);assert.equal(Object.keys(errors).length,1);
  }
  for(const otherRole of ['','a','x'.repeat(161),'Cargo\u0001']) assert.ok(validation.validateApplication({...valid,role:'other',otherRole}).otherRole);
  const bad=validation.validateApplication({});assert.deepEqual(Object.keys(bad),['name','email','phone','instagram','role','revenueRange','whatsappConsent']);
});

test('server returns all field errors before calling the CRM; valid and unavailable are distinct',async()=>{
  let writes=0,fail=false;
  class MetricsSyncError extends Error { needsReview=false; }
  const route=load('app/api/leads/route.ts',{'next/server':{NextResponse:{json:Response.json}},'@/lib/application-validation':validation,'@/lib/coupons':coupons,'@/lib/consent':{META_CAPI_CONSENT_VERSION:'test',WHATSAPP_EVENT_REGISTRATION_CONSENT_TEXT:'test'},'@/lib/metrics':{MetricsSyncError,syncLeadToMetrics:async lead=>{writes++;if(fail)throw new MetricsSyncError('private server detail');assert.equal(lead.phone,'11912345678');return {};}}});
  const request=body=>new Request('https://example.invalid/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const response=await route.POST(request({...valid,name:'Ana9',email:'ana@',phone:'1100000000',instagram:'https://instagram.com/ana'}));
  assert.equal(response.status,400);const body=await response.json();assert.equal(body.code,'validation_error');assert.deepEqual(Object.keys(body.errors),['name','email','phone','instagram']);assert.equal(body.field,'name');assert.equal(writes,0);
  const raw=await route.POST(request({...valid,name:'x'.repeat(121)}));assert.equal(raw.status,400);assert.equal(writes,0);
  assert.equal((await route.POST(request(valid))).status,201);assert.equal(writes,1);
  fail=true;const unavailable=await route.POST(request(valid));assert.equal(unavailable.status,502);const error=await unavailable.json();assert.equal(error.code,'service_unavailable');assert.ok(!error.errors);assert.match(error.error,/serviço/);assert.ok(!error.error.includes('private'));
});

test('UI keeps inputs and connects accessible field messages, blur and server errors to the first field',()=>{
  const ui=fs.readFileSync('components/application-form.tsx','utf8');
  assert.match(ui,/return validateApplication\(data\)/);
  assert.match(ui,/readApplicationErrors\(result.errors\)/);
  assert.match(ui,/error instanceof ApplicationValidationError/);
  assert.match(ui,/setErrors\(error.fields\)/);
  assert.match(ui,/focusApplicationField\(Object.keys\(error.fields\)\[0\]\)/);
  for(const field of validation.APPLICATION_FIELDS) assert.ok(ui.includes(`<FieldError field="${field}">`),field);
  assert.match(ui,/aria-live="polite"/);
  assert.match(ui,/aria-describedby=\{\['phone-country', errors.phone && 'phone-error'\]/);
  assert.match(ui,/const message = validate\(latestDataRef.current\)\[field\]/);
  assert.ok(!ui.includes('event.target.value.replace(/\\p{N}'));
});
