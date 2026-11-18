import React,{useRef,useLayoutEffect,useState} from 'react';
import {Warehouse,Store,Truck,Check,MoveRight,RotateCcw} from 'lucide-react';
import {depot,shop,route} from './freight-grid.jsx';

const num=LU.num,fmt=LU.txt;
function pricePair(P){
  for(let j=0;j<P.n0;j++){
    const sources=P.a.slice(0,P.m0).map((v,i)=>i).filter(i=>P.a[i].ge(1)&&P.b[j].ge(1));
    const a=sources[0],b=sources.find(i=>!P.c[i][j].eq(P.c[a][j]));
    if(b!=null)return {j,sources:[a,b]};
  }
}
function endpoint(P,i,j){return [depot(P,i),shop(P,j)];}
function ParcelTrip({P,leg,landed}){
  const [a,b]=endpoint(P,leg.i,leg.j);
  const stat=(isStore)=>{
    const before=isStore?leg.b0:leg.a0,after=isStore?leg.b1:leg.a1;
    return <div className="inquiry-end" data-empty={landed&&after.isZero()}>
      {isStore?<Store aria-hidden="true"/>:<Warehouse aria-hidden="true"/>}
      <strong>{isStore?'Магазин '+b:'Склад '+a}</strong>
      <span>{isStore?'Нужно':'В наличии'}</span><b>{fmt(before)}{landed&&<> → {fmt(after)}</>} ящ.</b>
      <div className="inquiry-meter" aria-hidden="true"><i style={{width:(landed?(num(before)?num(after)/num(before):0):1)*100+'%'}}/></div>
      {landed&&<small>{isStore?(after.isZero()?'✓ Заказ закрыт':'Ещё нужен груз'):(after.isZero()?'✓ Склад пуст':'Есть запас')}</small>}
    </div>;
  };
  return <figure className="inquiry-trip" aria-label={'Перевозка '+route(P,leg.i,leg.j)}>
    {stat(false)}<div className="inquiry-road"><strong>{fmt(leg.x)} ящ.</strong><span><Truck aria-hidden="true"/></span><MoveRight aria-hidden="true"/></div>{stat(true)}
  </figure>;
}
export function FreightInquiry({model:T}){
  const P=T.P,leg=T.first.steps.find(s=>s.x.s>0&&s.i<P.m0&&s.j<P.n0);
  const [round,setRound]=useState(0),[answer,setAnswer]=useState(null),[done,setDone]=useState(false);
  const heading=useRef(null),advancing=useRef(false);
  useLayoutEffect(()=>{if(advancing.current){heading.current?.focus({preventScroll:true});advancing.current=false;}},[round,done]);
  if(!leg)return <p>В этом плане нет рейса с грузом между складом и магазином. Проверьте запасы и заказы в постановке задачи.</p>;
  const [a,b]=endpoint(P,leg.i,leg.j),prices=pricePair(P);
  const rounds=prices?3:2;
  const correct=round===0?leg.i+','+leg.j:round===1?(leg.a1.isZero()?(leg.b1.isZero()?'both':'stock'):'demand'):
    String(prices.sources.reduce((low,i)=>P.c[i][prices.j].lt(P.c[low][prices.j])?i:low));
  const solved=answer===correct;
  function advance(){
    advancing.current=true;
    if(round+1===rounds)setDone(true);
    else setRound(round+1);
    setAnswer(null);
  }
  if(done)return <section className="freight-inquiry inquiry-done"><Check/><h4 ref={heading} tabIndex={-1}>Теперь вы умеете читать план доставки</h4>
    <p>По клетке видно, откуда и куда едет машина. Запас склада и заказ магазина ограничивают груз.{prices&&' За перевозку одного и того же ящика разными маршрутами можно заплатить разную цену.'}</p>
    <button onClick={()=>{advancing.current=true;setDone(false);setRound(0);setAnswer(null);}}><RotateCcw size={16}/>Пройти ещё раз</button></section>;
  const question=['В какую клетку записать груз этой машины?','Чем ограничена загрузка этой машины?','Какой рейс выбрать для одного ящика?'][round];
  const hint=['Найдите строку склада, откуда едет машина, и столбец магазина, куда она направляется. Нажмите на их пересечение.',
    'Посмотрите на остатки после рейса. Ноль на складе означает, что груз закончился. Ноль у магазина означает, что заказ уже собран.',
    'Оба склада могут выделить по ящику для одного магазина. Выберите на схеме маршрут, по которому один ящик обойдётся дешевле.'][round];
  const state=id=>answer!==id?'idle':solved?'right':'wrong';
  const picks=(n,active)=>[...new Set([active,active===0?Math.min(1,n-1):0])].sort((x,y)=>x-y);
  let feedback='';
  if(answer!==null){
    if(round===0){
      const [i,j]=answer.split(',').map(Number);
      feedback=solved?'Верно. В клетке '+route(P,i,j)+' записываем '+fmt(leg.x)+' ящ.':i!==leg.i?'Проверьте строку. Машина выезжает со склада '+a+'.':'Проверьте столбец. Машина едет в магазин '+b+'.';
    }else if(round===1){
      feedback=(solved?'Верно. ':'Посмотрите на оба остатка. ')+(leg.a1.isZero()?'На складе закончились ящики.':'На складе осталось '+fmt(leg.a1)+' ящ.')+' '+(leg.b1.isZero()?'Магазин получил весь заказ.':'Магазину ещё нужно '+fmt(leg.b1)+' ящ.');
    }else{
      const cost=P.c[Number(answer)][prices.j],other=P.c[prices.sources.find(i=>i!==Number(answer))][prices.j];
      feedback=(solved?'Верно. ':'Сравните цены двух рейсов. ')+'Здесь ящик стоит '+fmt(cost)+' ед., на другом маршруте — '+fmt(other)+' ед.';
    }
  }
  return <section className="freight-inquiry"><div className="inquiry-heading"><small>Задание {round+1} из {rounds}</small><h4 ref={heading} tabIndex={-1}>{question}</h4><p>{hint}</p></div>
    <div className={'inquiry-board inquiry-round-'+round}>
      {round<2&&<ParcelTrip key={round} P={P} leg={leg} landed={round===1}/>}
      {round===0&&<table className="inquiry-pick-grid"><caption>Фрагмент плана · выберите клетку</caption><thead><tr><th>Склад</th>{picks(P.n0,leg.j).map(j=><th key={j} scope="col" data-guide={j===leg.j}>{shop(P,j)}</th>)}</tr></thead><tbody>
        {picks(P.m0,leg.i).map(i=><tr key={i}><th scope="row" data-guide={i===leg.i}>{depot(P,i)}</th>{picks(P.n0,leg.j).map(j=>{
          const id=i+','+j;return <td key={j} data-guide={i===leg.i||j===leg.j}><button type="button" aria-label={'Записать в '+route(P,i,j)} data-answer={state(id)} disabled={solved} onClick={()=>setAnswer(id)}>{answer===id?(solved?fmt(leg.x)+' ✓':'×'):'·'}</button></td>;})}</tr>)}</tbody></table>}
      {round===1&&<div className="inquiry-answers">{[['stock','Только запасом склада'],['demand','Только заказом магазина'],['both','И запасом, и заказом']].map(([id,label])=><button type="button" key={id} data-answer={state(id)} disabled={solved} onClick={()=>setAnswer(id)}>{label}</button>)}</div>}
      {round===2&&<div className="inquiry-prices">{prices.sources.map(i=><button type="button" key={i} data-answer={state(String(i))} disabled={solved} onClick={()=>setAnswer(String(i))}>
        <span><Warehouse aria-hidden="true"/>Склад {depot(P,i)}</span><span className="inquiry-ticket"><b>{fmt(P.c[i][prices.j])} ед.</b>за 1 ящик <MoveRight size={22}/></span><span><Store aria-hidden="true"/>Магазин {shop(P,prices.j)}</span></button>)}</div>}
    </div><div className="inquiry-feedback" role="status" data-answer={answer===null?'idle':solved?'right':'wrong'}>{feedback}</div>
    {solved&&<button type="button" className="book-primary" onClick={advance}>{round+1===rounds?'Завершить исследование':'Следующий вопрос →'}</button>}
  </section>;
}
