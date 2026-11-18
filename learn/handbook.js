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
    try { localStorage.setItem('handbook.1.' + id, JSON.stringify(value)); } catch { /* In-memory session. */ }
  }
  const lab = () => chapter ? '?lab#' + new URLSearchParams({s:chapter.src,t:chapter.type,v:current.v,b:chapter.base || 'graph'}) : '?lab';
  function mast() {
    return '<div class="book-mast"><a href="index.html" class="book-brand"><span aria-hidden="true">∑</span> Методы оптимизации</a><nav aria-label="Навигация пособия"><a href="index.html#contents">Оглавление</a><a href="' + lab() + '">Лаборатория ↗</a></nav></div>';
  }
  function home(topics) {
    const last = read('last');
    const recent = topics.find(t => key(t) === last.topic);
    book.innerHTML = mast() + '<main class="book-main"><div class="book-intro"><div><div class="book-kicker">ОмГТУ / Интерактивное пособие</div><h1>Методы<br><em>оптимизации</em></h1><p>Оптимизация начинается с выбора. Два склада могут выполнить один заказ разными способами. Какой план обойдётся дешевле? Попробуйте обменять маршруты в примере и проследите за ценой.</p><a class="book-cta" href="' + url(recent || topics.find(t => t.type === 'transp'),recent ? last.phase : 0) + '">' + (recent ? 'Продолжить занятие' : 'Перейти от примера к занятию') + ' →</a></div><div id="featured"></div></div><section id="contents"><h2>Оглавление</h2>' + ['rgr','zyk'].map(src => '<h3 class="book-source">' + sourceName(src) + '</h3><div class="chapter-grid">' + topics.filter(t => t.src === src).map(t => '<a class="chapter-link" href="' + url(t) + '"><strong>' + esc(t.title) + '</strong><span>→</span></a>').join('') + '</div>').join('') + '</section></main>';
    LessonVisuals.cycleFigure(book.querySelector('#featured'));
    book.querySelector('#contents').insertAdjacentHTML('afterbegin','<aside class="study-guide"><h2>Как пройти первое занятие</h2><ol><li>Откройте интересующую задачу. В начале главы разберите, кто принимает решение и что требуется получить.</li><li>Посмотрите готовый пример. Кнопка «Следующий переход» показывает одну операцию за раз.</li><li>Когда сможете объяснить выбор, дополните похожее решение и попробуйте новый вариант самостоятельно.</li></ol></aside>');
    if (location.hash === '#contents') book.querySelector('#contents').scrollIntoView();
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
      intro.innerHTML = '<h3>О чём эта задача?</h3><p>'+esc(profile.analogy)+'</p><dl>'+
        profile.roles.map(role=>'<div><dt>'+esc(role.label)+'</dt><dd>'+esc(role.text)+'</dd></div>').join('')+
        '</dl><details><summary>Как читать обозначения</summary><dl>'+
        profile.symbols.map(([symbol,meaning])=>'<div><dt>'+esc(symbol)+'</dt><dd>'+esc(meaning)+'</dd></div>').join('')+
        '</dl></details><p><strong>К чему прийти.</strong> '+esc(profile.complete)+'</p><a href="#lesson-body">Посмотреть первый разобранный переход ↓</a>';
      book.querySelector('#lesson-body').before(intro);
      const demos = [...document.querySelectorAll('#solution .demo, #solution .plotwrap')]
        .filter(node => !node.parentElement.closest('.demo, .plotwrap'));
      if (demos.length) {
        const section = document.createElement('section');
        section.className = 'book-demos';
        section.innerHTML = '<h3>Анимации варианта</h3>';
        for (const demo of demos) {
          const panel = document.createElement('details');
          const title = document.createElement('summary');
          title.textContent = demo.querySelector('.dmtl')?.textContent || 'Исследовать график варианта';
          panel.append(title,demo);
          section.append(panel);
        }
        book.querySelector('#lesson-body').before(section);
      }
    }
  }
  function footer(parent) {
    parent.insertAdjacentHTML('beforeend','<p><a class="book-cta" href="' + (phase < 3 ? url(chapter,phase+1) : 'index.html#contents') + '">' + (phases[phase+1] || 'К оглавлению') + ' →</a></p>');
  }
  function stepState() { return read(key(chapter))[phase] || {}; }
  function remember(patch) {
    const history=read(key(chapter));
    history[phase]={...history[phase],...patch,position}; write(key(chapter),history);
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
      host.innerHTML='<div class="book-callout">' + esc(q.q) + '</div><label for="book-reason">Объясните своими словами</label><textarea id="book-reason" rows="3"></textarea><button class="book-primary" id="book-compare">Сверить с принципом</button><div id="principle"></div>';
      host.insertAdjacentHTML('afterbegin','<details class="book-map"><summary>Схема метода</summary><ol>' + map.nodes.map(([name,description])=>'<li><strong>'+esc(name)+'</strong><p>'+esc(description)+'</p></li>').join('') + '</ol></details>');
      const input=host.querySelector('textarea');
      input.value=progress.draft || '';
      input.oninput=()=>remember({draft:input.value});
      const compare=()=>{ if(!input.value.trim()){input.focus();return;} remember({draft:input.value,compared:true});const result=host.querySelector('#principle');result.innerHTML='<p class="book-callout">' + esc(q.why) + '</p>';footer(result); };
      host.querySelector('#book-compare').onclick=compare;
      if(progress.compared && input.value.trim()) compare();
      return;
    }
    const firstMissing = steps.findIndex(step => practiceStart[chapter.type]?.test(step.title));
    const shown = phase === 0 || phase === 2 && position < (firstMissing < 0 ? steps.length-1 : firstMissing);
    const solved=Boolean(progress.answers?.[position]);
    host.innerHTML='<div class="step-line"><span>Переход ' + (position+1) + ' из ' + steps.length + '</span><progress max="' + steps.length + '" value="' + (position+1) + '"></progress></div><h3 tabindex="-1">' + esc(s.title) + '</h3><p>' + esc(s.prompt) + '</p><div class="book-state">' + s.before + '</div><div id="response"></div><div role="status" id="book-feedback"></div><div id="step-foot"></div>';
    const response=host.querySelector('#response'), foot=host.querySelector('#step-foot');
    const next=() => {
      if(position+1===steps.length){footer(foot);return;}
      const b=document.createElement('button');b.className='book-primary';b.textContent='Следующий переход →';b.onclick=()=>move(1);foot.append(b);
    };
    function move(amount){position+=amount;remember({});draw();book.querySelector('#lesson-body h3')?.focus();}
    if(position>0){const prev=document.createElement('button');prev.textContent='← Предыдущий';prev.onclick=()=>move(-1);foot.append(prev);}
    function reveal(){
      response.innerHTML='<div class="book-rule"><strong>' + esc(s.answer) + '</strong><p>' + esc(s.reason) + '</p></div><details class="book-change"><summary>Сравнить с состоянием после шага</summary><div class="book-state">' + s.after + '</div></details>';
      const change = response.querySelector('.book-change');
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
