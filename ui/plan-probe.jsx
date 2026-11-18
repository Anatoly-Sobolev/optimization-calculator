import React,{useState} from 'react';
import {Button} from '@heroui/react/button';

import {CoordinateField} from './coordinate-field.jsx';

export function PlanProbe({model}) {
  const [point,setPoint] = useState([0,0]);
  const cuts = model.rows.map(row=>[...row.a.slice(0,2).map(LU.num),LU.num(row.b)]);
  const intercepts = cuts.flatMap(([a,b,c])=>[a?c/a:0,b?c/b:0]).filter(v=>v>0);
  const unit = Math.max(1,Math.ceil(Math.max(4,...intercepts)/4)), extent = 4*unit;
  const x = model.c.map((_,j)=>Q.of(point[j] || 0));
  const checks = ALG.check(model,x), negative=point.some(v=>v<0), valid = !negative && checks.every(c=>c.ok);
  return <div><h4>Проверить план по координатам</h4>
    <p>Каждая точка задаёт план. Передвиньте её щелчком на сетке или ползунками. Следите, какие условия выполняются и как меняется значение цели. В этом варианте его нужно {model.sense==='max'?'увеличить':'уменьшить'}.
      {model.c.length>2 && ' В этом сечении остальные переменные равны нулю.'}</p>
    <div className="probe-layout"><div><CoordinateField model={model} maxX={extent} maxY={extent} tall label={'План ('+point.join('; ')+')'} onPlace={setPoint}>
      {({sx,sy})=><circle data-plan-point="" cx={sx(point[0])} cy={sy(point[1])} r="5" fill={valid?'#215a41':'#ad5233'} stroke="white" strokeWidth="2"/>}
    </CoordinateField></div><div className="probe-values">
      {['x₁','x₂'].map((name,i)=><label key={name}>{name}<input type="range" min={Math.min(0,point[i])} max={Math.max(extent,point[i])} step=".1" value={point[i]} onChange={e=>setPoint(point.map((n,j)=>j===i?+e.target.value:n))}/><output>{point[i]}</output></label>)}
      <p role="status">{valid?'План допустим':negative?'Количество должно быть неотрицательным':'Есть нарушение'} · Значение цели {LU.txt(LSCENE.objValue(model,x))}</p>
      <table><thead><tr><th>№ и условие</th><th>Проверка в точке</th><th>Итог</th></tr></thead><tbody>{checks.map((c,i)=><tr key={i}><th scope="row"><span>{i+1}. </span><span dangerouslySetInnerHTML={{__html:R.lin(model.rows[i].a.slice(0,2),j=>R.xv(j+1))}}/> {R.sg(model.rows[i].s)} {LU.txt(model.rows[i].b)}</th><td tabIndex="0" data-origin={model.rows[i].a.map((a,j)=>'('+LU.txt(a)+') × ('+LU.txt(x[j])+')').join(' + ')+' = '+LU.txt(c.lhs)}>{LU.txt(c.lhs)} {R.sg(model.rows[i].s)} {LU.txt(model.rows[i].b)}</td><td>{c.ok?'✓ Да':'× Нет'}</td></tr>)}</tbody></table>
      <Button variant="secondary" onPress={()=>setPoint([0,0])}>В начало координат</Button>
    </div></div></div>;
}
