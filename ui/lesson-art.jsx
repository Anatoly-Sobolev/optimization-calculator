import React from 'react';
import {Truck} from 'lucide-react';

const scenes={
  transport:['delivery-town','Склады на одном берегу канала и магазины на другом.'],
  loom:['loom','Два вида ткани и общий ткацкий станок.'],
  workshop:['workshop','Деревянные заготовки и готовое изделие на верстаке.'],
  minimum:['minimum','В керамической мастерской отмеряют светлую и синюю смеси.'],
  valuation:['valuation','Один брусок с биркой и целая партия таких же брусков.'],
  pieces:['pieces','Фрагмент плитки рядом с целыми плитками для заказа.'],
  schedule:['schedule','Опоры пешеходного моста готовят до настила.'],
  game:['game','За игровым столом каждый из двух игроков выбирает свой ход.'],
  check:['check','Партия деталей и ведомость для проверки плана.'],
  order:['order','Заготовки слева и образец готового ящика справа.']
};
// Positions follow the inner walls of the two vessels on the 800 × 400 plate.
function LiquidLevels({volumes,minimum}){
  const values=volumes.map(v=>Math.max(0,v==null?0:LU.num(v)));
  const scale=Math.max(4,minimum*2,...values);
  const y=v=>337-250*(v/scale);
  return <svg className="liquid-levels" viewBox="0 0 800 400" aria-hidden="true">
    {values.map((v,i)=>{
      const x=i?595:207,top=y(v),color=i?'#397ba4':'#c59852';
      return v>0&&<g key={i} fill={color}><path opacity=".54" d={`M${x-118} ${top} Q${x} ${top+12} ${x+118} ${top} V335 Q${x+118} 351 ${x} 351 Q${x-118} 351 ${x-118} 335 Z`}/><ellipse cx={x} cy={top} rx="118" ry="8" opacity=".76"/></g>;
    })}
    <path d={`M475 ${y(minimum)}h238`} fill="none" stroke="#163e59" strokeWidth="2" strokeDasharray="8 6"/>
  </svg>;
}
export function LessonArt({scene,left,right,changed=false,volumes,minimum=1,remaining,choices,selected,days,shipment}){
  const [file,description]=scenes[scene];
  const src=scene==='transport'?'assets/delivery-town.webp':'assets/lessons/'+file+'.webp';
  return <span className="lesson-art" data-scene={scene} data-changed={changed}>
    <span className="art-canvas"><img src={src} width="800" height="400" alt={description}/>
      {scene==='transport'&&<span className="art-route" aria-hidden="true"><span key={shipment} className={shipment>0?'truck-arrival':undefined}><Truck size={20}/>{shipment>0&&<b>{shipment}</b>}</span></span>}
      {choices&&<span className="art-payoffs" aria-label="Выигрыш A при выборе хода B">{choices.map((v,j)=><span key={j} data-selected={selected===j}>B{LU.sub(j+1)} · {LU.txt(v)} {selected===j?'✓':''}</span>)}</span>}
      {days&&<span className="art-duration">Работа занимает {days} дн.</span>}
      {volumes&&<LiquidLevels volumes={volumes} minimum={minimum}/>}
    </span>
    <span className="art-readings"><span>{left}{remaining!=null&&<span className="art-capacity" aria-hidden="true"><i style={{width:Math.max(0,Math.min(1,remaining))*100+'%'}}/></span>}</span><span>{right}</span></span>
  </span>;
}
