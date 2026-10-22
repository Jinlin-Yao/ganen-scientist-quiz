#!/usr/bin/env python3
"""Build detailed, cited explanations for every choice, preserving question IDs.

Person distractors get their own biography and a comparison to the target.
Concept, date, judgment and matching questions use individually reviewed notes.
"""
import json,pathlib,re,collections
ROOT=pathlib.Path(__file__).resolve().parents[1]
read=lambda file:json.loads((ROOT/file).read_text())
source=read('data/option-explanations-source.json')
main=[q for q in read('data/bank.json') if not q.get('studyExcluded')]; people_bank=read('data/people-bank.json')
people={p['name']:p for p in read('data/people.json')['people']}
profiles={**people,**source['extraPeople']}
def clean(text,name):return re.sub(r'[。；]+$','',text.replace(name,'这位人物'))
pairs={p['field']+'；'+clean(p.get('work',p['bio']),p['name']):p for p in people.values()}
assert len(pairs)==len(people)
def refdata(p):return {'references':p['references'],'links':p.get('links',[])[:2]}
def paragraph(text):return text.rstrip('。')+'。'
def bio(p):return paragraph(p['name']+'主要对应'+p['field'])+'\n'+paragraph(p['bio'])
def notes(p):return [p['note']] if p.get('note') else []
def keyname(q):return q.get('person') or (q['options'][q['answer']] if q['type']=='single' else None)
def label(i):return chr(65+i)
def selected(q,i):return i in (q['answer'] if isinstance(q['answer'],list) else [q['answer']])
def memory_options(options):return '；'.join(label(i)+'：'+p['name']+' → '+p['field'] for i,p in enumerate(options))+'。'
def person_options(q):
 target=profiles.get(keyname(q));manual=source['mainQuestions'].get(q['id'],{});rule=source.get('personRules',{}).get(q['id']);items=[]
 for i,name in enumerate(q['options']):
  p=profiles[name];ok=selected(q,i);paras=[bio(p)]
  if rule=='not23':
   member='两弹一星' in p['groups']
   paras.append(('此人属于1999年两弹一星功勋奖章23人名单；本题问“不属于”，所以本题不选。' if member else '此人不在1999年23人名单中，符合“不属于”的反向设问；这不否定其科学贡献。'))
  elif rule=='863':
   paras.append(p['name']+'是1986年四位倡议者之一；四人共同名单为王大珩、王淦昌、陈芳允、杨嘉墀。要把倡议863计划与后来参与计划项目的人员区分。')
  elif rule=='peopleHonor':
   awards=[a for a in p['awards'] if a['name']=='人民科学家']
   paras.append(('此人于'+str(awards[0]['year'])+'年获授或被追授“人民科学家”国家荣誉称号，应选。') if awards else '此项人物的其他荣誉不能替代“人民科学家”正式名单。例如袁隆平于2019年获共和国勋章，本题不能因此把他选入人民科学家名单。')
  elif rule=='medal2019':
   awards=[a for a in p['awards'] if a['name']=='共和国勋章' and a['year']==2019]
   paras.append('此人为2019年共和国勋章获得者，且是科学家，符合两个限定。' if awards else '此项不属于2019年共和国勋章获得者名单。科学家贡献大小与是否在某一批次获奖，是不同的判断。')
  elif rule=='martyr':
   paras.append('郭永怀1968年在飞机失事中牺牲，与警卫员牟方东共同保护重要资料；题目中的烈士身份线索指向郭永怀。' if ok else '此人也有两弹一星贡献，但“唯一以烈士身份被追授”的限定指向郭永怀，不能只按是否为元勋判断。')
  elif rule=='letter':
   paras.append('华罗庚1950年2月写下题干所列公开信，动员留美学生回国。题名、月份与署名都应核对。' if ok else '此人也有归国报国或组织人才的经历，但不能把相似事迹视作同一封信。尤其朱光亚另有1950年给留美同学的公开信，两条资料需按题名区分。')
  elif q.get('topic')=='名言' and q.get('module')=='people':
   quote=next(x for x in target.get('quotes',[]) if x['text'] in q['question'])
   if ok:paras.append('所附来源把“'+quote['text']+'”记录为'+name+'的话语。理解时把这句话与其具体研究、报国或育人经历联系起来，不只背姓名。')
   else:
    paras.append('本题给出的原话及领域线索对应'+target['name']+'；不能因为'+name+'也有奉献精神，就把具体引语移作其原话。')
    if p.get('quotes'):paras.append('可对照记忆'+name+'的另一条有出处的话语：“'+p['quotes'][0]['text']+'”')
  elif ok:
   paras.append('把题干中的具体成果、研究对象或人物职责，与'+name+'的“'+p['field']+'”主线相连，这一组线索相符。')
  else:
   paras.append('本题整组线索指向'+target['name']+'的“'+target['field']+'”工作；'+name+'的代表研究对象与职责如上，不能因其也是科学家就互换人名。')
  paras+=notes(p)
  item={'correct':ok,'paragraphs':paras,**refdata(p)}
  if q.get('topic')=='名言' and q.get('module')=='people' and ok:item['links']=q['links'][:2]
  items.append(item)
 if rule=='not23':summary='此题为反向选择：先逐项核对1999年明确的23人名单，再找“不属于”的人物。'
 elif rule=='863':summary='四位倡议者为“双王、陈、杨”：王大珩、王淦昌、陈芳允、杨嘉墀。不要用其他著名科学家组合替代。'
 elif q.get('topic')=='名言' and q.get('module')=='people':summary='本题考有出处的话语与人物配对。用“原话—研究领域—代表贡献”三条线索交叉记忆；引语归属以题目所附文献为准。'
 elif target:summary='本题核心人物为'+target['name']+'，主要记忆链是“'+target['name']+'—'+target['field']+'—'+clean(target.get('work',target['bio']),target['name'])+'”。'
 else:summary='逐项核对人物与题目所问的具体名单、领域或成果。'
 summary=manual.get('summary',summary)
 memory=manual.get('memory',memory_options([profiles[n] for n in q['options']]))
 return {'summary':summary,'options':items,'memory':memory}
def field_options(q):
 target=people[q['person']];items=[];persons=[]
 for i,value in enumerate(q['options']):
  p=pairs[value];persons.append(p);ok=selected(q,i)
  why=('这组“领域＋代表工作”正与'+target['name']+'对应，人物、技术对象与工作职责均吻合。' if ok else '这组资料应对应'+p['name']+'。题干要找'+target['name']+'，其主线是“'+target['field']+'”，所以不能把这组工作移到题干人物名下。')
  items.append({'correct':ok,'paragraphs':[bio(p),why]+notes(p),**refdata(p)})
 return {'summary':'这道题要建立'+target['name']+'与其具体研究对象、代表工作的对应关系。其他选项中的事实也值得记忆，但必须归给正确人物。','options':items,'memory':memory_options(persons)}
def honor_options(q):
 p=people[q['person']];items=[]
 year=next(int(x) for x in re.findall(r'\d{4}',q['question']))
 def norm(s):return s.replace('国家荣誉称号','')
 correct_name=norm(q['options'][q['answer']])
 for i,value in enumerate(q['options']):
  h=source['honors'][value];ok=selected(q,i);own=[a for a in p['awards'] if norm(a['name'])==norm(value)];paras=[h['definition']]
  if ok:why=p['name']+'于'+str(year)+'年获授或被追授'+value+'，符合题干的荣誉名称与年份限定。'
  elif own:why=p['name']+'确实另于'+str(own[0]['year'])+'年获授或被追授'+value+'，但本题限定'+str(year)+'年所问的'+correct_name+'；另一项荣誉属实，也不代表本题可以选它。'
  elif norm(value)=='国家杰出贡献科学家' and p['name']=='钱学森':why='钱学森确于1991年获授这一称号，但本题问的是1999年23位专家对应的奖章，年份、荣誉名称与范围均不同。'
  else:why='该项的荣誉名称、授予对象或所属体系与题目不符。题干明确问'+str(year)+'年的'+correct_name+'，不能把不同荣誉当作同义词互换。'
  paras+=[why,'记忆线索：'+h['memory']+'。']
  items.append({'correct':ok,'paragraphs':paras,'references':p['references'],'links':list({x['url']:x for x in h['links']+p.get('links',[])[:1]}.values())})
 return {'summary':'先圈出“'+str(year)+'年”和题目所问的荣誉类别，再核对'+p['name']+'的正式获授记录。同一人物可以拥有不同荣誉，但不能省略年份与名称。','options':items,'memory':p['name']+' → '+str(year)+'年 → '+correct_name+'。'+('该人物跨专题荣誉：'+'；'.join(str(a['year'])+'年'+a['name'] for a in p['awards'])+'。' if len(p['awards'])>1 else '')}

result={};missing=[]
for q in main+people_bank:
 if q['type'] not in ['single','multiple']:continue
 manual=source['mainQuestions'].get(q['id'])
 if manual and 'options' in manual:
  info={'summary':manual['summary'],'options':[{'correct':selected(q,i),'paragraphs':[text],'references':q['references'],'links':source['mainLinks'].get(q['id'],q.get('links',[]))} for i,text in enumerate(manual['options'])],'memory':manual['memory']}
 elif q.get('module')=='people' and q['topic']=='领域':info=field_options(q)
 elif all(v in profiles for v in q['options']):info=person_options(q)
 elif q.get('module')=='people' and q['topic']=='头衔':info=honor_options(q)
 else:missing.append(q['id']);continue
 assert len(info['options'])==len(q['options'])
 assert all(len(x['paragraphs']) and all(p.strip() for p in x['paragraphs']) and x['references'] for x in info['options']),q['id']
 result[q['id']]=info
assert not missing,missing
(ROOT/'data/option-explanations.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(ROOT/'explanations.js').write_text('/* Generated by scripts/build-explanations.py; do not edit. */\nwindow.OPTION_EXPLANATIONS='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
print('Built detailed option explanations:',len(result),'questions,',sum(len(x['options']) for x in result.values()),'options')
