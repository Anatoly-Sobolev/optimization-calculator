import React,{useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {LessonArt} from './lesson-art.jsx';
import {lessonContext} from './lesson-context.jsx';

const fmt=LU.txt;
const options=(values,unit)=>values.map(v=>[v,LU.ru(v)+' '+unit]);

// The marker is the problem's requirement. The moving endpoint is calculated
// from the student's choice, on the same scale for all choices in this scene.
function Measure({label,value,unit,limit,max,min=0}){
  const pos=v=>100*(v-min)/(max-min||1);
  const zero=pos(0),end=pos(value);
  return <div className="choice-measure"><div><b>{label}</b><strong>{LU.ru(value)} {unit}</strong></div>
    <div className="measure-scale" aria-hidden="true"><i style={{left:Math.min(zero,end)+'%',width:Math.abs(end-zero)+'%'}}/>{limit!=null&&<em style={{left:pos(limit)+'%'}}/>}</div>
    {limit!=null&&<small>Метка на шкале · {LU.ru(limit)} {unit}</small>}</div>;
}
function example(d,index){
  const t=d.type;
  if(t==='transp'){
    const {P}=d.T,a=LU.num(P.a[0]),b=LU.num(P.b[0]),cap=Math.min(a,b),rate=P.c[0][0];
    const choices=options([0,1,cap],'ящ.'),q=choices[index][0];
    return {title:'Как развезти ящики дешевле?',story:`На складах ${fmt(P.sa)} ящ., а магазины ждут ${fmt(P.sb)}. Один и тот же магазин можно снабжать с разных складов. В таблице одна клетка — один маршрут, тариф в ней — цена перевозки одного ящика.`,
      goal:'Назначьте груз каждой машине. Все магазины должны получить свой заказ, а сумма затрат по рейсам должна быть наименьшей.',
      caption:'Рейс склада A₁ в магазин B₁',prompt:'Сколько ящиков загрузить?',choices,
      visual:<LessonArt scene="transport" left={'На складе · '+(a-q)} right={'Магазину нужно ещё · '+(b-q)} changed={q>0} shipment={q}/>,
      result:`Из ${a} ящ. со склада отправлено ${q}. По тарифу варианта этот рейс стоит ${q} × ${fmt(rate)} = ${fmt(rate.mul(q))} ед.`};
  }
  if(t==='netw'){
    const a=d.N.arcs[0],days=LU.num(a.d),delay=index;
    return {title:'Когда можно начать укладку настила?',story:`Представьте строительство моста. Сначала бригада ставит опоры, затем на них укладывают настил. В графике кружок — момент готовности, стрелка — работа. Первая работа от события ${a.i} до ${a.j} занимает ${days} дней.`,
      goal:'Назначьте даты работ так, чтобы каждая началась после готовности её предшественников. Найдите самый ранний срок завершения всего проекта.',
      caption:'Одна бригада, одна работа',prompt:'В какой день начать?',choices:options([0,1,2],'дн.'),
      visual:<LessonArt scene="schedule" days={days} left={'Старт · день '+delay} right={'Готово · день '+(delay+days)}/>,
      evidence:<div className="calendar-strip"><i style={{left:100*delay/(2+days)+'%',width:100*days/(2+days)+'%'}}/></div>,
      result:`Начало в день ${delay}. Опоры будут готовы в день ${delay} + ${days} = ${delay+days}. До этого укладку настила начинать нельзя.`};
  }
  if(t==='game'){
    const row=d.G.C[0],choices=row.map((_,j)=>[j,'Ход B'+LU.sub(j+1)]),score=row[index];
    return {title:'Сколько фишек принесёт выбранный ход?',story:'Два игрока одновременно выбирают ходы. A выбирает строку таблицы, B — столбец. На пересечении записан выигрыш A в фишках. При отрицательном числе A отдаёт фишки сопернику.',
      goal:'Подберите, как часто A стоит выбирать каждую строку, чтобы его средний выигрыш при самом неудобном ответе B был как можно выше.',
      caption:'A всегда выбирает первую строку',prompt:'Как ответит игрок B?',choices,
      visual:<LessonArt scene="game" choices={row} selected={index} left="Игрок A · строка 1" right={'Игрок B · столбец '+(index+1)}/>,
      evidence:<Measure label="Изменение счёта A" value={LU.num(score)} unit="фиш." min={Math.min(0,...row.map(LU.num))} max={Math.max(0,...row.map(LU.num))}/>,
      result:`Клетка A₁B${LU.sub(index+1)} содержит ${fmt(score)}. ${score.s<0?'A отдаёт B '+fmt(score.abs())+' фиш.':score.s>0?'B передаёт A '+fmt(score)+' фиш.':'Счёт обоих игроков прежний.'}`};
  }
  const world=lessonContext(d),p=d.P;
  if(t==='graph'){
    const r=p.rows[0],x=index,h=r.a[0].mul(x).add(r.a[1]),revenue=p.c[0].mul(x).add(p.c[1]);
    return {...world,caption:'Заказ на ткань',prompt:'К одному метру шёлка добавьте лён',choices:options([0,1,2],'м'),
      visual:<LessonArt scene="loom" left={'Лён · '+x+' м'} right="Шёлк · 1 м"/>,
      evidence:<Measure label="Время станка" value={LU.num(h)} limit={LU.num(r.b)} max={Math.max(LU.num(r.b),LU.num(r.a[0].mul(2).add(r.a[1])))} unit="мин"/>,
      result:`Точка (${x}; 1) — ${x} м льна и 1 м шёлка. Расход времени: ${fmt(r.a[0])} × ${x} + ${fmt(r.a[1])} × 1 = ${fmt(h)} мин. Выручка — ${fmt(revenue)} ₽.`};
  }
  if(t==='canon'){
    const bound=d.rec.canon.info.find(v=>v.kind==='ge'),v=bound.lo.add(index);
    return {...world,caption:'Обязательный литр и добавка',prompt:'Сколько долить сверх минимума?',choices:options([0,1,2],'л'),
      visual:<LessonArt scene="minimum" volumes={[0,v]} minimum={LU.num(bound.lo)} left="Светлая · 0 л" right={'Синяя · '+fmt(v)+' л'}/>,
      result:`Пунктир отмечает обязательный объём. Синей смеси в стакане ${fmt(bound.lo)} + ${index} = ${fmt(v)} л. В эксперименте проверьте, хватит ли на неё связующего.`};
  }
  if(t==='ilp'||t==='gomory'){
    const j=d.lpX.findIndex(v=>!v.isInt()),raw=d.lpX[j],low=Math.floor(LU.num(raw)),amount=[raw,Q.of(low),Q.of(low+1)][index];
    const plan=d.lpX.map((v,i)=>i===j?amount:v),failed=ALG.check(p,plan).findIndex(r=>!r.ok);
    return {...world,caption:world.variables[j][0]+' плитка',prompt:'Какое количество внести в заказ?',choices:[[0,fmt(raw)+' шт.'],[1,low+' шт.'],[2,(low+1)+' шт.']],
      visual:<LessonArt scene="pieces" left={'Расчёт · '+fmt(raw)+' шт.'} right={'В заказе · '+fmt(amount)+' шт.'}/>,
      evidence:<div className="tile-strip" aria-hidden="true">{Array.from({length:low+1},(_,k)=><span key={k}><i style={{width:100*Math.max(0,Math.min(1,LU.num(amount)-k))+'%'}}/></span>)}</div>,
      result:!amount.isInt()?`Расчёт даёт ${fmt(raw)} шт. Видна неполная плитка: такую партию нельзя отгрузить.`:`Вы выбрали ${fmt(amount)} шт. Остальные позиции прежние. ${failed>=0?'Теперь нарушено ограничение «'+world.rows[failed][0]+'».':'Ресурсные ограничения выполнены.'}`};
  }
  if(t==='dual'||t==='duality'){
    const j=d.D.c.findIndex(v=>v.s!==0),price=d.D.signs?.[j]==='<='?-index:index,volume=d.D.c[j],total=volume.mul(price),[resource,unit]=world.rows[j];
    return {...world,title:'Как перевести условие задачи в рубли?',story:`${world.story} Возьмём одно условие — «${resource}». В нём указано ${fmt(volume)} ${unit}. Оцените каждую единицу в рублях.`,goal:'Сначала вычислите вклад одного условия. Затем подберите оценки для всех условий и проверьте, дают ли они верхнюю границу дохода.',
      caption:resource+' · '+fmt(volume)+' '+unit,prompt:'Какую оценку назначить единице?',choices:options([0,1,2].map(n=>d.D.signs?.[j]==='<='?-n:n),'₽/'+unit),
      visual:<LessonArt scene={world.scene} left={'За 1 '+unit+' · '+price+' ₽'} right={'Всего · '+fmt(total)+' ₽'}/>,
      evidence:<Measure label="Вклад в оценку плана" value={LU.num(total)} min={Math.min(0,2*LU.num(volume)*(d.D.signs?.[j]==='<='?-1:1))} max={Math.max(0,2*LU.num(volume)*(d.D.signs?.[j]==='<='?-1:1))} unit="₽"/>,
      result:`${resource}: ${fmt(volume)} ${unit} × (${price} ₽/${unit}) = ${fmt(total)} ₽. Остальные оценки пока нулевые. Сама эта сумма ещё требует проверки по всем условиям.`};
  }
  const r=p.rows[0],j=Math.max(0,r.a.findIndex(v=>v.s===(r.b.s<0?-1:1)));
  const [name,,unit]=world.variables[j],[resource,measure]=world.rows[0],base=t==='optcheck'?d.xbar:p.c.map(()=>Q.of(0));
  const values=(unit==='ч'?[0,.5,1,2]:[0,1,2]).map(n=>base[j].add(Q.of(n)));
  const plan=base.map((v,i)=>i===j?values[index]:v),checks=ALG.check(p,plan);
  const value=checks[0].lhs,total=LSCENE.objValue(p,plan);
  const ends=values.map(v=>LU.num(ALG.check(p,base.map((other,i)=>i===j?v:other))[0].lhs));
  const other=ALG.check(p,base.map((v,i)=>i===j?Q.of(0):v))[0].lhs;
  const bound=LU.num(r.b),rule=r.s==='='?'ровно':r.s==='>='?'не меньше':'не больше';
  const parts=(t==='artificial'||t==='dsx')&&d.state.src==='rgr';
  const missing=parts?world.rows.flatMap(([part],i)=>checks[i].ok?[]:[part.toLowerCase()+' — ещё '+fmt(p.rows[i].b.sub(checks[i].lhs))+' шт.']):[];
  return {...world,caption:parts?'Выпуск деталей за смену':resource+' · '+rule+' '+fmt(r.b)+' '+measure,prompt:name+' — выберите '+(unit==='ч'?'время работы':'объём'),choices:values.map(v=>[LU.num(v),fmt(v)+' '+unit]),
    visual:<LessonArt scene={world.scene} left={name+' · '+fmt(plan[j])+' '+unit} right={world.objective+' · '+fmt(total)+' '+world.money}/>,
    evidence:parts?<div className="output-trays">{world.rows.map(([part],i)=><div key={part}><b>{part}</b><span>{fmt(checks[i].lhs)} шт. · нужно {fmt(p.rows[i].b)}</span><progress value={Math.min(LU.num(checks[i].lhs),LU.num(p.rows[i].b))} max={LU.num(p.rows[i].b)} aria-label={part}/></div>)}</div>:<Measure label={resource} value={LU.num(value)} unit={measure} limit={bound} min={Math.min(0,bound,...ends)} max={Math.max(0,bound,...ends)}/>,
    result:`${name}: ${fmt(plan[j])} ${unit}. ${resource}: ${other.s?fmt(other)+' + ':''}${fmt(r.a[j])} × ${fmt(plan[j])} = ${fmt(value)} ${measure}${measure.endsWith('.')?'':'.'} ${world.objective} — ${fmt(total)} ${world.money}.`+(parts?(missing.length?' До выполнения заказа: '+missing.join(', '):' Все три требования выполнены.'):'')};
}
export function LessonOpening({data,onTry}){
  const [index,setIndex]=useState(0),e=example(data,index);
  const action={transp:'Составить план перевозок',game:'Сыграть партию',netw:'Составить расписание',dual:'Попробовать свои оценки',duality:'Попробовать свои оценки'}[data.type]??'Попробовать свой план';
  return <section className="lesson-opening" aria-label="Постановка задачи"><div className="opening-story"><h2>{e.title}</h2><p>{e.story}</p><h3>Что нужно найти</h3><p>{e.goal}</p></div>
    <figure className="opening-example"><figcaption>{e.caption}</figcaption>{e.visual}
    <div className="quantity-choice" role="group" aria-label={e.prompt}><b>{e.prompt}</b><div>{e.choices.map(([,label],i)=><button type="button" key={i} aria-pressed={i===index} onClick={()=>setIndex(i)}>{label}</button>)}</div></div>
    {e.evidence}<p aria-live="polite">{e.result}</p></figure>
    <footer><button className="trial-primary" onClick={onTry}>{action} <ArrowRight/></button></footer></section>;
}
