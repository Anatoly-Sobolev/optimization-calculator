import React,{useLayoutEffect,useRef} from 'react';

const colors=['#4772aa','#bc7333','#368568','#b45376'];
export function CoordinateField({model,maxX,maxY,tall=false,wide=false,region=false,label,children,onPlace,onKeyDown}) {
  const ref=useRef(null);
  const L=37,T=19,W=wide?380:224,H=wide?196:tall?205:130;
  const sx=x=>L+W*LU.num(x)/maxX,sy=y=>T+H-H*LU.num(y)/maxY;
  const rows=model.rows.map(r=>[LU.num(r.a[0]),LU.num(r.a[1]),LU.num(r.b),r.s]);
  const pick=useRef(onPlace);
  useLayoutEffect(()=>{pick.current=onPlace;},[onPlace]);
  useLayoutEffect(()=>{
    const field=ref.current,removeCamera=GraphCamera.attach(field,{},true);
    const select=({detail})=>pick.current([detail.x,detail.y].map(n=>Math.round(n*10)/10));
    field.addEventListener('graphpick',select);
    return ()=>{field.removeEventListener('graphpick',select);removeCamera();};
  },[model,maxX,maxY,tall,wide]);
  return <svg ref={ref} className={tall?'probe-plane':wide?'primer-plot wide-plot':'primer-plot'} viewBox={`0 0 ${wide?W+64:289} ${T+H+24}`} data-frame={[L,T,W,H].join(' ')} data-extent={[maxX,maxY].join(' ')} data-rows={JSON.stringify(rows)}
      role="img" aria-label={label} tabIndex={onKeyDown?0:undefined} onKeyDown={onKeyDown}>
    <rect className="field-paper" x={L} y={T} width={W} height={H}/>
    <path className="field-grid"/>
    <svg className="plot-world" x={L} y={T} width={W} height={H} overflow="hidden">
      {rows.map((r,i)=>r[3]!=='='&&<polygon key={i} className="gh" data-i={i} fill={colors[i%colors.length]} opacity=".13"/>)}
      {region&&<polygon className="primer-region" data-s={rows.length} fill="#b9decc" stroke="#30694f"/>}
      {rows.map((r,i)=><g key={i}><line className="gl" data-i={i} stroke={colors[i%colors.length]} strokeWidth="1.6"/>
        {tall&&<text className="glb" data-i={i}>{i+1}</text>}</g>)}
      {children({sx,sy})}
    </svg>
    <path className="field-rulers" d={`M${L} ${T-3}v${H+3}h${W+3}`}/>
    <g className="field-ticks"/><text className="field-axis" x={L-13} y={T-6}>x₂</text><text className="field-axis" x={L+W+6} y={T+H+3}>x₁</text>
  </svg>;
}
