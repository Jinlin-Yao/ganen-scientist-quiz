(function(){
 'use strict';
 const Core=window.MemoryCore,esc=Core.escape,profiles=window.MEMORY_DATA?.people||[];
 const app=document.getElementById('memory-app'),switchButton=document.getElementById('switch-mode'),notice=document.getElementById('announcement');
 const KEY='wentian_memory_cards_v1',decks=Core.buildDeck(profiles);
 let stored={};try{stored=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
 let state=Core.cleanState(stored,decks),opened=new Set(),saveWarning=false;
 const currentView=()=>state.views[state.mode];
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state));saveWarning=false}catch(e){saveWarning=true}}
 function announce(text){notice.textContent=text}
 function sourceHTML(p,card){
  const docs={handbook:'川大版复习手册',integrated:'复习整合资料',preparation:'奖学金准备',elan:'ELAN整理版',official:'官方资料',upstream:'原项目资料'};
  const links=[...(p.links||[]),...(card.quoteSource?[card.quoteSource]:[]),...(p.quotes||[]).map(q=>q.source)].filter(Boolean);
  const unique=[...new Map(links.filter(l=>/^https?:\/\//.test(l.url||'')).map(l=>[l.url,l])).values()];
  return `<details class="source-block"><summary>资料出处与原文</summary>${(p.references||[]).map(r=>`<p>${esc(docs[r.document]||r.document)} · ${esc(r.location)}</p>`).join('')}${unique.map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title||'查看原文')} ↗</a>`).join('')}</details>`;
 }
 function answerHTML(c){
  const p=c.profile,known=state.known[c.id]===true;
  return `<div class="card-answer">${state.mode==='clues'?`<p class="answer-lead">这张卡片对应的人物是</p><h2 class="answer-name">${esc(p.name)}</h2>`:''}<p class="profile-field">${esc(p.field)}</p><section class="profile-part"><h3>代表贡献与工作</h3><p>${esc(p.bio)}</p></section><section class="profile-part"><h3>称号与荣誉</h3><ul class="honor-list">${(p.titles||[]).map(t=>`<li>${esc(t)}</li>`).join('')}${(p.awards||[]).map(a=>`<li><span class="honor-year">${esc(a.year)}年</span>${esc(a.name)}${a.basis?`<small>（${esc(a.basis)}）</small>`:''}</li>`).join('')}${!(p.awards||[]).length&&!(p.titles||[]).length?`<li>${esc(p.groups.join(' · '))}</li>`:''}</ul></section>${p.note?`<section class="profile-part profile-note"><h3>辨析与记忆</h3><p>${esc(p.note)}</p></section>`:''}${(p.quotes||[]).length?`<section class="profile-part"><h3>有出处的话语</h3>${p.quotes.map(q=>`<p>“${esc(q.text)}”</p>`).join('')}</section>`:''}${sourceHTML(p,c)}<section class="self-check"><p>${known?'已标记为记住了。可以随时改为还需复习。':'回想之后，再记录这张卡片的掌握情况。'}</p><div><button type="button" class="button ${known?'selected':''}" data-mark="known" data-card="${esc(c.id)}" aria-pressed="${known}">✓ 记住了</button><button type="button" class="button ${!known?'selected':''}" data-mark="review" data-card="${esc(c.id)}" aria-pressed="${!known}">↻ 还需复习</button></div></section></div>`;
 }
 function cardHTML(c,i){
  const known=state.known[c.id]===true;
  return `<details class="memory-card" data-card="${esc(c.id)}" ${opened.has(c.id)?'open':''}><summary><span class="card-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="card-front">${state.mode==='names'?`<span class="person-name">${esc(c.front)}</span>`:`<span class="clue-context">${c.kind==='quote'?'名言 · ':''}${esc(c.context)}</span><span class="clue-text">${esc(c.front)}</span><span class="clue-tip">先猜人物，点击揭晓</span>`}${known?'<span class="known-dot" aria-label="已记住"></span>':''}</span><span class="reveal-symbol" aria-hidden="true">+</span></summary>${answerHTML(c)}</details>`;
 }
 function render(){
  const mode=state.mode,v=currentView(),deck=decks[mode],rows=Core.rows(deck,v,state.known),known=deck.filter(c=>state.known[c.id]===true).length;
  const groups=[...new Set(profiles.flatMap(p=>p.groups))];
  switchButton.textContent=mode==='names'?'切换：看关键词猜人物 →':'切换：看人名想介绍 →';
  document.title=(mode==='names'?'看人名想介绍':'看关键词猜人物')+' · 人物记忆卡片';
  app.innerHTML=`<header class="hero"><div><p class="eyebrow">人物记忆卡片 · ${mode==='names'?'正向回忆':'反向回忆'}</p><h1>${mode==='names'?'看见名字，想起他的贡献。':'看见贡献，想起他的名字。'}</h1><p>${mode==='names'?'先在心里回忆称号、领域与代表贡献，点击姓名核对介绍。':'先根据工作、贡献或名言回忆人物，点击关键词揭晓姓名和介绍。'}</p></div><div class="mode-number" aria-hidden="true">${mode==='names'?'01':'02'}<small>${mode==='names'?'人名 → 介绍':'关键词 → 人物'}</small></div></header><div class="progress-strip"><span><strong>${deck.length}</strong>${mode==='names'?'个人物／群体':'张关键词卡片'}</span><span><strong>${known}</strong>已记住</span><span><strong>${deck.length-known}</strong>还需复习</span>${v.last?'<button type="button" class="text-button last-button" data-action="resume">回到上次卡片 ↓</button>':''}</div><section class="controls" aria-label="筛选记忆卡片"><form id="memory-search" class="filters"><label class="search-label">${mode==='names'?'按姓名查找':'按关键词查找'}<input name="query" type="search" aria-label="${mode==='names'?'搜索人名':'搜索关键词'}" maxlength="200" placeholder="${mode==='names'?'输入姓名，例如：黄纬禄':'输入工作或贡献，例如：巨浪一号'}" value="${esc(v.query)}"></label><label>人物专题<select name="group" aria-label="人物专题"><option value="all">全部人物</option>${groups.map(g=>`<option value="${esc(g)}" ${v.group===g?'selected':''}>${esc(g)}</option>`).join('')}</select></label>${mode==='clues'?`<label>线索类型<select name="kind" aria-label="线索类型"><option value="all" ${v.kind==='all'?'selected':''}>全部线索</option><option value="work" ${v.kind==='work'?'selected':''}>工作与贡献</option><option value="quote" ${v.kind==='quote'?'selected':''}>名言</option></select></label>`:''}<button class="button primary" type="submit">查找</button><button class="button" type="button" data-action="reset">重置筛选</button></form><div class="toolbar"><div class="status-tabs" role="group" aria-label="掌握情况">${[['all','全部'],['review','还需复习'],['known','已记住']].map(([key,label])=>`<button type="button" class="${v.status===key?'active':''}" data-status="${key}" aria-pressed="${v.status===key}">${label}</button>`).join('')}</div><div class="small-actions"><button type="button" class="text-button" data-action="shuffle">⇄ 打乱顺序</button><button type="button" class="text-button" data-action="collapse">收起全部答案</button></div></div></section><p class="card-count" role="status">当前显示 ${rows.length} 张${mode==='clues'?' · 人名隐藏在卡片背面；部分贡献需要结合领域辨认。':' · 点击姓名，展开介绍。'}${saveWarning?' · 当前浏览器未能保存进度。':''}</p><section id="cards" class="card-grid ${mode}" aria-label="${mode==='names'?'人名记忆卡片':'关键词记忆卡片'}">${rows.map(cardHTML).join('')||'<div class="empty">没有符合条件的卡片。试试重置筛选，或切换掌握情况。</div>'}</section>`;
 }
 function modeFromURL(){return location.hash==='#clues'?'clues':location.hash==='#names'?'names':state.mode}
 function changeMode(){state.mode=modeFromURL();opened.clear();save();render();window.scrollTo(0,0)}
 switchButton.addEventListener('click',()=>{location.hash=state.mode==='names'?'#clues':'#names'});
 window.addEventListener('hashchange',changeMode);
 app.addEventListener('submit',e=>{
  if(e.target.id!=='memory-search')return;e.preventDefault();const f=e.target.elements,v=currentView();v.query=f.query.value.trim();v.group=f.group.value;v.kind=f.kind?.value||'all';opened.clear();save();render();
 });
 app.addEventListener('toggle',e=>{
  if(!e.target.classList?.contains('memory-card'))return;
  const id=e.target.dataset.card;if(e.target.open){opened.add(id);currentView().last=id;save()}else opened.delete(id);
 },true);
 app.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;const v=currentView();
  if(button.dataset.mark){
   const id=button.dataset.card;if(!decks[state.mode].some(c=>c.id===id))return;
   if(button.dataset.mark==='known')state.known[id]=true;else delete state.known[id];
   save();render();announce(button.dataset.mark==='known'?'已标记为记住了。':'已标记为还需复习。');return;
  }
  if(button.dataset.status){v.status=button.dataset.status;opened.clear();save();render();return}
  const action=button.dataset.action;
  if(action==='reset'){Object.assign(v,{query:'',group:'all',kind:'all',status:'all'});opened.clear();save();render()}
  if(action==='collapse'){opened.clear();for(const d of app.querySelectorAll('details.memory-card'))d.open=false;announce('已收起全部答案。')}
  if(action==='shuffle'){
   const ids=decks[state.mode].map(c=>c.id);for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}v.order=ids;opened.clear();save();render();announce('卡片已打乱，答案已收起。');
  }
  if(action==='resume'){
   const card=[...app.querySelectorAll('details.memory-card')].find(d=>d.dataset.card===v.last);
   if(card){card.scrollIntoView({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});card.querySelector('summary').focus({preventScroll:true})}
   else announce('上次卡片不在当前筛选结果中，请重置筛选后再试。');
  }
 });
 state.mode=modeFromURL();save();render();
})();
