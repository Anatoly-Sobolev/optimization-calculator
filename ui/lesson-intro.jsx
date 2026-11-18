import React,{useState,useEffect,useRef} from 'react';
import {Workshop,CutPieces,PayoffBalance} from './teaching-figures.jsx';
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
function Gauge({label,value,extent,caption}) {
  const ratio=Math.min(1,Math.abs(num(value))/Math.max(.000001,extent));
  return <div className="primer-gauge"><div><span>{label}</span><strong>{show(value)}</strong></div>
    <div className="primer-meter" aria-hidden="true"><i style={{width:(ratio*50)+'%',left:(num(value)<0?50-ratio*50:50)+'%',background:num(value)<0?'#be623a':'#23775d'}}/></div>
    <small>{caption}</small></div>;
}
function Dial({label,max,value,change,display=value}) {
  return <label className="primer-dial"><span>{label} <b>{display}</b></span><input type="range" min="0" max={max} value={value} onChange={e=>change(Number(e.target.value))}/></label>;
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
      <Gauge label={leave+' · значение в выбранной строке'} value={balance} extent={num(needed)} caption={balance.s<0?'Слева от нуля — столько единиц ещё не хватает.':'Ноль — требование этой строки выполнено точно.'}/>
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
      return <><Points values={d.opt}/><Choices labels={d.P.rows.map((_,i)=>'Строка '+(i+1))} selected={n} change={set}/>
        <Formula>{expression(row.a)} {R.sg(row.s)} {show(row.b)}</Formula><small>После подстановки: {show(check.lhs)} {R.sg(row.s)} {show(row.b)} · условие выполнено.</small><strong>Минимальные затраты · {show(d.f)}</strong></>;
    })
  ];
}
function transport(d) {
  const t=d.T,s=t.first.steps[0],a='Склад '+(s.i+1),b='Магазин '+(s.j+1);
  const boxes=(n,set)=><><svg className="cargo-scene" viewBox="0 0 300 76" aria-label={'В пути от склада к магазину отправлено '+n+' ящиков'} role="img">
    <path d="M6 66H294" stroke="#809985" strokeWidth="2"/>
    <g fill="#d8c19a" stroke="#4c5344" strokeWidth="2"><path d="M12 64V35l24-16 24 16v29z"/><path d="M24 64V41h24v23" fill="#f5e7c9"/><path d="M26 48h20m-20 7h20"/></g>
    <g fill="#fbedd3" stroke="#435747" strokeWidth="2"><path d="M244 64V35h43v29z"/><path d="M240 35l5-13h41l5 13z" fill="#729b70"/><path d="M251 44h11v11h-11zM269 64V44h11v20"/></g>
    <g className="cargo-truck" style={{transform:'translateX('+(75+133*n/num(s.x))+'px)'}}><path d="M0 59V44h20v15z" fill="#bb8a52"/><path d="M20 59V48h8l6 7v4z" fill="#3c765c"/><circle cx="7" cy="61" r="4" fill="#34483c"/><circle cx="27" cy="61" r="4" fill="#34483c"/></g>
    </svg><div className="primer-route"><div><b>{a} · осталось</b><strong>{num(s.a0)-n}</strong></div><span className="primer-road" aria-hidden="true">→</span><div><b>{b} · получено</b><strong>{n}</strong></div></div>
    <div className="primer-crates" aria-hidden="true">{Array.from({length:num(s.x)},(_,j)=><i key={j} className={j<n?'sent':''}/>)}</div>
    <Dial label="Отправлено ящиков" max={num(s.x)} value={n} change={set}/><small>Осталось доставить в этот магазин · {num(s.b0)-n}</small></>;
  return [
    frame('Откуда и куда везти груз','У складов есть запас, у магазинов — заказы. На всех складах '+show(t.P.sa)+' единиц груза, а общий заказ равен '+show(t.P.sb)+'. Нужно закрыть заказы и потратить на перевозку как можно меньше.',boxes),
    frame('Как заполняется одна клетка',a+' располагает '+show(s.a0)+' ящиками, а заказ магазина равен '+show(s.b0)+'. В клетке на пересечении их строки и столбца записываем число отправленных ящиков. Верхний предел этой поставки — '+show(s.x)+'.',(n,set)=><>{boxes(n,set)}<Formula>Клетка A{ s.i+1 }B{ s.j+1 } · {n} ящиков</Formula></>),
    frame('Почему одного плана мало','Даже если все заказы закрыты, маршруты могут быть дорогими. Метод меняет поставки между маршрутами, сохраняя суммы по складам и магазинам. Сравните стоимость первого и лучшего планов.',(n,set)=><><Gauge label="Общие затраты" value={n?t.cost:t.cost0} extent={num(t.cost0)} caption={'Экономия после перераспределения · '+show(t.cost0.sub(t.cost))}/><Choices labels={['Первый план','Лучший план']} selected={n} change={set}/></>)
  ];
}
function PlanMap({d,index,choose}) {
  const vertices=d.rec.graph.verts;
  const plane=useRef(null);
  useEffect(()=>GraphCamera.attach(plane.current,{},true),[d]);
  const [picked,setPicked]=useState(null);
  const point=picked||vertices[index].p;
  const maxX=Math.ceil(Math.max(1,...vertices.map(v=>num(v.p[0])))),maxY=Math.ceil(Math.max(1,...vertices.map(v=>num(v.p[1]))));
  const sx=v=>35+222*num(v)/maxX,sy=v=>149-120*num(v)/maxY;
  const cx=vertices.reduce((sum,v)=>sum+num(v.p[0]),0)/vertices.length,cy=vertices.reduce((sum,v)=>sum+num(v.p[1]),0)/vertices.length;
  const angle=v=>Math.atan2(num(v.p[1])-cy,num(v.p[0])-cx);
  const polygon=[...vertices].sort((a,b)=>angle(a)-angle(b)).map(v=>sx(v.p[0])+','+sy(v.p[1])).join(' ');
  const valid=ALG.check(d.P,point).every(row=>row.ok);
  function place(event) {
    const svg=event.currentTarget;
    const local=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const coord=(ratio,end)=>Q.of(Math.round(Math.min(1,Math.max(0,ratio))*end*10)/10);
    setPicked([coord((local.x-35)/222,maxX),coord((149-local.y)/120,maxY)]);
  }
  function movePoint(e) {
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowDown:[0,-1],ArrowUp:[0,1]}[e.key];
    if (!delta) return;
    e.preventDefault();
    setPicked(point.map((v,i)=>Q.of(Math.max(0,Math.min(i?maxY:maxX,Math.round(num(v)*10+delta[i])/10)))));
  }
  return <><svg ref={plane} className="primer-plot" tabIndex="0" onKeyDown={movePoint} viewBox="0 0 294 180" role="img" aria-label={'Координаты '+vec(point)+'. Стрелки перемещают точку.'}
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);place(e);}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)) place(e);}}>
    {[.25,.5,.75,1].map(f=><path key={f} d={'M'+sx(f*maxX)+' 29V149 M35 '+sy(f*maxY)+'H257'} fill="none" stroke="#cfdbcc"/>)}
    <path d="M35 12V149H282" className="primer-axis"/><text x="273" y="162">x₁</text><text x="10" y="18">x₂</text><text x="18" y="166">0</text>
    <text x="257" y="168" textAnchor="middle">{maxX}</text><text x="27" y="33" textAnchor="end">{maxY}</text>
    {GraphCamera.halfplanes(d.P.rows,maxX,maxY,sx,sy).map(({i,points,edge})=>{const color=['#657fc3','#ba793a','#4b916f','#c16883'][i%4];return <g key={i}>{points&&<polygon className="gh" data-i={i} points={points} fill={color} opacity=".14"/>}<polyline points={edge} fill="none" stroke={color} strokeWidth="1.2"/></g>;})}
    <polygon className="primer-region" points={polygon} fill="#b9decc" stroke="#30694f"/>
    {vertices.map((v,i)=><circle key={i} cx={sx(v.p[0])} cy={sy(v.p[1])} r="4" fill="#295e44"/>)}
    <path d={'M35 '+sy(point[1])+'H'+sx(point[0])+'V149'} fill="none" stroke="#664b35" strokeDasharray="3 3"/>
    <circle cx={sx(point[0])} cy={sy(point[1])} r="6" stroke="white" strokeWidth="2" fill={valid?'#235e44':'#a44626'}/>
    </svg><Choices labels={vertices.map(v=>vec(v.p))} selected={picked?-1:index} change={i=>{setPicked(null);choose(i);}}/>
    <Formula>{vec(point)} · {valid?'План допустим':'Нарушено условие'}</Formula><small>Значение цели в этой точке · {show(LSCENE.objValue(d.P,point))}</small></>;
}
function graph(d) {
  const vs=d.rec.graph.verts,best=vs.findIndex(v=>v.f.eq(d.f));
  const diagram=(n,set)=><PlanMap d={d} index={n} choose={set}/>;
  return [
    frame('Каждая точка — один план','По горизонтали откладываем первое количество x₁, по вертикали — второе x₂. Закрашены точки, в которых выполняются все ограничения. Перетащите точку внутрь фигуры и за её границу. Кнопки под графиком ставят точку точно в угол.',diagram),
    frame('Как сравнить два плана','Цель задаёт число для каждой точки. Подставляем обе координаты в выражение '+expression(d.P.c)+'. Среди допустимых планов ищем '+aim(d.P)+' значение.',diagram),
    frame('Где достигается лучшее значение','У линейной цели на этом многоугольнике достаточно сравнить углы. На рисунке выбран один из лучших планов. Переключитесь на соседний и сравните значения.',diagram)
  ].map((f,i)=>({...f,start:i===2?best:i===1&&vs.length>1?1:0}));
}
function simplex(d) {
  const p=d.P,snaps=d.rec.lp.phase2.steps;
  const plans=snaps.map(s=>p.c.map((_,j)=>{const k=s.basis.findIndex(v=>s.vars[v].kind==='x'&&s.vars[v].k===j+1);return k<0?zero():s.rows[k].b;}));
  const desk=(n,set)=><><Points values={plans[n]}/><Gauge label="Значение цели" value={LSCENE.objValue(p,plans[n])} extent={Math.max(1,...plans.map(v=>Math.abs(num(LSCENE.objValue(p,v)))))} caption={'Цель · '+expression(p.c)}/><Dial label="План в ходе решения" max={plans.length-1} value={n} change={set} display={(n+1)+' из '+plans.length}/></>;
  return [
    frame('Что выбираем','Представьте, что мастерская выпускает несколько видов изделий. Количество первого обозначим x₁. В первой строке каждое такое изделие расходует '+show(p.rows[0].a[0])+' единиц ресурса, а всего доступно '+show(p.rows[0].b)+'. Увеличьте выпуск и посмотрите на остаток. Здесь остальные количества равны нулю.',(n,set)=>{
      const row=p.rows[0], remainder=row.b.sub(row.a[0].mul(n));
      return <><Workshop count={n} capacity={num(row.b)} rate={num(row.a[0])}/><Points values={[row.b,row.a[0].mul(n)]} names={['Доступно','Израсходовано']}/><Gauge label="Свободный остаток" value={remainder} extent={num(row.b)} caption={remainder.s<0?'Выпуск превышает доступный запас.':'Первое ограничение выполнено.'}/><Dial label="Выпуск первого изделия" max={Math.ceil(num(row.b)/num(row.a[0]))+1} value={n} change={set}/></>;
    }),
    frame('Что меняет один шаг','Теперь учитываем все изделия и все ограничения сразу. Каждая плитка показывает количество одного изделия. Ползунок переключает допустимые планы из расчёта. Сравните, как меняется результат: здесь его нужно '+(p.sense==='max'?'увеличить':'уменьшить')+'.',desk),
    {...frame('Как прочитать ответ','Каждая плитка показывает количество одного вида в лучшем плане. Подстановка этих количеств в целевое выражение даёт '+show(d.f)+'. В подробном разборе видно, как выбрать каждый переход.',desk),start:plans.length-1}
  ];
}
function artificial(d) {
  const run=d.rec.lp.phase1.steps;
  const arts=run[0].vars.filter(v=>v.kind==='t');
  const draw=(n,set)=>{const s=run[n];const vals=arts.map(v=>{const i=s.basis.findIndex(k=>s.vars[k].kind==='t'&&s.vars[k].k===v.k);return i<0?zero():s.rows[i].b;});
    return <><Points values={vals} names={arts.map(v=>'t'+LU.sub(v.k))}/><Gauge label="Сумма временных количеств" value={vals.reduce((a,b)=>a.add(b),zero())} extent={Math.abs(num(run[0].z.b))} caption="Цель первого этапа — довести сумму до нуля."/><Dial label="Шаг поиска начального плана" max={run.length-1} value={n} change={set}/></>;};
  return [frame('Зачем нужны временные количества','Для начала расчёта нужен план, который удовлетворяет всем строкам. Пока он неизвестен, в некоторые строки временно добавляем величины t. Они заполняют недостающие количества и помогают запустить расчёт.',draw),
    frame('Что означает искусственный базис','Базис — это набор переменных, значения которых читаются из строк таблицы, когда остальные равны нулю. Искусственными называют временные t. Следите, как шаги расчёта уменьшают их общую сумму.',draw),
    {...frame('Когда можно решать исходную задачу','Сумма дошла до нуля. Все временные количества неотрицательны, поэтому каждое из них теперь равно нулю. Получен допустимый старт для исходной задачи. После оптимизации её целевое значение равно '+show(d.f)+'.',draw),start:run.length-1}];
}


function dual(d) {
  const p=d.P, dual=d.D;
  const board=(n,set)=>{
    const i=Math.floor(n/p.c.length),j=n%p.c.length;
    function matrix(rows,transposed) {
      return <div><small>{transposed?'Вторая запись':'Исходная запись'}</small><div className="primer-matrix" style={{'--columns':rows[0].a.length}}>
        {rows.map((row,k)=>row.a.map((v,l)=>{
          const sourceRow=transposed?l:k,sourceCol=transposed?k:l;
          return <button type="button" key={k+'-'+l} aria-label={(transposed?'Вторая':'Исходная')+', строка '+(k+1)+', столбец '+(l+1)+', число '+show(v)} aria-pressed={i===sourceRow&&j===sourceCol} onClick={()=>set(sourceRow*p.c.length+sourceCol)}>{show(v)}</button>;
        }))}</div></div>;
    }
    return <><div className="primer-transpose">{matrix(p.rows,false)}{matrix(dual.rows,true)}</div>
      <div className="primer-pair"><span>Строка {i+1} ↔ {y(i)}</span><span>{x(j)} ↔ условие {j+1}</span></div>
      <Formula>{show(p.rows[i].a[j])} × {x(j)} <span aria-hidden="true"> ⇄ </span> {show(dual.rows[j].a[i])} × {y(i)}</Formula>
      <small>Слева вклад в исходную строку, справа — в соответствующее двойственное условие.</small></>;
  };
  const prices=d.rec.duality;
  return [frame('Два взгляда на один план','Одну и ту же задачу можно читать двумя способами. В первой записи x — количества, а каждая строка задаёт условие. Во второй записи у каждого условия появляется своя оценка y. Сначала проследим одно число: выберите его в первой схеме и найдите выделенную ячейку во второй.',board),
    frame('Как строка превращается в столбец','Первую строку исходной схемы ставим первым столбцом второй. Вторая строка станет вторым столбцом. Так число сохраняет свою роль: оно связывает то же количество x с оценкой того же условия y.',board),
    prices?.equal?frame('Как две оценки подтверждают ответ','Лучшая оценка сверху совпала со значением исходного плана. Между ними уже нет промежутка для улучшения.',()=><><Points names={['Исходная цель','Двойственная цель']} values={[prices.L,prices.g]}/><Formula>Оценки условий · {vec(prices.y)}</Formula></>):
    frame('Из чего складывается новая цель','Правая часть каждого исходного условия умножается на его оценку. Получается выражение ниже. Построение завершается, когда записаны новая цель, условия и разрешённые знаки переменных.',()=><><Points names={dual.c.map((_,i)=>'Вес '+y(i))} values={dual.c}/><Formula>{expression(dual.c,y)} → {dual.sense==='min'?'минимум':'максимум'}</Formula></>)];
}
function canonical(d) {
  const c=d.rec.canon, row=c.state0.rows[0], bound=c.info.find(v=>v.kind==='ge'),j=bound.j;
  const material=(n,set)=><><Points values={[bound.lo,Q.of(n),bound.lo.add(n)]} names={['Обязательный минимум','Сверх минимума','Всего '+x(j)]}/><Dial label="Добавить сверх минимума" max={5} value={n} change={set}/><Formula>{x(j)} = {show(bound.lo)} + {n} = {show(bound.lo.add(n))}</Formula></>;
  const terms=r=>expression(r.terms.map(t=>t.c),k=>r.terms[k].v.replace(/\d+/g,LU.sub).replace('p','′'));
  return [frame('Как считать только добавку','В этом варианте '+x(j)+' должно быть не меньше '+show(bound.lo)+'. Удобно отделить обязательную часть и считать, сколько добавлено сверх неё. Подвигайте ползунок: исходное количество и добавка описывают один и тот же выбор.',material),
    frame('Как превратить ограничение в равенство','Первая строка задаёт верхний предел. Назовём неиспользованную часть остатком. Если к использованному количеству прибавить остаток, получится весь предел.',()=><><Formula>{terms(row)} {R.sg(row.s)} {show(row.b)}</Formula><div className="primer-arrow">↓ прибавляем остаток</div><Formula>{terms(c.steps[0].state.rows[0])} = {show(row.b)}</Formula></>),
    frame('Что получилось после записи','Канонической здесь называют запись с равенствами и неотрицательными переменными. Подстановка добавки меняет вид первой строки. По любому значению добавки можно восстановить исходное количество.',(n,set)=><><Formula>{terms(c.final.rows[0])} = {show(c.final.rows[0].b)}</Formula>{material(n,set)}</>)];
}
function integer(d) {
  const r=d.rec.gomory, j=d.lpX.findIndex(v=>!v.isInt()), raw=d.lpX[j],floor=Math.floor(num(raw)), ceil=floor+1;
  const options=[raw,Q.of(floor),Q.of(ceil)];
  const draw=(n,set)=>{
    const plan=d.lpX.map((q,i)=>i===j?options[n]:q);
    const failed=ALG.check(d.P,plan).findIndex(r=>!r.ok);
    const verdict=failed>=0?'Нарушено условие '+(failed+1)+'.':plan.every(v=>v.isInt())?'Все количества целые, условия выполнены.':'Условия выполнены, но в плане есть дробные количества.';
    return <><CutPieces amount={num(options[n])}/><svg viewBox="0 0 300 90" role="img" aria-label={'На числовой оси '+show(options[n])}><path d="M24 46H276 M55 40v12 M245 40v12" className="primer-axis"/><text x="55" y="72" textAnchor="middle">{floor}</text><text x="245" y="72" textAnchor="middle">{ceil}</text><circle cx={55+190*(num(options[n])-floor)} cy="46" r="7" fill="#b15b34"/><text x={55+190*(num(options[n])-floor)} y="26" textAnchor="middle">{show(options[n])}</text></svg>
    <Choices labels={['Без округления','Округлить вниз','Округлить вверх']} selected={n} change={set}/><small>План {vec(plan)} · {verdict}</small></>;};
  return [frame('Когда часть изделия заказать нельзя','Представьте заказ из неделимых изделий. Количества должны быть целыми. Расчёт без этого требования дал '+x(j)+' = '+show(raw)+'. На оси видно, почему этот план приходится изменить.',draw),
    frame('Почему округления недостаточно','Округляя одну координату, мы меняем весь план. Он может выйти за пределы запаса или ухудшить результат. Метод Гомори добавляет условие, которое исключает найденную дробную точку и сохраняет допустимые целые планы.',draw),
    frame('Как прочитать целый план','После добавления условий и пересчёта все количества стали целыми. Плитки показывают лучший план этого варианта.',()=><><Points values={r.x}/><Formula>Значение цели · {show(r.f)}</Formula></>)];
}
function optimality(d) {
  const v=d.verdict, p=d.P;
  const draw=(n,set)=>{const row=p.rows[n],check=v.rowCheck[n];return <><Points values={d.xbar}/><Choices labels={p.rows.map((_,i)=>'Условие '+(i+1))} selected={n} change={set}/><Formula>{expression(row.a)} {R.sg(row.s)} {show(row.b)}</Formula><Gauge label="После подстановки" value={check.lhs} extent={Math.max(1,Math.abs(num(row.b)),Math.abs(num(check.lhs)))} caption={show(check.lhs)+' '+R.sg(row.s)+' '+show(row.b)+' · '+(check.ok?'выполнено':'нарушено')}/></>;};
  return [frame('План уже предложен','Даны готовые количества '+vec(d.xbar)+'. Сначала выясняем, разрешают ли их условия. Для этого вместо каждой буквы x подставляем число с соответствующей плитки.',draw),
    frame('Что значит «допустимый»','План допустим, когда выполняются все условия и требования к знакам количеств. Выберите строку, чтобы сравнить результат подстановки с её границей.',draw),
    frame('Допустимость и лучший результат','У предложенного плана значение цели равно '+show(v.fx)+'. Условия допускают этот план. Проверка оптимальности даёт отдельный результат: '+(v.optimal?'план оптимален.':'значение цели ещё можно улучшить.')+' Подробный разбор показывает проверку по строкам.',()=><Points values={['Выполнены',v.optimal?'Да':'Нет',v.fx]} names={['Условия','План оптимален','Цель']}/>)];
}
function network(d) {
  const net=d.N,merge=net.fwd.find(e=>e.inc.length>1), path=net.paths[0];
  const draw=(n,set)=>{const branch=merge.inc[n], arc=branch.a;return <><div className="primer-branches">{merge.inc.map(({a,v},i)=><div key={a.i} className={'primer-events '+(i===n?'active':'')}><b>{a.i}</b><span>{show(a.d)} ед. времени</span><b>{a.j}</b><small>к {show(v)}</small></div>)}</div><Choices labels={merge.inc.map(({a})=>'Ход '+a.i+' → '+a.j)} selected={n} change={set}/><Formula>{show(branch.v.sub(arc.d))} + {show(arc.d)} = {show(branch.v)}</Formula><small>Начало работы + длительность = время её завершения.</small></>;};
  return [frame('Почему работы приходится ждать','Представьте сборку: начать следующий этап можно, только когда готовы все детали. Круг на схеме — момент готовности, стрелка — работа между двумя такими моментами. На стрелке указана её длительность.',draw),
    frame('Почему берём более поздний срок','В событие '+merge.e+' ведут несколько работ. Завершения одной недостаточно: нужно дождаться остальных. По очереди выберите входящие стрелки. Самая поздняя готова к моменту '+show(merge.val)+'.',draw),
    frame('Какие работы определяют срок','У выделенной цепочки нет запаса времени. Задержка любой её работы задержит весь проект. Сумма длительностей на этом критическом пути равна сроку проекта.',()=><><div className="primer-chain">{path.map(a=><span key={a.i+'-'+a.j}>{a.i} → {a.j}<b>{show(a.d)}</b></span>)}</div><Formula>{path.map(a=>show(a.d)).join(' + ')} = {show(net.T)}</Formula></>)];
}
function game(d) {
  const g=d.G;
  const board=(n,set)=>{const i=Math.floor(n/g.n),j=n%g.n;return <><PayoffBalance value={num(g.C[i][j])} limit={Math.max(...g.C.flat().map(v=>Math.abs(num(v))))}/><div className="primer-payoffs" style={{'--columns':g.n}}><b aria-hidden="true">A / B</b>{g.C[0].map((_,l)=><b key={l}>B{l+1}</b>)}{g.C.map((row,k)=><React.Fragment key={k}><b>A{k+1}</b>{row.map((val,l)=><button type="button" key={l} aria-label={'A'+(k+1)+', B'+(l+1)+', выигрыш '+show(val)} aria-pressed={i===k&&j===l} onClick={()=>set(k*g.n+l)}>{show(val)}</button>)}</React.Fragment>)}</div>
    <Formula>A{i+1} и B{j+1} · {g.C[i][j].s<0?'проигрыш':'выигрыш'} A {show(g.C[i][j].abs())}</Formula><small>Худшее для A значение в этой строке · {show(g.rowMin[i])}</small></>;};
  return [frame('Как читать результат игры','Игрок A выбирает строку, соперник B — столбец. Число на пересечении показывает выигрыш A. Отрицательное число означает потерю. Нажмите любую клетку, чтобы разыграть эту пару ходов.',board),
    frame('Что гарантирует один ход','Если A заранее выбрал строку, соперник может выбрать в ней самое маленькое число. Сравнив эти минимумы, A получает лучший гарантированный результат для постоянного хода: '+show(g.lower)+'.',board),
    frame('Зачем чередовать ходы','В этом варианте выгодно случайно выбирать строку с рассчитанными вероятностями. На плитках указаны доли ходов A. Цена игры — средний выигрыш при оптимальной игре обоих участников.',()=><><Points values={g.x} names={g.x.map((_,i)=>'Доля A'+(i+1))}/><Formula>Цена игры · {show(g.value)}</Formula></>)];
}
const stories={graph,simplex,artificial,transp:transport,dual,duality:dual,dsx:dualSimplex,dsimplex:dualSimplex,canon:canonical,ilp:integer,gomory:integer,optcheck:optimality,netw:network,game};
const parts=['Условие','Схема','Результат'];
export function LessonIntro({data,onOpen}) {
  const [page,setPage]=useState(0),[values,setValues]=useState({});
  const frames=stories[data.type](data), current=frames[page], n=values[page]??current.start??0;
  return <section className="lesson-primer" aria-label="Знакомство с вариантом">
    <div className="primer-pages" role="group" aria-label="Части наглядного примера">{parts.map((p,i)=><button type="button" key={p} aria-current={page===i?'step':undefined} onClick={()=>setPage(i)}>{i+1}. {p}</button>)}</div>
    <div className="primer-spread"><div className="primer-copy" aria-live="polite"><h2>{current.title}</h2><p>{current.copy}</p></div>
    <div className="primer-art" key={page}>{current.draw(n,v=>setValues({...values,[page]:v}))}</div></div>
    <div className="primer-nav">{page>0&&<Button variant="ghost" onPress={()=>setPage(page-1)}>← Назад</Button>}
    <Button className="primer-next" onPress={()=>page<2?setPage(page+1):onOpen()}>{['Как читать схему →','Посмотреть результат →','Открыть пошаговое решение →'][page]}</Button>
    {page<2&&<Button variant="ghost" onPress={onOpen}>Сразу к решению</Button>}</div></section>;
}
