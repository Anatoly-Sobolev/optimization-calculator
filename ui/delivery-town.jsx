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
  const palette=['#287457','#ae6128','#4769a3','#95638d'];
  return {a,b,km,cols,colors:a.map((_,k)=>palette[k%palette.length])};
}
const gap=38,px=x=>26+x*gap,py=y=>25+y*gap;
function Journey({a,b,trip,color}){
  const motion=useRef(null);
  useLayoutEffect(()=>{motion.current?.beginElement();},[]);
  // Parallel lanes keep trucks from the same depot distinguishable.
  const lane=(trip.j%5-2)*2.5,dx=(a[0]-b[0])*gap,dy=(a[1]-b[1])*gap;
  return <g className="fleet-truck" pointerEvents="none" transform={`translate(${px(b[0])+lane} ${py(b[1])+lane})`}>
    <title>{'A'+LU.sub(trip.i+1)+' → B'+LU.sub(trip.j+1)+' · '+trip.q+' ящ.'}</title><g>
    <animateMotion ref={motion} begin="indefinite" dur={trip.duration+'ms'} fill="freeze" path={`M${dx} ${dy}H0V0`}/>
    <g transform="translate(0 -4)" stroke="#284335" strokeWidth="1"><rect x="-10" y="-8" width="13" height="9" rx="2" fill={color}/><path d="M3-6h5l4 4v3H3z" fill="#f4cd79"/><circle cx="-6" cy="2" r="2.3" fill="#243f36"/><circle cx="7" cy="2" r="2.3" fill="#243f36"/></g>
    <g transform="translate(0 -19)"><rect x="-9" y="-7" width="19" height="12" rx="4" fill="#fffefa" stroke={color}/>
      <text x=".5" y="2" textAnchor="middle" className="truck-load">{trip.q}</text></g>
    </g></g>;
}
export function DeliveryTown({town,stock,need,supply,demand,i,j,select,locked,trips,run,elapsed}){
  const w=px(town.cols-1)+26,h=py(6)+29;
  function street(k,l){
    const a=town.a[k],b=town.b[l];
    return `M${px(a[0])} ${py(a[1])}H${px(b[0])}V${py(b[1])}`;
  }
  function stop(side,p,k){
    const isA=side==='A',current=isA?i===k:j===k,tag=side+LU.sub(k+1),type=isA?'Склад':'Магазин';
    const label=type+' '+(k+1)+(isA?', осталось ':', нужно ')+(isA?stock[k]:need[k])+' ящ.';
    const left=isA?stock[k]:need[k],total=isA?supply[k]:demand[k];
    const fraction=total?Math.max(0,Math.min(1,(isA?left:total-left)/total)):0;
    const pick=()=>{if(!locked)select(isA?k:i,isA?j:k);};
    return <g key={side+k} className="town-stop" transform={`translate(${px(p[0])} ${py(p[1])})`} role="button" tabIndex={locked?-1:0} aria-disabled={locked} aria-label={label} aria-pressed={current}
      onClick={pick} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}}}><title>{label}</title>
      <rect x="-15" y="-17" width="30" height="38" rx="8" fill={current?'#fff9d8':'#fffcf4'} stroke={current?'#23604b':'#b7c7b9'} strokeWidth={current?2:1}/>
      <g transform="translate(-10 -15)"><Building side={isA?'supply':'demand'}/></g><text y="14" textAnchor="middle">{tag}</text>
      <rect x="-10" y="16" width="20" height="2.7" rx="1.2" fill="#d9dace"/><rect x="-10" y="16" width={20*fraction} height="2.7" rx="1.2" fill={isA?'#967340':'#28765b'}/></g>;
  }
  return <figure className="town-map"><figcaption><strong>Карта доставки</strong><span>{run&&elapsed<run.end?'Машины в пути':'1 квартал = 1 км'}</span></figcaption>
    <svg viewBox={`0 0 ${w} ${h}`} role="group" aria-label="Карта складов и магазинов. Соседние перекрёстки находятся в одном километре друг от друга.">
    <rect width={w} height={h} rx="10" fill="#e1ebe0"/>
    {Array.from({length:town.cols-1},(_,x)=>Array.from({length:6},(_,y)=><g key={x+'-'+y}><rect x={px(x)+4} y={py(y)+4} width={gap-8} height={gap-8} rx="5" fill={(x+2*y)%5===0?'#b8d2af':'#d4dcd1'}/>
      {(x+2*y)%5===0?<g fill="#8eaf88"><circle cx={px(x)+14} cy={py(y)+16} r="4"/><circle cx={px(x)+24} cy={py(y)+22} r="5"/></g>:<path d={`M${px(x)+11} ${py(y)+12}h12v6h-6v8h-6z`} fill="#b9c6bd"/>}</g>))}
    {Array.from({length:town.cols},(_,x)=><path key={x} d={`M${px(x)} 0V${h}`} stroke="#fffaf0" strokeWidth="5"/>)}
    {Array.from({length:7},(_,y)=><path key={y} d={`M0 ${py(y)}H${w}`} stroke="#fffaf0" strokeWidth="5"/>)}
    {trips.map(t=><path className="assigned-route" key={t.i+'-'+t.j} d={street(t.i,t.j)} fill="none" stroke={town.colors[t.i]} strokeWidth="3.5" opacity=".82" strokeLinejoin="round"><title>{'A'+LU.sub(t.i+1)+' → B'+LU.sub(t.j+1)+' · '+t.q+' ящ.'}</title></path>)}
    {!run&&<path d={street(i,j)} fill="none" stroke={town.colors[i]} strokeWidth="2" strokeDasharray="4 4"/>}
    {town.a.map((p,k)=>stop('A',p,k))}{town.b.map((p,k)=>stop('B',p,k))}
    {run?.trips.filter(t=>t.duration>elapsed).map(t=><Journey key={run.id+'-'+t.i+'-'+t.j} trip={t} a={town.a[t.i]} b={town.b[t.j]} color={town.colors[t.i]}/>)}</svg></figure>;
}
