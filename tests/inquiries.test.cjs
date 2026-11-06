const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handleInquiry } = require('../server/inquiries.cjs');
const env = { INQUIRY_ALLOWED_ORIGINS: 'https://pureaiglobal.com', INQUIRY_FROM: 'website@example.com', INQUIRY_TO: 'team@example.com', RESEND_API_KEY: 'test-secret', TURNSTILE_SECRET_KEY: 'test-secret', TURNSTILE_SITE_KEY: 'public-key' };
const valid = { name: 'Test Visitor', email: 'visitor@example.com', phone: '', message: 'Please arrange an MSB demo.', consent: true, source: 'contact', website: '', token: 'test-token', requestId: '12345678-1234-4123-8123-123456789012' };
const request = data => ({ method: 'POST', headers: { origin: 'https://pureaiglobal.com', 'content-type': 'application/json' }, body: JSON.stringify(data) });
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, json: async () => body });
function mock(delivery = response({ id: 'provider-id' }), check = response({ success: true, hostname: 'pureaiglobal.com', action: 'inquiry' })) {
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({url, options}); return calls.length % 2 === 1 ? check : delivery; };
  return { calls, fetchImpl };
}
for (const source of ['contact', 'ai-interest']) test(`${source}: acknowledged acceptance, fixed recipient and text-only message`, async () => {
 const m = mock(); const result = await handleInquiry(request({...valid, source}), { env, fetchImpl: m.fetchImpl });
 assert.equal(result.status, 202); assert.equal(result.body.accepted, true); assert.equal(m.calls.length, 2);
 const payload = JSON.parse(m.calls[1].options.body);
 assert.deepEqual(payload.to, ['team@example.com']); assert.equal(payload.reply_to, valid.email); assert.equal(payload.html, undefined);
 assert.equal(result.headers['Cache-Control'], 'no-store');
});
for (const patch of [{ email: 'bad' }, { name: '' }, { name: 'bad\r\nheader' }, { consent: false }, { message: 'x'.repeat(5001) }, { phone: 'not a phone' }, { website: 'spam' }, { token: '' }, { source: 'other' }, { requestId: 'bad' }, { email: ['a@b.com'] }]) test(`invalid input rejected: ${Object.keys(patch)}`, async () => {
 const m=mock(); assert.equal((await handleInquiry(request({...valid,...patch}), {env, fetchImpl:m.fetchImpl})).status,400); assert.equal(m.calls.length,0);
});
test('missing configuration fails closed, including public config', async () => {
 for (const method of ['GET','POST']) assert.equal((await handleInquiry({...request(valid),method},{env:{}})).status,503);
});
test('public config exposes only site key', async () => { const r=await handleInquiry({method:'GET'},{env}); assert.deepEqual(r.body,{siteKey:'public-key'}); });
for (const [patch,status] of [[{method:'DELETE'},405],[{headers:{origin:'https://evil.example','content-type':'application/json'}},403],[{headers:{origin:'https://pureaiglobal.com','content-type':'text/plain'}},415],[{body:'{'},400],[{body:'null'},400],[{body:'x'.repeat(16385)},413]]) test(`request rejected with ${status}`,async()=>{const m=mock();assert.equal((await handleInquiry({...request(valid),...patch},{env,fetchImpl:m.fetchImpl})).status,status);assert.equal(m.calls.length,0);});
for (const check of [{success:false},{success:true,hostname:'evil.example',action:'inquiry'},{success:true,hostname:'pureaiglobal.com',action:'other'}]) test('forged or wrong-context challenge rejected',async()=>{const m=mock(undefined,response(check));assert.equal((await handleInquiry(request(valid),{env,fetchImpl:m.fetchImpl})).status,400);assert.equal(m.calls.length,1);});
for (const delivery of [response({},429),response({},500),response({},401),response({}),{ok:true,json:async()=>{throw Error('malformed');}}]) test('provider failure never confirms acceptance',async()=>{const m=mock(delivery);const r=await handleInquiry(request(valid),{env,fetchImpl:m.fetchImpl});assert.ok(r.status>=500);assert.notEqual(r.body.accepted,true);});
test('network failure and timeout do not leak provider details',async()=>{for(const name of ['TypeError','TimeoutError']){const r=await handleInquiry(request(valid),{env,fetchImpl:async()=>{const e=Error('private data');e.name=name;throw e;}});assert.equal(r.status,503);assert.ok(!JSON.stringify(r).includes('private data'));}});
test('security service outage never calls delivery',async()=>{const m=mock(undefined,response({},500));assert.equal((await handleInquiry(request(valid),{env,fetchImpl:m.fetchImpl})).status,503);assert.equal(m.calls.length,1);});
test('retry keeps provider idempotency key; changed content changes key',async()=>{const m=mock();for(const data of [valid,valid,{...valid,message:'Changed inquiry'}])await handleInquiry(request(data),{env,fetchImpl:m.fetchImpl});assert.equal(m.calls[1].options.headers['Idempotency-Key'],m.calls[3].options.headers['Idempotency-Key']);assert.notEqual(m.calls[3].options.headers['Idempotency-Key'],m.calls[5].options.headers['Idempotency-Key']);});
test('Netlify adapter and Vercel adapter return matching acceptance',async()=>{
 const previous={...process.env}; const originalFetch=global.fetch;
 Object.assign(process.env,env);
 try {
 const m=mock();global.fetch=m.fetchImpl;
 const n=await require('../netlify/functions/inquiries.js').handler({httpMethod:'POST',headers:request(valid).headers,body:Buffer.from(JSON.stringify(valid)).toString('base64'),isBase64Encoded:true});assert.equal(n.statusCode,202);
 const res={setHeader(){},end(body){this.body=JSON.parse(body);}};
 await require('../api/inquiries.js')({...request(valid),body:valid},res);assert.equal(res.statusCode,202);assert.equal(res.body.accepted,true);
 }finally{global.fetch=originalFetch;for(const key of Object.keys(env)){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
