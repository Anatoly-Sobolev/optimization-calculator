import React,{useMemo,useState} from 'react';
import {Minus,Plus,Bookmark} from 'lucide-react';
import {TrialChallenge} from './trial-challenge.jsx';
import {LessonArt} from './lesson-art.jsx';
import {CoordinateField} from './coordinate-field.jsx';

import {SubstitutionSystem} from './substitution-system.jsx';
import {deskContext} from './lesson-context.jsx';

const numberOf=s=>{try{return Q.parse(s);}catch{return null;}};
const name=(letter,j)=>letter+LU.sub(j+1);
function canonicalModel(d){
  const {rows,c,sense}=d.variant;
  return {n:c.length,rows:rows.map(r=>({...r,b:Q.of(r.b),a:r.a.map(Q.of)})),c:c.map(Q.of),sense};
}
function LinearDesk({data,model,letter,topic}){
  const minimum=topic==='canon'?data.rec.canon.info.find(v=>v.kind==='ge'):null;
  const initial=topic==='optcheck'?data.xbar.map(LU.txt):model.c.map((_,j)=>minimum?.j===j?LU.txt(minimum.lo):'0');
  const [entries,setEntries]=useState(initial),[saved,setSaved]=useState(null);
  const plan=entries.map(numberOf),ready=plan.every(Boolean),integer=['ilp','gomory'].includes(topic);
  const checks=ready?ALG.check(model,plan):[],objective=ready?LSCENE.objValue(model,plan):null;
  const [change,setChange]=useState(null),[selected,setSelected]=useState(0);
  const world=deskContext(data,letter==='y');
  function write(j,value){
    setSelected(j);setChange({j,previous:entries.map(numberOf)});
    setEntries(prev=>prev.map((old,k)=>j===k?value:old));
  }
  function bounds(j){
    if(topic==='canon')return data.variant.bounds.filter(b=>b.j===j);
    const sign=model.signs?.[j]??'>=';
    return sign==='free'?[]:[{s:sign,b:0}];
  }
  function boundsOk(v,b){return b.s==='>='?v.ge(b.b):b.s==='<='?v.le(b.b):v.eq(b.b);}
  const invalid=ready?plan.findIndex((v,j)=>bounds(j).some(b=>!boundsOk(v,b))||(integer&&!v.isInt())):-1;
  const valid=ready&&invalid===-1&&checks.every(c=>c.ok),failed=checks.findIndex(c=>!c.ok);
  const large=model.sense==='max';
  const target=useMemo(()=>{
    if(integer)return data.rec.gomory;
    if(topic==='canon'){
      const bounds=data.variant.bounds.map(b=>({...b,b:Q.of(b.b)}));
      return ALGZ.solve(ALGZ.normalize({...model,bounds}));
    }
    return ALGZ.solve(model);
  },[data,model,topic,integer]);
  const extent=useMemo(()=>{
    if(topic!=='graph')return 1;
    const intercepts=model.rows.flatMap(r=>r.a.map(a=>a.s?LU.num(r.b.div(a)):0));
    return Math.ceil(Math.max(2,...intercepts));
  },[model,topic]);
  const status=!ready?'Введите число или дробь в каждое поле.':invalid>=0?'«'+world.variables[invalid][0]+'»: '+LU.txt(plan[invalid])+' '+world.variables[invalid][2]+'. Нужно '+(integer&&!plan[invalid].isInt()?'целое число':bounds(invalid).map(b=>name(letter,invalid)+' '+R.sg(b.s)+' '+LU.txt(b.b)).join(', '))+'.':failed>=0?'Пока нарушено условие «'+world.rows[failed][0]+'»: '+LU.txt(checks[failed].lhs)+' при требовании '+R.sg(model.rows[failed].s)+' '+LU.txt(model.rows[failed].b)+' '+world.rows[failed][1]+'.':'План допустим. Все условия выполнены.';
  const changedRow=change?Math.max(0,model.rows.findIndex(row=>row.a[change.j].s!==0)):0;
  const previous=change?.previous.every(Boolean)&&ready?ALG.check(model,change.previous)[changedRow].lhs:null;
  function replacePlan(values){setChange(null);setEntries(values);}

  const conditions=<SubstitutionSystem model={model} world={world} plan={plan} letter={letter} active={selected} change={change}/>;
  return <div className="trial-spread linear-workbench" data-plan-desk=""><div><h2>{letter==='y'?'Назначьте оценки ресурсам':'Составьте свой план'}</h2><p className="plan-purpose">{world.goal}</p>
    <div className="trial-values">{entries.map((value,j)=>{
      const id=name(letter,j),limits=bounds(j),parsed=plan[j],[label,Icon,unit]=world.variables[j];
      return <div key={id} role="group" aria-label={label+', '+unit} className="variable-control" data-active={selected===j} data-invalid={invalid===j||!parsed} onFocus={()=>setSelected(j)}><b><Icon aria-hidden="true"/>{label}</b><small>{id} · {unit} · {limits.length?limits.map(b=>R.sg(b.s)+' '+LU.txt(b.b)).join(', '):'любой знак'}{integer?' · целое':''}</small><span className="trial-stepper"><button type="button" aria-label={'Уменьшить '+id} onClick={()=>write(j,LU.txt((parsed??Q.of(0)).sub(1)))}><Minus/></button>
      <input data-source={j} aria-label={id} title={label+', '+unit} aria-invalid={!parsed||invalid===j} type="text" maxLength={24} value={value} onChange={e=>write(j,e.target.value)}/><button type="button" aria-label={'Увеличить '+id} onClick={()=>write(j,LU.txt((parsed??Q.of(0)).add(1)))}><Plus/></button></span>
      {!parsed&&<small className="number-error">Введите число, например 1 или 1/2.</small>}
      </div>;
    })}</div>
    {previous&&<div className="effect-receipt" role="status"><strong>{world.variables[change.j][0]} · {LU.txt(change.previous[change.j])} → {LU.txt(plan[change.j])} {world.variables[change.j][2]}</strong>
      <span>{world.rows[changedRow][0]} · {LU.txt(previous)} → {LU.txt(checks[changedRow].lhs)} {world.rows[changedRow][1]}</span>
      <span>{world.objective} · {LU.txt(LSCENE.objValue(model,change.previous))} → {LU.txt(objective)} {world.money}</span></div>}
    <div className="trial-actions"><button disabled={!ready} onClick={()=>setSaved({value:objective,valid,entries:[...entries]})}><Bookmark/>Запомнить для сравнения</button>
    {saved&&<button onClick={()=>replacePlan([...saved.entries])}>Вернуть этот план</button>}</div>
    {saved&&<p className="trial-term">Запомнен план ({saved.entries.join('; ')}) · {saved.valid?'допустимый':'недопустимый'}. {objective&&<>Цель была {LU.txt(saved.value)}, сейчас {LU.txt(objective)}.</>}</p>}
    {topic==='graph'&&conditions}</div><div className={'trial-board primer-art'+(topic==='graph'?' graph-workspace':'')}>
    {topic==='graph'&&<CoordinateField model={model} maxX={extent} maxY={extent} wide region label="Выберите точку своего плана" onPlace={coords=>replacePlan(coords.map(String))}>{({sx,sy})=>ready&&<circle data-plan-point="" cx={sx(plan[0])} cy={sy(plan[1])} r="5" fill={valid?'#21634d':'#ad5436'} stroke="white" strokeWidth="2"/>}</CoordinateField>}
    {topic==='graph'&&<p className="graph-reading">Нажмите на поле, чтобы выбрать метры льна и шёлка. Для каждой прямой цветом выделена сторона, где выполнено её условие. В зелёной области выполнены все условия. Пунктирные оси показывают, где выпуск равен нулю.</p>}
    {topic==='canon'&&<><h3>Ваш заказ</h3><LessonArt scene="minimum" volumes={plan} minimum={LU.num(minimum.lo)} left={'Светлая · '+(plan[0]?LU.txt(plan[0])+' л':'укажите объём')} right={'Синяя · '+(plan[1]?LU.txt(plan[1])+' л':'укажите объём')}/>
      {ready&&<p className="mix-receipt">{plan[minimum.j].lt(minimum.lo)?'До обязательного объёма синей смеси не хватает '+LU.txt(minimum.lo.sub(plan[minimum.j]))+' л.':'Синяя смесь: '+LU.txt(minimum.lo)+' л обязательно + '+LU.txt(plan[minimum.j].sub(minimum.lo))+' л добавки.'} На литр светлой смеси требуется {LU.txt(model.rows[0].a[0])} ед. связующего, на литр синей — {LU.txt(model.rows[0].a[1])}. Для этого заказа нужно {LU.txt(checks[0].lhs)} ед. при запасе {LU.txt(model.rows[0].b)}.</p>}
      {conditions}</>}
    {topic!=='graph'&&topic!=='canon'&&conditions}
    <div className="trial-verdict" role="status"><b>{status}</b>{ready&&<span>{world.objective} · {LU.txt(objective)} {world.money}</span>}</div>
    <TrialChallenge value={objective} valid={valid} enabled={ready} reason={status} optimum={target.f} alternative={target.status} maximize={large} steps={ready?['План ('+entries.join('; ')+')','Выполнено условий: '+checks.filter(c=>c.ok).length+' из '+checks.length,'Цель · '+LU.txt(objective)]:[]}/></div></div>;
}
export function LinearTrial({data}){
  const dual=['dual','duality'].includes(data.type),[side,setSide]=useState(dual?'dual':'primal');
  const canon=useMemo(()=>data.type==='canon'?canonicalModel(data):null,[data]);
  return <>{dual&&<div className="trial-actions trial-sides">{[['primal','Количества x'],['dual','Оценки y']].map(([key,label])=><button key={key} aria-pressed={side===key} onClick={()=>setSide(key)}>{label}</button>)}</div>}
    {dual?['dual','primal'].map(key=><div key={key} hidden={key!==side}><LinearDesk data={data} model={key==='dual'?data.D:data.P} letter={key==='dual'?'y':'x'} topic="dual"/></div>):<LinearDesk data={data} model={canon??data.P} letter="x" topic={data.type}/>}</>;
}
