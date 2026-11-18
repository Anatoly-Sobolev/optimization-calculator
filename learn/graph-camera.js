// The frame is fixed in SVG units. The window describes visible mathematical coordinates.
const GraphCamera=(()=>{
  const frameOf=svg=>svg.dataset.frame.split(' ').map(Number);
  function point(svg,clientX,clientY) {
    const [left,top,width,height]=frameOf(svg);
    const [x,y,w,h]=svg.dataset.window.split(' ').map(Number);
    const p=new DOMPoint(clientX,clientY).matrixTransform(svg.getScreenCTM().inverse());
    return {x:x+(p.x-left)*w/width,y:y+(top+height-p.y)*h/height};
  }
  function clip(polygon,[a,b,c,op]) {
    const result=[],edge=[];
    const sign=op==='>='?-1:1;
    polygon.forEach((p,i)=>{
      const q=polygon[(i+1)%polygon.length], u=(a*p[0]+b*p[1]-c)*sign, v=(a*q[0]+b*q[1]-c)*sign;
      if(u<=0)result.push(p);
      if(Math.abs(u)<1e-10)edge.push(p);
      if(u*v<0){
        const t=u/(u-v), cut=[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
        result.push(cut);edge.push(cut);
      }
    });
    return {result:op==='='?edge:result,edge};
  }
  function ticks(min,span,count) {
    const raw=span/count,unit=10**Math.floor(Math.log10(raw));
    const step=([1,2,5,10].find(k=>unit*k>=raw)||10)*unit;
    const values=[];
    for(let i=Math.ceil(min/step-1e-9);i<=Math.floor((min+span)/step+1e-9);i++)values.push(Number((i*step).toPrecision(10)));
    return values;
  }
  function attach(svg,state={},pointTool=false) {
    const [L,T,W,H]=frameOf(svg),[X,Y]=svg.dataset.extent.split(' ').map(Number);
    const home=[0,0,X,Y], touches=new Map(), equations=JSON.parse(svg.dataset.rows);
    const plot=svg.querySelector('.plot-world'), tickLayer=svg.querySelector('.field-ticks'),grid=svg.querySelector('.field-grid');
    const px=x=>L+x*W/X,py=y=>T+H-y*H/Y;
    const coordinates=list=>list.map(([x,y])=>px(x)+','+py(y)).join(' ');
    const rows=equations.map((_,i)=>({
      fill:plot.querySelector('.gh[data-i="'+i+'"]'), line:plot.querySelector('.gl[data-i="'+i+'"]'),
      arrows:plot.querySelector('.gside[data-i="'+i+'"]'),
      label:plot.querySelector('.glb[data-i="'+i+'"]')
    }));
    const partialRegions=[...plot.querySelectorAll('[data-s]')];
    const dots=[...plot.querySelectorAll('circle[r]')].map(el=>[el,Number(el.getAttribute('r'))]);
    const world=(x,y)=>point(svg,x,y);
    state.view??=home.slice();state.off??=new Set();
    function sync(){
      const [x,y,w,h]=state.view,k=w/X;
      svg.dataset.window=state.view.join(' ');
      svg.classList.add('camera-pan');
      plot.setAttribute('viewBox',[px(x),py(y+h),w*W/X,h*H/Y].join(' '));
      plot.style.setProperty('--camera-scale',String(k));
      dots.forEach(([el,r])=>el.setAttribute('r',r*k));
      const box=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
      let common=clip(clip(box,[1,0,0,'>=']).result,[0,1,0,'>=']).result;
      const areas=[common];
      equations.forEach((eq,i)=>{
        const {edge,result}=clip(box,eq),{fill,line,label,arrows}=rows[i];
        fill?.setAttribute('points',coordinates(result));
        if(line){
          const p=edge[0],q=edge[edge.length-1];
          line.style.visibility=edge.length>=2?'':'hidden';
          if(p&&q){
            for(const [name,value] of Object.entries({x1:px(p[0]),y1:py(p[1]),x2:px(q[0]),y2:py(q[1])}))line.setAttribute(name,value);
            if(label){label.setAttribute('x',px((p[0]+q[0])/2)+5*k);label.setAttribute('y',py((p[1]+q[1])/2)-5*k);}
          }
          if(label)label.style.visibility=line.style.visibility;
          if(arrows){
            let path='';
            if(edge.length>=2){
              const sign=eq[3]==='<='?-1:1, len=Math.hypot(eq[0],eq[1])||1;
              const dx=eq[0]*sign*13*k/len, dy=-eq[1]*sign*13*k/len;
              for(const t of [.25,.5,.75]){
                const ax=px(p[0]+(q[0]-p[0])*t), ay=py(p[1]+(q[1]-p[1])*t);
                const tipX=ax+dx,tipY=ay+dy;
                path+=`M${ax} ${ay}L${tipX} ${tipY}l${-.4*dx-.3*dy} ${-.4*dy+.3*dx}M${tipX} ${tipY}l${-.4*dx+.3*dy} ${-.4*dy-.3*dx}`;
              }
            }
            arrows.setAttribute('d',path);
          }
        }
        common=clip(common,eq).result;areas.push(common);
      });
      partialRegions.forEach(el=>el.setAttribute('points',coordinates(areas[Number(el.dataset.s)])));
      const xs=ticks(x,w,W/55),ys=ticks(y,h,H/38);
      const fx=v=>L+(v-x)*W/w,fy=v=>T+H-(v-y)*H/h;
      grid?.setAttribute('d',xs.map(v=>'M'+fx(v)+' '+T+'v'+H).concat(ys.map(v=>'M'+L+' '+fy(v)+'h'+W)).join(' '));
      tickLayer.innerHTML=xs.map(v=>'<text class="gtx" x="'+fx(v)+'" y="'+(T+H+15)+'" text-anchor="middle">'+v.toLocaleString('ru',{maximumFractionDigits:8})+'</text>').concat(ys.map(v=>'<text class="gtx" x="'+(L-6)+'" y="'+(fy(v)+3)+'" text-anchor="end">'+v.toLocaleString('ru',{maximumFractionDigits:8})+'</text>')).join('');
    }
    function zoom(f,at) {
      const [x,y,w,h]=state.view,newW=Math.min(X*20,Math.max(X/30,w*f)),k=newW/w;
      const center=at||{x:x+w/2,y:y+h/2};
      state.view=[center.x+(x-center.x)*k,center.y+(y-center.y)*k,newW,h*k];sync();
    }
    const controls=document.createElement('div');controls.className='graph-camera';
    const bar=document.createElement('div');bar.className='camera-tools';controls.append(bar);
    const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);bar.append(b);return b;};
    button('−',()=>zoom(1.3)).setAttribute('aria-label','Уменьшить масштаб');
    button('+',()=>zoom(1/1.3)).setAttribute('aria-label','Увеличить масштаб');
    button('Исходный вид',()=>{state.view=home.slice();sync()});
    const fills=[...svg.querySelectorAll('polygon.gh[data-i]')];
    const regions=[...svg.querySelectorAll('polygon.gr,.primer-region')];
    function paint(){
      fills.forEach(p=>p.classList.toggle('camera-no-fill',state.off.has(p.dataset.i)));
      regions.forEach(p=>p.classList.toggle('camera-no-fill',state.off.has('region')));
    }
    const compact=svg.classList.contains('wide-plot');
    let layers=controls;
    if(compact&&fills.length){
      layers=document.createElement('details');
      const title=document.createElement('summary');title.textContent='Слои графика';layers.append(title);controls.append(layers);
    }
    if(fills.length){
      const field=document.createElement('fieldset'), title=document.createElement('legend');title.textContent='Заливка ограничений';field.append(title);layers.append(field);
      function layer(id,name,color) {
        const label=document.createElement('label'),check=document.createElement('input');
        check.type='checkbox';check.checked=!state.off.has(id);
        check.addEventListener('change',()=>{if(check.checked)state.off.delete(id);else state.off.add(id);paint();});
        label.append(check,name);label.style.setProperty('--ink',color);field.append(label);
      }
      fills.forEach(p=>layer(p.dataset.i,'№ '+(+p.dataset.i+1),p.getAttribute('fill')));
      if(regions.length)layer('region','Общая область','#698e70');
    }
    const hint=document.createElement('small');hint.textContent=pointTool?'Тяните поле для сдвига. Нажмите на сетку или перетащите точку, чтобы задать план. Колесо и жест двумя пальцами меняют масштаб.':'Тяните поле, чтобы сдвинуть график. Колесо или два пальца меняют масштаб.';(compact?layers:controls).append(hint);
    svg.after(controls);svg.classList.add('camera-surface');sync();paint();
    const ac=new AbortController(),on=(t,fn)=>svg.addEventListener(t,fn,{capture:true,passive:false,signal:ac.signal});
    const intercept=e=>{e.stopPropagation();e.preventDefault();};
    on('wheel',e=>{intercept(e);zoom(Math.exp(Math.sign(e.deltaY)*.14),world(e.clientX,e.clientY));});
    let gesture=null;
    const pick=e=>svg.dispatchEvent(new CustomEvent('graphpick',{detail:world(e.clientX,e.clientY)}));
    on('pointerdown',e=>{
      if(e.button!==0)return;
      intercept(e);svg.setPointerCapture(e.pointerId);
      touches.set(e.pointerId,[e.clientX,e.clientY]);
      if(touches.size===1){
        gesture={start:[e.clientX,e.clientY],moving:false,point:pointTool&&e.target.matches('[data-plan-point]'),multi:false};
        if(pointTool)svg.focus({preventScroll:true});
      }else{gesture.multi=true;gesture.point=false;}
    });
    on('pointermove',e=>{
      const old=touches.get(e.pointerId);
      if(!old||!gesture)return;
      intercept(e);
      const now=[e.clientX,e.clientY],other=[...touches].find(([id])=>id!==e.pointerId)?.[1];
      if(!gesture.moving&&!other&&Math.hypot(now[0]-gesture.start[0],now[1]-gesture.start[1])<3)return;
      gesture.moving=true;
      touches.set(e.pointerId,now);
      if(gesture.point){pick(e);return;}
      const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
      const before=world(...(other?mid(old,other):old));
      if(other&&dist(now,other)>2&&dist(old,other)>2)zoom(dist(old,other)/dist(now,other),before);
      const after=world(...(other?mid(now,other):now));
      state.view[0]+=before.x-after.x;state.view[1]+=before.y-after.y;sync();
    });
    on('pointerup',e=>{
      if(pointTool&&touches.has(e.pointerId)&&gesture&&!gesture.multi&&!gesture.moving)pick(e);
      touches.delete(e.pointerId);
    });
    for(const t of ['pointercancel','lostpointercapture'])on(t,e=>touches.delete(e.pointerId));
    return ()=>{ac.abort();controls.remove();};
  }
  return {attach,point};
})();
