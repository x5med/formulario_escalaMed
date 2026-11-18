import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
function load(file,mocks){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(key=>{assert(key in mocks,key);return mocks[key];},module,module.exports);return module.exports;}
const id='c0dec0de-0000-4000-8000-000000000061';
test('email proxy requires exact origin and bounded input; only availability is returned',async()=>{
 let calls=0;let available=false;
 const {POST}=load('app/api/leads/email/route.ts',{'next/server':{NextResponse:{json:Response.json}},'@/lib/registration-email.server':{EmailCheckError:class extends Error{},checkRegistrationEmail:async()=>{calls++;return available;}},'@/lib/registration-email':{EMAIL_CHECK_UNAVAILABLE:'Consulta indisponível'}});
 const request=(body,origin='https://form.example.invalid')=>new Request('https://form.example.invalid/api/leads/email',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)});
 const body={sourceLeadId:id,email:'person@example.invalid',phone:'11987654321'};
 assert.equal((await POST(request(body,'https://foreign.invalid'))).status,403);assert.equal(calls,0);
 assert.equal((await POST(request({...body,email:'x'.repeat(2100)}))).status,413);assert.equal(calls,0);
 const duplicate=await POST(request(body));assert.deepEqual(await duplicate.json(),{available:false});assert.equal(duplicate.headers.get('cache-control'),'private, no-store');
 available=true;assert.deepEqual(await(await POST(request(body))).json(),{available:true});
});

test('server check hashes the client IP and fails closed on missing, malformed or unavailable results',async()=>{
 const originalFetch=globalThis.fetch,originalKey=process.env.ESCALAMED_FORM_INGEST_KEY;
 try{
  process.env.ESCALAMED_FORM_INGEST_KEY='fixture-secret';
  const crypto=await import('node:crypto');
  const {checkRegistrationEmail,EmailCheckError}=load('lib/registration-email.server.ts',{'node:crypto':crypto,'./phone':{applicationPhoneKey:()=> '11987654321'},'./registration-email':{EMAIL_CHECK_UNAVAILABLE:'Indisponível'}});
  const request=new Request('https://form.example.invalid/api/leads/email',{headers:{'x-forwarded-for':'192.0.2.1'}});
  globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);assert.equal(new URL(url).pathname,'/api/endomax/integrations/escalamed-email');assert.match(body.clientHash,/^[a-f0-9]{64}$/);assert.ok(!options.body.includes('192.0.2.1'));return Response.json({available:false});};
  assert.equal(await checkRegistrationEmail(request,id,'person@example.invalid','11987654321'),false);
  for(const response of [Response.json({}),Response.json({available:true},{status:503})]){
   globalThis.fetch=async()=>response;await assert.rejects(checkRegistrationEmail(request,id,'person@example.invalid',''),error=>error instanceof EmailCheckError&&error.status===503);
  }
  delete process.env.ESCALAMED_FORM_INGEST_KEY;
  await assert.rejects(checkRegistrationEmail(request,id,'person@example.invalid',''),EmailCheckError);
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.ESCALAMED_FORM_INGEST_KEY;else process.env.ESCALAMED_FORM_INGEST_KEY=originalKey;}
});
