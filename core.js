/* Shared, side-effect-free grading and validation helpers. */
(function(root){
  'use strict';
  const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s，,。；;、：:《》“”"'（）()_·—–-]/g,'');
  function checkFill(q,value){
    const v=normalize(value);
    if(!v || /不是|并非|不等于|错误|不对|不确定/.test(v)) return false;
    if((q.acceptedAnswers||[q.answer]).some(x=>normalize(x)===v))return true;
    if(q.matchMode!=='groups')return false;
    const groups=q.keywordGroups||(q.keywords||[]).map(k=>[k]);
    if(!groups.length)return false;
    return groups.every(group=>group.some(k=>{
      const needle=normalize(k);
      if(/^\d+$/.test(needle))return new RegExp('(^|[^0-9])'+needle+'([^0-9]|$)').test(v);
      return v.includes(needle);
    }));
  }
  function validateBank(bank){
    const errors=[], ids=new Set();
    for(const q of bank){
      if(!q.id||ids.has(q.id))errors.push('Duplicate/missing ID: '+q.id);ids.add(q.id);
      if(!q.question||!q.source||!q.references?.length)errors.push(q.id+': missing question/source');
      if(q.status==='pending'&&q.examEligible!==false)errors.push(q.id+': pending in exam');
      if(q.type==='single'||q.type==='multiple'){
        if(!Array.isArray(q.options)||q.options.length<2)errors.push(q.id+': missing options');
        const indices=Array.isArray(q.answer)?q.answer:[q.answer];
        if(!indices.length||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=q.options.length))errors.push(q.id+': invalid answer indices');
      }else if(q.type==='fill'){
        if(typeof q.answer!=='string'||!checkFill(q,q.answer))errors.push(q.id+': own answer rejected');
      }else if(q.type!=='flash') errors.push(q.id+': invalid type');
    }
    return errors;
  }
  const api={normalize,checkFill,validateBank};
  root.QuizCore=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
