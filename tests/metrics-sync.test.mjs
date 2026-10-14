import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

const module={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/metrics.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module,module.exports);
const {syncLeadToMetrics,MetricsSyncError}=module.exports;
const id='c0dec0de-0000-4000-8000-000000000036';
const result=(extra={})=>({ok:true,leadId:id,funnelId:'37d22918-499b-4835-8e75-ed30270a555e',stage:'Qualificação',created:false,ignored:false,...extra});
const payload={sourceLeadId:id,name:'QA fictícia',email:'qa@example.invalid',phone:'11999990036',instagram:'qa_ficticia',status:'completed',currentStep:1};
const originalFetch=globalThis.fetch,originalKey=process.env.ESCALAMED_FORM_INGEST_KEY;
test.after(()=>{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.ESCALAMED_FORM_INGEST_KEY;else process.env.ESCALAMED_FORM_INGEST_KEY=originalKey;});
process.env.ESCALAMED_FORM_INGEST_KEY='fixture-secret';
function response(data,status=200){globalThis.fetch=async(url,options)=>{assert.ok(String(url).startsWith('https://'));assert.equal(options.method,'POST');assert.equal(options.headers['x-escalamed-key'],'fixture-secret');return Response.json(data,{status});};}

test('only an accepted, exact-funnel acknowledgement confirms submission',async()=>{
 response(result());assert.equal((await syncLeadToMetrics(payload)).leadId,id);
 response(result({ignored:true,profileOnly:true,stage:'Confirmado',reason:'profile_replay'}));assert.equal((await syncLeadToMetrics(payload)).stage,'Confirmado');
 response(result({leadId:null,stage:null,ignored:true,reason:'identity_incomplete'}));assert.equal((await syncLeadToMetrics({...payload,status:'started'})).leadId,null);
});
test('HTTP 200 review is rejected, just like the newer HTTP 409',async()=>{
 for(const reason of ['identity_review','review','provisional_review','deleted']) {response(result({ignored:true,reason}));await assert.rejects(syncLeadToMetrics(payload),error=>error instanceof MetricsSyncError&&error.needsReview);}
 response({code:'registration_review'},409);await assert.rejects(syncLeadToMetrics(payload),error=>error.needsReview);
});
test('missing/malformed acknowledgements and infrastructure failures never mean success',async()=>{
 for(const data of [null,{},result({ok:false}),result({leadId:null}),result({leadId:'invalid'}),result({funnelId:'foreign'})]) {response(data);await assert.rejects(syncLeadToMetrics(payload),MetricsSyncError);}
 response({error:'private details'},503);await assert.rejects(syncLeadToMetrics(payload),error=>error instanceof MetricsSyncError&&!error.needsReview&&!error.message.includes('private'));
});

test('durable received acknowledgement accepts review without claiming a CRM card',async()=>{
 for(const processing of ['review','pending','deleted']){
  response(result({received:true,submissionId:id,processing,leadId:null,ignored:true}),202);
  const received=await syncLeadToMetrics(payload);assert.equal(received.submissionId,id);assert.equal(received.leadId,null);
 }
 response(result({received:true,submissionId:'invalid',processing:'review',leadId:null,reason:'identity_review'}),202);
 await assert.rejects(syncLeadToMetrics(payload),MetricsSyncError);
});
