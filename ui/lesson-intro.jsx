import {RowChecks,PartsBar,WorkSchedule} from './model-figures.jsx';
import {ShipmentMap,partialPlan} from './shipment-map.jsx';
import {ReadingDiagram} from './reading-diagram.jsx';
import {CoordinateField} from './coordinate-field.jsx';
import React,{useState} from 'react';
import {Workshop,CutPieces,PayoffBalance,MethodMark} from './teaching-figures.jsx';
import {Button} from '@heroui/react/button';

const show = LU.txt, num = LU.num, vec = LU.vec;
const x = j=>'x'+LU.sub(j+1), y = j=>'y'+LU.sub(j+1);
const aim = p=>p.sense==='max'?'наибольшее':'наименьшее';
const zero = ()=>Q.of(0);
const frame = (title,copy,draw)=>({title,copy,draw});
function expression(a,variable=x) {
  return a.reduce((s,c,j)=>{
    if (!c.s) return s;
    const sign=c.s<0?'−':s?'+':'', weight=c.abs();
    return (s+' '+sign+' '+(weight.eq(Q.of(1))?'':show(weight))+variable(j)).trim();
  },'') || '0';
}
function Formula({children}) { return <div className="primer-formula">{children}</div>; }
function Gauge({label,value,extent,caption,signed=false}) {
  const v=num(value),max=Math.max(extent,Math.abs(v),1),twoSides=signed||v<0;
  const zeroAt=twoSides?50:0,width=Math.abs(v)/max*(100-zeroAt);
  return <div className="primer-gauge"><div><span>{label}</span><strong>{show(value)}</strong></div>
    <div className="primer-meter" data-signed={twoSides} aria-hidden="true"><i style={{width:width+'%',left:(v<0?zeroAt-width:zeroAt)+'%',background:v<0?'#ac5839':'#23775d'}}/></div>
    <div className="meter-labels" aria-hidden="true"><span>{twoSides?'−'+LU.ru(max):0}</span>{twoSides&&<span>0</span>}<span>{LU.ru(max)}</span></div>
    <small>{caption}</small></div>;
}
function Dial({label,max,value,change,display=value}) {
  return <label className="primer-dial"><span>{label} <b>{display}</b></span><input type="range" min="0" max={max} disabled={max===0} value={value} onChange={e=>change(Number(e.target.value))}/></label>;
}
function Choices({labels,selected,change}) {
  return <div className="primer-choices">{labels.map((label,i)=><button type="button" key={i} aria-pressed={i===selected} onClick={()=>change(i)}>{label}</button>)}</div>;
}
function Points({values,names=values.map((_,i)=>x(i))}) {
  return <div className="primer-pieces">{values.map((v,i)=><div key={i}><small>{names[i]}</small><strong>{show(v)}</strong></div>)}</div>;
}
function dualSimplex(d) {
  const s=d.rec.dsx.steps.find(s=>s.kind==='D'), i=s.p, row=s.rows[i], a=row.a[s.q].neg();
  const initial=row.b.at(d.rec.dsx.M0), limit=initial.neg().div(a);
  const enter=x(s.vars[s.q].k-1), leave=x(s.vars[s.basis[i]].k-1);
  const needed=initial.abs();
  const scheme=(n,set)=>{
    const amount=limit.mul(n).div(10), balance=initial.add(a.mul(amount));
    return <><Formula>{leave} = {show(initial)} + {show(a)} × {show(amount)}</Formula>
      <Gauge signed label={leave+' · значение в выбранной строке'} value={balance} extent={num(needed)} caption={balance.s<0?'Слева от нуля — столько единиц ещё не хватает.':'Ноль — требование этой строки выполнено точно.'}/>
      <Dial label={'Время работы, ч · '+enter} value={n} max={10} change={set} display={show(amount)}/></>;
  };
  return [
    frame('Заказ, который пока не выполнен','Представьте заказ на '+show(needed)+' деталей. Каждая клетка — одна деталь. Станок выпускает за час '+show(a)+' шт. Время его работы обозначим '+enter+'. Включите станок на час: клетки покажут, какая часть заказа готова. В полной задаче нужно выполнить все требования с наименьшими затратами.',(n,set)=>{
      const filled=num(a)*n, target=num(needed);
      return <><div className="primer-order-title"><span>Требование строки {i+1}</span><strong>{target} ед.</strong></div>
        <div className="primer-order" aria-hidden="true">{Array.from({length:target},(_,j)=><i className={j<filled?'filled':''} key={j}/>)}</div>
        <Choices labels={['Станок выключен','Включить на час']} selected={n} change={set}/>
        <Formula>{filled} − {target} = {show(Q.of(filled-target))}</Formula><small>{filled<target?'До выполнения требования осталось '+(target-filled)+' ед.':'Требование выполнено.'} Здесь показана одна строка задачи.</small></>;
    }),
    frame('Как убрать минус из этой строки','В столбце b таблицы записан текущий остаток. Здесь это '+leave+': сколько получено сверх требования. В начале значение равно '+show(initial)+'. Передвиньте ползунок до конца: при '+enter+' = '+show(limit)+' требование этой строки выполнено точно.',scheme),
    frame('План, который выполняет все требования','На плитках — итоговые значения переменных. Выберите строку исходной задачи: вместо букв подставлены эти количества. Все строки выполнены, а затраты в этом плане минимальны.',(n,set)=>{
      const row=d.P.rows[n],check=ALG.check(d.P,d.opt)[n];
      return <><Points values={d.opt}/><RowChecks model={d.P} plan={d.opt} selected={n}/><Choices labels={d.P.rows.map((_,i)=>'Строка '+(i+1))} selected={n} change={set}/>
        <Formula>{expression(row.a)} {R.sg(row.s)} {show(row.b)}</Formula><small>После подстановки: {show(check.lhs)} {R.sg(row.s)} {show(row.b)} · условие выполнено.</small><strong>Минимальные затраты · {show(d.f)}</strong></>;
    })
  ];
}
function DeliveryLedger({model,best}){
  const [route,setRoute]=useState([0,0]),[i,j]=route;
  const matrix=best?model.X:model.X0,qty=matrix[i][j]||zero(),tariff=model.P.c[i][j];
  return <><ShipmentMap P={model.P} matrix={matrix.map(row=>row.map(v=>v?num(v):0))} i={i} j={j} onSelect={setRoute}/><div className="reading-grid route-ledger"><table><caption>Перевозки по маршрутам, ящики</caption>
    <thead><tr><th scope="col">Склад</th>{model.P.b.map((_,j)=><th key={j} scope="col">{j<model.P.n0?'B'+LU.sub(j+1):'Резерв'}</th>)}</tr></thead>
    <tbody>{matrix.map((row,i)=><tr key={i}><th scope="row">A{LU.sub(i+1)}</th>{row.map((q,j)=><td key={j}><button type="button" aria-label={'Склад '+(i+1)+', '+(j<model.P.n0?'магазин '+(j+1):'неиспользованный запас')} aria-pressed={i===route[0]&&j===route[1]} onClick={()=>setRoute([i,j])}>{show(q||zero())}</button></td>)}</tr>)}</tbody></table>
    <small>{j<model.P.n0?'Стоимость выбранного маршрута':'Затраты на перевозку резерва'} · {show(qty)} × {show(tariff)} = {show(qty.mul(tariff))}. Общие затраты складываются из стоимостей всех маршрутов.</small></div></>;
}
function transport(d,leg=0) {
  const t=d.T,s=t.first.steps[leg],P=t.P,shop=s.j<P.n0?'магазин '+(s.j+1):'резерв';
  const boxes=(n,set,{changeLeg})=><>
    <ShipmentMap P={P} matrix={partialPlan(t,leg,n)} i={s.i} j={s.j} fraction={num(s.x)?n/num(s.x):null}/>
    <div className="shipment-legs"><button type="button" disabled={!leg} onClick={()=>changeLeg(leg-1)} aria-label="Предыдущая поставка">←</button>
      <label>Поставка <select value={leg} onChange={e=>changeLeg(+e.target.value)}>{t.first.steps.map((v,k)=><option key={k} value={k}>{k+1}. A{LU.sub(v.i+1)} → {v.j<P.n0?'B'+LU.sub(v.j+1):'резерв'}</option>)}</select></label>
      <button type="button" disabled={leg===t.first.steps.length-1} onClick={()=>changeLeg(leg+1)} aria-label="Следующая поставка">→</button></div>
    <Dial key={leg} label={s.j>=P.n0?"Учтено в резерве":"Отправлено ящиков"} max={num(s.x)} value={n} change={set}/>
    <Formula>{n} ящ. × {show(P.c[s.i][s.j])} за ящик = {show(P.c[s.i][s.j].mul(n))} ед. затрат</Formula>
    <small>{!num(s.x)?'Это нулевая базисная клетка: запас или заказ уже исчерпан. Груз по этому маршруту не едет. ':''}При выборе поставки все предыдущие уже учтены полностью.</small></>;
  return [
    frame('Откуда и куда везти груз','Слева показаны все склады варианта, справа — получатели. В этом варианте складов '+P.m0+', магазинов '+P.n0+'. '+(P.fict==='col'?'Резерв обозначает неиспользованный запас. ':'')+'Общий запас равен '+show(P.sa)+', общий заказ — '+show(P.sb)+'. Передвиньте ползунок и проследите, на каком складе убывает груз и чей заказ закрывается. Затем выберите следующую поставку.',boxes),
    frame('Как заполняется одна клетка',s.j>=P.n0?'Заказы магазинов закрыты. В последнем столбце учитываем '+show(s.x)+' лишних ящ. Они остаются на складе A'+LU.sub(s.i+1)+'.':'Выбран склад '+(s.i+1)+' и '+shop+'. Перед этим рейсом на складе '+show(s.a0)+' ящ., получателю требуется '+show(s.b0)+'. В клетку на пересечении строки склада и столбца получателя можно записать до '+show(s.x)+' ящ. Переключайте поставки, чтобы собрать весь начальный план.',boxes),
    frame('Почему одного плана мало','Даже если все заказы закрыты, маршруты могут быть дорогими. Метод меняет поставки между маршрутами, сохраняя суммы по складам и магазинам. Выберите первый или лучший план. Нажмите на линию или клетку: число ящиков умножается на тариф этого маршрута.',(n,set)=><><DeliveryLedger model={t} best={n===1}/><Gauge label="Общие затраты" value={n?t.cost:t.cost0} extent={num(t.cost0)} caption={'Экономия после перераспределения · '+show(t.cost0.sub(t.cost))}/><Choices labels={['Первый план','Лучший план']} selected={n} change={set}/></>)
  ];
}
function PlanMap({d,index,choose,picked,setPicked}) {
  const vertices=d.rec.graph.verts;
  const point=picked||vertices[index].p;
  const maxX=Math.ceil(Math.max(1,...vertices.map(v=>num(v.p[0])))),maxY=Math.ceil(Math.max(1,...vertices.map(v=>num(v.p[1]))));
  const negative=point.some(v=>num(v)<0), valid=!negative&&ALG.check(d.P,point).every(row=>row.ok);
  function movePoint(e) {
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowDown:[0,-1],ArrowUp:[0,1]}[e.key];
    if (!delta) return;
    e.preventDefault();
    setPicked(point.map((v,i)=>Q.of(Math.round(num(v)*10+delta[i])/10)));
  }
  return <><CoordinateField model={d.P} maxX={maxX} maxY={maxY} region label={'Координаты '+vec(point)+'. Стрелки перемещают точку.'}
      onPlace={xy=>setPicked(xy.map(n=>Q.of(n)))} onKeyDown={movePoint}>{({sx,sy})=><>
    {vertices.map((v,i)=><circle key={i} cx={sx(v.p[0])} cy={sy(v.p[1])} r="4" fill="#295e44"/>)}
    <path d={'M'+sx(0)+' '+sy(point[1])+'H'+sx(point[0])+'V'+sy(0)} fill="none" stroke="#664b35" strokeDasharray="3 3"/>
    <circle data-plan-point="" cx={sx(point[0])} cy={sy(point[1])} r="6" stroke="white" strokeWidth="2" fill={valid?'#235e44':'#a44626'}/>
    </>}</CoordinateField><Choices labels={vertices.map(v=>vec(v.p))} selected={picked?-1:index} change={i=>{setPicked(null);choose(i);}}/>
    <RowChecks model={d.P} plan={point}/><Formula>{vec(point)} · {valid?'План допустим':negative?'Количество должно быть неотрицательным':'Нарушено условие'}</Formula><small>Значение цели в этой точке · {show(LSCENE.objValue(d.P,point))}</small></>;
}
function graph(d) {
  const vs=d.rec.graph.verts,best=vs.findIndex(v=>v.f.eq(d.f));
  const diagram=(n,set,probe)=><PlanMap d={d} index={n} choose={set} {...probe}/>;
  return [
    frame('Каждая точка — один план','По горизонтали откладываем первое количество x₁, по вертикали — второе x₂. Каждая цветная полуплоскость показывает, где выполнено одно условие. Зелёный многоугольник — их общая допустимая область. Перетащите точку внутрь фигуры и за её границу. Кнопки под графиком ставят точку точно в угол.',diagram),
    frame('Как сравнить два плана','Цель задаёт число для каждой точки. Подставляем обе координаты в выражение '+expression(d.P.c)+'. Среди допустимых планов ищем '+aim(d.P)+' значение.',diagram),
    frame('Где достигается лучшее значение','У линейной цели на этом многоугольнике достаточно сравнить углы. На рисунке выбран один из лучших планов. Переключитесь на соседний и сравните значения.',diagram)
  ].map((f,i)=>({...f,start:i===2?best:i===1&&vs.length>1?1:0}));
}
function simplex(d) {
  const p=d.P,snaps=d.rec.lp.phase2.steps;
  const plans=snaps.map(s=>p.c.map((_,j)=>{const k=s.basis.findIndex(v=>s.vars[v].kind==='x'&&s.vars[v].k===j+1);return k<0?zero():s.rows[k].b;}));
  const desk=(n,set)=><><Points values={plans[n]}/><RowChecks model={p} plan={plans[n]}/><Gauge signed={plans.some(v=>LSCENE.objValue(p,v).s<0)} label="Значение цели" value={LSCENE.objValue(p,plans[n])} extent={Math.max(1,...plans.map(v=>Math.abs(num(LSCENE.objValue(p,v)))))} caption={'Цель · '+expression(p.c)+(n?' · изменение за шаг: '+show(LSCENE.objValue(p,plans[n]).sub(LSCENE.objValue(p,plans[n-1]))):' · начальный план')}/><Dial label="План в ходе решения" max={plans.length-1} value={n} change={set} display={(n+1)+' из '+plans.length}/></>;
  return [
    frame('Что выбираем','Представьте, что мастерская выпускает несколько видов изделий. Количество первого обозначим x₁. В первой строке каждое такое изделие расходует '+show(p.rows[0].a[0])+' единиц ресурса, а всего доступно '+show(p.rows[0].b)+'. Увеличьте выпуск и посмотрите на остаток. Здесь остальные количества равны нулю.',(n,set)=>{
      const row=p.rows[0], remainder=row.b.sub(row.a[0].mul(n));
      return <><Workshop count={n} capacity={num(row.b)} rate={num(row.a[0])}/><RowChecks model={p} plan={p.c.map((_,j)=>Q.of(j===0?n:0))}/><Gauge signed label="Свободный остаток" value={remainder} extent={num(row.b)} caption={remainder.s<0?'Выпуск превышает доступный запас.':'Первое ограничение выполнено.'}/><Dial label="Выпуск первого изделия" max={Math.ceil(num(row.b)/num(row.a[0]))+1} value={n} change={set}/></>;
    }),
    frame('Что меняет один шаг','Теперь учитываем все изделия и все ограничения сразу. Каждая плитка показывает количество одного изделия. Ползунок переключает допустимые планы из расчёта. Сравните, как меняется результат: здесь его нужно '+(p.sense==='max'?'увеличить':'уменьшить')+'.',desk),
    {...frame('Как прочитать ответ','Каждая плитка показывает количество одного вида в лучшем плане. Подстановка этих количеств в целевое выражение даёт '+show(d.f)+'. В подробном разборе видно, как выбрать каждый переход.',desk),start:plans.length-1}
  ];
}
function artificial(d) {
  const run=d.rec.lp.phase1.steps;
  const arts=run[0].vars.filter(v=>v.kind==='t');
  const draw=(n,set)=>{const s=run[n];const vals=arts.map(v=>{const i=s.basis.findIndex(k=>s.vars[k].kind==='t'&&s.vars[k].k===v.k);return i<0?zero():s.rows[i].b;});
    return <><PartsBar label="Какие строки ещё требуют временных переменных" total={run[0].z.b.abs()} parts={arts.map((v,i)=>['Строка '+(v.row+1)+' · t'+LU.sub(v.k),vals[i]])}/><Gauge label="Сумма временных количеств" value={vals.reduce((a,b)=>a.add(b),zero())} extent={Math.abs(num(run[0].z.b))} caption="Цель первого этапа — довести сумму до нуля."/><Dial label="Шаг поиска начального плана" max={run.length-1} value={n} change={set}/></>;};
  return [frame('Зачем нужны временные количества','Для начала расчёта нужен план, который удовлетворяет всем строкам. Пока он неизвестен, в некоторые строки временно добавляем величины t. Они заполняют недостающие количества и помогают запустить расчёт.',draw),
    frame('Что означает искусственный базис','Базис — это набор переменных, значения которых читаются из строк таблицы, когда остальные равны нулю. Искусственными называют временные t. Следите, как шаги расчёта уменьшают их общую сумму.',draw),
    {...frame('Когда можно решать исходную задачу','Когда сумма равна нулю, каждое временное количество тоже равно нулю: все они неотрицательны. Получен допустимый старт для исходной задачи. После оптимизации её целевое значение равно '+show(d.f)+'.',draw),start:run.length-1}];
}


function dual(d) {
  const p=d.P, dual=d.D;
  const board=(n,set)=>{
    const i=Math.floor(n/p.c.length),j=n%p.c.length;
    function matrix(rows,transposed) {
      return <div className="reading-grid route-ledger"><table><caption>{transposed?'Двойственная задача':'Прямая задача'}</caption><thead><tr><th scope="col">№</th>{rows[0].a.map((_,l)=><th key={l} scope="col">{transposed?y(l):x(l)}</th>)}</tr></thead>
        <tbody>{rows.map((row,k)=><tr key={k}><th scope="row">{k+1}</th>{row.a.map((v,l)=>{
          const sourceRow=transposed?l:k,sourceCol=transposed?k:l;
          return <td key={l}><button type="button" aria-label={(transposed?'Вторая':'Исходная')+', строка '+(k+1)+', столбец '+(l+1)+', число '+show(v)} aria-pressed={i===sourceRow&&j===sourceCol} onClick={()=>set(sourceRow*p.c.length+sourceCol)}>{show(v)}</button></td>;
        })}</tr>)}</tbody></table></div>;
    }
    return <><div className="primer-transpose">{matrix(p.rows,false)}{matrix(dual.rows,true)}</div>
      <div className="primer-pair"><span>Строка {i+1} ↔ {y(i)}</span><span>{x(j)} ↔ условие {j+1}</span></div>
      <Formula>{show(p.rows[i].a[j])} × {x(j)} <span aria-hidden="true"> ⇄ </span> {show(dual.rows[j].a[i])} × {y(i)}</Formula>
      <small>Из строки {i+1} исходной задачи</small><Formula>{expression(p.rows[i].a)} {R.sg(p.rows[i].s)} {show(p.rows[i].b)}</Formula>
      <small>В условие {j+1} двойственной задачи</small><Formula>{expression(dual.rows[j].a,y)} {R.sg(dual.rows[j].s)} {show(dual.rows[j].b)}</Formula></>;
  };
  const prices=d.rec.duality;
  return [frame('Два взгляда на один план','Одну и ту же задачу можно читать двумя способами. В первой записи x — количества, а каждая строка задаёт условие. Во второй записи у каждого условия появляется своя оценка y. Сначала проследим одно число: выберите его в первой схеме и найдите выделенную ячейку во второй.',board),
    frame('Как строка превращается в столбец','Первую строку исходной схемы ставим первым столбцом второй. Вторая строка станет вторым столбцом. Так число сохраняет свою роль: оно связывает то же количество x с оценкой того же условия y.',board),
    prices?.equal?frame('Как две оценки подтверждают ответ','Лучшая оценка сверху совпала со значением исходного плана. Между ними уже нет промежутка для улучшения.',()=><><Points names={['Исходная цель','Двойственная цель']} values={[prices.L,prices.g]}/><Formula>Оценки условий · {vec(prices.y)}</Formula></>):
    frame('Из чего складывается новая цель','Правая часть каждого исходного условия умножается на его оценку. Получается выражение ниже. Построение завершается, когда записаны новая цель, условия и разрешённые знаки переменных.',()=><><Points names={dual.c.map((_,i)=>'Вес '+y(i))} values={dual.c}/><Formula>{expression(dual.c,y)} → {dual.sense==='min'?'минимум':'максимум'}</Formula></>)];
}
function canonical(d) {
  const c=d.rec.canon, row=c.state0.rows[0], bound=c.info.find(v=>v.kind==='ge'),j=bound.j;
  const material=(n,set)=><><PartsBar label={'Количество '+x(j)+' = '+show(bound.lo.add(n))} total={bound.lo.add(5)} parts={[['Обязательный минимум',bound.lo],['Сверх минимума',n]]}/><Dial label="Добавить сверх минимума" max={5} value={n} change={set}/><Formula>{x(j)} = {show(bound.lo)} + {n} = {show(bound.lo.add(n))}</Formula></>;
  const terms=r=>expression(r.terms.map(t=>t.c),k=>r.terms[k].v.replace(/\d+/g,LU.sub).replace('p','′'));
  return [frame('Как считать только добавку','В этом варианте '+x(j)+' должно быть не меньше '+show(bound.lo)+'. Удобно отделить обязательную часть и считать, сколько добавлено сверх неё. Подвигайте ползунок: исходное количество и добавка описывают один и тот же выбор.',material),
    frame('Как превратить ограничение в равенство','Первая строка задаёт верхний предел. Назовём неиспользованную часть остатком. Если к использованному количеству прибавить остаток, получится весь предел. Ползунок задаёт долю использованного ресурса в этой строке.',(n,set)=><><Formula>{terms(row)} {R.sg(row.s)} {show(row.b)}</Formula><PartsBar label={'Весь ресурс строки · '+show(row.b)} total={row.b} parts={[['Расход',row.b.mul(n).div(4)],['Остаток',row.b.mul(4-n).div(4)]]}/><Formula>{terms(c.steps[0].state.rows[0])} = {show(row.b)}</Formula><Dial label="Доля использованного ресурса" max={4} value={n} change={set} display={n*25+' %'}/></>),
    frame('Что получилось после записи','Канонической здесь называют запись с равенствами и неотрицательными переменными. Подстановка добавки меняет вид первой строки. По любому значению добавки можно восстановить исходное количество.',(n,set)=><><Formula>{terms(c.final.rows[0])} = {show(c.final.rows[0].b)}</Formula>{material(n,set)}</>)];
}
function integer(d) {
  const r=d.rec.gomory, j=d.lpX.findIndex(v=>!v.isInt()), raw=d.lpX[j],floor=Math.floor(num(raw)), ceil=floor+1;
  const options=[raw,Q.of(floor),Q.of(ceil)];
  const draw=(n,set)=>{
    const plan=d.lpX.map((q,i)=>i===j?options[n]:q);
    const failed=ALG.check(d.P,plan).findIndex(r=>!r.ok);
    const verdict=failed>=0?'Нарушено условие '+(failed+1)+'.':plan.every(v=>v.isInt())?'Все количества целые, условия выполнены.':'Условия выполнены, но в плане есть дробные количества.';
    return <><CutPieces amount={num(options[n])} units={ceil}/><svg viewBox="0 0 300 90" role="img" aria-label={'На числовой оси '+show(options[n])}><path d="M24 46H276 M55 40v12 M245 40v12" className="primer-axis"/><text x="55" y="72" textAnchor="middle">{floor}</text><text x="245" y="72" textAnchor="middle">{ceil}</text><circle cx={55+190*(num(options[n])-floor)} cy="46" r="7" fill="#b15b34"/><text x={55+190*(num(options[n])-floor)} y="26" textAnchor="middle">{show(options[n])}</text></svg>
    <Choices labels={['Без округления','Округлить вниз','Округлить вверх']} selected={n} change={set}/><small>План {vec(plan)} · {verdict}</small><RowChecks model={d.P} plan={plan}/></>;};
  return [frame('Когда часть изделия заказать нельзя','Представьте заказ из неделимых изделий. Количества должны быть целыми. Расчёт без этого требования дал '+x(j)+' = '+show(raw)+'. На оси видно, почему этот план приходится изменить.',draw),
    frame('Почему округления недостаточно','Проверьте на оси, что случится при округлении. Метод Гомори использует дробную часть числа из таблицы, чтобы добавить ограничение. Оно исключает текущий дробный план и сохраняет допустимые целые планы.',draw),
    frame('Как прочитать целый план','После добавления условий и пересчёта все количества стали целыми. Плитки показывают лучший план этого варианта.',()=><><Points values={r.x}/><RowChecks model={d.P} plan={r.x}/><Formula>Значение цели · {show(r.f)}</Formula></>)];
}
function optimality(d) {
  const v=d.verdict, p=d.P;
  const draw=(n,set)=>{const row=p.rows[n],check=v.rowCheck[n];return <><Points values={d.xbar}/><RowChecks model={p} plan={d.xbar} selected={n}/><Choices labels={p.rows.map((_,i)=>'Условие '+(i+1))} selected={n} change={set}/><Formula>{expression(row.a)} {R.sg(row.s)} {show(row.b)}</Formula><Gauge label="После подстановки" value={check.lhs} extent={Math.max(1,Math.abs(num(row.b)),Math.abs(num(check.lhs)))} caption={show(check.lhs)+' '+R.sg(row.s)+' '+show(row.b)+' · '+(check.ok?'выполнено':'нарушено')}/></>;};
  return [frame('План уже предложен','Даны готовые количества '+vec(d.xbar)+'. Сначала выясняем, разрешают ли их условия. Для этого вместо каждой буквы x подставляем число с соответствующей плитки.',draw),
    frame('Что значит «допустимый»','План допустим, когда выполняются все условия и требования к знакам количеств. Выберите строку, чтобы сравнить результат подстановки с её границей.',draw),
    frame('Допустимость и лучший результат','У предложенного плана значение цели равно '+show(v.fx)+'. Условия допускают этот план. Проверка оптимальности даёт отдельный результат: '+(v.optimal?'план оптимален.':'значение цели ещё можно улучшить.')+' Подробный разбор показывает проверку по строкам.',()=><Points values={['Выполнены',v.optimal?'Да':'Нет',v.fx]} names={['Условия','План оптимален','Цель']}/>)];
}
function network(d) {
  const net=d.N,merge=net.fwd.find(e=>e.inc.length>1), path=net.paths[0];
  const draw=(n,set)=>{const branch=merge.inc[n],arc=branch.a,h=Math.max(100,merge.inc.length*46),end=h/2;
    return <><strong>Входящие работы события {merge.e}</strong><svg className="merge-diagram" viewBox={'0 0 300 '+h} role="img" aria-label={'В событие '+merge.e+' ведут работы '+merge.inc.map(({a})=>a.i+' → '+a.j).join(', ')}>
      {merge.inc.map(({a},i)=>{const top=(i+.5)*h/merge.inc.length,col=i===n?'#21664c':'#91a69b';return <g key={a.i}>
        <path d={'M49 '+top+' C130 '+top+' 168 '+end+' 235 '+end} fill="none" stroke={col} strokeWidth={i===n?3:1.4}/>
        <path d={'M230 '+(end-4)+'l8 4-8 4'} fill={col}/>
        <circle cx="34" cy={top} r="15" fill="#fdfaf0" stroke={col} strokeWidth="2"/><text x="34" y={top+4} textAnchor="middle">{a.i}</text>
        <rect x="77" y={top-11} width="45" height="19" rx="6" fill="#fffdf7" stroke={col}/><text x="99" y={top+3} textAnchor="middle">{show(a.d)}</text></g>;})}
      <circle cx="257" cy={end} r="19" fill="#21664c"/><text x="257" y={end+4} textAnchor="middle" style={{fill:'white'}}>{merge.e}</text></svg>
      <Choices labels={merge.inc.map(({a})=>'Работа '+a.i+' → '+a.j)} selected={n} change={set}/><Formula>{show(branch.v.sub(arc.d))} + {show(arc.d)} = {show(branch.v)}</Formula><small>Начало выбранной работы + длительность = время её завершения.</small><WorkSchedule net={net} selected={arc}/></>;};
  return [frame('Почему работы приходится ждать','Представьте сборку: начать следующий этап можно, только когда готовы все детали. Круг на схеме — момент готовности, стрелка — работа между двумя такими моментами. На стрелке указана её длительность.',draw),
    frame('Почему берём более поздний срок','В событие '+merge.e+' ведут несколько работ. Завершения одной недостаточно: нужно дождаться остальных. По очереди выберите входящие стрелки. Самая поздняя готова к моменту '+show(merge.val)+'.',draw),
    frame('Какие работы определяют срок','У выделенной цепочки нет запаса времени. Задержка любой её работы задержит весь проект. Сумма длительностей на этом критическом пути равна сроку проекта.',()=><><WorkSchedule net={net} critical/><div className="primer-chain">{path.map(a=><span key={a.i+'-'+a.j}>{a.i} → {a.j}<b>{show(a.d)}</b></span>)}</div><Formula>{path.map(a=>show(a.d)).join(' + ')} = {show(net.T)}</Formula></>)];
}
function game(d) {
  const g=d.G;
  const board=(n,set)=>{const i=Math.floor(n/g.n),j=n%g.n;return <><PayoffBalance value={num(g.C[i][j])} limit={Math.max(...g.C.flat().map(v=>Math.abs(num(v))))}/><div className="primer-payoffs" style={{'--columns':g.n}}><b aria-hidden="true">A / B</b>{g.C[0].map((_,l)=><b key={l}>B{l+1}</b>)}{g.C.map((row,k)=><React.Fragment key={k}><b>A{k+1}</b>{row.map((val,l)=><button type="button" key={l} aria-label={'A'+(k+1)+', B'+(l+1)+', выигрыш '+show(val)} aria-pressed={i===k&&j===l} onClick={()=>set(k*g.n+l)}>{show(val)}</button>)}</React.Fragment>)}</div>
    <Formula>A{i+1} и B{j+1} · {g.C[i][j].s<0?'проигрыш':'выигрыш'} A {show(g.C[i][j].abs())}</Formula><small>Худшее для A значение в этой строке · {show(g.rowMin[i])}</small></>;};
  return [frame('Как читать результат игры','Игрок A выбирает строку, соперник B — столбец. Число на пересечении показывает выигрыш A. Отрицательное число означает потерю. Нажмите любую клетку, чтобы разыграть эту пару ходов.',board),
    frame('Что гарантирует один ход','Если A заранее выбрал строку, соперник может выбрать в ней самое маленькое число. Сравнив эти минимумы, A получает лучший гарантированный результат для постоянного хода: '+show(g.lower)+'.',board),
    frame('Зачем чередовать ходы','В этом варианте выгодно случайно выбирать строку с рассчитанными вероятностями. Доли ходов каждого игрока в сумме дают единицу. Цена игры — средний выигрыш при оптимальной игре обоих участников.',()=><><PartsBar label="Как часто игрок A выбирает строки" total={1} parts={g.x.map((v,i)=>['A'+LU.sub(i+1),v])}/><PartsBar label="Как часто игрок B выбирает столбцы" total={1} parts={g.y.map((v,j)=>['B'+LU.sub(j+1),v])}/><Formula>Цена игры · {show(g.value)}</Formula></>)];
}
const stories={graph,simplex,artificial,transp:transport,dual,duality:dual,dsx:dualSimplex,dsimplex:dualSimplex,canon:canonical,ilp:integer,gomory:integer,optcheck:optimality,netw:network,game};
function IntroLegend({data:d}){
  let entries;
  switch(d.type){
    case 'transp': {
      entries=[['A','склады в этом варианте · '+d.T.P.m0],['B','магазины в этом варианте · '+d.T.P.n0]];
      break;
    }
    case 'graph': entries=[['x₁','количество по горизонтали'],['x₂','количество по вертикали']];break;
    case 'simplex': entries=[['x₁','выпуск первого изделия'],['Остаток','доступный ресурс за вычетом расхода']];break;
    case 'artificial': entries=[['t','временное количество в одной строке'],['h','сумма всех временных количеств']];break;
    case 'dual': case 'duality': entries=[['x','количества в исходном плане'],['y','оценки условий этого плана']];break;
    case 'dsx': case 'dsimplex': entries=[['Клетка','одна требуемая деталь'],['Минус','деталей пока меньше, чем требуется']];break;
    case 'canon': entries=[['Минимум','количество, обязательное по условию'],['Добавка','сколько берём сверх минимума']];break;
    case 'ilp': case 'gomory': entries=[['Целая часть','число полных изделий'],['Дробная часть','доля следующего изделия']];break;
    case 'optcheck': entries=[['План','предложенные количества'],['Условие','граница, с которой сравнивают расход или выпуск']];break;
    case 'netw': entries=[['Круг','событие, когда предшествующие работы готовы'],['Стрелка','работа, число на ней — длительность']];break;
    case 'game': entries=[['A','выбирает строку'],['B','выбирает столбец']];break;
  }
  return <dl className="intro-key">{entries.map(([label,meaning])=><div key={label}><dt>{label}</dt><dd>{meaning}</dd></div>)}</dl>;
}
const parts=['Условие','Схема','Результат'];
export function LessonIntro({data,onOpen}) {
  const [page,setPage]=useState(()=>new URLSearchParams(location.search).get('part')==='scheme'?1:0),[values,setValues]=useState({});
  const [picked,setPicked]=useState(null);
  function openPage(i){setPicked(null);setPage(i);}
  function choose(v){setValues(prev=>({...prev,[page]:v}));}
  const [legs,setLegs]=useState({}),leg=legs[page]??0;
  function changeLeg(next){setLegs(prev=>({...prev,[page]:next}));choose(0);}
  const frames=stories[data.type](data,leg), current=frames[page], n=values[page]??current.start??0;
  return <section className="lesson-primer" aria-label="Знакомство с вариантом">
    <div className="primer-pages" role="group" aria-label="Части наглядного примера">{parts.map((p,i)=><button type="button" key={p} aria-current={page===i?'step':undefined} onClick={()=>openPage(i)}><MethodMark type={['brief',data.type,'optcheck'][i]}/>{i+1}. {p}</button>)}</div>
    <div className={'primer-spread'+(page===1?' with-reading':'')}><div className="primer-copy"><h2>{current.title}</h2><p>{current.copy}</p>
      {page===0&&<IntroLegend data={data}/>}
      {page===1&&<ReadingDiagram key={leg} leg={leg} data={data} value={n} choose={choose} point={picked}/>}</div>
    <div className="primer-art" key={page}>{current.draw(n,choose,{picked,setPicked,changeLeg})}</div></div>
    <div className="primer-nav">{page>0&&<Button variant="ghost" onPress={()=>openPage(page-1)}>← Назад</Button>}
    <Button className="primer-next" onPress={()=>page<2?openPage(page+1):onOpen()}>{['Как читать схему →','Посмотреть результат →','Открыть пошаговое решение →'][page]}</Button>
    {page<2&&<Button variant="ghost" onPress={onOpen}>Сразу к решению</Button>}</div></section>;
}
