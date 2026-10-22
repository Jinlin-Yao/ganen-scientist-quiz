'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const core=require(path.join(root,'core.js'));
const bank=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json')));
assert.deepEqual(core.validateBank(bank),[]);
assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
const sourceCount=(doc,prefix)=>new Set(bank.flatMap(q=>q.references.filter(r=>r.document===doc&&r.location.startsWith(prefix)).map(r=>r.location))).size;
assert.equal(sourceCount('elan','Q'),135,'All 135 supplied ELAN questions are traceable');
const coverage=JSON.parse(fs.readFileSync(path.join(root,'data/coverage.json')));
assert.equal(coverage.filter(r=>r.status==='未逐句出题').length,0);
for(const q of bank.filter(q=>q.type==='fill')){
 assert.equal(core.checkFill(q,q.answer),true,q.id+' own answer');
 assert.equal(core.checkFill(q,''),false,q.id+' blank');
 assert.equal(core.checkFill(q,'不是'+q.answer),false,q.id+' negated');
}
assert.equal(core.checkFill({answer:'南仁东',acceptedAnswers:['南仁东']},'南 仁 东'),true);
assert.equal(core.checkFill({answer:'FAST',acceptedAnswers:['FAST','中国天眼']},'fast'),true);
assert.equal(core.checkFill({answer:'5',matchMode:'groups',keywordGroups:[['5']]},'15'),false);
// Drive the app state through practice, overrides, wrongbook and complete mock exams.
const app={innerHTML:''};let input='';const saved={};let timerCount=0;
const c={console,window:null,document:{querySelector:s=>s==='#fillIn'?{value:input}:app},localStorage:{getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v},scrollTo(){},setInterval(){timerCount++;return timerCount},clearInterval(){},setTimeout(){}};c.window=c;vm.createContext(c);
for(const file of ['core.js','questions.js','my-school.js','knowledge.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
vm.runInContext(scripts[0].slice(scripts[0].indexOf('const META=')),c);vm.runInContext('window.__boot()',c);
const run=s=>vm.runInContext(s,c);
assert.equal(run('BANK.length'),bank.length);assert.match(app.innerHTML,/我的题目目录/);
run('startPractice(false,[BANK.find(q=>q.type==="fill"&&q.examEligible)])');
const fillID=run('P.list[0].id');input=run('P.list[0].answer');run('gradeFill()');assert.equal(run(`data.rec[${JSON.stringify(fillID)}].c`),1);
run('selfMark(true)');assert.equal(run(`data.rec[${JSON.stringify(fillID)}].c`),1,'self-confirmation is not double-counted');
run('startPractice(false,[BANK.find(q=>q.type==="fill"&&q.examEligible)])');input='错误回答';run('gradeFill()');run('selfMark(true)');assert.equal(run(`data.rec[${JSON.stringify(fillID)}].w`),0,'self override restores previous state');
run('startPending()');assert.ok(run('P.list.length>0&&P.list.every(q=>q.status==="pending")'));
run('C.query="甲种分离膜";C.completion="all";renderCatalog()');assert.match(app.innerHTML,/吴自良/);
for(let i=0;i<10;i++){
 run('startExam()');assert.equal(run('EX.list.length'),37);assert.ok(run('EX.list.every(q=>q.status!=="pending"&&q.examEligible!==false)'));
 run('for(const q of EX.list){EX.ans[q.id]=q.type==="single"?{sel:[q.answer]}:q.type==="multiple"?{sel:[...q.answer]}:q.type==="fill"?{text:q.answer}:{text:"口述"}};submitExam()');
 assert.equal(run('EX.score'),80);
 run('EX.review.forEach((r,i)=>{if(r.q.type==="flash")selfScore(i,10)})');
 assert.equal(run('EX.review.reduce((s,r)=>s+(r.got||0),0)'),100);
 const once=run('JSON.stringify(data.rec)');run('EX.review.forEach((r,i)=>{if(r.q.type==="flash")selfScore(i,10)})');assert.equal(run('JSON.stringify(data.rec)'),once,'repeated self-scoring is idempotent');
}
assert.equal(run('BANK.filter(q=>q.status==="pending").length'),10);
console.log('PASS: bank integrity; all 135 ELAN questions; complete paragraph audit; fill grading; practice overrides; search; 10 complete 100-point exams; repeat scoring.');
