#!/usr/bin/env python3
"""Build the independent, source-traceable people bank from reviewed person facts.

No network access or original user attachments are required to rebuild.
Question IDs depend on person + fact key, never on ordering or answer position.
"""
import collections, hashlib, json, pathlib, random, re
ROOT=pathlib.Path(__file__).resolve().parents[1]
dataset=json.loads((ROOT/'data/people.json').read_text())
persons=dataset['people']; questions=[]; knowledge={}
def ident(name,key):return 'person_'+hashlib.sha256((name+'|'+key).encode()).hexdigest()[:14]
def clean(text,name):
 return re.sub(r'[。；]+$','',text.replace(name,'这位人物'))
def add(p,key,kind,question,answer,options=None,aliases=None,links=None):
 q={'id':ident(p['name'],key),'module':'people','person':p['name'],'type':'single' if options else 'fill','section':'scientist','topic':kind,'groups':p['groups'],'awards':p['awards'],'question':question,'answer':answer,'status':'study','examEligible':False,'source':'人物专项 · '+p['name'],'references':p['references'],'links':links or p['links'],'note':p.get('note','')}
 if options:q['options']=options
 else:q['acceptedAnswers']=list(dict.fromkeys([answer]+(aliases or [])))
 questions.append(q)
 paragraphs=[{'kind':'人物速记','text':p['name']+'｜'+p['field']+'\n'+p['bio'],'references':p['references'],'links':p['links']}]
 if p.get('note'):paragraphs.append({'kind':'辨析与复习','text':p['note'],'references':p['references'],'links':p['links']})
 if p['awards']:
  text='；'.join(str(a['year'])+'年 · '+a['name']+'（'+a['basis']+'）' for a in p['awards'])
  paragraphs.append({'kind':'头衔与年份','text':text,'references':p['references'],'links':p['links']})
 for quote in p.get('quotes',[]):paragraphs.append({'kind':'有出处的话语','text':'“'+quote['text']+'”','references':[{'document':'official','location':quote['source']['title']}],'links':[quote['source']]})
 knowledge[q['id']]={'paragraphs':paragraphs}
def choice(p,key,kind,stem,correct,distractors,links=None):
 rng=random.Random(ident(p['name'],key)); ds=list(dict.fromkeys(distractors));ds=[x for x in ds if x!=correct];rng.shuffle(ds)
 opts=[correct]+ds[:3];assert len(opts)==4; rng.shuffle(opts)
 add(p,key,kind,stem,opts.index(correct),options=opts,links=links)

# A small broad-discipline pool avoids ambiguous same-field distractors.
field_pool=['古鱼类化石与脊椎动物演化','高温超导材料与超导物理','肝胆外科与肝移植','地热资源勘探与开发','手性催化与不对称合成','高速列车设计','菌草栽培与农业技术推广','摄影测量与遥感','诗歌创作与文学评论','桥梁结构设计','网络科普与知识传播','壁画和彩塑保护']
for p in persons:
 name=p['name'];bio=clean(p.get('work',p['bio']),name)
 # Pairing a field with a distinct contribution makes the correct option unique,
 # even when scientists have worked across disciplines.
 pair=p['field']+'；'+bio
 candidates=[x['field']+'；'+clean(x.get('work',x['bio']),x['name']) for x in persons if x['name']!=name and x['field']!=p['field']]
 # Use compact field prompts and complete biographical clues in the reverse direction.
 choice(p,'field','领域',f'{name}的研究方向或工作领域与代表工作，对应正确的是哪一项？',pair,candidates)
 # The full clue can contain a person's name in a quoted institutional title; remove it.
 clue=clean(p['bio'],name)
 if name=='李东（火箭专家）':clue='担任长征五号运载火箭总设计师，推进我国大推力运载火箭研制'
 choice(p,'work','成果',f'以下资料描述对应哪位人物（或群体）？\n{clue}。',name,[x['name'] for x in persons if x['name']!=name])
 aliases=[]
 if name=='张顺东、李国秀夫妇':aliases=['张顺东和李国秀','张顺东李国秀','张顺东、李国秀','张顺东夫妇']
 if name=='赵兴松、谢红兰夫妇':aliases=['赵兴松和谢红兰','赵兴松谢红兰','赵兴松、谢红兰','赵兴松夫妇']
 if name=='李东（火箭专家）':aliases=['李东']
 if name=='银发知播群体':aliases=['银发知播','银发知播群体']
 if name=='隐蔽战线在台牺牲英烈群体':aliases=['隐蔽战线在台牺牲英烈','在台牺牲隐蔽战线英烈']
 add(p,'person-fill','成果',f'根据“领域—事迹”线索填写人物或群体名称：\n{p["field"]}；{clue}。\n这位人物（或群体）是____。',name,aliases=aliases)
 for i,f in enumerate(p.get('facts',[])):
  # Fact stem is its stable semantic key so adding/reordering facts preserves progress.
  add(p,'fact:'+f['question'],f['kind'],f['question'],f['answer'],aliases=f.get('aliases',[]))
 for a in p['awards']:
  year=a['year'];award=a['name'];key='award:'+award+':'+str(year)
  if award=='两弹一星功勋奖章':
   choice(p,key,'头衔',f'{name}属于1999年获授或追授以下哪一项荣誉的23位专家名单？',award,['共和国勋章','国家杰出贡献科学家','人民科学家国家荣誉称号'])
  elif award.startswith('感动中国'):
   special='特别致敬' in award
   add(p,key,'头衔',f'{name}{"获特别致敬" if special else "获评年度人物"}的《感动中国》获评年度为____年。（填评选年度，非节目播出年份）',str(year),aliases=[str(year)+'年'])
  elif award=='人民科学家':
   choice(p,key,'头衔',f'{name}于{year}年获授或被追授的国家荣誉称号是？','人民科学家',['人民教育家','人民医护工作者','人民英雄'])
  elif award=='共和国勋章':
   choice(p,key,'头衔',f'{name}于{year}年获授或被追授的国家勋章是？','共和国勋章',['友谊勋章','七一勋章','八一勋章'])
   add(p,key+':year','头衔',f'{name}获授或被追授“共和国勋章”的年份是____年。',str(year),aliases=[str(year)+'年'])
  else:
   basis='公布入选名单的年份' if year==2026 else '评选年度'
   add(p,key,'头衔',f'{name}入选全国“最美科技工作者”的{basis}是____年。',str(year),aliases=[str(year)+'年'])
 for quote in p.get('quotes',[]):
  key='quote:'+quote['text'];src=[quote['source']]
  clue='“'+quote['text']+'”'
  # An explicit field hint prevents shared or frequently repeated wording from
  # being presented as an exclusive attribution.
  stem=f'根据所附人物文献，{clue}与哪位{p["field"]}领域人物相对应？'
  choice(p,key,'名言',stem,name,[x['name'] for x in persons if x['name']!=name],links=src)
  add(p,key+':fill','名言',f'根据所附人物文献填写姓名：{clue}\n这位{p["field"]}领域人物是____。',name,links=src)

assert len({q['id'] for q in questions})==len(questions)
for q in questions:
 assert q['references'] and q['type'] in ['single','fill']
 if q['type']=='single':assert len(set(q['options']))==4
summary={'updated':dataset['updated'],'entries':len(persons),'questions':len(questions),'types':dict(collections.Counter(q['type'] for q in questions)),'kinds':dict(collections.Counter(q['topic'] for q in questions)),'groups':{g:len([p for p in persons if g in p['groups']]) for g in dict.fromkeys(g for p in persons for g in p['groups'])},'scope':[
 '感动中国：选收2021—2025年度的科研、工程、医学、农业技术、科普及科研求学人物；非科研仅保留苏炳添、郑钦文两位知名代表。2025年度于2026年公布。',
 '全国最美科技工作者：2018—2022年度及2026年发布的10人；2022年度于2023年发布。未核实的中间年度不补造名单，不混入省市同名荣誉。',
 '共和国勋章：2019年8人、2020年1人、2024年4人，13位全部收录。人民科学家：2019年5人、2024年2人；两弹一星：1999年23人。',
 '川大与公众号人物以用户提供的复习资料为范围；校友、任教、双聘按条目说明分清。',
 '公众号尚未取得的文章/海报不宣称已完整覆盖。名言依所附来源措辞出题，不将颁奖辞认作人物原话。']}
(ROOT/'data/people-bank.json').write_text(json.dumps(questions,ensure_ascii=False,indent=2)+'\n')
(ROOT/'data/people-coverage.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
out='/* Generated by scripts/build-people.py; edit data/people.json. */\n'
out+='window.PEOPLE_QUESTIONS='+json.dumps(questions,ensure_ascii=False,separators=(',',':'))+';\n'
out+='window.PEOPLE_PROFILES='+json.dumps(persons,ensure_ascii=False,separators=(',',':'))+';\n'
out+='window.PEOPLE_META='+json.dumps(summary,ensure_ascii=False,separators=(',',':'))+';\n'
materials={p['name']:knowledge[next(q['id'] for q in questions if q['person']==p['name'])] for p in persons}
out+='window.PEOPLE_MATERIALS='+json.dumps(materials,ensure_ascii=False,separators=(',',':'))+';\n'
out+='window.PEOPLE_KNOWLEDGE=Object.fromEntries(window.PEOPLE_QUESTIONS.map(q=>[q.id,window.PEOPLE_MATERIALS[q.person]]));\n'
(ROOT/'people.js').write_text(out)
doc='# 科学家人物专项\n\n'
doc+=f'更新：{dataset["updated"]}。去重后 {len(persons)} 个人物/群体，{len(questions)} 道题，其中选择题 {summary["types"]["single"]} 道、填空题 {summary["types"]["fill"]} 道。不同题型可从正向、反向考查同一知识点；题量不等于独立事实数量。\n\n'
doc+='独立入口：[人物专项](https://jinlin-yao.github.io/ganen-scientist-quiz/#people)。按人物、专题、荣誉年份、考点、题型筛选，支持未做/已做/错题、随机练习、人物速查、逐题知识资料。原题库与专项各自保存练习位置、草稿与随机顺序，不互相覆盖；仅当前浏览器保存，不含跨设备同步。\n\n'
doc+='## 收录原则\n\n'+'\n'.join('- '+s for s in summary['scope'])+'\n\n'
doc+='## 专题人数\n\n| 专题 | 人物/群体 |\n|---|---:|\n'+''.join(f'| {g} | {n} |\n' for g,n in summary['groups'].items())+'\n同一人物可属于多个专题。\n\n'
for group in summary['groups']:
 doc+='## '+group+'\n\n| 人物/群体 | 领域 | 荣誉年份 | 资料依据 |\n|---|---|---|---|\n'
 for p in persons:
  if group not in p['groups']:continue
  awards='；'.join(str(a['year'])+' '+a['name'] for a in p['awards']) or '用户资料人物专题'
  src='；'.join(f'{r["document"]} {r["location"]}' for r in p['references'])
  if p['links']:src+=f' · [来源]({p["links"][0]["url"]})'
  doc+=f'| {p["name"]} | {p["field"]} | {awards} | {src} |\n'
 doc+='\n'
doc+='## 维护与校验\n\n编辑 `data/people.json`，运行 `python scripts/build-people.py` 和 `node scripts/test-people.cjs`。题目 ID 由人物名和考点键生成，调整条目顺序不会清空作答记录。原题库的 `node scripts/test.cjs`、`node scripts/test-progress.cjs` 也须通过。\n\n每个人物有逐条资料引用；新增网络资料保留官方链接。原始用户材料仅引用文档名与段落编号，不上传原始附件。对于材料中的任职、称号与事实，题库只按条目表述，不将所有人都称为院士或科研成果获得者。\n'
(ROOT/'docs/PEOPLE.md').write_text(doc)
print(json.dumps(summary,ensure_ascii=False,indent=2))
