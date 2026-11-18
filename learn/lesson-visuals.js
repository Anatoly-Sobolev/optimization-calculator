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
  return {cycleFigure,limits};
})();