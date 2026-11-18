const LessonVisuals = (() => {
  // A single degree of freedom changes four shipments; the row and column
  // sums are invariant. Both numerical states remain available when paused.
  function cycleFigure(host) {
    const routes = [
      ['Склад 1 → Парк', 4, 3, -1], ['Склад 1 → Мир', 2, 1, 1],
      ['Склад 2 → Парк', 0, 1, 1], ['Склад 2 → Мир', 3, 4, -1]
    ];
    function stop(x,y,name,stock){
      return `<g transform="translate(${x} ${y})"><rect x="-32" y="-9" width="64" height="22" rx="5" fill="#fffaf0" stroke="#617563" stroke-width=".6"/>
        <text y=".8" class="town-name">${name}</text><text y="9.6" class="town-stock">${stock}</text></g>`;
    }
    const paths=['M78 53H286','M78 63C147 63 207 146 286 146','M78 146C147 146 207 63 286 63','M78 157H286'];
    const badges=[[135,53],[135,85],[135,124],[135,157]];
    host.innerHTML = `<figure class="cycle delivery">
      <figcaption>Как доставить 9 ящиков дешевле?</figcaption>
      <svg class="delivery-map freight-map" viewBox="0 0 366 192" role="img" aria-label="План перевозок">
        <image href="assets/delivery-town.webp" width="366" height="192" preserveAspectRatio="xMidYMid slice"/><g fill="none" stroke="#fff9e8" stroke-width="5" opacity=".9">${paths.map(d=>'<path d="'+d+'"/>').join('')}</g>
        <g class="route-lines" fill="none">${paths.map(d=>'<path d="'+d+'"/>').join('')}</g>
        <g fill="none" stroke="#244d47" stroke-width="1.8" aria-hidden="true">${[53,146,63,157].map(y=>`<path d="M277 ${y-3.4}l7 3.4-7 3.4"/>`).join('')}</g>
        <g class="route-values">${badges.map(([x,y],i)=>`<g transform="translate(${x} ${y})"><rect x="-26" y="-9" width="52" height="18" rx="9"/><text y="3.8" text-anchor="middle"><tspan class="route-load"></tspan><tspan> × ${routes[i][2]} ₽</tspan></text></g>`).join('')}</g>
        <g text-anchor="middle">${stop(45,68,'Склад 1','6 ящиков')}${stop(45,165,'Склад 2','3 ящика')}${stop(322,68,'Парк','4 ящика')}${stop(322,165,'Мир','5 ящиков')}</g>
      </svg>
      <p class="freight-legend">Стрелки ведут от двух складов к двум магазинам. На каждом рейсе указаны число ящиков и цена за ящик.</p>
      <p class="delivery-total" aria-live="polite"></p><p class="cycle-caption"></p>
      <div class="cycle-control"><button type="button"></button><label>Обменов <input type="range" min="0" max="4" value="0"></label></div>
      <details><summary>Маршруты, тарифы и таблица</summary><table><caption>Цена за один ящик</caption>
        <thead><tr><th>Маршрут</th><th>Цена</th><th>Ящиков</th></tr></thead><tbody></tbody></table><p>Один обмен перенаправляет по одному ящику с каждого склада в другой магазин. Число обменов обозначают θ. В матрице строка означает склад, столбец — магазин, число — объём доставки.</p><div class="delivery-matrix"></div></details>
    </figure>`;
    const range = host.querySelector('input');
    const button = host.querySelector('button');
    const rows = routes.map(([name, initial, price]) => {
      const row = host.querySelector('tbody').insertRow();
      row.innerHTML = '<th scope="row">'+name+'</th><td>'+price+' ₽</td><td><b></b><i class="box-strip" aria-hidden="true"></i></td>';
      return row;
    });
    const lines = host.querySelectorAll('.route-lines path');
    const amounts = host.querySelectorAll('.route-load');
    function paint() {
      const t = Number(range.value);
      const loads = routes.map(([,initial,,change]) => initial+t*change);
      rows.forEach((row,i)=>{
        const quantity = loads[i];
        amounts[i].textContent = quantity;
        lines[i].style.strokeWidth = Math.max(1.4,quantity*.72+1.5);
        lines[i].setAttribute('class',quantity < 0 ? 'invalid' : quantity === 0 ? 'empty' : '');
        row.querySelector('b').textContent = quantity;
        CellOrigin.register(row.cells[1],'Тариф этого маршрута задан в примере: '+routes[i][2]+' ₽ за ящик.');
        CellOrigin.register(row.cells[2],routes[i][1]+(routes[i][3]>0?' + ':' − ')+t+' = '+quantity+' ящиков.');
        row.querySelector('.box-strip').style.width = Math.max(0,loads[i])*12+'px';
        row.classList.toggle('impossible',loads[i]<0);
      });
      const cost = loads.reduce((sum,x,i)=>sum+x*routes[i][2],0);
      host.querySelector('.delivery-map').setAttribute('aria-label',routes.map(([name],i)=>name+': '+loads[i]).join('; ')+'. Количество указано в ящиках.');
      host.querySelector('.delivery-total').textContent = t===4 ? 'Доставка невозможна' : 'Стоимость доставки: '+cost+' ₽';
      const explanation = [
        'Сейчас склад 1 везёт 4 ящика в «Парк» по 3 ₽, а склад 2 везёт 3 в «Мир» по 4 ₽. Попробуйте обмен: отправьте по ящику с этих двух рейсов по маршрутам за 1 ₽.',
        'Было 26 ₽, стало 21 ₽. Оба магазина получили столько же: в «Парк» едут 3 + 1 ящика, в «Мир» — 3 + 2. Можно ли сэкономить ещё?',
        'Ещё 5 ₽ экономии. Со склада 2 в «Мир» остался один ящик. Предскажите, сколько обменов ещё возможно.',
        'Все заказы выполнены за 11 ₽. Со склада 2 в «Мир» уже ничего не едет. Проверьте, что произойдёт при ещё одном обмене.',
        'На рейсе «Склад 2 → Мир» получилось −1. Нельзя перенаправить ящик с пустого рейса: такой план недопустим. Лучший возможный план здесь — после трёх обменов.'
      ];
      host.querySelector('.cycle-caption').textContent = explanation[t];
      host.querySelector('.delivery-matrix').innerHTML = '<table><thead><tr><th>План при θ = '+t+'</th><th>Парк</th><th>Мир</th></tr></thead><tbody><tr><th>Склад 1</th><td>'+loads[0]+'</td><td>'+loads[1]+'</td></tr><tr><th>Склад 2</th><td>'+loads[2]+'</td><td>'+loads[3]+'</td></tr></tbody></table>';
      host.querySelectorAll('.delivery-matrix tbody td').forEach((td,i)=>CellOrigin.register(td,routes[i][1]+(routes[i][3]>0?' + ':' − ')+t+' = '+loads[i]+' ящиков.'));
      button.textContent = ['Обменять два маршрута','Повторить обмен','Сделать третий обмен','Проверить ещё один обмен','Вернуться к началу'][t];
      range.setAttribute('aria-valuetext',t+' обменов');
    }
    range.oninput = paint;
    button.onclick = () => { range.value = (Number(range.value) + 1) % 5; paint(); };
    paint();
  }
  function limits(host, quantities) {
    const rows = quantities.map(row => ({b:Q.parse(row.stock), a:Q.parse(row.rate)}));
    const bounds = rows.filter(row=>row.a.s>0).map(row=>row.b.div(row.a));
    if (!bounds.length) return;
    const limit = bounds.reduce((x,y)=>x.lt(y)?x:y);
    const frames = [Q.of(0), limit, limit.add(1)];
    const names = ['Исходный план','Предельный шаг','Превысить на 1'];
    host.className = 'limit-figure';
    host.innerHTML = '<h4>Как меняется остаток по строкам</h4><div class="limit-controls"></div><div class="limit-rows"></div><p role="status"></p>';
    const controls = host.querySelector('.limit-controls');
    const fields = rows.map((row,i)=>{
      const el = document.createElement('div');
      el.innerHTML = '<span>Строка '+(i+1)+'</span><span class="limit-track"><i></i></span><output></output>';
      host.querySelector('.limit-rows').append(el);
      return el;
    });
    function paint(index) {
      const t = frames[index], violated = [], binding = [];
      rows.forEach((row,i)=>{
        const residual = row.b.sub(row.a.mul(t));
        // Use one fixed scale per row throughout the three frames.
        const max = Math.max(1,...frames.map(x=>Math.abs(row.b.sub(row.a.mul(x)).toNumber())));
        fields[i].querySelector('i').style.transform = 'scaleX('+Math.max(0,residual.toNumber())/max+')';
        fields[i].querySelector('output').textContent = row.b.toText()+' − ('+row.a.toText()+') × '+t.toText()+' = '+residual.toText();
        fields[i].classList.toggle('violated',residual.s<0);
        if (residual.s<0) violated.push(i+1);
        if (!residual.s && row.a.s>0) binding.push(i+1);
      });
      const reason = violated.length ? 'Отрицательный остаток в строках: '+violated.join(', ')+'.' : binding.length ? 'Предел достигнут в строках: '+binding.join(', ')+'.' : 'Все остатки неотрицательны.';
      host.querySelector('[role=status]').textContent = 'Шаг '+t.toText()+'. '+reason;
      [...controls.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    }
    names.forEach((label,i)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>paint(i);controls.append(b);});
    paint(0);
  }
  function transportTable(host, step) {
    const cycle = step.cycleTrace, fill = step.allocation;
    const initial = cycle ? cycle.plan : fill.stocks.map(() => fill.needs.map(()=>null));
    const length = cycle ? cycle.path.length/2 : fill.entries.length;
    let frame = 0;
    host.innerHTML = '<div class="trace-controls"><button type="button">← Кадр</button><button type="button" class="book-primary"></button><output></output></div><p class="trace-note" aria-live="polite"></p><div class="book-state trace-grid"><table></table></div>';
    const [back,next] = host.querySelectorAll('button');
    const table = host.querySelector('table');
    const header = table.createTHead().insertRow();
    for(const label of ['Склад',...initial[0].map((_,i)=>'B'+(i+1))]){
      const th=document.createElement('th');th.scope='col';th.textContent=label;header.append(th);
    }
    const body=table.createTBody();
    const cells=initial.map((row,i)=>{
      const tr=body.insertRow(), th=document.createElement('th');
      th.scope='row';th.textContent='A'+(i+1);tr.append(th);
      return row.map(()=>tr.insertCell());
    });
    const at = c => 'A'+(c.i+1)+'B'+(c.j+1);
    function paint(){
      const values=initial.map(row=>row.slice());
      let note=cycle
        ? 'Это действующий план. В клетках указаны объёмы перевозок, прочерк означает пустой маршрут. По клеткам со знаком минус выбираем наименьший объём: '+cycle.path.filter(c=>c.sign!=='+' ).map(c=>initial[c.i][c.j]||'0').join(', ')+'. Поэтому переносим '+cycle.amount+'.'
        : 'Начинаем с пустого плана. Строка — склад, столбец — магазин. Нажмите «Заполнить клетку», чтобы увидеть первую поставку.';
      let active=[];
      for(let n=0;n<frame;n++){
        if(cycle){
          const pair=cycle.path.slice(n*2,n*2+2);
          active=pair;
          const calculations=pair.map(c=>{
            const old=values[c.i][c.j]||'0', delta=Q.parse(cycle.amount);
            const result=c.sign==='+'?Q.parse(old).add(delta):Q.parse(old).sub(delta);
            values[c.i][c.j]=result.toText();
            return at(c)+': '+old+' '+c.sign+' '+cycle.amount+' = '+result.toText();
          });
          note='Переносим '+cycle.amount+' с '+at(pair[1])+' на '+at(pair[0])+'. '+calculations.join('. ')+'.';
        }else{
          const e=fill.entries[n];active=[e];values[e.i][e.j]=e.x;
          note='На складе A'+(e.i+1)+' осталось '+e.stock+', магазину B'+(e.j+1)+' нужно '+e.need+'. Записываем меньшее число, '+e.x+', в '+at(e)+'.';
        }
      }
      if(cycle && frame>0) note+=frame===length?' Цикл завершён: общий груз каждого склада и заказ каждого магазина сохранились.':' Это часть пересчёта. Балансы проверим после всего цикла.';
      for(let i=0;i<cells.length;i++) for(let j=0;j<cells[i].length;j++){
        const cell=cells[i][j], token=active.find(c=>c.i===i&&c.j===j);
        cell.textContent=values[i][j]??'—';
        if(cycle){
          const op=cycle.path.slice(0,frame*2).find(c=>c.i===i&&c.j===j);
          CellOrigin.register(cell,op?(initial[i][j]||'0')+' '+op.sign+' '+cycle.amount+' = '+(values[i][j]||'0'):'Исходный план перед этим циклом: '+(initial[i][j]||'0')+' единиц.');
        } else {
          const entry=fill.entries.slice(0,frame).find(e=>e.i===i&&e.j===j);
          CellOrigin.register(cell,entry?'Берём меньшее из запаса и спроса: min('+entry.stock+'; '+entry.need+') = '+entry.x+'.':'На этом шаге поставка сюда ещё не записана.');
        }
        cell.classList.toggle('trace-active',Boolean(token));
        const sign=cycle?.path.find(c=>c.i===i&&c.j===j)?.sign;
        if(sign){const mark=document.createElement('small');mark.textContent=' '+sign;cell.append(mark);}
        if(token && !matchMedia('(prefers-reduced-motion: reduce)').matches)
          cell.animate([{backgroundColor:'#f6da80',transform:'scale(.91)'},{backgroundColor:'#dbecc9',transform:'scale(1)'}],{duration:520});
      }
      host.querySelector('.trace-note').textContent=note;
      host.querySelector('output').textContent=frame+' / '+length;
      back.disabled=frame===0;next.textContent=frame===length?'Повторить с начала':cycle?'Перенести '+cycle.amount:'Заполнить клетку';
    }
    next.onclick=()=>{
      frame=frame===length?0:frame+1;paint();
      if(!cycle || !frame || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      const [to,from]=cycle.path.slice(2*(frame-1),2*frame);
      const grid=host.querySelector('.trace-grid');
      grid.querySelector('.transfer-token')?.remove();
      const origin=cells[from.i][from.j].getBoundingClientRect();
      const end=cells[to.i][to.j].getBoundingClientRect();
      const box=grid.getBoundingClientRect();
      const token=document.createElement('span');
      token.className='transfer-token';token.textContent=cycle.amount;token.setAttribute('aria-hidden','true');
      token.style.left=(origin.left-box.left+grid.scrollLeft)+'px';
      token.style.top=(origin.top-box.top+grid.scrollTop)+'px';grid.append(token);
      const flight=token.animate([{transform:'translate(0,0)'},{transform:'translate('+(end.left-origin.left)+'px,'+(end.top-origin.top)+'px)'}],{duration:700,easing:'ease-in-out'});
      flight.onfinish=()=>token.remove();
    };
    back.onclick=()=>{frame--;paint();};paint();
  }
  return {cycleFigure,limits,transportTable};
})();
