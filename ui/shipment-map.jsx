import React from 'react';

const {num,sub}=LU;
export function partialPlan(model,leg,amount){
  const matrix=model.P.a.map(()=>model.P.b.map(()=>null));
  model.first.steps.slice(0,leg).forEach(s=>{matrix[s.i][s.j]=num(s.x);});
  const {i,j}=model.first.steps[leg];
  matrix[i][j]=amount;
  return matrix;
}

export function Building({side,reserve}){
  if(reserve)return <path d="M1 15h17v-6H1zm3-7h11V3H4z" fill="#d4b784" stroke="#6c674e"/>;
  if(side==='supply')return <g stroke="#625a44" strokeWidth="1.25" strokeLinejoin="round"><path d="M1 8 10 2l9 6v10H1z" fill="#ddc295"/><path d="M5 18V9h10v9" fill="#fff2ce"/><path d="M6 12h8m-8 3h8"/></g>;
  return <g stroke="#3b604f" strokeWidth="1.25" strokeLinejoin="round"><path d="M2 8h16v10H2z" fill="#fff1cc"/><path d="m1 8 2-6h14l2 6z" fill="#86b394"/><path d="M5 11h4v3H5zm8 7v-7h3v7"/></g>;
}

// A shipment is an edge in the actual bipartite plan. Supply and demand labels
// are residuals after *all* the quantities currently visible on the map.
export function ShipmentMap({P,matrix,i,j,fraction,onSelect,isolated=false}){
  const height=Math.max(P.m,P.n)*35+23;
  const position=(index,count)=>21+(index+.5)*(height-23)/count;
  const left=k=>position(k,P.m),right=k=>position(k,P.n);
  const sent=matrix.map(row=>row.slice(0,P.n0).reduce((a,b)=>a+b,0));
  const received=P.b.map((_,k)=>matrix.reduce((v,row)=>v+row[k],0));
  const active=matrix[i][j],x1=106,x2=264;
  const y1=left(i),y2=right(j);
  const physical=i<P.m0&&j<P.n0;
  const progress=fraction??1;
  const vehicleStyle={
    transform:`translate(${x1+10+(x2-x1-24)*progress}px,${y1+(y2-y1)*progress-3}px)`,
    '--departure':`translate(${x1+10}px,${y1-3}px)`
  };
  const routeName=(i<P.m0?'A'+sub(i+1):'недопоставка')+' → '+(j<P.n0?'B'+sub(j+1):'резерв');
  function node(side,k,total,rest){
    const supply=side==='supply',y=supply?left(k):right(k),x=supply?1:266;
    const reserve=supply?k>=P.m0:k>=P.n0,active=supply?k===i:k===j;
    const title=reserve?(supply?'Недопоставка':'Резерв'):(supply?'Склад A':'Магазин B')+sub(k+1);
    const assigned=supply?matrix[k].reduce((sum,q)=>sum+q,0):received[k];
    const balance=isolated?assigned+' / '+num(total):(reserve?'учтено '+(num(total)-rest):rest)+' из '+num(total);
    return <g key={side+k} transform={`translate(${x} ${y-15})`} className={'shipment-stop'+(active?' chosen':'')} data-side={side}>
      <title>{title} · {balance}</title><rect width="103" height="30" rx="7"/>
      <g transform="translate(5 5)"><Building side={side} reserve={reserve}/></g>
      <text x="29" y="12" className="stop-title">{title}</text><text x="29" y="25">{balance}</text></g>;
  }
  const incoming=matrix.flatMap((row,k)=>row[j]>0?[row[j]+' (A'+sub(k+1)+')']:[]);
  const possible=fraction!=null&&num(P.a[i])>sent[i]&&j<P.n0;
  return <figure className="shipment-network"><figcaption>{j<P.n0?'Маршрут '+routeName:'Остаток на складе A'+sub(i+1)} <b>{active} ящ.</b></figcaption>
    <svg viewBox={`0 0 370 ${height}`} role={onSelect?'group':'img'} aria-label={`Склады: ${P.m0}, магазины: ${P.n0}. Выбран маршрут ${routeName}, количество ${active}.`}>
      <text x="2" y="15" className="map-heading">{isolated?'Отправлено / запас':'Осталось на складе'}</text><text x="267" y="15" className="map-heading">{isolated?'Получено / заказ':'Ещё требуется'}</text>
      {possible&&P.b.slice(0,P.n0).map((qty,l)=>l!==j&&num(qty)>received[l]&&!matrix[i][l]&&<line key={l} className="possible-leg" x1={x1} y1={y1} x2={x2} y2={right(l)}/>)}
      {!isolated&&matrix.map((row,k)=>row.map((qty,l)=>qty>0&&(k!==i||l!==j)&&<line key={k+'-'+l} className="fulfilled-leg" x1={x1} y1={left(k)} x2={x2} y2={right(l)}><title>A{k+1} → B{l+1} · {qty} ящ.</title></line>))}
      <line className="current-leg" strokeDasharray={j>=P.n0?'2 5':active?'':'5 4'} x1={x1} y1={y1} x2={x2} y2={y2}/>
      <path d="M-8 -4 0 0-8 4" fill="none" stroke="#166650" strokeWidth="2.5" transform={`translate(${x2} ${y2}) rotate(${Math.atan2(y2-y1,x2-x1)*180/Math.PI})`}/>
      {physical&&(fraction!=null||active>0)&&<g key={i+'-'+j} className={'shipment-vehicle'+(fraction==null?' deliver':'')} style={vehicleStyle} aria-hidden="true">
        <path d="M-10-9H2v8h-12z" fill="#be8844" stroke="#5c5038"/><path d="M2-6h5l4 4v1H2z" fill="#36785b" stroke="#375c46"/><circle cx="-6" r="2.5" fill="#34473a"/><circle cx="7" r="2.5" fill="#34473a"/></g>}
      {onSelect&&matrix.map((row,k)=>row.map((qty,l)=>qty>0&&<line key={k+'-'+l} role="button" tabIndex="0" className="shipment-hit" aria-label={`Выбрать A${k+1} → ${l<P.n0?'B'+(l+1):'резерв'}, ${qty} ящ.`}
        x1={x1} y1={left(k)} x2={x2} y2={right(l)} onClick={()=>onSelect([k,l])} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect([k,l]);}}}/>))}
      {P.a.map((a,k)=>node('supply',k,a,num(a)-sent[k]))}{P.b.map((b,k)=>node('demand',k,b,num(b)-received[k]))}
    </svg>
    <p className="shipment-receipt"><b>{j<P.n0?'Получено магазином B'+sub(j+1):'Учтено в резерве'}</b><span>{incoming.length?incoming.join(' + ')+' = ':''}{received[j]} из {num(P.b[j])} ящ.</span></p>
    <details className="map-legend"><summary>Обозначения маршрутов</summary><small>{j>=P.n0?'Резерв — груз, который остаётся на складе после выполнения заказов. Стрелка показывает его запись в плане.':isolated?'Стрелка соединяет склад и получателя выбранного рейса. У зданий показаны итоги по всем рейсам.':'Стрелка — выбранный рейс. Серые линии — другие поставки с грузом.'}{possible?' Пунктир от склада ведёт к открытым заказам.':''}</small></details></figure>;
}
