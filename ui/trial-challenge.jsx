import React,{useState} from 'react';
import {Flag,Trophy} from 'lucide-react';

// Only submitted attempts enter the record. Keep a snapshot while the next
// candidate is being edited so feedback cannot silently change its meaning.
export function TrialChallenge({value,valid,reason,optimum,maximize=false,steps=[],label='Проверить план',enabled=true,unit='',alternative,onAttempt}){
  const [history,setHistory]=useState({count:0,best:null,last:null});
  const [hypothesis,setHypothesis]=useState('infeasible');
  function submit(claim=false){
    onAttempt?.();
    const won=claim?hypothesis===alternative:valid&&optimum!=null&&value.eq(optimum);
    const improves=!claim&&valid&&(history.best==null||(maximize?value.gt(history.best):value.lt(history.best)));
    const message=claim?(won?(hypothesis==='infeasible'?'Верно. Ни один план не удовлетворяет всем условиям.':'Верно. Цель можно улучшать без конечного предела.'):'Эта гипотеза не подтверждается. Проверьте ограничения и направление цели.'):!valid?reason:won?'Оптимальное решение найдено.':optimum==null?'Допустимый вариант.':maximize?'План допустим, но не оптимален: можно получить больше.':'План допустим, но не оптимален: можно получить меньше.';
    setHistory({count:history.count+1,best:improves?value:history.best,last:{won,message,steps:claim?[]:[...steps]}});
  }
  return <div className="trial-challenge"><div className="trial-actions">
    <button className="trial-primary" disabled={!enabled} onClick={()=>submit()}><Flag/>{label}</button>
    {alternative&&<details><summary>Проверить особый случай</summary><label>Гипотеза<select value={hypothesis} onChange={e=>setHypothesis(e.target.value)}><option value="infeasible">Нет допустимого плана</option><option value="unbounded">Цель можно улучшать без предела</option></select></label><button onClick={()=>submit(true)}>Проверить гипотезу</button></details>}</div>
    {history.last&&<div key={history.count} className="trial-outcome" role="status" data-won={history.last.won}><small>Попытка {history.count}{history.best!=null?' · ваш рекорд '+LU.txt(history.best)+unit:''}</small>
      {history.last.steps.length>0&&<ol>{history.last.steps.map((s,i)=><li key={i} style={{'--order':i}}>{s}</li>)}</ol>}
      <b>{history.last.won&&<Trophy/>}{history.last.message}</b></div>}</div>;
}
