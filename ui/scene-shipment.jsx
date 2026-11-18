import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ShipmentMap} from './shipment-map.jsx';
import {FreightGrid,depot,shop,route as routeName} from './freight-grid.jsx';

function AuditTotals({P,matrix,i,j}){
  const row=matrix[i],column=matrix.map(line=>line[j]);
  const checks=[
    {name:'Проверка склада '+depot(P,i),terms:row,limit:P.a[i],used:'Распределено',diff:row.reduce((a,b)=>a+b,0)-P.a[i],bad:'Сверх запаса',ok:'Запаса хватает'},
    {name:'Проверка '+(j<P.n0?'магазина ':'')+shop(P,j),terms:column,limit:P.b[j],used:j<P.n0?'Назначено магазину':'Учтено в резерве',diff:P.b[j]-column.reduce((a,b)=>a+b,0),bad:'Не хватает',ok:j<P.n0?'Заказ покрыт':'Резерв учтён'}
  ];
  return <div className="freight-audit-sums" aria-live="polite">{checks.map((c,k)=>{
    const total=c.terms.reduce((sum,v)=>sum+v,0),index=k===0?j:i;
    return <section key={k} data-issue={c.diff>0}><strong>{c.name}</strong>
      <div>{c.terms.map((v,l)=><React.Fragment key={l}>{l>0&&' + '}{l===index?<mark>{v}</mark>:v}</React.Fragment>)} = <b>{total}</b></div>
      <small>{c.used} {total} ящ. · {k===0?'запас':'требуется'} {c.limit}. {c.diff>0?c.bad+' '+c.diff+' ящ.':c.ok+'.'}</small></section>;
  })}</div>;
}
function SceneShipment({P,matrix,selected,audit}) {
  const routes=matrix.flatMap((row,i)=>row.flatMap((amount,j)=>amount>0?[[i,j]]:[]));
  const [route,setRoute]=useState(selected??routes[0]??[0,0]);
  const [i,j]=route;
  const options=routes.some(([a,b])=>a===i&&b===j)?routes:[route,...routes];
  const selector=<label className="route-picker">Показать рейс
    <select value={route.join(',')} onChange={e=>setRoute(e.target.value.split(',').map(Number))}>
      {options.map(([a,b])=><option key={[a,b].join(',')} value={[a,b].join(',')}>{a<P.m0?'Склад '+(a+1):'Недопоставка'} → {b<P.n0?'магазин '+(b+1):'резерв'} · {matrix[a][b]} ящ.</option>)}
    </select></label>;
  const map=<ShipmentMap P={P} matrix={matrix} i={i} j={j} isolated showReceipts={!audit}/>;
  if(!audit)return <div className="scene-shipment">{selector}{map}</div>;
  return <section className="freight-audit"><div><h4>{audit==='sup'?'Найдите склад, с которого выписали лишний ящик':'Найдите магазин, которому недостаёт ящика'}</h4>
    <p>{audit==='sup'?'Читайте строку слева направо. Сложите все назначения склада и сравните с запасом справа.':'Читайте столбец сверху вниз. Сложите поставки из всех складов и сравните с заказом внизу.'}</p>
    <FreightGrid P={P} values={matrix} rows={P.a} cols={P.b} selected={route} onPick={setRoute} caption="Накладная · ящики по маршрутам" rowLabel="Запас" colLabel="Заказ"/>
    <AuditTotals P={P} matrix={matrix} i={i} j={j}/></div>
    <div className="scene-shipment">{selector}{map}<p className="audit-route-note" aria-live="polite">{j>=P.n0?'В резерв записан остаток на складе.':i>=P.m0?'Эта строка учитывает недопоставку.':matrix[i][j]===0?'По маршруту '+routeName(P,i,j)+' в накладной 0 ящиков. Машина сюда не назначена.':'По накладной склад '+depot(P,i)+' отправляет в магазин '+shop(P,j)+' '+matrix[i][j]+' ящ.'} Выбор клетки подсвечивает запись. Количество ящиков остаётся прежним.</p></div></section>;
}
customElements.define('shipment-plan',class extends HTMLElement {
  connectedCallback() {
    if(this.root)return;
    this.root=createRoot(this);
    this.root.render(<SceneShipment {...JSON.parse(this.dataset.plan)}/>);
  }
  disconnectedCallback() { this.root?.unmount();this.root=null; }
});
