import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Play,Pause,RotateCcw} from 'lucide-react';
import {FreightGrid,depot,shop,route} from './freight-grid.jsx';

const t=LU.txt;
const list=xs=>xs.map(t).join(' + ');
const method=T=>T.init==='mc'?'Метод минимальной стоимости':'Метод северо-западного угла';
const loc=(P,s)=>route(P,s.i,s.j);
function distribution(T,step,f){
  const P=T.P, legs=T.first.steps, choice=step.freightLeg==null;
  const k=step.freightLeg??0, e=legs[k], next=legs[k+1], mc=T.init==='mc';
  const a=P.a.slice(),b=P.b.slice(),cells=a.map(()=>b.map(()=>null));
  for(const l of legs.slice(0,k)){cells[l.i][l.j]=l.x;a[l.i]=l.a1;b[l.j]=l.b1;}
  const tag=loc(P,e), source=depot(P,e.i), dest=shop(P,e.j), reserve=e.j>=P.n0;
  const rule=mc?'Среди открытых клеток берём наименьший тариф за ящик. При равной цене идём сверху вниз, затем слева направо.':'Север на бумаге — сверху, запад — слева. Поэтому берём верхнюю левую клетку оставшейся таблицы. Тариф в этом выборе не участвует.';
  const decision=mc?'Это жадный выбор по цене одного рейса. Общую стоимость плана ещё предстоит проверить.':'По объёму шаг жадный: сразу берём всё, что здесь помещается. Сначала строим выполнимый план, затем ищем, как снизить его стоимость.';
  const out={grid:{P,values:cells,rows:a,cols:b,caption:'План в ящиках · точка означает пустую клетку',rowLabel:'Запас',colLabel:'Нужно',selected:[e.i,e.j]}};
  if(choice){
    if(mc){out.grid.values=P.c;out.grid.caption='Тарифы · стоимость доставки одного ящика';}
    return {...out,title:'Почему начинаем с '+tag+'?',labels:['Прочитать таблицу','Выбрать клетку','Объяснить выбор'],
      notes:['Каждая строка принадлежит складу, каждый столбец — магазину. Их пересечение обозначает один маршрут.',rule,decision],
      sums:[method(T),mc?'Минимальный тариф = '+t(P.c[e.i][e.j])+' ед. за ящик':'Первая строка × первый столбец',tag+' · запас '+t(e.a0)+' · заказ '+t(e.b0)]};
  }
  if(f===2){cells[e.i][e.j]=e.x;a[e.i]=e.a1;b[e.j]=e.b1;}
  const after=next?((e.elim==='row'?'Запас исчерпан. Закрываем строку '+source+'.':'Заказ закрыт. Закрываем столбец '+dest+'.')+' '+(mc?'Снова сравниваем тарифы. ':e.elim==='row'?'Спускаемся на строку ниже. ':'Сдвигаемся вправо. ')+'Пунктиром отмечена следующая клетка '+loc(P,next)+'.'):'Все остатки равны нулю. Начальный план готов. Теперь проверим, можно ли доставить тот же груз дешевле.';
  return {...out,title:(reserve?'Сколько останется на складе ':'Сколько ящиков назначить на рейс ')+(reserve?source:tag)+'?',labels:['Найти маршрут','Сравнить остатки','Записать груз'],
    notes:[(k===0?method(T)+'. '+rule:'Предыдущие назначения уже записаны. '+(mc?'Это самый дешёвый из оставшихся маршрутов.':'Это верхняя левая клетка оставшейся таблицы.')),
      reserve?'Резерв обозначает ящики, которые останутся на складе. Для них выделен отдельный столбец.':e.x.isZero()?'Запас или заказ уже исчерпан. Записываем 0: эта клетка нужна для расчёта потенциалов, ящики здесь не перевозят.':'Больше запаса увезти нельзя, лишние ящики магазину тоже не нужны. Выбираем меньшее число.',
      (reserve?'Записываем остаток в резерв. ':'Пишем '+t(e.x)+' на пересечении '+source+' и '+dest+'. ')+after],
    sums:[source+' · осталось '+t(e.a0)+' ящ.   /   '+dest+' · нужно '+t(e.b0)+' ящ.',
      <>Меньшее из {t(e.a0)} и {t(e.b0)} = <b data-payload>{t(e.x)}</b> ящ.</>,
      <>{reserve?'Остаток на складе '+source:'Объём на рейсе '+tag}: <b data-payload>{t(e.x)}</b> ящ.<br/>Запас: {t(e.a0)} − {t(e.x)} = {t(e.a1)}<br/>Заказ: {t(e.b0)} − {t(e.x)} = {t(e.b1)}</>],
    quantity:e.x,source:e.a0.le(e.b0)?'stock':'order',grid:{...out.grid,balances:true,write:f===2,next:f===2?next:null}};
}
function balance(T,f){
  const P=T.P,d=P.sa.sub(P.sb),a=P.a.slice(0,P.m0),b=P.b.slice(0,P.n0);
  return {title:'Хватит ли ящиков для всех магазинов?',labels:['Прочитать условие','Сложить ящики','Учесть разницу'],
    notes:['Справа от строки указан весь запас склада. Внизу столбца — сколько заказал магазин. В середине появятся количества по маршрутам.','Сложите склады отдельно от магазинов. Один и тот же ящик считается один раз в каждом итоге.',
      d.s>0?'После доставки останутся ящики. Запишем их в столбец «Резерв». Эти ящики останутся на складах, перевозка стоит 0.':d.s<0?'Запас меньше заказа. Для выполнения всех заказов понадобится дополнительный груз.':'Весь запас потребуется для заказов. Дополнительный столбец не нужен.'],
    sums:['Строка A₁ — первый склад. Столбец B₁ — первый магазин.',<>На складах: {list(a)} = {t(P.sa)}<br/>Заказано: {list(b)} = {t(P.sb)}</>,t(P.sa)+' − '+t(P.sb)+' = '+t(d)+' ящ.'],
    grid:{P,values:a.map(()=>[]),rows:a,cols:f===2&&d.s>0?P.b:b,caption:'Условие задачи · ящики',rowLabel:'Запас',colLabel:'Заказ'}};
}
function improvement(T,step,f){
  const P=T.P,s=T.iters[step.freightIteration], [i,j]=s.enter,tag=route(P,i,j),delta=s.delta[i][j];
  const grid={P,values:s.X,rows:P.a,cols:P.b,caption:'Текущий план в ящиках · точка означает свободную клетку',rowLabel:'Запас',colLabel:'Заказ',selected:[i,j]};
  if(step.potential){
    const u=s.pot.u[i],v=s.pot.v[j],c=P.c[i][j];
    return {title:'Что изменится, если открыть маршрут '+tag+'?',labels:['Найти оценки','Сравнить тариф','Прочитать экономию'],
      notes:['Этот план уже покрывает заказы. Чтобы искать экономию, каждой строке и столбцу приписываем число — потенциал. В базисных клетках (тех, по которым строим расчёт) два числа в сумме дают тариф.',
        'У выбранного свободного маршрута вычитаем из тарифа потенциал склада и потенциал магазина. Так учитываем встречные изменения на других рейсах.',
        'Отрицательный результат показывает экономию за каждый ящик, который удастся перенести по замкнутой цепочке. Сколько ящиков доступно, проверим следующим шагом.'],
      sums:[<>Начинаем с u₁ = 0. Для {tag}: u{sub(i+1)} = {t(u)}, v{sub(j+1)} = {t(v)}.</>,
        <>Δ = тариф − u − v = {t(c)} − ({t(u)}) − ({t(v)}) = {t(delta)}</>,t(delta.abs())+' ед. экономии за ящик'],
      detail:<details><summary>Откуда взялись потенциалы?</summary><ol>{s.pot.order.map((o,k)=>{
        if(o.start)return <li key={k}>Берём u₁ = 0 как точку отсчёта.</li>;
        const [a,b]=o.from,known=o.kind==='u'?s.pot.v[b]:s.pot.u[a];
        return <li key={k}>{route(P,a,b)}: тариф {t(P.c[a][b])}. {o.kind}{sub(o.k+1)} = {t(P.c[a][b])} − ({t(known)}) = {t(o.val)}.</li>;
      })}</ol></details>,grid:f===0?grid:{...grid,values:f===1?P.c:s.delta,rows:s.pot.u,cols:s.pot.v,caption:f===1?'Тарифы · справа потенциалы складов, снизу — магазинов':'Оценки свободных маршрутов · изменение стоимости за ящик',rowLabel:'u',colLabel:'v'}};
  }
  const minus=s.cyc.filter(c=>c.sign!=='+'),next=T.iters[step.freightIteration+1], first=minus[0];
  return {title:'Как перенести груз и сохранить заказы?',labels:['Проследить цикл','Найти предел','Пересчитать рейсы'],
    notes:['Ставим плюс в пустой клетке. Идём по строкам и столбцам, поворачивая в базисных клетках, пока не вернёмся к началу. На поворотах чередуем минус и плюс. Так у каждого склада и магазина убыль на одном рейсе возмещается прибавкой на другом.',
      'На клетках с минусом снимаем одинаковое количество. Его ограничивает самая маленькая из этих поставок.',
      s.theta.isZero()?'Предел равен нулю. Меняется набор клеток для следующего расчёта, объёмы и стоимость прежние.':'Прибавьте найденное число в клетках с плюсом и вычтите в клетках с минусом. В таблице теперь новый план.'],
    sums:[s.cyc.map(c=>c.sign+' '+route(P,c.i,c.j)).join('  →  '),
      'Меньшее из объёмов '+minus.map(c=>t(s.X[c.i][c.j]??0)).join(', ')+' = '+t(s.theta)+' ящ.',
      <>{route(P,first.i,first.j)}: {t(s.X[first.i][first.j]??0)} − {t(s.theta)} = {t(next.X[first.i][first.j]??0)} ящ.<br/>Стоимость: {t(s.cost)} → {t(next.cost)} ед.</>],
    grid:{...grid,values:f===2?next.X:s.X,previous:f===2?s.X:null,marks:s.cyc}};
}
const sub=LU.sub;
function optimal(T,f){
  const P=T.P,s=T.iters.at(-1),charges=s.X.flatMap((row,i)=>row.flatMap((v,j)=>v?.s?[{tag:route(P,i,j),q:v,c:P.c[i][j]}]:[]));
  return {title:'Почему можно закончить расчёт?',labels:['Проверить заказы','Проверить оценки','Сложить стоимость'],
    notes:['Сумма по строке с учётом резерва равна запасу. Сумма по столбцу равна заказу. Перед вами выполнимый план.',
      'В свободных клетках показано изменение цены за ящик. Все оценки равны нулю или положительны. По критерию метода потенциалов достигнута наименьшая стоимость.',
      'Для каждого занятого маршрута умножаем число ящиков на тариф из условия. Складываем все произведения.'],
    sums:[t(P.sb)+' ящ. для магазинов',s.delta.flat().filter(v=>v!=null).map(t).join(' · ')||'Свободных клеток нет',charges.map(l=>t(l.q)+' × '+t(l.c)).join(' + ')+' = '+t(T.cost)+' ед.'],
    grid:{P,values:f===1?s.delta:s.X,rows:P.a,cols:P.b,caption:f===1?'Оценки свободных клеток · единиц стоимости на ящик':'Итоговый план · ящики',rowLabel:'Запас',colLabel:'Заказ'}};
}
function CycleTrail({path,frame}){
  const svg=useRef(null);
  useLayoutEffect(()=>{
    const layer=svg.current,table=layer?.parentElement.querySelector('.freight-grid');
    if(!table||!layer)return;
    function align(){
      const box=table.getBoundingClientRect();
      const points=path.map(({i,j})=>{const r=table.tBodies[0].rows[i].cells[j+1].getBoundingClientRect();return [r.left+r.width/2-box.left,r.top+r.height*.17-box.top];});
      const d='M'+points.map(p=>p.join(' ')).join('L')+'Z';
      if(!box.width||!box.height)return;
      layer.setAttribute('viewBox','0 0 '+box.width+' '+box.height);
      layer.firstChild.setAttribute('d',d);
    }
    align();const observer=new ResizeObserver(align);observer.observe(table);return ()=>observer.disconnect();
  },[path,frame]);
  return <svg className="cycle-trail" ref={svg} aria-hidden="true"><path key={frame} pathLength="1"/></svg>;
}
export function FreightReader({model,steps,initial,onMove,finish}){
  const [position,setPosition]=useState(initial);
  const step=steps[position],root=useRef(null);
  function move(to){
    if(to<0||to>=steps.length)return;
    // Keep the viewport at its current scroll offset even when the next
    // explanation is shorter and the reader is near the bottom of the page.
    const el=root.current;
    const roomBelow=document.documentElement.scrollHeight-window.innerHeight-window.scrollY;
    el.style.minHeight=window.scrollY>0?Math.ceil(Math.max(0,el.getBoundingClientRect().height-roomBelow+1))+'px':'';
    setPosition(to);onMove(to);
  }
  return <section className="freight-reader" ref={root}>
    <nav id="step-foot" aria-label="Шаги транспортной задачи">
      <span className="freight-position">Шаг {position+1} из {steps.length}</span>
      <button type="button" disabled={position===0} onClick={()=>move(position-1)}>Назад</button>
      {position+1<steps.length?<button type="button" className="book-primary" onClick={()=>move(position+1)}>Далее →</button>:<a className="book-cta" href={finish}>К практике →</a>}
    </nav>
    <FreightWalk key={step.id} model={model} step={step}/>
  </section>;
}
function FreightWalk({model:T,step}){
  const [f,frame]=useState(()=>LU.reduced()?2:0),[paused,pause]=useState(false);
  const [visible,setVisible]=useState(false),host=useRef(null);
  const page=step.freightLeg!=null||step.title==='Выбор начальной клетки'?distribution(T,step,f):step.freightIteration!=null?improvement(T,step,f):step.title==='Баланс перевозок'?balance(T,f):optimal(T,f);
  useEffect(()=>{
    const article=host.current;let onScreen=false;
    const sync=()=>setVisible(onScreen&&!document.hidden);
    const observer=new IntersectionObserver(([entry])=>{onScreen=entry.isIntersecting;sync();});
    observer.observe(article);document.addEventListener('visibilitychange',sync);
    return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',sync);};
  },[]);
  useEffect(()=>{
    if(paused||!visible||f===2)return;
    const timer=setTimeout(()=>frame(f+1),f===0?2200:2700);
    return ()=>clearTimeout(timer);
  },[f,paused,visible]);
  useLayoutEffect(()=>{
    if(f===0||page.quantity==null||LU.reduced())return;
    const root=host.current,from=root.querySelector(f===1?'[data-source="'+page.source+'"]':'[data-cue="1"] [data-payload]'),to=root.querySelector(f===1?'[data-cue="1"] [data-payload]':'[data-write]');
    if(!from||!to)return;
    const start=from.getBoundingClientRect(),end=to.getBoundingClientRect();
    const chip=document.createElement('span');chip.className='freight-moving-number';chip.setAttribute('aria-hidden','true');chip.textContent=t(page.quantity);
    root.append(chip);const rect=root.getBoundingClientRect();
    chip.style.left=(end.left+end.width/2-rect.left)+'px';chip.style.top=(end.top+end.height/2-rect.top)+'px';
    const motion=chip.animate([{transform:'translate(-50%,-50%) translate('+(start.left+start.width/2-end.left-end.width/2)+'px,'+(start.top+start.height/2-end.top-end.height/2)+'px)'},{transform:'translate(-50%,-50%)'}],{duration:720,easing:'ease-in-out'});
    motion.onfinish=()=>chip.remove();return ()=>{motion.cancel();chip.remove();};
  },[step,f]);
  function playback(){
    if(f===2){frame(0);pause(false);}else pause(!paused);
  }
  return <article className="freight-walk worked-step freight-film" ref={host} data-frame={f}>
    <div className="film-heading"><h3>{page.title}</h3><button type="button" className="film-playback" onClick={playback}>{f===2?<RotateCcw size={15}/>:paused?<Play size={15}/>:<Pause size={15}/>} {f===2?'Повторить':paused?'Продолжить':'Пауза'}</button></div>
    {step.title==='Баланс перевозок'&&T.first&&<p className="freight-first-rule">Сначала проверим, хватит ли груза. Затем распределим его методом {T.init==='mc'?'минимальной стоимости':'северо-западного угла'}. В конце проверим, можно ли выполнить те же заказы дешевле.</p>}
    <div className="freight-lesson-board"><div className="freight-grid-wrap" data-locate={step.title==='Выбор начальной клетки'||step.freightLeg!=null}><FreightGrid {...page.grid}/>{page.grid.marks&&<CycleTrail path={page.grid.marks} frame={f}/>}</div>
      <div className="walk-current film-notes" aria-live="polite" aria-relevant="additions text">{page.labels.map((label,k)=><div key={label} className="film-cue" data-cue={k} data-shown={k<=f} data-current={f===k} aria-hidden={k>f}><strong>{label}</strong><p>{page.notes[k]}</p><div className="film-arithmetic">{page.sums[k]}</div></div>)}{page.detail}</div>
    </div>
  </article>;
}
