import React,{useState} from 'react';
import {Warehouse,Store,Truck,Boxes,Factory,Coins,Hourglass,Flag,Package,Scale,ClipboardCheck,ArrowRight,RotateCcw} from 'lucide-react';
import {CutPieces,Workshop} from './teaching-figures.jsx';

const fmt=LU.txt;
const explanations={
  simplex:['Что включить в план выпуска?','Представьте, что мастерская выбирает, сколько изделий каждого вида выпустить. Один и тот же выпуск влияет сразу на несколько условий. При большом числе изделий удобнее сравнивать планы в таблице.'],
  artificial:['С какого плана можно начать расчёт?','Заказ задаёт требования к нескольким количествам сразу. Чтобы начать улучшать план, сначала нужен хотя бы один набор количеств, который проходит все проверки. Именно такой старт помогает найти искусственный базис.'],
  dsx:['Как устранить нехватку и выполнить заказ?','Представьте, что несколько операций вместе обеспечивают заказ. В начальном плане часть требований ещё не выполнена. Изменение одной операции может сократить нехватку, но затронуть и другие требования.'],
  dsimplex:['Как согласовать количества в плане?','В задании несколько величин связаны равенствами. Если изменить одну величину, баланс строки сдвинется. Нужно восстановить все равенства и удержать затраты как можно ниже.'],
  canon:['Как отделить обязательную часть от свободного выбора?','У количества может быть нижняя граница. В план уже входит обязательная часть. Всё сверх неё удобно считать отдельно. Эта замена помогает переписать исходную задачу в форме, пригодной для расчёта.'],
  ilp:['Можно ли выполнить план целыми изделиями?','Представьте, что заказ состоит из неделимых изделий. Расчёт может предложить долю изделия, хотя изготовить и отгрузить можно только целое. Допустимый заказ должен и укладываться в ограничения, и состоять из целых количеств.'],
  gomory:['Что делать, если расчёт дал часть изделия?','Пока изделие делится на бумаге, можно рассматривать дробные планы. Для реального заказа нужны целые единицы. Метод Гомори позволяет исключать дробные планы и сохранять допустимые целые.'],
  optcheck:['Стоит ли принимать предложенный план?','Вам уже дали набор количеств. Сначала нужно выяснить, проходит ли он все ограничения. Затем возникает отдельный вопрос: может ли другой допустимый набор дать лучший результат?'],
  dual:['Как оценить план со стороны ресурсов?','У мастерской есть запас материалов. Можно считать выручку от готовых изделий, а можно спросить, во сколько оценить доступные материалы. Вторая постановка называется двойственной.'],
  duality:['Как проверить результат двумя способами?','У мастерской есть план выпуска. Его результат можно посчитать по изделиям. Есть и вторая проверка: по запасам и их оценкам можно узнать, выше какой суммы выручка подняться не может.']
};
function Diagram({left,right,from:From,to:To,step,cargo:Cargo=Package}){
  return <div className="opening-diagram" aria-hidden="true"><div><From/><b>{left}</b></div>
    <div className="opening-road"><i/><span data-moved={step}><Cargo/></span></div><div><To/><b>{right}</b></div></div>;
}
function graphDemo(d,step){
  const x=step?1:0,y=1,resource=d.P.rows[0];
  return {title:'Сколько метров каждой ткани соткать?',story:`Мастерская выпускает лён и шёлк. На станке есть ${fmt(resource.b)} мин. Метр льна занимает ${fmt(resource.a[0])} мин., метр шёлка — ${fmt(resource.a[1])}. Время на одну ткань уменьшает время на другую.`,
    goal:`Выберите выпуск с наибольшей выручкой. В этом примере метр льна приносит ${fmt(d.P.c[0])} ₽, метр шёлка — ${fmt(d.P.c[1])} ₽. В полном задании нужно выполнить и остальные условия.`,
    action:'Добавить метр льна',caption:'Как прочитать одну точку',initial:'Точка (0; 1) — план на один метр шёлка. Льна в нём пока нет.',
    feedback:`Теперь в плане по метру каждой ткани. Точка сдвинулась на клетку вправо. Потребуется ${fmt(resource.a[0])} + ${fmt(resource.a[1])} = ${fmt(resource.a[0].add(resource.a[1]))} мин. работы станка.`,
    visual:<svg className="opening-axes" viewBox="0 0 360 178" role="img" aria-label={`План (${x}; ${y}) на координатной плоскости`}>
      <defs><pattern id="opening-grid" x="54" y="11" width="60" height="55" patternUnits="userSpaceOnUse"><path d="M60 0H0V55" fill="none" stroke="#d5ded6"/></pattern></defs>
      <rect x="54" y="11" width="265" height="110" fill="url(#opening-grid)"/><path d="M54 10v111h266" fill="none" stroke="#37564a" strokeWidth="2"/>
      <path d={`M54 66H${54+60*x}V121`} stroke="#60826e" strokeDasharray="4 4" fill="none"/>
      {[0,1,2,3,4].map(v=><text key={v} x={54+60*v} y="139" textAnchor="middle">{v}</text>)}<text x="36" y="70">1</text><text x="36" y="18">2</text>
      <text x="300" y="160" textAnchor="end">Лён, м (x₁)</text><text x="64" y="20">Шёлк, м (x₂)</text>
      <g style={{transform:`translate(${54+60*x}px,66px)`}}><circle r="6" fill="#be623d" stroke="white" strokeWidth="2"/><text x="11" y="-7">({x}; 1)</text></g></svg>};
}
function example(d,step){
  const t=d.type;
  if(t==='graph')return graphDemo(d,step);
  if(t==='transp'){
    const {P}=d.T,q=step?1:0,a=LU.num(P.a[0]),b=LU.num(P.b[0]);
    return {title:'Как развезти ящики дешевле?',story:`На складах ${fmt(P.sa)} ящ., магазины заказали ${fmt(P.sb)}. Магазин может получить свой заказ с нескольких складов. На разных маршрутах перевозка стоит по-разному.`,
      goal:'Решите, сколько ящиков отправить по каждому маршруту. Нужно закрыть все заказы с наименьшими затратами и уложиться в запасы складов.',
      caption:'Один ящик связывает склад и магазин',action:'Перевезти один ящик',initial:`У склада A₁ есть ${a} ящ. Магазину B₁ нужно ${b}. Отправьте один ящик и посмотрите на остатки.`,
      feedback:`На складе осталось ${a-1} ящ., магазину нужно ещё ${b-1}. В клетке A₁B₁ теперь стояла бы 1 — столько ящиков прошло по этому маршруту.`,
      visual:<Diagram from={Warehouse} to={Store} cargo={Truck} left={'На складе · '+(a-q)} right={'Ещё нужно · '+(b-q)} step={step}/>};
  }
  if(t==='netw'){
    const a=d.N.arcs[0],delay=step?2:0,days=LU.num(a.d);
    return {title:'К какому дню можно закончить проект?',story:'Представьте сборку: сначала готовят детали, затем соединяют их. Некоторые работы идут параллельно. Если следующей нужны результаты двух работ, она ждёт обе.',
      goal:'Назначить даты событий так, чтобы каждая работа успела закончиться, а весь проект завершился как можно раньше.',
      caption:`Работа ${a.i} → ${a.j} · ${days} дн.`,action:'Отложить начало на 2 дня',initial:`Если начать в день 0, эта работа закончится в день ${days}.`,
      feedback:`Длительность та же. Сдвинули начало на 2 дня — окончание тоже сдвинулось: 2 + ${days} = ${days+2}.`,
      visual:<Diagram from={Hourglass} to={Flag} cargo={Hourglass} left={'Начало · день '+delay} right={'Окончание · день '+(delay+days)} step={step}/>};
  }
  if(t==='game'){
    const r=d.G.C[0],j=step?1:0;
    return {title:'Как выбрать ход, если соперник решает сам?',story:'Два игрока одновременно выбирают ходы. Игрок A выбирает строку, игрок B — столбец. Число на пересечении — сколько получает A за счёт B. Отрицательное число означает потерю A.',
      goal:'Подобрать правило выбора ходов, которое даст игроку A наибольший гарантированный средний выигрыш даже при невыгодном ответе B.',
      caption:'Одна строка, два ответа соперника',action:'Сменить ход B',initial:`A выбрал первую строку, B — первый столбец. Результат A равен ${fmt(r[0])}.`,
      feedback:`A сохранил свой ход. B выбрал второй столбец, поэтому результат A теперь ${fmt(r[1])}.`,
      visual:<table className="opening-payoffs"><thead><tr><th>Ходы</th><th scope="col">B₁</th><th scope="col">B₂</th></tr></thead><tbody><tr><th scope="row">A₁</th>{r.slice(0,2).map((v,k)=><td key={k} data-chosen={k===j}>{k===j?'✓ ':''}{fmt(v)}</td>)}</tr></tbody></table>};
  }
  const [title,story]=explanations[t];
  if(t==='canon'){
    const bound=d.rec.canon.info.find(v=>v.kind==='ge'),v=bound.lo.add(step?1:0),symbol='x'+LU.sub(bound.j+1);
    return {title,story,goal:'Переписать условия через равенства и неотрицательные величины, сохранив тот же набор возможных планов.',action:'Добавить единицу сверх минимума',caption:'Минимум и добавка',initial:`По условию ${symbol} ≥ ${fmt(bound.lo)}. При нулевой добавке берём ровно минимум.`,feedback:`Добавка равна 1. Исходное количество ${symbol} = ${fmt(bound.lo)} + 1 = ${fmt(v)}.`,visual:<Diagram from={Boxes} to={Package} left={'Добавка · '+Number(step)} right={symbol+' = '+fmt(v)} step={step}/>};
  }
  if(t==='ilp'||t==='gomory'){
    const j=d.lpX.findIndex(v=>!v.isInt()),raw=d.lpX[j],ceil=Math.ceil(LU.num(raw)),amount=step?ceil:LU.num(raw);
    return {title,story,goal:'Выбрать целые количества, выполнить все ограничения и найти лучший результат среди таких планов.',action:'Округлить вверх',caption:'Почему важна целая единица',initial:`Без требования целочисленности расчёт дал ${fmt(raw)} изделия вида ${j+1}. Контур — целое изделие. Заливка показывает, какая его часть вошла в план.`,feedback:`После округления количество равно ${ceil}. Теперь это целое число. Хватит ли материалов для такого выпуска, проверяется отдельно.`,
      visual:<div className="opening-pieces"><CutPieces amount={amount} units={ceil}/><b>{step?ceil:fmt(raw)}</b></div>};
  }
  if(t==='dual'||t==='duality'){
    const model=d.D,j=model.c.findIndex(v=>v.s!==0),v=Q.of(step?(model.signs?.[j]==='<='?-1:1):0),c=model.c[j],symbol='y'+LU.sub(j+1);
    return {title,story,goal:t==='dual'?'Назначьте каждому условию свою оценку. Вместе они должны давать верхнюю границу выручки любого допустимого плана. Ищем самую низкую такую границу.':'Найдите допустимые выпуск и оценки с одинаковым итогом. Совпадение означает, что план достиг верхней границы и улучшить его нельзя.',
      caption:'Как одно условие меняет оценку плана',action:'Изменить одну оценку',initial:`В условии задано ${fmt(c)} единиц. Пока оценка единицы равна нулю, весь объём даёт 0 в общей сумме.`,
      feedback:`При ${symbol} = ${fmt(v)} вклад равен ${fmt(c)} × (${fmt(v)}) = ${fmt(c.mul(v))}. Остальные оценки в примере равны нулю.`,
      visual:<Diagram from={Scale} to={Coins} cargo={Coins} left={'Оценка единицы · '+fmt(v)} right={'Вклад · '+fmt(c.mul(v))} step={step}/>};
  }
  const p=d.P,r=p.rows[0],before=t==='optcheck'?d.xbar:p.c.map(()=>Q.of(0));
  // For an equality with a negative target, choose an operation that moves toward it.
  const direction=r.b.s<0?-1:1;
  const j=Math.max(0,r.a.findIndex(v=>v.s===direction)),symbol='x'+LU.sub(j+1);
  const plan=before.map((v,l)=>l===j&&step?v.add(1):v),check=ALG.check(p,plan)[0];
  const limit=r.s==='='?'ровно':r.s==='<='?'не больше':'не меньше';
  const goal=t==='artificial'?'Сначала найдите хотя бы один набор количеств, который выполняет все требования заказа. Затем можно искать самый выгодный.':t==='optcheck'?'Проверьте предложенные количества по всем требованиям. Если они подходят, выясните, даст ли другой план больший результат.':'Выберите количества, которые удовлетворяют всем условиям и дают '+(p.sense==='max'?'наибольшее':'наименьшее')+' значение цели.';
  if(t==='simplex')return {title,story,goal,caption:'Один вид изделий и один материал',action:'Выпустить одно изделие',
    initial:`На изделие первого вида нужно ${fmt(r.a[j])} ед. материала. В запасе ${fmt(r.b)}. Пока выпуск равен нулю, весь запас свободен.`,
    feedback:`После выпуска осталось ${fmt(r.b)} − ${fmt(r.a[j])} = ${fmt(r.b.sub(r.a[j]))} ед. Тот же материал потребуется и для других изделий.`,
    visual:<div className="opening-workshop"><Workshop count={Number(step)} rate={LU.num(r.a[j])} capacity={LU.num(r.b)}/></div>};
  if(t==='dsx'||t==='dsimplex'||t==='artificial'){
    const balance=r.s==='='&&r.b.s<0,unit=balance?'Баланс':'Готово';
    const start=balance?'В первом условии считают разность приходов и расходов. В конце нужен баланс '+fmt(r.b)+'. Пока движения нет, баланс равен нулю.':
      `В первом заказе требуется ${limit} ${fmt(r.b)} ед. Одна операция даёт ${fmt(r.a[j])}. Сейчас заказ ещё не начат.`;
    return {title,story,goal,caption:balance?'Приход и расход':'Одна операция в заказе',action:balance?'Записать один расход':'Выполнить одну операцию',initial:start,
      feedback:`${unit}: ${fmt(check.lhs)}. Требуется ${limit} ${fmt(r.b)}. ${check.ok?'Это требование выполнено.':'Заказ пока не готов.'} В полном плане есть ещё ${p.rows.length-1===1?'одно условие':'другие условия'}.`,
      visual:<Diagram from={Factory} to={ClipboardCheck} left={'Операций · '+Number(step)} right={unit+' · '+fmt(check.lhs)} step={step}/>};
  }
  return {title,story,goal,caption:'Одна проверка предложенного плана',action:'Увеличить '+symbol+' на единицу',
    initial:`Дан план (${before.map(fmt).join('; ')}). Первое требование разрешает результат ${limit} ${fmt(r.b)}. Подставим количества: ${r.a.map((v,l)=>'('+fmt(v)+' × '+fmt(before[l])+')').join(' + ')} = ${fmt(check.lhs)}.`,
    feedback:`Первое количество выросло на единицу. Результат проверки теперь ${fmt(check.lhs)} при пределе ${fmt(r.b)}. Остальные количества прежние.`,
    visual:<Diagram from={Factory} to={ClipboardCheck} left={symbol+' = '+fmt(plan[j])} right={fmt(check.lhs)+' '+R.sg(r.s)+' '+fmt(r.b)+(check.ok?' ✓':' ✕')} step={step}/>};
}
export function LessonOpening({data,onTry}){
  const [step,setStep]=useState(false),e=example(data,step);
  const action={transp:'Составить план перевозок',game:'Сыграть партию',netw:'Составить расписание',dual:'Попробовать свои оценки',duality:'Попробовать свои оценки'}[data.type]??'Попробовать свой план';
  return <section className="lesson-opening" aria-label="Постановка задачи"><div className="opening-story"><h2>{e.title}</h2><p>{e.story}</p><h3>Что нужно найти</h3><p>{e.goal}</p></div>
    <figure className="opening-example"><figcaption>{e.caption}</figcaption>{e.visual}
    <p aria-live="polite">{step?e.feedback:e.initial}</p><button type="button" aria-pressed={step} onClick={()=>setStep(!step)}>{step?<RotateCcw/>:<ArrowRight/>}{step?'Вернуть исходное состояние':e.action}</button></figure>
    <footer><button className="trial-primary" onClick={onTry}>{action} <ArrowRight/></button></footer></section>;
}
