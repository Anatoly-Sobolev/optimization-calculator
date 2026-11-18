import React,{useLayoutEffect,useRef} from 'react';
import {Building} from './shipment-map.jsx';

// Coordinates in kilometres on a regular street grid, chosen for the two
// introductory variants. Extra stops use remaining intersections if needed.
export function makeTown(m,n){
  const warehouses=[[1,1],[11,2],[3,4],[9,6]],shops=[[5,2],[1,6],[12,4],[6,5],[9,0]];
  const used=new Set([...warehouses,...shops].map(p=>p.join(',')));
  let cols=13;
  function extend(list,count){
    for(let x=0;list.length<count;x++)for(let y=0;y<7&&list.length<count;y++){
      const key=x+','+y;
      if(!used.has(key)){list.push([x,y]);used.add(key);cols=Math.max(cols,x+1);}
    }
    return list.slice(0,count);
  }
  const a=extend(warehouses,m),b=extend(shops,n);
  const km=a.map(([x,y])=>b.map(([u,v])=>Math.abs(x-u)+Math.abs(y-v)));
  return {a,b,km,cols};
}
const gap=38,px=x=>26+x*gap,py=y=>25+y*gap;
function Journey({a,b}){
  const motion=useRef(null);
  useLayoutEffect(()=>{
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)motion.current?.beginElement();
  },[]);
  const dx=(a[0]-b[0])*gap,dy=(a[1]-b[1])*gap;
  return <g transform={`translate(${px(b[0])} ${py(b[1])})`} pointerEvents="none"><g>
    <animateMotion ref={motion} begin="indefinite" dur=".95s" fill="freeze" path={`M${dx} ${dy}H0V0`}/>
    <g transform="translate(0 -6)" stroke="#644122" strokeWidth="1.2"><rect x="-10" y="-7" width="13" height="8" rx="1.5" fill="#e7aa57"/><path d="M3-5h5l4 4v2H3z" fill="#3b795f"/><circle cx="-6" cy="2" r="2.3" fill="#243f36"/><circle cx="7" cy="2" r="2.3" fill="#243f36"/></g></g></g>;
}
export function DeliveryTown({town,stock,need,supply,demand,i,j,select,locked,trip,serial}){
  const a=town.a[i],b=town.b[j],w=px(town.cols-1)+26,h=py(6)+29;
  const path=`M${px(a[0])} ${py(a[1])}H${px(b[0])}V${py(b[1])}`;
  const horizontal=Math.abs(a[0]-b[0])>=Math.abs(a[1]-b[1]);
  const arrow=horizontal?[px((a[0]+b[0])/2),py(a[1]),b[0]>a[0]?0:180]:[px(b[0]),py((a[1]+b[1])/2),b[1]>a[1]?90:-90];
  function stop(side,p,k){
    const isA=side==='A',current=isA?i===k:j===k,tag=side+LU.sub(k+1),type=isA?'Склад':'Магазин';
    const label=type+' '+(k+1)+(isA?', осталось ':', нужно ')+(isA?stock[k]:need[k])+' ящ.';
    const left=isA?stock[k]:need[k],total=isA?supply[k]:demand[k];
    const fraction=total?(isA?left:total-left)/total:0;
    const pick=()=>{if(!locked)select(isA?k:i,isA?j:k);};
    return <g key={side+k} className="town-stop" transform={`translate(${px(p[0])} ${py(p[1])})`} role="button" tabIndex={locked?-1:0} aria-disabled={locked} aria-label={label} aria-pressed={current}
      onClick={pick} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}}}><title>{label}</title>
      <rect x="-15" y="-17" width="30" height="38" rx="8" fill={current?'#fff9d8':'#fffcf4'} stroke={current?'#23604b':'#b7c7b9'} strokeWidth={current?2:1}/>
      <g transform="translate(-10 -15)"><Building side={isA?'supply':'demand'}/></g><text y="14" textAnchor="middle">{tag}</text>
      <rect x="-10" y="16" width="20" height="2.7" rx="1.2" fill="#d9dace"/><rect x="-10" y="16" width={20*fraction} height="2.7" rx="1.2" fill={isA?'#967340':'#28765b'}/></g>;
  }
  return <figure className="town-map"><figcaption><strong>A{LU.sub(i+1)} → B{LU.sub(j+1)}</strong><span>{town.km[i][j]} км по улицам</span></figcaption>
    <svg viewBox={`0 0 ${w} ${h}`} role="group" aria-label="Карта складов и магазинов. Соседние перекрёстки находятся в одном километре друг от друга.">
    <rect width={w} height={h} rx="10" fill="#e1ebe0"/>
    {Array.from({length:town.cols-1},(_,x)=>Array.from({length:6},(_,y)=><g key={x+'-'+y}><rect x={px(x)+4} y={py(y)+4} width={gap-8} height={gap-8} rx="5" fill={(x+2*y)%5===0?'#b8d2af':'#d4dcd1'}/>
      {(x+2*y)%5===0?<g fill="#8eaf88"><circle cx={px(x)+14} cy={py(y)+16} r="4"/><circle cx={px(x)+24} cy={py(y)+22} r="5"/></g>:<path d={`M${px(x)+11} ${py(y)+12}h12v6h-6v8h-6z`} fill="#b9c6bd"/>}</g>))}
    {Array.from({length:town.cols},(_,x)=><path key={x} d={`M${px(x)} 0V${h}`} stroke="#fffaf0" strokeWidth="5"/>)}
    {Array.from({length:7},(_,y)=><path key={y} d={`M0 ${py(y)}H${w}`} stroke="#fffaf0" strokeWidth="5"/>)}
    <path d={path} stroke="#2f785f" strokeWidth="4.5" fill="none" strokeLinejoin="round"/><path d={path} stroke="#d3e8b9" strokeWidth="1.3" strokeDasharray="3 5" fill="none"/>
    <path d="M-4 -4 1 0-4 4" fill="none" stroke="#25664e" strokeWidth="2.4" transform={`translate(${arrow[0]} ${arrow[1]}) rotate(${arrow[2]})`}/>
    {town.a.map((p,k)=>stop('A',p,k))}{town.b.map((p,k)=>stop('B',p,k))}
    {trip&&<Journey key={serial+'-'+i+'-'+j} a={a} b={b}/>}</svg>
    <small>Склад A · магазин B. Квартал — 1 км. Путь: {Math.abs(a[0]-b[0])} км по горизонтали + {Math.abs(a[1]-b[1])} км по вертикали.</small></figure>;
}
