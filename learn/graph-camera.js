/* The camera changes only the SVG viewport. A hidden fill remains part of the problem. */
const GraphCamera=(()=>{
  function halfplanes(rows,xMax,yMax,sx,sy) {
    return rows.flatMap((r,i)=>{

      const box=[[0,0],[xMax,0],[xMax,yMax],[0,yMax]], result=[],edge=[];
      const side=([x,y])=>(LU.num(r.a[0])*x+LU.num(r.a[1])*y-LU.num(r.b))*(r.s==='<='?1:-1);
      box.forEach((p,k)=>{
        const q=box[(k+1)%4], a=side(p), b=side(q);
        if(a<=0) result.push(p);
        if(a===0)edge.push(p);
        if((a<0&&b>0)||(a>0&&b<0)){const cut=p.map((v,j)=>v+(q[j]-v)*a/(a-b));result.push(cut);edge.push(cut);}
      });
      const pixels=list=>list.map(([x,y])=>sx(x)+','+sy(y)).join(' ');
      return [{i,points:r.s==='='?null:pixels(result),edge:pixels(edge)}];
    });
  }
  function attach(svg,state={},pointTool=false) {
    const base=svg.viewBox.baseVal, W=base.width,H=base.height;
    if(!W||!H) return;
    const home=[base.x,base.y,W,H], touches=new Map();
    state.view??=home.slice();state.off??=new Set();state.pan??=!pointTool;
    const controls=document.createElement('div');controls.className='graph-camera';
    const bar=document.createElement('div');bar.className='camera-tools';controls.append(bar);
    const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);bar.append(b);return b;};
    const sync=()=>{svg.setAttribute('viewBox',state.view.join(' '));svg.style.aspectRatio=W+'/'+H;svg.classList.toggle('camera-pan',state.pan);};
    function local(x,y) { return new DOMPoint(x,y).matrixTransform(svg.getScreenCTM().inverse()); }
    function zoom(f,at) {
      const [x,y,w,h]=state.view, newW=Math.min(W*4,Math.max(W/15,w*f)), k=newW/w;
      const center=at||{x:x+w/2,y:y+h/2};
      state.view=[center.x+(x-center.x)*k,center.y+(y-center.y)*k,newW,h*k];sync();
    }
    if(pointTool){const mode=button('Сдвиг поля',()=>{state.pan=!state.pan;mode.setAttribute('aria-pressed',String(state.pan));sync()});mode.setAttribute('aria-pressed',String(state.pan));}
    button('−',()=>zoom(1.3)).setAttribute('aria-label','Уменьшить масштаб');
    button('+',()=>zoom(1/1.3)).setAttribute('aria-label','Увеличить масштаб');
    button('Исходный вид',()=>{state.view=home.slice();sync()});
    const fills=[...svg.querySelectorAll('polygon.gh[data-i]')];
    const regions=[...svg.querySelectorAll('polygon.gr,.primer-region')];
    function paint(){
      fills.forEach(p=>p.classList.toggle('camera-no-fill',state.off.has(p.dataset.i)));
      regions.forEach(p=>p.classList.toggle('camera-no-fill',state.off.has('region')));
    }
    if(fills.length){
      const field=document.createElement('fieldset'), title=document.createElement('legend');title.textContent='Заливка ограничений';field.append(title);controls.append(field);
      function layer(id,name,color) {
        const label=document.createElement('label'),check=document.createElement('input');
        check.type='checkbox';check.checked=!state.off.has(id);
        check.addEventListener('change',()=>{if(check.checked)state.off.delete(id);else state.off.add(id);paint();});
        label.append(check,name);label.style.setProperty('--ink',color);field.append(label);
      }
      fills.forEach(p=>layer(p.dataset.i,'№ '+(+p.dataset.i+1),p.getAttribute('fill')));
      if(regions.length)layer('region','Общая область','#698e70');
    }
    const hint=document.createElement('small');hint.textContent=pointTool?'Колесо или два пальца — масштаб. Включите сдвиг поля, чтобы перемещать график.':'Тяните поле, чтобы сдвинуть график. Колесо или два пальца меняют масштаб.';controls.append(hint);
    svg.after(controls);svg.classList.add('camera-surface');sync();paint();
    const ac=new AbortController(),on=(t,fn)=>svg.addEventListener(t,fn,{capture:true,passive:false,signal:ac.signal});
    const intercept=e=>{e.stopPropagation();e.preventDefault();};
    on('wheel',e=>{intercept(e);zoom(Math.exp(Math.sign(e.deltaY)*.14),local(e.clientX,e.clientY));});
    let dragged=false;
    on('pointerdown',e=>{if(e.button!==0)return;touches.set(e.pointerId,[e.clientX,e.clientY]);if(touches.size===1)dragged=false;
      if(state.pan||touches.size>=2){intercept(e);svg.setPointerCapture(e.pointerId);}});
    on('pointermove',e=>{
      const old=touches.get(e.pointerId);if(!old)return;
      const now=[e.clientX,e.clientY],other=[...touches].find(([id])=>id!==e.pointerId)?.[1];touches.set(e.pointerId,now);
      if(!state.pan&&!other)return;
      intercept(e);dragged=true;
      const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
      const before=local(...(other?mid(old,other):old));
      if(other&&dist(now,other)>2&&dist(old,other)>2)zoom(dist(old,other)/dist(now,other),before);
      const after=local(...(other?mid(now,other):now));state.view[0]+=before.x-after.x;state.view[1]+=before.y-after.y;sync();
    });
    for(const t of ['pointerup','pointercancel','lostpointercapture'])on(t,e=>touches.delete(e.pointerId));
    on('click',e=>{if(dragged||state.pan)intercept(e)});
    return ()=>{ac.abort();controls.remove();};
  }
  return {attach,halfplanes};
})();
