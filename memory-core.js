/* Pure data helpers shared by the memory page and its checks. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MemoryCore=api;})(typeof window!=='undefined'?window:this,function(){
 'use strict';
 const normalize=s=>String(s||'').normalize('NFKC').replace(/\s+/g,'').toLowerCase();
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function buildDeck(people){
  const names=people.map(p=>p.name).sort((a,b)=>b.length-a.length);
  const mask=text=>names.reduce((s,n)=>s.split(n).join('这位人物'),String(text||'')).replace(/这位人物（火箭专家）/g,'这位人物');
  const namesDeck=people.map(p=>({id:'name:'+p.name,person:p.name,kind:'name',front:p.name,context:'',profile:p}));
  const clues=[];
  for(const p of people){
   clues.push({id:'work:'+p.name,person:p.name,kind:'work',front:mask(p.bio),context:mask(p.field),profile:p});
   (p.quotes||[]).forEach((q,i)=>clues.push({id:'quote:'+p.name+':'+i,person:p.name,kind:'quote',front:'“'+mask(q.text)+'”',context:mask(p.field),quoteSource:q.source,profile:p}));
  }
  return {names:namesDeck,clues};
 }
 function rows(deck,view,known={}){
  const rank=new Map((view.order||[]).map((id,i)=>[id,i]));
  return deck.filter(c=>(view.group==='all'||c.profile.groups.includes(view.group))&&(view.kind==='all'||c.kind===view.kind)&&(!view.query||normalize(c.front+' '+c.context).includes(normalize(view.query)))&&(view.status==='all'||(view.status==='known'?known[c.id]===true:known[c.id]!==true))).sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity));
 }
 function cleanState(raw,decks){
  raw=raw&&typeof raw==='object'?raw:{};
  const ids=new Set([...decks.names,...decks.clues].map(c=>c.id));
  const groups=new Set(['all',...decks.names.flatMap(c=>c.profile.groups)]);
  const out={mode:raw.mode==='clues'?'clues':'names',known:{},views:{}};
  for(const [id,value] of Object.entries(raw.known||{}))if(ids.has(id)&&value===true)out.known[id]=true;
  for(const mode of ['names','clues']){
   const v=raw.views?.[mode]||{},deckIds=new Set(decks[mode].map(c=>c.id));
   out.views[mode]={group:groups.has(v.group)?v.group:'all',kind:mode==='clues'&&['work','quote'].includes(v.kind)?v.kind:'all',query:typeof v.query==='string'?v.query.slice(0,200):'',status:['known','review'].includes(v.status)?v.status:'all',order:[...new Set((Array.isArray(v.order)?v.order:[]).filter(id=>deckIds.has(id)))],last:deckIds.has(v.last)?v.last:null};
  }
  return out;
 }
 return {normalize,escape,buildDeck,rows,cleanState};
});
