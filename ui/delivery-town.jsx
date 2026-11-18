import React,{memo,useId,useLayoutEffect,useRef} from 'react';
function Building({side,reserve}){
  if(reserve)return <path d="M1 15h17v-6H1zm3-7h11V3H4z" fill="#d4b784" stroke="#6c674e"/>;
  if(side==='supply')return <g stroke="#625a44" strokeWidth="1.25" strokeLinejoin="round"><path d="M1 8 10 2l9 6v10H1z" fill="#ddc295"/><path d="M5 18V9h10v9" fill="#fff2ce"/><path d="M6 12h8m-8 3h8"/></g>;
  return <g stroke="#3b604f" strokeWidth="1.25" strokeLinejoin="round"><path d="M2 8h16v10H2z" fill="#fff1cc"/><path d="m1 8 2-6h14l2 6z" fill="#86b394"/><path d="M5 11h4v3H5zm8 7v-7h3v7"/></g>;
}

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
// Register the artist's street centres to the kilometre grid. Each band
// shares the next band's boundary, so a route stays on the road at any size.
const paintedRows=[0,84,209,335,535,651,770,934];
const mapRows=[0,py(0),py(1),py(2),py(4),py(5),py(6),282];
const TownArt=memo(function TownArt({town,width,height}){
  const atlas='city-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
  const extras=[...town.a,...town.b];
  const extraX=[...new Set(extras.map(p=>p[0]))].filter(x=>![0,1,3,5,6,9,11,12].includes(x));
  const extraY=[...new Set(extras.map(p=>p[1]))].filter(y=>![0,1,2,4,5,6].includes(y));
  return <g aria-hidden="true" pointerEvents="none">
    <defs><image id={atlas} href="assets/lessons/delivery-city.webp" width="1683" height="934" preserveAspectRatio="none"/></defs>
    <rect width={width} height={height} fill="#eee1c6"/>
    {mapRows.slice(0,-1).map((y,k)=><svg key={y} x="0" y={y} width="508" height={mapRows[k+1]-y}
      viewBox={`0 ${paintedRows[k]} 1683 ${paintedRows[k+1]-paintedRows[k]}`} preserveAspectRatio="none" overflow="hidden"><use href={'#'+atlas}/></svg>)}
    <g fill="none" strokeLinecap="butt">{['#aa9673','#f6e6c6'].map((stroke,i)=><path key={stroke} d={`M${px(6)} ${py(2)}H${px(11)} M${px(9)} ${py(2)}V${py(4)}`} stroke={stroke} strokeWidth={i?5:6.5}/>)}</g>
    {extraX.map(x=><path key={x} d={`M${px(x)} 0V${height}`} stroke="#f6e6c6" strokeWidth="5"/>)}
    {extraY.map(y=><path key={y} d={`M0 ${py(y)}H${width}`} stroke="#f6e6c6" strokeWidth="5"/>)}
  </g>;
});
function Journey({a,b,trip,color}){
  const motion=useRef(null);
  useLayoutEffect(()=>{motion.current?.beginElement();},[trip.i,trip.j]);
  // Parallel lanes keep trucks from the same depot distinguishable.
  const lane=(trip.j%5-2)*.85,dx=(a[0]-b[0])*gap,dy=(a[1]-b[1])*gap;
  const distance=Math.abs(dx)+Math.abs(dy);
  const covered=(trip.fraction??0)*distance;
  const x=dx-Math.sign(dx)*Math.min(Math.abs(dx),covered);
  const y=dy-Math.sign(dy)*Math.max(0,covered-Math.abs(dx));
  return <g className="fleet-truck" pointerEvents="none" transform={`translate(${px(b[0])+lane} ${py(b[1])+lane})`}>
    <title>{'A'+LU.sub(trip.i+1)+' → B'+LU.sub(trip.j+1)+' · '+trip.q+' ящ.'}</title><g transform={trip.fraction==null?undefined:`translate(${x} ${y})`}>
    {trip.fraction==null&&<animateMotion ref={motion} begin="indefinite" dur={trip.duration+'ms'} fill="freeze" path={`M${dx} ${dy}H0V0`}/>}
    <g transform="translate(0 -4)" stroke="#284335" strokeWidth="1"><rect x="-10" y="-8" width="13" height="9" rx="2" fill={color}/><path d="M3-6h5l4 4v3H3z" fill="#f4cd79"/><circle cx="-6" cy="2" r="2.3" fill="#243f36"/><circle cx="7" cy="2" r="2.3" fill="#243f36"/></g>
    <g transform="translate(0 -19)"><rect x="-9" y="-7" width="19" height="12" rx="4" fill="#fffefa" stroke={color}/>
      <text x=".5" y="2" textAnchor="middle" className="truck-load">{trip.q}</text></g>
    </g></g>;
}
export function DeliveryTown({town,stock,need,supply,demand,i,j,select,locked,trips,run,elapsed,pickRoute,preview,note}){
  const w=px(town.cols-1)+26,h=py(6)+29;
  function street(k,l){
    const a=town.a[k],b=town.b[l];
    return `M${px(a[0])} ${py(a[1])}H${px(b[0])}V${py(b[1])}`;
  }
  function routeArrow(a,b){
    const horizontal=Math.abs(a[0]-b[0])>=Math.abs(a[1]-b[1]);
    const x=horizontal?(px(a[0])+px(b[0]))/2:px(b[0]),y=horizontal?py(a[1]):(py(a[1])+py(b[1]))/2;
    const angle=horizontal?(a[0]<b[0]?0:180):(a[1]<b[1]?90:-90);
    return <path d="M-4 -4 2 0 -4 4" transform={`translate(${x} ${y}) rotate(${angle})`} stroke="#fffdf2" strokeWidth="2.3" fill="none" strokeLinejoin="round"/>;
  }
  function stop(side,p,k){
    const isA=side==='A',current=isA?i===k:j===k,tag=side+LU.sub(k+1),type=isA?'Склад':'Магазин';
    const label=type+' '+(k+1)+(isA?', осталось ':', нужно ')+(isA?stock[k]:need[k])+' ящ.';
    const left=isA?stock[k]:need[k],total=isA?supply[k]:demand[k];
    const fraction=total?Math.max(0,Math.min(1,(isA?left:total-left)/total)):0;
    const pick=()=>{if(!locked&&select)select(isA?k:i,isA?j:k);};
    return <g key={side+k} className="town-stop" transform={`translate(${px(p[0])} ${py(p[1])})`} data-side={isA?'supply':'demand'} role={select?'button':undefined} tabIndex={select&&!locked?0:undefined} aria-disabled={select?locked:undefined} aria-label={label} aria-pressed={select?current:undefined}
      onClick={pick} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}}}><title>{label}</title>
      <rect x="-15" y="-17" width="30" height="38" rx="8" fill={current?'#fff9d8':'#fffcf4'} stroke={current?'#143f40':isA?'#83613a':'#40725a'} strokeWidth={current?2:1}/>
      <g transform="translate(-10 -15)"><Building side={isA?'supply':'demand'}/></g><text y="14" textAnchor="middle">{tag}</text>
      <rect x="-10" y="16" width="20" height="2.7" rx="1.2" fill="#d9dace"/><rect x="-10" y="16" width={20*fraction} height="2.7" rx="1.2" fill={isA?'#967340':'#28765b'}/></g>;
  }
  return <figure className="town-map"><figcaption><strong>Карта доставки</strong><span>{run&&elapsed<run.end?'Машины в пути':(note??('A'+LU.sub(i+1)+' → B'+LU.sub(j+1)+' · '+town.km[i][j]+' км'))}</span></figcaption>
    <svg viewBox={`0 0 ${w} ${h}`} role="group" aria-label="Карта складов и магазинов. Цветные линии показывают назначенные рейсы.">
    <TownArt town={town} width={w} height={h}/>
    {trips.map(t=><path className="assigned-route" key={t.i+'-'+t.j} d={street(t.i,t.j)} fill="none" stroke={town.colors[t.i]} strokeWidth="3" opacity={run&&elapsed<run.end?'.86':'.52'} strokeLinejoin="round"><title>{'A'+LU.sub(t.i+1)+' → B'+LU.sub(t.j+1)+' · '+t.q+' ящ.'}</title></path>)}
    {(!run||elapsed>=run.end)&&town.a[i]&&town.b[j]&&<g pointerEvents="none">
      <path d={street(i,j)} fill="none" stroke="#fffdfa" strokeWidth="6" strokeLinejoin="round"/>
      <path className="active-street" d={street(i,j)} fill="none" stroke="#124f51" strokeWidth="3.4" strokeLinejoin="round"/>
      {routeArrow(town.a[i],town.b[j])}</g>}
    {pickRoute&&trips.map(t=><path key={t.i+'-'+t.j} d={street(t.i,t.j)} fill="none" stroke="transparent" strokeWidth="10" role="button" tabIndex="0"
      aria-label={`Выбрать A${t.i+1} → B${t.j+1}, ${t.q} ящ.`} onClick={()=>pickRoute([t.i,t.j])}
      onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();pickRoute([t.i,t.j]);}}}/>)}
    <g className="map-scale" aria-hidden="true" transform={`translate(11 15)`}><rect x="-5" y="-13" width="74" height="18" rx="4" fill="#fffaf0" opacity=".95"/><path d={`M0 -6V0h${gap}v-6`} fill="none" stroke="#304c44" strokeWidth="1.5"/><text x={gap+4} y="0" fill="#304c44" fontSize="9">1 км</text></g>
    {town.a.map((p,k)=>stop('A',p,k))}{town.b.map((p,k)=>stop('B',p,k))}
    {preview&&<Journey key={i+'-'+j+'-'+(preview.fraction==null?preview.q:'scrub')} a={town.a[i]} b={town.b[j]} trip={{...preview,duration:850,
      fraction:preview.fraction??(window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:null)}} color={town.colors[i]}/>}
    {run?.trips.filter(t=>t.duration>elapsed).map(t=><Journey key={run.id+'-'+t.i+'-'+t.j} trip={t} a={town.a[t.i]} b={town.b[t.j]} color={town.colors[t.i]}/>)}</svg></figure>;
}
