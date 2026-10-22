'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),policy=require('../data/scu-academicians.json'),source=require('../data/people.json'),raw=require('../data/bank.json'),questions=require('../data/people-bank.json');
const expected=new Set(policy.roster.map(p=>p.name)),school=source.people.filter(p=>p.groups.includes(policy.group));
assert.equal(expected.size,20);assert.equal(policy.roster.filter(p=>p.academy==='中国科学院').length,8);assert.equal(policy.roster.filter(p=>p.academy==='中国工程院').length,12);
assert.deepEqual(new Set(school.map(p=>p.name)),expected);
assert.equal(questions.filter(q=>q.groups.includes(policy.group)).length,68);
assert.deepEqual(new Set(questions.filter(q=>q.groups.includes(policy.group)).map(q=>q.person)),expected);
for(const p of school){assert.equal(p.academician.academy,policy.roster.find(x=>x.name===p.name).academy);assert.ok(p.titles.some(x=>x.includes(p.academician.academy+'院士')));assert.ok(p.links.some(l=>l.url===policy.source.url));}
for(const p of source.people)assert.ok(!p.groups.includes(policy.previousGroup));
assert.ok(source.people.some(p=>p.name==='陈蕾'&&p.groups.includes('最美科技工作者')&&!p.groups.includes(policy.group)));
for(const name of policy.removedFromPreviousGroup.filter(n=>n!=='陈蕾')){assert.ok(!source.people.some(p=>p.name===name));assert.ok(!questions.some(q=>q.person===name));assert.ok(!questions.some(q=>(q.options||[]).includes(name)));}
const retired=new Set(policy.retiredMainQuestionIds);assert.equal(retired.size,40);for(const id of retired)assert.equal(raw.find(q=>q.id===id).studyExcluded,true);
const memory={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'memory-data.js'),'utf8'),memory);
const profiles=JSON.parse(JSON.stringify(memory.window.MEMORY_DATA.people));assert.deepEqual(new Set(profiles.filter(p=>p.groups.includes(policy.group)).map(p=>p.name)),expected);
const core=require('../memory-core.js'),decks=core.buildDeck(profiles),v={group:policy.group,kind:'all',query:'',status:'all',order:[]};assert.equal(core.rows(decks.names,v).length,20);assert.equal(core.rows(decks.clues,v).length,21);
const migrated=core.cleanState({known:{'name:徐僖':true,'name:张铨':true},views:{names:{group:policy.previousGroup,last:'name:张铨',order:['name:张铨','name:徐僖']}}},decks);assert.equal(migrated.views.names.group,policy.group);assert.equal(migrated.known['name:徐僖'],true);assert.equal(migrated.known['name:张铨'],undefined);assert.equal(migrated.views.names.last,null);assert.deepEqual(migrated.views.names.order,['name:徐僖']);
const id=(name,key)=>'person_'+crypto.createHash('sha256').update(name+'|'+key).digest('hex').slice(0,14),removed=id('张铨','field'),kept=id('徐僖','field');
const stored={rec:{f46:{c:3,w:1}},wrong:['f46'],practiceSession:{module:'main',ids:['f46'],currentId:'f46',draft:{fillValue:'甲种'}},peopleCatalog:{group:policy.previousGroup,person:'张铨',completion:'all'},peopleSession:{ids:[removed,kept],currentId:removed,draft:{},module:'people'}};
const storage={wentian_v1:JSON.stringify(stored)},app={innerHTML:''};const c={console,Date,window:null,document:{querySelector:()=>app},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},scrollTo(){},setInterval(){return 1},clearInterval(){},setTimeout(){}};c.window=c;vm.createContext(c);
for(const file of ['core.js','questions.js','my-school.js','knowledge.js','people.js','explanations.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const inline=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];vm.runInContext(inline.slice(inline.indexOf('const META=')),c);vm.runInContext(fs.readFileSync(path.join(root,'people-ui.js'),'utf8'),c);const run=s=>vm.runInContext(s,c);run('__boot()');
assert.equal(run('BANK.length'),1151);assert.ok(run('BANK.every(q=>!q.studyExcluded)'));assert.ok(run('BANK.every(q=>!'+JSON.stringify([...retired])+'.includes(q.id))'));
run('C.query="张洪沅";C.completion="all"');assert.equal(run('catalogRows().length'),0);
assert.equal(run('PC.group'),policy.group);assert.equal(run('PC.person'),'all');run('openPeople()');assert.equal(run('new Set(peopleRows().map(q=>q.person)).size'),20);assert.match(app.innerHTML,/川大历代两院院士/);
run('resumePractice("people")');assert.equal(run('currentQ().id'),kept);assert.equal(run('data.rec.f46.c'),3);assert.equal(run('data.practiceSession.draft.fillValue'),'甲种');
console.log('PASS: exact 20-person official roster; academic titles and sources; 68 questions / 20 names / 21 clues; excluded rows absent from all runtime banks; other honor groups retained; legacy filters, removed-question continuation and existing progress preserved.');
