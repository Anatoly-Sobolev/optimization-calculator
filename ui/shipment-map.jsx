import React,{useMemo} from 'react';
import {DeliveryTown,makeTown} from './delivery-town.jsx';

const {num,sub}=LU;
export function partialPlan(model,leg,amount){
  const matrix=model.P.a.map(()=>model.P.b.map(()=>null));
  model.first.steps.slice(0,leg).forEach(s=>{matrix[s.i][s.j]=num(s.x);});
  const {i,j}=model.first.steps[leg];
  matrix[i][j]=amount;
  return matrix;
}

export function ShipmentMap({P,matrix,i,j,fraction,onSelect,isolated=false}){
  const town=useMemo(()=>makeTown(P.m0,P.n0),[P.m0,P.n0]);
  const supply=P.a.slice(0,P.m0).map(num),demand=P.b.slice(0,P.n0).map(num);
  const assigned=matrix.map(row=>row.reduce((sum,q)=>sum+(q??0),0));
  const sent=matrix.map(row=>row.slice(0,P.n0).reduce((sum,q)=>sum+(q??0),0));
  const received=P.b.map((_,l)=>matrix.reduce((sum,row)=>sum+(row[l]??0),0));
  const stock=supply.map((v,k)=>v-sent[k]),need=demand.map((v,l)=>v-received[l]);
  const physical=i<P.m0&&j<P.n0,quantity=matrix[i][j]??0;
  const routeName=(i<P.m0?'A'+sub(i+1):'Недопоставка')+' → '+(j<P.n0?'B'+sub(j+1):'резерв');
  const routes=matrix.flatMap((row,k)=>row.flatMap((q,l)=>q>0&&k<P.m0&&l<P.n0&&(!isolated||(k===i&&l===j))?[{i:k,j:l,q}]:[]));
  const incoming=matrix.flatMap((row,k)=>row[j]>0?[row[j]+' ('+(k<P.m0?'A'+sub(k+1):'недопоставка')+')']:[]);
  return <div className="shipment-network"><div className="route-heading"><strong>{routeName}</strong><b>{quantity} ящ.</b></div>
    <DeliveryTown town={town} stock={stock} need={need} supply={supply} demand={demand} i={i} j={j} trips={routes}
      pickRoute={onSelect} preview={physical&&(fraction!=null||quantity>0)?{i,j,q:quantity,fraction}:null}
      note="Маршрут выбранной клетки"/>
    <p className="shipment-receipt"><b>{i<P.m0?'Склад A'+sub(i+1):'Недопоставка'}</b>
      <span>{isolated?`Назначено ${assigned[i]} из ${num(P.a[i])} ящ.`:i<P.m0?`Осталось ${stock[i]} из ${supply[i]} ящ.`:'Условная строка для недостающих ящиков.'}</span></p>
    <p className="shipment-receipt"><b>{j<P.n0?'Получено магазином B'+sub(j+1):'Учтено в резерве'}</b><span>{incoming.length?incoming.join(' + ')+' = ':''}{received[j]} из {num(P.b[j])} ящ.</span></p>
    {!physical&&<p className="map-note">{j>=P.n0?'Резерв — ящики, которые остаются на складе. Рейса в магазин здесь нет.':'Недопоставка — часть заказа, для которой нет груза. Этой записи не соответствует машина.'}</p>}
  </div>;
}
