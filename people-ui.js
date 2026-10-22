/* Independent people directory. Records share the existing ID-based store;
   filters, queues and continuation are kept separate from the original bank. */
let PC=Object.assign({group:'all',year:'all',person:'all',kind:'all',type:'all',query:'',completion:'todo',page:0,mode:'questions'},data.peopleCatalog||{});
const profiles=window.PEOPLE_PROFILES||[];
if(PC.group==='川大科学家/院士')PC.group='川大历代两院院士';
if(PC.group!=='all'&&!profiles.some(p=>p.groups.includes(PC.group)))PC.group='all';
if(PC.person!=='all'&&!profiles.some(p=>p.name===PC.person))PC.person='all';
function peopleSave(){data.peopleCatalog={...PC};save()}
function peopleMatches(q){
 const awards={'感动中国':'感动中国','最美科技工作者':'全国最美科技工作者','人民科学家':'人民科学家','两弹一星':'两弹一星功勋奖章','共和国勋章':'共和国勋章'};
 return (PC.group==='all'||q.groups.includes(PC.group))&&(PC.year==='all'||q.awards.some(a=>String(a.year)===PC.year&&(!awards[PC.group]||a.name===awards[PC.group])))&&(PC.person==='all'||q.person===PC.person)&&(PC.kind==='all'||q.topic===PC.kind)&&(PC.type==='all'||q.type===PC.type)&&(!PC.query||QuizCore.normalize(q.person+' '+q.question+' '+answerText(q)+' '+q.groups.join(' ')).includes(QuizCore.normalize(PC.query)));
}
function peopleRows(ignoreCompletion=false){return PEOPLE.filter(q=>peopleMatches(q)&&(ignoreCompletion||PC.completion==='all'||(PC.completion==='done'?hasDone(q):PC.completion==='wrong'?data.wrong.includes(q.id):!hasDone(q))))}
function peopleSelect(name,label,values,value){return `<select name="${name}" aria-label="${label}"><option value="all">全部${label}</option>${values.map(x=>{const [key,text]=Array.isArray(x)?x:[x,x];return `<option value="${escapeHTML(key)}" ${value===String(key)?'selected':''}>${escapeHTML(text)}</option>`}).join('')}</select>`}
function renderPeople(){
 const meta=window.PEOPLE_META,base=peopleRows(true),rows=peopleRows(),done=PEOPLE.filter(hasDone).length;
 const filteredNames=new Set(base.map(q=>q.person));
 const roster=profiles.filter(p=>filteredNames.has(p.name));
 const items=PC.mode==='profiles'?roster:rows,pages=Math.max(1,Math.ceil(items.length/25));PC.page=Math.max(0,Math.min(PC.page,pages-1));peopleSave();
 const tabCounts=[['todo','未做过',base.filter(q=>!hasDone(q)).length],['done','已做过',base.filter(hasDone).length],['wrong','错题',base.filter(q=>data.wrong.includes(q.id)).length],['all','全部',base.length]];
 app.innerHTML=`${topbar('独立人物题库')}<a class="chip" style="display:inline-block;text-decoration:none;margin:0 8px 20px 0" href="#focus" onclick="event.preventDefault();openFocus()">五专题专项题库 →</a><a class="btn btn-main" style="display:inline-block;text-decoration:none;margin:0 0 20px" href="memory.html#names">人物记忆卡片：人名 ⇄ 关键词 →</a><header class="directory-header people-header"><div><p class="eyebrow">人物专项 / PEOPLE & DISCOVERIES</p><h1>记住名字，也记住贡献。</h1><p>选择题 + 填空题 · 把领域、成果、头衔和话语串起来。</p></div><span class="people-orbit" aria-hidden="true">✦</span></header>
 <div class="people-numbers"><span><b>${meta.entries}</b> 人物 / 群体</span><span><b>${meta.types.single}</b> 选择题</span><span><b>${meta.types.fill}</b> 填空题</span><span>资料更新 ${meta.updated}</span></div>
 <div class="people-priority"><div><span class="eyebrow">近期人物 · 优先复习</span><p>先认领域与代表事迹，再核对荣誉年份。</p></div><div class="chips"><button class="chip ${PC.group==='感动中国'&&PC.year==='2025'?'on':''}" onclick="peoplePeriod('感动中国','2025')">感动中国 2025 →</button><button class="chip ${PC.group==='最美科技工作者'&&PC.year==='2026'?'on':''}" onclick="peoplePeriod('最美科技工作者','2026')">最美科技工作者 2026 →</button><button class="chip ${PC.group==='人民科学家'&&PC.year==='2024'?'on':''}" onclick="peoplePeriod('人民科学家','2024')">人民科学家 2024 →</button></div></div>
 ${resumeCard('people')}
 <nav class="people-groups" aria-label="人物专题"><button class="chip ${PC.group==='all'?'on':''}" onclick="peopleGroup('all')">全部人物 <b>${meta.entries}</b></button>${Object.entries(meta.groups).map(([g,n])=>`<button class="chip ${PC.group===g?'on':''}" onclick="peopleGroup('${g}')">${escapeHTML(g)} <b>${n}</b></button>`).join('')}</nav>
 <div class="stats"><div class="stat"><div class="num">${PEOPLE.length-done}</div><div class="lbl">专项未做</div></div><div class="stat"><div class="num">${done}</div><div class="lbl">专项已做</div></div><div class="stat"><div class="num">${PEOPLE.filter(q=>data.wrong.includes(q.id)).length}</div><div class="lbl">专项错题</div></div></div>
 <section class="directory"><div class="directory-title"><h2>${PC.mode==='profiles'?'人物速查':'人物题目目录'}</h2><div class="chips" style="margin:0"><button class="chip ${PC.mode==='questions'?'on':''}" onclick="peopleMode('questions')">刷题目录</button><button class="chip ${PC.mode==='profiles'?'on':''}" onclick="peopleMode('profiles')">人物速查</button></div></div>
 <form class="search-row people-search" onsubmit="event.preventDefault();peopleSearch(this)"><input name="query" class="fill-input" aria-label="搜索人物专项" placeholder="姓名、成果、研究领域…" value="${escapeHTML(PC.query)}">${peopleSelect('year','荣誉年份',[...new Set(PEOPLE.flatMap(q=>q.awards.map(a=>String(a.year))))].sort().reverse(),PC.year)}${peopleSelect('person','人物',profiles.map(p=>p.name),PC.person)}${peopleSelect('kind','考点',[...new Set(PEOPLE.map(q=>q.topic))],PC.kind)}${peopleSelect('type','题型',[['single','选择题'],['fill','填空题']],PC.type)}<button class="btn btn-main">筛选 / 搜索</button><button type="button" class="btn btn-ghost" onclick="peopleReset()">重置</button></form>
 ${PC.mode==='questions'?`<div class="completion-tabs" role="tablist" aria-label="人物专项作答状态">${tabCounts.map(([k,l,n])=>`<button role="tab" aria-selected="${PC.completion===k}" class="completion-tab ${PC.completion===k?'active':''}" onclick="peopleTab('${k}')">${l}<span>${n}</span></button>`).join('')}</div>`:''}
 <p class="directory-count">${PC.mode==='profiles'?`找到 ${roster.length} 个人物 / 群体`:`找到 ${rows.length} 题 · 涉及 ${filteredNames.size} 个人物 / 群体`} · 第 ${PC.page+1} / ${pages} 页</p>
 ${PC.mode==='profiles'?items.slice(PC.page*25,PC.page*25+25).map(peopleProfileHTML).join(''):`<div class="question-list">${items.slice(PC.page*25,PC.page*25+25).map(q=>`<button class="question-row" onclick="openPeopleQuestion('${q.id}')"><span class="question-number">${PEOPLE.indexOf(q)+1}</span><span class="question-content"><span class="question-title">${escapeHTML(q.question)}</span><span class="question-subtitle">${escapeHTML(q.topic)} · ${TYPE_NAME[q.type]} · ${escapeHTML(q.groups.join(' / '))}</span></span>${completionBadge(q)}<span class="row-arrow">→</span></button>`).join('')||'<div class="empty">当前分组没有题目，可切换“全部”或重置筛选。</div>'}</div>`}
 <div class="directory-bottom"><span>每页25项 · 原题库和人物专项分别记住位置</span><div class="btns">${PC.page>0?'<button class="btn btn-ghost" onclick="peoplePage(-1)">上一页</button>':''}${PC.page+1<pages?'<button class="btn btn-ghost" onclick="peoplePage(1)">下一页</button>':''}${rows.length?'<button class="btn btn-main" onclick="practicePeople(false)">练习当前分组 →</button><button class="btn btn-ghost" onclick="practicePeople(true)">随机练习</button>':''}</div></div></section>
 <details class="source-details people-scope"><summary>收录范围、年份口径与资料来源</summary>${meta.scope.map(t=>`<p>${escapeHTML(t)}</p>`).join('')}<p>专题人数可以交叉，合计不等于去重后的总人数。所有题目仅作复习练习；答题后可阅读人物资料并打开出处。</p><p>“领域”包括非科研人物的职业领域；“成果”包括他们的代表事迹。头衔年份不作为当前任职证明。</p></details><footer class="study-footer">进度保存在当前浏览器 · 每题作答后附知识点资料与来源<br><a href="https://github.com/Jinlin-Yao/ganen-scientist-quiz/blob/main/docs/PEOPLE.md" target="_blank" rel="noopener">查看人物与题目覆盖清单 ↗</a></footer>`;
}
function peopleProfileHTML(p){return `<details class="qcard catalog-card"><summary><b>${escapeHTML(p.name)}</b><span class="question-subtitle">${escapeHTML(p.field)} · ${escapeHTML(p.groups.join(' / '))}</span></summary><div class="knowledge-excerpt">${p.titles?.length?`<p><b>${p.titles.map(escapeHTML).join("；")}</b></p>`:""}<p>${escapeHTML(p.bio)}</p>${p.note?`<p class="note">${escapeHTML(p.note)}</p>`:''}<p>${p.awards.map(a=>`${a.year}年 · ${escapeHTML(a.name)}（${escapeHTML(a.basis)}）`).join('<br>')}</p>${(p.quotes||[]).map(x=>`<p>“${escapeHTML(x.text)}” <a href="${escapeHTML(x.source.url)}" target="_blank" rel="noopener noreferrer">话语出处 ↗</a></p>`).join('')}<div class="knowledge-citation">${p.references.map(r=>`${escapeHTML(r.document)} · ${escapeHTML(r.location)}`).join('；')} ${p.links.map(l=>`<a href="${escapeHTML(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(l.title)} ↗</a>`).join(' · ')}</div><button class="btn btn-ghost" onclick="peoplePerson('${escapeHTML(p.name)}')">只练这位人物 →</button></div></details>`}
window.openPeople=()=>go({name:'people'});
window.peopleGroup=g=>{Object.assign(PC,{group:g,year:'all',person:'all',page:0});render()};
window.peoplePeriod=(group,year)=>{Object.assign(PC,{group,year,person:'all',kind:'all',type:'all',query:'',completion:'all',page:0,mode:'questions'});render()};
window.peopleSearch=form=>{for(const k of ['query','year','person','kind','type'])PC[k]=form.elements[k].value;PC.page=0;render()};
window.peopleReset=()=>{Object.assign(PC,{group:'all',year:'all',person:'all',kind:'all',type:'all',query:'',page:0});render()};
window.peopleTab=k=>{PC.completion=k;PC.page=0;render()};
window.peopleMode=mode=>{PC.mode=mode;PC.page=0;render()};
window.peoplePerson=person=>{Object.assign(PC,{person,mode:'questions',completion:'all',page:0});render()};
window.peoplePage=n=>{PC.page+=n;render();document.querySelector('.directory')?.scrollIntoView?.({block:'start',behavior:'smooth'})};
window.practicePeople=random=>{const rows=peopleRows();if(rows.length)startPractice(random,rows)};
window.openPeopleQuestion=id=>{
 const rows=peopleRows();const index=rows.findIndex(q=>q.id===id);if(index<0)return;
 if(view.name==='practice')rememberPractice();
 P={module:'people',qs:[...rows],list:[...rows],i:index,pool:true,random:false,filter:{sec:'all',type:'all',topic:'all',status:'all'},query:''};resetDraft();view={name:'practice'};render();scrollTo(0,0);
};
