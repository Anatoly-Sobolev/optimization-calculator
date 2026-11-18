import React,{useEffect,useMemo,useState} from 'react';
import {Truck,Undo2,Play,Pause} from 'lucide-react';
import {TrialChallenge} from './trial-challenge.jsx';
import {makeTown,DeliveryTown} from './delivery-town.jsx';

export function ShippingTrial({data}) {
  const {P}=data.T;
  const town=useMemo(()=>makeTown(P.m0,P.n0),[P]);
  const byDistance=useMemo(()=>ALGT.solve({a:P.a.slice(0,P.m0),b:P.b.slice(0,P.n0),c:town.km}),[P,town]);
  const [pricing,setPricing]=useState('km');
  const prices=pricing==='km'?byDistance:data.T;
  const minimum=prices.cost;
  const supply=P.a.slice(0,P.m0).map(LU.num), demand=P.b.slice(0,P.n0).map(LU.num);
  const [route,setRoute]=useState([0,0]),[amount,setAmount]=useState('1');
  const [trips,setTrips]=useState([]),[notice,setNotice]=useState(''),[frame,setFrame]=useState(null);
  const [playing,setPlaying]=useState(false);
  const shown=frame??trips.length, last=trips[shown-1];
  const [i,j]=frame!==null&&last?[last.i,last.j]:route;
  useEffect(()=>{
    if(!playing)return;
    const timer=setTimeout(()=>{
      if(shown<trips.length)setFrame(shown+1);
      else {setPlaying(false);setFrame(null);if(last)setRoute([last.i,last.j]);}
    },1050);
    return ()=>clearTimeout(timer);
  },[playing,shown,trips]);
  const matrix=supply.map(()=>demand.map(()=>0));
  let cost=Q.of(0);
  for(const trip of trips.slice(0,shown)){
    matrix[trip.i][trip.j]+=trip.q;
    cost=cost.add(prices.P.c[trip.i][trip.j].mul(trip.q));
  }
  const stock=supply.map((a,k)=>a-matrix[k].reduce((sum,q)=>sum+q,0));
  const need=demand.map((b,l)=>b-matrix.reduce((sum,row)=>sum+row[l],0));
  const limit=Math.min(stock[i],need[j]), missing=need.reduce((a,b)=>a+b,0);
  const complete=missing===0, replaying=frame!==null;
  function select(a,b){setRoute([a,b]);setNotice('');}
  function send(e){
    e.preventDefault();
    const q=Number(amount);
    if(!Number.isSafeInteger(q)||q<=0){setNotice('Введите целое число ящиков больше нуля.');return;}
    if(q>limit){setNotice('Такой рейс невозможен. На складе '+stock[i]+' ящ., магазину нужно '+need[j]+'. По этому маршруту можно отправить до '+limit+' ящ.');return;}
    setTrips([...trips,{i,j,q}]);setNotice('');
  }
  function undo(){
    const removed=trips.at(-1);setTrips(trips.slice(0,-1));select(removed.i,removed.j);setAmount(String(removed.q));setNotice('Последний рейс отменён. Ящики снова на складе.');
  }
  function replay(){
    if(playing){setPlaying(false);return;}
    if(frame===null||frame===trips.length)setFrame(0);
    setPlaying(true);setNotice('');
  }

  const lastOnRoute=last?.i===i&&last?.j===j;
  const unit=prices.P.c[i][j];
  return <div className="trial-spread shipping-trial"><div className="dispatch-intro">
    <h2>Как развезти заказы магазинов?</h2><p>Выполните все заказы как можно дешевле. Выберите склад и магазин на карте, укажите число ящиков и отправьте машину. Заказ можно разделить между складами.</p>
    <label className="trial-field tariff-mode">Как считать затраты<select value={pricing} disabled={replaying} onChange={e=>setPricing(e.target.value)}><option value="km">По расстоянию · учебная карта</option><option value="variant">По тарифам исходного задания</option></select></label>
    <p className="trial-term">{pricing==='km'?'Цена рейса = ящики × километры в одну сторону. За 1 ящик на 1 км платим 1 ед.':'За каждый ящик платим тариф выбранной пары из условия. Километраж показан для ориентира на учебной карте.'}</p>
  </div><div className="trial-board primer-art"><DeliveryTown town={town} supply={supply} demand={demand} stock={stock} need={need} i={i} j={j} select={select} locked={replaying} trip={lastOnRoute} serial={shown}/>
    <form onSubmit={send} noValidate><fieldset disabled={replaying} className="dispatch-controls">
      <label>Откуда<select aria-label="Откуда" value={i} onChange={e=>select(+e.target.value,j)}>{supply.map((_,k)=><option key={k} value={k}>Склад {k+1}</option>)}</select></label>
      <label>Куда<select aria-label="Куда" value={j} onChange={e=>select(i,+e.target.value)}>{demand.map((_,l)=><option key={l} value={l}>Магазин {l+1}</option>)}</select></label>
      <label>Ящиков<input type="number" min="1" step="1" value={amount} onChange={e=>{setAmount(e.target.value);setNotice('');}}/></label>
      <div className="dispatch-price">Остаток склада · {stock[i]} ящ. Магазину нужно · {need[j]} ящ.<br/>Тариф · {LU.txt(unit)} за ящик. {Number.isSafeInteger(+amount)&&+amount>0&&<>За рейс · {amount} × {LU.txt(unit)} = {LU.txt(unit.mul(+amount))}.</>}</div>
      <button type="button" disabled={!limit} onClick={()=>{setAmount(String(limit));setNotice('');}}>Взять максимум · {limit}</button>
      <button className="trial-primary" type="submit"><Truck/>Отправить</button></fieldset></form>
    <div className="dispatch-note" role="status">{notice||(lastOnRoute?'Рейс '+shown+' · A'+LU.sub(i+1)+' → B'+LU.sub(j+1)+', '+last.q+' ящ. · осталось доставить '+missing+' ящ.':limit?'Выберите маршрут и нажмите «Отправить».':'Выберите другой маршрут: запас исчерпан или заказ закрыт.')}</div>
  </div><div className="dispatch-ledger">
    <div className="reading-grid trial-ledger"><table><caption>Ваш план · уже отправлено ящиков</caption><thead><tr><th>Склад</th>{demand.map((_,l)=><th key={l}>B{LU.sub(l+1)}</th>)}<th>Запас</th></tr></thead>
    <tbody>{matrix.map((row,k)=><tr key={k}><th>A{LU.sub(k+1)}</th>{row.map((v,l)=><td key={l}><button type="button" disabled={replaying} aria-label={'Склад '+(k+1)+', магазин '+(l+1)} aria-pressed={k===i&&l===j} onClick={()=>select(k,l)}>{v}</button></td>)}<td>{supply[k]}</td></tr>)}<tr><th>Заказ</th>{demand.map((b,l)=><td key={l}>{b}</td>)}<td> </td></tr></tbody></table></div>
    <p className="trial-term">Строка — склад, столбец — магазин. В клетке A{LU.sub(i+1)}B{LU.sub(j+1)} учтены все ящики на этом маршруте.</p>
    <div className="trial-verdict" role="status"><b>{replaying?'Просмотр · рейсов '+shown+' из '+trips.length:complete?'Заказы выполнены':'Осталось доставить '+missing+' ящ.'}</b><span>Затраты по плану · {LU.txt(cost)}</span>
    {complete&&<span>Оцените план, чтобы проверить его стоимость. {stock.some(v=>v>0)?'Лишний запас остаётся на складах.':''}</span>}</div>
    {['km','variant'].map(mode=><div key={mode} hidden={mode!==pricing}><TrialChallenge label="Оценить мой план" enabled={!replaying} value={cost} valid={complete} optimum={minimum} reason={'План пока не завершён. Магазинам нужно ещё '+missing+' ящ.'} steps={['Рейсов · '+shown,'Ещё требуется · '+missing+' ящ.','Затраты · '+LU.txt(cost)]}/></div>)}
    <div className="trial-actions"><button disabled={!trips.length||replaying} onClick={undo}><Undo2/>Отменить рейс</button>
    <button disabled={!trips.length} onClick={replay}>{playing?<Pause/>:<Play/>}{playing?'Пауза':replaying&&shown<trips.length?'Продолжить просмотр':'Проиграть мои рейсы'}</button>
    {trips.length>0&&!replaying&&<button onClick={()=>{setTrips([]);select(0,0);setAmount('1');}}>Новый план</button>}
    {replaying&&<button onClick={()=>{setPlaying(false);setFrame(null);}}>К моему плану</button>}</div>
  </div></div>;
}
