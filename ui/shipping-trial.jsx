import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Truck,RotateCcw,Package,Wallet,Check,Undo2} from 'lucide-react';
import {makeTown,DeliveryTown} from './delivery-town.jsx';

const sum=values=>values.reduce((a,b)=>a+b,0);
const sub=LU.sub;
const emptyPlan=(m,n)=>Array.from({length:m},()=>Array(n).fill(''));
function loadPlan(key,m,n){
  try{
    const saved=JSON.parse(localStorage.getItem(key));
    if(Array.isArray(saved?.cells)&&saved.cells.length===m&&saved.cells.every(row=>
      Array.isArray(row)&&row.length===n&&row.every(v=>typeof v==='string'&&v.length<=7))){
      return {cells:saved.cells,pricing:saved.pricing==='variant'?'variant':'km'};
    }
  }catch{/* Local storage may be unavailable in private browsing. */}
  return {cells:emptyPlan(m,n),pricing:'km'};
}
const quantity=v=>/^\d{1,7}$/.test(v)?Number(v):0;

export function ShippingTrial({data}){
  const {P}=data.T;
  const m=P.m0,n=P.n0;
  const supply=P.a.slice(0,m).map(LU.num),demand=P.b.slice(0,n).map(LU.num);
  const town=useMemo(()=>makeTown(m,n),[m,n]);
  const distancePlan=useMemo(()=>ALGT.solve({a:P.a.slice(0,m),b:P.b.slice(0,n),c:town.km}),[P,town,m,n]);
  const storageKey='shipping-plan.v1.'+JSON.stringify([data.state.src,data.variant.v,supply,demand,P.c.map(r=>r.map(LU.txt))]);
  const [draft,setDraft]=useState(()=>loadPlan(storageKey,m,n));
  const [saved,setSaved]=useState(false);
  const [previous,setPrevious]=useState(null);
  const [[i,j],select]=useState([0,0]);
  const [run,setRun]=useState(null),[elapsed,setElapsed]=useState(0);
  const [records,setRecords]=useState({});
  const sequence=useRef(0),inputs=useRef([]);
  const {cells,pricing}=draft,prices=pricing==='km'?distancePlan:data.T;
  useEffect(()=>{
    try{localStorage.setItem(storageKey,JSON.stringify(draft));setSaved(true);}
    catch{setSaved(false);}
  },[draft,storageKey]);

  const counts=cells.map(row=>row.map(quantity)),used=counts.map(sum);
  const received=demand.map((_,l)=>sum(counts.map(row=>row[l])));
  const trips=counts.flatMap((row,k)=>row.flatMap((q,l)=>q?[{i:k,j:l,q,km:town.km[k][l],cost:prices.P.c[k][l].mul(q),duration:1000+145*town.km[k][l]}]:[]));
  const totalCost=trips.reduce((s,t)=>s.add(t.cost),Q.of(0)),boxes=sum(used),requested=sum(demand);
  const stock=supply.map((v,k)=>v-used[k]),need=demand.map((v,l)=>v-received[l]);
  const badEntry=cells.some(row=>row.some(v=>v!==''&&!/^\d{1,7}$/.test(v)));
  const overStock=stock.findIndex(v=>v<0),overOrder=need.findIndex(v=>v<0);
  let error='';
  if(badEntry)error='В выделенной клетке укажите целое число ящиков от нуля.';
  else if(overStock>=0)error='Со склада '+(overStock+1)+' назначено на '+(-stock[overStock])+' ящ. больше запаса. Уменьшите число в этой строке.';
  else if(overOrder>=0)error='Магазину '+(overOrder+1)+' назначено на '+(-need[overOrder])+' ящ. больше заказа. Уменьшите число в этом столбце.';
  const finished=!!run&&elapsed>=run.end,running=!!run&&!finished;
  const arrivals=run?.trips.filter(t=>elapsed>=t.duration)??[];
  const delivered=sum(arrivals.map(t=>t.q));
  const spent=arrivals.reduce((s,t)=>s.add(t.cost),Q.of(0));
  const missing=requested-boxes;
  const optimal=missing===0&&prices.status==='optimal'&&totalCost.eq(prices.cost);
  useEffect(()=>{
    if(!run)return;
    const timers=[...new Set(run.trips.map(t=>t.duration))].map(duration=>
      setTimeout(()=>setElapsed(duration),duration));
    return ()=>timers.forEach(clearTimeout);
  },[run]);
  useEffect(()=>{
    if(finished&&missing===0)setRecords(r=>r[pricing]&&r[pricing].le(totalCost)?r:{...r,[pricing]:totalCost});
  },[finished,missing,pricing,totalCost.toText()]);
  function edit(k,l,value){
    setRun(null);setPrevious(null);
    setDraft(d=>({...d,cells:d.cells.map((row,a)=>a===k?row.map((old,b)=>b===l?value:old):row)}));
  }
  function choose(k,l){
    select([k,l]);
    inputs.current[k*n+l]?.focus({preventScroll:true});
  }
  function launch(){
    if(error||!trips.length||running)return;
    const fast=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fleet=trips.map(t=>({...t,duration:fast?0:t.duration}));
    setElapsed(0);setRun({id:++sequence.current,trips:fleet,end:Math.max(...fleet.map(t=>t.duration))});
  }
  const limit=Math.max(0,Math.min(stock[i],need[j])+counts[i][j]);
  const unit=prices.P.c[i][j];
  return <section className="freight-sim" aria-label="Симулятор перевозок">
    <header className="freight-header"><div><h2>Распределите ящики по магазинам</h2>
      <p>Строки — склады A, столбцы — магазины B. Введите число ящиков для каждой машины.</p></div>
      <label>Тариф<select aria-label="Тариф" value={pricing} disabled={running} onChange={e=>{setRun(null);setDraft({...draft,pricing:e.target.value});}}>
        <option value="km">По расстоянию</option><option value="variant">Из условия задачи</option></select></label></header>
    <div className="freight-work"><section className="freight-sheet"><h3>План отгрузки <span>ящики</span></h3>
      <table className="dispatch-matrix"><colgroup><col className="depot-col"/>{demand.map((_,l)=><col key={l}/>)}<col className="stock-col"/></colgroup>
        <thead><tr><th scope="col">Склад</th>{demand.map((_,l)=><th scope="col" key={l}><span className="market-word">Маг. </span>B{sub(l+1)}</th>)}<th scope="col">Запас</th></tr></thead>
        <tbody>{cells.map((row,k)=><tr key={k}><th scope="row"><i style={{background:town.colors[k]}}/>A{sub(k+1)}</th>
          {row.map((v,l)=><td key={l}><input ref={el=>{inputs.current[k*n+l]=el;}} aria-label={'Склад '+(k+1)+', магазин '+(l+1)} type="text" inputMode="numeric" autoComplete="off" maxLength={7} disabled={running} value={v} placeholder="0"
            data-active={k===i&&l===j} data-filled={quantity(v)>0} aria-invalid={(v!==''&&!/^\d{1,7}$/.test(v))||((stock[k]<0||need[l]<0)&&quantity(v)>0)}
            onFocus={e=>{select([k,l]);e.target.select();}} onChange={e=>edit(k,l,e.target.value)}/></td>)}
          <td className="capacity" data-invalid={stock[k]<0}>{used[k]}<small> / {supply[k]}</small></td></tr>)}</tbody>
        <tfoot><tr><th scope="row">Заказ</th>{demand.map((v,l)=><td key={l} data-invalid={need[l]<0}>{received[l]}<small> / {v}</small></td>)}<td/></tr></tfoot>
      </table><p className="freight-key">В итогах первое число — ваш план, второе — запас склада или заказ магазина.</p>
      <div className="route-inspector"><div><strong>Склад {i+1} → магазин {j+1}</strong>
        <span>{town.km[i][j]} км · {counts[i][j]} ящ. × {LU.txt(unit)} ед. = {LU.txt(unit.mul(counts[i][j]))} ед.</span></div>
        <button type="button" disabled={running||!limit||counts[i][j]===limit} onClick={()=>edit(i,j,String(limit))}>Взять максимум · {limit}</button>
      </div>
      <div className="draft-actions"><small>{saved?'План сохранён в этом браузере':'План хранится до закрытия страницы'}</small>
      {previous?<button disabled={running} onClick={()=>{setRun(null);setDraft({...draft,cells:previous});setPrevious(null);}}><Undo2/>Вернуть план</button>:
        <button disabled={running||!cells.some(row=>row.some(Boolean))} onClick={()=>{setPrevious(cells);setRun(null);setDraft({...draft,cells:emptyPlan(m,n)});}}><RotateCcw/>Очистить</button>}</div>
    </section><div className="freight-geography"><DeliveryTown town={town} supply={supply} demand={demand} stock={run?supply.map((s,k)=>s-sum(run.trips.filter(t=>t.i===k).map(t=>t.q))):stock}
      need={run?demand.map((b,l)=>b-sum(arrivals.filter(t=>t.j===l).map(t=>t.q))):need} i={i} j={j} select={choose} locked={running} trips={trips} run={run} elapsed={elapsed}/>
      <p className="freight-key">{pricing==='km'?'Квартал — 1 км. Перевозка одного ящика на 1 км стоит 1 ед.':'Каждый ящик оплачивается по тарифу маршрута из задания.'} Число над машиной — ящики в кузове.</p></div></div>
    <div className="freight-console"><dl>
      <div><dt><Truck/>{run?'Прибыло машин':'Машины'}</dt><dd>{run?arrivals.length+' / ':''}{trips.length}</dd></div>
      <div><dt><Package/>{run?'Доставлено':'Назначено'}</dt><dd>{run?delivered:boxes} <small>/ {requested} ящ.</small></dd></div>
      <div><dt><Wallet/>{running?'Затраты / план':'Затраты'}</dt><dd>{LU.txt(run?spent:totalCost)} <small>{running?'/ '+LU.txt(totalCost)+' ':''}ед.</small></dd></div></dl>
      <button className="trial-primary launch-fleet" disabled={running||!!error||!trips.length} onClick={launch}><Truck/>{running?'Машины в пути':finished?'Повторить запуск':'Запустить все машины'}</button></div>
    <div role="status" className="fleet-result" data-state={error?'error':finished?(optimal?'won':'result'):'draft'}>
      {finished&&optimal&&<Check/>}<div><b>{error||(!run?(trips.length?'План готов к запуску':'Начните с любой клетки таблицы'):running?'Доставка идёт':missing?'Доставка завершена · план неполный':optimal?'Все заказы выполнены · план оптимален':'Все заказы выполнены · план не оптимален')}</b>
      {!error&&<span>{finished?(missing?'Осталось распределить '+missing+' ящ. Дополните план и запустите машины снова.':optimal?'Такие заказы невозможно выполнить дешевле.':'Можно сэкономить '+LU.txt(totalCost.sub(prices.cost))+' ед., если изменить распределение.'):(running?'При прибытии каждой машины обновляются количество доставленных ящиков и затраты.':trips.length?'Плановые затраты · '+LU.txt(totalCost)+' ед. Все назначенные машины стартуют одновременно.':'Например, введите 5 в клетку A₁ × B₁, чтобы назначить пять ящиков из первого склада в первый магазин.')}</span>}
      {records[pricing]&&<small>Ваш лучший полный план · {LU.txt(records[pricing])} ед.</small>}</div></div>
  </section>;
}
