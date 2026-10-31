import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createProvider, validateProviderConfig } from '../server/ai/providers.ts';
import { runBrief } from '../server/ai/orchestrator.ts';
const base = {model:'model',apiKey:'secret',allowedHosts:['api.example.com'],baseUrl:'https://api.example.com',timeoutMs:500,maxOutputTokens:100};
const evidence=[{id:'s',text:'Rainfall 12 mm.',reviewed:true,validUntil:'2027-01-01T00:00:00Z'}],now=new Date('2026-01-01T00:00:00Z');
test('provider wire formats and disabled mode', async () => {
 for (const provider of ['openai-compatible','anthropic']) {
  let request;
  const client=createProvider({...base,provider},async (url,options)=>{request={url,options}; return {ok:true,json:async()=>provider==='anthropic'?{content:[{type:'text',text:'answer'}]}:{choices:[{message:{content:'answer'}}]}}});
  assert.equal((await client.generate({messages:[{role:'user',text:'hello'}]})).text,'answer');
  assert.equal(JSON.parse(request.options.body).max_tokens,100);
  assert.match(request.url,provider==='anthropic'?/\/v1\/messages$/:/\/v1\/chat\/completions$/);
  assert.equal(request.options.redirect,'error');
 }
 assert.equal((await createProvider({provider:'disabled'}).generate({})).status,'disabled');
 assert.throws(()=>validateProviderConfig({...base,provider:'anthropic',baseUrl:'http://api.example.com'}));
 assert.throws(()=>validateProviderConfig({...base,provider:'anthropic',baseUrl:'https://other.example.com'}));
});
test('orchestration requires consent and reviewed fresh evidence and validates output', async () => {
 let calls=0; const provider={generate:async()=>{calls++;return {status:'ok',text:JSON.stringify({statements:[{text:'Rainfall 12 mm.',sourceIds:['s']}]})}}};
 assert.equal((await runBrief({provider,evidence,consent:false,now})).status,'needs_input'); assert.equal(calls,0);
 assert.equal((await runBrief({provider,evidence,consent:true,now})).status,'needs_review');
 assert.equal((await runBrief({provider,evidence,consent:true,now:new Date('2028-01-01')})).status,'abstained');
 assert.equal((await runBrief({provider:{generate:async()=>({status:'ok',text:'invalid'})},evidence,consent:true,now})).status,'abstained');
});
