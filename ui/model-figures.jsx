import React from 'react';

export function RowChecks({model,plan,selected}){
  const checks=ALG.check(model,plan);
  return <figure className="model-figure conditions"><figcaption>Проверка плана по условиям</figcaption>
    <ul>{checks.map((check,i)=>{
      const row=model.rows[i],a=LU.num(check.lhs),b=LU.num(row.b);
      const low=Math.min(0,a,b),range=Math.max(a,b,0)-low||1;
      const position=v=>5+90*(v-low)/range;
      const bound=position(b),value=position(a);
      return <li key={i} data-current={i===selected||undefined}><span>№ {i+1}</span>
        <span className="condition-track" aria-hidden="true"><i style={{left:(row.s==='<='?0:bound)+'%',width:(row.s==='<='?bound:row.s==='>='?100-bound:0)+'%'}}/>
          <em style={{left:bound+'%'}}/><b data-ok={check.ok} style={{left:value+'%'}}/></span>
        <strong>{LU.txt(check.lhs)} {R.sg(row.s)} {LU.txt(row.b)} <span aria-label={check.ok?'выполнено':'нарушено'}>{check.ok?'✓':'✕'}</span></strong></li>;
    })}</ul><small>Точка — значение при выбранном плане. Черта — граница условия, заливка — разрешённая сторона.</small></figure>;
}

export function PartsBar({parts,total,label}){
  const denom=Math.max(1e-12,LU.num(total));
  return <figure className="model-figure parts-figure"><figcaption>{label}</figcaption>
    <div className="parts-track" aria-hidden="true">{parts.map(([name,v],i)=><i key={name} style={{width:Math.max(0,100*LU.num(v)/denom)+'%',background:palette[i%palette.length]}}/>)}</div>
    <div className="parts-key">{parts.map(([name,v],i)=><span key={name}><i style={{background:palette[i%palette.length]}}/>{name} <b>{LU.txt(v)}</b></span>)}</div></figure>;
}
const palette=['#256853','#c08442','#577c9c','#986f92','#87884c'];

export function WorkSchedule({net,selected,critical=false}){
  const starts=new Map(net.fwd.map(row=>[row.e,row.val])),total=LU.num(net.T)||1;
  return <figure className="model-figure schedule"><figcaption>Работы проекта · шкала времени от 0 до {LU.txt(net.T)}</figcaption>
    <ul>{net.arcInfo.map(a=>{
      const start=starts.get(a.i),end=start.add(a.d),active=critical?a.crit:selected?.i===a.i&&selected?.j===a.j;
      return <li key={a.i+'-'+a.j} data-active={active||undefined}><span>{a.i} → {a.j}</span><div aria-hidden="true"><i style={{left:100*LU.num(start)/total+'%',width:100*LU.num(a.d)/total+'%'}}/></div>
        <span>{LU.txt(start)}–{LU.txt(end)}</span></li>;
    })}</ul><small>{critical?'Тёмные полосы — работы с нулевым резервом. Их задержка сдвигает срок проекта.':'Длина полосы равна длительности работы. Справа указаны её раннее начало и конец.'}</small></figure>;
}
