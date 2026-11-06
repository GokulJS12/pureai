const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
test('both dialogs: acceptance, rejection, outage and retry preserve correct state', async () => {
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const filename=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);try{const data=fs.readFileSync(filename);res.setHeader('Content-Type',filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':'text/html');res.end(data);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})}).catch(error => { server.close(); throw error; });
 try {
 for (const source of ['contact','ai-interest']) {
 const page=await browser.newPage();
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1')?route.continue():route.abort());
 await page.addInitScript(()=>{window.turnstile={render(el,options){setTimeout(()=>options.callback('mock-token'),0);return 'widget';},remove(){}};});
 let mode='failure', posts=[];
 await page.route('**/api/inquiries', async route=>{
 if(route.request().method()==='GET')return route.fulfill({json:{siteKey:'test'}});
 const data=route.request().postDataJSON();posts.push(data);
 if(mode==='network')return route.abort();
 if(mode==='failure')return route.fulfill({status:502,json:{error:'Delivery was not confirmed. Please retry.'}});
 if(mode==='false-success')return route.fulfill({status:200,json:{accepted:true,reference:data.requestId}});
 return route.fulfill({status:202,json:{accepted:true,reference:data.requestId}});
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 if(source==='ai-interest')await page.evaluate(()=>window.ailOpenModal());
 else await page.locator('a[href$="#contact-details"]').first().click();
 const form=page.locator(source==='ai-interest'?'#ail-form':'#pureai-contact-form');
 if(source==='ai-interest') {await form.locator('#ail-name').fill('Test Visitor');await form.locator('#ail-email').fill('visitor@example.com');await form.locator('#ail-query').fill('Please arrange a demo.');}
 else {await form.locator('#contact-fname').fill('Test');await form.locator('#contact-lname').fill('Visitor');await form.locator('#contact-email').fill('visitor@example.com');await form.locator('#contact-message').fill('Please arrange a demo.');}
 await form.locator('button[type=submit]').click();assert.equal(posts.length,0,'consent required');
 await form.locator('[name=inquiry-consent]').check();
 for(const failure of ['failure','network','false-success']){
 mode=failure;await form.locator('button[type=submit]').click();
 await page.waitForFunction(id=>!document.querySelector(id).hasAttribute('aria-busy'),source==='ai-interest'?'#ail-form':'#pureai-contact-form');
 assert.equal(await form.locator('textarea').inputValue(),'Please arrange a demo.');
 assert.match(await form.locator('[data-inquiry-status]').textContent(),/not confirmed|could not be confirmed/);
 }
 mode='success';await form.locator('button[type=submit]').click();
 await page.waitForFunction(id=>!document.querySelector(id).hasAttribute('aria-busy'),source==='ai-interest'?'#ail-form':'#pureai-contact-form');
 assert.equal(posts.length,4);assert.ok(posts.every(p=>p.requestId===posts[0].requestId));assert.ok(posts.every(p=>p.source===source));
 if(source==='ai-interest')assert.match(await page.locator('#ail-success').textContent(),/accepted for delivery/);
 else assert.match(await form.locator('[data-inquiry-status]').textContent(),/accepted for delivery/);
 await page.close();
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
