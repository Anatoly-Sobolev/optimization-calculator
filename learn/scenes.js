/* Реестр интерактивных учебных сцен и общий рендерер.
 * Сцена описывается так: define(id, {goal, action, takeaway, available?, render(inst) → html, bind(body, inst, api)}).
 * Один тип сцены используется в разных темах с разными данными (inst.spec / inst.data).
 * Обработчики вешаются только на элементы, созданные при монтировании, поэтому полная перерисовка
 * интерфейса (APP.render / LEARN.draw) не оставляет «висящих» слушателей; временные анимации — только CSS. */
const LSCENE = (() => {
  'use strict';
  const { esc, order, f, num } = LU;
  const defs = {};
  const define = (id, def) => { defs[id] = { id, ...def }; return defs[id]; };
  const val = (v, inst) => typeof v === 'function' ? v(inst) : v;
  const has = id => !!defs[id];
  const available = inst => !!defs[inst.scene] && (!defs[inst.scene].available || !!defs[inst.scene].available(inst));
  let seq = 0;
  const uid = p => `${p}${++seq}`;

  /* Опции выбора: правильный ответ + неверные [label, why] или просто label. */
  function choiceSpec(question, right, wrong, why, extra = {}) {
    const opts = [{ value: 'r', label: right, why }, ...wrong.map((w, i) => Array.isArray(w) ? { value: 'w' + i, label: w[0], why: w[1] } : { value: 'w' + i, label: w, why: null })];
    return { q: question, options: opts, answer: 'r', why, ...extra };
  }

  function mount(host, inst, hooks = {}) {
    const d = defs[inst.scene], id = uid('sc');
    const goal = val(inst.goal ?? d.goal, inst), action = val(inst.action ?? d.action, inst), take = val(inst.takeaway ?? d.takeaway, inst);
    host.innerHTML = `<section class="scene" data-scene="${esc(inst.scene)}" aria-labelledby="${id}-g"><p class="scene-goal" id="${id}-g"><strong>Цель.</strong> ${goal}</p><p class="scene-action"><strong>Что делать.</strong> ${action}</p><div class="scene-body"></div><div class="scene-out" role="status" aria-live="polite"></div><p class="scene-takeaway" hidden><strong>Вывод.</strong> ${take}${inst.depth === 'deep' && inst.deep ? ` <span class="scene-deep">${inst.deep}</span>` : ''}</p></section>`;
    const root = host.firstElementChild, body = root.querySelector('.scene-body'), out = root.querySelector('.scene-out'), tk = root.querySelector('.scene-takeaway');
    let solved = !!hooks.solved;
    if (solved) tk.hidden = false;
    const api = {
      id, single: !!hooks.single, inst,
      get solved() { return solved; },
      say(html, cls = '') { out.className = 'scene-out ' + cls; out.innerHTML = html; },
      pass(msg) { out.className = 'scene-out ok'; out.innerHTML = msg || '<strong>Верно.</strong>'; if (!solved) { solved = true; tk.hidden = false; hooks.onPass && hooks.onPass(); } },
      fail(msg, kind) { out.className = 'scene-out bad'; out.innerHTML = msg; if (!solved) hooks.onFail && hooks.onFail(kind); },
      /* Единственная попытка (проверка знаний): фиксирует результат независимо от правильности. */
      finish(correct, msg, kind) { out.className = 'scene-out ' + (correct ? 'ok' : 'bad'); out.innerHTML = msg; if (!solved) { solved = true; if (correct) tk.hidden = false; hooks.onFinish && hooks.onFinish(correct, kind); } }
    };
    try {
      body.innerHTML = d.render(inst, api);
      d.bind(body, inst, api);
    } catch (e) { console.error('Учебная сцена', inst.scene, e); body.innerHTML = '<p class="note warn">Сцена недоступна для этих данных.</p>'; }
    return { root, api };
  }

  /* ---------- Выбор ответа (основа для «предскажи», «объясни результат», «найди ошибку») ---------- */
  function choiceHtml(spec, uidp, locked) {
    const opts = order(spec.options, uidp, o => o.label);
    return `${spec.before ? `<div class="sc-before">${spec.before}</div>` : ''}<p class="sc-q" id="${uidp}-q">${spec.q}</p><div class="sc-opts" role="radiogroup" aria-labelledby="${uidp}-q">${opts.map(o => `<button type="button" class="sc-opt" role="radio" aria-checked="false" data-v="${esc(o.value)}"${locked ? ' disabled' : ''}><span class="sc-mark" aria-hidden="true"></span><span>${o.label}</span></button>`).join('')}</div><div class="sc-reveal" hidden></div>`;
  }
  function bindChoice(root, spec, api, onDone) {
    const buttons = [...root.querySelectorAll('.sc-opt')], reveal = root.querySelector('.sc-reveal');
    let locked = false;
    buttons.forEach(b => b.addEventListener('click', () => {
      if (locked) return;
      const o = spec.options.find(x => x.value === b.dataset.v), ok = o.value === spec.answer;
      buttons.forEach(x => x.setAttribute('aria-checked', String(x === b)));
      b.classList.remove('right', 'wrong'); b.classList.add(ok ? 'right' : 'wrong');
      const why = o.why || (ok ? spec.why : 'Это не подходит. ' + (spec.why || ''));
      if (api.single) {
        locked = true; buttons.forEach(x => { x.disabled = true; if (x.dataset.v === spec.answer) x.classList.add('right'); });
        api.finish(ok, `<strong>${ok ? 'Верно.' : 'Неверно.'}</strong> ${spec.why || ''}`, spec.kind || 'concept');
      } else if (ok) {
        api.pass(`<strong>Верно.</strong> ${why}`);
        if (spec.reveal) { reveal.hidden = false; reveal.innerHTML = spec.reveal; }
        if (onDone) onDone();
      } else api.fail(`<strong>Пока нет.</strong> ${why}${spec.diagnose ? ' ' + spec.diagnose(o) : ''}`, spec.errorKind || 'concept');
    }));
    return { unlock() { buttons.forEach(b => { b.disabled = false; }); } };
  }
  define('choice', {
    goal: inst => inst.spec.goal || 'Сделать выбор и сопоставить его с постановкой.',
    action: inst => inst.spec.action || 'Прочитайте вопрос, выберите ответ и посмотрите объяснение.',
    takeaway: inst => inst.spec.takeaway || inst.spec.why,
    render: (inst, api) => choiceHtml(inst.spec, api.id),
    bind: (body, inst, api) => bindChoice(body, inst.spec, api)
  });

  /* ---------- Сортировка и сопоставление: один компонент ---------- */
  function assignRender(inst, api) {
    const { items, buckets } = inst.spec, ids = api.id;
    return `<ul class="sc-assign" aria-label="Элементы для сопоставления">${order(items.map((it, i) => ({ ...it, i })), inst.id, x => x.text).map(it => `<li class="sc-row" data-i="${it.i}"><span class="sc-txt">${it.text}</span><div class="sc-bk" role="radiogroup" aria-label="${esc(LU.plain(it.text))}">${buckets.map((b, k) => `<button type="button" class="sc-opt" role="radio" aria-checked="false" data-k="${k}"><span class="sc-mark" aria-hidden="true"></span><span>${b}</span></button>`).join('')}</div><span class="sc-fb" aria-live="polite"></span></li>`).join('')}</ul><p class="sc-count" id="${ids}-c"></p>`;
  }
  function assignBind(body, inst, api) {
    const rows = [...body.querySelectorAll('.sc-row')], items = inst.spec.items, count = body.querySelector('.sc-count');
    const done = new Set();
    const upd = () => { count.textContent = `Верно сопоставлено: ${done.size} из ${items.length}`; };
    upd();
    rows.forEach(row => {
      const it = items[+row.dataset.i], fb = row.querySelector('.sc-fb'), bts = [...row.querySelectorAll('.sc-opt')];
      bts.forEach(b => b.addEventListener('click', () => {
        if (done.has(+row.dataset.i)) return;
        const ok = +b.dataset.k === it.to;
        bts.forEach(x => { x.setAttribute('aria-checked', String(x === b)); x.classList.remove('right', 'wrong'); });
        b.classList.add(ok ? 'right' : 'wrong');
        if (ok) { done.add(+row.dataset.i); row.classList.add('done'); bts.forEach(x => { x.disabled = x !== b; }); fb.textContent = '✓ ' + (it.why || 'Верно.'); upd(); if (done.size === items.length) api.pass('<strong>Всё сопоставлено верно.</strong>'); }
        else { fb.textContent = '✗ Не подходит. Подумайте о смысле: ' + (it.hint || it.why || 'какова роль этого элемента?'); api.fail('<strong>Одно сопоставление не сошлось.</strong> Подсказка рядом с элементом.', 'concept'); }
      }));
    });
  }
  define('sort', {
    goal: 'Разложить элементы задачи по ролям: что дано, что нужно найти, что ограничивает.',
    action: 'Для каждого элемента выберите, к какой группе он относится.',
    takeaway: inst => inst.spec.takeaway || 'Постановка состоит из данных, неизвестных и условий. Метод решения появляется только после этого разделения.',
    render: assignRender, bind: assignBind
  });
  define('match', {
    goal: 'Связать математическое обозначение с его смыслом.',
    action: 'Для каждого обозначения выберите, что оно выражает.',
    takeaway: inst => inst.spec.takeaway || 'Обозначение — короткая запись смысла. Если смысл ясен, формулу легко прочитать.',
    render: assignRender, bind: assignBind
  });

  /* ---------- Карточки смысла + вопрос ---------- */
  define('story', {
    goal: 'Увидеть, из каких «ролей» состоит задача, и понять, почему нельзя выбрать всё сразу.',
    action: 'Откройте все карточки, затем ответьте на вопрос.',
    takeaway: inst => inst.spec.takeaway || 'Задача оптимизации — выбор при общих ограничениях: нужно решить, кто что выбирает, что ограничено и как сравнивать варианты.',
    render: (inst, api) => `<p class="sc-analogy">${inst.spec.analogy}</p><ul class="sc-chips">${inst.spec.roles.map((r, i) => `<li><button type="button" class="sc-chip" aria-expanded="false" aria-controls="${api.id}-r${i}">${esc(r.label)}</button><div class="sc-chip-text" id="${api.id}-r${i}" hidden>${esc(r.text)}</div></li>`).join('')}</ul><p class="sc-count">Открыто карточек: <span class="sc-opened">0</span> из ${inst.spec.roles.length}</p>${choiceHtml(inst.spec.question, api.id + 'q', true)}`,
    bind: (body, inst, api) => {
      const chips = [...body.querySelectorAll('.sc-chip')], opened = new Set(), cnt = body.querySelector('.sc-opened');
      const ch = bindChoice(body, inst.spec.question, api);
      chips.forEach((c, i) => c.addEventListener('click', () => {
        const t = document.getElementById(c.getAttribute('aria-controls')), open = c.getAttribute('aria-expanded') !== 'true';
        c.setAttribute('aria-expanded', String(open)); t.hidden = !open; if (open) opened.add(i);
        cnt.textContent = opened.size; if (opened.size === chips.length) { ch.unlock(); api.say('Все карточки открыты: теперь можно ответить на вопрос.'); }
      }));
    }
  });

  /* ---------- Карта метода: шаги, затем вопрос ---------- */
  define('map', {
    goal: 'Увидеть общий путь метода и понять, на каком состоянии он завершается.',
    action: 'Пройдите состояния метода по порядку (кнопки или Tab / Enter), затем ответьте на вопрос.',
    takeaway: inst => inst.spec.takeaway || 'Метод — цепочка состояний. Важно знать, что улучшается на каждом шаге и по какому признаку процесс заканчивается.',
    render: (inst, api) => `<ol class="sc-map" aria-label="Карта метода">${inst.spec.nodes.map((n, i) => `<li><button type="button" class="sc-node${n[2] ? ' final' : ''}" data-i="${i}"><span class="sc-num">${i + 1}</span><span>${esc(n[0])}</span>${n[2] ? '<span class="sc-flag"> · завершение</span>' : ''}</button></li>`).join('')}</ol><div class="sc-map-text" aria-live="polite">Выберите состояние, чтобы увидеть, что в нём происходит.</div>${inst.spec.at ? `<p class="sc-at">${inst.spec.at}</p>` : ''}<p class="sc-count">Просмотрено состояний: <span class="sc-seen">0</span> из ${inst.spec.nodes.length}</p>${choiceHtml(inst.spec.question, api.id + 'q', true)}`,
    bind: (body, inst, api) => {
      const nodes = [...body.querySelectorAll('.sc-node')], seen = new Set(), text = body.querySelector('.sc-map-text'), cnt = body.querySelector('.sc-seen');
      const ch = bindChoice(body, inst.spec.question, api);
      nodes.forEach((n, i) => n.addEventListener('click', () => {
        nodes.forEach(x => x.removeAttribute('aria-current')); n.setAttribute('aria-current', 'step');
        text.innerHTML = `<strong>${i + 1}. ${esc(inst.spec.nodes[i][0])}.</strong> ${esc(inst.spec.nodes[i][1])}`;
        seen.add(i); n.classList.add('seen'); cnt.textContent = seen.size;
        if (seen.size === nodes.length) { ch.unlock(); api.say('Карта пройдена: ответьте на вопрос.'); }
      }));
    }
  });

  /* ---------- Можно ли остановиться: реальные состояния решения ---------- */
  define('stopjudge', {
    goal: 'Научиться распознавать, закончен ли метод в данном состоянии.',
    action: 'Для каждого состояния выберите: можно остановиться или нужно продолжать.',
    takeaway: inst => inst.spec.takeaway || 'Остановка определяется признаком завершения, а не числом выполненных шагов.',
    available: inst => inst.spec.states && inst.spec.states.length >= 2,
    render: (inst, api) => inst.spec.states.map((s, i) => `<div class="sc-state" data-i="${i}"><h4>${esc(s.label)}</h4><div class="learn-scroll">${s.html}</div><div class="sc-bk" role="radiogroup" aria-label="Можно ли остановиться: ${esc(s.label)}">${[['stop', 'Можно остановиться'], ['go', 'Нужно продолжать']].map(([k, l]) => `<button type="button" class="sc-opt" role="radio" aria-checked="false" data-k="${k}"><span class="sc-mark" aria-hidden="true"></span><span>${l}</span></button>`).join('')}</div><span class="sc-fb" aria-live="polite"></span></div>`).join(''),
    bind: (body, inst, api) => {
      const done = new Set(), states = inst.spec.states;
      body.querySelectorAll('.sc-state').forEach(el => {
        const s = states[+el.dataset.i], bts = [...el.querySelectorAll('.sc-opt')], fb = el.querySelector('.sc-fb');
        bts.forEach(b => b.addEventListener('click', () => {
          if (done.has(+el.dataset.i)) return;
          const ok = (b.dataset.k === 'stop') === s.done;
          bts.forEach(x => { x.setAttribute('aria-checked', String(x === b)); x.classList.remove('right', 'wrong'); });
          b.classList.add(ok ? 'right' : 'wrong');
          if (ok) { done.add(+el.dataset.i); bts.forEach(x => { x.disabled = x !== b; }); fb.textContent = '✓ ' + s.why; if (done.size === states.length) api.pass('<strong>Все состояния определены верно.</strong>'); }
          else { fb.textContent = '✗ ' + (s.hint || 'Проверьте признак завершения для этого метода.'); api.fail('<strong>Проверьте признак завершения.</strong>', 'stop'); }
        }));
      });
    }
  });

  /* ---------- Точки: допустимо ли? какая лучше? ---------- */
  function buildCandidates(P, base, extra) {
    const n = P.n, Q0 = () => Z(), one = () => ONE(), k = c => (x => x.map(v => v.mul(Q.of(c))));
    const list = [];
    const add = (x, label) => { if (!x || x.length !== n || x.some(v => v.s < 0)) return; if (!list.some(p => p.x.every((v, j) => v.eq(x[j])))) list.push({ x, label }); };
    (extra || []).forEach(x => add(x, 'Предложенный вектор'));
    if (base) add(base, 'Найденный решателем план');
    const zero = Array.from({ length: n }, Q0), ones = Array.from({ length: n }, one);
    if (base) { add(k(2)(base)); add(base.map(v => v.div(Q.of(2)))); add(base.map((v, j) => j === 0 ? v.add(ONE()) : v)); }
    add(zero); add(ones); add(k(3)(ones)); add(k(10)(ones)); add(ones.map((v, j) => j === 0 ? Q.of(5) : v));
    const ok = x => ALG.check(P, x).every(c => c.ok);
    const feas = list.filter(p => ok(p.x)), bad = list.filter(p => !ok(p.x));
    const pick = [...feas.slice(0, 3), ...bad.slice(0, 2)];
    if (pick.length < 4) pick.push(...[...feas.slice(3), ...bad.slice(2)].slice(0, 4 - pick.length));
    return pick.slice(0, 5).map(p => ({ ...p, ok: ok(p.x) }));
  }
  const objValue = (P, x) => P.c.reduce((s, c, j) => s.add(c.mul(x[j])), P.c0 ? P.c0 : Z());
  define('pointcheck', {
    goal: 'Научиться отличать допустимое решение от недопустимого и допустимое от оптимального.',
    action: 'Для каждой точки отметьте, допустима ли она; затем выберите лучшую из допустимых.',
    takeaway: 'Допустимая точка не нарушает ни одного ограничения. Оптимальная — допустимая и не хуже любой другой допустимой по цели; быть лучшей среди показанных недостаточно.',
    available: inst => !!(inst.data && inst.data.P && inst.data.P.rows && inst.data.P.c),
    render: (inst, api) => {
      const P = inst.data.P, pts = inst._pts = buildCandidates(P, inst.data.opt, inst.data.xbar ? [inst.data.xbar] : null);
      return `<p class="sc-model">${LU.objective(P)}</p><ul class="sc-model-rows">${P.rows.map((r, i) => `<li>(${i + 1}) ${LU.equation(r)}</li>`).join('')}</ul><ul class="sc-points">${order(pts.map((p, i) => ({ ...p, i })), inst.id, p => LU.vec(p.x)).map(p => `<li class="sc-point" data-i="${p.i}"><span class="sc-pt">x = ${esc(LU.vec(p.x))}</span><div class="sc-bk" role="radiogroup" aria-label="Допустима ли точка ${esc(LU.vec(p.x))}">${[['y', 'Допустима'], ['n', 'Недопустима']].map(([k, l]) => `<button type="button" class="sc-opt" role="radio" aria-checked="false" data-k="${k}"><span class="sc-mark" aria-hidden="true"></span><span>${l}</span></button>`).join('')}</div><span class="sc-fb" aria-live="polite"></span></li>`).join('')}</ul><div class="sc-stage2" hidden></div>`;
    },
    bind: (body, inst, api) => {
      const P = inst.data.P, pts = inst._pts, done = new Set(), stage2 = body.querySelector('.sc-stage2');
      const startStage2 = () => {
        const feas = pts.map((p, i) => ({ ...p, i })).filter(p => p.ok);
        if (feas.length < 2) { api.pass('<strong>Допустимость проверена.</strong>'); return; }
        const vals = feas.map(p => objValue(P, p.x)), best = vals.reduce((b, v, i) => (P.sense === 'max' ? v.gt(vals[b]) : v.lt(vals[b])) ? i : b, 0);
        const spec = choiceSpec(`Какая из допустимых точек лучше по цели (${P.sense})?`, LU.vec(feas[best].x), feas.filter((_, i) => i !== best).map(p => [LU.vec(p.x), `Значение цели ${LU.txt(objValue(P, p.x))} не лучше.`]), `В этой точке цель ${LU.txt(vals[best])} — лучшее среди показанных. Оптимальность задачи требует сравнения со всеми допустимыми точками.`);
        stage2.hidden = false; stage2.innerHTML = choiceHtml(spec, api.id + 'b');
        bindChoice(stage2, spec, api);
        api.say('Теперь сравните цель в допустимых точках.');
      };
      body.querySelectorAll('.sc-point').forEach(li => {
        const p = pts[+li.dataset.i], bts = [...li.querySelectorAll('.sc-opt')], fb = li.querySelector('.sc-fb');
        bts.forEach(b => b.addEventListener('click', () => {
          if (done.has(+li.dataset.i)) return;
          const ok = (b.dataset.k === 'y') === p.ok;
          bts.forEach(x => { x.setAttribute('aria-checked', String(x === b)); x.classList.remove('right', 'wrong'); });
          b.classList.add(ok ? 'right' : 'wrong');
          if (!ok) { fb.textContent = '✗ Подставьте точку в каждое ограничение по очереди.'; api.fail('<strong>Проверьте подстановку.</strong>', 'feasibility'); return; }
          done.add(+li.dataset.i); bts.forEach(x => { x.disabled = x !== b; });
          const chk = ALG.check(P, p.x), bad = chk.map((c, i) => ({ c, i })).filter(o => !o.c.ok);
          fb.innerHTML = p.ok ? `✓ Все ограничения выполнены; цель ${LU.f(objValue(P, p.x))}.` : '✓ Нарушено: ' + bad.map(o => `(${o.i + 1}): ${LU.f(o.c.lhs)} ${esc(P.rows[o.i].s)} ${LU.f(P.rows[o.i].b)} — не выполнено`).join('; ');
          if (done.size === pts.length) startStage2();
        }));
      });
    }
  });

  /* ---------- Ползунки ресурсов ---------- */
  function sliderMax(P) {
    return P.c.map((_, j) => {
      const caps = P.rows.filter(r => r.s === '<=' && r.a[j].s > 0).map(r => r.b.div(r.a[j]).toNumber());
      return Math.max(3, Math.min(30, Math.ceil((caps.length ? Math.min(...caps) : 10) * 1.4)));
    });
  }
  define('slider', {
    goal: 'Почувствовать, как общие ограничения не дают выбрать всё сразу.',
    action: 'Двигайте ползунки, пока не найдёте допустимый план с ненулевым выпуском, а потом — план, который нарушает ограничение.',
    takeaway: 'Ограничения связывают переменные: рост одной забирает ресурс у других. Лучший допустимый план — компромисс, а не «максимум всего».',
    available: inst => !!(inst.data && inst.data.P && inst.data.P.rows && inst.data.P.c && inst.data.P.c.length <= 5),
    render: (inst, api) => {
      const P = inst.data.P, mx = sliderMax(P);
      return `<p class="sc-model">${LU.objective(P)}</p><div class="sc-sliders">${P.c.map((c, j) => `<label class="sc-slider"><span>x<sub>${j + 1}</sub></span><input type="range" min="0" max="${mx[j]}" step="1" value="0" data-j="${j}" aria-label="x${j + 1}"><output>0</output></label>`).join('')}</div><div class="sc-bars">${P.rows.map((r, i) => `<div class="sc-bar" data-i="${i}"><span class="sc-bar-t">(${i + 1}) <span class="sc-bar-v"></span></span><div class="sc-bar-track" role="meter" aria-valuemin="0" aria-valuemax="150" aria-valuenow="0" aria-label="Использование ограничения ${i + 1}"><div class="sc-bar-fill"></div><div class="sc-bar-limit" title="граница"></div></div></div>`).join('')}</div><p class="sc-obj">Цель: <strong class="sc-fv">0</strong></p>`;
    },
    bind: (body, inst, api) => {
      const P = inst.data.P, ins = [...body.querySelectorAll('input[type=range]')], bars = [...body.querySelectorAll('.sc-bar')], fv = body.querySelector('.sc-fv');
      const seen = { feasible: false, broken: false };
      const upd = () => {
        const x = ins.map(i => Q.of(+i.value));
        ins.forEach(i => { i.nextElementSibling.textContent = i.value; });
        const chk = ALG.check(P, x), allOk = chk.every(c => c.ok), nz = x.some(v => v.s > 0);
        chk.forEach((c, i) => {
          const r = P.rows[i], b = bars[i], ratio = r.b.isZero() ? (c.lhs.isZero() ? 0 : 1.5) : Math.min(1.5, Math.abs(c.lhs.toNumber() / r.b.toNumber()));
          b.querySelector('.sc-bar-v').textContent = `${LU.txt(c.lhs)} ${r.s} ${LU.txt(r.b)} ${c.ok ? '✓' : '✗'}`;
          const fill = b.querySelector('.sc-bar-fill'); fill.style.width = (ratio / 1.5 * 100) + '%'; b.classList.toggle('over', !c.ok);
          b.querySelector('.sc-bar-limit').style.left = (1 / 1.5 * 100) + '%';
          b.querySelector('[role=meter]').setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
        });
        fv.textContent = LU.txt(objValue(P, x));
        if (nz && allOk) seen.feasible = true; if (nz && !allOk) seen.broken = true;
        if (seen.feasible && seen.broken) api.pass('<strong>Вы нашли допустимый план и увидели границу.</strong> Метки ✓ и ✗ показывают, где ресурс исчерпан.');
        else api.say(allOk && nz ? 'Допустимый план: все ограничения выполнены. Теперь попробуйте превысить какой-нибудь ресурс.' : nz ? 'Одно из ограничений нарушено (метка ✗).' : 'Задайте ненулевой выпуск.');
      };
      ins.forEach(i => i.addEventListener('input', upd)); upd();
    }
  });

  return { define, mount, available, has, defs, choiceSpec, choiceHtml, bindChoice, buildCandidates, objValue, uid };
})();
