'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),bank=[...require('../data/bank.json'),...require('../data/people-bank.json')],details=require('../data/option-explanations.json'),sources=require('../data/option-explanations-source.json');
const choices=bank.filter(q=>['single','multiple'].includes(q.type));
assert.equal(choices.length,485);assert.equal(Object.keys(details).length,choices.length);
assert.equal(choices.reduce((n,q)=>n+q.options.length,0),1920);
for(const q of choices){
 const d=details[q.id];assert.ok(d,q.id);assert.equal(d.options.length,q.options.length,q.id+' all options');
 assert.ok(d.summary.length>15&&d.memory.length>8,q.id+' summary and memory');
 d.options.forEach((o,i)=>{
  assert.equal(o.correct,Array.isArray(q.answer)?q.answer.includes(i):q.answer===i,q.id+' option '+i);
  assert.ok(o.paragraphs.length&&o.paragraphs.every(p=>p.trim().length>0));assert.ok(o.references.length);
  assert.ok(o.links.every(x=>/^https?:\/\//.test(x.url)),q.id+' citations');
 });
}
const storage={};const app={innerHTML:''};
const c={console,Date,window:null,document:{querySelector:()=>app},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},scrollTo(){},setInterval(){return 1},clearInterval(){},setTimeout(){}};c.window=c;vm.createContext(c);
for(const file of ['core.js','questions.js','my-school.js','knowledge.js','people.js','explanations.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const inline=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];vm.runInContext(inline.slice(inline.indexOf('const META=')),c);vm.runInContext(fs.readFileSync(path.join(root,'people-ui.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c);run('__boot()');
// Render every explanation, including multi-select and two-option judgments.
for(const q of choices){
 c.testQuestion=q;const html=run('optionExplanationsHTML(testQuestion,[])');
 assert.equal((html.match(/<article class="option-analysis-item/g)||[]).length,q.options.length,q.id);
 assert.match(html,/本题关键/);assert.match(html,/对照记忆/);assert.equal((html.match(/本项依据与来源/g)||[]).length,q.options.length);
}
// Do not leak explanations before submission, in either practice or exam.
run('startPractice(false,[PEOPLE.find(q=>q.type==="single")])');assert.ok(!app.innerHTML.includes('aria-label="逐项解析"'));
run('pick(currentQ().answer)');assert.match(app.innerHTML,/aria-label="逐项解析"/);assert.match(app.innerHTML,/你选了此项/);
const record=run('JSON.stringify(data.rec)');run('render()');assert.equal(run('JSON.stringify(data.rec)'),record,'rendering detailed explanations cannot change scores');
run('startPractice(false,[PEOPLE.find(q=>q.type==="single"&&!hasDone(q))]);reviewExplanation()');assert.match(app.innerHTML,/不新增作答记录/);assert.equal(run('JSON.stringify(data.rec)'),record,'reading explanations never marks an unattempted question as done');
run('selfMark(true);rememberPractice()');assert.equal(run('JSON.stringify(data.rec)'),record);assert.equal(run('data.peopleSession.draft.reviewOnly'),true);
run('resumePractice("people")');assert.equal(run('P.reviewOnly'),true);assert.equal(run('JSON.stringify(data.rec)'),record);run('retryReviewedQuestion()');assert.equal(run('P.answered'),false);assert.equal(run('P.reviewOnly'),false);
run('startExam()');assert.ok(!app.innerHTML.includes('aria-label="逐项解析"'));
run('EX.ans={};for(const q of EX.list){if(q.type==="single")EX.ans[q.id]={sel:[q.answer]};else if(q.type==="multiple")EX.ans[q.id]={sel:q.answer};else if(q.type==="fill")EX.ans[q.id]={text:q.answer}};submitExam()');
assert.equal((app.innerHTML.match(/aria-label="逐项解析"/g)||[]).length,25,'exam review includes every single- and multi-select explanation');
// Honor explanations must not claim that another genuine honor was never held.
const sun=choices.find(q=>q.module==='people'&&q.person==='孙家栋'&&q.question.includes('1999年')&&q.topic==='头衔');
const sunRepublic=sun.options.indexOf('共和国勋章');assert.match(details[sun.id].options[sunRepublic].paragraphs.join(''),/确实另于2019年/);
const qian=choices.find(q=>q.module==='people'&&q.person==='钱学森'&&q.question.includes('1999年')&&q.topic==='头衔');
assert.match(details[qian.id].options[qian.options.indexOf('国家杰出贡献科学家')].paragraphs.join(''),/确于1991年/);
const reverse=choices.find(q=>q.id==='q_606769b5dfb6');assert.match(details[reverse.id].options[0].paragraphs.join(''),/本题问“不属于”/);
assert.equal(bank.find(q=>q.id==='s01').options[0],'中子弹');assert.match(bank.find(q=>q.id==='s31').note,/孙友宏/);
assert.ok(sources.reviewAdjustments.length===4);
console.log('PASS: 485 choice questions / 1920 aligned option explanations; cited sources; all HTML renders; no pre-answer leaks; selected-option marks; no scoring side effects; exam review; genuine cross-honors; reverse questions; ambiguity corrections.');
