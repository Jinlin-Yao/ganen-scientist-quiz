'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');const bank=require('../data/bank.json'),knowledge=require('../data/knowledge.json');
const storage={};let input='';
function boot(){
 const app={innerHTML:''};
 const c={console,Date,window:null,document:{querySelector:s=>s==='#fillIn'?{value:input}:app},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},scrollTo(){},setInterval(){return 1},clearInterval(){},setTimeout(){}};c.window=c;vm.createContext(c);
 for(const file of ['core.js','questions.js','my-school.js','knowledge.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
 const script=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];vm.runInContext(script.slice(script.indexOf('const META=')),c);vm.runInContext('__boot()',c);
 return {run:s=>vm.runInContext(s,c),app};
}
const legacy={rec:{f46:{c:2,w:1}},wrong:['f46'],customLegacyField:'kept'};storage.wentian_v1=JSON.stringify(legacy);
let t=boot();assert.equal(t.run('data.rec.f46.c'),2);assert.equal(t.run('data.customLegacyField'),'kept');
assert.equal(t.run('stats().done'),1);assert.equal(t.run('catalogRows().some(q=>q.id==="f46")'),false);
t.run('catalogTab("done")');assert.equal(t.run('catalogRows().length'),1);assert.match(t.app.innerHTML,/吴自良/);
t.run('catalogTab("all");openCatalogQuestion("f46");practiceDraft("甲种")');assert.equal(t.run('P.fillValue'),'甲种');
// Recreate the entire application context as a browser reload would.
t=boot();assert.match(t.app.innerHTML,/继续上次练习/);t.run('resumePractice()');assert.equal(t.run('currentQ().id'),'f46');assert.equal(t.run('P.fillValue'),'甲种');assert.equal(t.run('P.answered'),false);
input='甲种分离膜';t.run('gradeFill()');assert.equal(t.run('data.rec.f46.c'),3);assert.match(t.app.innerHTML,/知识点资料/);const oldScore=t.run('data.rec.f46.c');
t=boot();t.run('resumePractice()');assert.equal(t.run('P.answered'),true);assert.equal(t.run('P.fillValue'),'甲种分离膜');assert.equal(t.run('data.rec.f46.c'),oldScore);assert.match(t.app.innerHTML,/知识点资料/);
t.run('selfMark(false)');assert.equal(t.run('data.rec.f46.c'),2);assert.equal(t.run('data.rec.f46.w'),2);assert.equal(t.run('P.manualGrade'),false);assert.equal(t.run('currentQ().id'),'f46','self assessment stays on the explanation');
const beforeRepeat=t.run('JSON.stringify(data.rec.f46)');t.run('selfMark(false)');assert.equal(t.run('JSON.stringify(data.rec.f46)'),beforeRepeat);
// Saved shuffle order and selected checkbox survive reload, rather than reshuffling.
t.run('startPractice(true,BANK.filter(q=>q.type==="multiple"));pick(0)');const order=t.run('JSON.stringify(P.list.map(q=>q.id))'),current=t.run('currentQ().id');
t=boot();t.run('resumePractice()');assert.equal(t.run('JSON.stringify(P.list.map(q=>q.id))'),order);assert.equal(t.run('currentQ().id'),current);assert.equal(t.run('JSON.stringify(P.sel)'),'[0]');
t.run('nextQ()');const next=t.run('currentQ().id');t=boot();t.run('resumePractice()');assert.equal(t.run('currentQ().id'),next);assert.equal(t.run('P.sel.length'),0);
// Flashcards count as done after explicit self assessment, and show materials before moving on.
t.run('startPractice(false,[BANK.find(q=>q.type==="flash"&&q.status!=="pending"&&!hasDone(q))]);reveal()');const flash=t.run('currentQ().id');assert.equal(t.run('hasDone(currentQ())'),false);t.run('selfMark(true)');assert.equal(t.run('hasDone(currentQ())'),true);assert.equal(t.run('currentQ().id'),flash);
t=boot();t.run('resumePractice()');assert.equal(t.run('P.manualGrade'),true);assert.equal(t.run('currentQ().id'),flash);assert.match(t.app.innerHTML,/已标记为掌握/);
// Completion tabs remain disjoint and include old and new records.
t.run('go({name:"home"});C.query="";C.topic="all";C.status="study";C.completion="done"');const done=new Set(t.run('catalogRows().map(q=>q.id)'));t.run('C.completion="todo"');const todo=t.run('catalogRows().map(q=>q.id)');assert.equal(todo.some(id=>done.has(id)),false);assert.equal(done.size+todo.length,bank.filter(q=>q.status!=='pending').length);
for(const q of bank){assert.ok(knowledge[q.id]?.paragraphs?.length,q.id+' material exists');assert.ok(knowledge[q.id].paragraphs.every(p=>p.text.length>0&&p.references.length>0),q.id+' material and source are readable');}
assert.ok(knowledge.c07.paragraphs.some(p=>p.text.includes('点缺陷')),'review materials add biographical context beyond the bare answer');
assert.ok(!knowledge.q_a785a877879d.paragraphs.some(p=>p.text.includes('樊锦诗')),'avoid unrelated biographies with similar question wording');
assert.ok(!knowledge.q_34a6b89ef841.paragraphs.some(p=>p.text.includes('2007 年 10 月 24 日')),'do not confuse Chang’e-1 and Chang’e-2 dates');
// An obsolete question ID cannot break continuation after a future bank update.
const state=JSON.parse(storage.wentian_v1);state.practiceSession.ids.unshift('removed-question');storage.wentian_v1=JSON.stringify(state);t=boot();t.run('resumePractice()');assert.ok(t.run('P.list.every(q=>q&&q.id)'));
console.log('PASS: legacy migration; done/todo tabs; direct question entry; text and checkbox drafts; reload continuation; shuffle order; no repeat scoring; flash self assessment; all 1191 review materials; removed-ID recovery.');
