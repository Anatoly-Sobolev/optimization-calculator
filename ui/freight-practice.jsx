import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,Boxes,Truck,Route,Repeat2,Flag,Warehouse,Store} from 'lucide-react';
import {FreightGrid,depot,shop,route} from './freight-grid.jsx';
import {FreightWalk,freightPage,CycleTrail} from './freight-walk.jsx';

const t=LU.txt;
const stages=['Баланс перевозок','Выбор начальной клетки','Начальный план','Потенциалы и оценки','Цикл перераспределения','Оптимальность плана'];
const titles=['Проверить запасы','Выбрать маршрут','Назначить поставку','Оценить новый маршрут','Перенести груз','Проверить минимум'];
const sum=values=>values.reduce((a,b)=>a.add(b||0),Q.of(0));
const stageName=s=>titles[stages.indexOf(s.title)]||s.title;
const tag=(P,e)=>route(P,e.i,e.j);

function Exchange({model:T,index}){
  const [moved,move]=useState(false),s=T.iters[index],P=T.P,[i,j]=s.enter;
  const unit=s.theta.lt(1)?s.theta:Q.of(1),transfer=moved?unit:Q.of(0);
  const matrix=s.X.map(row=>row.slice());
  for(const cell of s.cyc){
    const old=matrix[cell.i][cell.j]||Q.of(0);
    matrix[cell.i][cell.j]=cell.sign==='+'?old.add(transfer):old.sub(transfer);
  }
  const extra=s.cyc.filter(cell=>cell.sign==='+').map(cell=>P.c[cell.i][cell.j]),removed=s.cyc.filter(cell=>cell.sign!=='+').map(cell=>P.c[cell.i][cell.j]);
  const delta=s.delta[i][j],cost=s.cost.add(delta.mul(transfer));
  return <div className="freight-exchange"><div className="freight-grid-wrap">
    <FreightGrid P={P} values={matrix} rows={P.a} cols={P.b} caption="Круг обмена · груз в ящиках" rowLabel="Запас" colLabel="Заказ" selected={[i,j]} marks={s.cyc} previous={moved?s.X:null}/>
    <CycleTrail path={s.cyc} frame={Number(moved)}/></div>
    <section aria-live="polite"><strong>{route(P,i,j)} · оценка {t(delta)}</strong>
    <p>До обмена эта клетка пуста. Если добавить сюда груз, нужно снять столько же с другого рейса этого склада. Линия показывает, где ещё изменить поставки, чтобы каждый магазин получил прежний заказ.</p>
    <p><b>+</b> прибавляем груз на рейсе. <b>−</b> снимаем столько же. Отрицательная оценка показывает экономию на одном перенесённом ящике.</p>
    <div className="exchange-receipt"><span>Снимаем по ящику · тарифы {removed.map(t).join(' + ')} = {t(sum(removed))}</span>
      <span>Добавляем по ящику · тарифы {extra.map(t).join(' + ')} = {t(sum(extra))}</span>
      <b>Изменение затрат: {t(sum(extra))} − {t(sum(removed))} = {t(delta)} ед. на ящик</b></div>
    <div className="freight-proof-cost">Стоимость плана <b key={String(moved)}>{t(s.cost)} → {t(cost)} ед.</b></div>
    {unit.s>0?<button className="book-primary" onClick={()=>move(!moved)}>{moved?'Вернуть исходный план':'Перенести '+t(unit)+' ящ. по циклу'}</button>:<p>В клетке со знаком минус уже 0 ящиков. Сейчас меняется только базис, стоимость остаётся прежней.</p>}</section></div>;
}
export function FreightMethodMap({model,steps}){
  const first=steps.find(s=>s.freightIteration!=null&&s.potential&&model.iters[s.freightIteration].theta.s>0)||steps.find(s=>s.potential);
  const pages=[['Баланс',Boxes,steps[0]],['Первый рейс',Truck,steps.find(s=>s.freightLeg===0)],['Оценка',Route,first],['Обмен',Repeat2,steps.find(s=>s.cycleTrace&&s.freightIteration===first?.freightIteration)],['Минимум',Flag,steps.find(s=>s.title===stages[5])]].filter(p=>p[2]);
  const [tab,select]=useState(()=>Math.max(0,pages.findIndex(p=>p[0]==='Оценка')));
  const [label,,step]=pages[tab];
  return <section className="freight-map-lesson" aria-label="Схема транспортного метода"><div className="freight-map-line">{pages.map(([name,Icon],k)=><React.Fragment key={name}>{k>0&&<ArrowRight size={14} aria-hidden="true"/>}<button aria-pressed={tab===k} onClick={()=>select(k)}><Icon size={18}/>{name}</button></React.Fragment>)}</div>
    {label==='Оценка'?<Exchange model={model} index={step.freightIteration}/>:<FreightWalk key={step.id} model={model} step={step} heading="h4"/>}</section>;
}

function Brief({model:{P},variant}){
  const a=P.a.slice(0,P.m0),b=P.b.slice(0,P.n0);
  return <section className="freight-brief"><p>Нужно доставить <strong>{t(P.sb)} ящ.</strong> со складов в магазины. У каждого склада свой запас, у каждого магазина свой заказ. Составьте план с наименьшими затратами.</p>
    <div className="brief-dispatch"><div><Warehouse size={24}/><span>Запасы складов</span><strong>{t(P.sa)} ящ.</strong></div><ArrowRight size={22} aria-hidden="true"/><div><Store size={24}/><span>Заказы магазинов</span><strong>{t(P.sb)} ящ.</strong></div></div>
    <FreightGrid P={P} values={P.c} rows={a} cols={b} caption={'Исходные данные варианта '+variant+' · тариф за один ящик'} rowLabel="Запас" colLabel="Заказ"/>
    <p>Строка — склад, столбец — магазин. По маршруту {route(P,0,0)} один ящик стоит {t(P.c[0][0])} ед. Его количество вы назначите при построении плана.</p></section>;
}
function decision(T,s){
  const P=T.P,page=freightPage(T,s,0);
  let prompt,choices,right,hint,cue,pickRoute=false,grid=page.grid;
  function amounts(value,candidates){
    right=t(value)+' ящ.';
    choices=[...new Set([value,...candidates,value.add(1),value.add(2)].filter(v=>v.s>=0).map(v=>t(v)+' ящ.'))].slice(0,3);
  }
  if(s.title===stages[0]){
    const diff=P.sa.sub(P.sb);
    prompt='Сравните запас и заказы. Как подготовить таблицу?';
    cue='На складах '+t(P.sa)+' ящ. · Заказано '+t(P.sb)+' ящ.';
    choices=['Добавить столбец для остатка на складах','Начать распределение без дополнительного столбца','Указать, что груза для всех заказов недостаточно'];
    right=choices[diff.s>0?0:diff.s===0?1:2];
    hint='На складах '+t(P.sa)+' ящ., магазины заказали '+t(P.sb)+'. Сравните эти два числа. Оставшиеся после доставки ящики учитываются отдельно.';
  }else if(s.title===stages[1]){
    prompt=T.init==='mc'?'Как выбрать первый маршрут методом минимальной стоимости?':'С какой клетки начинает метод северо-западного угла?';
    cue='Каждая клетка — один маршрут. Сначала выбираем клетку, затем её объём.';
    choices=['С верхней левой клетки','С доступной клетки с наименьшим тарифом','С клетки самого большого заказа'];
    right=choices[T.init==='mc'?1:0];
    hint=T.init==='mc'?'Сравнивайте тарифы за один ящик, включая нулевой тариф резерва.':'Представьте компас на таблице: север сверху, запад слева.';
    grid={...grid,selected:[]};
  }else if(s.freightLeg!=null){
    const e=T.first.steps[s.freightLeg];
    prompt=(e.j>=P.n0?'Сколько ящиков записать в резерв склада '+depot(P,e.i):'Сколько ящиков назначить на '+tag(P,e))+'?';
    cue='Склад '+depot(P,e.i)+' · осталось '+t(e.a0)+' ящ.    /    '+shop(P,e.j)+' · требуется '+t(e.b0)+' ящ.';
    if(s.freightLeg%2===1){
      pickRoute=true;right=tag(P,e);choices=[];
      const prev=T.first.steps[s.freightLeg-1];
      prompt='Куда перейти после '+tag(P,prev)+'? Нажмите клетку.';
      grid={...grid,selected:[]};
      cue='После предыдущей записи: запас '+depot(P,prev.i)+' = '+t(prev.a1)+', остаток заказа '+shop(P,prev.j)+' = '+t(prev.b1)+'.';
      if(T.init==='mc'){grid={...grid,values:P.c,caption:'Тарифы · сравните доступные маршруты'};}
      hint=T.init==='mc'?'Сравните тарифы оставшихся строк и столбцов. При равенстве выбираем первую клетку по строкам.':
        (prev.elim==='row'?'Закрыта строка склада. Спуститесь на одну строку, сохранив столбец.':'Закрыт столбец заказа. Перейдите на один столбец вправо, сохранив строку.');
    }else{
    amounts(e.x,[e.a0,e.b0,e.x.sub(1)]);hint='Для этой клетки осталось на складе '+t(e.a0)+' ящ., требуется '+t(e.b0)+'. Выберите наибольшую поставку, которая укладывается в оба остатка.';
    }
  }else if(s.potential){
    const it=T.iters[s.freightIteration],[i,j]=it.enter;
    prompt='Что сделать с маршрутом '+route(P,i,j)+' после сравнения тарифа с u + v?';
    grid={...grid,values:P.c,rows:it.pot.u,cols:it.pot.v,rowLabel:'u',colLabel:'v',caption:'Тарифы · справа оценки складов u, внизу оценки магазинов v'};
    cue='Свободная клетка '+route(P,i,j)+'. Тариф '+t(P.c[i][j])+', сумма потенциалов '+t(it.pot.u[i])+' + ('+t(it.pot.v[j])+') = '+t(it.pot.u[i].add(it.pot.v[j]))+'.';
    choices=['Построить цикл через эту клетку и проверить возможный обмен','Сразу отправить по этому маршруту весь запас','Закончить расчёт и принять текущий план'];
    right=choices[0];hint='Тариф '+t(P.c[i][j])+', сумма u + v равна '+t(it.pot.u[i].add(it.pot.v[j]))+'. Если тариф меньше этой суммы, один ящик на цикле может дать экономию. Объём ещё предстоит проверить.';
  }else if(s.cycleTrace){
    const it=T.iters[s.freightIteration],minus=it.cyc.filter(c=>c.sign!=='+' ),loads=minus.map(c=>it.X[c.i][c.j]||Q.of(0));
    prompt='Сколько ящиков можно перенести по этому циклу за один шаг?';
    cue='На рейсах с минусом сейчас '+loads.map(t).join(', ')+' ящ. С каждого из них снимем одинаковый объём.';
    amounts(it.theta,[...loads,it.theta.sub(1)]);hint='С каждого рейса со знаком «−» снимаем одинаковое число ящиков. Здесь на них '+loads.map(t).join(', ')+'. Найдите самый маленький из этих объёмов.';
  }else{
    const it=T.iters.at(-1);
    prompt='Заказы выполнены. Какое действие разрешают оценки свободных клеток?';
    grid={...grid,values:it.delta,caption:'Оценки свободных маршрутов · стоимость переноса одного ящика'};
    cue='Точка обозначает базисную клетку. Каждое число — изменение затрат за один ящик для свободного маршрута.';
    choices=['Завершить расчёт и записать стоимость','Открыть маршрут с положительной оценкой для экономии','Заново распределить весь груз'];
    right=choices[0];hint='Уменьшение затрат возможно при отрицательной оценке. Посмотрите, встречается ли хотя бы одна такая клетка.';
  }
  return {prompt,choices:LU.order(choices,s.id),right,hint,cue,pickRoute,grid};
}

function CompleteSolution({model:T,steps,replay}){
  const P=T.P;
  if(T.status!=='optimal')return <section><h3>Заказы нельзя выполнить полностью</h3><p>Запас {t(P.sa)} ящ., заказано {t(P.sb)} ящ. Не хватает {t(P.sb.sub(P.sa))} ящ.</p></section>;
  const last=T.iters.at(-1),cost=T.cost,free=last.delta.flat().filter(v=>v!=null);
  const sent=last.X.map(row=>sum(row)),received=P.b.map((_,j)=>sum(last.X.map(row=>row[j])));
  const charges=last.X.flatMap((row,i)=>row.flatMap((q,j)=>q?.s?[{name:route(P,i,j),q,c:P.c[i][j]}]:[]));
  return <section className="freight-result"><h3>Оптимальный план · {t(cost)} ед.</h3>
    <FreightGrid P={P} values={last.X} rows={sent.map((v,i)=>t(v)+' / '+t(P.a[i]))} cols={received.map((v,j)=>t(v)+' / '+t(P.b[j]))} caption="В клетках — ящики. На полях — итог / требование." rowLabel="Учтено / запас" colLabel="Итого / заказ"/>
    <p>Магазинам назначены все {t(P.sb)} ящ.{P.fict==='col'&&' Ещё '+t(P.sa.sub(P.sb))+' ящ. остаются на складах в столбце «Резерв».'} Первая раскладка стоила {t(T.cost0)} ед., последняя — {t(cost)} ед. Экономия составила <b>{t(T.cost0.sub(cost))} ед.</b></p>
    <p><b>Почему это минимум?</b> Итоги по строкам и столбцам подтверждают допустимость плана. {free.length?'Наименьшая оценка свободной клетки равна '+t(free.reduce((a,b)=>a.lt(b)?a:b))+'. Все оценки неотрицательны.':'Свободных клеток нет.'} По критерию метода потенциалов дешевле выполнить эти заказы невозможно.</p>
    <details open><summary>Из чего складывается стоимость</summary><ul className="freight-charges">{charges.map(e=><li key={e.name}><span>{e.name}</span><b>{t(e.q)} ящ. × {t(e.c)} = {t(e.q.mul(e.c))} ед.</b></li>)}</ul><p>Итого {charges.map(e=>t(e.q.mul(e.c))).join(' + ')} = <b>{t(cost)} ед.</b></p></details>
    <details open><summary>Весь ход решения</summary><ol className="freight-history">{steps.map((s,k)=>{
      let info;
      if(s.freightLeg!=null){const e=T.first.steps[s.freightLeg];info=tag(P,e)+' · минимум из '+t(e.a0)+' и '+t(e.b0)+' = '+t(e.x)+' ящ.';}
      else if(s.potential){const [c,u,v]=s.potential;info=route(P,...s.routeIndex)+' · Δ = '+t(c)+' − ('+t(u)+') − ('+t(v)+') = '+s.answer;}
      else if(s.cycleTrace){const it=T.iters[s.freightIteration];info='Перенос '+t(it.theta)+' ящ. · стоимость '+t(it.cost)+' → '+t(T.iters[s.freightIteration+1].cost)+' ед.';}
      else info=s.answer;
      return <li key={s.id}><button onClick={()=>replay(k)}>{stageName(s)}</button> · {info}</li>;
    })}</ol></details></section>;
}

export function FreightPractice({model:T,steps,variant,progress,save}){
  const key=String(variant)+'/'+steps.map(s=>s.id).join('|');
  const passed=progress?.key===key&&Number.isInteger(progress.passed)?Math.max(0,Math.min(steps.length,progress.passed)):0;
  const [unlocked,unlock]=useState(passed),[pos,setPos]=useState(passed),[mode,setMode]=useState('brief'),[wrong,setWrong]=useState(''),[ready,setReady]=useState(false);
  const heading=useRef(null),focus=useRef(false);
  useEffect(()=>{if(focus.current){heading.current?.focus({preventScroll:true});focus.current=false;}},[mode,pos]);
  function enter(view){focus.current=true;setMode(view);}
  function next(){
    const index=pos+1;setPos(index);setWrong('');setReady(false);enter(index===steps.length?'summary':'question');
  }
  function choose(label,q){
    if(label!==q.right){setWrong(label);return;}
    const count=Math.max(unlocked,pos+1);unlock(count);save({key,passed:count});
    setReady(false);enter('film');
  }
  function start(){
    setPos(unlocked?unlocked-1:0);setReady(false);enter(unlocked===steps.length?'summary':unlocked?'film':'question');
  }
  const step=steps[pos];
  if(mode==='brief')return <section className="freight-practice"><h3>Составьте план доставки</h3><Brief model={T} variant={variant}/><p>На каждом этапе выберите следующее действие. После верного ответа увидите, какие числа изменились и почему.</p><button className="book-primary" onClick={start}>{unlocked===steps.length?'Открыть готовое решение':unlocked?'Продолжить решение':'Начать решение'}</button></section>;
  if(mode==='summary')return <div className="freight-practice"><CompleteSolution model={T} steps={steps} replay={k=>{setPos(k);setReady(false);enter('review');}}/><button onClick={()=>{unlock(0);save({key,passed:0});setWrong('');enter('brief');}}>Решить ещё раз</button></div>;
  const q=decision(T,step),film=mode==='film'||mode==='review';
  return <section className="freight-practice"><div className="freight-position">Действие {pos+1} из {steps.length} · {stageName(step)}</div>
    <details className="practice-condition"><summary>Условие и тарифы</summary><Brief model={T} variant={variant}/></details>
    {film?<><div ref={heading} tabIndex={-1} className="freight-verdict">{mode==='review'?'Повтор шага':'✓ Верно. Выполняем выбранное действие.'}</div>
      <FreightWalk key={step.id} model={T} step={step} onComplete={setReady}/>
      {mode==='review'?<button className="book-primary" onClick={()=>enter('summary')}>К полному решению</button>:<button className="book-primary" disabled={!ready} onClick={next}>{pos===steps.length-1?'Посмотреть всё решение':'Следующее действие →'}</button>}</>:
      <><h3 ref={heading} tabIndex={-1}>{q.prompt}</h3><div className="practice-choice-board"><div className="freight-grid-wrap"><FreightGrid {...q.grid} onPick={q.pickRoute?([i,j])=>choose(route(T.P,i,j),q):undefined} pickLabel={(i,j)=>'Выбрать '+route(T.P,i,j)}/>{q.grid.marks&&<CycleTrail path={q.grid.marks} frame={0}/>}</div>
      <div className="practice-decisions"><p className="practice-evidence">{q.cue}</p>{q.choices.map(label=><button key={label} aria-pressed={wrong===label} onClick={()=>choose(label,q)}>{label}</button>)}
        {wrong&&<p role="status">{q.pickRoute?wrong+' · проверьте переход.':'Попробуйте ещё раз.'} {q.hint}</p>}</div></div></>}
  </section>;
}
