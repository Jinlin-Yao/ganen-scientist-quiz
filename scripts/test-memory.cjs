'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),core=require('../memory-core.js'),source=require('../data/people.json');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'memory-data.js'),'utf8'),context);
const people=JSON.parse(JSON.stringify(context.window.MEMORY_DATA.people));
assert.equal(people.length,172);
const additions=require('../data/memory-additions.json');
for(const p of people){const base=source.people.find(x=>x.name===p.name),extra=additions[p.name];assert.equal(p.name,base.name);assert.deepEqual(p.groups,base.groups);assert.deepEqual(p.awards,base.awards);assert.equal(p.bio,extra?.bio||base.bio);if(extra)assert.deepEqual(p.titles,extra.titles);}
const decks=core.buildDeck(people),all=[...decks.names,...decks.clues];
assert.equal(decks.names.length,172);assert.equal(decks.clues.filter(c=>c.kind==='work').length,172);assert.equal(decks.clues.filter(c=>c.kind==='quote').length,14);
assert.equal(new Set(all.map(c=>c.id)).size,all.length);
for(const c of decks.clues){assert.ok(c.front.length>(c.kind==='quote'?3:10));assert.ok(c.profile.links.length||c.profile.references.length);for(const p of people)assert.ok(!(c.front+c.context).includes(p.name),'front must not reveal a known person: '+c.id+' / '+p.name);}
const huang=decks.clues.find(c=>c.id==='work:黄纬禄');assert.match(huang.front,/第一代固体潜地战略导弹巨浪一号总设计师/);assert.equal(huang.person,'黄纬禄');
const v={group:'all',kind:'all',query:'',status:'all',order:[]};
assert.equal(core.rows(decks.clues,{...v,query:'巨浪一号'})[0].person,'黄纬禄');
assert.equal(core.rows(decks.clues,{...v,query:'黄纬禄'}).length,0,'reverse search does not inspect the hidden answer');
assert.equal(core.rows(decks.names,{...v,query:'黄纬禄'}).length,1);
assert.equal(core.rows(decks.names,{...v,query:'巨浪一号'}).length,0,'name search does not inspect hidden introductions');
assert.equal(core.rows(decks.names,{...v,group:'两弹一星'}).length,23);
assert.equal(core.rows(decks.names,{...v,group:'共和国勋章'}).length,13);
assert.equal(core.rows(decks.clues,{...v,kind:'quote'}).length,14);
const known={'name:黄纬禄':true};
assert.equal(core.rows(decks.names,{...v,status:'known'},known)[0].person,'黄纬禄');
assert.equal(core.rows(decks.clues,{...v,status:'known'},known).length,0,'each recall direction has its own marks');
assert.equal(core.rows(decks.names,{...v,status:'review'},known).length,171);
const ordered=core.rows(decks.names,{...v,order:['name:黄纬禄','name:于敏']});assert.equal(ordered[0].person,'黄纬禄');assert.equal(ordered[1].person,'于敏');
const saved=core.cleanState({mode:'clues',known:{...known,'deleted':true},views:{names:{last:'name:黄纬禄',order:['name:黄纬禄','name:黄纬禄','deleted']},clues:{query:'巨浪一号',kind:'work',group:'两弹一星',status:'review'}}},decks);
assert.deepEqual(core.cleanState(JSON.parse(JSON.stringify(saved)),decks),saved,'reload keeps mode, filter, order, last position and self-assessment');assert.equal(saved.known.deleted,undefined);assert.equal(saved.views.names.order.length,1);
assert.equal(core.cleanState({known:'bad',views:{names:{order:'bad',group:'bad',last:'deleted'}}},decks).views.names.last,null);
assert.equal(core.escape('<script>"&'), '&lt;script&gt;&quot;&amp;');
// Boot the actual page script with isolated storage and verify its rendered routes and handlers.
const storage={wentian_v1:'{"rec":{"original":{"c":1}},"wrong":[]}'},original=storage.wentian_v1;
function boot(hash){
 const events={},app={innerHTML:'',addEventListener:(name,fn)=>{events[name]=fn}},button={textContent:'',addEventListener:(name,fn)=>{events['switch-'+name]=fn}},notice={textContent:''};
 const c={console,window:null,document:{title:'',getElementById:id=>id==='memory-app'?app:id==='switch-mode'?button:notice},localStorage:{getItem:key=>storage[key]||null,setItem:(key,value)=>{storage[key]=value}},location:{hash},};
 c.window=c;c.addEventListener=(name,fn)=>{events[name]=fn};c.scrollTo=()=>{};vm.createContext(c);
 for(const f of ['memory-data.js','memory-core.js','memory.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
 return {app,button,notice,c,events};
}
let page=boot('#names');assert.equal((page.app.innerHTML.match(/class="memory-card"/g)||[]).length,172);assert.ok(!page.app.innerHTML.includes('class="memory-card" data-card="name:于敏" open'));
assert.match(page.button.textContent,/看关键词猜人物/);
const form={id:'memory-search',elements:{query:{value:'黄纬禄'},group:{value:'all'}}};page.events.submit({target:form,preventDefault(){}});assert.equal((page.app.innerHTML.match(/class="memory-card"/g)||[]).length,1);
page.events.toggle({target:{classList:{contains:k=>k==='memory-card'},dataset:{card:'name:黄纬禄'},open:true}});
page.events.click({target:{closest:()=>({dataset:{mark:'known',card:'name:黄纬禄'}})}});assert.match(page.notice.textContent,/记住了/);
page.events['switch-click']();assert.equal(page.c.location.hash,'#clues');page.events.hashchange();assert.equal((page.app.innerHTML.match(/class="memory-card"/g)||[]).length,186);assert.match(page.button.textContent,/看人名想介绍/);
assert.match(page.app.innerHTML,/0<\/strong>已记住/);
page=boot('#names');assert.equal((page.app.innerHTML.match(/class="memory-card"/g)||[]).length,1);assert.match(page.app.innerHTML,/回到上次卡片/);assert.match(page.app.innerHTML,/1<\/strong>已记住/);
assert.equal(storage.wentian_v1,original,'memory review cannot alter quiz scores or continuation');
assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/memory\.html#names/);assert.match(fs.readFileSync(path.join(root,'people-ui.js'),'utf8'),/memory\.html#names/);
console.log('PASS: 172 names / 186 clue cards; reviewed-data parity; no names on clue fronts; accurate Julang-1 match; private-answer search; group/type/status filters; independent self-assessment; saved mode/order/last-card restoration; actual route switching and rendering; original quiz storage untouched.');
