const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
// Execute the actual shared client helper without the unrelated page animations.
const helper=fs.readFileSync(require.resolve('../main.js'),'utf8');
const end=helper.indexOf('\n}\n',helper.indexOf('function pureaiBindInquiry'))+3;
for(const kind of ['success','rejected','network','html','unavailable','false-success'])test(`client ${kind}: truthful status and preserved retry state`,async()=>{
 const status={textContent:'',focus(){}};const button={innerHTML:'Send',disabled:false};const consent={checked:true};const trap={value:''};let listener,reset=0,accepted=0,busy=false;
 const notice={style:{},querySelector(s){return s.includes('status')?status:s.includes('consent')?consent:s.includes('website')?trap:{};}};
 const form={insertBefore(){},querySelector(){return button;},addEventListener(_,fn){listener=fn;},reportValidity(){return true;},setAttribute(){busy=true;},removeAttribute(){busy=false;},reset(){reset++;}};
 let posts=0;
 const context={document:{createElement:()=>notice},window:{turnstile:{render(el,o){queueMicrotask(()=>o.callback('token'));return 'widget';},remove(){}}},crypto:require('node:crypto').webcrypto,AbortSignal,setTimeout,clearTimeout,fetch:async(url,options)=>{
 if(!options.method)return {ok:kind!=='unavailable',json:async()=>({siteKey:'public'})};posts++;
 if(kind==='network')throw new TypeError('network');if(kind==='html')return {json:async()=>{throw new SyntaxError('html');}};
 const body=JSON.parse(options.body);return {status:kind==='success'?202:kind==='false-success'?200:502,json:async()=>({accepted:kind==='success'||kind==='false-success',reference:body.requestId})};
 }};
 vm.createContext(context);vm.runInContext(helper.slice(0,end),context);
 context.pureaiBindInquiry(form,'contact',()=>({name:'Visitor',email:'test@example.com',phone:'',message:'Hello'}),()=>accepted++);
 await listener({preventDefault(){}});
 assert.equal(busy,false);assert.equal(button.disabled,false);
 if(kind==='success'){assert.equal(accepted,1);assert.equal(reset,1);assert.match(status.textContent,/accepted for delivery/);}else{assert.equal(accepted,0);assert.equal(reset,0);assert.ok(status.textContent);}
});
