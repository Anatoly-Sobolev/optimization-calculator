import {UserRound,Truck,ChartArea,Table2,ListFilter,Layers,ArrowRightLeft,TableCellsMerge,Grid2X2,Waypoints,Dices,ClipboardCheck,BookOpenText,ScanSearch,ListOrdered,Clapperboard} from 'lucide-react';
import React from 'react';


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
