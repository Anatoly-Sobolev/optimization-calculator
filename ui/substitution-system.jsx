import React,{useLayoutEffect,useRef} from 'react';

const valueText = v => v==null?'□':v.s<0?'('+LU.txt(v)+')':LU.txt(v);
function Terms({weights,letter,plan,active}){
  const terms=[];
  weights.forEach((a,j)=>{
    if(!a.s)return;
    const sign=a.s<0?'−':terms.length?'+':'',symbol=letter+LU.sub(j+1);
    terms.push(<span className="calc-term" key={j}>{sign}{(!a.abs().eq(1)||plan)&&<>{LU.txt(a.abs())}·</>}{plan?<mark data-slot={j} data-current={j===active} title={symbol+' = '+LU.txt(plan[j])}>{valueText(plan[j])}</mark>:<span data-current={j===active}>{symbol}</span>}</span>);
  });
  return terms.length?terms:'0';
}
export function SubstitutionSystem({model,world,plan,letter='x',active,change}){
  const ref=useRef(null);
  useLayoutEffect(()=>{
    const host=ref.current,desk=host.closest('[data-plan-desk]');
    if(!change||LU.reduced()||!desk||!host.getClientRects().length)return;
    const source=desk.querySelector('[data-source="'+active+'"]');
    if(!source||!plan[active])return;
    const start=source.getBoundingClientRect();
    const animations=[];
    for(const slot of host.querySelectorAll('[data-slot="'+active+'"]')){
      const dest=slot.getBoundingClientRect();
      if(dest.top>=innerHeight||dest.bottom<=0||!dest.width)continue;
      const token=document.createElement('i');
      token.className='substitution-flight';token.setAttribute('aria-hidden','true');token.textContent=LU.txt(plan[active]);
      slot.append(token);
      const dx=start.x+start.width/2-dest.x-dest.width/2,dy=start.y+start.height/2-dest.y-dest.height/2;
      const anim=token.animate([{transform:'translate('+dx+'px,'+dy+'px)',opacity:0},{opacity:.95,offset:.16},{transform:'translate(0,0)',opacity:1}],{duration:580,easing:'ease-out'});
      anim.onfinish=()=>token.remove();
      animations.push(()=>{anim.cancel();token.remove();});
    }
    return ()=>animations.forEach(stop=>stop());
  },[change]);
  const ready=plan.every(Boolean),checks=ready?ALG.check(model,plan):[];
  return <section className="sub-system" ref={ref}><h4>Подстановка в систему условий</h4><p>Верхняя строка — условие. Под ней те же буквы заменены числами вашего плана.</p>
    <ol>{model.rows.map((row,i)=>{
      const check=checks[i],sign=R.sg(row.s),rhs=LU.txt(row.b),[resource,unit]=world.rows[i];
      const gap=check?row.b.sub(check.lhs):null;
      const mismatch=check&&!check.ok?(gap.s>0?'не хватает ':'превышение на ')+LU.txt(gap.abs())+' '+unit:'';
      return <li key={i}><div className="calc-heading"><b>{resource}</b><small data-ok={check?.ok}>{check?(check.ok?'✓ Выполнено':'× Нарушено · '+mismatch):'Введите число'}</small></div>
        <div className="calc-symbols"><Terms weights={row.a} letter={letter} active={active}/> {sign} {rhs}</div>
        <div className="calc-values"><Terms weights={row.a} letter={letter} plan={plan} active={active}/>{check&&<> = <b>{LU.txt(check.lhs)}</b> <span className="calc-check">{check.ok?sign:check.lhs.lt(row.b)?'<':'>'} {rhs} {unit}</span></>}</div></li>;
    })}</ol></section>;
}
