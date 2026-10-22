'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),storage={};let input='';
function boot(hash=''){
 const app={innerHTML:''},c={console,Date,window:null,document:{querySelector:s=>s==='#fillIn'?{value:input}:app},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},location:{hash,pathname:'/',search:''},history:{replaceState(){}},scrollTo(){},setInterval(){return 1},clearInterval(){},setTimeout(){}};c.window=c;vm.createContext(c);
 for(const file of ['core.js','questions.js','my-school.js','knowledge.js','people.js','explanations.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
 const inline=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];vm.runInContext(inline.slice(inline.indexOf('const META=')),c);
 for(const file of ['people-ui.js','focus-ui.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
 vm.runInContext('__boot()',c);return {run:s=>vm.runInContext(s,c),app};
}
let t=boot('#focus');assert.equal(t.run('view.name'),'focus');assert.match(t.app.innerHTML,/五专题专项题库/);
assert.equal(t.run('FOCUS.length'),363);assert.equal(t.run('focusProfiles.length'),80);
assert.equal(t.run('FOCUS.filter(q=>q.type==="single").length'),213);assert.equal(t.run('FOCUS.filter(q=>q.type==="fill").length'),150);
assert.equal(t.run('new Set(FOCUS.map(q=>q.sourceQuestionId)).size'),363);
assert.equal(t.run('QuizCore.validateBank(allQuestions()).length'),0);
assert.ok(t.run('FOCUS.every(q=>q.module==="focus"&&["single","fill"].includes(q.type)&&q.groups.length&&q.groups.every(g=>FOCUS_GROUPS.includes(g)))'));
assert.ok(t.run('FOCUS.every(q=>PEOPLE.some(p=>p.id===q.sourceQuestionId&&p.question===q.question))'));
assert.equal(t.run('PEOPLE.filter(q=>q.groups.some(g=>FOCUS_GROUPS.includes(g))).length'),363,'the entire five-group union is included once');
for(const [g,n] of [['两弹一星',23],['共和国勋章',13],['人民科学家',7],['公众号补充人物',22],['川大历代两院院士',20]]){
 t.run(`focusGroup(${JSON.stringify(g)})`);assert.equal(t.run('new Set(focusRows().map(q=>q.person)).size'),n,g);
}
assert.ok(!t.run('FOCUS.some(q=>q.person==="陈蕾")'),'non-academician SCU scientist outside five groups is excluded');
assert.ok(t.run('FOCUS.every(q=>KNOWLEDGE[q.sourceQuestionId]?.paragraphs.length)'));
assert.ok(t.run('FOCUS.filter(q=>q.type==="single").every(q=>window.OPTION_EXPLANATIONS[q.sourceQuestionId]?.options.length===q.options.length)'));
// Existing main and people drafts survive focus practice and reload.
t.run('openCatalogQuestion("f46");practiceDraft("主库草稿");practiceDirectory();openPeople();peopleTab("all");PC.type="fill";practicePeople(true);practiceDraft("人物草稿")');
const sessionSnapshot=key=>t.run(`JSON.stringify(Object.fromEntries(Object.entries(data.${key}).filter(([k])=>k!=="savedAt")))`);
const original=sessionSnapshot('practiceSession'),people=sessionSnapshot('peopleSession');
t.run('practiceDirectory();openFocus();focusReset();FC.type="fill";practiceFocus(true);practiceDraft("专项草稿")');
const focusId=t.run('currentQ().id'),order=t.run('JSON.stringify(P.list.map(q=>q.id))');
assert.equal(sessionSnapshot('practiceSession'),original);assert.equal(sessionSnapshot('peopleSession'),people);
t=boot('#focus');assert.match(t.app.innerHTML,/继续上次练习/);t.run('resumePractice("focus")');assert.equal(t.run('currentQ().id'),focusId);assert.equal(t.run('P.module'),'focus');assert.equal(t.run('P.fillValue'),'专项草稿');assert.equal(t.run('JSON.stringify(P.list.map(q=>q.id))'),order);
input=t.run('currentQ().answer');t.run('gradeFill()');assert.match(t.app.innerHTML,/知识点资料/);assert.equal(t.run('data.rec[currentQ().id].c'),1);assert.equal(t.run('hasDone(PEOPLE.find(q=>q.id===currentQ().sourceQuestionId))'),false,'attempts are independent');
const score=t.run('JSON.stringify(data.rec[currentQ().id])');t=boot('#focus');t.run('resumePractice("focus");gradeFill()');assert.equal(t.run('JSON.stringify(data.rec[currentQ().id])'),score,'resume does not score again');
t.run('practiceDirectory();focusReset();focusTab("done")');assert.equal(t.run('focusRows().length'),1);t.run('focusTab("todo")');assert.equal(t.run('focusRows().some(q=>q.id===data.focusSession.currentId)'),false);assert.equal(t.run('focusRows().length'),362);
// Viewing four option explanations is unscored; a later submitted wrong answer is isolated.
t.run('focusTab("all");FC.type="single";practiceFocus(false);reviewExplanation()');assert.match(t.app.innerHTML,/逐项解析/);assert.equal((t.app.innerHTML.match(/class="option-analysis-item/g)||[]).length,4);assert.equal(t.run('hasDone(currentQ())'),false);
t.run('retryReviewedQuestion();pick((currentQ().answer+1)%4)');const wrongId=t.run('currentQ().id');assert.ok(t.run('data.wrong.includes(currentQ().id)'));assert.ok(!t.run('data.wrong.includes(currentQ().sourceQuestionId)'));
t.run('practiceDirectory();focusTab("wrong")');assert.equal(t.run('focusRows().length'),1);assert.equal(t.run('focusRows()[0].id'),wrongId);
t.run('resumePractice("people")');assert.equal(t.run('P.fillValue'),'人物草稿');t.run('resumePractice()');assert.equal(t.run('P.fillValue'),'主库草稿');
// Obsolete IDs are removed from a stored queue without losing its valid questions.
const state=JSON.parse(storage.wentian_v1);state.focusSession.ids.unshift('focus_removed');storage.wentian_v1=JSON.stringify(state);t=boot('#focus');t.run('resumePractice("focus")');assert.ok(t.run('P.list.every(q=>q.id!=="focus_removed")'));
t.run('startExam()');assert.ok(t.run('EX.list.every(q=>q.module!=="focus")'));
console.log('PASS: five-group union, 80 people / 363 questions; exact 20 SCU academicians; no duplicates; only choice/fill; direct route; independent attempts, wrong answers and drafts; shuffle continuation; no repeat scoring; full four-option explanations and knowledge; main and people sessions preserved.');
