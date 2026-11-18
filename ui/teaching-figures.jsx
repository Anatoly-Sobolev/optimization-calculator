import {Truck,ChartArea,Table2,ListFilter,Layers,ArrowRightLeft,TableCellsMerge,Grid2X2,Waypoints,Dices,ClipboardCheck,BookOpenText,ScanSearch,ListOrdered,Clapperboard} from 'lucide-react';
import React from 'react';

export function Workshop({count,capacity,rate}) {
  const available=Math.max(0,1-count*rate/capacity);
  return <svg viewBox="0 0 300 90" className="teaching-art" role="img" aria-label={'Мастерская. Выпущено '+count+', осталось ресурса '+Math.max(0,capacity-count*rate)}>
    <path d="M9 75H292" className="art-ground"/><path d="M21 73V37h43v8h23v20H61v8z" fill="#7b9d86"/>
    <path d="M32 38V19h14v19m10 8h25" stroke="#425e4d" fill="#c5d5bb" strokeWidth="3"/>
    <rect x="87" y="63" width="185" height="9" rx="4" fill="#53695d"/>
    {Array.from({length:Math.min(count,10)},(_,i)=><path key={i} d={'M'+(90+i*16)+' 60v-12l5-3h7v15z'} fill="#c29458" stroke="#735c3b"/>)}
    <rect x="117" y="19" width="153" height="9" rx="3" fill="#d5ded1"/><rect x="117" y="19" width={153*available} height="9" rx="3" fill="#588766"/>
  </svg>;
}
export function CutPieces({amount}) {
  const units=Math.max(1,Math.ceil(amount)), width=230/units;
  return <svg className="teaching-art" viewBox="0 0 300 58" role="img" aria-label={'Длина заготовки в целых деталях: '+LU.ru(amount)}>
    <path className="art-ground" d="M20 48H280"/>{Array.from({length:units},(_,i)=><g key={i}>
      <rect x={32+i*width} y="12" width={width-3} height="28" rx="3" fill="none" stroke="#869b88" strokeDasharray="4 2"/>
      <rect x={32+i*width} y="12" width={(width-3)*Math.min(1,Math.max(0,amount-i))} height="28" rx="2" fill="#bf924f"/>
    </g>)}</svg>;
}
export function PayoffBalance({value,limit}) {
  const y=36-22*value/Math.max(1,limit),z=72-y;
  return <svg className="teaching-art" viewBox="0 0 300 82" role="img" aria-label={'Баланс выигрышей: выигрыш A равен '+LU.ru(value)}>
    <path d="M133 69l17-35 17 35z" fill="#93a88b"/><path d={'M48 '+y+' L252 '+z} stroke="#536250" strokeWidth="4"/>
    {[[57,y,'A'],[243,z,'B']].map(([a,b,n])=><g key={n}><circle cx={a} cy={b} r="12" fill={n==='A'?'#2b6651':'#a66d43'}/><text x={a} y={Number(b)+4} textAnchor="middle" style={{fill:'#fff'}}>{n}</text></g>)}
    <path d="M28 71H272" className="art-ground"/></svg>;
}
const symbols={
  transp:Truck,graph:ChartArea,simplex:Table2,canon:ListFilter,artificial:Layers,
  dual:ArrowRightLeft,duality:ArrowRightLeft,dsx:TableCellsMerge,dsimplex:TableCellsMerge,
  ilp:Grid2X2,gomory:Grid2X2,netw:Waypoints,game:Dices,optcheck:ClipboardCheck,
  brief:BookOpenText,explore:ScanSearch,steps:ListOrdered,demo:Clapperboard
};
export function MethodMark({type}) {
  const Icon=symbols[type]||BookOpenText;
  return <span aria-hidden="true" className={'method-mark mark-'+type}><Icon size={28} strokeWidth={1.65}/></span>;
}
