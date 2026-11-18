import React,{useState} from 'react';
import {CoordinateField} from './coordinate-field.jsx';
import {lessonContext} from './lesson-context.jsx';
import {SubstitutionSystem} from './substitution-system.jsx';

// For a multi-variable problem start at the actual first feasible basis.
function initialPlan(data){
  const first=data.type==='simplex'&&data.rec.lp?.phase2?.steps[0];
  return data.P.c.map((_,j)=>{
    const i=first?first.basis.findIndex(k=>first.vars[k].kind==='x'&&first.vars[k].k===j+1):-1;
    return i<0?Q.of(0):first.rows[i].b;
  });
}
export function PlanProbe({data}){
  const p=data.P,world=lessonContext(data),graph=data.type==='graph';
  const [plan,setPlan]=useState(()=>initialPlan(data)),[active,setActive]=useState(null);
  const [label,,unit]=world.variables[0];
  const checks=ALG.check(p,plan),fail=checks.findIndex(row=>!row.ok);
  const bad=plan.some(x=>x.s<0),total=LSCENE.objValue(p,plan);
  const extent=Math.ceil(Math.max(3,...p.rows.flatMap(r=>r.a.slice(0,2).map(a=>a.s?LU.num(r.b.div(a)):0))));
  function change(j,n){setActive(j);setPlan(prev=>prev.map((v,k)=>k===j?n:v));}
  return <section className="guided-probe" data-plan-desk=""><h4>{graph?'Какие заказы попадают в зелёную область?':'Сколько можно прибавить к первому выпуску?'}</h4>
    <p>{graph?'Точка — один заказ ткани. Нажмите на график. Справа видно, какие ограничения выполняются при этих метрах льна и шёлка.':'Начните с плана первой таблицы. Прибавьте 1 '+unit+' в поле «'+label+'». Остальные значения останутся прежними. Узнайте, какая строка первой помешает увеличению.'}</p>
    <div className="probe-spread"><div>{graph&&<CoordinateField model={p} maxX={extent} maxY={extent} wide region label="Заказ ткани на плоскости" onPlace={xy=>{setActive(null);setPlan(xy.map(v=>Q.of(v)));}}>{({sx,sy})=><circle data-plan-point="" cx={sx(plan[0])} cy={sy(plan[1])} r="5" fill={fail<0&&!bad?'#21634d':'#ad5436'} stroke="white" strokeWidth="2"/>}</CoordinateField>}
    <dl className="probe-amounts">{world.variables.map(([name,Icon,u],j)=><div key={j}><dt><Icon size={16}/> {name} <small>x{LU.sub(j+1)}</small></dt><dd><output data-source={j}>{LU.txt(plan[j])}</output> {u}</dd></div>)}</dl>
    <div className="trial-actions">{!graph&&<button className="trial-primary" onClick={()=>change(0,plan[0].add(1))}>Прибавить 1 {unit} · {label}</button>}<button onClick={()=>{setActive(null);setPlan(initialPlan(data));}}>Начать сначала</button></div>
    <p role="status">{bad?'Выпуск должен быть неотрицательным.':fail<0?'Все условия выполнены.':'Нарушено условие «'+world.rows[fail][0]+'».'} {world.objective} · {LU.txt(total)} {world.money}.</p></div>
    <SubstitutionSystem model={p} world={world} plan={plan} active={active} change={active==null?null:plan}/></div></section>;
}
