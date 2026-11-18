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
  let unmountAnswer;
  function read(id) {
    try { return JSON.parse(localStorage.getItem('handbook.1.' + id)) || saved[id] || {}; }
    catch { return saved[id] || {}; }
  }
  function write(id, value) {
    saved[id] = value;
    try { localStorage.setItem('handbook.1.' + id, JSON.stringify(value)); return true; } catch { return false; }
  }
  const lab = () => chapter ? '?lab#' + new URLSearchParams({s:chapter.src,t:chapter.type,v:current.v,b:chapter.base || 'graph'}) : '?lab';
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
  function home(topics) {
    const last = read('last');
    const recent = topics.find(t=>key(t)===last.topic);
    const groups = paths.map(([types,goal,method])=>({
      goal, method, type:types.split(' ')[0], routes: topics.filter(t=>types.split(' ').includes(t.type)).map(t=>({
        title:t.title, source:sourceName(t.src), href:url(t)
      }))
    })).filter(group=>group.routes.length);
    BookUI.home(book, {
      groups, first:url(topics.find(t=>t.type==='transp')), lab:lab(),
      recent:recent && {title:recent.title,href:url(recent,last.phase)}
    });
    LessonVisuals.cycleFigure(book.querySelector('#featured'));
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
    const title=chapter.src==='rgr'&&chapter.type==='dual'
      ? 'Двойственная задача к заданию '+(chapter.base==='graph'?'1':'2') : chapter.title;
    document.title = title + ' · ' + phases[phase];
    BookUI.lesson(book, {
      title, summary:profile.summary, source:sourceName(chapter.src),
      variant:current.v, data:LEARN.sceneData, phases:phases.map((name,i)=>({name,href:url(chapter,i)})), active:phase, lab:lab()
    });
    draw();
    if (phase === 0) {
      const intro = document.createElement('details');
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
      intro.innerHTML = '<summary>Обозначения и дополнительный пример</summary><div class="lesson-example"><h3>Дополнительный пример</h3><p>'+esc(profile.analogy.replace(/^Учебная аналогия: /,''))+'</p>'+
        '</div><div class="lesson-first"><h4>Ваш первый шаг</h4><p>'+firstAction+'</p></div>'+
        '<details class="lesson-glossary"><summary>Справка по обозначениям</summary><dl>'+
        profile.symbols.map(([symbol,meaning])=>'<div><dt>'+esc(symbol)+'</dt><dd>'+esc(meaning)+'</dd></div>').join('')+
        '</dl></details>';
      book.querySelector('#lesson-body').before(intro);
      if (chapter.type === 'transp') {
        const example = document.createElement('div');
        intro.querySelector('.lesson-example p').replaceWith(example);
        BookUI.shipmentExample(example);
      }
      const demos = [...document.querySelectorAll('#solution .demo, #solution .plotwrap')]
        .filter(node => !node.parentElement.closest('.demo, .plotwrap'));
      addStudyViews(demos.length ? showDemonstrations(demos) : null);
    } else {
      const drawer = document.createElement('details');
      drawer.className = 'practice-explorer';
      drawer.innerHTML = '<summary>Исследовать свой вариант</summary><div class="explorer-body"></div>';
      book.querySelector('#lesson-body').before(drawer);
      drawer.addEventListener('toggle',()=>{
        const host=drawer.querySelector('.explorer-body');
        if (drawer.open && !host.hasChildNodes()) mountExplorer(host);
      });
    }
  }

  function showDemonstrations(demos) {
    const section = document.createElement('section');
    section.className = 'book-demos';
    section.id = 'demo-deck';
    section.setAttribute('aria-labelledby','demo-heading');
    const toolbar = document.createElement('div');
    section.append(toolbar);
    const titles = demos.map(demo=>demo.querySelector('.dmtl')?.textContent ||
      (demo.querySelector('.r3home') ? 'Рассмотреть объёмный график' : 'Рассмотреть график на плоскости'));
    const panels = demos.map((demo, i) => {
      const panel = document.createElement('div');
      panel.className = 'demo-view';
      panel.id = 'demo-view-'+i;
      panel.hidden = i !== 0;
      panel.append(demo);
      if(i===0) demo.activateHandbook?.();
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
        demo.append(settings);
        const stage = demo.querySelector('.dmstage');
        if (stage) stage.before(controls);
        demo.querySelector('.dm-prev').textContent = '← Кадр';
        demo.querySelector('.dm-next').textContent = 'Кадр →';
      }
      return panel;
    });
    let active = 0;
    function onSelect(index) {
      if (active === index) return;
      panels[active].querySelector('.demo.playing .dm-play')?.click();
      panels[active].hidden = true;
      panels[index].hidden = false;
      panels[index].firstElementChild.activateHandbook?.();
      active = index;
    }
    BookUI.gallery(toolbar,{titles,onSelect});
    return section;
  }

  function mountExplorer(host) {
    const data = LEARN.sceneData;
    const main = document.createElement('div');
    host.append(main);
    const preferred = {
      transp:'flows', netw:'network', game:'heat', ilp:'lattice', gomory:'lattice',
      dual:'dualpair', duality:'shadow', optcheck:'pointcheck', artificial:'stopjudge',
      dsx:'stopjudge', dsimplex:'stopjudge', canon:'match'
    };
    const scenes = ['model','strategy','meaning'].flatMap(mode=>LSCEN.scenes(mode,data,'deep'));
    const primary = scenes.find(item=>item.scene===preferred[chapter.type]) || scenes.find(item=>item.scene==='map');
    const plane = ['simplex','graph'].includes(chapter.type) && data.P?.c.length>=2;
    if (plane) BookUI.planProbe(main,data);
    else LSCENE.mount(main,primary);

    const followups = {
      graph:['region','Сдвинуть линию цели'], simplex:['stopjudge','Проверить, пора ли закончить решение'],
      transp:['improve','Выбрать маршрут для снижения затрат'], game:['maximin','Сравнить гарантированные выигрыши'],
      netw:['critical','Найти критическую работу'], ilp:['cutbar','Проверить отсечение'], gomory:['cutbar','Проверить отсечение'],
      duality:['dualpair','Сопоставить прямую и двойственную задачи']
    };
    const [kind,label] = followups[chapter.type] || [];
    const next = kind && scenes.find(s=>s!==primary && (s.scene===kind || s.spec.task===kind));
    const map = scenes.find(s=>s.scene==='map' && (plane || s!==primary));
    const extra = next || map || scenes.find(s=>s.scene==='match' && s!==primary);
    if (!extra) return;
    const details = document.createElement('details');
    details.className = 'explorer-followup';
    const summary = document.createElement('summary');
    summary.textContent = next ? label : extra.scene==='map' ? 'Разобрать схему метода' : 'Проверить обозначения';
    const content = document.createElement('div');
    details.append(summary,content);
    host.append(details);
    details.addEventListener('toggle',()=>{
      if (details.open && !content.hasChildNodes()) LSCENE.mount(content,extra);
    });
  }

  function addStudyViews(deck) {
    const body = book.querySelector('#lesson-body'), views = document.createElement('div');
    const explorer = document.createElement('section');
    explorer.id='variant-explorer'; explorer.className='lesson-explorer';
    const panels = {steps:body,explore:explorer};
    const items = [['steps','Разобрать по шагам',body.id],['explore','Исследовать вариант',explorer.id]];
    if (deck) {
      items.unshift(['demo','Смотреть анимацию',deck.id]);
      panels.demo=deck;
    }
    body.before(views,...(deck?[deck]:[]),explorer);
    function select(key) {
      if (key!=='demo') deck?.querySelector('.demo.playing .dm-play')?.click();
      for (const [id,panel] of Object.entries(panels)) panel.hidden=id!==key;
      if (key==='explore' && !explorer.hasChildNodes()) mountExplorer(explorer);
    }
    const initial=items.find(([mode])=>mode===query.get('view'))?.[0]||items[0][0];
    select(initial);
    BookUI.views(views,{items,initial,onChange:select});
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
    if (unmountAnswer) {
      unmountAnswer();
      unmountAnswer = null;
    }
    const host = book.querySelector('#lesson-body');
    if (!steps.length) {
      host.innerHTML = '<p>Для этого варианта доступен полный визуальный разбор.</p><a href="' + lab() + '">Открыть разбор варианта →</a>'; return;
    }
    const s=steps[position], progress=stepState();
    if (phase === 1) {
      BookUI.reflection(host,{map:LPROFILES.profileFor(chapter.type).map,progress,save:remember,next:url(chapter,2)});
      return;
    }
    const firstMissing = steps.findIndex(step => practiceStart[chapter.type]?.test(step.title));
    const shown = phase === 0 || phase === 2 && position < (firstMissing < 0 ? steps.length-1 : firstMissing);
    const solved=Boolean(progress.answers?.[position]);
    host.innerHTML='<div class="step-line"><span>Переход ' + (position+1) + ' из ' + steps.length + '</span><progress max="' + steps.length + '" value="' + (position+1) + '"></progress></div><div id="step-foot"></div><h3 tabindex="-1">' + esc(s.title) + '</h3>' + (phase===0?'':'<p>'+esc(s.prompt)+'</p>') + '<div class="book-state">' + s.before + '</div><div id="answer-controls"></div><div id="response"></div>';
    const response=host.querySelector('#response'), foot=host.querySelector('#step-foot');
    if (phase >= 2) host.append(foot);
    const next=() => {
      if(position+1===steps.length){footer(foot);return;}
      const b=document.createElement('button');b.className='book-primary';b.textContent='Далее: '+steps[position+1].title;b.onclick=()=>move(1);foot.append(b);
    };
    function move(amount) {
      position+=amount;remember({});draw();
      if (phase >= 2) {
        const title = host.querySelector('h3');
        title.focus({preventScroll:true});
        title.scrollIntoView({block:'nearest'});
      } else {
        const bar = book.querySelector('#step-foot');
        (bar.querySelector('.book-primary') || bar.querySelector('button'))?.focus({preventScroll:true});
      }
    }
    if(position>0){const prev=document.createElement('button');prev.textContent='← Предыдущий';prev.onclick=()=>move(-1);foot.append(prev);}
    if(phase===0){
      host.querySelector('.step-line span').textContent='Шаг '+(position+1)+' из '+steps.length;
      host.append(foot);
      host.querySelector('.book-state').remove();
      host.querySelector('#answer-controls').remove();
      unmountAnswer=BookUI.workedStep(response,{step:s,data:LEARN.sceneData});
      next();
      return;
    }
    function reveal(){
      response.innerHTML='<div class="book-rule"><strong>' + esc(s.answer) + '</strong><p>' + esc(s.reason) + '</p></div><details class="book-change"><summary>Сравнить с состоянием после шага</summary><div class="book-state">' + s.after + '</div></details>';
      const change = response.querySelector('.book-change');
      if (s.cycleTrace) {
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
      next();
    }
    if(shown || solved){ reveal();return; }
    const numeric = s.numeric && phase===3;
    unmountAnswer = BookUI.answer(host.querySelector('#answer-controls'),{
      numeric, options:numeric?[]:LEARN.options(s), hint:phase===2?s.hint:null,
      assess(value,why) {
        if (numeric && !String(value).trim()) return {ok:false,message:'Введите число, например 3 или 1/2.'};
        if (LEARN.accept(s,value)) return {ok:true,message:position+1===steps.length?'Вариант завершён.':'Можно перейти к следующему шагу.'};
        return {ok:false,message:why || s.hint || s.reason};
      },
      onSolved() {
        remember({answers:{...stepState().answers,[position]:true}});
        reveal();
      }
    });
  }
  return {start,get inLesson(){return Boolean(chapter);}};
})();
