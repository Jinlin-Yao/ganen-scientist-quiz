'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),core=require('../core.js'),bank=require('../data/people-bank.json'),source=require('../data/people.json');
assert.deepEqual(core.validateBank([...require('../data/bank.json'),...bank]),[]);
assert.ok(bank.every(q=>['single','fill'].includes(q.type)&&q.module==='people'&&!q.examEligible));
assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
assert.ok(bank.filter(q=>q.topic==='名言').every(q=>q.links.length));
const groups=g=>source.people.filter(p=>p.groups.includes(g));
assert.equal(groups('两弹一星').length,23);assert.equal(groups('人民科学家').length,7);assert.equal(groups('共和国勋章').length,13);
const medals=groups('共和国勋章').flatMap(p=>p.awards.filter(a=>a.name==='共和国勋章'));
assert.equal(medals.filter(a=>a.year===2019).length,8);assert.equal(medals.filter(a=>a.year===2020).length,1);assert.equal(medals.filter(a=>a.year===2024).length,4);
assert.ok(!bank.some(q=>source.selectionPolicy.excludedGandong.some(n=>q.person===n)));
assert.ok(bank.some(q=>q.person==='陈蕾'&&q.groups.includes('川大科学家/院士')&&q.groups.includes('最美科技工作者')));
assert.ok(!JSON.stringify(source.people.find(p=>p.name==='黄宗德')).includes('一级战斗英雄'));
for(const q of bank){if(q.type==='fill'){assert.ok(core.checkFill(q,q.answer));assert.ok(!core.checkFill(q,''));assert.ok(!core.checkFill(q,'不是'+q.answer));}else{assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4)}}
const storage={};let input='';
function boot(){
 const app={innerHTML:''},c={console,Date,window:null,document:{querySelector:s=>s==='#fillIn'?{value:input}:app},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},scrollTo(){},setInterval(){return 1},clearInterval(){},setTimeout(){}};c.window=c;vm.createContext(c);
 for(const file of ['core.js','questions.js','my-school.js','knowledge.js','people.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
 const inline=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];vm.runInContext(inline.slice(inline.indexOf('const META=')),c);
 vm.runInContext(fs.readFileSync(path.join(root,'people-ui.js'),'utf8'),c);vm.runInContext('__boot()',c);return {run:s=>vm.runInContext(s,c),app};
}
let t=boot();assert.equal(t.run('BANK.length'),1191);assert.equal(t.run('PEOPLE.length'),bank.length);assert.match(t.app.innerHTML,/科学家人物专项/);
const originalSession=()=>t.run('JSON.stringify(Object.fromEntries(Object.entries(data.practiceSession).filter(([k])=>k!=="savedAt")))');
t.run('openCatalogQuestion("f46");practiceDraft("甲种")');const original=originalSession();
t.run('practiceDirectory();openPeople()');assert.match(t.app.innerHTML,/人物题目目录/);
for(const [g,y,n] of [['共和国勋章','2019',8],['共和国勋章','2024',4],['共和国勋章','1999',0],['人民科学家','2024',2],['最美科技工作者','2022',10],['最美科技工作者','2026',10]]){
 t.run(`peoplePeriod(${JSON.stringify(g)},${JSON.stringify(y)})`);assert.equal(t.run('new Set(peopleRows().map(q=>q.person)).size'),n,g+y);
}
t.run('peoplePeriod("最美科技工作者","2026");PC.type="fill";renderPeople();practicePeople(true);practiceDraft("尚未提交的草稿")');const id=t.run('currentQ().id'),order=t.run('JSON.stringify(P.list.map(q=>q.id))');
assert.equal(originalSession(),original,'the original bank continuation is preserved');
t=boot();t.run('openPeople();resumePractice("people")');assert.equal(t.run('currentQ().id'),id);assert.equal(t.run('P.fillValue'),'尚未提交的草稿');assert.equal(t.run('JSON.stringify(P.list.map(q=>q.id))'),order);assert.equal(t.run('P.module'),'people');
input=t.run('currentQ().answer');t.run('gradeFill()');assert.match(t.app.innerHTML,/知识点资料/);assert.equal(t.run('data.rec[currentQ().id].c'),1);const rec=t.run('JSON.stringify(data.rec[currentQ().id])');
t=boot();t.run('resumePractice("people")');assert.equal(t.run('P.answered'),true);assert.equal(t.run('JSON.stringify(data.rec[currentQ().id])'),rec);t.run('gradeFill()');assert.equal(t.run('JSON.stringify(data.rec[currentQ().id])'),rec,'reload and repeat submission never double score');
t.run('practiceDirectory();PC.type="all";peopleTab("done")');assert.equal(t.run('peopleRows().length'),1);t.run('peopleTab("todo")');assert.equal(t.run('peopleRows().some(q=>q.id===data.peopleSession.currentId)'),false);
t.run('resumePractice()');assert.equal(t.run('currentQ().id'),'f46');assert.equal(t.run('P.fillValue'),'甲种');
t.run('openPeople();peopleReset();peopleTab("all");PC.kind="名言";renderPeople()');assert.equal(t.run('peopleRows().length'),28);
t.run('peopleMode("profiles")');assert.match(t.app.innerHTML,/人物速查/);assert.match(t.app.innerHTML,/话语出处/);
t.run('peopleReset();PC.mode="questions";practicePeople(true)');assert.ok(t.run('P.list.every(q=>q.module==="people")'));t.run('startExam()');assert.ok(t.run('EX.list.every(q=>q.module!=="people")'));
assert.ok(t.run('PEOPLE.every(q=>KNOWLEDGE[q.id]?.paragraphs.length>0)'));
console.log('PASS: independent scope and original-bank isolation; 13 medal holders; 23 pioneers; 7 People’s Scientists; approved exclusions; year/topic filters; fill grading; separate draft/queue restoration; no duplicate scoring; done/todo separation; cited knowledge and quotations; roster; main exams unchanged.');
