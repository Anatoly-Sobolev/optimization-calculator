const LessonVisuals = (() => {
  // A single degree of freedom changes four shipments; the row and column
  // sums are invariant. Both numerical states remain available when paused.
  function cycleFigure(host) {
    host.innerHTML = `<figure class="cycle delivery">
      <figcaption>Как доставить 9 ящиков дешевле?</figcaption>
      <p>На первом складе 6 ящиков, на втором — 3. Магазин «Парк» заказал 4, «Мир» — 5. Каждый магазин должен получить весь заказ.</p>
      <table><caption>План доставки. Цена указана за один ящик.</caption>
        <thead><tr><th>Откуда → куда</th><th>Цена</th><th>Ящиков</th></tr></thead><tbody></tbody></table>
      <p class="delivery-total" aria-live="polite"></p><p class="cycle-caption"></p>
      <div class="cycle-control"><button type="button"></button><label>Обменов <input type="range" min="0" max="4" value="0"></label></div>
      <details><summary>Как это записывается в методичке?</summary><p>Один обмен перенаправляет по одному ящику с каждого склада в другой магазин. Число обменов обозначают θ. В матрице строка означает склад, столбец — магазин, число — объём доставки.</p><div class="delivery-matrix"></div></details>
    </figure>`;
    const range = host.querySelector('input');
    const button = host.querySelector('button');
    const routes = [
      ['Склад 1 → Парк', 4, 3, -1], ['Склад 1 → Мир', 2, 1, 1],
      ['Склад 2 → Парк', 0, 1, 1], ['Склад 2 → Мир', 3, 4, -1]
    ];
    const rows = routes.map(([name, initial, price]) => {
      const row = host.querySelector('tbody').insertRow();
      row.innerHTML = '<th scope="row">'+name+'</th><td>'+price+' ₽</td><td><b></b><i class="box-strip" aria-hidden="true"></i></td>';
      return row;
    });
    function paint() {
      const t = Number(range.value);
      const loads = routes.map(([,initial,,change]) => initial+t*change);
      rows.forEach((row,i)=>{
        row.querySelector('b').textContent = loads[i];
        row.querySelector('.box-strip').style.width = Math.max(0,loads[i])*12+'px';
        row.classList.toggle('impossible',loads[i]<0);
      });
      const cost = loads.reduce((sum,x,i)=>sum+x*routes[i][2],0);
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
        cell.textContent=values[i][j]??'—';cell.classList.toggle('trace-active',Boolean(token));
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
