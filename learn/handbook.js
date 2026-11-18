/* Course navigation and lesson presentation. Solver traces come from LEARN. */
const Handbook = (() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  const key = topic => [topic.src, topic.type, topic.base].filter(Boolean).join('.');
  const phases = ['Изучить образец', 'Объяснить выбор', 'Дополнить решение', 'Решить самостоятельно'];
  // The first missing operation follows the objective of each chapter.
  // All subsequent operations are completed by the reader.
  const practiceStart = {
    simplex:/выходящая строка/i, artificial:/переход к исходной цели/i,
    dsx:/выходящая строка/i, dsimplex:/выходящая строка/i,
    transp:/цикл перераспределения/i, graph:/сравнение вершин/i,
    canon:/равенства/i, dual:/двойственная цель/i, duality:/двойственная цель/i,
    ilp:/дробная часть/i, gomory:/дробная часть/i, game:/цена/i,
    netw:/резерв/i, optcheck:/оптимальност/i
  };
  const url = (topic, phase = 0) => '?lesson=' + key(topic) + '&phase=' + phase;
  const sourceName = src => src === 'rgr' ? 'Расчётно-графическая работа' : 'Практические занятия';
  const esc = LU.esc;
  let book, chapter, phase, variants, current, steps, position;
  const saved = {};
  function read(id) {
    try { return JSON.parse(localStorage.getItem('handbook.1.' + id)) || saved[id] || {}; }
    catch { return saved[id] || {}; }
  }
  function write(id, value) {
    saved[id] = value;
    try { localStorage.setItem('handbook.1.' + id, JSON.stringify(value)); return true; } catch { return false; }
  }
  const lab = () => chapter ? '?lab#' + new URLSearchParams({s:chapter.src,t:chapter.type,v:current.v,b:chapter.base || 'graph'}) : '?lab';
  function mast() {
    return '<div class="book-mast"><a href="index.html" class="book-brand"><span aria-hidden="true">∑</span> Методы оптимизации</a><nav aria-label="Навигация пособия"><a href="index.html#contents">Оглавление</a><a href="' + lab() + '">Лаборатория ↗</a></nav></div>';
  }
  // Start with the student's goal; show the choice of source only after the method.
  const paths = [
    ['transp','Доставить груз с наименьшими затратами','Транспортная задача'],
    ['graph','Найти лучший план на чертеже','Графический метод'],
    ['simplex','Найти лучший план по таблице','Симплекс-метод'],
    ['canon','Подготовить ограничения к решению','Каноническая форма'],
    ['artificial','Начать решение, когда базис не виден','Искусственный базис'],
    ['dual duality','Построить двойственную задачу и оценить ресурсы','Двойственность'],
    ['dsx dsimplex','Исправить недопустимый базисный план','Двойственный симплекс-метод'],
    ['optcheck','Проверить предложенный план','Условия оптимальности'],
    ['ilp gomory','Найти решение в целых числах','Целочисленное программирование'],
    ['netw','Определить срок проекта и критические работы','Сетевое планирование'],
    ['game','Выбрать стратегию против соперника','Матричные игры']
  ];
  function catalogue(section,topics) {
    section.innerHTML='<h2>Какую задачу хотите решить?</h2><label class="catalog-search">Поиск по задаче или методу<input type="search" placeholder="Например, груз или симплекс"></label><div class="catalog-list"></div><p class="catalog-empty" role="status" hidden>Совпадений нет. Попробуйте другое слово.</p>';
    const list=section.querySelector('.catalog-list');
    for(const [types,goal,method] of paths){
      const routes=topics.filter(t=>types.split(' ').includes(t.type));
      if(!routes.length)continue;
      const group=document.createElement('details');
      group.innerHTML='<summary><span><strong>'+goal+'</strong><small>'+method+'</small></span></summary><div class="catalog-routes">'+routes.map(t=>'<a class="chapter-link" href="'+url(t)+'"><span>'+esc(t.title)+'</span><small>'+sourceName(t.src)+' →</small></a>').join('')+'</div>';
      list.append(group);
    }
    section.querySelector('input').oninput=e=>{
      const term=e.target.value.trim().toLocaleLowerCase('ru');
      for(const group of list.children){
        group.hidden=!group.textContent.toLocaleLowerCase('ru').includes(term);
        group.open=Boolean(term)&&!group.hidden;
      }
      section.querySelector('.catalog-empty').hidden=Boolean(list.querySelector('details:not([hidden])'));
    };
  }
  function home(topics) {
    const last=read('last'), recent=topics.find(t=>key(t)===last.topic);
    const first=topics.find(t=>t.type==='transp');
    book.innerHTML=mast()+'<main class="book-main"><div class="book-intro"><div><div class="book-kicker">ОмГТУ / Интерактивное пособие</div><h1>Методы<br><em>оптимизации</em></h1><p>Попробуйте перераспределить ящики между двумя складами и посмотрите, как изменится стоимость доставки. Затем разберите этот выбор по шагам.</p><a class="book-cta" href="'+url(first)+'">Начать с доставки →</a><p><a href="#contents">Найти своё задание ↓</a></p>'+(recent?'<a href="'+url(recent,last.phase)+'">Продолжить: '+esc(recent.title)+' →</a>':'')+'</div><div id="featured"></div></div><section id="contents"></section></main>';
    LessonVisuals.cycleFigure(book.querySelector('#featured'));
    catalogue(book.querySelector('#contents'),topics);
    if(location.hash==='#contents') book.querySelector('#contents').scrollIntoView();
  }
  function start() {
    const legacy = query.has('lab') || new URLSearchParams(location.hash.slice(1)).has('s') && !query.has('lesson');
    if (legacy) {
      document.body.insertAdjacentHTML('afterbegin','<div class="lab-return"><a href="index.html">← К интерактивному пособию</a></div>');
      APP.init(); return;
    }
    document.body.classList.add('handbook');
    book = document.createElement('div'); book.id = 'book'; document.body.prepend(book);
    const topics = LEARN.registry();
    chapter = topics.find(t => key(t) === query.get('lesson'));
    if (!chapter) { home(topics); return; }
    phase = Number(query.get('phase'));
    if (!Number.isInteger(phase) || phase < 0 || phase >= phases.length) phase = 0;
    variants = chapter.variants.filter(v => !v.broken && !v.warn && !v.note);
    if (!variants.length) variants = chapter.variants;
    current = variants[Math.min(Math.max(0,phase-1),variants.length-1)];
    Object.assign(APP.state, {src:chapter.src,type:chapter.type,base:chapter.base || 'graph',v:current.v});
    APP.render();
    const profile = LPROFILES.profileFor(chapter.type);
    steps = LEARN.selectStages(LEARN.allStages,{depth:'detail'});
    const history = read(key(chapter)); position = Number(history[phase]?.position) || 0;
    position = Math.max(0, Math.min(position, steps.length - 1));
    write('last',{topic:key(chapter),phase});
    document.title = chapter.title + ' · ' + phases[phase];
    book.innerHTML = mast() + '<main class="book-main"><p class="book-kicker">' + sourceName(chapter.src) + '</p><h1 class="lesson-title">' + esc(chapter.title) + '</h1><p class="lesson-summary">' + esc(profile.summary) + '</p><div class="book-layout"><aside class="book-outline"><h2>Ход занятия</h2>' + phases.map((s,i) => '<a href="' + url(chapter,i) + '"' + (i===phase?' aria-current="step"':'') + '><span>' + (i+1) + '</span>' + s + '</a>').join('') + '<a class="book-reference" href="' + lab() + '">Все варианты и анимации ↗</a></aside><section class="lesson-work"><div class="book-kicker">Вариант ' + current.v + '</div><h2>' + phases[phase] + '</h2><div id="lesson-body"></div></section></div></main>';
    draw();
    if (phase === 0) {
      const intro = document.createElement('section');
      intro.className = 'lesson-context';
      const row = steps[0]?.startingRow;
      let firstAction = esc(profile.start);
      if (row) {
        const expression = R.lin(row.a, j=>R.xv(j+1));
        const rule = row.s === '<=' ? 'Знак ≤ разрешает расходовать меньше лимита. Прибавьте к левой части неиспользованный остаток.' :
          row.s === '>=' ? 'Знак ≥ задаёт нижнюю границу. Вычтите из левой части всё, что превышает эту границу.' :
          'Обе части уже должны быть равны. Эту строку можно сразу перенести в таблицу.';
        firstAction = 'Посмотрите на первое ограничение своего варианта.<span class="starting-equation">'+expression+' '+R.sg(row.s)+' '+R.fq(row.b)+'</span>'+rule;
      }
      intro.innerHTML = '<h3>На простом примере</h3><p>'+esc(profile.analogy.replace(/^Учебная аналогия: /,''))+'</p>'+
        '<h4>С чего начать в своём варианте</h4><p>'+firstAction+'</p>'+
        '<details><summary>Обозначения в задаче</summary><dl>'+
        profile.symbols.map(([symbol,meaning])=>'<div><dt>'+esc(symbol)+'</dt><dd>'+esc(meaning)+'</dd></div>').join('')+
        '</dl></details><a href="#lesson-body">Перейти к решению варианта ↓</a>';
      book.querySelector('#lesson-body').before(intro);
      const demos = [...document.querySelectorAll('#solution .demo, #solution .plotwrap')]
        .filter(node => !node.parentElement.closest('.demo, .plotwrap'));
      if (demos.length) showDemonstrations(demos);
    }
  }

  function showDemonstrations(demos) {
    const section = document.createElement('section');
    section.className = 'book-demos';
    section.setAttribute('aria-labelledby','demo-heading');
    section.innerHTML = '<div class="demo-toolbar"><h3 id="demo-heading">Разбор в движении</h3><span class="demo-count"></span></div>'+
      '<div class="demo-picker"><label for="demo-topic">Что разобрать</label><div><select id="demo-topic"></select>'+
      '<button type="button" aria-label="Предыдущая тема" title="Предыдущая тема">← Тема</button>'+
      '<button type="button" aria-label="Следующая тема" title="Следующая тема">Тема →</button></div></div>';
    const picker = section.querySelector('select');
    const [prev, next] = section.querySelectorAll('.demo-picker button');
    const counter = section.querySelector('.demo-count');
    const panels = demos.map((demo, i) => {
      const title = demo.querySelector('.dmtl')?.textContent || (demo.querySelector('.r3home') ? 'Рассмотреть объёмный график' : 'Рассмотреть график на плоскости');
      picker.add(new Option(title, i));
      const panel = document.createElement('div');
      panel.className = 'demo-view';
      panel.id = 'demo-view-'+i;
      panel.hidden = i !== 0;
      panel.append(demo);
      section.append(panel);
      const controls = demo.querySelector('.dmctl');
      if (controls) {
        const settings = document.createElement('details');
        settings.className = 'demo-settings';
        settings.innerHTML = '<summary>Настройки и обозначения</summary>';
        const options = document.createElement('div');
        settings.append(options);
        for (const selector of ['.dm-re','.dm-end','.dm-speed','.dmdet','.dmleg']) {
          const item = demo.querySelector(selector);
          if (item) options.append(item);
        }
        controls.after(settings);
        demo.querySelector('.dm-prev').textContent = '← Кадр';
        demo.querySelector('.dm-next').textContent = 'Кадр →';
      }
      return panel;
    });
    let active = 0;
    function select(index) {
      if (active !== index) {
        panels[active].querySelector('.demo.playing .dm-play')?.click();
        panels[active].hidden = true;
      }
      active = index;
      panels[active].hidden = false;
      picker.selectedIndex = active;
      picker.setAttribute('aria-controls',panels[active].id);
      counter.textContent = 'Тема '+(active+1)+' из '+panels.length;
      prev.disabled = active === 0;
      next.disabled = active === panels.length-1;
    }
    picker.onchange = () => select(picker.selectedIndex);
    prev.onclick = () => select(active-1);
    next.onclick = () => select(active+1);
    select(0);
    if (panels.length === 1) {
      prev.hidden = next.hidden = picker.hidden = true;
      section.querySelector('label').textContent = picker.options[0].text;
      counter.hidden = true;
    }
    book.querySelector('#lesson-body').before(section);
  }
  function footer(parent) {
    parent.insertAdjacentHTML('beforeend','<p><a class="book-cta" href="' + (phase < 3 ? url(chapter,phase+1) : 'index.html#contents') + '">' + (phases[phase+1] || 'К оглавлению') + ' →</a></p>');
  }
  function stepState() { return read(key(chapter))[phase] || {}; }
  function remember(patch) {
    const history=read(key(chapter));
    history[phase]={...history[phase],...patch,position}; return write(key(chapter),history);
  }
  function draw() {
    const host = book.querySelector('#lesson-body');
    if (!steps.length) {
      host.innerHTML = '<p>Для этого варианта доступен полный визуальный разбор.</p><a href="' + lab() + '">Открыть разбор варианта →</a>'; return;
    }
    const s=steps[position], progress=stepState();
    if (phase === 1) {
      const map=LPROFILES.profileFor(chapter.type).map;
      const q=map.q;
      host.innerHTML='<div class="book-callout">' + esc(q.q) + '</div><label for="book-reason">Ваша заметка (по желанию)</label><p id="draft-help">Здесь можно сформулировать причину про себя или записать её для самопроверки. Преподавателю текст не отправляется. Заметка сохраняется в этом браузере до удаления данных сайта.</p><textarea aria-describedby="draft-help" id="book-reason" rows="3"></textarea><button class="book-primary" id="book-compare">Посмотреть объяснение и сравнить</button><div id="principle"></div>';
      host.insertAdjacentHTML('afterbegin','<details class="book-map"><summary>Схема метода</summary><ol>' + map.nodes.map(([name,description])=>'<li><strong>'+esc(name)+'</strong><p>'+esc(description)+'</p></li>').join('') + '</ol></details>');
      const input=host.querySelector('textarea');
      input.value=progress.draft || '';
      input.oninput=()=>{
        if(!remember({draft:input.value})) host.querySelector('#draft-help').textContent='Браузер блокирует сохранение. Эта заметка доступна до ухода со страницы. Преподавателю она не отправляется.';
      };
      const compare=()=>{ remember({draft:input.value,compared:true});const result=host.querySelector('#principle');result.innerHTML='<p class="book-callout">' + esc(q.why) + '</p>';footer(result); };
      host.querySelector('#book-compare').onclick=compare;
      if(progress.compared) compare();
      return;
    }
    const firstMissing = steps.findIndex(step => practiceStart[chapter.type]?.test(step.title));
    const shown = phase === 0 || phase === 2 && position < (firstMissing < 0 ? steps.length-1 : firstMissing);
    const solved=Boolean(progress.answers?.[position]);
    host.innerHTML='<div class="step-line"><span>Переход ' + (position+1) + ' из ' + steps.length + '</span><progress max="' + steps.length + '" value="' + (position+1) + '"></progress></div><div id="step-foot"></div><h3 tabindex="-1">' + esc(s.title) + '</h3><p>' + esc(s.prompt) + '</p><div class="book-state">' + s.before + '</div><div id="response"></div><div role="status" id="book-feedback"></div>';
    const response=host.querySelector('#response'), foot=host.querySelector('#step-foot');
    const next=() => {
      if(position+1===steps.length){footer(foot);return;}
      const b=document.createElement('button');b.className='book-primary';b.textContent='Далее: '+steps[position+1].title;b.onclick=()=>move(1);foot.append(b);
    };
    function move(amount){position+=amount;remember({});draw();const bar=book.querySelector('#step-foot'); (bar.querySelector('.book-primary') || bar.querySelector('button'))?.focus({preventScroll:true});}
    if(position>0){const prev=document.createElement('button');prev.textContent='← Предыдущий';prev.onclick=()=>move(-1);foot.append(prev);}
    function reveal(){
      response.innerHTML='<div class="book-rule"><strong>' + esc(s.answer) + '</strong><p>' + esc(s.reason) + '</p></div><details class="book-change"><summary>Сравнить с состоянием после шага</summary><div class="book-state">' + s.after + '</div></details>';
      const change = response.querySelector('.book-change');
      if (s.cycleTrace || (s.allocation && phase===0)) {
        const visual=host.querySelector('.book-state');
        LessonVisuals.transportTable(visual,s);
        change.remove();
        next();
        return;
      }
      if (s.resourceLimits) {
        const figure=document.createElement('figure');
        change.before(figure);
        LessonVisuals.limits(figure,s.resourceLimits);
      }
      if (!s.after) change.remove();
      else {
        const before = host.querySelector('.book-state');
        let count = 0;
        for (const cell of change.querySelectorAll('td[data-i][data-j]')) {
          const old = before.querySelector('td[data-i="'+cell.dataset.i+'"][data-j="'+cell.dataset.j+'"]');
          if (old && old.textContent !== cell.textContent) {
            cell.classList.add('book-changed');
            cell.title = old.textContent + ' → ' + cell.textContent;
            count++;
          }
        }
        if (count) change.insertAdjacentHTML('beforeend','<p>Рамкой отмечены изменившиеся значения. Ячеек: '+count+'.</p>');
      }
      if(shown && phase===0 && chapter.type==='transp' && position===0){const figure=document.createElement('div');response.append(figure);figure.innerHTML='<h4>Отдельный пример цикла 2 × 2</h4><div></div>';LessonVisuals.cycleFigure(figure.lastElementChild);}
      next();
    }
    if(shown || solved){ reveal();return; }
    const check=value=>{
      if(!LEARN.accept(s,value)){
        const opt=s.options?.find(o=>o.value===value);
        host.querySelector('#book-feedback').textContent=opt?.why || 'Проверьте исходные данные, знак и порядок вычислений.';return;
      }
      remember({answers:{...stepState().answers,[position]:true}});
      host.querySelector('#book-feedback').textContent='Верно.';reveal();
    };
    if(s.numeric && phase===3){
      response.innerHTML='<form><label>Ваш ответ <input required placeholder="Число или дробь"></label><button class="book-primary">Проверить</button></form>';
      response.firstElementChild.onsubmit=e=>{e.preventDefault();check(response.querySelector('input').value);};
    }else for(const opt of LEARN.options(s)){const b=document.createElement('button');b.className='book-option';b.textContent=opt.label;b.onclick=()=>check(opt.value);response.append(b);}
    if(phase===2)response.insertAdjacentHTML('beforeend','<details><summary>Подсказка</summary><p>' + esc(s.hint) + '</p></details>');
  }
  return {start,get inLesson(){return Boolean(chapter);}};
})();
