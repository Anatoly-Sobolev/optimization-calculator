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
export function MethodMark({type}) {
  const paths={
    transp:'M3 19V9l6-4 6 4v10z M18 17h9v-6h-9z M27 14h4v3h-4 M4 23h28',
    graph:'M4 3v21h28 M7 20l8-13 12 9z M6 12l21 7',
    simplex:'M4 5h25v17H4z M4 11h25 M4 17h25 M12 5v17 M21 5v17',
    netw:'M5 15l10-9 14 10-15 5z M5 15l24 1',
    game:'M5 7h9v9H5z M18 12h10v10H18z M8 10h2 M21 15h2 M24 19h2',
    dual:'M4 8h18l-4-4 M28 19H10l5 5', ilp:'M3 23h29 M6 20V9h5v11 M16 20V6h5v14 M26 20V3h5v17',
    canon:'M3 10l9-4 M3 10l9 4 M18 9h13 M18 15h13',
    artificial:'M5 22h25 M8 21V9h5v12 M18 21V5h6v16',dsx:'M3 14h29 M8 14v8h5v-8 M20 14V5h5v9',
    optcheck:'M5 14l6 6L27 5'
  };
  return <svg className="method-mark" viewBox="0 0 35 28" aria-hidden="true"><path d={paths[type]||paths.dual} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
