import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Truck,RotateCcw,Package,Wallet,Check,Undo2,Plus,Minus,MapPin} from 'lucide-react';
import {FreightGuide,cheaperMove,Improvement} from './freight-guide.jsx';
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
  const unit=prices.P.c[i][j],q=counts[i][j];
  function increment(k,l){
    if(running||stock[k]<=0||need[l]<=0)return;
    select([k,l]);edit(k,l,String(counts[k][l]+1));
  }
  const nextShop=need.findIndex(v=>v>0),nextDepot=stock.findIndex(v=>v>0);
  const improvement=finished&&!missing&&!optimal?cheaperMove(counts,stock,prices.P.c):null;
  function applyMove(){
    const next=counts.map(row=>row.slice());
    for(const [a,b] of improvement.from)next[a][b]-=improvement.quantity;
    for(const [a,b] of improvement.to)next[a][b]+=improvement.quantity;
    setPrevious(cells);setRun(null);select(improvement.to[0]);
    setDraft({...draft,cells:next.map(row=>row.map(v=>v?String(v):''))});
  }
  return <section className="freight-sim" aria-label="Симулятор перевозок">
    <header className="freight-header"><div><h2>План доставки</h2>
      <p>Доставьте {requested} ящ. из {m} складов по заявкам магазинов. Подберите маршруты так, чтобы покрыть каждый заказ с наименьшими затратами.</p></div>
      <label>Тариф<select aria-label="Тариф" value={pricing} disabled={running} onChange={e=>{setRun(null);setDraft({...draft,pricing:e.target.value});}}>
        <option value="km">По расстоянию</option><option value="variant">Из условия задачи</option></select></label></header>
    <div className="freight-work"><section className="freight-sheet"><h3>Откуда и куда везём <span>Объём в ящиках</span></h3>
      <table className="dispatch-matrix"><colgroup><col className="depot-col"/>{demand.map((_,l)=><col key={l}/>)}<col className="stock-col"/></colgroup>
        <thead><tr><th scope="col">Склад</th>{demand.map((_,l)=><th scope="col" key={l}><span className="market-word">Маг. </span>B{sub(l+1)}</th>)}<th scope="col">Запас</th></tr></thead>
        <tbody>{cells.map((row,k)=><tr key={k}><th scope="row"><i style={{background:town.colors[k]}}/>A{sub(k+1)}</th>
          {row.map((v,l)=><td key={l} data-route={k===i&&l===j}><div className="freight-cell"><input ref={el=>{inputs.current[k*n+l]=el;}} aria-label={'Склад '+(k+1)+', магазин '+(l+1)} type="text" inputMode="numeric" autoComplete="off" maxLength={7} disabled={running} value={v} placeholder="0"
            data-active={k===i&&l===j} data-filled={quantity(v)>0} aria-invalid={(v!==''&&!/^\d{1,7}$/.test(v))||((stock[k]<0||need[l]<0)&&quantity(v)>0)}
            onFocus={e=>{select([k,l]);e.target.select();}} onChange={e=>edit(k,l,e.target.value)}/>
            <button type="button" className="cell-plus" aria-label={`Добавить ящик: склад ${k+1}, магазин ${l+1}`} disabled={running||stock[k]<=0||need[l]<=0} onClick={()=>increment(k,l)}><Plus size={14}/></button></div></td>)}
          <td className="capacity" data-invalid={stock[k]<0}>{used[k]}<small> / {supply[k]}</small></td></tr>)}</tbody>
        <tfoot><tr><th scope="row">Заказ</th>{demand.map((v,l)=><td key={l} data-invalid={need[l]<0}>{received[l]}<small> / {v}</small></td>)}<td/></tr></tfoot>
      </table><p className="freight-key">Строка — склад, столбец — магазин. Нажмите «+» или введите объём. Справа — сколько назначили из запаса, снизу — сколько покрыли из заказа.</p>
      <div className="route-editor"><div className="editor-heading"><MapPin size={17}/><strong>Склад A{sub(i+1)} → магазин B{sub(j+1)}</strong><span>{town.km[i][j]} км</span></div>
        <div className="editor-quantity"><span>В машине</span><div className="route-stepper">
        <button type="button" aria-label="Убрать ящик с выбранного рейса" disabled={running||!q} onClick={()=>edit(i,j,String(q-1))}><Minus size={16}/></button>
        <output aria-live="polite">{q} <small>ящ.</small></output><button type="button" aria-label="Добавить ящик на выбранный рейс" disabled={running||q>=limit} onClick={()=>increment(i,j)}><Plus size={16}/></button></div>
        <button type="button" className="take-limit" disabled={running||q===limit} onClick={()=>edit(i,j,String(limit))}>Взять максимум · {limit}</button></div>
        <div className="editor-balance"><span>Свободно на A{sub(i+1)} <b>{stock[i]} ящ.</b></span><span>Ещё нужно B{sub(j+1)} <b>{need[j]} ящ.</b></span><span>Цена рейса <b>{LU.txt(unit.mul(q))} ед.</b></span></div>
      </div>
      <div className="draft-actions"><small>{saved?'План сохранён в этом браузере':'План хранится до закрытия страницы'}</small>
      {previous?<button disabled={running} onClick={()=>{setRun(null);setDraft({...draft,cells:previous});setPrevious(null);}}><Undo2/>Вернуть план</button>:
        <button disabled={running||!cells.some(row=>row.some(Boolean))} onClick={()=>{setPrevious(cells);setRun(null);setDraft({...draft,cells:emptyPlan(m,n)});}}><RotateCcw/>Очистить</button>}</div>
    </section><div className="freight-geography"><DeliveryTown town={town} supply={supply} demand={demand} stock={run?supply.map((s,k)=>s-sum(run.trips.filter(t=>t.i===k).map(t=>t.q))):stock}
      need={run?demand.map((b,l)=>b-sum(arrivals.filter(t=>t.j===l).map(t=>t.q))):need} i={i} j={j} select={choose} locked={running} trips={trips} run={run} elapsed={elapsed}/>
      <FreightGuide i={i} j={j} town={town} supply={supply[i]} demand={demand[j]} otherStock={used[i]-q} otherOrder={received[j]-q} q={q} rate={unit} pricing={pricing}/></div></div>
    <div className="freight-console"><dl>
      <div><dt><Truck/>{run?'Прибыло машин':'Машины'}</dt><dd>{run?arrivals.length+' / ':''}{trips.length}</dd></div>
      <div><dt><Package/>{run?'Доставлено':'Назначено'}</dt><dd>{run?delivered:boxes} <small>/ {requested} ящ.</small></dd></div>
      <div><dt><Wallet/>{running?'Затраты / план':'Затраты'}</dt><dd>{LU.txt(run?spent:totalCost)} <small>{running?'/ '+LU.txt(totalCost)+' ':''}ед.</small></dd></div></dl>
      <button className="trial-primary launch-fleet" disabled={running||!!error||!trips.length} onClick={launch}><Truck/>{running?'Машины в пути':finished?'Повторить запуск':'Запустить все машины'}</button></div>
    <div role="status" className="fleet-result" data-state={error?'error':finished?(optimal?'won':'result'):'draft'}>
      {finished&&optimal&&<Check/>}<div><b>{error||(!run?(trips.length?'План готов к запуску':'Начните с любой клетки таблицы'):running?'Доставка идёт':missing?'Доставка завершена · план неполный':optimal?'Все заказы выполнены · план оптимален':'Все заказы выполнены · план не оптимален')}</b>
      {!error&&<span>{finished?(missing?'Осталось распределить '+missing+' ящ. Дополните план и запустите машины снова.':optimal?'Такие заказы невозможно выполнить дешевле.':'Можно сэкономить '+LU.txt(totalCost.sub(prices.cost))+' ед., если изменить распределение.'):(running?'При прибытии каждой машины обновляются количество доставленных ящиков и затраты.':trips.length?'Плановые затраты · '+LU.txt(totalCost)+' ед. Все назначенные машины стартуют одновременно.':'Например, введите 5 в клетку A₁ × B₁, чтобы назначить пять ящиков из первого склада в первый магазин.')}</span>}
      {finished&&missing>0&&nextShop>=0&&nextDepot>=0&&<button className="open-next-route" onClick={()=>choose(nextDepot,nextShop)}>Выбрать A{sub(nextDepot+1)} → B{sub(nextShop+1)} · магазину нужно {need[nextShop]} ящ.</button>}
      {improvement&&<Improvement move={improvement} apply={applyMove}/>}
      {records[pricing]&&<small>Ваш лучший полный план · {LU.txt(records[pricing])} ед.</small>}</div></div>
  </section>;
}
