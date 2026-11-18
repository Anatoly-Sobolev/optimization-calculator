import React,{useState} from 'react';
import {ArrowRight,Box,Route,Wallet} from 'lucide-react';

export function FreightGuide({i,j,town,supply,demand,otherStock,otherOrder,q,rate,pricing}){
  const [page,open]=useState(0);
  const a=town.a[i],b=town.b[j],dx=Math.abs(a[0]-b[0]),dy=Math.abs(a[1]-b[1]);
  const available=supply-otherStock,requested=demand-otherOrder,cap=Math.max(0,Math.min(available,requested));
  const terms=['Путь','Груз','Стоимость'],icons=[Route,Box,Wallet];
  return <section className="freight-guide" aria-label="Разбор выбранного рейса">
    <div className="guide-top"><h4>Разбор рейса A{LU.sub(i+1)} → B{LU.sub(j+1)}</h4><div role="group" aria-label="Шаги разбора рейса">{terms.map((name,k)=>{
      const Icon=icons[k];return <button key={name} type="button" aria-pressed={k===page} onClick={()=>open(k)}><Icon size={14}/>{k+1}. {name}</button>;
    })}</div></div>
    <div key={page+'-'+i+'-'+j} className="freight-guide-page" aria-live="polite">
    {page===0?<><strong>{dx} км по горизонтали + {dy} км по вертикали = {town.km[i][j]} км</strong><p>Стрелка ведёт от склада A{LU.sub(i+1)} к магазину B{LU.sub(j+1)}. Клетка на пересечении их строки и столбца хранит число ящиков в этой машине.</p></>:
      page===1?<><strong>Для этого рейса можно выделить до {cap} ящ.</strong><p>Запас склада {supply} − {otherStock} на других рейсах = {available} ящ. Заказ магазина {demand} − {otherOrder} с других складов = {requested} ящ. {available<0||requested<0?'Сначала исправьте превышение в плане.':'Берём меньшее из этих двух чисел.'}</p></>:
      <><strong>{q} ящ. × {LU.txt(rate)} ед. за ящик = {LU.txt(rate.mul(q))} ед.</strong><p>{pricing==='km'?'Один ящик на каждом километре стоит 1 ед. Поэтому тариф за ящик равен длине пути.':'Тариф задан в таблице стоимости для этой пары склада и магазина. Длина маршрута видна на карте.'} Сумма по всем машинам даёт стоимость плана.</p></>}
    </div>
  </section>;
}

// Each suggested change preserves shop totals. A two-route exchange also
// preserves depot totals. Only moves with a strictly positive saving qualify.
export function cheaperMove(counts,stock,prices){
  let best=null;
  function consider(quantity,perBox,from,to){
    if(quantity<=0||perBox.s<=0)return;
    const saving=perBox.mul(quantity);
    if(!best||saving.gt(best.saving))best={quantity,from,to,saving};
  }
  counts.forEach((row,i)=>row.forEach((q,j)=>{
    if(!q)return;
    counts.forEach((other,k)=>{
      if(i===k)return;
      consider(Math.min(q,stock[k]),prices[i][j].sub(prices[k][j]),[[i,j]],[[k,j]]);
      if(k<=i)return;
      other.forEach((r,l)=>{
        if(!r||l===j)return;
        const gain=prices[i][j].add(prices[k][l]).sub(prices[i][l]).sub(prices[k][j]);
        consider(Math.min(q,r),gain,[[i,j],[k,l]],[[i,l],[k,j]]);
      });
    });
  }));
  return best;
}
export function Improvement({move,apply}){
  const route=([i,j])=>'A'+LU.sub(i+1)+' → B'+LU.sub(j+1);
  return <details className="freight-improvement"><summary>Как удешевить этот план?</summary>
    <p>Снимите {move.quantity} ящ. с {move.from.length===1?'рейса':'каждого рейса'} {move.from.map(route).join(', ')}. Перенесите столько же на {move.to.map(route).join(', ')}. Магазины получат прежние объёмы, а стоимость уменьшится на {LU.txt(move.saving)} ед.</p>
    <button onClick={apply}><ArrowRight size={15}/>Испытать этот обмен</button>
  </details>;
}
