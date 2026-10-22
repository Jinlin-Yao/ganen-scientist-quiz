"""Build per-question review excerpts from the corrected, source-linked question corpus.
No raw legacy paragraphs are re-imported, so previous corrections are retained.
"""
import json,re,math,collections
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bank=json.loads((root/'data/bank.json').read_text())
def textanswer(q):
 if q['type']=='single':return q['options'][q['answer']]
 if q['type']=='multiple':return '、'.join(q['options'][i] for i in q['answer'])
 return q['answer']
def norm(s):return re.sub(r'[^\w\u4e00-\u9fff]','',s).lower()
def grams(s):
 s=norm(s);return {s[i:i+3] for i in range(len(s)-2) if not s[i:i+3].isdigit()}
people=set()
for q in bank:
 for pat in [r'^([\u4e00-\u9fff]{2,4})有哪些代表性工作',r'^([\u4e00-\u9fff]{2,4})的研究领域',r'^([\u4e00-\u9fff]{2,4})在川大相关人物']:
  m=re.match(pat,q['question'])
  if m:people.add(m[1])
terms=people|set('东方红一号 甲种分离膜 巨浪一号 北斗 墨子号 悟空号 神舟五号 神舟十五号 天问一号 嫦娥六号 FAST 天宫一号 天宫二号 天舟 长征一号 长征二号 载人航天精神 两弹一星精神 嫦娥一号 嫦娥二号 嫦娥三号 嫦娥四号 嫦娥五号 国家最高科学技术奖 共和国勋章 科学家精神 钱塘江大桥 京张铁路 青蒿素 脊髓灰质炎 心胜 两个确立 两个维护 四个面向 四个全面 四个意识 四个自信 五位一体 新发展理念 中国式现代化 共同富裕 人民科学家 夏南牛 牦牛 辣椒 校训 校风 合并 科技工作者日'.split())
candidates=[]
for q in bank:
 a=textanswer(q)
 if q['type']!='flash' or q['status']=='pending' or len(a)<35:continue
 # Use compact factual paragraphs, not application templates or open-ended personal examples.
 if q['topic']=='论述面试' and len(a)>550:continue
 candidates.append({'q':q,'text':a,'g':grams(a),'terms':{t for t in terms if t in q['question']+' '+a},'refs':{(x['document'],x['location']) for x in q['references']}})
df=collections.Counter(g for c in candidates for g in c['g'])
weights={g:math.log(1+len(candidates)/(1+n)) for g,n in df.items()}
background={
 '两弹一星':('“两弹一星”通常指核弹、导弹和人造地球卫星事业，核弹包括原子弹与氢弹。1999年获授或追授功勋奖章的23位专家是一个明确名单，不等于所有参与相关事业的科学家。','q_8444'),
 '科技成就':('科技史应把“任务名称、技术对象、关键节点和人物职责”分开记忆。发射、进入轨道、着陆与返回是不同事件；例如天问一号2020年发射，2021年进入环火轨道并完成着陆巡视。',None),
 '四川大学':('四川大学由原四川大学、原成都科技大学与原华西医科大学历经两次合并形成：1994年原川大与成科合并为四川联合大学，1998年更名为四川大学，2000年与原华西医科大学合并。校训为“海纳百川，有容乃大”，校风为“严谨、勤奋、求是、创新”。',None),
 '科学家精神':('科学家精神包括爱国、创新、求实、奉献、协同、育人六个方面。理解时要把规范表述与具体事迹联系起来：做了什么工作、解决什么问题、为什么体现该精神，以及自己可以怎样践行。',None),
 '人物事迹':('复习人物时可按“姓名—研究领域—代表成果—具体事迹”串联。对同领域人物，比较研究对象和具体职责；人物的称号不能替代其实际贡献，参与国家工程也不等于独立完成全部工作。',None),
 '易混辨析':('对照记忆时优先抓技术对象：吴自良对应铀同位素分离用甲种分离膜，姚桐斌对应航天材料与工艺；陈芳允侧重卫星测控与双星定位，杨嘉墀侧重卫星姿态控制。',None),
 '人民科学家':('所给“人民科学家”五人专题包括叶培建、吴文俊、顾方舟、南仁东、程开甲。专题范围与所有年代国家荣誉获得者的完整名单不是同一概念；同一科学家也可能同时属于不同荣誉专题。',None),
 '科技奖励':('国家最高科学技术奖的获奖年度与颁奖大会举行年份可能不同。例如首届对应2000年度，首次颁奖在2001年举行；题干问“年度”或“颁奖时间”时，要分别作答。',None),
 '最美科技工作者':('手册中的20位最美科技工作者对应2018年与2019年两批专题人物。可按农业、医学、工程装备、材料、信息技术和基层科普分组记忆，注意旧文章中的职务、人数与统计值不代表当前现状。',None),
 '时政理论':('理论表述应连同出处和语境记忆，区分规范原文与复习材料的概括；阅读材料中的某一解释角度不宜扩大为排他的普遍结论。遇到带“今年”“当前”的题干，先明确原题年份。',None),
 '论述面试':('组织回答时可沿“现实需要—具体困难—人物选择与工作—成果意义—个人行动”展开。观点要有人物事实支撑，个人行动应符合真实经历，并具体到课程、实验记录、团队分工或科普实践。',None),
}
result={};matched=0
for q in bank:
 a=textanswer(q);target=q['question']+' '+a;gs=grams(a if q['type']=='flash' else target);ts={t for t in terms if t in target};refs={(x['document'],x['location']) for x in q['references']};rank=[]
 for c in candidates:
  if c['q']['id']==q['id'] or norm(c['text'])==norm(a):continue
  qpeople=ts&people;cpeople=c['terms']&people
  if qpeople and cpeople and not qpeople&cpeople:continue
  shared=ts&c['terms']
  if ts and c['terms'] and not shared and not refs&c['refs']:continue
  overlap=gs&c['g'];similar=sum(weights[g] for g in overlap)/math.sqrt(max(1,len(gs)*len(c['g'])))
  score=similar+len(shared)*1.8+bool(refs&c['refs'])*9
  if not shared and not refs&c['refs'] and similar<1.15:continue
  # Avoid a generic award or theory paragraph just because a bare year matches.
  if score<.9:continue
  rank.append((score,c))
 rank.sort(key=lambda v:-v[0]);paragraphs=[];used=[];selectedterms=set()
 if q['status']=='pending':
  paragraphs=[{'text':'这条资料尚待核查，不作为确定结论背诵。'+a,'references':q['references'],'kind':'待核查说明'}]
 else:
  for score,c in rank:
   if len(paragraphs)>=2:break
   if len(paragraphs) and len(norm(c['text']))>600:continue
   # Avoid restating exactly the same fact in two differently worded sources.
   if any(len(grams(c['text'])&grams(p['text']))/max(1,len(grams(c['text'])))>.72 for p in paragraphs):continue
   body=c['text']
   named=next((name for name in sorted(people,key=len,reverse=True) if c['q']['question'].startswith(name)),None)
   if named and not body.startswith(named):body=named+'：'+body
   if len(body)>700:body=body[:700].rsplit('。',1)[0]+'。'
   paragraphs.append({'text':body,'questionId':c['q']['id'],'references':c['q']['references'],'links':c['q'].get('links',[]),'kind':'资料补充'})
   used.append(c['q']['id']);selectedterms|=c['terms']
  if paragraphs:matched+=1
  else:
   if q.get('note') and len(q['note'])>18:
    paragraphs.append({'text':q['note'],'references':q['references'],'links':q.get('links',[]),'kind':'本题知识整理'})
   else:
    fallback=background.get(q['topic'],background['人物事迹'])[0]
    paragraphs.append({'text':fallback,'references':q['references'],'kind':'复习方法与专题背景'})
  if q.get('note') and q['note'] not in a and not any(norm(q['note']) in norm(p['text']) for p in paragraphs):
   paragraphs.append({'text':q['note'],'references':q['references'],'kind':'易错提醒'})
 
 anchors=[]
 if any(x in target for x in ['第一颗原子弹','第一颗氢弹','首颗原子弹']):
  anchors=[{'text':'1964年10月16日，我国第一颗原子弹爆炸成功；1967年6月17日，第一颗氢弹空爆试验成功，两者相隔约两年零八个月。人物职责也要区分：于敏侧重氢弹理论，邓稼先参与组织核武器理论设计，程开甲侧重核试验体系。','references':[{'document':'handbook','location':'T1R4'},{'document':'handbook','location':'T1R6'},{'document':'handbook','location':'T5R2'}],'kind':'时间线与人物辨析'}]
 elif any(x in target for x in ['科学无国界','科学没有国界']):
  anchors=[{'text':'科学知识和学术交流能够跨越国界，科研成果也可以惠及全人类；科学家作为社会成员，同时承担服务国家和人民的责任。可以结合钱学森的归国选择、屠呦呦团队成果的国际应用理解：爱国与开放合作能够并行。','references':[{'document':'integrated','location':'P234'},{'document':'integrated','location':'P235'}],'kind':'概念理解与事例'}]
 elif ('首届' in target or '首次颁奖' in target) and '最高科学技术奖' in target:
  anchors=[{'text':'首届国家最高科学技术奖对应2000年度，获奖者为吴文俊与袁隆平，分别主要对应数学机械化和杂交水稻。首次颁奖大会举行于2001年，答题时应分清“获奖年度”和“大会年份”。','references':[{'document':'handbook','location':'T3R2'},{'document':'upstream','location':'f62'}],'kind':'获奖年度与颁奖年份'}]
 elif '毛泽东思想活的灵魂' in target:
  anchors=[{'text':'三个基本方面是实事求是、群众路线、独立自主。理解记忆时，分别抓住从实际出发并检验认识、联系群众并回应群众需要、立足自身实际自主探索三个角度；不要与科学家精神六个方面或新发展理念的五项表述混用。','references':[{'document':'integrated','location':'P175'}],'kind':'三项表述与理解线索'}]
 if anchors and q['status']!='pending':paragraphs=anchors
 elif paragraphs and paragraphs[0]['kind']=='复习方法与专题背景' and len(a)<40:
  paragraphs[0]['text']='本题的核心记忆对象：'+a.rstrip('。')+'。'+paragraphs[0]['text']
 
 result[q['id']]={'title':q['topic']+' · 知识点资料','paragraphs':paragraphs,'relatedIds':used}
(root/'data/knowledge.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
(root/'knowledge.js').write_text('// 来源：已校正题库中的复习段落；由 scripts/build-knowledge.py 生成。\nwindow.QUESTION_KNOWLEDGE = '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
print(f'Knowledge materials: {len(result)} / {len(bank)}, related excerpts: {matched}, size: {(root/"knowledge.js").stat().st_size}')
