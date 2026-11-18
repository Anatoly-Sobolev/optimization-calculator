import React,{useMemo,useState} from 'react';
import {Minus,Plus,Bookmark} from 'lucide-react';
import {TrialChallenge} from './trial-challenge.jsx';
import {CoordinateField} from './coordinate-field.jsx';

const topics={
  graph:['Какую точку можно выбрать?','Две координаты точки — это два количества в плане. Щёлкните на чертеже или измените числа. Проверьте, какие условия выполняются одновременно.'],
  simplex:['Сколько единиц каждого вида взять?','Выберите количества. В каждой строке условия они учитываются со своими коэффициентами. Измените одно число и проследите, как изменятся расход и значение цели.'],
  artificial:['Как найти план, с которого можно начать?','Попробуйте подобрать количества, которые подходят сразу ко всем условиям. Знак «=» требует точного совпадения, а «≥» задаёт нижнюю границу.'],
  dsx:['Как выполнить требования к плану?','Меняйте количества и смотрите, в какой строке ещё не достигнут минимум. Допустимым станет план, который удовлетворяет всем строкам.'],
  dsimplex:['Какие количества согласуются между собой?','В этом варианте условия записаны равенствами. Выберите количества и проверьте, совпадёт ли значение каждой левой части с требованием справа.'],
  canon:['Как минимум ограничивает выбор?','Введите количества в исходной задаче. Проверьте отдельно границы каждого количества и условия, связывающие их между собой.'],
  ilp:['Сколько целых изделий поместится в план?','Изделие заказывают целиком. Попробуйте целое и дробное количество. Даже когда хватает ресурса, дробь нарушает требование к заказу.'],
  gomory:['Какие планы состоят из целых количеств?','Введите план из целых чисел, затем измените одно количество на половину единицы. Сравните ограничения и требование целочисленности.'],
  optcheck:['Как проверить предложенный план?','В полях записаны предложенные в условии количества. Запомните план и измените одно из чисел. Сравните, какие ограничения выполняются и как меняется цель.'],
  dual:['Как связаны количества и оценки условий?','В прямой задаче выбирают количества x. В двойственной каждому условию ставят в соответствие оценку y. Попробуйте назначить оценки и проверьте, какие требования к ним выполнены.']
};
const numberOf=s=>{try{return Q.parse(s);}catch{return null;}};
const name=(letter,j)=>letter+LU.sub(j+1);
function expression(weights,letter){
  return weights.reduce((out,a,j)=>{
    if(!a.s)return out;
    return out+(a.s<0?' − ':out?' + ':'')+(a.abs().eq(1)?'':LU.txt(a.abs())+'·')+name(letter,j);
  },'').trim()||'0';
}
function canonicalModel(d){
  const {rows,c,sense}=d.variant;
  return {n:c.length,rows:rows.map(r=>({...r,b:Q.of(r.b),a:r.a.map(Q.of)})),c:c.map(Q.of),sense};
}
function LinearDesk({data,model,letter,topic}){
  const [run,setRun]=useState(0);
  const initial=topic==='optcheck'?data.xbar.map(LU.txt):model.c.map(()=>'0');
  const [entries,setEntries]=useState(initial),[saved,setSaved]=useState(null);
  const plan=entries.map(numberOf),ready=plan.every(Boolean),integer=['ilp','gomory'].includes(topic);
  const checks=ready?ALG.check(model,plan):[],objective=ready?LSCENE.objValue(model,plan):null;
  function write(j,value){setEntries(prev=>prev.map((old,k)=>j===k?value:old));}
  function bounds(j){
    if(topic==='canon')return data.variant.bounds.filter(b=>b.j===j);
    const sign=model.signs?.[j]??'>=';
    return sign==='free'?[]:[{s:sign,b:0}];
  }
  function boundsOk(v,b){return b.s==='>='?v.ge(b.b):b.s==='<='?v.le(b.b):v.eq(b.b);}
  const invalid=ready?plan.findIndex((v,j)=>bounds(j).some(b=>!boundsOk(v,b))||(integer&&!v.isInt())):-1;
  const valid=ready&&invalid===-1&&checks.every(c=>c.ok),failed=checks.findIndex(c=>!c.ok);
  const [title,copy]=topics[topic],large=model.sense==='max';
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
  const status=!ready?'Введите число или дробь в каждое поле.':invalid>=0?'План нарушает требование к '+name(letter,invalid)+'.':failed>=0?'План недопустим. Проверьте условие '+(failed+1)+'.':'План допустим. Все условия выполнены.';
  const conditions=<><h3>Условия вашего варианта</h3><ul className="trial-conditions" key={run} data-animate={run>0}>{model.rows.map((r,k)=>{
    const check=checks[k],left=check?LU.num(check.lhs):0,bound=LU.num(r.b),low=Math.min(0,left,bound);
    const position=v=>(3+94*(v-low)/(Math.max(0,left,bound)-low||1))+'%';
    return <li key={k} style={{'--order':k}}><span>{k+1}. {expression(r.a,letter)} {R.sg(r.s)} {LU.txt(r.b)}</span>
      <b data-ok={check?.ok}>{check?LU.txt(check.lhs)+' '+R.sg(r.s)+' '+LU.txt(r.b)+(check.ok?' ✓':' ✕'):'—'}</b>
      {check&&<div className="constraint-track" aria-hidden="true"><i style={{left:position(bound)}}/><em data-ok={check.ok} style={{left:position(left)}}/></div>}</li>;
  })}</ul><small>Точка — значение вашей левой части. Черта — граница условия.</small></>;
  return <div className="trial-spread"><div><h2>{title}</h2><p>{copy}</p>
    <h3>{letter==='y'?'Ваши оценки условий':'Ваши количества'}</h3>
    <div className="trial-values">{entries.map((value,j)=>{
      const id=name(letter,j),limits=bounds(j),parsed=plan[j];
      return <label key={id}><b>{id}</b><span className="trial-stepper"><button type="button" aria-label={'Уменьшить '+id} onClick={()=>write(j,LU.txt((parsed??Q.of(0)).sub(1)))}><Minus/></button>
      <input aria-label={id} type="text" maxLength={24} value={value} onChange={e=>write(j,e.target.value)}/><button type="button" aria-label={'Увеличить '+id} onClick={()=>write(j,LU.txt((parsed??Q.of(0)).add(1)))}><Plus/></button></span>
      <small>{limits.length?limits.map(b=>id+' '+R.sg(b.s)+' '+LU.txt(b.b)).join(', '):'Любой знак'}{integer?' · целое':''}</small></label>;
    })}</div>
    <p className="trial-term">Цель — {large?'увеличить':'уменьшить'} значение выражения {expression(model.c,letter)}. Сравнивать по цели можно планы, которые удовлетворяют всем условиям.</p>
    <div className="trial-actions"><button disabled={!ready} onClick={()=>setSaved({value:objective,valid,entries:[...entries]})}><Bookmark/>Запомнить для сравнения</button>
    {saved&&<button onClick={()=>setEntries([...saved.entries])}>Вернуть этот план</button>}</div>
    {saved&&<p className="trial-term">Запомнен план ({saved.entries.join('; ')}) · {saved.valid?'допустимый':'недопустимый'}. {objective&&<>Цель была {LU.txt(saved.value)}, сейчас {LU.txt(objective)}.</>}</p>}
    {topic==='graph'&&conditions}</div><div className="trial-board primer-art">
    {topic==='graph'&&<CoordinateField model={model} maxX={extent} maxY={extent} region label="Выберите точку своего плана" onPlace={coords=>setEntries(coords.map(String))}>{({sx,sy})=>ready&&<circle cx={sx(plan[0])} cy={sy(plan[1])} r="5" fill={valid?'#21634d':'#ad5436'} stroke="white" strokeWidth="2"/>}</CoordinateField>}
    {topic!=='graph'&&conditions}
    <div className="trial-verdict" role="status"><b>{status}</b>{ready&&<span>Значение цели · {LU.txt(objective)}</span>}</div>
    <TrialChallenge onAttempt={()=>setRun(n=>n+1)} value={objective} valid={valid} enabled={ready} reason={status} optimum={target.f} alternative={target.status} maximize={large} steps={ready?['План ('+entries.join('; ')+')','Выполнено условий: '+checks.filter(c=>c.ok).length+' из '+checks.length,'Цель · '+LU.txt(objective)]:[]}/></div></div>;
}
export function LinearTrial({data}){
  const dual=['dual','duality'].includes(data.type),[side,setSide]=useState(dual?'dual':'primal');
  const canon=useMemo(()=>data.type==='canon'?canonicalModel(data):null,[data]);
  return <>{dual&&<div className="trial-actions trial-sides">{[['primal','Количества x'],['dual','Оценки y']].map(([key,label])=><button key={key} aria-pressed={side===key} onClick={()=>setSide(key)}>{label}</button>)}</div>}
    {dual?['dual','primal'].map(key=><div key={key} hidden={key!==side}><LinearDesk data={data} model={key==='dual'?data.D:data.P} letter={key==='dual'?'y':'x'} topic="dual"/></div>):<LinearDesk data={data} model={canon??data.P} letter="x" topic={data.type}/>}</>;
}
