import {UserRound,Truck,ChartArea,Table2,ListFilter,Layers,ArrowRightLeft,TableCellsMerge,Grid2X2,Waypoints,Dices,ClipboardCheck,BookOpenText,ScanSearch,ListOrdered,Clapperboard} from 'lucide-react';
import React from 'react';

export function Workshop({count,capacity,rate}) {
  const available=Math.max(0,1-count*rate/capacity);
  return <svg viewBox="0 0 300 97" className="teaching-art" role="img" aria-label={'Мастерская. Выпущено '+count+', осталось ресурса '+Math.max(0,capacity-count*rate)}>
    <path d="M9 75H292" className="art-ground"/><path d="M21 73V37h43v8h23v20H61v8z" fill="#7b9d86"/>
    <path d="M32 38V19h14v19m10 8h25" stroke="#425e4d" fill="#c5d5bb" strokeWidth="3"/>
    <rect x="87" y="63" width="185" height="9" rx="4" fill="#53695d"/>
    {Array.from({length:count},(_,i)=><path key={i} d={'M'+(90+i*Math.min(16,175/Math.max(1,count)))+' 60v-12l5-3h7v15z'} fill="#c29458" stroke="#735c3b"/>)}
    <rect x="117" y="19" width="153" height="9" rx="3" fill="#d5ded1"/><rect x="117" y="19" width={153*available} height="9" rx="3" fill="#588766"/>
    <text x="117" y="14">Ресурс: осталось {LU.ru(Math.max(0,capacity-count*rate))} из {LU.ru(capacity)}</text>
    <text x="88" y="90">Расход: {count} × {LU.ru(rate)} = {LU.ru(count*rate)}</text>
  </svg>;
}
export function CutPieces({amount,units}) {
  const width=230/Math.max(1,units);
  return <svg className="teaching-art" viewBox="0 0 300 58" role="img" aria-label={'Длина заготовки в целых деталях: '+LU.ru(amount)}>
    <path className="art-ground" d="M20 48H280"/>{Array.from({length:units},(_,i)=><g key={i}>
      <rect x={32+i*width} y="12" width={width-3} height="28" rx="3" fill="none" stroke="#869b88" strokeDasharray="4 2"/>
      <rect x={32+i*width} y="12" width={(width-3)*Math.min(1,Math.max(0,amount-i))} height="28" rx="2" fill="#bf924f"/>
    </g>)}</svg>;
}
export function PayoffBalance({value,limit}) {
  const share=44*Math.abs(value)/Math.max(1,limit);
  return <figure className="model-figure payoff-flow"><figcaption><Dices aria-hidden="true"/>Счёт после выбранных ходов</figcaption>
    {['A','B'].map((who,i)=>{const score=i?-value:value;return <div key={who}><b className="player-mark"><UserRound size={16} aria-hidden="true"/>{who}</b><span className="payoff-axis"><i style={{left:(score<0?50-share:50)+'%',width:share+'%',background:score<0?'#aa6242':'#34765d'}}/></span><strong>{score>0?'+':''}{LU.ru(score)}</strong></div>;})}
    <small>От нуля влево — потеря, вправо — выигрыш. Сумма двух результатов равна нулю.</small></figure>;
}
export function EqualObjectives({left,right}) {
  return <figure className="model-figure equal-objectives"><figcaption>Совпадение оценок</figcaption>
    <svg viewBox="0 0 300 96" role="img" aria-label={`Весы в равновесии. Значение плана и двойственная оценка равны ${LU.txt(left)}.`}>
      <g fill="none" stroke="#47755e" strokeWidth="2.5" strokeLinejoin="round"><path d="M55 18H245 M55 20l-27 39h54z M245 20l-27 39h54z"/>
        <path d="M28 59q27 25 54 0z M218 59q27 25 54 0z" fill="#d2e4cd"/><path d="M150 18v60m-24 4h48" strokeWidth="5"/></g>
      <circle cx="150" cy="18" r="5" fill="#c59150"/><g textAnchor="middle" fill="#244d39"><text x="55" y="54">{LU.txt(left)}</text><text x="245" y="54">{LU.txt(right)}</text>
        <text x="55" y="89">Цель плана</text><text x="245" y="89">Оценка ресурсов</text></g></svg></figure>;
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
