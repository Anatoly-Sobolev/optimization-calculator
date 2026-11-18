import React,{useState,useEffect,useRef} from 'react';
import {Button} from '@heroui/react/button';

// Show the first-quadrant slice x3 = … = 0. Only drawing uses floating point.
function boundary(a,b,limit,extent) {
  const hits = [];
  function add(x,y) {
    if (x>=0 && x<=extent && y>=0 && y<=extent && !hits.some(([u,v])=>u===x && v===y)) hits.push([x,y]);
  }
  if (b) { add(0,limit/b); add(extent,(limit-a*extent)/b); }
  if (a) { add(limit/a,0); add((limit-b*extent)/a,extent); }
  return hits.length>1 ? hits : null;
}

export function PlanProbe({model}) {
  const plane=useRef(null);
  useEffect(()=>GraphCamera.attach(plane.current,{},true),[model]);
  const [point,setPoint] = useState([0,0]);
  const cuts = model.rows.map(row=>[...row.a.slice(0,2).map(LU.num),LU.num(row.b)]);
  const intercepts = cuts.flatMap(([a,b,c])=>[a?c/a:0,b?c/b:0]).filter(v=>v>0);
  const unit = Math.max(1,Math.ceil(Math.max(4,...intercepts)/4)), extent = 4*unit;
  const grid = [0,unit,2*unit,3*unit,extent];
  const px = x=>34+220*x/extent, py = y=>248-220*y/extent;
  const clamp = n=>Math.max(0,Math.min(extent,Math.round(n*10)/10));
  const x = model.c.map((_,j)=>Q.of(point[j] || 0));
  const checks = ALG.check(model,x), valid = checks.every(c=>c.ok);
  function select(event) {
    const svg = event.currentTarget;
    const local = new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    setPoint([clamp((local.x-34)*extent/220),clamp((248-local.y)*extent/220)]);
  }
  return <div><h4>Проверить план по координатам</h4>
    <p>Каждая точка задаёт план. Передвиньте её щелчком на сетке или ползунками. Следите, какие условия выполняются и как меняется значение цели. В этом варианте его нужно {model.sense==='max'?'увеличить':'уменьшить'}.
      {model.c.length>2 && ' В этом сечении остальные переменные равны нулю.'}</p>
    <div className="probe-layout"><div><svg ref={plane} className="probe-plane" viewBox="0 0 283 280" role="img" aria-label={'План ('+point.join('; ')+')'} onClick={select}>
      {GraphCamera.halfplanes(model.rows,extent,extent,px,py).filter(shape=>shape.points).map(({i,points})=><polygon className="gh" data-i={i} key={i} points={points} fill={['#657fc3','#ba793a','#4b916f','#c16883'][i%4]} opacity=".14"/>)}
      {grid.map(v=><g key={v}><path d={`M${px(v)} 28V248 M34 ${py(v)}H254`} fill="none" stroke="#d5dfd4"/>
        <text x={px(v)} y="264" textAnchor="middle">{v}</text><text x="27" y={py(v)+3} textAnchor="end">{v}</text></g>)}
      <path d="M34 22V248H261" fill="none" stroke="#36543f"/><text x="259" y="240">x₁</text><text x="39" y="20">x₂</text>
      {cuts.map(([a,b,c],i)=>{const line=boundary(a,b,c,extent);return line && <g key={i}><line x1={px(line[0][0])} y1={py(line[0][1])} x2={px(line[1][0])} y2={py(line[1][1])} stroke={checks[i].ok?'#619071':'#ab5936'} strokeWidth="1.6"/><text x={px(line[0][0]+(line[1][0]-line[0][0])*.42)+3} y={py(line[0][1]+(line[1][1]-line[0][1])*.42)-3}>{i+1}</text></g>;})}
      <circle cx={px(point[0])} cy={py(point[1])} r="5" fill={valid?'#215a41':'#ad5233'} stroke="white" strokeWidth="2"/>
    </svg></div><div className="probe-values">
      {['x₁','x₂'].map((name,i)=><label key={name}>{name}<input type="range" min="0" max={extent} step=".1" value={point[i]} onChange={e=>setPoint(point.map((n,j)=>j===i?+e.target.value:n))}/><output>{point[i]}</output></label>)}
      <p role="status">{valid?'План допустим':'Есть нарушение'} · Значение цели {LU.txt(LSCENE.objValue(model,x))}</p>
      <table><thead><tr><th>№ и условие</th><th>Проверка в точке</th><th>Итог</th></tr></thead><tbody>{checks.map((c,i)=><tr key={i}><th scope="row"><span>{i+1}. </span><span dangerouslySetInnerHTML={{__html:R.lin(model.rows[i].a.slice(0,2),j=>R.xv(j+1))}}/> {R.sg(model.rows[i].s)} {LU.txt(model.rows[i].b)}</th><td tabIndex="0" data-origin={model.rows[i].a.map((a,j)=>'('+LU.txt(a)+') × ('+LU.txt(x[j])+')').join(' + ')+' = '+LU.txt(c.lhs)}>{LU.txt(c.lhs)} {R.sg(model.rows[i].s)} {LU.txt(model.rows[i].b)}</td><td>{c.ok?'✓ Да':'× Нет'}</td></tr>)}</tbody></table>
      <Button variant="secondary" onPress={()=>setPoint([0,0])}>В начало координат</Button>
    </div></div></div>;
}
