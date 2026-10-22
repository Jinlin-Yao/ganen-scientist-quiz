'use strict';
const fs=require('node:fs'),path=require('node:path'),core=require('../core.js');
const root=path.resolve(__dirname,'..'),bank=JSON.parse(fs.readFileSync(path.join(root,'data/bank.json'),'utf8'));
const errors=core.validateBank(bank);if(errors.length)throw Error(errors.join('\n'));
const meta={name:'感恩中国近现代科学家奖助学金 · 四川大学扩充版',school:'四川大学',rule:'2026年川大评审权重：基础40分、笔试20分、面试40分；本页模拟卷为练习配置，具体考试安排以学校通知为准'};
fs.writeFileSync(path.join(root,'questions.js'),'// 数据源：data/bank.json；运行 node scripts/build.cjs 生成。\nwindow.QUESTION_BANK = '+JSON.stringify(bank.filter(q=>q.section!=='school'),null,2)+';\nwindow.BANK_META = '+JSON.stringify(meta)+';\n');
fs.writeFileSync(path.join(root,'my-school.js'),'window.MY_SCHOOL_META = {name:"四川大学"};\nwindow.MY_SCHOOL_BANK = '+JSON.stringify(bank.filter(q=>q.section==='school'),null,2)+';\n');
console.log('Built '+bank.length+' questions');
