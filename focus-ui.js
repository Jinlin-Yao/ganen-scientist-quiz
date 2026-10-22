/* Five-topic study directory. Question content comes from the reviewed people
   bank; focus_ IDs keep attempts and wrong answers separate from other banks. */
let FC=Object.assign({group:'all',person:'all',kind:'all',type:'all',query:'',completion:'todo',page:0},data.focusCatalog||{});
const focusNames=new Set(FOCUS.map(q=>q.person));
const focusProfiles=profiles.filter(p=>focusNames.has(p.name));
if(FC.group!=='all'&&!FOCUS_GROUPS.includes(FC.group))FC.group='all';
if(FC.person!=='all'&&!focusNames.has(FC.person))FC.person='all';
function focusRows(ignoreCompletion=false){
 return FOCUS.filter(q=>(FC.group==='all'||q.groups.includes(FC.group))&&(FC.person==='all'||q.person===FC.person)&&(FC.kind==='all'||q.topic===FC.kind)&&(FC.type==='all'||q.type===FC.type)&&(!FC.query||QuizCore.normalize(q.person+' '+q.question+' '+answerText(q)+' '+q.groups.join(' ')).includes(QuizCore.normalize(FC.query)))&&(ignoreCompletion||FC.completion==='all'||(FC.completion==='done'?hasDone(q):FC.completion==='wrong'?data.wrong.includes(q.id):!hasDone(q))));
}
function renderFocus(){
 const base=focusRows(true),rows=focusRows(),done=FOCUS.filter(hasDone).length;
 const pages=Math.max(1,Math.ceil(rows.length/25));FC.page=Math.max(0,Math.min(FC.page,pages-1));data.focusCatalog={...FC};save();
 const tabs=[['todo','未做过',base.filter(q=>!hasDone(q)).length],['done','已做过',base.filter(hasDone).length],['wrong','错题',base.filter(q=>data.wrong.includes(q.id)).length],['all','全部',base.length]];
 app.innerHTML=`${topbar('五专题专项题库')}<header class="directory-header people-header"><div><p class="eyebrow">集中冲刺 · 五个专题</p><h1>五专题专项题库</h1><p>选择题 + 填空题 · 领域、成果、头衔、名言。</p></div><span class="people-orbit" aria-hidden="true">✧</span></header>
 <div class="people-numbers"><span><b>${focusProfiles.length}</b> 位人物</span><span><b>${FOCUS.filter(q=>q.type==='single').length}</b> 选择题</span><span><b>${FOCUS.filter(q=>q.type==='fill').length}</b> 填空题</span><span>跨专题题目已去重</span></div>
 <nav class="people-groups" aria-label="五专题分组"><button class="chip ${FC.group==='all'?'on':''}" onclick="focusGroup('all')">全部五专题 <b>${focusProfiles.length}</b></button>${FOCUS_GROUPS.map(g=>`<button class="chip ${FC.group===g?'on':''}" onclick="focusGroup('${g}')">${escapeHTML(g)} <b>${focusProfiles.filter(p=>p.groups.includes(g)).length}</b></button>`).join('')}</nav>
 ${resumeCard('focus')}
 <div class="stats"><div class="stat"><div class="num">${FOCUS.length-done}</div><div class="lbl">专项未做</div></div><div class="stat"><div class="num">${done}</div><div class="lbl">专项已做</div></div><div class="stat"><div class="num">${FOCUS.filter(q=>data.wrong.includes(q.id)).length}</div><div class="lbl">专项错题</div></div></div>
 <section class="directory"><div class="directory-title"><h2>专项题目目录</h2><span>共 ${FOCUS.length} 题 · 进度独立保存</span></div>
 <form class="search-row people-search" onsubmit="event.preventDefault();focusSearch(this)"><input name="query" class="fill-input" aria-label="搜索五专题题目" placeholder="姓名、成果、研究领域…" value="${escapeHTML(FC.query)}">${peopleSelect('person','人物',focusProfiles.filter(p=>FC.group==='all'||p.groups.includes(FC.group)).map(p=>p.name),FC.person)}${peopleSelect('kind','考点',[...new Set(FOCUS.map(q=>q.topic))],FC.kind)}${peopleSelect('type','题型',[['single','选择题'],['fill','填空题']],FC.type)}<button class="btn btn-main">筛选 / 搜索</button><button type="button" class="btn btn-ghost" onclick="focusReset()">重置</button></form>
 <div class="completion-tabs" role="tablist" aria-label="五专题作答状态">${tabs.map(([k,l,n])=>`<button role="tab" aria-selected="${FC.completion===k}" class="completion-tab ${FC.completion===k?'active':''}" onclick="focusTab('${k}')">${l}<span>${n}</span></button>`).join('')}</div>
 <p class="directory-count">找到 ${rows.length} 题 · 第 ${FC.page+1} / ${pages} 页</p>
 <div class="question-list">${rows.slice(FC.page*25,FC.page*25+25).map(q=>`<button class="question-row" onclick="openFocusQuestion('${q.id}')"><span class="question-number">${FOCUS.indexOf(q)+1}</span><span class="question-content"><span class="question-title">${escapeHTML(q.question)}</span><span class="question-subtitle">${escapeHTML(q.topic)} · ${TYPE_NAME[q.type]} · ${escapeHTML(q.groups.join(' / '))}</span></span>${completionBadge(q)}<span class="row-arrow">→</span></button>`).join('')||'<div class="empty">当前分组没有题目，可切换“全部”或重置筛选。</div>'}</div>
 <div class="directory-bottom"><span>每页25题 · 点击任意题目直接练习</span><div class="btns">${FC.page>0?'<button class="btn btn-ghost" onclick="focusPage(-1)">上一页</button>':''}${FC.page+1<pages?'<button class="btn btn-ghost" onclick="focusPage(1)">下一页</button>':''}${rows.length?'<button class="btn btn-main" onclick="practiceFocus(false)">练习当前分组 →</button><button class="btn btn-ghost" onclick="practiceFocus(true)">随机练习</button>':''}</div></div></section>
 <details class="source-details people-scope"><summary>收录范围与复习说明</summary><p>题目考查人物来自两弹一星、共和国勋章、人民科学家、公众号补充人物和川大历代两院院士五个专题。重叠人物仅保留一套题，可从多个专题找到。</p><p>川大专题沿用学校历代两院院士20人名单（中科院8位、工程院12位），包含已故院士。一般川大科学家不在本专题中。</p><p>选择题作答后显示每个选项的详细解析、对照记忆与出处；填空题核对后显示参考答案和知识点资料。作答记录、错题、填空草稿、随机顺序及上次位置在本模块单独保存。</p></details>
 <footer class="study-footer">进度保存在当前浏览器 · 每题附知识点资料与来源<br><a href="#people" onclick="event.preventDefault();openPeople()">全部科学家人物专项 →</a> · <a href="memory.html#names">人物记忆卡片 ⇄</a></footer>`;
}
window.openFocus=()=>go({name:'focus'});
window.focusGroup=group=>{Object.assign(FC,{group,person:'all',page:0});render()};
window.focusSearch=form=>{for(const k of ['query','person','kind','type'])FC[k]=form.elements[k].value;FC.page=0;render()};
window.focusReset=()=>{Object.assign(FC,{group:'all',person:'all',kind:'all',type:'all',query:'',page:0});render()};
window.focusTab=completion=>{FC.completion=completion;FC.page=0;render()};
window.focusPage=n=>{FC.page+=n;render();document.querySelector('.directory')?.scrollIntoView?.({block:'start',behavior:'smooth'})};
window.practiceFocus=random=>{const rows=focusRows();if(rows.length)startPractice(random,rows)};
window.openFocusQuestion=id=>{
 const rows=focusRows(),index=rows.findIndex(q=>q.id===id);if(index<0)return;
 if(view.name==='practice')rememberPractice();
 P={module:'focus',qs:[...rows],list:[...rows],i:index,pool:true,random:false,filter:{sec:'all',type:'all',topic:'all',status:'all'},query:''};resetDraft();view={name:'practice'};render();scrollTo(0,0);
};
