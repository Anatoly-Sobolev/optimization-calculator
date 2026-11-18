/* =====================================================================
   5. РЕШЕНИЯ ПО ТИПАМ ЗАДАНИЙ (каждый раздел строится из расчёта)
   ===================================================================== */
const VIEWS = (() => {
  const { fq, approx, par, xv, tv, yv, vname, zlab, sg, lin, vec, sec, table, stepper, allTables, plot, plot3d } = R;
  const Zq = () => new Q(0n);

  const withC0 = (pr, s) => !pr.c0 || pr.c0.isZero() ? s : s === '0' ? fq(pr.c0) : fq(pr.c0) + (s.startsWith('−') ? ' − ' + s.slice(1) : ' + ' + s);
  const objLine = (pr, lab = xv, name = 'f') => `<i>${name}</i> = ${withC0(pr, lin(pr.c, j => lab(j + 1)))} → ${pr.sense}`;
  const rowLine = (r, lab = xv) => `${lin(r.a, j => lab(j + 1))} ${sg(r.s)} ${fq(r.b)}`;
  const nonneg = (n, lab = xv) => [...Array(n)].map((_, j) => lab(j + 1)).join(', ') + ' ≥ 0';
  const system = (pr, lab = xv, name = 'f', nums = true) => `<div class="sys">${objLine(pr, lab, name)}<br>${pr.rows.map((r, i) => rowLine(r, lab) + (nums ? ` <span class="kbd">(${i + 1})</span>` : '')).join('<br>')}<br>${nonneg(pr.n, lab)}</div>`;

  /* ---------- сравнение с ответом методички ---------- */
  function tolOf(s) { const t = s.split('+').pop(); if (t.includes('/')) return new Q(0n); const d = t.includes('.') ? t.split('.')[1].length : 0; return new Q(1n, 2n * 10n ** BigInt(d)); }
  const near = (v, s) => v.sub(Q.parse(s)).abs().le(tolOf(s));
  const ansText = s => { const m = s.match(/^(-?\d+)\+(\d+)\/(\d+)$/); return m ? `${m[1].replace('-', '−')} ${m[2]}/${m[3]}` : s.replace('.', ',').replace('-', '−'); };
  function compare(pr, res, meta) {
    if (meta && meta.zyk) return compareZ(pr, res, meta);
    if (!meta || !meta.answer) return '';
    const A = meta.answer, fA = Q.parse(A.f), xA = A.x.map(Q.parse);
    let h = `<p>Ответ в методичке: <b><i>f</i>* = ${ansText(A.f)}; <i>x</i>* = (${A.x.map(ansText).join('; ')})</b>.</p>`;
    const exact = !A.f.includes('.') && A.x.every(s => !s.includes('.'));
    if (res.status === 'optimal' && near(res.f, A.f) && res.x.every((v, j) => near(v, A.x[j]))) {
      h += `<div class="note ok">✓ Расчёт совпадает с ответом методички${exact ? '' : ' (с точностью записи в методичке)'}.</div>`;
    } else {
      const chk = ALG.check(pr, xA), fval = ALG.value(pr.c, xA);
      const bad = chk.map((c, i) => c.ok ? null : `ограничение (${i + 1}): ${fq(c.lhs)} ${sg(pr.rows[i].s)} ${fq(pr.rows[i].b)} — не выполнено`).filter(Boolean);
      h += `<div class="note warn"><b>⚠ Расхождение с ответом методички.</b><ul>`;
      if (xA.some(v => v.s < 0)) h += '<li>в точке из ответа есть отрицательная координата;</li>';
      if (bad.length) h += `<li>точка из ответа <b>недопустима</b>: ${bad.join('; ')};</li>`;
      else h += `<li>точка из ответа допустима, значение цели в ней f = ${fq(fval)}${fval.eq(fA) ? '' : ` (в методичке указано ${ansText(A.f)})`};</li>`;
      if (res.status === 'optimal') {
        const better = pr.sense === 'max' ? res.f.gt(fval) : res.f.lt(fval);
        h += `<li>расчёт: <i>f</i>* = ${fq(res.f)}${approx(res.f)} в точке ${vec(res.x)}${!bad.length && better ? ' — это ' + (pr.sense === 'max' ? 'больше' : 'меньше') + ', значит точка из ответа не оптимальна' : ''}.</li>`;
      } else h += `<li>расчёт: ${statusText(res.status)}.</li>`;
      h += '</ul></div>';
    }
    if (meta.note) h += `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>`;
    return h;
  }
  const checkTitle = meta => meta && meta.zyk ? 'Проверка и сравнение с ответом сборника' : meta && meta.answer ? 'Проверка и сравнение с методичкой' : 'Проверка';
  const noCheck = res => res.status === 'optimal' ? '' : `<div class="note">Проверка подстановкой не выполняется: ${statusText(res.status)} (см. разделы выше).</div>`;
  /* Итоговая карточка: ответ и сверка видны сразу под условием, подробности — ниже. */
  const cap = s => s[0].toUpperCase() + s.slice(1);
  function summaryCard({ main, facts = [], badges = [], links = [] }) {
    return `<section class="card sol sumcard" id="sum" data-title="Итог"><div class="sumgrid"><div><div class="kbd">Итог</div><div class="answer">${main}</div>${facts.length ? `<div class="facts">${facts.map(t => `<span>${t}</span>`).join('')}</div>` : ''}</div><div class="badges">${badges.filter(Boolean).join('')}</div></div>${links.length ? `<div class="btnrow">${links.map(([id, t]) => `<a class="btn" href="#${id}" data-jump="${id}">${t} ↓</a>`).join('')}</div>` : ''}</section>`;
  }
  const resMain = res => res.status === 'optimal' ? `<i>x</i>* = ${vec(res.x)}, &nbsp;<i>f</i>* = ${fq(res.f)}${approx(res.f)}` : cap(statusText(res.status));
  function bookBadge(pr, res, meta) {
    if (!meta) return '';
    if (meta.zyk) {
      const V = verdictZ(pr, res, meta.answerZ);
      return { ok: '<span class="badge ok">✓ совпадает с ответом сборника</span>', alt: '<span class="badge ok">✓ ответ сборника — тоже оптимум</span>', diff: '<span class="badge warn">⚠ в сборнике другой ответ — см. «Проверка»</span>', na: '<span class="badge info">в сборнике ответа нет</span>' }[V.kind];
    }
    if (!meta.answer) return '<span class="badge info">собственные коэффициенты</span>';
    const A = meta.answer, ok = res.status === 'optimal' && near(res.f, A.f) && res.x.every((v, j) => near(v, A.x[j]));
    return ok ? '<span class="badge ok">✓ совпадает с ответом методички</span>' : '<span class="badge warn">⚠ отличается от ответа методички — см. «Проверка»</span>';
  }
  const checkBadge = (pr, x) => x ? (ALG.check(pr, x).every(c => c.ok) ? '<span class="badge ok">✓ все ограничения выполнены</span>' : '<span class="badge bad">✗ ограничение нарушено</span>') : '';
  /* Если задачу можно изобразить на плоскости (x₁; x₂), возвращает задачу с двумя переменными. */
  function planeOf(pr) {
    if (pr.n === 2 && pr.rows.every(r => r.s !== '=')) return pr;
    if (pr.n < 2) return null;
    const Rd = ALGZ.reduce2(pr);
    return Rd.ok && !Rd.contra.length && Rd.pr2.rows.length ? Rd.pr2 : null;
  }
  const xyOf = s => [0, 1].map(j => { const i = s.basis.indexOf(j); return i < 0 ? 0 : s.rows[i].b.toNumber(); });
  /* График «путь симплекс-метода»: каждая таблица — точка (x₁; x₂) её базисного решения. */
  function pathPlot(pr, phases, intro) {
    const P2 = planeOf(pr); if (!P2) return '';
    const G = ALG.graph(P2), N = q => q.toNumber();
    const cfg = {
      lines: P2.rows.map((r, i) => ({ a: r.a.map(N), b: N(r.b), s: r.s, name: '(' + (i + 1) + ')', html: rowLine(r), eq: r.s === '=' })), f0: P2.c0 ? N(P2.c0) : 0,
      c: P2.c.map(N), sense: P2.sense, pts: G.verts.map(w => w.p.map(N)), ax: ['x₁', 'x₂'], unbounded: G.status === 'unbounded',
      paths: phases.filter(p => p.steps && p.steps.length).map(p => ({ pts: p.steps.map(xyOf), from: p.from, cls: p.cls, prefix: p.prefix, title: p.title })),
      purpose: 'что делает симплекс-метод геометрически. Каждая таблица — точка на плоскости: базисное решение. Смотрите: 1) точки — вершины допустимой области (на этапе 1 — ещё вне её); 2) каждый шаг — переход по стороне к соседней вершине, где цель лучше; 3) метод останавливается в вершине, из которой улучшить цель нельзя, — и не перебирает остальные вершины.'
    };
    cfg.status = G.status;
    if (G.status === 'optimal') { cfg.opt = G.optVertex.p.map(N); cfg.optLabel = ''; cfg.fval = N(G.f) - (cfg.f0 || 0); }
    const same = P2 === pr ? '' : `<p class="kbd">Переменных больше двух, поэтому область показана на плоскости (x₁; x₂): остальные переменные выражены из уравнений, условия на них дают прямые (1)–(${P2.rows.length}).</p>`;
    return sec('geo', 'Геометрия: путь по вершинам', `<p>${intro || 'Каждая симплекс-таблица — вершина допустимой области (точка базисного решения). Симплекс-метод переходит по рёбрам к соседней вершине, пока цель улучшается.'} Нажмите на точку — откроется соответствующая таблица.</p>${same}` + plot(cfg));
  }
  /* Три переменные без уравнений: объёмный многогранник и путь симплекс-метода. */
  function path3d(pr, phases, res, intro) {
    if (pr.n !== 3) return '';
    const N = q => q.toNumber();
    const xyz = s => [0, 1, 2].map(j => { const i = s.basis.indexOf(j); return i < 0 ? 0 : s.rows[i].b.toNumber(); });
    const cfg = { planes: pr.rows.map((r, i) => ({ a: r.a.map(N), b: N(r.b), s: r.s, name: '(' + (i + 1) + ')', html: rowLine(r) })), c: pr.c.map(N), sense: pr.sense,
      paths: phases.filter(p => p.steps && p.steps.length).map(p => ({ pts: p.steps.map(xyz), from: p.from, cls: p.cls, prefix: p.prefix, title: p.title })),
      opt: res.status === 'optimal' ? res.x.map(N) : null,
      purpose: 'ту же идею, что и графический метод, но для трёх переменных. Смотрите: 1) каждая грань — одно ограничение, лишние ограничения граней не образуют; 2) вершины — базисные решения, по ним и идёт симплекс-метод; 3) плоскость уровня цели последней касается многогранника в оптимальной вершине — там сходятся ограничения, выполненные как равенства.' };
    return sec('geo3', 'Геометрия: многогранник и путь по вершинам', `<p>${intro || 'Три переменные — допустимая область является многогранником в пространстве. Каждая симплекс-таблица — его вершина, шаг метода — переход по ребру.'} Нажмите на точку пути — откроется таблица.</p>` + plot3d(cfg));
  }
  const statusText = s => ({ infeasible: 'допустимая область пуста — задача не имеет решения', unbounded: 'целевая функция не ограничена — оптимума нет', cycle: 'алгоритм не смог завершиться (зацикливание)', error: 'алгоритм не может продолжить решение' }[s] || s);

  function checkTable(pr, x, lab = xv) {
    const ch = ALG.check(pr, x);
    return `<div class="tblwrap"><table class="plain"><tr><th>Огр.</th><th>Подстановка</th><th>Левая часть</th><th>Знак и правая часть</th><th>Запас</th><th></th></tr>${pr.rows.map((r, i) => `<tr><td>(${i + 1})</td><td class="m">${r.a.map((v, j) => (j ? (v.s < 0 ? ' − ' : ' + ') : (v.s < 0 ? '−' : '')) + fq(v.abs()) + '·' + par(x[j])).join('')}</td><td class="m"><b>${fq(ch[i].lhs)}</b></td><td class="m">${sg(r.s)} ${fq(r.b)}</td><td class="m">${ch[i].tight ? 'равенство' : fq(ch[i].lhs.sub(r.b).abs())}</td><td class="${ch[i].ok ? 'tick' : 'bad-t'}">${ch[i].ok ? '✓' : '✗'}</td></tr>`).join('')}</table></div>`;
  }
  const valueLine = (pr, x, name = 'f') => { const v0 = ALGZ.fv(pr, x); return `<p class="m big2"><i>${name}</i> = ${pr.c0 && !pr.c0.isZero() ? fq(pr.c0) + ' + ' : ''}${pr.c.map((v, j) => (j ? (v.s < 0 ? ' − ' : ' + ') : (v.s < 0 ? '−' : '')) + fq(v.abs()) + '·' + par(x[j])).join('')} = <b>${fq(v0)}</b>${approx(v0)}</p>`; };

  /* =================== Задание 1: графический метод =================== */
  function graph(pr, meta, opts = {}) {
    const G = ALG.graph(pr), S = [];
    if (opts.pre) S.push(...opts.pre);
    else S.push(sec('cond', 'Условие', system(pr) + (meta && meta.answer ? '' : '') + `<p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`));
    if (!opts.noSummary) {
      const res0 = { status: G.status, f: G.f, x: G.status === 'optimal' ? G.optVertex.p : null };
      const facts = [`вершин области: ${G.verts.length}`];
      if (G.status === 'optimal' && G.opt.length > 1) facts.push('оптимум не единственный');
      if (G.status === 'optimal' && G.degenerate) facts.push('вырожденная вершина');
      S.push(summaryCard({ main: resMain(res0), facts, badges: [bookBadge(pr, res0, meta), checkBadge(pr, res0.x)], links: [['plot', 'График'], ['opt', 'Решение системы'], ['check', 'Проверка']] }));
    }
    S.push(sec('how', 'Как решается', `<ol class="howl">
      <li>Каждое ограничение задаёт полуплоскость. Её граница — прямая через точки (0; b/a₂) и (b/a₁; 0).</li>
      <li>Нужную сторону находим подстановкой точки (0; 0) в неравенство.</li>
      <li>Пересечение всех полуплоскостей и условий x ≥ 0 — допустимая область.</li>
      <li>Отмечаем вектор градиента (c₁; c₂) — направление роста f (для задачи на min — антиградиент).</li>
      <li>Сдвигаем линию уровня c₁x₁ + c₂x₂ = const в этом направлении до последней общей точки с областью.</li>
      <li>Координаты этой точки находим из системы уравнений двух прямых, на которых она лежит.</li></ol>`));
    S.push(sec('anim', 'Построение графика по шагам', demoGraphBuild(pr, G)));
    // прямые
    S.push(sec('lines', 'Граничные прямые и полуплоскости', `<div class="tblwrap"><table class="plain"><tr><th>№</th><th>Ограничение</th><th>Прямая</th><th>Точки на осях</th><th>Точка (0; 0)</th></tr>${G.lines.map(L => `<tr><td>(${L.i + 1})</td><td class="m">${rowLine(pr.rows[L.i])}</td><td class="m">${lin(L.a, j => xv(j + 1))} = ${fq(L.b)}</td><td class="m">${L.iy != null ? `(0; ${fq(L.iy)})` : 'параллельна оси x₂'}${L.ix != null ? `, (${fq(L.ix)}; 0)` : ', параллельна оси x₁'}</td><td>${L.s === '=' ? 'равенство — допустимые точки лежат на самой прямой' : L.origin ? 'удовлетворяет — берём сторону с началом координат' : 'не удовлетворяет — берём противоположную сторону'}</td></tr>`).join('')}</table></div>`));
    // график
    const N = q => q.toNumber();
    const cfg = {
      lines: pr.rows.map((r, i) => ({ a: r.a.map(N), b: N(r.b), s: r.s, name: '(' + (i + 1) + ')', html: rowLine(r), eq: r.s === '=' })), f0: pr.c0 ? N(pr.c0) : 0,
      c: pr.c.map(N), sense: pr.sense, pts: G.verts.map(w => w.p.map(N)), ax: ['x₁', 'x₂'], unbounded: G.status === 'unbounded'
    };
    if (G.status === 'optimal') {
      cfg.opt = G.optVertex.p.map(N); cfg.fval = N(G.f) - cfg.f0; cfg.optLabel = 'x* = ' + vec(G.optVertex.p).replace(/<[^>]+>/g, '');
      if (G.opt.length > 1) cfg.optSeg = [G.opt[0].p.map(N), G.opt[1].p.map(N)];
      cfg.endText = `f* = ${G.f.toText()} — дальше линия уровня выходит из области`;
    } else cfg.anim = G.status === 'unbounded';
    if (G.status === 'unbounded') { cfg.endText = 'линия уровня уходит бесконечно — f не ограничена'; cfg.fval = null; }
    if (G.lp.phase2 && G.lp.phase2.steps.length > 1) { cfg.paths = [{ pts: G.lp.phase2.steps.map(xyOf), title: 'симплекс-таблица' }]; cfg.pathHidden = true; }
    cfg.trainer = true; cfg.whatif = true; cfg.status = G.status;
    cfg.purpose = 'как из ограничений складывается допустимая область и почему оптимум находится в её вершине. Смотрите: 1) какую сторону каждой прямой оставляет неравенство (стрелки у прямых); 2) куда указывает зелёная стрелка — направление улучшения цели; 3) в какой вершине линия уровня последний раз касается области — это и есть решение.';
    if (G.status === 'optimal' && pr.sense === 'max' && pr.rows.every(r => r.s !== '=')) {
      const Dr = ALG.dual(pr);
      if (Dr.status === 'optimal') cfg.duals = Dr.norm.map((r, i) => (r.flipped ? Dr.y[i].neg() : Dr.y[i]).toNumber());
    }
    S.push(sec('plot', 'График', plot(cfg) + (G.status === 'infeasible' ? '<div class="note bad">Общей области у полуплоскостей нет — допустимая область пуста.</div>' : '')));
    // вершины
    let vt;
    if (!G.verts.length) vt = '<div class="note bad">Ни одна точка пересечения прямых не удовлетворяет всем ограничениям: допустимая область пуста.</div>';
    else vt = `<div class="tblwrap"><table class="plain"><tr><th>Вершина</th><th>Лежит на</th><th>f</th></tr>${G.verts.map(w => `<tr class="${G.f && w.f.eq(G.f) ? 'best' : ''}"><td class="m">${vec(w.p)}</td><td>${w.on.map(o => typeof o === 'number' ? '(' + (o + 1) + ')' : o === 'x1' ? 'оси x₂ (x₁ = 0)' : 'оси x₁ (x₂ = 0)').join(', ')}</td><td class="m">${fq(w.f)}${approx(w.f)}</td></tr>`).join('')}</table></div>`;
    S.push(sec('verts', 'Вершины допустимой области', (G.verts.length ? demoGraphVerts(pr, G) : '') + vt + (G.status === 'optimal' ? '<p class="kbd">Оптимум ЛП достигается в вершине — это проверка графического решения перебором.</p>' : '')));
    // оптимум
    let oh = '';
    if (G.status === 'optimal') {
      const w = G.optVertex, all = [...pr.rows.map(r => ({ a: r.a, b: r.b })), { a: [new Q(1n), Zq()], b: Zq() }, { a: [Zq(), new Q(1n)], b: Zq() }];
      const idx = w.on.map(o => typeof o === 'number' ? o : o === 'x1' ? pr.rows.length : pr.rows.length + 1);
      const L1 = all[idx[0]], L2 = all[idx[1]];
      const D = L1.a[0].mul(L2.a[1]).sub(L1.a[1].mul(L2.a[0])), D1 = L1.b.mul(L2.a[1]).sub(L1.a[1].mul(L2.b)), D2 = L1.a[0].mul(L2.b).sub(L1.b.mul(L2.a[0]));
      const nm = k => k < pr.rows.length ? '(' + (k + 1) + ')' : k === pr.rows.length ? 'x₁ = 0' : 'x₂ = 0';
      oh += `<p>Линия уровня, сдвигаясь по ${pr.sense === 'max' ? 'градиенту' : 'антиградиенту'} (${fq(pr.c[0])}; ${fq(pr.c[1])}), последней касается области в точке пересечения прямых ${nm(idx[0])} и ${nm(idx[1])}. Решаем систему (метод Крамера):</p>
        <div class="sys">${lin(L1.a, j => xv(j + 1))} = ${fq(L1.b)}<br>${lin(L2.a, j => xv(j + 1))} = ${fq(L2.b)}</div>
        <p class="m">Δ = ${par(L1.a[0])}·${par(L2.a[1])} − ${par(L1.a[1])}·${par(L2.a[0])} = ${fq(D)}; &nbsp; Δ₁ = ${par(L1.b)}·${par(L2.a[1])} − ${par(L1.a[1])}·${par(L2.b)} = ${fq(D1)}; &nbsp; Δ₂ = ${par(L1.a[0])}·${par(L2.b)} − ${par(L1.b)}·${par(L2.a[0])} = ${fq(D2)}</p>
        <p class="m big2"><i>x</i>₁ = Δ₁/Δ = ${fq(D1.div(D))}, &nbsp; <i>x</i>₂ = Δ₂/Δ = ${fq(D2.div(D))}</p>` + valueLine(pr, w.p);
      if (G.opt.length > 1) oh += `<div class="note">Оптимум не единственный: линия уровня параллельна стороне области, и f = ${fq(G.f)} на всём отрезке между ${G.opt.map(o => vec(o.p)).join(' и ')}.</div>`;
      if (G.degenerate) oh += `<div class="note">В точке ${vec(w.p)} сходятся ${w.on.length} границы — вершина <b>вырожденная</b>. Это влияет на двойственную задачу (задание 4).</div>`;
      oh += `<p class="answer"><i>x</i>* = ${vec(G.optVertex.p)}, &nbsp;<i>f</i>* = ${fq(G.f)}</p>`;
    } else oh = `<div class="note bad"><b>${statusText(G.status)[0].toUpperCase() + statusText(G.status).slice(1)}.</b> ${G.status === 'unbounded' ? 'Допустимая область не ограничена в направлении роста f: линию уровня можно сдвигать бесконечно.' : ''}</div>`;
    const ohCut = (() => { if (G.status !== 'optimal') return -1; const i = oh.indexOf('<div class="note">'); return i < 0 ? oh.indexOf('<p class="answer">') : i; })();
    const ohBody = ohCut < 0 ? oh : `<details class="dmmore"><summary>Подробно: решение системы (метод Крамера)</summary>${oh.slice(0, ohCut)}</details>${oh.slice(ohCut)}`;
    S.push(sec('opt', 'Оптимальное решение', (G.verts.length && G.status !== 'infeasible' ? demoGraphObj(pr, G) : '') + ohBody));
    const res = { status: G.status, f: G.f, x: G.status === 'optimal' ? G.optVertex.p : null };
    if (opts.finish) { S.push(...opts.finish(res, G)); return S; }
    S.push(sec('check', checkTitle(meta), (res.x ? demoAnswer(pr, res.x, res.f, null) + checkTable(pr, res.x) + valueLine(pr, res.x) : noCheck(res)) + compare(pr, res, meta)));
    return S;
  }

  /* =================== Задание 2: симплекс-метод =================== */
  function simplex(pr, meta) {
    const res = ALG.twoPhase(pr), S = [], n = pr.n, m = pr.rows.length;
    S.push(sec('cond', 'Условие', system(pr) + `<p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`));
    S.push(summaryCard({ main: resMain(res), facts: [`итераций: ${res.phase2.steps.length - 1}`, ...(res.status === 'optimal' && res.alt.length ? ['оптимум не единственный'] : []), ...(res.status === 'optimal' && res.degenerate ? ['вырожденное решение'] : [])],
      badges: [bookBadge(pr, res, meta), checkBadge(pr, res.status === 'optimal' ? res.x : null)], links: [['iter', 'Пошаговое решение'], ['res', 'Ответ'], ['check', 'Проверка']] }));
    S.push(sec('how', 'Как решается', `<ol class="howl">
      <li>В каждое «≤» добавляем дополнительную переменную (остаток) — получаем приведённую задачу; остатки образуют стартовый базис.</li>
      <li>Строка f таблицы — коэффициенты цели с обратным знаком.</li>
      <li><b>Шаг 1.</b> Нет отрицательных в строке f → решение оптимально.</li>
      <li><b>Шаг 2.</b> Есть столбец с минусом в строке f и без положительных элементов → f не ограничена.</li>
      <li><b>Шаг 3.</b> Ведущий столбец — самое отрицательное число строки f (кто входит в базис).</li>
      <li><b>Шаг 4.</b> Ведущая строка — минимум b ÷ a по строкам с a &gt; 0 (кто выходит).</li>
      <li><b>Шаг 5.</b> Ведущую строку делим на ведущий элемент, из остальных вычитаем её, умноженную на их число в ведущем столбце.</li></ol>
      <p class="kbd"><b>Базис</b> — переменные, подписанные слева у строк; они равны своему b, остальные равны 0.</p>`));
    const sl = j => xv(n + j + 1);
    S.push(sec('reduce', 'Приведённая задача', demoCanon(pr, res) + `<p>Добавляем остатки ${[...Array(m)].map((_, i) => sl(i)).join(', ')} ≥ 0:</p><div class="sys">${pr.rows.map((r, i) => `${lin(r.a, j => xv(j + 1))} + ${sl(i)} = ${fq(r.b)}`).join('<br>')}</div>
      <p>При <span class="m">${[...Array(n)].map((_, j) => xv(j + 1)).join(' = ')} = 0</span> остатки равны правым частям: ${pr.rows.map((r, i) => `${sl(i)} = ${fq(r.b)}`).join(', ')} — стартовый базис.</p>`));
    const steps = res.phase2.steps;
    S.push(sec('t0', 'Начальная таблица', demoToTable(pr, res, steps[0], true) + `<p>Строка f: ${pr.c.map((v, j) => `${fq(v)} → ${fq(v.neg())}`).join(', ')} (знак меняется, так как f − ${lin(pr.c, j => xv(j + 1))} = 0). В b строки f — 0.</p>` + table(steps[0])));
    let sid = null;
    const stp = steps.length > 1 || res.status !== 'optimal' ? (s0 => { sid = R.R_last.id; return s0; })(stepper(steps, 'Симплекс-метод')) : null;
    S.push(sec('iter', 'Итерации симплекс-метода', (stp ? stp : '<div class="note ok">Начальная таблица уже оптимальна.</div>') + (res.phase2.bland ? '<div class="note">Обнаружен повтор базиса — далее применено правило Бленда, чтобы избежать зацикливания.</div>' : '')));
    const geo = pathPlot(pr, [{ steps, from: sid, title: 'таблица' }]) || path3d(pr, [{ steps, from: sid, title: 'таблица' }], res); if (geo) S.push(geo);
    S.push(sec('all', 'Все таблицы подряд', allTables(steps)));
    let rh;
    if (res.status === 'optimal') {
      const last = res.last;
      rh = `<p>В итоговой таблице слева стоят ${last.basis.map(bj => vname(last.vars, bj)).join(', ')} — они равны своему b, остальные переменные равны 0. Дополнительные переменные ${[...Array(m)].map((_, i) => sl(i)).join(', ')} в ответ не входят.</p>
        <p class="answer"><i>x</i>* = ${vec(res.x)}, &nbsp;<i>f</i>* = ${fq(res.f)}${approx(res.f)}</p>`;
      if (res.alt.length) rh += `<div class="note">В строке f под небазисной переменной ${res.alt.map(j => vname(last.vars, j)).join(', ')} стоит 0 — есть и другие оптимальные решения с тем же f*.</div>`;
      if (res.degenerate) rh += '<div class="note">Есть базисная переменная, равная 0, — решение <b>вырожденное</b>.</div>';
    } else rh = `<div class="note bad"><b>${statusText(res.status)}.</b></div>`;
    S.push(sec('res', 'Ответ', (res.status === 'optimal' ? demoAnswer(pr, res.x, res.f, res.last, { alt: res.alt, degenerate: res.degenerate }) : '') + rh));
    S.push(sec('check', checkTitle(meta), (res.status === 'optimal' ? checkTable(pr, res.x) + valueLine(pr, res.x) : noCheck(res)) + compare(pr, res, meta)));
    return S;
  }

  /* =================== Задание 3: метод искусственного базиса =================== */
  /* opts.artificialAll === false — искусственные только там, где нет готовой базисной переменной (сборник ПЗ, 2.4);
     opts.zyk — задача сборника: любые знаки ограничений, вывод допустимого базисного решения (2.3). */
  function artificial(pr, meta, opts = {}) {
    const all = opts.artificialAll !== false;
    const res = ALG.twoPhase(pr, { artificialAll: all }), S = [], n = pr.n, m = pr.rows.length;
    const std3 = all && pr.rows.every(r => r.s === '>=');
    S.push(sec('cond', 'Условие', system(pr) + `<p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`));
    {
      const s0 = res.phase2 && res.phase2.steps[0];
      const bfs = s0 ? [...Array(n)].map((_, j) => { const i = s0.basis.indexOf(j); return i < 0 ? Zq() : s0.rows[i].b; }) : null;
      const facts = [];
      if (res.phase1) facts.push(`этап 1: ${res.phase1.steps.length - 1} итер.`); else facts.push('этап 1 не нужен — готовый базис');
      if (res.phase2) facts.push(`этап 2: ${res.phase2.steps.length - 1} итер.`);
      if (res.status === 'optimal' && res.alt.length) facts.push('оптимум не единственный');
      let main = resMain(res);
      if (opts.zyk && all) main = (bfs ? `Допустимое базисное решение: <i>x</i> = ${vec(bfs)}` : cap(statusText(res.status))) + (res.status === 'optimal' ? `<div class="kbd" style="font-size:15px">далее оптимум: x* = ${vec(res.x)}, f* = ${fq(res.f)}</div>` : res.status === 'unbounded' ? '<div class="kbd" style="font-size:15px">далее: цель не ограничена</div>' : '');
      S.push(summaryCard({ main, facts, badges: [bookBadge(pr, res, meta), checkBadge(pr, res.status === 'optimal' ? res.x : null)], links: [...(res.phase1 ? [['ph1', 'Этап 1']] : []), ...(res.phase2 ? [['ph2', 'Этап 2']] : []), ['check', 'Проверка']] }));
    }
    const v = res.vars, VN = j => vname(v, j);
    if (std3) {
    S.push(sec('how', 'Как решается', `<ol class="howl">
      <li>«≥» превращаем в равенство, <b>вычитая излишек</b> x<sub>n+i</sub> ≥ 0. Если правая часть отрицательна, уравнение умножаем на −1.</li>
      <li>Готового базиса нет (при нулевых x излишек был бы отрицательным), поэтому в каждое уравнение добавляем <b>искусственную</b> переменную tᵢ ≥ 0.</li>
      <li><b>Этап 1.</b> Симплекс-методом ищем минимум h = t₁ + … + tₘ (в таблице — строка −h, её максимизируем). Строка −h: минус сумма столбцов.</li>
      <li>Если h* &gt; 0 — допустимая область пуста. Если h* = 0 — все t выводятся из базиса, их столбцы удаляются.</li>
      <li><b>Этап 2.</b> Записываем строку −f (min f = max(−f)) и выражаем её через небазисные переменные, затем обычный симплекс-метод.</li></ol>`));
    let ch = `<p><b>1. Излишки.</b></p><div class="sys">${pr.rows.map((r, i) => `${lin(r.a, j => xv(j + 1))} − ${VN(res.slackOf[i])} = ${fq(r.b)}`).join('<br>')}</div>`;
    const flips = res.notes.filter(x => x.kind === 'flip');
    if (flips.length) ch += `<p><b>Отрицательные правые части.</b> ${flips.map(f => `Уравнение ${f.i + 1} умножаем на −1`).join('; ')}:</p><div class="sys">${flips.map(f => { const r = res.rows[f.i]; return `${lin(r.a, j => xv(j + 1))} + ${VN(res.slackOf[f.i])} = ${fq(r.b)}`; }).join('<br>')}</div>`;
    ch += `<p><b>2. Искусственные переменные</b> (в каждое уравнение):</p><div class="sys">${res.rows.map((r, i) => `${lin(r.a, j => xv(j + 1))} ${r.flipped ? '+' : '−'} ${VN(res.slackOf[i])} + ${VN(res.artOf[i])} = ${fq(r.b)}`).join('<br>')}</div>
      <p>Стартовый базис: ${res.rows.map((r, i) => `${VN(res.artOf[i])} = ${fq(r.b)}`).join(', ')}. Цель этапа 1: h = ${res.artOf.map(VN).join(' + ')} → min.</p>`;
    S.push(sec('canon', 'Преобразования', demoCanon(pr, res) + ch));
    const p1 = res.phase1, st0 = p1.steps[0];
    const colEx = st0.cols.filter(j => v[j].kind !== 't').map(j => `${VN(j)}: −(${res.rows.map(r => fq(st0.rows[res.rows.indexOf(r)].a[j])).join(' + ').replace(/\+ −/g, '− ')}) = <b>${fq(st0.z.a[j])}</b>`).join('; ');
    S.push(sec('hrow', 'Строка −h', demoToTable(pr, res, res.phase1.steps[0], false) + demoHRow(pr, res) + `<p>Каждое число строки −h = минус сумма своего столбца по строкам с t (в столбцах t — 0). b: −(${res.rows.map(r => fq(r.b)).join(' + ')}) = <b>${fq(st0.z.b)}</b>; ${colEx}.</p>
      <p class="kbd">Почему −h: алгоритм увеличивает цель, а уменьшить h — то же, что увеличить −h. h ≥ 0, поэтому b строки −h не больше 0; в конце этапа 1 ожидаем там 0 и ни одного отрицательного числа в строке.</p>` + table(st0)));
    const st1 = stepper(p1.steps, 'Этап 1'); res.sid1 = R.R_last.id;
    S.push(sec('ph1', 'Этап 1: минимум h', st1 + `<details><summary>Все таблицы этапа 1</summary>${allTables(p1.steps)}</details>`));
    } else {
    const hasArt = res.artOf.some(x => x !== null), artRows = [...Array(m).keys()].filter(i => res.artOf[i] !== null);
    S.push(sec('how', 'Как решается', `<ol class="howl">
      <li>Ограничения превращаем в равенства: в «≤» <b>прибавляем остаток</b>, из «≥» <b>вычитаем излишек</b>, «=» оставляем. Если правая часть отрицательна, уравнение умножаем на −1.</li>
      <li>${all ? 'В каждое уравнение добавляем <b>искусственную</b> переменную tᵢ ≥ 0 — она образует стартовый базис.' : 'Где нет готовой базисной переменной (остатка «≤» с b ≥ 0), добавляем <b>искусственную</b> переменную tᵢ ≥ 0.'}</li>
      <li><b>Этап 1.</b> Симплекс-методом ищем минимум h = Σ tᵢ (в таблице строка −h). Если h* &gt; 0 — допустимых решений нет; если h* = 0 — найдено <b>допустимое базисное решение</b>, столбцы t удаляются.</li>
      <li><b>Этап 2.</b> Записываем строку ${pr.sense === 'min' ? '−f (min f = max(−f))' : 'f (коэффициенты с обратным знаком)'}, выражаем её через небазисные переменные и продолжаем симплекс-методом.</li></ol>`));
    const slk = i => { const s = res.slackOf[i]; return s === null ? '' : ` ${res.rows[i].s === '<=' ? '+' : '−'} ${VN(s)}`; };
    let ch = `<p><b>1. Дополнительные переменные.</b></p><div class="sys">${pr.rows.map((r, i) => `${lin(r.a, j => xv(j + 1))}${res.slackOf[i] === null ? '' : ` ${r.s === '<=' ? '+' : '−'} ${VN(res.slackOf[i])}`} = ${fq(r.b)}`).join('<br>')}</div>`;
    const flips = res.notes.filter(x => x.kind === 'flip');
    if (flips.length) ch += `<p><b>Отрицательные правые части.</b> ${flips.map(f => `Уравнение ${f.i + 1} умножаем на −1`).join('; ')}:</p><div class="sys">${flips.map(f => { const r = res.rows[f.i]; return `${lin(r.a, j => xv(j + 1))}${slk(f.i)} = ${fq(r.b)}`; }).join('<br>')}</div>`;
    const basis0 = res.rows.map((r, i) => res.artOf[i] !== null ? res.artOf[i] : res.slackOf[i]);
    if (hasArt) ch += `<p><b>2. Искусственные переменные</b> (${all ? 'в каждое уравнение' : `в уравнения ${artRows.map(i => i + 1).join(', ')} — в них нет готовой базисной переменной`}):</p><div class="sys">${res.rows.map((r, i) => `${lin(r.a, j => xv(j + 1))}${slk(i)}${res.artOf[i] !== null ? ' + ' + VN(res.artOf[i]) : ''} = ${fq(r.b)}`).join('<br>')}</div>
      <p>Стартовый базис: ${res.rows.map((r, i) => `${VN(basis0[i])} = ${fq(r.b)}`).join(', ')}. Цель этапа 1: h = ${artRows.map(i => VN(res.artOf[i])).join(' + ')} → min.</p>`;
    else ch += `<div class="note ok">Во всех ограничениях есть остаток с коэффициентом 1 и b ≥ 0 — готовый базис ${res.rows.map((r, i) => `${VN(basis0[i])} = ${fq(r.b)}`).join(', ')}. Искусственные переменные и этап 1 не нужны.</div>`;
    S.push(sec('canon', 'Преобразования', demoCanon(pr, res) + (!hasArt && res.phase2 ? demoToTable(pr, res, res.phase2.steps[0], true) : '') + ch));
    if (hasArt) {
      const p1 = res.phase1, st0 = p1.steps[0];
      const colEx = st0.cols.filter(j => v[j].kind !== 't').map(j => `${VN(j)}: −(${artRows.map(i => fq(st0.rows[i].a[j])).join(' + ').replace(/\+ −/g, '− ')}) = <b>${fq(st0.z.a[j])}</b>`).join('; ');
      S.push(sec('hrow', 'Строка −h', demoToTable(pr, res, res.phase1.steps[0], false) + demoHRow(pr, res) + `<p>Каждое число строки −h = минус сумма своего столбца по строкам с t (в столбцах t — 0). b: −(${artRows.map(i => fq(res.rows[i].b)).join(' + ')}) = <b>${fq(st0.z.b)}</b>; ${colEx}.</p>` + table(st0)));
      const st1 = stepper(p1.steps, 'Этап 1'); res.sid1 = R.R_last.id;
      S.push(sec('ph1', 'Этап 1: минимум h', st1 + `<details><summary>Все таблицы этапа 1</summary>${allTables(p1.steps)}</details>`));
    }
    }
    if (res.status === 'infeasible') {
      S.push(sec('end1', 'Итог этапа 1', demoPhase1End(pr, res) + `<div class="note bad"><b>h* = ${fq(res.h)} &gt; 0.</b> Искусственные переменные нельзя обнулить: нет допустимого решения, в котором все t = 0. Значит, у исходной задачи <b>допустимая область пуста</b>; этап 2 не выполняется.</div>`));
      S.push(sec('check', checkTitle(meta), noCheck(res) + compare(pr, res, meta)));
      return S;
    }
    if (res.status !== 'optimal' && !res.phase2) { S.push(sec('end1', 'Итог этапа 1', `<div class="note bad">${statusText(res.status)}.</div>`)); return S; }
    let eh = res.phase1 ? `<div class="note ok">В строке −h нет отрицательных, b = 0 → <b>h* = 0</b>, все t = 0.</div>` : '';
    (res.driveOut || []).forEach(d => {
      eh += d.kind === 'pivot' ? `<p>${VN(d.before.basis[d.p])} осталась в базисе со значением 0 — выводим её, вводя ${VN(d.q)} (ведущий элемент ${fq(d.before.rows[d.p].a[d.q])}):</p>${table({ ...d.after, q: null })}`
        : `<p>${VN(d.before.basis[d.p])} осталась в базисе, а в её строке все коэффициенты при x равны 0 — ограничение лишнее, строку удаляем.</p>`;
    });
    if (opts.zyk) {
      const s0 = res.phase2.steps[0], bfs = [...Array(n)].map((_, j) => { const i = s0.basis.indexOf(j); return i < 0 ? Zq() : s0.rows[i].b; });
      eh += `<div class="note ok"><b>Допустимое базисное решение</b>${res.phase1 ? ' (результат этапа 1)' : ''}: базис ${s0.basis.map(bj => VN(bj)).join(', ')}; <span class="m"><i>x</i> = ${vec(bfs)}</span>.</div>`;
    }
    eh += `<p>${res.artOf.some(x => x !== null) ? `Столбцы ${res.artOf.filter(x => x !== null).map(VN).join(', ')} вычёркиваем. ` : ''}Нижнюю строку заменяем на ${zlab(res.raw.z.label)}: ${pr.sense === 'min' ? `min f = max(−f), поэтому в строку пишем коэффициенты f как есть: ${pr.c.map(fq).join(', ')}` : `в строку пишем коэффициенты f с обратным знаком`}.</p><div class="kbd">Строка «как есть»</div>` + table(res.raw);
    if (res.elim.length) {
      eh += `<p>Под базисными переменными в нижней строке должны стоять нули. Убираем: <b>новая = старая − ${res.elim.map(e => `${fq(e.k)} × (строка ${VN(e.bj)})`).join(' − ')}</b>. Нажмите на ячейку нижней строки:</p>`;
      const id = 'el' + Math.random().toString(36).slice(2, 8);
      const start2 = res.phase2.steps[0], mm = start2.rows.length;
      eh += `<div id="${id}">${table({ ...start2, q: null }, { click: true, clickRow: mm })}<div class="calc"></div></div>`;
      R.hooks.push(() => {
        const root = document.getElementById(id); if (!root) return;
        const out = root.querySelector('.calc');
        const ex = j => {
          root.querySelectorAll('td.sel').forEach(t => t.classList.remove('sel'));
          root.querySelector(`td[data-i="${mm}"][data-j="${j}"]`).classList.add('sel');
          const get = (S2, i) => j < 0 ? S2.rows[i].b : S2.rows[i].a[j];
          const old = j < 0 ? res.raw.z.b : res.raw.z.a[j], nw = j < 0 ? start2.z.b : start2.z.a[j];
          out.innerHTML = `<div class="kbd">Столбец ${j < 0 ? 'b' : VN(j)}</div><div class="big">${fq(old)}${res.elim.map(e => ` − ${par(e.k)} × ${par(get(res.raw, e.i))}`).join('')} = <b>${fq(nw)}</b></div>`;
        };
        root.querySelectorAll('td.click').forEach(td => td.onclick = () => ex(+td.dataset.j));
        ex(-1);
      });
    } else eh += table(res.phase2.steps[0]);
    const driveDemos = (res.driveOut || []).filter(d => d.kind === 'pivot').map(d => demoDrive(d)).join('');
    S.push(sec('ph2s', 'Переход к этапу 2', (res.phase1 ? demoPhase1End(pr, res) + driveDemos + demoPhase2Start(pr, res) : '') + eh));
    const p2 = res.phase2.steps;
    let sid2 = null;
    const st2 = p2.length > 1 || res.status !== 'optimal' ? (s0 => { sid2 = R.R_last.id; return s0; })(stepper(p2, 'Этап 2')) : null;
    S.push(sec('ph2', 'Этап 2: исходная задача', (p2.length > 1 ? `<details class="alld"><summary>Все таблицы этапа 2 одной лентой</summary>${allTables(p2)}</details>` : '') + (st2 ? st2 : `<div class="note ok">В строке ${zlab(p2[0].z.label)} нет отрицательных чисел — таблица сразу оптимальна, итераций этапа 2 не требуется.</div>`) + ((res.phase1 && res.phase1.bland) || res.phase2.bland ? '<div class="note">Применено правило Бленда против зацикливания.</div>' : '')));
    let rh;
    if (res.status === 'optimal') {
      const last = res.last;
      rh = `<p>Слева в итоговой таблице: ${last.basis.map(bj => vname(last.vars, bj)).join(', ')} — равны своему b; остальные равны 0. ${std3 ? 'Излишки' : 'Дополнительные переменные'} в ответ не входят. В b строки ${zlab(last.z.label)} стоит ${fq(last.z.b)}${pr.c0 && !pr.c0.isZero() ? `; с учётом свободного члена ${fq(pr.c0)} цели f* = ${fq(res.f)}` : pr.sense === 'min' ? ', значит f* = ' + fq(res.f) : ''}.</p>
        <p class="answer"><i>x</i>* = ${vec(res.x)}, &nbsp;<i>f</i>* = ${fq(res.f)}${approx(res.f)}</p>`;
      if (res.alt.length) rh += `<div class="note">Под небазисной переменной ${res.alt.map(j => vname(last.vars, j)).join(', ')} в строке цели стоит 0 — оптимальное решение не единственное.</div>`;
      if (res.degenerate) rh += '<div class="note">Есть базисная переменная, равная 0, — решение вырожденное.</div>';
    } else rh = `<div class="note bad"><b>${statusText(res.status)}.</b></div>`;
    const geo = pathPlot(pr, [{ steps: res.phase1 ? res.phase1.steps : null, from: res.sid1, cls: 'p1', prefix: 'I·', title: 'этап 1, таблица' }, { steps: p2, from: sid2, prefix: res.phase1 ? 'II·' : '', title: 'этап 2, таблица' }],
      res.phase1 ? 'Серые точки — этап 1: базисные решения с искусственными переменными часто лежат вне допустимой области, этап 1 приводит в её вершину. Красные — этап 2: переход по вершинам к оптимуму.' : '')
      || path3d(pr, [{ steps: res.phase1 ? res.phase1.steps : null, from: res.sid1, cls: 'p1', prefix: 'I·', title: 'этап 1, таблица' }, { steps: p2, from: sid2, prefix: res.phase1 ? 'II·' : '', title: 'этап 2, таблица' }], res,
        res.phase1 ? 'Три переменные — область является многогранником. Серые точки — этап 1 (часто вне области: там искусственные переменные ещё не нули), красные — этап 2, переход по рёбрам к оптимуму.' : '');
    if (geo) S.push(geo);
    S.push(sec('res', 'Ответ', (res.status === 'optimal' ? demoAnswer(pr, res.x, res.f, res.last, { alt: res.alt, degenerate: res.degenerate }) : '') + rh));
    S.push(sec('check', checkTitle(meta), (res.status === 'optimal' ? checkTable(pr, res.x) + valueLine(pr, res.x) : noCheck(res)) + compare(pr, res, meta)));
    return S;
  }

  /* =================== Движок анимаций: пошаговые сцены =================== */
  // demo(подпись, html, сценарий[, опции]): сцена в исходном состоянии — html; сценарий — async (A) => …
  // Границы шагов задаёт A.cap(подпись): «шаг k» = всё, что происходит после k-го вызова cap до (k+1)-го.
  // Любое состояние восстанавливается прогоном сценария с начала в мгновенном режиме, поэтому доступны
  // «Заново», «Предыдущий / Следующий шаг», «Играть / Пауза», «Показать итог», скорость.
  // A: q/qa (поиск в сцене), wait, anim, pop, hide, pulse, swap (переворот), fly (копия числа летит), put (перелёт + запись),
  //    show, cls, cap, seq, draw (рисование линии), set. A.detail — включён режим «подробно» (если он есть у сцены).
  const DM_STOP = {}, DM_HALT = {};
  let dmUid = 0;
  const DM = { all: new Set(), active: null, listening: false };
  const reduceMotion = () => LEARN.staticMode || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const SPEEDS = [['2.2', 'Медленно'], ['1', 'Обычно'], ['0.45', 'Быстро']];
  const dmLegend = '<span class="lg lg-sel">▸ синий — выбрано</span><span class="lg lg-act">● жёлтый — действие сейчас</span><span class="lg lg-del">✕ розовый — убирается / искусственная</span><span class="lg lg-ok">✓ зелёный — результат</span><span class="lg lg-dim">○ серый — не участвует</span>';

  function stopAllDemos() {
    DM.all.forEach(c => c.dispose());
    DM.all.clear(); DM.active = null;
  }
  function dmShell(id, title, o = {}) {
    return `<div class="demo" id="${id}"><div class="dmhead"><span class="dmtag">${o.tag || 'анимация'}</span><span class="dmtl">${title}</span>${o.detail ? `<label class="dmdet"><input type="checkbox" class="dm-det"> ${o.detail}</label>` : ''}</div>
      <div class="origin-tip">Выберите заполненную ячейку, чтобы разобрать её значение.</div><div class="dmstage"></div><div class="dmcap" aria-live="polite"></div><div class="dmprog"><i></i></div>
      <div class="dmctl"><button class="btn dm-re" title="Проиграть с начала">↺ Заново</button><button class="btn dm-prev" title="Предыдущий шаг">◀ Назад</button><span class="dmpos">шаг 0 из 0</span><button class="btn dm-next" title="Следующий шаг">Далее ▶</button><button class="btn primary dm-play">▶ Играть</button><button class="btn dm-end" title="Показать итог">⏭ Итог</button>
      <select class="dm-speed" aria-label="Скорость">${SPEEDS.map(s => `<option value="${s[0]}"${s[0] === '1' ? ' selected' : ''}>${s[1]}</option>`).join('')}</select></div>
      <div class="dmleg">${dmLegend}</div></div><!--dmend-->`;
  }

  function mountDemo(root, spec) {
    const { html, script, opts = {} } = spec;
    const stage = root.querySelector('.dmstage'), capEl = root.querySelector('.dmcap'), posEl = root.querySelector('.dmpos'), barEl = root.querySelector('.dmprog i');
    const $b = c => root.querySelector('.' + c);
    let token = 0, total = 0, cur = 0, playing = false, speed = 1, detail = !!opts.detail, fastNow = true, curCfg = null, rtimer = null, io = null, disposed = false;
    const pend = new Set();
    const cameraState = {};
    const reduce = reduceMotion();
    const clearPending = () => { pend.forEach(r => { clearTimeout(r[0]); r[1](); }); pend.clear(); };
    const ui = () => {
      posEl.textContent = `шаг ${cur} из ${total}`;
      barEl.style.width = total ? (100 * cur / total) + '%' : '0';
      $b('dm-prev').disabled = cur <= 0; $b('dm-next').disabled = cur >= total;
      const pl = $b('dm-play'); pl.textContent = playing ? '⏸ Пауза' : (cur >= total && total ? '▶ Повторить' : '▶ Играть');
      root.classList.toggle('playing', playing);
    };
    const run = async cfg => {
      const my = ++token; curCfg = cfg; clearPending();
      stage.innerHTML = html; capEl.innerHTML = '';
      const plane=stage.querySelector('svg.gsvg');
      if(plane) GraphCamera.attach(plane,cameraState);
      let k = 0; fastNow = true;
      const alive = () => { if (my !== token || disposed || !root.isConnected) throw DM_STOP; };
      const kf = (el, frames, o = {}) => el.animate(frames, { duration: fastNow ? 0 : (o.d || 450) * speed, delay: fastNow ? 0 : (o.delay || 0) * speed, easing: o.ease || 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
      const A = {
        get fast() { return fastNow; }, detail,
        q: s => stage.querySelector(s), qa: s => [...stage.querySelectorAll(s)],
        wait: ms => (fastNow ? Promise.resolve() : new Promise(res => { const rec = [setTimeout(() => { pend.delete(rec); res(); }, ms * speed), res]; pend.add(rec); })).then(alive),
        anim: (el, frames, o) => { if (!el) return Promise.resolve(); const a = kf(el, frames, o); return fastNow ? Promise.resolve() : a.finished.then(alive, alive); },
        pop: (el, o) => { if (el) el.classList.remove('dh'); return A.anim(el, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.18)', offset: .7 }, { opacity: 1, transform: 'scale(1)' }], { d: 420, ...o }); },
        show: (el, o) => { if (el) el.classList.remove('dh'); return A.anim(el, [{ opacity: 0 }, { opacity: 1 }], { d: 320, ...o }); },
        hide: (el, o) => A.anim(el, [{ opacity: 1 }, { opacity: 0 }], { d: 300, ...o }),
        pulse: (el, o) => A.anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { d: 420, ...o }),
        swap: async (el, h, d = 420) => {
          if (!el) return; if (fastNow) { el.innerHTML = h; CellOrigin.save(el,capEl.textContent); return; }
          await el.animate([{ transform: 'rotateX(0)' }, { transform: 'rotateX(90deg)' }], { duration: d / 2 * speed, fill: 'forwards' }).finished.then(alive, alive);
          el.innerHTML = h; CellOrigin.save(el,capEl.textContent);
          await el.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0)' }], { duration: d / 2 * speed, fill: 'forwards' }).finished.then(alive, alive);
        },
        set: (el, h) => { if (el) {el.innerHTML = h; CellOrigin.save(el,capEl.textContent);} },
        fly: (from, to, h, o = {}) => {
          CellOrigin.source(from,to,capEl.textContent);
          if (fastNow || !from || !to) return Promise.resolve();
          const sr = stage.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
          const c = document.createElement('span'); c.className = 'dmfly'; c.innerHTML = h == null ? from.innerHTML : h;
          c.style.left = (a.left - sr.left) + 'px'; c.style.top = (a.top - sr.top) + 'px'; stage.appendChild(c);
          const w = c.getBoundingClientRect(), dx = b.left + b.width / 2 - (a.left + w.width / 2), dy = b.top + b.height / 2 - (a.top + w.height / 2);
          return c.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx / 2}px,${dy / 2 - 28}px) scale(1.3)`, offset: .5 }, { transform: `translate(${dx}px,${dy}px) scale(1)` }],
            { duration: (o.d || 750) * speed, delay: (o.delay || 0) * speed, easing: 'ease-in-out', fill: 'forwards' }).finished.then(() => c.remove(), () => c.remove()).then(alive);
        },
        // перелёт копии в ячейку и запись в неё значения (h; по умолчанию — содержимое источника)
        put: async (from, to, h, o) => { await A.fly(from, to, h == null ? null : h, o); if (to) { to.innerHTML = h == null ? from.innerHTML : h; CellOrigin.save(to,capEl.textContent); await A.pop(to, { d: 300 }); } },
        draw: (el, o) => { if (!el) return Promise.resolve(); el.classList.remove('dh'); return A.anim(el, [{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }], { d: 700, ease: 'ease-in-out', ...o }); },
        cls: (el, c, on = true) => { if (el) (Array.isArray(el) ? el : [el]).forEach(e => e && e.classList.toggle(c, on)); },
        cap: h => {
          k++;
          if (k > curCfg.stop) throw DM_HALT;
          fastNow = reduce || k < curCfg.anim;
          cur = k; stage.dataset.frame=k; capEl.innerHTML = h; ui();
          if (!fastNow) capEl.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
        },
        seq: (list, gap, fn) => Promise.all(list.map((x, i) => A.wait(i * gap).then(() => fn(x, i)))),
        // последовательное выполнение действий одно за другим
        each: async (list, fn) => { for (let i = 0; i < list.length; i++) await fn(list[i], i); }
      };
      try { await script(A); }
      catch (e) {
        if (e !== DM_STOP && e !== DM_HALT) { console.error('Ошибка сцены:', e); (window.__dmErr = window.__dmErr || []).push(String(e && e.stack || e)); }
      }
      if (my === token) {
        if (curCfg.stop === Infinity) { total = Math.max(total, k); if (curCfg.anim === Infinity || k >= total) cur = Math.min(k, total); }
        playing = false; fastNow = true; ui();
      }
    };
    const halt = () => { token++; clearPending(); clearTimeout(rtimer); rtimer = null; playing = false; };
    const goTo = (n, animate) => { halt(); n = Math.max(0, Math.min(total, n)); cur = n; ui(); return run({ stop: n, anim: animate ? n : Infinity }); };
    root.replayCell=frame=>goTo(frame,true);
    const toEnd = () => { halt(); return run({ stop: Infinity, anim: Infinity }).then(() => { cur = total; ui(); }); };
    const playFrom = from => {
      if (DM.active && DM.active !== ctl) DM.active.settle();
      DM.active = ctl; halt();
      if (reduce) {   // без движения: смена состояний по таймеру
        playing = true; cur = from; ui();
        const tick = () => { if (!playing) return; if (cur >= total) { playing = false; ui(); return; } goTo(cur + 1, false).then(() => { playing = true; ui(); rtimer = setTimeout(tick, 1500); }); };
        goTo(from, false).then(() => { playing = true; ui(); rtimer = setTimeout(tick, 900); });
        return;
      }
      playing = true; cur = from; ui();
      run({ stop: Infinity, anim: from + 1 });
    };
    const pause = () => {
      if (reduce) { halt(); ui(); return; }
      if (!playing || !curCfg) return;
      curCfg.stop = cur;           // остановиться на границе текущего шага
      fastNow = true; clearPending();
      stage.getAnimations({ subtree: true }).forEach(a => { try { a.finish(); } catch (_) { /* бесконечные не используются */ } });
    };
    const ctl = {
      dispose() { disposed = true; token++; clearPending(); clearTimeout(rtimer); if (io) io.disconnect(); DM.all.delete(ctl); if (DM.active === ctl) DM.active = null; },
      settle() { if (disposed) return Promise.resolve(); return toEnd(); },
      pause, play: () => playFrom(0), isPlaying: () => playing, root
    };
    DM.all.add(ctl);
    if (!DM.listening) {
      DM.listening = true;
      document.addEventListener('visibilitychange', () => { if (document.hidden && DM.active) DM.active.pause(); });
      window.addEventListener('beforeprint', () => DM.all.forEach(c => c.settle()));
    }
    $b('dm-re').onclick = () => playFrom(0);
    $b('dm-play').onclick = () => { if (playing) pause(); else playFrom(cur >= total ? 0 : cur); };
    $b('dm-next').onclick = () => { if (cur < total) { if (DM.active === ctl) DM.active = null; goTo(cur + 1, true); } };
    $b('dm-prev').onclick = () => { if (cur > 0) goTo(cur - 1, false); };
    $b('dm-end').onclick = () => toEnd();
    $b('dm-speed').onchange = e => { speed = +e.target.value; };
    const det = $b('dm-det');
    if(det) det.checked=detail;
    if (det) det.onchange = () => { detail = det.checked; total = 0; toEnd(); };
    toEnd().then(() => {
      if (disposed) return;
      if (Handbook.inLesson) { goTo(Math.min(1,total),false); return; }
      if (opts.autoplay && !reduce) playFrom(0);
      else if ('IntersectionObserver' in window && !reduce && !opts.manual) {
        io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); io = null; if (!disposed && !playing) playFrom(0); } }, { threshold: 0.45 });
        io.observe(root);
      }
    });
    return ctl;
  }
  function demo(title, html, script, opts = {}) {
    const id = 'dm' + (++dmUid);
    R.hooks.push(() => { const root = document.getElementById(id); if (!root) return;
      if(opts.galleryLazy) root.activateHandbook=()=>{delete root.activateHandbook;mountDemo(root,{html,script,opts});};
      else mountDemo(root, { html, script, opts }); });
    return dmShell(id, title, opts);
  }
  // динамическая сцена (степпер таблиц): монтируется в готовый контейнер
  function mountInto(box, title, html, script, opts = {}) {
    const id = 'dm' + (++dmUid);
    box.innerHTML = dmShell(id, title, opts);
    return mountDemo(box.firstElementChild, { html, script, opts });
  }

  /* =================== Общие помощники сцен =================== */
  const vkClass = (vars, j) => { const v = vars[j]; return v.kind === 'x' ? 'vk-x' : v.kind === 't' ? 'vk-t' : v.bound || v.cut ? 'vk-b' : v.sign < 0 ? 'vk-e' : 'vk-s'; };
  const vkTag = (vars, j) => { const v = vars[j]; return v.kind === 'x' ? 'исходная' : v.kind === 't' ? 'искусств.' : v.cut ? 'отсечение' : v.bound ? 'строка M' : v.sign < 0 ? 'излишек' : 'остаток'; };
  const vK = (vars, j) => `<span class="${vkClass(vars, j)}">${vname(vars, j)}</span>`;
  const ft = q => q.toText();                                   // число для подписей SVG (без разметки)
  const zName = st => st.z.label.replace('−', '');

  // таблица сцены: каждое число — отдельный элемент .cv (его можно копировать и подсвечивать)
  function dtb(st, o = {}) {
    const m = st.rows.length, cols = st.cols, fq = o.fq || R.fq;
    const hlc = (i, j) => o.hl && st.q != null ? (j === st.q && i === st.p ? ' pe' : j === st.q ? ' pc' : i === st.p ? ' pr' : '') : '';
    const cell = (v, i, j, cls) => `<td class="${(cls || '') + hlc(i, j)}" data-i="${i}" data-j="${j}" ${v==null?'':`tabindex="0" data-origin="${R.originFor(st,i,j,v)}"`}><span class="cv">${v == null ? '' : fq(v)}</span></td>`;
    let h = `<div class="tblwrap ${o.cls || ''}"><table class="sx dmsx"><thead><tr><th class="bh">Базис</th><th data-j="-1">b</th>${cols.map(j => `<th data-j="${j}" class="${vkClass(st.vars, j)}">${vname(st.vars, j)}<span class="vtag">${vkTag(st.vars, j)}</span></th>`).join('')}${o.ratio ? '<th class="rth">b ÷ a</th>' : ''}</tr></thead><tbody>`;
    st.rows.forEach((r, i) => {
      h += `<tr data-i="${i}"><td class="bas" data-i="${i}" data-j="bas"><span class="cv">${vK(st.vars, st.basis[i])}</span></td>` + cell(o.blank ? null : r.b, i, -1, 'bcol') + cols.map(j => cell(o.blank ? null : r.a[j], i, j)).join('') + (o.ratio ? `<td class="rt" data-i="${i}"><span class="cv dh"></span></td>` : '') + '</tr>';
    });
    h += `<tr class="zrow" data-i="${m}"><td class="bas" data-i="${m}" data-j="bas"><span class="cv">${zlab(st.z.label)}</span></td>` + cell(o.blankZ || o.blank ? null : st.z.b, m, -1, 'bcol') + cols.map(j => cell(o.blankZ || o.blank ? null : st.z.a[j], m, j)).join('') + (o.ratio ? '<td class="rt"></td>' : '') + '</tr>' + (o.rratio ? `<tr class="rrow"><td class="bas"><span class="cv">θ</span></td><td></td>${cols.map(j => `<td class="rr" data-i="r" data-j="${j}"><span class="cv dh"></span></td>`).join('')}</tr>` : '') + '</tbody></table></div>';
    return h;
  }
  // быстрые доступы внутри сцены: C(t,i,j) — ячейка, V(t,i,j) — её число
  const sceneTools = A => {
    const C = (t, i, j) => A.q(`.${t} td[data-i="${i}"][data-j="${j}"]`);
    const V = (t, i, j) => { const c = C(t, i, j); return c ? c.querySelector('.cv') : null; };
    const H = (t, j) => A.q(`.${t} th[data-j="${j}"]`);
    return { C, V, H };
  };

  /* =================== Пересчёт симплекс-таблицы =================== */
  // s — таблица с выбранными q, p; nxt — таблица после пересчёта. opts.drive — вывод искусственной переменной.
  function pivotSpec(s, nxt, o = {}) {
    R.rememberTables([s,nxt]);
    const fq = o.fq || R.fq, par = o.par || R.par;
    const m = s.rows.length, q = s.q, p = s.p, vars = s.vars, cols = s.cols, zl = zlab(s.z.label);
    const enter = vK(vars, q), leave = p != null ? vK(vars, s.basis[p]) : '';
    const piv = p != null ? s.rows[p].a[q] : null;
    const rowLab = i => i === m ? zl : vK(vars, s.basis[i]);
    const colLab = j => j < 0 ? 'b' : vK(vars, j);
    const getO = (i, j) => { const r = i === m ? s.z : s.rows[i]; return j < 0 ? r.b : r.a[j]; };
    const getN = (i, j) => { const r = i === m ? nxt.z : nxt.rows[i]; return j < 0 ? r.b : r.a[j]; };
    const allJ = [-1, ...cols];
    const newShell = nxt ? { ...nxt, basis: s.basis } : null;
    const html = `<div class="pvwrap"><div><div class="dmh">было: таблица</div>${dtb(s, o.dual ? { cls: 'tO', rratio: true, fq: o.fq } : { cls: 'tO', ratio: true })}</div>${nxt ? `<div><div class="dmh">стало: новая таблица</div>${dtb(newShell, { cls: 'tN', blank: true, fq: o.fq })}</div>` : ''}</div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const negs = cols.filter(j => s.z.a[j].s < 0);
    const bland = negs.some(j => s.z.a[j].lt(s.z.a[q]));
    const script = async A => {
      const { C, V, H } = sceneTools(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      const colAll = j => [H('tO', j), ...[...Array(m + 1).keys()].map(i => C('tO', i, j))];
      const rowAll = i => [C('tO', i, 'bas'), ...allJ.map(j => C('tO', i, j))];
      await A.wait(250);
      if (o.sel) {
        await o.sel(A, { C, V, H, fm, sum, rowAll, colAll, enter, leave, piv, cols, m, zl });
      } else if (o.drive) {
        A.cap(`${leave} осталась в базисе (значение 0) — её нужно вывести`);
        A.cls(rowAll(p), 'k-sel'); A.cls(C('tO', p, 'bas'), 'k-del');
        await A.pulse(V('tO', p, 'bas'));
        A.cap(`В её строке берём ненулевое число ${fq(piv)} в столбце ${enter}`);
        A.cls(colAll(q), 'k-sel'); A.cls(C('tO', p, q), 'k-pe'); await A.pulse(V('tO', p, q));
        A.set(fm, `<span class="fmh">Ведущий элемент ${fq(piv)} — столбец ${enter} войдёт в базис вместо ${leave}</span>`);
      } else {
        // 1. отрицательные числа в строке цели
        A.cap(`В строке ${zl} ищем отрицательные числа`);
        A.cls(cols.map(j => C('tO', m, j)), 'k-dim');
        await A.each(negs, async j => { A.cls(C('tO', m, j), 'k-dim', false); A.cls(C('tO', m, j), 'k-act'); await A.pulse(V('tO', m, j)); await A.wait(100); });
        // 2. ведущий столбец
        A.cap(bland ? `Правило Бленда: берём отрицательный столбец с наименьшим номером — ${enter}` : `Самое отрицательное: ${fq(s.z.a[q])} — столбец ${enter} ведущий`);
        A.cls(cols.map(j => C('tO', m, j)), 'k-dim', false); A.cls(negs.map(j => C('tO', m, j)), 'k-act', false);
        A.cls(colAll(q), 'k-sel');
        await A.pulse(V('tO', m, q));
        A.set(fm, `<span class="fmh">${enter} войдёт в базис: рост этой переменной сильнее всего улучшает ${zName(s)}</span>`);
        if (s.unbounded) {
          A.cap(`В столбце ${enter} нет положительных чисел`);
          await A.each([...Array(m).keys()], async i => { A.cls(C('tO', i, q), 'k-del'); const rt = A.q(`.tO td.rt[data-i="${i}"] .cv`); A.set(rt, `${fq(s.rows[i].a[q])} ≤ 0 — не ограничивает`); await A.pop(rt, { d: 250 }); });
          A.cap(`Ничто не останавливает рост ${enter}: ${zName(s)} не ограничена`);
          A.cls(C('tO', m, q), 'k-del');
          A.set(fm, `<span class="fmh bad">Ни одно ограничение не мешает увеличивать ${enter} — целевая функция не ограничена, оптимума нет</span>`);
          await A.pulse(fm);
          return;
        }
        // 3. отношения b ÷ a
        A.cap(`Делим b на положительные числа столбца ${enter}`);
        await A.each([...Array(m).keys()], async i => {
          const rt = A.q(`.tO td.rt[data-i="${i}"] .cv`), r = s.ratios[i];
          if (r) {
            A.cls([C('tO', i, -1), C('tO', i, q)], 'k-act');
            await Promise.all([A.fly(V('tO', i, -1), rt), A.fly(V('tO', i, q), rt)]);
            A.set(rt, `${fq(s.rows[i].b)} ÷ ${fq(s.rows[i].a[q])} = <b>${fq(r)}</b>`); await A.pop(rt, { d: 300 });
            A.cls([C('tO', i, -1), C('tO', i, q)], 'k-act', false);
          } else {
            A.cls(C('tO', i, q), 'k-del'); A.cls(rowAll(i), 'k-dim');
            A.set(rt, `${fq(s.rows[i].a[q])} ≤ 0 — не берём`); await A.pop(rt, { d: 250 });
          }
        });
        // 4. минимальное отношение
        const mn = s.ratios[p], ties = s.ratios.filter(r => r && r.eq(mn)).length;
        A.cap(ties > 1 ? `Наименьшее ${fq(mn)} в нескольких строках — берём строку с меньшим номером переменной: ${leave}` : `Наименьшее отношение ${fq(mn)} — строка ${leave} ведущая`);
        s.rows.forEach((r, i) => { if (s.ratios[i] && i !== p) A.cls(A.q(`.tO td.rt[data-i="${i}"]`), 'k-dim'); });
        A.cls(A.q(`.tO td.rt[data-i="${p}"]`), 'k-ok');
        A.cls(rowAll(p), 'k-sel'); A.cls(rowAll(p), 'k-dim', false);
        await A.pulse(V('tO', p, 'bas'));
        // 5. ведущий элемент
        A.cap(`Пересечение выбранных строки и столбца — ведущий элемент ${fq(piv)}`);
        A.cls(C('tO', p, q), 'k-pe'); await A.pulse(V('tO', p, q));
        A.set(fm, `<span class="fmh">ведущий элемент = <b>${fq(piv)}</b></span>`);
      }
      // 6. вход и выход из базиса
      A.cap(`${enter} входит в базис, ${leave} выходит`);
      A.cls(C('tO', p, 'bas'), 'k-del');
      await A.fly(H('tO', q), C('tN', p, 'bas'));
      A.set(V('tN', p, 'bas'), `${enter}`); A.cls(C('tN', p, 'bas'), 'k-ok'); await A.pop(V('tN', p, 'bas'), { d: 350 });
      // формулы пересчёта одной ячейки
      // mode: 'full' — числа летят в формулу по очереди; 'first' — одновременно; 'quick' — формула собрана сразу
      const cellFlow = async (i, j, mode) => {
        const old = getO(i, j), nw = getN(i, j), isP = i === p, fl = mode !== 'quick', sq = mode === 'full', d = sq ? 600 : 400;
        const srcO = V('tO', i, j), ph = (x, f) => fl ? '□' : f(x);
        A.cls(C('tO', i, j), 'k-act'); A.cls(C('tN', i, j), 'k-act');
        if (isP) {
          A.set(fm, `<span class="fo">${ph(old, fq)}</span> ÷ <span class="fp">${ph(piv, par)}</span> = <b class="calc-result">${ph(nw, fq)}</b>`);
          if (fl) {
            const jobs = [() => A.put(srcO, A.q('.pvfm .fo'), fq(old), { d }), () => A.put(V('tO', p, q), A.q('.pvfm .fp'), par(piv), { d })];
            if (sq) for (const f of jobs) await f(); else await Promise.all(jobs.map(f => f()));
            await A.swap(A.q('.pvfm .calc-result'), fq(nw), sq ? 380 : 240);
          }
        } else {
          const kk = getO(i, q), npv = getN(p, j);
          A.set(fm, `<span class="fo">${ph(old, fq)}</span> − <span class="fk">${ph(kk, par)}</span> × <span class="fn">${ph(npv, par)}</span> = <b class="calc-result">${ph(nw, fq)}</b>`);
          if (fl) {
            A.cls(C('tO', i, q), 'k-sel'); A.cls(C('tN', p, j), 'k-ok');
            const jobs = [() => A.put(srcO, A.q('.pvfm .fo'), fq(old), { d }), () => A.put(V('tO', i, q), A.q('.pvfm .fk'), par(kk), { d }), () => A.put(V('tN', p, j), A.q('.pvfm .fn'), par(npv), { d })];
            if (sq) for (const f of jobs) await f(); else await Promise.all(jobs.map(f => f()));
            A.cls(C('tO', i, q), 'k-sel', false); A.cls(C('tN', p, j), 'k-ok', false); A.cls(C('tN', p, j), 'k-ok');
            await A.swap(A.q('.pvfm .calc-result'), fq(nw), sq ? 380 : 240);
          }
        }
        await A.fly(A.q('.pvfm .calc-result'), V('tN', i, j), null, { d: sq ? 750 : 420 });
        A.set(V('tN', i, j), fq(nw)); await A.pop(V('tN', i, j), { d: 260 });
        A.cls(C('tO', i, j), 'k-act', false); A.cls(C('tN', i, j), 'k-act', false); A.cls(C('tN', i, j), 'k-ok');
      };
      const copyRow = async i => {
        await A.seq(allJ, 50, j => { A.set(V('tN', i, j), fq(getN(i, j))); return A.put(V('tO', i, j), V('tN', i, j), fq(getN(i, j)), { d: 500 }); });
        allJ.forEach(j => A.cls(C('tN', i, j), 'k-ok'));
      };
      // 7. ведущая строка
      const rowsOrder = [p, ...[...Array(m + 1).keys()].filter(i => i !== p)];
      if (A.detail) {
        for (const i of rowsOrder) {
          const kk = i === p ? null : getO(i, q);
          if (i !== p && kk.isZero()) { A.cap(`Строка ${rowLab(i)}: в ведущем столбце 0 — строка не меняется`); A.set(fm, `<span class="fmh">k = 0 ⇒ новая строка = старая</span>`); await copyRow(i); continue; }
          for (const j of allJ) {
            A.cap(i === p ? `Ячейка (${rowLab(i)}; ${colLab(j)}): делим на ${fq(piv)}` : `Ячейка (${rowLab(i)}; ${colLab(j)}): старая − ${fq(kk)} × новая ведущая`);
            await cellFlow(i, j, 'full');
          }
        }
      } else {
        A.cap(`Делим ведущую строку на ${fq(piv)}`);
        A.cls(rowAll(p), 'k-sel');
        await A.each(allJ, (j, ix) => cellFlow(p, j, ix === 0 ? 'first' : 'quick'));
        for (const i of rowsOrder.slice(1)) {
          const kk = getO(i, q);
          if (kk.isZero()) { A.cap(`Строка ${rowLab(i)}: в ведущем столбце 0 — строка не меняется`); A.set(fm, `<span class="fmh">k = 0 ⇒ новая строка = старая</span>`); await copyRow(i); continue; }
          A.cap(`Строка ${rowLab(i)}: вычитаем ${fq(kk)} × ведущую строку`);
          A.cls(C('tO', i, q), 'k-sel');
          await A.each(allJ, (j, ix) => cellFlow(i, j, ix === 0 ? 'first' : 'quick'));
          A.cls(C('tO', i, q), 'k-sel', false);
        }
      }
      // 8. итог шага
      const rzf = o.realZ || realZ, oldV = rzf(s), newV = rzf(nxt), nm = zName(s), minus = s.z.label.startsWith('−');
      const dirTxt = o.dual ? (newV.gt(oldV) ? 'растёт' : newV.lt(oldV) ? 'уменьшается' : 'без изменений') : nm === 'h' ? 'уменьшается' : minus ? 'уменьшается' : 'растёт';
      const bs = nxt.basis.map((bj, i) => `${vK(vars, bj)} = ${fq(nxt.rows[i].b)}`).join(', ');
      A.cap(`Таблица готова: ${nm} ${fq(oldV).replace(/<[^>]+>/g, '')} → ${fq(newV).replace(/<[^>]+>/g, '')}`);
      A.set(fm, '');
      A.cls(A.qa('.tN td'), 'k-act', false);
      sum.innerHTML = `Базис: ${bs}; остальные = 0. &nbsp;<b>${nm}</b>: ${fq(oldV)} → <b class="gain">${fq(newV)}</b> <span class="kbd">(${dirTxt}${newV.eq(oldV) ? ' — не изменилась: вырожденный шаг' : ''})</span>`;
      await A.show(sum);
    };
    return { html, script, opts: { detail: o.drive ? '' : 'разобрать всю таблицу (каждая ячейка)' } };
  }

  const demoDrive = d => { const sp = pivotSpec({ ...d.before, q: d.q, p: d.p }, d.after, { drive: true }); return demo('Как убрать временную переменную из таблицы?', sp.html, sp.script, sp.opts); };
  // конечная таблица: проверка критерия оптимальности
  function optSpec(s) {
    const m = s.rows.length, vars = s.vars, cols = s.cols, zl = zlab(s.z.label), ph1 = s.z.label === '−h';
    const html = `<div class="pvwrap one"><div>${dtb(s, { cls: 'tO' })}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const alt = cols.filter(j => s.basis.indexOf(j) < 0 && s.z.a[j].isZero());
    const script = async A => {
      const { C, V } = sceneTools(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      await A.wait(250);
      A.cap(`Проверяем строку ${zl}: есть ли в ней отрицательные числа`);
      await A.each(cols, async j => { A.cls(C('tO', m, j), 'k-act'); await A.wait(60); A.cls(C('tO', m, j), 'k-act', false); A.cls(C('tO', m, j), 'k-ok'); });
      A.cap(`Отрицательных чисел нет — критерий оптимальности выполнен`);
      A.cls(C('tO', m, -1), 'k-ok'); A.set(fm, `<span class="fmh ok">Улучшать ${zName(s)} больше нечем — таблица оптимальна</span>`); await A.pulse(fm);
      A.cap(`Читаем решение: базисные переменные равны своему b, остальные — 0`);
      await A.each(s.rows.map((_, i) => i), async i => { A.cls([C('tO', i, 'bas'), C('tO', i, -1)], 'k-sel'); await A.pulse(V('tO', i, -1)); });
      const vals = s.basis.map((bj, i) => `${vK(vars, bj)} = ${fq(s.rows[i].b)}`).join(', ');
      sum.innerHTML = `${vals}; остальные переменные = 0. &nbsp;${ph1 ? `<b>h* = ${fq(s.z.b.neg())}</b>` : `<b>${zName(s)}</b> = ${fq(realZ(s))}`}`;
      await A.show(sum);
      if (!ph1 && alt.length) {
        A.cap(`Под ${alt.map(j => vK(vars, j)).join(', ')} в строке ${zl} стоит 0 — есть и другие оптимальные решения`);
        A.cls(alt.map(j => C('tO', m, j)), 'k-act'); await A.seq(alt, 100, j => A.pulse(V('tO', m, j)));
      }
      const zb = s.basis.filter((bj, i) => s.rows[i].b.isZero());
      if (zb.length) {
        A.cap(`Базисная ${zb.map(j => vK(vars, j)).join(', ')} равна 0 — решение вырожденное`);
        s.rows.forEach((r, i) => { if (r.b.isZero()) A.cls(C('tO', i, -1), 'k-act'); });
      }
    };
    return { html, script, opts: {} };
  }

  /* =================== Графический метод: сцены =================== */
  const GPAL = ['#3b4cca', '#e08a00', '#1f9d6b', '#c0284f', '#7b3fc4', '#0a8aa8', '#a0780a', '#d4508a', '#4f7f2a', '#5b6bd6'];
  const VLET = k => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[k] || ('V' + (k + 1));
  function clipV(poly, a, b, s) {
    if (s === '=') return clipV(clipV(poly, a, b, '<='), a, b, '>=');
    const f = p => { const v = a[0] * p[0] + a[1] * p[1] - b; return s === '<=' ? -v : v; };
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const P = poly[i], Cc = poly[(i + 1) % poly.length], fp = f(P), fc = f(Cc);
      if (fp >= -1e-12) out.push(P);
      if ((fp >= -1e-12) !== (fc >= -1e-12)) { const t = fp / (fp - fc); out.push([P[0] + t * (Cc[0] - P[0]), P[1] + t * (Cc[1] - P[1])]); }
    }
    return out;
  }
  const polyArea = pl => { let s = 0; for (let i = 0; i < pl.length; i++) { const a = pl[i], b = pl[(i + 1) % pl.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
  // слагаемые линейной формы: у каждого свой знак и коэффициент (чтобы числа можно было переносить по отдельности)
  const eqTerms = (a, lab, blank) => {
    let first = true, r = '';
    a.forEach((v, j) => {
      if (v.isZero()) return; const one = v.abs().eq(new Q(1n));
      r += `<span class="tw" data-j="${j}"><span class="sgn">${first ? (v.s < 0 ? '−' : '') : (v.s < 0 ? '&nbsp;−&nbsp;' : '&nbsp;+&nbsp;')}</span><span class="cf${blank ? ' dh' : ''}" data-one="${one ? 1 : 0}">${one ? '' : fq(v.abs())}</span>${lab(j)}</span>`;
      first = false;
    });
    return r || '<span class="tw">0</span>';
  };
  const gcdB = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { [a, b] = [b, a % b]; } return a; };

  // геометрия сцены: единый масштаб по обеим осям
  function gscene(pr, G) {
    const N = q => q.toNumber(), m = pr.rows.length;
    const Ls = pr.rows.map((r, i) => ({ i, a: r.a.map(N), b: N(r.b), s: r.s, q: r }));
    let vx = 0, vy = 0; G.verts.forEach(w => { vx = Math.max(vx, N(w.p[0])); vy = Math.max(vy, N(w.p[1])); });
    let ix = 0, iy = 0;
    Ls.forEach(L => { if (L.a[0] !== 0 && L.b / L.a[0] > 0) ix = Math.max(ix, L.b / L.a[0]); if (L.a[1] !== 0 && L.b / L.a[1] > 0) iy = Math.max(iy, L.b / L.a[1]); });
    const pick = (v, iM) => v > 0 ? Math.max(v * 1.3, Math.min(iM * 1.08, v * 2.5)) : (iM > 0 ? iM * 1.1 : 5);
    let X = pick(vx, ix), Y = pick(vy, iy);
    if (G.status === 'unbounded') { X = Math.max(X, vx * 1.8); Y = Math.max(Y, vy * 1.8); }
    const ML = 40, MR = 16, MT = 14, MB = 30;
    let u = Math.min(470 / X, 340 / Y);
    if (X * u < 220) X = 220 / u;
    if (Y * u < 150) Y = 150 / u;
    const W = ML + X * u + MR, H = MT + Y * u + MB;
    const sx = x => ML + x * u, sy = y => H - MB - y * u;
    const box = [[0, 0], [X, 0], [X, Y], [0, Y]];
    // области: после осей и после каждого ограничения
    const regs = [box];
    Ls.forEach(L => regs.push(clipV(regs[regs.length - 1], L.a, L.b, L.s)));
    return { N, m, Ls, X, Y, u, W, H, ML, MR, MT, MB, sx, sy, regs };
  }
  const inBox = (g, p) => p[0] >= -1e-9 && p[0] <= g.X + 1e-9 && p[1] >= -1e-9 && p[1] <= g.Y + 1e-9;

  // SVG-график; o.pre — показать готовые линии, область и вершины (для сцен, где они не строятся)
  function gSvg(g, G, o = {}) {
    const hd = o.pre ? '' : ' dh', { sx, sy } = g;
    const width=g.X*g.u,height=g.Y*g.u,left=sx(0),top=sy(g.Y);
    const equations=JSON.stringify(g.Ls.map(r=>[...r.a.slice(0,2),r.b,r.s])).replace(/</g,'&lt;');
    let s = `<svg class="gsvg" viewBox="0 0 ${g.W} ${g.H}" data-frame="${left} ${top} ${width} ${height}" data-extent="${g.X} ${g.Y}" data-rows='${equations}' role="img" aria-label="Координатная плоскость x₁, x₂">
      <g class="gaxt${hd}"><path class="field-grid"/><g class="field-ticks"></g><text x="${sx(g.X)}" y="${sy(0)+26}" class="gax-l">x₁</text><text x="${left-19}" y="${top}" class="gax-l">x₂</text></g>
      <svg class="plot-world" x="${left}" y="${top}" width="${width}" height="${height}" overflow="hidden">`;
    // полуплоскости и области
    g.Ls.forEach(L=>{
      if(L.s!=='=') s+=`<polygon class="gh${hd}" data-i="${L.i}" fill="${GPAL[L.i % GPAL.length]}"/>`;
    });
    for(let k=0;k<=g.m;k++) s+=`<polygon class="gr${o.pre&&k===g.m?'':' dh'}" data-s="${k}"/>`;
    g.Ls.forEach(L=>{
      const color=GPAL[L.i % GPAL.length];
      s+=`<line class="gl gdraw${hd}" pathLength="1" data-i="${L.i}" stroke="${color}"/>
        <text class="glb${hd}" data-i="${L.i}" fill="${color}">(${L.i+1})</text>`;
      if(L.s!=='=') s+=`<path class="gside${hd}" data-i="${L.i}" stroke="${color}"/>`;
    });
    // построение: точки на осях, пробные точки
    if (o.build) g.Ls.forEach(L => {
      const col = GPAL[L.i % GPAL.length];
      gPts(L.q, g).forEach((st, q) => { const x = g.N(st.pt[0]), y = g.N(st.pt[1]); if (inBox(g, [x, y])) s += `<g class="gpt dh" data-pt="${L.i}_${q}"><circle cx="${sx(x).toFixed(1)}" cy="${sy(y).toFixed(1)}" r="5" fill="${col}"/><text x="${(sx(x) + 8).toFixed(1)}" y="${(sy(y) - 8).toFixed(1)}" fill="${col}">(${ft(st.pt[0])}; ${ft(st.pt[1])})</text></g>`; });
      if (L.s !== '=') { const T = gTestPoint(L.q); s += `<g class="gtp dh" data-tp="${L.i}"><circle cx="${sx(T.t[0]).toFixed(1)}" cy="${sy(T.t[1]).toFixed(1)}" r="7"/><text class="gtpm" data-tpm="${L.i}" x="${(sx(T.t[0]) + 10).toFixed(1)}" y="${(sy(T.t[1]) - 8).toFixed(1)}"></text></g>`; }
    });
    // вершины области
    G.verts.forEach((w, k) => { const x = g.N(w.p[0]), y = g.N(w.p[1]); s += `<g class="gvx${o.pre ? '' : ' dh'}" data-v="${k}"><circle cx="${sx(x).toFixed(1)}" cy="${sy(y).toFixed(1)}" r="6"/><text x="${(sx(x) + 9).toFixed(1)}" y="${(sy(y) - 9).toFixed(1)}">${VLET(k)}</text></g>`; });
    s += `<text class="gempty dh" x="${sx(g.X / 2)}" y="${sy(g.Y / 2)}" text-anchor="middle">∅ допустимая область пуста</text>`;
    s += `<g class="ginf dh"><text x="${sx(g.X) - 6}" y="${sy(g.Y / 2)}" text-anchor="end">→ ∞</text><text x="${sx(g.X / 2)}" y="${sy(g.Y) + 16}" text-anchor="middle">↑ ∞</text></g>`;
    if(o.uid==='o') s += '<g class="gov"><g class="glvl dh"></g><g class="ggrad dh"></g><g class="gopt dh"></g></g>';
    s += '</svg>';
    s += `<line class="gax-x gdraw${o.pre ? '' : ' dh'}" pathLength="1" x1="${sx(-0.02 * g.X)}" y1="${sy(0)}" x2="${sx(g.X)}" y2="${sy(0)}"/><line class="gax-y gdraw${o.pre ? '' : ' dh'}" pathLength="1" x1="${sx(0)}" y1="${sy(-0.02 * g.Y)}" x2="${sx(0)}" y2="${sy(g.Y)}"/>`;
    s += '</svg>';
    return s;
  }
  // точки на осях (и подпись) для построения прямой; X — ширина окна
  function gPts(r, g) {
    const [a1, a2] = r.a, b = r.b, z1 = a1.isZero(), z2 = a2.isZero(), out = [];
    if (z1 && z2) return out;
    const nb = !b.isZero();
    if (!z2 && nb) out.push({ cap: `x₁ = 0 ⇒ x₂ = b ÷ a₂`, lhs: 'x₂', parts: [{ k: 'b' }, { k: 'a', j: 1 }], op: '÷', res: b.div(a2), pt: [new Q(0n), b.div(a2)] });
    if (!z1 && nb) out.push({ cap: `x₂ = 0 ⇒ x₁ = b ÷ a₁`, lhs: 'x₁', parts: [{ k: 'b' }, { k: 'a', j: 0 }], op: '÷', res: b.div(a1), pt: [b.div(a1), new Q(0n)] });
    if (!nb && !z1 && !z2) {
      out.push({ cap: 'b = 0 ⇒ прямая проходит через начало координат', lhs: '', parts: [], res: null, pt: [new Q(0n), new Q(0n)], note: 'при x₁ = 0 получаем x₂ = 0: точка (0; 0)' });
      const t = new Q(BigInt(Math.max(1, Math.round(g.X / 2))));
      out.push({ cap: `Берём x₁ = ${t.toText()} ⇒ x₂ = −a₁·x₁ ÷ a₂`, lhs: 'x₂', parts: [{ k: 'a', j: 0 }, { k: 'a', j: 1 }], op: 'neg', t, res: a1.mul(t).div(a2).neg(), pt: [t, a1.mul(t).div(a2).neg()] });
    } else if (!nb && (z1 || z2)) {
      out.push({ cap: z1 ? 'a₁ = 0, b = 0 ⇒ прямая x₂ = 0 (ось x₁)' : 'a₂ = 0, b = 0 ⇒ прямая x₁ = 0 (ось x₂)', lhs: '', parts: [], res: null, pt: [new Q(0n), new Q(0n)] });
    }
    return out;
  }
  const gTestPoint = r => { for (const t of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const v = r.a[0].mul(new Q(BigInt(t[0]))).add(r.a[1].mul(new Q(BigInt(t[1])))); if (!v.eq(r.b)) return { t, v }; } return { t: [0, 0], v: new Q(0n) }; };

  // --- построение: оси, прямые, полуплоскости, допустимая область, вершины ---
  function demoGraphBuild(pr, G) {
    const g = gscene(pr, G), m = pr.rows.length;
    const rows = pr.rows.map((r, i) => `<div class="drow gcr" data-i="${i}"><span class="kbd">(${i + 1})</span> <span class="lhs">${eqTerms(r.a, xlab)}</span> <span class="rs">${sg(r.s)}</span> <span class="rb">${fq(r.b)}</span></div>`).join('') + `<div class="drow gcr" data-i="ax"><span class="kbd">(0)</span> ${xv(1)} ≥ 0, ${xv(2)} ≥ 0</div>`;
    const html = `<div class="gwrap"><div class="gleft"><div class="dmh">ограничения задачи</div>${rows}<div class="pvfm gfm"></div></div><div class="gright">${gSvg(g, G, { uid: 'b', build: true })}</div></div>`;
    const script = async A => {
      const fm = A.q('.gfm'), S = sel => A.q('.gsvg ' + sel), SA = sel => A.qa('.gsvg ' + sel);
      await A.wait(250);
      A.cap('Рисуем оси координат: x₁ — горизонталь, x₂ — вертикаль');
      await Promise.all([A.draw(S('.gax-x')), A.draw(S('.gax-y'))]); await A.show(S('.gaxt'));
      A.cap('Условия x₁ ≥ 0 и x₂ ≥ 0 оставляют только первую четверть');
      A.cls(A.q('.gcr[data-i="ax"]'), 'on'); await A.show(S('.gr[data-s="0"]'));
      A.cls(A.q('.gcr[data-i="ax"]'), 'on', false); A.cls(A.q('.gcr[data-i="ax"]'), 'done');
      for (let i = 0; i < m; i++) {
        const r = pr.rows[i], row = A.q(`.gcr[data-i="${i}"]`), col = GPAL[i % GPAL.length], pts = gPts(r, g);
        A.cap(`Ограничение (${i + 1}): берём его коэффициенты и свободный член`);
        A.cls(row, 'on'); A.set(fm, '');
        await A.seq([...row.querySelectorAll('.cf:not(:empty)'), row.querySelector('.rb')], 110, el => A.pulse(el));
        const cfOf = j => row.querySelector(`.tw[data-j="${j}"] .cf`);
        // точки на осях / вспомогательные точки
        for (let q = 0; q < pts.length; q++) {
          const st = pts[q], inside = inBox(g, [g.N(st.pt[0]), g.N(st.pt[1])]);
          A.cap(st.cap);
          if (st.parts.length) {
            const slot = k => A.q(`.gfm .sl${k}`);
            const f = st.op === 'neg' ? `${st.lhs} = −<span class="fo sl0">□</span> · ${st.t.toText()} ÷ <span class="fo sl1">□</span>` : `${st.lhs.replace('x', 'x')} = <span class="fo sl0">□</span> ${st.op} <span class="fo sl1">□</span>`;
            A.set(fm, `<span class="fmh">${f.replace('x₁', xv(1)).replace('x₂', xv(2))} = <b class="calc-result">□</b></span>`);
            const src = p => p.k === 'b' ? row.querySelector('.rb') : (cfOf(p.j).textContent ? cfOf(p.j) : row.querySelector(`.tw[data-j="${p.j}"]`));
            const val = p => p.k === 'b' ? fq(r.b) : par(r.a[p.j]);
            await A.put(src(st.parts[0]), A.q('.gfm .sl0'), val(st.parts[0]));
            await A.put(src(st.parts[1]), A.q('.gfm .sl1'), val(st.parts[1]));
            await A.swap(A.q('.gfm .calc-result'), fq(st.res), 380);
          } else A.set(fm, `<span class="fmh">${st.note || st.cap}</span>`);
          const dotSel = `.gpt[data-pt="${i}_${q}"]`;
          if (inside) {
            const dot = S(dotSel);
            await A.fly(A.q('.gfm .calc-result') || fm, dot, '●');
            await A.pop(dot);
          }
        }
        // прямая
        A.cap(`Через эти точки проводим прямую (${i + 1})`);
        await Promise.all([A.draw(S(`.gl[data-i="${i}"]`)), A.show(S(`.glb[data-i="${i}"]`))]);
        A.cls(SA(`.gpt[data-pt^="${i}_"]`), 'fin');
        // проверочная точка
        if (r.s === '=') {
          A.cap(`(${i + 1}) — равенство: допустимы только точки самой прямой`);
          A.cls(S(`.gl[data-i="${i}"]`), 'k-hot'); A.set(fm, `<span class="fmh">знак «=» — полуплоскости нет, допустимые точки лежат на прямой</span>`);
        } else {
          const T = gTestPoint(r), ok = r.s === '<=' ? T.v.le(r.b) : T.v.ge(r.b), tp = T.t;
          A.cap(`Проверяем точку (${tp[0]}; ${tp[1]}): подставляем в неравенство`);
          const tg = S(`.gtp[data-tp="${i}"]`); await A.pop(tg);
          A.set(fm, `<span class="fmh"><span class="fo sa">□</span>·${tp[0]} + <span class="fo sb">□</span>·${tp[1]} = <b class="fv">□</b> ${sg(r.s)} <span class="fo sc">□</span> ?</span>`);
          const aEl = j => (cfOf(j) && cfOf(j).textContent) ? cfOf(j) : row.querySelector(`.tw[data-j="${j}"]`) || row;
          await Promise.all([A.put(aEl(0), A.q('.gfm .sa'), par(r.a[0])), A.put(aEl(1), A.q('.gfm .sb'), par(r.a[1]))]);
          await A.swap(A.q('.gfm .fv'), fq(T.v), 380);
          await A.put(row.querySelector('.rb'), A.q('.gfm .sc'), fq(r.b));
          A.set(fm, A.q('.gfm').innerHTML + ` <b class="${ok ? 'vok' : 'vbad'}">${ok ? '✓ верно' : '✕ неверно'}</b>`);
          A.cls(tg, ok ? 'k-ok' : 'k-del'); A.set(S(`[data-tpm="${i}"]`), ok ? '✓' : '✕'); await A.pop(S(`[data-tpm="${i}"]`));
          A.cap(ok ? `Точка (${tp[0]}; ${tp[1]}) подходит — берём сторону, где она лежит` : `Точка (${tp[0]}; ${tp[1]}) не подходит — берём противоположную сторону`);
          await Promise.all([A.show(S(`.gh[data-i="${i}"]`)), A.show(S(`.gside[data-i="${i}"]`))]);
        }
        A.cls(row, 'on', false); A.cls(row, 'done'); await A.wait(150);
      }
      // пересечение
      let emptyAt = -1;
      for (let s = 1; s <= m; s++) {
        const pl = g.regs[s], empty = !G.verts.length && (pl.length < 3 || polyArea(pl) < 1e-9);
        if (empty && emptyAt < 0) emptyAt = s;
        if (emptyAt >= 0 && s > emptyAt) break;
        A.cap(empty ? `Добавляем (${s}): общих точек не осталось — область пуста` : `Оставляем только то, что подходит и под ограничение (${s})`);
        A.cls(SA('.gh'), 'gdim');
        const prev = S(`.gr[data-s="${s - 1}"]`), now = S(`.gr[data-s="${s}"]`);
        if (now && !empty) { await Promise.all([A.hide(prev), A.show(now)]); }
        else { await A.hide(prev); await A.pop(S('.gempty')); }
        A.cls(A.q(`.gcr[data-i="${s - 1}"]`), 'on'); await A.wait(120); A.cls(A.q(`.gcr[data-i="${s - 1}"]`), 'on', false);
      }
      if (!G.verts.length) {
        A.cap('Общей области нет: допустимых решений нет');
        await A.pop(S('.gempty'));
      } else {
        A.cap(`Допустимая область готова: вершины ${G.verts.map((_, k) => VLET(k)).join(', ')}`);
        A.cls(SA('.gh'), 'gdim');
        await A.seq(SA('.gvx'), 160, el => A.pop(el));
        if (G.status === 'unbounded') { A.cap('Область уходит за рамку графика — она не ограничена'); await A.pop(S('.ginf')); }
      }
    };
    return demo('Где на чертеже находятся допустимые планы?', html + '<p class="note">Цвет прямой соответствует номеру ограничения. Короткие стрелки показывают допустимую сторону неравенства; они появляются после проверки пробной точки. Общая область — пересечение всех ограничений. Зелёный вектор целевой функции на следующем графике показывает рост F; для минимума движемся против него.</p>', script);
  }

  // --- пересечение двух прямых: система → исключение → подстановка → точка ---
  function solve2plan(e1, e2) {
    const [a11, a12] = e1.a, [a21, a22] = e2.a, b1 = e1.b, b2 = e2.b;
    const D = a11.mul(a22).sub(a12.mul(a21));
    const x1 = b1.mul(a22).sub(a12.mul(b2)).div(D), x2 = a11.mul(b2).sub(b1.mul(a21)).div(D);
    const kind = (a11.isZero() || a21.isZero()) ? 'A' : (a12.isZero() || a22.isZero()) ? 'B' : 'C';
    return { kind, D, x1, x2 };
  }
  const lcmQ = (a, b) => { const x = a.abs(), y = b.abs(); if (x.isInt() && y.isInt()) { const g = gcdB(x.n, y.n); return new Q(x.n / g * y.n); } return null; };
  const plain = h => String(h).replace(/<span class="fr"><span class="nu">(\d+)<\/span><span class="de">(\d+)<\/span><\/span>/g, '$1/$2').replace(/<[^>]+>/g, '');

  function demoGraphVerts(pr, G) {
    const g = gscene(pr, G), m = pr.rows.length, Zr = () => new Q(0n), On = () => new Q(1n);
    const items = [...pr.rows.map((r, i) => ({ a: r.a, b: r.b, s: r.s, name: `(${i + 1})` })), { a: [On(), Zr()], b: Zr(), s: '=', name: '(ось x₂)' }, { a: [Zr(), On()], b: Zr(), s: '=', name: '(ось x₁)' }];
    const idxOf = o => typeof o === 'number' ? o : o === 'x1' ? m : m + 1;
    const list = items.map((e, k) => `<div class="drow gcr" data-k="${k}"><span class="kbd">${e.name}</span> <span class="lhs">${eqTerms(e.a, xlab)}</span> <span class="rs">${sg(e.s)}</span> <span class="rb">${fq(e.b)}</span></div>`).join('');
    const html = `<div class="gwrap"><div class="gleft"><div class="dmh">прямые-границы</div>${list}<div class="dmh" style="margin-top:8px">система для вершины</div><div class="gsys"></div></div><div class="gright">${gSvg(g, G, { pre: true, uid: 'v' })}</div></div>`;
    const lineEl = (A, k) => k < m ? A.q(`.gsvg .gl[data-i="${k}"]`) : k === m ? A.q('.gsvg .gax-y') : A.q('.gsvg .gax-x');
    const script = async A => {
      const sys = A.q('.gsys'), S = sel => A.q('.gsvg ' + sel);
      A.cls(A.qa('.gsvg .gvx'), 'k-dim');
      await A.wait(250);
      const eqLine = (e, r, blank) => `<div class="gsl" data-r="${r}"><span class="kbd">(${r + 1})</span> <span class="lhs">${eqTerms(e.a, xlab, blank)}</span> <span class="rs">${blank ? sg(e.s) : '='}</span> <span class="rb${blank ? ' dh' : ''}">${fq(e.b)}</span><span class="mb dh"></span></div>`;
      const extra = h => `<div class="gsl gx dh">${h}</div>`;
      for (let k = 0; k < G.verts.length; k++) {
        const w = G.verts[k], ids = w.on.map(idxOf), u1 = ids[0], u2 = ids[1], E = [items[u1], items[u2]], pl = solve2plan(E[0], E[1]);
        const V = VLET(k), dot = S(`.gvx[data-v="${k}"]`), rowOf = u => A.q(`.gcr[data-k="${u}"]`);
        const x1v = w.p[0], x2v = w.p[1], hot = on => { [u1, u2].forEach(u => { A.cls(lineEl(A, u), 'k-hot', on); A.cls(rowOf(u), 'on', on); }); };
        A.cap(`Вершина ${V}: здесь пересекаются прямые ${E[0].name} и ${E[1].name}${ids.length > 2 ? ` (и ещё ${ids.slice(2).map(u => items[u].name).join(', ')} — вершина вырожденная)` : ''}`);
        A.set(sys, ''); A.cls(dot, 'k-dim', false); hot(true); await A.pulse(dot);
        A.cap('Переносим коэффициенты в систему; знак неравенства заменяем на «=»');
        A.set(sys, eqLine(E[0], 0, true) + eqLine(E[1], 1, true));
        for (let r = 0; r < 2; r++) {
          const row = rowOf(ids[r]), dl = sys.querySelector(`.gsl[data-r="${r}"]`);
          for (const j of [0, 1]) {
            const src = row.querySelector(`.tw[data-j="${j}"] .cf`), dst = dl.querySelector(`.tw[data-j="${j}"] .cf`); if (!dst) continue;
            if (dst.dataset.one === '1') { dst.classList.remove('dh'); await A.pulse(dst.parentNode); } else await A.put(src, dst, fq(E[r].a[j].abs()), { d: 600 });
          }
          await A.put(row.querySelector('.rb'), dl.querySelector('.rb'), fq(E[r].b), { d: 600 });
          await A.swap(dl.querySelector('.rs'), '=', 360);
        }
        const L = r => sys.querySelector(`.gsl[data-r="${r}"]`);
        const addLine = h => { sys.insertAdjacentHTML('beforeend', extra(h)); return sys.lastElementChild; };
        const showX = async el => { el.classList.remove('dh'); await A.pop(el, { d: 350 }); };
        if (pl.kind === 'C') {
          const a11 = E[0].a[0], a12 = E[0].a[1], a21 = E[1].a[0], a22 = E[1].a[1], b1 = E[0].b, b2 = E[1].b;
          let m1, m2; const lc = lcmQ(a12, a22);
          if (lc) { m1 = lc.div(a12.abs()); m2 = lc.div(a22.abs()); } else { m1 = a22.abs(); m2 = a12.abs(); }
          const same = a12.mul(m1).s === a22.mul(m2).s, op = same ? '−' : '+';
          const n1 = { a: [a11.mul(m1), a12.mul(m1)], b: b1.mul(m1) }, n2 = { a: [a21.mul(m2), a22.mul(m2)], b: b2.mul(m2) };
          const c1 = same ? n1.a[0].sub(n2.a[0]) : n1.a[0].add(n2.a[0]), R = same ? n1.b.sub(n2.b) : n1.b.add(n2.b);
          A.cap(`Чтобы исключить ${xv(2)}, умножаем (1) на ${fq(m1)} и (2) на ${fq(m2)}`);
          for (const r of [0, 1]) { const mb = L(r).querySelector('.mb'); mb.innerHTML = `&nbsp;× ${fq(r ? m2 : m1)}`; await A.pop(mb, { d: 300 }); }
          await Promise.all([0, 1].map(r => { const nn = r ? n2 : n1; return A.swap(L(r).querySelector('.lhs'), eqTerms(nn.a, xlab), 500).then(() => A.swap(L(r).querySelector('.rb'), fq(nn.b), 400)); }));
          A.cap(`Коэффициенты при ${xv(2)} ${same ? 'равны — вычитаем' : 'противоположны — складываем'}: (1′) ${op} (2′)`);
          const bx = addLine(`(1′) ${op} (2′):&nbsp; <span class="lhs">(${fq(n1.a[0])} ${op} ${par(n2.a[0])})${xv(1)} + (${fq(n1.a[1])} ${op} ${par(n2.a[1])})${xv(2)}</span> = ${fq(n1.b)} ${op} ${par(n2.b)}`);
          await showX(bx);
          A.cls([L(0).querySelectorAll('.tw')[1], L(1).querySelectorAll('.tw')[1]], 'k-del'); await A.wait(500);
          await A.swap(bx, `(1′) ${op} (2′):&nbsp; <span class="lhs">${fq(c1)}${xv(1)}</span> = ${fq(R)}`, 600);
          A.cap(`${xv(2)} исчезла: ${xv(1)} = ${fq(R)} ÷ ${par(c1)} = ${fq(x1v)}`);
          await showX(addLine(`${xv(1)} = ${fq(R)} ÷ ${par(c1)} = <b class="gain">${fq(x1v)}</b>`));
          A.cap(`Подставляем ${xv(1)} = ${fq(x1v)} в первое уравнение`);
          await showX(addLine(`${fq(a11)}·${par(x1v)} + ${par(a12)}·${xv(2)} = ${fq(b1)} &nbsp;⇒&nbsp; ${par(a12)}·${xv(2)} = ${fq(b1.sub(a11.mul(x1v)))}`));
          A.cap(`${xv(2)} = ${fq(b1.sub(a11.mul(x1v)))} ÷ ${par(a12)} = ${fq(x2v)}`);
          await showX(addLine(`${xv(2)} = <b class="gain">${fq(x2v)}</b>`));
        } else if (pl.kind === 'A') {
          const kz = E[0].a[0].isZero() ? 0 : 1, o = 1 - kz, ez = E[kz], eo = E[o];
          A.cap(`В уравнении (${kz + 1}) нет ${xv(1)}: сразу ${xv(2)} = ${fq(ez.b)} ÷ ${par(ez.a[1])} = ${fq(x2v)}`);
          A.cls(L(kz), 'k-ok'); await showX(addLine(`${xv(2)} = ${fq(ez.b)} ÷ ${par(ez.a[1])} = <b class="gain">${fq(x2v)}</b>`));
          if (!eo.a[1].isZero()) {
            A.cap(`Подставляем ${xv(2)} = ${fq(x2v)} в уравнение (${o + 1})`);
            await showX(addLine(`${par(eo.a[0])}·${xv(1)} + ${par(eo.a[1])}·${par(x2v)} = ${fq(eo.b)} &nbsp;⇒&nbsp; ${par(eo.a[0])}·${xv(1)} = ${fq(eo.b.sub(eo.a[1].mul(x2v)))}`));
            A.cap(`${xv(1)} = ${fq(eo.b.sub(eo.a[1].mul(x2v)))} ÷ ${par(eo.a[0])} = ${fq(x1v)}`);
          } else A.cap(`В уравнении (${o + 1}) нет ${xv(2)}: ${xv(1)} = ${fq(eo.b)} ÷ ${par(eo.a[0])} = ${fq(x1v)}`);
          await showX(addLine(`${xv(1)} = <b class="gain">${fq(x1v)}</b>`));
        } else {
          const kz = E[0].a[1].isZero() ? 0 : 1, o = 1 - kz, ez = E[kz], eo = E[o];
          A.cap(`В уравнении (${kz + 1}) нет ${xv(2)}: сразу ${xv(1)} = ${fq(ez.b)} ÷ ${par(ez.a[0])} = ${fq(x1v)}`);
          A.cls(L(kz), 'k-ok'); await showX(addLine(`${xv(1)} = ${fq(ez.b)} ÷ ${par(ez.a[0])} = <b class="gain">${fq(x1v)}</b>`));
          if (!eo.a[0].isZero()) {
            A.cap(`Подставляем ${xv(1)} = ${fq(x1v)} в уравнение (${o + 1})`);
            await showX(addLine(`${par(eo.a[0])}·${par(x1v)} + ${par(eo.a[1])}·${xv(2)} = ${fq(eo.b)} &nbsp;⇒&nbsp; ${par(eo.a[1])}·${xv(2)} = ${fq(eo.b.sub(eo.a[0].mul(x1v)))}`));
            A.cap(`${xv(2)} = ${fq(eo.b.sub(eo.a[0].mul(x1v)))} ÷ ${par(eo.a[1])} = ${fq(x2v)}`);
          } else A.cap(`В уравнении (${o + 1}) нет ${xv(1)}: ${xv(2)} = ${fq(eo.b)} ÷ ${par(eo.a[1])} = ${fq(x2v)}`);
          await showX(addLine(`${xv(2)} = <b class="gain">${fq(x2v)}</b>`));
        }
        A.cap(`Точка ${V} = ${vec(w.p)} попадает на график`);
        await A.fly(sys.lastElementChild, dot, plain(vec(w.p)));
        A.cls(dot, 'k-ok'); await A.pulse(dot); hot(false);
      }
      A.cap(`Все вершины области (${G.verts.length}) найдены`);
      A.cls(A.qa('.gsvg .gvx'), 'k-dim', false); A.cls(A.qa('.gsvg .gvx'), 'k-ok');
    };
    return demo('Как найти координаты вершины?', html, script);
  }

  // --- значения цели в вершинах и движение линии уровня ---
  function demoGraphObj(pr, G) {
    const g = gscene(pr, G), c = pr.c, max = pr.sense === 'max', f0 = pr.c0 || new Q(0n), nv = G.verts.length;
    const cN = c.map(g.N), cn = Math.hypot(cN[0], cN[1]);
    const vals = G.verts.map(w => w.f);
    const lo = vals.reduce((a, b) => b.lt(a) ? b : a), hi = vals.reduce((a, b) => b.gt(a) ? b : a), span = hi.sub(lo).toNumber() || 1;
    const best = max ? hi : lo, worst = max ? lo : hi;
    const bestIdx = vals.map((v, k) => v.eq(best) ? k : -1).filter(k => k >= 0);
    const unb = G.status === 'unbounded';
    const rows = G.verts.map((w, k) => `<div class="drow gvr" data-k="${k}"><b>${VLET(k)}</b> <span class="vp">(<span class="vx">${fq(w.p[0])}</span>; <span class="vy">${fq(w.p[1])}</span>)</span> <i>f</i> = ${fq(c[0])}·<span class="px">□</span> ${c[1].s < 0 ? '−' : '+'} ${fq(c[1].abs())}·<span class="py">□</span>${f0.isZero() ? '' : (f0.s < 0 ? ' − ' : ' + ') + fq(f0.abs())} = <b class="fvv dh">${fq(w.f)}</b><span class="fvb"><i style="width:${(8 + 92 * (w.f.sub(lo).toNumber() / span)).toFixed(0)}%"></i></span></div>`).join('');
    const html = `<div class="gwrap"><div class="gleft"><div class="dmh">значения цели f в вершинах</div>${rows}<div class="pvfm gfm"></div></div><div class="gright gstack">${gSvg(g, G, { pre: true, uid: 'o' })}</div></div>`;
    const lvlLine = v => { const d = [-cN[1] / cn, cN[0] / cn], p0 = [cN[0] * v / (cn * cn), cN[1] * v / (cn * cn)], Lk = (g.X + g.Y) * 2; return `<line class="glv" x1="${g.sx(p0[0] - d[0] * Lk).toFixed(1)}" y1="${g.sy(p0[1] - d[1] * Lk).toFixed(1)}" x2="${g.sx(p0[0] + d[0] * Lk).toFixed(1)}" y2="${g.sy(p0[1] + d[1] * Lk).toFixed(1)}"/>`; };
    const script = async A => {
      const fm = A.q('.gfm'), O = A.q('.gov'), lv = O.querySelector('.glvl'), gr = O.querySelector('.ggrad'), go = O.querySelector('.gopt');
      A.cls(A.qa('.gsvg .gvx'), 'k-dim');
      await A.wait(250);
      for (let k = 0; k < nv; k++) {
        const w = G.verts[k], row = A.q(`.gvr[data-k="${k}"]`), dotV = A.q(`.gsvg .gvx[data-v="${k}"]`);
        A.cap(`Подставляем вершину ${VLET(k)} = ${plain(vec(w.p))} в f`);
        A.cls(row, 'on'); A.cls(dotV, 'k-dim', false); A.cls(dotV, 'k-act');
        await Promise.all([A.put(row.querySelector('.vx'), row.querySelector('.px'), par(w.p[0]), { d: 600 }), A.put(row.querySelector('.vy'), row.querySelector('.py'), par(w.p[1]), { d: 600 })]);
        await A.pop(row.querySelector('.fvv'));
        const bar = row.querySelector('.fvb i'); await A.anim(bar, [{ width: '0%' }, { width: bar.style.width }], { d: 500 });
        A.cls(row, 'on', false); A.cls(dotV, 'k-act', false); A.cls(dotV, 'k-ok');
      }
      if (unb) {
        A.cap(`Область не ограничена: лучшее из конечных значений ${plain(fq(best))} ещё не оптимум`);
      } else {
        A.cap(`${max ? 'Наибольшее' : 'Наименьшее'} значение f = ${plain(fq(best))} в вершине ${bestIdx.map(VLET).join(' и ')}`);
        G.verts.forEach((_, k) => { const row = A.q(`.gvr[data-k="${k}"]`); if (bestIdx.includes(k)) { A.cls(row, 'done'); row.querySelector('.fvv').insertAdjacentHTML('beforeend', ' ★'); } else A.cls(row, 'k-dim'); });
      }
      if (cn < 1e-12) { A.cap('Коэффициенты цели нулевые: f постоянна, подходит любая допустимая точка'); return; }
      const cx = G.verts.reduce((s, w) => s + g.N(w.p[0]), 0) / nv, cy = G.verts.reduce((s, w) => s + g.N(w.p[1]), 0) / nv;
      const dirI = max ? 1 : -1, Lg = 0.22 * Math.min(g.X, g.Y) * g.u;
      const ex = g.sx(cx) + dirI * cN[0] / cn * Lg, ey = g.sy(cy) - dirI * cN[1] / cn * Lg, ang = Math.atan2(ey - g.sy(cy), ex - g.sx(cx));
      const head = [[0, 0], [-10, -5], [-10, 5]].map(([a, b]) => `${(ex + a * Math.cos(ang) - b * Math.sin(ang)).toFixed(1)},${(ey + a * Math.sin(ang) + b * Math.cos(ang)).toFixed(1)}`).join(' ');
      gr.innerHTML = `<line x1="${g.sx(cx).toFixed(1)}" y1="${g.sy(cy).toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"/><polygon points="${head}"/><text x="${(ex + 6).toFixed(1)}" y="${(ey - 6).toFixed(1)}">${max ? 'f растёт' : 'f убывает'}</text>`;
      A.cap(max ? `Вектор (${c.map(ft).join('; ')}) показывает, куда f растёт` : `Для min идём против вектора (${c.map(ft).join('; ')}): туда f убывает`);
      A.set(fm, `<span class="fmh">направление улучшения: ${max ? 'по' : 'против'} вектора коэффициентов цели</span>`);
      await A.show(gr);
      const v0 = worst.sub(f0).toNumber();
      lv.innerHTML = lvlLine(v0);
      A.cap(`Линия уровня f = const перпендикулярна вектору; проводим её через вершину с f = ${plain(fq(worst))}`);
      A.set(fm, `<span class="fmh">линия уровня: f = ${fq(worst)}</span>`);
      await A.show(lv);
      const shift = unb ? (g.X + g.Y) * 1.2 * cn * dirI : best.sub(worst).toNumber();
      const wx = cN[0] * shift / (cn * cn), wy = cN[1] * shift / (cn * cn);
      A.cap(unb ? 'Сдвигаем линию в сторону улучшения — она никогда не упрётся в область' : 'Сдвигаем линию в сторону улучшения, пока она ещё касается области');
      await A.anim(lv, [{ transform: 'translate(0px,0px)' }, { transform: `translate(${(g.u * wx).toFixed(1)}px,${(-g.u * wy).toFixed(1)}px)` }], { d: 2600, ease: 'ease-in-out' });
      if (unb) {
        A.cap('Линия уходит за пределы области: f не ограничена, оптимума нет');
        A.set(fm, '<span class="fmh bad">f можно улучшать бесконечно</span>');
      } else if (bestIdx.length > 1) {
        const pts = G.opt.slice(0, 2).map(o => o.p);
        go.innerHTML = `<line x1="${g.sx(g.N(pts[0][0])).toFixed(1)}" y1="${g.sy(g.N(pts[0][1])).toFixed(1)}" x2="${g.sx(g.N(pts[1][0])).toFixed(1)}" y2="${g.sy(g.N(pts[1][1])).toFixed(1)}"/>`;
        A.cap(`Линия легла на сторону области: f = ${plain(fq(best))} на всём отрезке ${bestIdx.map(VLET).join('–')} — оптимумов много`);
        A.set(fm, `<span class="fmh ok">оптимум не единственный: весь отрезок ${bestIdx.map(VLET).join('–')}</span>`);
        await A.show(go);
      } else {
        const k = bestIdx[0], w = G.verts[k];
        A.cap(`Последняя общая точка — вершина ${VLET(k)} = ${plain(vec(w.p))}: f* = ${plain(fq(best))}`);
        go.innerHTML = `<circle cx="${g.sx(g.N(w.p[0])).toFixed(1)}" cy="${g.sy(g.N(w.p[1])).toFixed(1)}" r="10"/>`;
        A.set(fm, `<span class="fmh ok">оптимум: ${VLET(k)} = ${vec(w.p)}, f* = ${fq(best)}</span>`);
        await A.pop(go);
      }
    };
    return demo('Как найти лучший план на чертеже?', html, script);
  }

  /* =================== Симплекс-метод и искусственный базис: сцены =================== */
  const varLegend = '<div class="vleg"><span class="vk-x">● исходные</span><span class="vk-s">■ остаточные (+)</span><span class="vk-e">▲ излишки (−)</span><span class="vk-t">◆ искусственные</span></div>';
  const objLine2 = (pr, hid) => `<div class="drow cnobj"><i>f</i> = <span class="lhs">${eqTerms(pr.c, xlab, hid)}</span>${pr.c0 && !pr.c0.isZero() ? ` ${pr.c0.s < 0 ? '−' : '+'} ${fq(pr.c0.abs())}` : ''} → <span class="gs">${pr.sense}</span></div>`;

  // --- приведение к равенствам: остаточные, излишки, искусственные переменные, стартовый базис ---
  function demoCanon(pr, res) {
    const m = pr.rows.length, vars = res.vars, hasArt = res.artOf.some(x => x !== null);
    const rowsHtml = pr.rows.map((r, i) => `<div class="drow cnr" data-i="${i}"><span class="kbd">(${i + 1})</span> <span class="lhs">${eqTerms(r.a, xlab)}</span><span class="ex ex-s dh"></span><span class="ex ex-t dh"></span> <span class="rs">${sg(r.s)}</span> <span class="rb">${fq(r.b)}</span><span class="bn dh"></span></div><div class="cnw dh" data-i="${i}"></div>`).join('');
    const html = `${varLegend}<div class="dmh">ограничения → равенства</div>${rowsHtml}<div class="pvfm cnfm"></div>`;
    const script = async A => {
      const row = i => A.q(`.cnr[data-i="${i}"]`), warn = i => A.q(`.cnw[data-i="${i}"]`), fm = A.q('.cnfm');
      await A.wait(250);
      for (let i = 0; i < m; i++) {
        const R = res.rows[i], sl = res.slackOf[i], ar = res.artOf[i], rw = row(i);
        if (R.flipped) {
          A.cap(`(${i + 1}): правая часть ${plain(fq(pr.rows[i].b))} < 0 — умножаем ограничение на −1`);
          A.cls(rw, 'on'); A.set(fm, `<span class="fmh">умножьте обе части на −1 и разверните знак неравенства</span>`);
          await A.seq([rw.querySelector('.lhs'), rw.querySelector('.rs'), rw.querySelector('.rb')], 140, (el, k) => A.swap(el, k === 0 ? eqTerms(R.a, xlab) : k === 1 ? sg(R.s) : fq(R.b), 520));
          A.cls(rw, 'on', false);
        }
        if (sl !== null) {
          const plus = R.s === '<=';
          A.cap(plus ? `Строка ${i + 1}. Прибавьте остаток ${plain(vname(vars, sl))} к левой части. Теперь обе части равны.` : `Строка ${i + 1}. Левая часть может превышать правую. Вычтите излишек ${plain(vname(vars, sl))}, чтобы получить равенство.`);
          A.cls(rw, 'on', true);
          const ex = rw.querySelector('.ex-s'); ex.innerHTML = `&nbsp;${plus ? '+' : '−'}&nbsp;${vK(vars, sl)}`; ex.classList.add(plus ? 'vk-s' : 'vk-e');
          await A.pop(ex); await A.swap(rw.querySelector('.rs'), '=', 520); A.cls(rw, 'on', false);
        } else {
          A.cap(`(${i + 1}) уже равенство — дополнительная переменная не нужна`);
          A.cls(rw, 'on', true); await A.swap(rw.querySelector('.rs'), '=', 300); A.cls(rw, 'on', false);
        }
        if (ar !== null) {
          const w = warn(i);
          if (sl !== null && R.s === '>=') {
            A.cap(`При ${xv(1)} = … = 0 излишек ${vK(vars, sl)} = −${plain(fq(R.b))} < 0 — допустимого базиса нет`);
            w.innerHTML = `<span class="warnchip k-del">${vK(vars, sl)} = −${fq(R.b)} &lt; 0&nbsp;✕ не годится в базис</span>`; await A.pop(w);
          } else if (sl === null) {
            A.cap(`В равенстве (${i + 1}) нет переменной с единичным столбцом — нужна искусственная`);
            w.innerHTML = '<span class="warnchip">нет готовой базисной переменной</span>'; await A.pop(w);
          }
          A.cap(sl !== null && R.s === '<=' ? `(${i + 1}): в этом методе искусственную переменную ${plain(vname(vars, ar))} ≥ 0 вводят в каждое уравнение` : `Добавляем искусственную переменную ${plain(vname(vars, ar))} ≥ 0 — она образует единичный столбец`);
          const ex = rw.querySelector('.ex-t'); ex.innerHTML = `&nbsp;+&nbsp;${vK(vars, ar)}`; ex.classList.add('vk-t');
          await A.pop(ex);
        }
      }
      A.cap('Выделенные переменные образуют начальный базис. У каждой коэффициент 1 в своей строке и 0 в остальных.');
      for (let i = 0; i < m; i++) {
        const b0 = res.artOf[i] !== null ? res.artOf[i] : res.slackOf[i], rw = row(i);
        A.cls(rw.querySelector(res.artOf[i] !== null ? '.ex-t' : '.ex-s'), 'k-sel');
        const bn = rw.querySelector('.bn'); bn.innerHTML = `&nbsp;&nbsp;⇒ ${vK(vars, b0)} = ${fq(res.rows[i].b)}`; await A.pop(bn);
      }
      if (hasArt) {
        const ts = res.artOf.filter(x => x !== null).map(j => vK(vars, j)).join(' + ');
        A.cap('Цель этапа 1: обнулить искусственные переменные — минимизируем их сумму h');
        A.set(fm, `<span class="fmh"><i>h</i> = ${ts} → min &nbsp;(если h* = 0 — допустимое решение найдено)</span>`); await A.pop(fm);
      } else {
        A.cap('Остатки сразу дают допустимый базис — искусственные переменные не нужны');
        A.set(fm, '<span class="fmh ok">все b ≥ 0 и в каждой строке есть остаток с коэффициентом 1</span>'); await A.pop(fm);
      }
    };
    return demo('Как записать ограничения для первой таблицы?', html, script);
  }

  // --- перенос равенств в начальную симплекс-таблицу ---
  function demoToTable(pr, res, st0, withObj) {
    const m = st0.rows.length, vars = st0.vars, cols = st0.cols;
    const eqs = st0.rows.map((r, i) => `<div class="drow tbr" data-i="${i}"><span class="kbd">(${i + 1})</span> <span class="lhs">${eqTerms(r.a, j => vK(vars, j), false)}</span> = <span class="rb">${fq(r.b)}</span></div>`).join('');
    const html = `${varLegend}<div class="pvwrap"><div><div class="dmh">равенства</div>${eqs}${withObj ? objLine2(pr) : ''}</div><div><div class="dmh">начальная таблица</div>${dtb(st0, { cls: 'tN', blank: true, blankZ: true })}</div></div><div class="pvfm"></div>`;
    const script = async A => {
      const { C, V, H } = sceneTools(A), fm = A.q('.pvfm');
      A.cls(cols.map(j => H('tN', j)), 'dh');
      await A.wait(250);
      A.cap('Столбцы таблицы — переменные; тип переменной подписан и закрашен');
      await A.seq(cols, 90, j => A.pop(H('tN', j), { d: 300 }));
      for (let i = 0; i < m; i++) {
        const row = A.q(`.tbr[data-i="${i}"]`), r = st0.rows[i];
        A.cap(`Равенство (${i + 1}) → строка таблицы; слева — её базисная переменная ${plain(vname(vars, st0.basis[i]))}`);
        A.cls(row, 'on');
        const bt = row.querySelector(`.tw[data-j="${st0.basis[i]}"]`);
        await A.put(bt || row, V('tN', i, 'bas'), vK(vars, st0.basis[i]));
        await A.put(row.querySelector('.rb'), V('tN', i, -1), fq(r.b));
        for (const j of cols) {
          const tw = row.querySelector(`.tw[data-j="${j}"] .cf`), twAll = row.querySelector(`.tw[data-j="${j}"]`);
          if (tw) await A.put(twAll, V('tN', i, j), fq(r.a[j]), { d: 500 });
          else { A.set(V('tN', i, j), '0'); A.cls(C('tN', i, j), 'zc'); await A.pop(V('tN', i, j), { d: 200 }); }
        }
        A.cls(row, 'on', false); A.cls(row, 'done');
      }
      if (withObj) {
        const z = st0.z, max = pr.sense === 'max';
        A.cap(max ? `Строка ${plain(zlab(z.label))}: коэффициенты цели переносим со сменой знака (f − c·x = 0)` : `min f = max(−f): в строку ${plain(zlab(z.label))} коэффициенты цели переносим как есть`);
        const ob = A.q('.cnobj'); A.cls(ob, 'on');
        await A.put(A.q('.cnobj .gs'), V('tN', m, 'bas'), zlab(z.label));
        for (const j of cols) {
          const cell = V('tN', m, j);
          if (j < pr.n) {
            const tw = ob.querySelector(`.tw[data-j="${j}"]`);
            if (tw) { await A.put(tw, cell, fq(pr.c[j]), { d: 500 }); if (max) { A.cls(C('tN', m, j), 'k-act'); await A.swap(cell, fq(z.a[j]), 520); A.cls(C('tN', m, j), 'k-act', false); } }
            else { A.set(cell, fq(z.a[j])); await A.pop(cell, { d: 200 }); }
          } else { A.set(cell, fq(z.a[j])); A.cls(C('tN', m, j), 'zc'); await A.pop(cell, { d: 200 }); }
        }
        A.set(V('tN', m, -1), fq(z.b)); await A.pop(V('tN', m, -1), { d: 200 });
        A.cls(ob, 'on', false);
        A.cap('Начальная таблица готова: базисное решение — значения b, остальные переменные 0');
      } else {
        A.cap('Строки готовы; строку −h составим на следующем шаге');
      }
    };
    return demo('Откуда берутся числа в первой таблице?', html, script);
  }

  // --- строка −h: минус сумма строк с искусственными переменными ---
  function demoHRow(pr, res) {
    const st0 = res.phase1.steps[0], m = st0.rows.length, vars = st0.vars, cols = st0.cols;
    const artRows = [...Array(m).keys()].filter(i => res.artOf[i] !== null), artCols = cols.filter(j => vars[j].kind === 't'), otherCols = cols.filter(j => vars[j].kind !== 't');
    const html = `${varLegend}<div class="pvwrap one"><div>${dtb(st0, { cls: 'tN', blankZ: true })}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const { C, V } = sceneTools(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      await A.wait(250);
      A.cap(`h = ${artRows.map(i => plain(vname(vars, res.artOf[i]))).join(' + ')}: берём строки, в которых есть искусственные переменные`);
      for (let i = 0; i < m; i++) A.cls(['bas', -1, ...cols].map(j => C('tN', i, j)), artRows.includes(i) ? 'k-sel' : 'k-dim');
      await A.pulse(V('tN', artRows[0], 'bas'));
      const colStep = async j => {
        const nm = j < 0 ? 'b' : plain(vname(vars, j)), vals = artRows.map(i => j < 0 ? st0.rows[i].b : st0.rows[i].a[j]), tot = vals.reduce((s, v) => s.add(v), new Q(0n)), res0 = tot.neg();
        A.cap(`Столбец ${nm}: складываем числа строк с t и меняем знак`);
        A.cls(['bas', -1, ...cols].map(jj => artRows.concat([m]).map(i => C('tN', i, jj))).flat(), 'k-act', false);
        A.cls(artRows.map(i => C('tN', i, j)), 'k-act');
        A.set(fm, `<span class="fmh">−( ${artRows.map((_, k) => `<span class="fo h${k}">□</span>`).join(' + ')} ) = <b class="calc-result">□</b></span>`);
        for (let k = 0; k < artRows.length; k++) await A.put(V('tN', artRows[k], j), A.q(`.pvfm .h${k}`), par(vals[k]), { d: 500 });
        await A.swap(A.q('.pvfm .calc-result'), fq(res0), 420);
        await A.fly(A.q('.pvfm .calc-result'), V('tN', m, j), null, { d: 600 });
        A.set(V('tN', m, j), fq(res0)); await A.pop(V('tN', m, j), { d: 260 });
        A.cls(artRows.map(i => C('tN', i, j)), 'k-act', false); A.cls(C('tN', m, j), 'k-ok');
      };
      await colStep(-1);
      for (const j of otherCols) await colStep(j);
      if (artCols.length) {
        A.cap('В столбцах искусственных переменных строки −h стоят нули: они уже в базисе');
        await A.seq(artCols, 120, j => { A.set(V('tN', m, j), '0'); A.cls(C('tN', m, j), 'zc'); return A.pop(V('tN', m, j), { d: 250 }); });
      }
      A.cap(`Строка −h готова: в b стоит −h = ${plain(fq(st0.z.b))}`);
      A.set(fm, '');
      sum.innerHTML = `Сейчас <i>h</i> = ${fq(st0.z.b.neg())}: столько «не хватает» до допустимого решения. Задача этапа 1 — довести ее до 0.`; await A.show(sum);
    };
    return demo('Как записать сумму временных переменных h в таблице?', html, script);
  }

  // --- итог этапа 1: проверка h = 0 (или h > 0), удаление столбцов t ---
  function demoPhase1End(pr, res) {
    const p1 = res.phase1.steps, last = p1[p1.length - 1], m = last.rows.length, vars = last.vars, cols = last.cols, infeasible = res.status === 'infeasible';
    const tc = cols.filter(j => vars[j].kind === 't'), inBasis = last.basis.filter(bj => vars[bj].kind === 't');
    const html = `<div class="pvwrap one"><div>${dtb(last, { cls: 'tO' })}</div></div><div class="pvfm"></div>`;
    const script = async A => {
      const { C, V, H } = sceneTools(A), fm = A.q('.pvfm');
      await A.wait(250);
      A.cap('Этап 1 закончен: в строке −h нет отрицательных чисел');
      await A.each(cols, async j => { A.cls(C('tO', m, j), 'k-ok'); await A.wait(40); });
      if (infeasible) {
        A.cap(`Но b = ${plain(fq(last.z.b))} ≠ 0, то есть h* = ${plain(fq(last.z.b.neg()))} > 0`);
        A.cls(C('tO', m, -1), 'k-del'); await A.pulse(V('tO', m, -1));
        A.set(fm, `<span class="fmh bad">h* = ${fq(last.z.b.neg())} &gt; 0: искусственные переменные нельзя обнулить</span>`);
        A.cap('Допустимого решения нет: система ограничений несовместна, этап 2 не выполняется');
        A.cls(inBasis.map(bj => C('tO', last.basis.indexOf(bj), 'bas')), 'k-del');
        A.set(fm, `<span class="fmh bad">✕ допустимая область пуста — задача не имеет решения</span>`); await A.pulse(fm);
        return;
      }
      A.cap('b = 0, значит h* = 0: все искусственные переменные равны 0 — допустимое решение найдено');
      A.cls(C('tO', m, -1), 'k-ok'); await A.pulse(V('tO', m, -1));
      A.set(fm, '<span class="fmh ok">✓ h* = 0 — допустимое базисное решение найдено</span>');
      if (inBasis.length) {
        A.cap(`${inBasis.map(bj => plain(vname(vars, bj))).join(', ')} осталась в базисе со значением 0 — её нужно вывести (см. ниже)`);
        A.cls(inBasis.map(bj => C('tO', last.basis.indexOf(bj), 'bas')), 'k-act');
      }
      if (tc.length) {
        A.cap(`Искусственные переменные свою роль сыграли — вычёркиваем столбцы ${tc.map(j => plain(vname(vars, j))).join(', ')}`);
        const cells = tc.map(j => [H('tO', j), ...[...Array(m + 1).keys()].map(i => C('tO', i, j))]).flat();
        A.cls(cells, 'k-del'); await A.wait(500);
        await A.anim(A.q('.tO table'), [{ opacity: 1 }, { opacity: .85 }, { opacity: 1 }], { d: 300 });
        cells.forEach(c => c && c.classList.add('dh'));
      }
    };
    return demo('Можно ли выполнить все условия исходной задачи?', html, script);
  }

  // --- переход к этапу 2: исходная цель и приведение её строки к базису ---
  function demoPhase2Start(pr, res) {
    const start2 = res.phase2.steps[0], raw = res.raw, m = start2.rows.length, vars = start2.vars, cols = start2.cols;
    const base = { ...start2, z: raw.z, q: null };
    const html = `<div class="pvwrap one"><div class="dmh">таблица этапа 2</div><div>${dtb(base, { cls: 'tN', blankZ: true })}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const { C, V } = sceneTools(A), fm = A.q('.pvfm'), sum = A.q('.pvsum'), zl = plain(zlab(raw.z.label)), max = pr.sense === 'max';
      A.cls(cols.map(j => C('tN', m, j)), 'dh');
      await A.wait(250);
      A.cap(max ? `Возвращаем исходную цель: строка ${zl} — коэффициенты f с обратным знаком` : `Возвращаем исходную цель: min f = max(−f), строка ${zl} — коэффициенты f как есть`);
      await A.seq(cols, 80, j => { A.set(V('tN', m, j), fq(raw.z.a[j])); return A.pop(C('tN', m, j), { d: 300 }); });
      A.set(V('tN', m, -1), fq(raw.z.b));
      let zc = { b: raw.z.b, a: raw.z.a.slice() };
      if (!res.elim.length) {
        A.cap('Под базисными переменными в строке цели уже нули — приводить её к базису не нужно');
        A.cls(start2.basis.map(bj => C('tN', m, bj)), 'k-ok');
      }
      for (const e of res.elim) {
        const kk = zc.a[e.bj], row = start2.rows[e.i], nb = { b: zc.b.sub(kk.mul(row.b)), a: zc.a.map((v, j) => v.sub(kk.mul(row.a[j]))) };
        A.cap(`Под базисной ${plain(vname(vars, e.bj))} в строке ${zl} стоит ${plain(fq(kk))}, а должен быть 0`);
        A.cls(C('tN', m, e.bj), 'k-del'); A.cls(['bas', -1, ...cols].map(j => C('tN', e.i, j)), 'k-sel'); await A.pulse(V('tN', m, e.bj));
        A.cap(`Вычитаем из строки ${zl} строку ${plain(vname(vars, e.bj))}, умноженную на ${plain(fq(kk))}`);
        for (const j of [-1, ...cols]) {
          const old = j < 0 ? zc.b : zc.a[j], nw = j < 0 ? nb.b : nb.a[j], cell = row2 => j < 0 ? row2.b : row2.a[j];
          A.set(fm, `<span class="fmh"><span class="fo">□</span> − <span class="fk">□</span> × <span class="fn">□</span> = <b class="calc-result">□</b></span>`);
          A.cls(C('tN', m, j), 'k-act');
          await A.put(V('tN', m, j), A.q('.pvfm .fo'), fq(old), { d: 420 });
          await A.put(V('tN', m, e.bj), A.q('.pvfm .fk'), par(kk), { d: 420 });
          await A.put(V('tN', e.i, j), A.q('.pvfm .fn'), par(cell(row)), { d: 420 });
          await A.swap(A.q('.pvfm .calc-result'), fq(nw), 360);
          await A.fly(A.q('.pvfm .calc-result'), V('tN', m, j), null, { d: 450 });
          A.set(V('tN', m, j), fq(nw)); await A.pop(V('tN', m, j), { d: 220 });
          A.cls(C('tN', m, j), 'k-act', false);
        }
        zc = nb; A.cls(['bas', -1, ...cols].map(j => C('tN', e.i, j)), 'k-sel', false); A.cls(C('tN', m, e.bj), 'k-del', false); A.cls(C('tN', m, e.bj), 'k-ok');
      }
      A.cap(`Строка ${zl} готова: под базисными переменными нули — можно запускать симплекс-метод`);
      A.set(fm, '');
      A.cls(start2.basis.map(bj => C('tN', m, bj)), 'k-ok');
      sum.innerHTML = `Базис: ${start2.basis.map((bj, i) => `${vK(vars, bj)} = ${fq(start2.rows[i].b)}`).join(', ')}; ${plain(zlab(start2.z.label))}: b = ${fq(start2.z.b)}`; await A.show(sum);
    };
    return demo('Как вернуться к расчёту исходной цели?', html, script);
  }

  // --- подстановка точки в ограничения и цель (проверка ответа) ---
  // st — итоговая таблица (если есть), по ней показывается чтение значений из базиса
  function demoAnswer(pr, x, fv, st, extra = {}) {
    const n = pr.n, m = pr.rows.length;
    const vN = j => xv(j + 1);
    let top = '';
    if (st) top = `<div class="pvwrap one"><div>${dtb(st, { cls: 'tO' })}</div></div>`;
    const chips = `<div class="dmbig anschips"><i>x</i>* = (${x.map((_, j) => `<span class="ch v" data-j="${j}">${vN(j)} = ?</span>`).join('; ')}), &nbsp;<i>f</i>* = <span class="ch fv">?</span></div>`;
    const rows = pr.rows.map((r, i) => `<div class="drow ansr" data-i="${i}"><span class="kbd">(${i + 1})</span> <span class="lhs">${TM(r.a, xlab)}</span> <span class="ch rs">${sg(r.s)}</span> ${fq(r.b)} <span class="ch okc dh"></span></div>`).join('');
    const objr = `<div class="drow ansr" data-obj="1"><i>f</i> = <span class="lhs">${TM(pr.c, xlab)}</span>${pr.c0 && !pr.c0.isZero() ? ` ${pr.c0.s < 0 ? '−' : '+'} ${fq(pr.c0.abs())}` : ''} <span class="ch okc dh"></span></div>`;
    const html = `${top}${chips}<div class="dmh" style="margin-top:6px">подстановка в исходные ограничения</div>${rows}${objr}`;
    const script = async A => {
      const { C, V } = sceneTools(A);
      await A.wait(250);
      if (st) {
        const m2 = st.rows.length, vars = st.vars;
        A.cap('Читаем итоговую таблицу: базисная переменная равна своему b, небазисные равны 0');
        for (let j = 0; j < n; j++) {
          const chip = A.q(`.ch.v[data-j="${j}"]`), i = st.basis.indexOf(j);
          if (i >= 0) {
            A.cls([C('tO', i, 'bas'), C('tO', i, -1)], 'k-sel');
            await A.fly(V('tO', i, -1), chip); await A.swap(chip, `${vN(j)} = <b>${fq(x[j])}</b>`, 360); A.cls(chip, 'pos');
          } else { await A.swap(chip, `${vN(j)} = <b>0</b>`, 300); A.cls(chip, 'zero'); }
        }
        const hid = st.vars.map((v, j) => ({ v, j })).filter(o => o.v.kind !== 'x' && st.basis.indexOf(o.j) >= 0).map(o => plain(vname(vars, o.j)));
        if (hid.length) { A.cap(`Дополнительные переменные (${st.vars.filter(v => v.kind !== 'x').map(v => plain(vname(vars, st.vars.indexOf(v)))).join(', ')}) в ответ не входят`); }
        A.cap(`Значение цели читаем из b строки ${plain(zlab(st.z.label))}`);
        A.cls(C('tO', m2, -1), 'k-sel');
        await A.fly(V('tO', m2, -1), A.q('.ch.fv'));
        await A.swap(A.q('.ch.fv'), `<b>${fq(fv)}</b>`, 420); A.cls(A.q('.ch.fv'), 'pos');
        if (extra.alt && extra.alt.length) { A.cap(`Под ${extra.alt.map(j => plain(vname(vars, j))).join(', ')} в строке цели стоит 0 — есть и другие оптимальные решения`); A.cls(extra.alt.map(j => C('tO', m2, j)), 'k-act'); }
        if (extra.degenerate) { A.cap('Одна из базисных переменных равна 0 — решение вырожденное'); st.rows.forEach((r, i) => { if (r.b.isZero()) A.cls(C('tO', i, -1), 'k-act'); }); }
      } else {
        A.cap('Записываем найденную точку x* и значение f*');
        await A.seq(x.map((_, j) => j), 150, j => { const chip = A.q(`.ch.v[data-j="${j}"]`); return A.swap(chip, `${vN(j)} = <b>${fq(x[j])}</b>`, 360).then(() => A.cls(chip, x[j].isZero() ? 'zero' : 'pos')); });
        await A.swap(A.q('.ch.fv'), `<b>${fq(fv)}</b>`, 420); A.cls(A.q('.ch.fv'), 'pos');
      }
      A.cap('Подставляем x* в исходные ограничения');
      for (let i = 0; i < m; i++) {
        const row = A.q(`.ansr[data-i="${i}"]`), r = pr.rows[i], stt = termIn(r.a, (j, one) => (one ? '' : '·') + par(x[j]));
        const lhs = r.a.reduce((s, v, j) => s.add(v.mul(x[j])), new Q(0n)), ok = r.s === '<=' ? lhs.le(r.b) : r.s === '>=' ? lhs.ge(r.b) : lhs.eq(r.b), tight = lhs.eq(r.b);
        A.cap(`Ограничение (${i + 1}): ${plain(fq(lhs))} ${sg(r.s)} ${plain(fq(r.b))} — ${ok ? (tight ? 'выполнено как равенство (активное)' : 'выполнено с запасом') : 'НЕ выполнено'}`);
        A.cls(row, 'on');
        await A.seq([...row.querySelectorAll('.tm')], 90, (el, k) => A.swap(el, stt[k] ? stt[k].h : el.innerHTML, 380));
        await A.wait(200);
        await A.swap(row.querySelector('.lhs'), `<b>${fq(lhs)}</b>`, 420);
        const mark = row.querySelector('.okc'); mark.innerHTML = ok ? '✓' : '✕ не выполнено'; mark.style.color = ok ? '' : '#c0284f';
        await A.pop(mark); A.cls(row, 'on', false); A.cls(row, ok ? 'done' : 'bad');
      }
      const ro = A.q('.ansr[data-obj="1"]'), stt = termIn(pr.c, (j, one) => (one ? '' : '·') + par(x[j])), val = ALG.value(pr.c, x).add(pr.c0 || new Q(0n));
      A.cap(`Цель: f = ${plain(fq(val))}${val.eq(fv) ? ' — совпадает с f*' : ' — не совпадает с f*'}`);
      A.cls(ro, 'on');
      await A.seq([...ro.querySelectorAll('.tm')], 90, (el, k) => A.swap(el, stt[k] ? stt[k].h : el.innerHTML, 380));
      await A.swap(ro.querySelector('.lhs'), `<b>${fq(ALG.value(pr.c, x))}</b>`, 420);
      const mk = ro.querySelector('.okc'); mk.innerHTML = `= ${fq(val)} ✓`; await A.pop(mk); A.cls(ro, 'on', false); A.cls(ro, 'done');
      A.cap('Все ограничения выполнены, значение цели подтверждено — ответ верен');
    };
    return demo('Как прочитать ответ и проверить его по условию?', html, script);
  }

  /* =================== Двойственная задача, Гаусс, сведение к плоскости: дополнительные сцены =================== */
  // --- соответствие «ограничение ↔ переменная y», «переменная x ↔ ограничение Д» ---
  // P: { sense, rows:[{a,s,b}], signs? }, D: { sense, rows:[{s}], signs? }
  function demoDualMap(P, D) {
    const n = P.rows[0].a.length, m = P.rows.length, xs = P.signs || new Array(n).fill('>='), ys = D.signs || new Array(m).fill('>=');
    const rI = P.rows.map((r, i) => `<div class="mprow" data-i="${i}"><span class="mpl">(${i + 1}) &nbsp;${lin(r.a, j => xv(j + 1))} ${sg(r.s)} ${fq(r.b)}</span><span class="mpa dh">⟷</span><span class="mpr">${yv(i + 1)} <span class="dh mpv">${signTxt(ys[i], '').trim()}</span></span><span class="mpw dh">«${sg(r.s)}» ⇒ ${signTxt(ys[i], yv(i + 1))}</span></div>`).join('');
    const rJ = [...Array(n)].map((_, j) => `<div class="mprow" data-j="${j}"><span class="mpl">${signTxt(xs[j], xv(j + 1))} &nbsp;(столбец ${j + 1})</span><span class="mpa dh">⟷</span><span class="mpr dh">Д${j + 1}: Σ aᵢ${j + 1}·yᵢ ${sg(D.rows[j].s)} c${j + 1}</span><span class="mpw dh">${signTxt(xs[j], xv(j + 1))} ⇒ «${sg(D.rows[j].s)}»</span></div>`).join('');
    const html = `<div class="dmh">каждому ограничению прямой — переменная двойственной</div>${rI}<div class="dmh" style="margin-top:8px">каждой переменной прямой — ограничение двойственной</div>${rJ}<div class="mprow mpgoal"><span class="mpl"><i>L</i> → ${P.sense}</span><span class="mpa dh">⟷</span><span class="mpr dh"><i>g</i> → ${D.sense}</span></div>`;
    const script = async A => {
      await A.wait(250);
      for (let i = 0; i < m; i++) {
        const row = A.q(`.mprow[data-i="${i}"]`);
        A.cap(`Ограничение (${i + 1}) получает свою переменную ${plain(yv(i + 1))}`);
        A.cls(row, 'on'); await A.pop(row.querySelector('.mpa'), { d: 300 });
        A.cap(`Знак ограничения «${sg(P.rows[i].s)}» ⇒ условие на ${plain(yv(i + 1))}: ${signTxt(ys[i], '').trim()}`);
        await A.pop(row.querySelector('.mpv')); await A.pop(row.querySelector('.mpw'), { d: 300 });
        A.cls(row, 'on', false); A.cls(row, 'done');
      }
      for (let j = 0; j < n; j++) {
        const row = A.q(`.mprow[data-j="${j}"]`);
        A.cap(`Столбец при ${plain(xv(j + 1))} задаёт ограничение Д${j + 1} двойственной`);
        A.cls(row, 'on'); await A.pop(row.querySelector('.mpa'), { d: 300 }); await A.pop(row.querySelector('.mpr'));
        A.cap(`Знак условия на ${plain(xv(j + 1))} ⇒ знак в Д${j + 1}: «${sg(D.rows[j].s)}»`);
        await A.pop(row.querySelector('.mpw'), { d: 300 });
        A.cls(row, 'on', false); A.cls(row, 'done');
      }
      A.cap(`Цель меняет направление: ${P.sense} → ${D.sense}`);
      const gl = A.q('.mpgoal'); A.cls(gl, 'on'); await A.pop(gl.querySelector('.mpa'), { d: 300 }); await A.pop(gl.querySelector('.mpr')); A.cls(gl, 'on', false); A.cls(gl, 'done');
    };
    return demo('Как каждому ограничению сопоставить оценку ресурса?', html, script);
  }

  // --- подстановка x* в ограничения прямой: равенство или запас ⇒ y = 0 ---
  function demoCSsub(norm, x) {
    const m = norm.length;
    const rows = norm.map((r, i) => `<div class="drow csr" data-i="${i}"><span class="kbd">(${i + 1})</span> <span class="lhs">${TM(r.a, xlab)}</span> <span class="ch rs">≤</span> ${fq(r.b)} <span class="ch dh csv"></span></div>`).join('');
    const xs = `<div class="dmbig"><i>x</i>* = (${x.map((v, j) => `<span class="ch xs" data-j="${j}">${xv(j + 1)} = ${fq(v)}</span>`).join('; ')})</div>`;
    const script = async A => {
      await A.wait(250);
      for (let i = 0; i < m; i++) {
        const row = A.q(`.csr[data-i="${i}"]`), r = norm[i], stt = termIn(r.a, (j, one) => (one ? '' : '·') + par(x[j]));
        const lhs = r.a.reduce((s, v, j) => s.add(v.mul(x[j])), new Q(0n)), slack = r.b.sub(lhs), tight = slack.isZero();
        A.cap(`Ограничение (${i + 1}): подставляем x* — левая часть ${plain(fq(lhs))}`);
        A.cls(row, 'on');
        await A.seq([...row.querySelectorAll('.tm')], 90, (el, k) => { const jj = +el.dataset.j; return A.fly(A.q(`.xs[data-j="${jj}"]`), el, plain(fq(x[jj])), { d: 600 }).then(() => A.swap(el, stt[k] ? stt[k].h : el.innerHTML, 300)); });
        await A.swap(row.querySelector('.lhs'), `<b>${fq(lhs)}</b>`, 420);
        const csv = row.querySelector('.csv');
        if (tight) { A.cap(`${plain(fq(lhs))} = ${plain(fq(r.b))}: ресурс израсходован полностью — ${plain(yv(i + 1))} пока неизвестна`); await A.swap(row.querySelector('.rs'), '=', 400); csv.innerHTML = `${yv(i + 1)} ≥ 0`; csv.classList.add('dim'); }
        else { A.cap(`${plain(fq(lhs))} < ${plain(fq(r.b))}: остался запас ${plain(fq(slack))} ⇒ ${plain(yv(i + 1))} = 0`); await A.swap(row.querySelector('.rs'), '&lt;', 400); csv.innerHTML = `${yv(i + 1)} = 0`; csv.classList.add('zero'); }
        await A.pop(csv); A.cls(row, 'on', false);
      }
    };
    return demo('Какие ресурсы остались в запасе?', xs + rows, script);
  }

  // --- метод Гаусса — Жордана по шагам (расширенная матрица) ---
  function demoGauss(eqs, names, title) {
    const k = names.length, rowsN = eqs.length;
    const M0 = eqs.map(e => [...e.a, e.b]);
    // моделируем решение, запоминая шаги
    const snaps = [M0.map(r => r.slice())], ops = [];
    let M = M0.map(r => r.slice()), r = 0; const piv = [];
    for (let c = 0; c < k && r < rowsN; c++) {
      let p = r; while (p < rowsN && M[p][c].isZero()) p++;
      if (p === rowsN) continue;
      if (p !== r) { [M[r], M[p]] = [M[p], M[r]]; ops.push({ t: 'swap', r, p, c }); snaps.push(M.map(x => x.slice())); }
      const pv = M[r][c];
      if (!pv.eq(new Q(1n))) { M[r] = M[r].map(v => v.div(pv)); ops.push({ t: 'div', r, c, pv }); snaps.push(M.map(x => x.slice())); }
      for (let i = 0; i < rowsN; i++) if (i !== r && !M[i][c].isZero()) { const f = M[i][c]; M[i] = M[i].map((v, j) => v.sub(f.mul(M[r][j]))); ops.push({ t: 'sub', r, i, c, f }); snaps.push(M.map(x => x.slice())); }
      piv.push(c); r++;
    }
    const incons = M.slice(r).some(row => !row[k].isZero()), free = [...Array(k).keys()].filter(c => !piv.includes(c));
    const tbl = (S, tag) => `<table class="sx dmsx gm"><thead><tr><th></th>${names.map(n => `<th>${n}</th>`).join('')}<th>b</th></tr></thead><tbody>${S.map((row, i) => `<tr data-r="${i}"><td class="bas">(${i + 1})</td>${row.map((v, j) => `<td data-r="${i}" data-c="${j}" tabindex="0" data-origin="В уравнении ${i+1} системы ${j===names.length?'правая часть':'коэффициент при неизвестной № '+(j+1)} равен ${v.toText()}."><span class="cv">${fq(v)}</span></td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = `<div class="tblwrap">${tbl(M0)}</div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const T = A.q('table.gm'), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      const cellAt = (i, j) => T.querySelector(`td[data-r="${i}"][data-c="${j}"]`);
      const rowCells = i => [...T.querySelectorAll(`td[data-r="${i}"]`)];
      const setRow = async (i,S,previous,operation)=>{
        for(let j=0;j<=k;j++){
          const old=previous[i][j],after=S[i][j],col=j===k?'b':plain(names[j]);
          let calculation;
          if(operation.t==='swap'){
            const from=i===operation.p?operation.r:operation.p;
            calculation=`из строки ${from+1} переносим ${fq(previous[from][j])}`;
          }else if(operation.t==='div') calculation=`${fq(old)} ÷ ${par(operation.pv)}`;
          else calculation=`${fq(old)} − ${par(operation.f)} × ${par(previous[operation.r][j])}`;
          A.cap(`Строка ${i+1}, столбец ${col}: ${calculation}.`);
          A.set(fm,`<span class="fmh">${calculation} = <b class="calc-result">${fq(after)}</b></span>`);
          await A.put(A.q('.pvfm .calc-result'),cellAt(i,j).querySelector('.cv'),fq(after));
        }
      };
      await A.wait(250);
      A.cap('Записываем систему в виде таблицы: строки — уравнения, столбцы — неизвестные');
      A.cls(rowCells(0), 'k-sel'); await A.wait(200); A.cls(rowCells(0), 'k-sel', false);
      let prev = snaps[0];
      for (let s = 0; s < ops.length; s++) {
        const o = ops[s], S = snaps[s + 1];
        if (o.t === 'swap') {
          A.cap(`В столбце ${plain(names[o.c])} на месте ведущего 0 — меняем строки (${o.r + 1}) и (${o.p + 1})`);
          A.cls([...rowCells(o.r), ...rowCells(o.p)], 'k-act'); await setRow(o.r,S,prev,o); await setRow(o.p,S,prev,o); A.cls([...rowCells(o.r), ...rowCells(o.p)], 'k-act', false);
        } else if (o.t === 'div') {
          A.cap(`Делим строку (${o.r + 1}) на ведущий элемент ${plain(fq(o.pv))}`);
          A.cls(cellAt(o.r, o.c), 'k-pe'); A.cls(rowCells(o.r), 'k-sel');
          await setRow(o.r,S,prev,o); A.cls(cellAt(o.r, o.c), 'k-pe', false); A.cls(rowCells(o.r), 'k-sel', false); A.cls(rowCells(o.r), 'k-ok');
        } else {
          A.cap(`Из строки (${o.i + 1}) вычитаем ${plain(fq(o.f))} × строку (${o.r + 1}) — обнуляем столбец ${plain(names[o.c])}`);
          A.cls(rowCells(o.r), 'k-sel'); A.cls(rowCells(o.i), 'k-act'); A.cls(cellAt(o.i, o.c), 'k-del');
          A.set(fm, `<span class="fmh">строка (${o.i + 1}) − ${par(o.f)} × строка (${o.r + 1})</span>`);
          await setRow(o.i,S,prev,o);
          A.cls(rowCells(o.r), 'k-sel', false); A.cls(rowCells(o.i), 'k-act', false); A.cls(cellAt(o.i, o.c), 'k-del', false);
        }
        prev = S;
      }
      A.set(fm, '');
      if (incons) { A.cap('Получилось 0 = число ≠ 0: система несовместна'); sum.innerHTML = '<b class="bad">система несовместна</b>'; await A.show(sum); return; }
      A.cap('Читаем решение: в каждом ведущем столбце единица — неизвестная равна b своей строки');
      const parts = piv.map((c, i) => `${names[c]} = <b>${fq(M[i][k])}</b>`);
      sum.innerHTML = parts.join(', ') + (free.length ? `; ${free.map(c => names[c]).join(', ')} — свободные` : '');
      piv.forEach((c, i) => A.cls(cellAt(i, k), 'k-ok'));
      await A.show(sum);
    };
    return demo(title || 'решаем систему методом Гаусса', html, script);
  }

  // --- сведение к двум переменным (сборник, 2.2) ---
  function demoReduce(pr, Rd, P2) {
    const lines = pr.rows.map((r, i) => `<div class="drow rdr" data-src="e${i}"><span class="kbd">(${i + 1})</span> ${rowLine(r)}</div>`).join('');
    const exprs = Rd.basic.map((B, t) => `<div class="drow rdx dh" data-b="${t}">${xv(B.j + 1)} = ${fq(B.b)}${[0, 1].map(tt => B.a[tt].isZero() ? '' : (B.a[tt].s > 0 ? ' − ' : ' + ') + (B.a[tt].abs().eq(new Q(1n)) ? '' : fq(B.a[tt].abs())) + xv(tt + 1)).join('')} <span class="kbd">(из уравнения ${B.from + 1})</span></div>`).join('');
    const news = P2.rows.map((r, k) => { const o = Rd.origin[k] || {}; return `<div class="drow rdn dh" data-k="${k}">${rowLine(r)} <span class="kbd">${o.kind === 'basic' ? `из ${plain(xv(o.j + 1))} ≥ 0` : o.kind === 'eq' ? `из уравнения ${o.i + 1}` : o.kind === 'contra' ? 'условие вместо числового противоречия' : `из ограничения ${o.i + 1}`}</span></div>`; }).join('');
    const html = `<div class="pvwrap"><div><div class="dmh">условие</div>${lines}</div><div><div class="dmh">выражаем лишние переменные</div>${exprs}<div class="dmh" style="margin-top:6px">неравенства на плоскости (x₁; x₂)</div>${news}<div class="drow rdo dh">${objLine(P2)}</div></div></div>`;
    const script = async A => {
      await A.wait(250);
      for (let t = 0; t < Rd.basic.length; t++) {
        const B = Rd.basic[t], src = A.q(`.rdr[data-src="e${B.from}"]`);
        A.cap(`Из уравнения (${B.from + 1}) выражаем ${plain(xv(B.j + 1))} через ${plain(xv(1))} и ${plain(xv(2))}`);
        A.cls(src, 'on'); await A.pop(A.q(`.rdx[data-b="${t}"]`)); A.cls(src, 'on', false); A.cls(src, 'done');
      }
      for (let k = 0; k < P2.rows.length; k++) {
        const o = Rd.origin[k] || {}, srcs = o.kind === 'basic' ? A.qa('.rdx') : (o.i != null ? [A.q(`.rdr[data-src="e${o.i}"]`)] : []);
        A.cap(o.kind === 'basic' ? `Условие ${plain(xv(o.j + 1))} ≥ 0 с подстановкой даёт неравенство на плоскости` : `Подставляем выражения в ограничение ${o.i != null ? o.i + 1 : ''} — остаются только ${plain(xv(1))}, ${plain(xv(2))}`);
        A.cls(srcs.filter(Boolean), 'on'); await A.pop(A.q(`.rdn[data-k="${k}"]`)); A.cls(srcs.filter(Boolean), 'on', false);
      }
      A.cap('Цель тоже выражается через x₁ и x₂ — получена задача с двумя переменными');
      await A.pop(A.q('.rdo'));
    };
    return demo('сведение к двум переменным: подстановка выражений', html, script);
  }
  const more = h => `<details class="dmmore"><summary>Подробно (текст и таблицы)</summary>${h}</details>`;
  // слагаемые Σ aⱼ·lab(j) по отдельности: [{ j, h }]; lab(j, единичный_коэффициент)
  const termIn = (a, lab) => { let first = true; const r = []; a.forEach((v, j) => { if (v.isZero()) return; const one = v.abs().eq(new Q(1n)); r.push({ j, h: (first ? (v.s < 0 ? '−' : '') : (v.s < 0 ? '&nbsp;−&nbsp;' : '&nbsp;+&nbsp;')) + (one ? '' : fq(v.abs())) + lab(j, one) }); first = false; }); return r; };
  const TM = (a, lab, cls = '') => { const r = termIn(a, lab); return r.length ? r.map(t => `<span class="tm ${cls}" data-j="${t.j}">${t.h}</span>`).join('') : `<span class="tm ${cls}">0</span>`; };
  const ylab = i => yv(i + 1), xlab = j => xv(j + 1);

  // Этап «приведение»: неравенства «≥» умножаются на −1 — коэффициенты и знак переворачиваются
  function demoNorm(pr, norm) {
    const html = `<div>${pr.rows.map((r, i) => `<div class="drow" data-i="${i}"><span class="ch kbd">(${i + 1})</span> <span class="lhs">${TM(r.a, xlab)}</span> <span class="ch rs">${sg(r.s)}</span> <span class="ch rb">${fq(r.b)}</span>${norm[i].flipped ? '<span class="ch bx dh">× (−1)</span>' : '<span class="ch okc dh">✓ уже «≤»</span>'}</div>`).join('')}</div>`;
    return demo('Как обратить знак неравенства?', html, async A => {
      await A.wait(400);
      for (let i = 0; i < norm.length; i++) {
        const row = A.q(`.drow[data-i="${i}"]`), r = norm[i];
        if (!r.flipped) { await A.pop(row.querySelector('.okc')); continue; }
        A.cls(row, 'on'); A.cap(`(${i + 1}): умножаем на −1`);
        await A.pop(row.querySelector('.bx'));
        const nt = termIn(r.a, xlab);
        await A.seq([...row.querySelectorAll('.tm')], 110, (el, k) => A.swap(el, nt[k].h));
        await A.swap(row.querySelector('.rs'), '≤', 520);
        await A.swap(row.querySelector('.rb'), fq(r.b));
        await A.hide(row.querySelector('.bx'));
        A.cls(row, 'on', false); A.cls(row, 'done');
        await A.wait(250);
      }
      A.cap(norm.some(r => r.flipped) ? 'все ограничения имеют вид «≤»' : 'преобразования не нужны');
    });
  }

  // Этап «построение»: столбцы матрицы перелетают в строки двойственной задачи, b — в цель g
  function demoBuild(P, D) {
    const n = P.c.length, m = P.rows.length, yS = D.signs || [...Array(m)].map(() => '>=');
    let t = `<table class="sx dmt"><tr><th></th>${[...Array(n)].map((_, j) => `<th data-cj="${j}">${xv(j + 1)}</th>`).join('')}<th></th><th>b</th></tr>`;
    P.rows.forEach((r, i) => { t += `<tr><td class="bas">${yv(i + 1)}</td>${r.a.map((v, j) => `<td data-cj="${j}" tabindex="0" data-origin="Коэффициент при x${j+1} из условия ${i+1} прямой задачи. Во второй записи он умножается на y${i+1} в условии ${j+1}."><span class="ch" data-i="${i}" data-j="${j}">${fq(v)}</span></td>`).join('')}<td>${sg(r.s)}</td><td class="bcol" data-bb="1" tabindex="0" data-origin="Правая часть строки ${i+1} в исходной задаче. Станет коэффициентом при y${i+1} в двойственной цели."><span class="ch" data-b="${i}">${fq(r.b)}</span></td></tr>`; });
    t += `<tr class="zrow"><td class="bas"><i>c</i></td>${P.c.map((v, j) => `<td data-cj="${j}" tabindex="0" data-origin="Коэффициент цели при x${j+1}. Станет правой частью двойственного условия ${j+1}."><span class="ch" data-c="${j}">${fq(v)}</span></td>`).join('')}<td colspan="2">→ ${P.sense}</td></tr></table>`;
    const gl = `<div class="dl" data-g="1"><i>g</i> = ${TM(D.c, ylab, 'dh')} → <span class="ch gs">${P.sense}</span></div>`;
    const rows = D.rows.map((r, j) => `<div class="dl" data-d="${j}">${TM(r.a, ylab, 'dh')} <span class="ch dh rs">${sg(r.s)}</span> <span class="ch dh" data-r="${j}">${fq(r.b)}</span> <span class="kbd">(Д${j + 1})</span></div>`).join('');
    const sl = `<div class="dl">${yS.map((s, i) => `<span class="ch dh ysg">${signTxt(s, yv(i + 1))}${i < m - 1 ? ',' : ''}</span>`).join(' ')}</div>`;
    const html = `<div class="dmcols"><div><div class="dmh">было: прямая задача</div><div class="tblwrap" style="overflow:visible">${t}</div></div><div><div class="dmh">стало: двойственная</div><div class="dual">${gl}${rows}${sl}</div></div></div>`;
    return demo('Как составить двойственную задачу?', html, async A => {
      await A.wait(500);
      for (let j = 0; j < n; j++) {
        const col = A.qa(`.dmt [data-cj="${j}"]`), drow = A.q(`[data-d="${j}"]`);
        A.cls(col, 'on'); A.cls(drow, 'on'); A.cap(`столбец ${xv(j + 1)} → ограничение Д${j + 1}`);
        await A.seq([...Array(m).keys()], 110, i => {
          const from = A.q(`.dmt [data-i="${i}"][data-j="${j}"]`), to = drow.querySelector(`.tm[data-j="${i}"]`);
          return to ? A.fly(from, to).then(() => A.pop(to)) : A.pulse(from);
        });
        await A.fly(A.q(`.dmt [data-c="${j}"]`), drow.querySelector(`[data-r="${j}"]`));
        await Promise.all([A.pop(drow.querySelector(`[data-r="${j}"]`)), A.pop(drow.querySelector('.rs'))]);
        await A.wait(300);
        A.cls(col, 'on', false); A.cls(drow, 'on', false);
      }
      const bc = A.qa('.dmt [data-bb]'), gl2 = A.q('[data-g]');
      A.cls(bc, 'onb'); A.cls(gl2, 'on'); A.cap('столбец b → коэффициенты цели g');
      await A.seq([...Array(m).keys()], 110, i => { const to = gl2.querySelector(`.tm[data-j="${i}"]`); return to ? A.fly(A.q(`.dmt [data-b="${i}"]`), to).then(() => A.pop(to)) : Promise.resolve(); });
      await A.swap(gl2.querySelector('.gs'), D.sense, 600);
      A.cls(bc, 'onb', false); A.cls(gl2, 'on', false);
      A.cap('каждому ограничению — своя переменная yᵢ');
      await A.seq(A.qa('.ysg'), 120, el => A.pop(el));
      A.cap('двойственная задача построена');
    });
  }

  // Значения «?» → числа (решение задачи)
  function demoReveal(title, lines, capText) {
    // lines: [{ name, lab, vals: [Q], fname, f }]
    const html = lines.map((L, k) => `<div class="dmbig" data-l="${k}"><span class="dmres">${L.name}* = (${L.vals.map((_, j) => `<span class="ch v" data-j="${j}">${L.lab(j)} = ?</span>`).join('; ')}), &nbsp;<i>${L.fname}</i>* = <span class="ch fv">?</span></span></div>`).join('');
    return demo(title, html, async A => {
      await A.wait(400);
      for (let k = 0; k < lines.length; k++) {
        const L = lines[k], box = A.q(`[data-l="${k}"]`);
        await A.seq([...box.querySelectorAll('.v')], 220, (el, j) => A.swap(el, `<b>${fq(L.vals[j])}</b>`, 500).then(() => A.cls(el, L.vals[j].isZero() ? 'zero' : 'pos')));
        await A.swap(box.querySelector('.fv'), `<b>${fq(L.f)}</b>`, 500);
        A.cls(box.querySelector('.dmres'), 'fin'); await A.pulse(box.querySelector('.dmres'));
      }
      A.cap(capText);
    });
  }

  // Этап УДН: x* > 0 делает ограничение Д равенством, запас > 0 обнуляет y
  function demoCS(pr, res) {
    const P = res.primal, D = res.D, cs = res.cs;
    const A1 = pr.c.map((_, j) => `<div class="dmpair" data-pj="${j}"><span class="ch xc">${xv(j + 1)} = ${fq(P.x[j])}</span><span class="ch arr dh">⟹</span><span class="drow">${TM(D.rows[j].a, ylab)} <span class="ch rs">≥</span> ${fq(D.rows[j].b)}</span></div>`).join('');
    const A2 = res.norm.map((r, i) => `<div class="dmpair" data-pi="${i}"><span class="ch sc">запас (${i + 1}) = ${fq(cs.slack[i])}</span><span class="ch arr dh">⟹</span><span class="ch yc">${yv(i + 1)} ≥ 0</span></div>`).join('');
    const html = `<div class="dmcols"><div><div class="dmh">x* → ограничения Д</div>${A1}</div><div><div class="dmh">запас ресурса → y</div>${A2}</div></div>`;
    const arrow = el => A0 => A0.anim(el, [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)' }], { d: 380 });
    return demo('Какие ограничения выполнены точно на границе?', html, async A => {
      await A.wait(400);
      for (let j = 0; j < pr.n; j++) {
        const p = A.q(`[data-pj="${j}"]`), pos = cs.eqJ[j];
        A.cls(p, 'on'); A.cap(pos ? `${xv(j + 1)} > 0 ⇒ Д${j + 1} выполняется как равенство` : `${xv(j + 1)} = 0 ⇒ про Д${j + 1} ничего не следует`);
        await A.pulse(p.querySelector('.xc')); A.cls(p.querySelector('.xc'), pos ? 'pos' : 'dim');
        await arrow(p.querySelector('.arr'))(A);
        if (pos) { await A.swap(p.querySelector('.rs'), '<b>=</b>', 560); A.cls(p.querySelector('.drow'), 'on'); }
        else A.cls(p.querySelector('.drow'), 'dim');
        await A.wait(350); A.cls(p, 'on', false);
      }
      for (let i = 0; i < res.norm.length; i++) {
        const p = A.q(`[data-pi="${i}"]`), z = cs.zeroY[i];
        A.cls(p, 'on'); A.cap(z ? `ресурс (${i + 1}) не израсходован ⇒ ${yv(i + 1)} = 0` : `ресурс (${i + 1}) израсходован полностью ⇒ ${yv(i + 1)} пока неизвестна`);
        await A.pulse(p.querySelector('.sc')); A.cls(p.querySelector('.sc'), z ? 'pos' : 'dim');
        await arrow(p.querySelector('.arr'))(A);
        if (z) { await A.swap(p.querySelector('.yc'), `${yv(i + 1)} = 0`, 560); A.cls(p.querySelector('.yc'), 'zero'); }
        else A.cls(p.querySelector('.yc'), 'dim');
        await A.wait(350); A.cls(p, 'on', false);
      }
      A.cap('осталась система уравнений для ненулевых y');
    });
  }

  // Этап «система»: нулевые y вычёркиваются, метод Гаусса даёт y*
  function demoSys(res) {
    const D = res.D, cs = res.cs, J = D.rows.map((_, j) => j).filter(j => cs.eqJ[j]);
    const eqs = J.map((j, k) => `<div class="drow" data-e="${k}"><span class="lhs">${TM(D.rows[j].a, ylab)}</span> = ${fq(D.rows[j].b)}</div>`).join('');
    const html = `<div>${eqs || '<div class="kbd">уравнений из УДН нет</div>'}<div class="dmdown dh">↓ метод Гаусса${res.unique ? '' : ' + симплекс-метод на множестве УДН'}</div><div class="dmbig"><span class="dmres dh">y* = (${res.y.map((_, i) => `<span class="ch v" data-i="${i}">${yv(i + 1)}</span>`).join('; ')})</span></div></div>`;
    return demo('Как найти неизвестные оценки ресурсов?', html, async A => {
      await A.wait(400);
      const zero = A.qa('.lhs .tm').filter(el => cs.zeroY[+el.dataset.j]);
      if (zero.length) {
        A.cap(`${cs.zeroY.map((z, i) => z ? yv(i + 1) : null).filter(Boolean).join(', ')} = 0 — убираем из уравнений`);
        A.cls(zero, 'strike'); await A.wait(600);
        await A.seq(zero, 60, el => { const w = el.offsetWidth; A.cls(el, 'cut'); return A.anim(el, [{ width: w + 'px', opacity: 1 }, { width: '0px', opacity: 0, padding: 0 }], { d: 500 }); });
        await A.seq(A.qa('[data-e]'), 100, (el, k) => A.swap(el.querySelector('.lhs'), TM(cs.eqs[k].a, kk => yv(cs.U[kk] + 1))));
      }
      await A.pop(A.q('.dmdown'));
      A.cap('решаем систему'); await A.pop(A.q('.dmres'));
      await A.seq(A.qa('.v'), 200, (el, i) => A.swap(el, `<b>${fq(res.y[i])}</b>`, 500).then(() => A.cls(el, cs.zeroY[i] ? 'zero' : 'pos')));
      A.cls(A.q('.dmres'), 'fin'); await A.pulse(A.q('.dmres'));
      A.cap(res.unique ? 'y* найден однозначно' : 'решение системы неединственно — взята оптимальная вершина');
    });
  }

  // Две полосы растут одновременно и совпадают: оптимумы равны
  const bars = (a, b) => `<div class="dmbars"><div class="dmbar"><b>${a[0]}</b><i data-w="1"></i><span>${fq(a[1])}</span></div><div class="dmbar f"><b>${b[0]}</b><i data-w="2"></i><span>${fq(b[1])}</span></div><div class="ch okc dh eqp">${a[0]} = ${b[0]} ✓</div></div>`;
  async function growBars(A, a, b) {
    const va = Math.abs(a.toNumber()), vb = Math.abs(b.toNumber()), mx = Math.max(va, vb) || 1;
    await Promise.all([A.anim(A.q('[data-w="1"]'), [{ width: '0%' }, { width: (va / mx * 100 || 100) + '%' }], { d: 1100 }), A.anim(A.q('[data-w="2"]'), [{ width: '0%' }, { width: (vb / mx * 100 || 100) + '%' }], { d: 1100 })]);
    await A.pop(A.q('.eqp'));
  }
  // Этап «проверка»: подставляем y* в ограничения Д, затем сравниваем g* и f*
  function demoCheck(res) {
    const D = res.D, y = res.y;
    const rows = D.rows.map((r, j) => `<div class="drow" data-j="${j}"><span class="lhs">${TM(r.a, ylab)}</span> <span class="ch">≥</span> ${fq(r.b)} <span class="ch okc dh">✓</span></div>`).join('');
    const ysg = `<div class="drow" data-ys="1">${y.map((v, i) => `<span class="ch ysc" data-i="${i}">${yv(i + 1)} = ${fq(v)} ${v.s >= 0 ? '≥ 0' : '&lt; 0'}<span class="okc dh"> ${v.s >= 0 ? '✓' : '✕'}</span></span>`).join('; ')}</div>`;
    const html = `<div>${ysg}${rows}${bars(['g*', res.g], ['f*', res.primal.f])}</div>`;
    return demo('Как проверить, что оба плана оптимальны?', html, async A => {
      await A.wait(400); A.cap('сначала проверяем знаки: все yᵢ ≥ 0');
      await A.seq(A.qa('.ysc'), 150, el => A.pop(el.querySelector('.okc')));
      A.cap(`подставляем y* = ${vec(y)}`);
      for (let j = 0; j < D.rows.length; j++) {
        const row = A.q(`.drow[data-j="${j}"]`), r = D.rows[j], st = termIn(r.a, (i, one) => (one ? '' : '·') + par(y[i]));
        A.cls(row, 'on');
        await A.seq([...row.querySelectorAll('.tm')], 100, (el, k) => A.swap(el, st[k] ? st[k].h : el.innerHTML));
        await A.wait(350);
        const lhs = r.a.reduce((s, v, i) => s.add(v.mul(y[i])), Zq());
        await A.swap(row.querySelector('.lhs'), `<b>${fq(lhs)}</b>`, 500);
        await A.pop(row.querySelector('.okc'));
        A.cls(row, 'on', false); A.cls(row, 'done');
      }
      A.cap('сравниваем оптимальные значения');
      await growBars(A, res.g, res.primal.f);
      A.cap('y* допустим, g* = f* — решение верно');
    });
  }

  /* =================== Этапы решения: номер, цель, методы =================== */
  // st(id, заголовок, цель, методы, тело) — раздел «Этап k»; plan() — схема этапов: номер, короткое название, результат.
  // Цель и методы подробно — в начале каждого раздела, в схеме только короткие подписи.
  const STAGE_SHORT = {
    norm: ['Приведение', '«≥» × (−1)'], build: ['Построение', 'двойственная задача'], primal: ['Прямая задача', 'x*, f*'],
    cs: ['УДН', 'равенства и нули y'], sys: ['Система', 'y* методом Гаусса'], check: ['Проверка', 'допустимость, оптимумы равны'],
    prep: ['Знаки', 'условия на x и y'], solve: ['Решение', 'x* и y*']
  };
  function stager() {
    const list = [];
    const st = (id, title, goal, methods, body) => {
      list.push({ id, title, goal, methods });
      return sec(id, `Этап ${list.length}. ${title}`, `<div class="stage"><div><span class="stk">Цель</span>${goal}</div><div><span class="stk">Методы</span>${methods}</div></div>` + body);
    };
    const plan = () => sec('plan', 'Этапы решения', `<div class="stflow">${list.map((s, k) => { const [t, r] = STAGE_SHORT[s.id] || [s.title, '']; return `<a class="stc" href="#${s.id}" data-jump="1" title="${s.title}"><span class="stn">${k + 1}</span><span class="stt">${t}</span><span class="str">${r}</span></a>`; }).join('')}</div>`);
    return { st, plan };
  }
  /* =================== Задание 4: двойственная задача =================== */
  function dual(pr, meta, baseKey, onOpenBase) {
    const res = ALG.dual(pr), S = [], n = pr.n, m = pr.rows.length, D = res.D;
    const { st, plan } = stager();
    S.push(sec('cond', 'Прямая задача', system(pr) + `<p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'} (структура задания ${baseKey === 'graph' ? '1' : '2'}).</p>`));
    S.push(summaryCard({ main: res.status === 'optimal' ? `<i>y</i>* = ${vec(res.y)}, &nbsp;<i>g</i>* = ${fq(res.g)}${approx(res.g)}` : `Прямая задача: ${statusText(res.primal.status)}`,
      facts: res.status === 'optimal' ? [`прямая: f* = ${fq(res.primal.f)}`, res.unique ? 'y* найден из УДН однозначно' : 'УДН не определяют y однозначно'] : [],
      badges: res.status === 'optimal' ? [res.g.eq(res.primal.f) ? '<span class="badge ok">✓ g* = f*</span>' : '<span class="badge bad">✗ g* ≠ f*</span>', res.dcheck.every(c => c.ok) && res.y.every(v => v.s >= 0) ? '<span class="badge ok">✓ y допустим</span>' : '<span class="badge bad">✗ y недопустим</span>'] : [],
      links: [['plan', 'Этапы'], ['build', 'Построение'], ['cs', 'УДН'], ['check', 'Проверка']] }));
    // сводная таблица этапов вставляется сюда, когда известны все этапы
    const planAt = S.length;
    const done = () => { S.splice(planAt, 0, plan()); return S; };
    // приведение к «≤» — только если в прямой задаче есть «≥»
    const flips = res.norm.filter(r => r.flipped);
    if (flips.length) S.push(st('norm', 'Приведение прямой задачи к виду «≤»',
      'привести все ограничения к виду Σ aᵢⱼxⱼ ≤ bᵢ — так задана прямая задача в правилах построения двойственной.',
      'неравенство «≥» умножаем на −1.',
      demoNorm(pr, res.norm) + more(`<p>${flips.map(r => `Ограничение (${r.i + 1}) умножаем на −1: <span class="m">${rowLine(pr.rows[r.i])} → <b>${rowLine(r)}</b></span>`).join('<br>')}</p>`)));
    // построение
    const dl = `<div class="dual"><div class="dl"><i>g</i> = ${lin(D.c, i => yv(i + 1))} → min</div>${D.rows.map((r, j) => `<div class="dl">${lin(r.a, i => yv(i + 1))} ≥ ${fq(r.b)} <span class="kbd">(Д${j + 1})</span></div>`).join('')}<div class="dl">${[...Array(m)].map((_, i) => yv(i + 1)).join(', ')} ≥ 0</div></div>`;
    S.push(st('build', 'Построение двойственной задачи',
      'записать задачу, двойственную к прямой: её переменные, целевую функцию и ограничения.',
      'правила построения из методички: m переменных yᵢ, цель Σ bᵢyᵢ → min; ограничению Σ aᵢⱼxⱼ ≤ bᵢ соответствует yᵢ ≥ 0; условию xⱼ ≥ 0 — ограничение Σ aᵢⱼyᵢ ≥ cⱼ (столбец коэффициентов при xⱼ).',
      demoDualMap({ sense: 'max', rows: res.norm }, { sense: 'min', rows: D.rows }) + demoBuild({ rows: res.norm, c: pr.c, sense: 'max' }, D) + more(dl)));
    // решение прямой
    const P = res.primal, bid = 'bd' + Math.random().toString(36).slice(2, 8);
    let ph = P.status === 'optimal' ? demoReveal(`решение задания ${baseKey === 'graph' ? '1' : '2'}`, [{ name: '<i>x</i>', lab: xlab, vals: P.x, fname: 'f', f: P.f }], 'оптимальный план прямой задачи известен') : `<div class="note bad">Прямая задача: ${statusText(P.status)}. По теореме двойственности у двойственной задачи тогда тоже нет оптимального решения — УДН применять не к чему.</div>`;
    ph += `<p><button class="btn" id="${bid}o">Открыть решение прямой задачи (${baseKey === 'graph' ? 'задание 1, графический метод' : 'задание 2, симплекс-метод'})</button></p>`;
    R.hooks.push(() => { const b = document.getElementById(bid + 'o'); if (b) b.onclick = onOpenBase; });
    S.push(st('primal', 'Решение прямой задачи',
      `взять оптимальный план x* и значение f* из задания ${baseKey === 'graph' ? '1' : '2'} — они нужны для УДН и для проверки g* = f*.`,
      baseKey === 'graph' ? 'графический метод (задание 1).' : 'симплекс-метод (задание 2).',
      ph));
    if (P.status !== 'optimal') return done();
    // УДН
    const cs = res.cs;
    let cards = '<div class="pairs">';
    pr.c.forEach((_, j) => { const pos = cs.eqJ[j]; cards += `<div class="pair ${pos ? 'eq' : 'none'}"><div class="ph">${xv(j + 1)} ≥ 0 ↔ Д${j + 1}</div><div class="ps">${xv(j + 1)} = ${fq(P.x[j])}${pos ? ' &gt; 0' : ''}</div><div class="po">⇒ ${pos ? `Д${j + 1} — <b>равенство</b>: ${lin(D.rows[j].a, i => yv(i + 1))} = ${fq(D.rows[j].b)}` : 'уже равенство → ничего не следует'}</div></div>`; });
    res.norm.forEach((r, i) => { const strict = cs.zeroY[i]; const lhs = r.b.sub(cs.slack[i]); cards += `<div class="pair ${strict ? 'zero' : 'none'}"><div class="ph">(${i + 1}) ↔ ${yv(i + 1)} ≥ 0</div><div class="ps">${fq(lhs)} ${strict ? '&lt;' : '='} ${fq(r.b)}${strict ? ` (запас ${fq(cs.slack[i])})` : ''}</div><div class="po">⇒ ${strict ? `<b>${yv(i + 1)} = 0</b>` : 'уже равенство → ничего не следует'}</div></div>`; });
    cards += '</div>';
    S.push(st('cs', 'Условия дополняющей нежёсткости (УДН)',
      'по известному x* определить, какие ограничения двойственной задачи выполняются как равенства и какие yᵢ равны нулю.',
      'УДН: в каждой паре сопряжённых ограничений хотя бы одно выполняется как равенство — xⱼ* > 0 ⇒ Дj равенство; ограничение (i) выполнено строго ⇒ yᵢ = 0.',
      demoCSsub(res.norm, P.x) + demoCS(pr, res) + more(`<p>Подставляем x* = ${vec(P.x)} и проверяем все ${n + m} пар:</p>` + cards)));
    // система
    const sol = cs.sol, U = cs.U;
    let sh = `<p>Обнуляются: ${cs.zeroY.map((z, i) => z ? yv(i + 1) : null).filter(Boolean).join(', ') || 'ни одна переменная'}. Неизвестные: ${U.map(i => yv(i + 1)).join(', ') || '—'}.</p>`;
    sh += cs.eqs.length ? `<div class="sys">${cs.eqs.map(e => `${lin(e.a, k => yv(U[k] + 1))} = ${fq(e.b)}`).join('<br>')}</div>` : '<p>Уравнений из УДН нет.</p>';
    if (sol.status === 'inconsistent') sh += '<div class="note bad">Система несовместна — точка x* не удовлетворяет условиям оптимальности.</div>';
    else if (!sol.free.length) {
      sh += `<p>Решение системы (метод Гаусса): ${U.map((i, k) => `${yv(i + 1)} = <b>${fq(sol.x0[k])}</b>${approx(sol.x0[k])}`).join(', ')}.</p><p class="answer"><i>y</i>* = ${vec(res.y)}</p>`;
    } else {
      const fr = sol.free.map(k => yv(U[k] + 1));
      sh += `<div class="note warn"><b>Уравнений меньше, чем неизвестных</b> (ранг ${sol.rank} &lt; ${U.length}): УДН сами по себе не определяют y однозначно. Свободные неизвестные: ${fr.join(', ')}.</div>`;
      if (sol.piv.length) sh += `<p>Выражаем через свободные: ${sol.piv.map((c, r) => `${yv(U[c] + 1)} = ${fq(sol.M[r][U.length])}${sol.free.map(fk => { const v2 = sol.M[r][fk].neg(); return v2.isZero() ? '' : (v2.s < 0 ? ' − ' : ' + ') + fq(v2.abs()) + '·' + yv(U[fk] + 1); }).join('')}`).join('; ')}.</p>`;
      sh += `<p>Добавляем оставшиеся ограничения двойственной как <b>неравенства</b> и y ≥ 0 и ищем минимум g на этом множестве.</p>`;
      if (res.family) {
        const F = res.family, t = yv(U[F.ft] + 1);
        sh += `<p>Одна свободная неизвестная ${t}. Допустимые значения: ${F.lo ? `${t} ≥ ${fq(F.lo)}` : ''}${F.lo && F.hi ? ', ' : ''}${F.hi ? `${t} ≤ ${fq(F.hi)}` : ''}. Значение g = ${fq(F.g0)}${F.g1.isZero() ? '' : (F.g1.s < 0 ? ' − ' : ' + ') + fq(F.g1.abs()) + '·' + t}.</p>`;
        if (F.constG) sh += `<div class="note"><b>g не зависит от ${t}</b>: оптимальных решений бесконечно много — любое ${F.lo ? `${t} ≥ ${fq(F.lo)}` : ''}${F.lo && F.hi ? ' и ' : ''}${F.hi ? `${t} ≤ ${fq(F.hi)}` : ''}. В ответ берём вершину этого множества.</div>`;
      }
      sh += `<p class="answer"><i>y</i>* = ${vec(res.y)}</p>`;
    }
    S.push(st('sys', 'Составление и решение системы уравнений',
      'найти оптимальный план двойственной задачи y* из равенств, выписанных по УДН.',
      `система линейных уравнений относительно y₁…yₘ (yᵢ = 0 подставлены); метод Гаусса${sol.free && sol.free.length ? '; решение системы не единственно — минимум g ищется на множестве, заданном УДН и оставшимися неравенствами' : ''}.`,
      (res.y ? demoSys(res) : '') + (res.y && cs.eqs.length ? demoGauss(cs.eqs, cs.U.map(i => yv(i + 1)), 'решаем систему уравнений по шагам') : '') + more(sh)));
    // проверка
    let kh = '';
    if (res.status === 'optimal') {
      kh += `<p><b>1. Допустимость.</b> ${res.y.map((v2, i) => `${yv(i + 1)} = ${fq(v2)} ${v2.s >= 0 ? '≥ 0 ✓' : '&lt; 0 ✗'}`).join('; ')}</p>`;
      kh += checkTable(D, res.y, yv).replace(/<td>\((\d+)\)<\/td>/g, '<td>Д$1</td>');
      kh += `<p><b>2. Равенство оптимумов.</b></p>` + valueLine(D, res.y, 'g') + `<div class="note ${res.g.eq(P.f) ? 'ok' : 'bad'}">${res.g.eq(P.f) ? '✓' : '✗'} <b>g* = ${fq(res.g)}, f* = ${fq(P.f)}</b> — ${res.g.eq(P.f) ? 'оптимальные значения совпадают' : 'не совпадают'}.</div>`;
    } else kh = `<div class="note bad">${res.status}</div>`;
    S.push(st('check', 'Проверка и итог',
      'убедиться, что y* — допустимое решение двойственной задачи и что g* совпадает с оптимумом прямой задачи.',
      'подстановка y* в ограничения Д и условия yᵢ ≥ 0; сравнение g* = Σ bᵢyᵢ* с f*.',
      (res.status === 'optimal' ? demoCheck(res) : '') + more(kh) + (res.status === 'optimal' ? `<p class="answer"><i>y</i>* = ${vec(res.y)}, &nbsp;<i>g</i>* = ${fq(res.g)}${approx(res.g)}</p>` : '')));
    return done();
  }

  /* =================== Сборник ПЗ: сравнение с напечатанным ответом =================== */
  // Ответы сборника — справочные: итог всегда по расчёту, совпадение лишь отмечается.
  function verdictZ(pr, res, A) {
    if (!A) return { kind: 'na' };
    const stOk = s => s === 'infeasible' || s === 'unbounded';
    if (A.none) return { kind: stOk(res.status) ? 'ok' : 'diff' };
    if (A.unbounded) return { kind: res.status === 'unbounded' ? 'ok' : 'diff' };
    const xA = A.x.map(Q.parse);
    if (xA.length !== pr.n) return { kind: 'diff', xA };
    const fA = ALGZ.fv(pr, xA), chk = ALG.check(pr, xA), feas = chk.every(c => c.ok) && xA.every(v => v.s >= 0);
    const fOk = !A.f || near(fA, A.f);
    if (res.status !== 'optimal') return { kind: 'diff', xA, fA, chk, feas };
    if (res.x.every((v, j) => near(v, A.x[j])) && (!A.f || near(res.f, A.f))) return { kind: 'ok', xA, fA, chk, feas };
    if (feas && fA.eq(res.f) && fOk) return { kind: 'alt', xA, fA, chk, feas };
    return { kind: 'diff', xA, fA, chk, feas };
  }
  function compareZ(pr, res, meta) {
    const A = meta.answerZ, V = verdictZ(pr, res, A);
    let h;
    const resText = res.status === 'optimal' ? `<i>f</i>* = ${fq(res.f)}${approx(res.f)} в точке ${vec(res.x)}` : statusText(res.status);
    if (!A) h = `<div class="note">В сборнике ответ к этому заданию не приведён. Итог — по расчёту: ${resText}.</div>`;
    else {
      const shown = A.none ? 'решений нет' : A.unbounded ? 'L неограничена' : `${A.f ? `L* = ${ansText(A.f)}, ` : ''}x* = (${A.x.map(ansText).join('; ')})`;
      h = `<p>Ответ в сборнике: <b>${shown}</b>. Ответы сборника — справочные; итог определяется расчётом.</p>`;
      if (V.kind === 'ok') h += `<div class="note ok">✓ Расчёт совпадает с ответом сборника${A.none ? ` (${statusText(res.status)})` : ''}.</div>`;
      else if (V.kind === 'alt') h += `<div class="note ok">✓ Точка из ответа допустима и даёт то же значение f* = ${fq(res.f)}: оптимум не единственный, расчёт нашёл другую оптимальную точку ${vec(res.x)}.</div>`;
      else {
        h += `<div class="note warn"><b>⚠ Расхождение с ответом сборника.</b><ul>`;
        if (V.xA && V.xA.length !== pr.n) h += `<li>в ответе ${V.xA.length} координат, а переменных в задаче ${pr.n};</li>`;
        else if (V.xA) {
          const bad = V.chk.map((c, i) => c.ok ? null : `(${i + 1}): ${fq(c.lhs)} ${sg(pr.rows[i].s)} ${fq(pr.rows[i].b)} — не выполнено`).filter(Boolean);
          if (V.xA.some(v => v.s < 0)) h += '<li>в точке из ответа есть отрицательная координата;</li>';
          h += bad.length ? `<li>точка из ответа <b>недопустима</b>: ${bad.join('; ')};</li>` : `<li>точка из ответа допустима, f в ней = ${fq(V.fA)}${A.f && !near(V.fA, A.f) ? ` (в сборнике указано ${ansText(A.f)})` : ''};</li>`;
        }
        h += `<li>расчёт: ${resText}.</li></ul></div>`;
      }
    }
    if (meta.note) h += `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>`;
    return h;
  }

  /* =================== Сборник ПЗ, 2.2: графический метод (с исключением переменных) =================== */
  function graphZ(pr, meta) {
    const hasEq = pr.rows.some(r => r.s === '=');
    const finish = (lift, note2) => (res2, G) => {
      const full = ALG.twoPhase(pr);
      const x = res2.x ? lift(res2.x) : null;
      const res = { status: full.status, x: full.status === 'optimal' ? x : null, f: full.status === 'optimal' ? ALGZ.fv(pr, x) : null };
      let h = note2 || '';
      if (full.status !== res2.status) h += `<div class="note">Проверка двухэтапным симплекс-методом исходной задачи: ${statusText(full.status)}.</div>`;
      if (res.x) h += `<p>Решение исходной задачи: <span class="m">${vec(res.x)}</span>.</p>` + demoAnswer(pr, res.x, res.f, null) + checkTable(pr, res.x) + valueLine(pr, res.x);
      else h += noCheck(res);
      if (full.status === 'optimal' && !ALGZ.fv(pr, full.x).eq(res.f)) h += `<div class="note bad">Графическое решение и симплекс-метод дали разные значения цели.</div>`;
      return [sec('check', checkTitle(meta), h + compare(pr, res, meta))];
    };
    const cond = sec('cond', 'Условие', system(pr) + `<p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`);
    const full0 = ALG.twoPhase(pr), res0 = { status: full0.status, x: full0.x, f: full0.f };
    const sumc = summaryCard({ main: resMain(res0), facts: pr.n > 2 ? [`переменных ${pr.n} → сведение к (x₁; x₂)`] : [], badges: [bookBadge(pr, res0, meta), checkBadge(pr, full0.status === 'optimal' ? full0.x : null)], links: [...(pr.n > 2 || hasEq ? [['reduce', 'Сведение']] : []), ['plot', 'График'], ['check', 'Проверка']] });
    if (pr.n === 2 && !hasEq) return graph(pr, meta, { pre: [cond, sumc], finish: finish(x => x), noSummary: true });
    if (pr.n < 2) return [cond, sec('opt', 'Графический метод', '<div class="note bad">Для графического метода нужны хотя бы две переменные.</div>')];
    const Rd = ALGZ.reduce2(pr);
    if (!Rd.ok) {
      const full = ALG.twoPhase(pr), res = { status: full.status, x: full.x, f: full.f };
      return [cond, sumc, sec('reduce', 'Сведение к плоскости', `<div class="note bad">Задачу нельзя изобразить на плоскости (x₁; x₂): ${Rd.reason}.</div>`),
        sec('check', checkTitle(meta), (full.status === 'optimal' ? `<p>Решение двухэтапным симплекс-методом:</p>` + checkTable(pr, full.x) + valueLine(pr, full.x) : noCheck(res)) + compare(pr, res, meta))];
    }
    let P2 = Rd.pr2;
    // числовое противоречие (0 ≥ 6) — добавляем заведомо несовместное условие, чтобы на графике область была пустой
    if (Rd.contra.length) { P2 = { ...P2, rows: [...P2.rows, { a: [new Q(1n), Zq()], s: '<=', b: new Q(-1n) }] }; Rd.origin.push({ kind: 'contra' }); }
    let rh = `<p>Переменных ${pr.n}, поэтому сначала выражаем ${Rd.basic.length ? Rd.basic.map(B => xv(B.j + 1)).join(', ') : 'лишние переменные'} из уравнений через ${xv(1)} и ${xv(2)} (метод Гаусса):</p>`;
    if (Rd.basic.length) rh += `<div class="sys">${Rd.basic.map(B => `${xv(B.j + 1)} = ${fq(B.b)}${[0, 1].map(t => B.a[t].isZero() ? '' : (B.a[t].s > 0 ? ' − ' : ' + ') + (B.a[t].abs().eq(new Q(1n)) ? '' : fq(B.a[t].abs())) + xv(t + 1)).join('')} <span class="kbd">(из уравнения ${B.from + 1})</span>`).join('<br>')}</div>`;
    rh += `<p>Условие ${Rd.basic.map(B => xv(B.j + 1)).join(', ')} ≥ 0 даёт неравенства на плоскости; ${pr.rows.some(r => r.s !== '=') ? 'неравенства исходной задачи переписываем, подставляя выражения; ' : ''}цель выражаем через ${xv(1)}, ${xv(2)}. Получаем задачу с двумя переменными:</p>`;
    rh += `<div class="sys">${objLine(P2)}<br>${P2.rows.map((r, k) => { const o = Rd.origin[k]; return `${rowLine(r)} <span class="kbd">(${k + 1}) — ${o.kind === 'basic' ? `из ${xv(o.j + 1)} ≥ 0` : o.kind === 'eq' ? `из уравнения ${o.i + 1}, после исключения` : o.kind === 'contra' ? 'условие, заменяющее числовое противоречие (см. ниже)' : `ограничение ${o.i + 1}`}</span>`; }).join('<br>')}<br>${xv(1)}, ${xv(2)} ≥ 0</div>`;
    if (Rd.dropped.length) rh += `<p class="kbd">Обратились в верное числовое неравенство и отброшены: ${Rd.dropped.map(o => o.kind === 'basic' ? `${xv(o.j + 1)} ≥ 0` : `ограничение ${o.i + 1}`).join(', ')}.</p>`;
    if (Rd.contra.length) rh += `<div class="note bad">Противоречие: ${Rd.contra.map(o => (o.kind === 'basic' ? `${xv(o.j + 1)} ≥ 0` : `ограничение ${o.i + 1}`) + ` даёт 0 ${sg(o.s)} ${fq(o.b)}`).join('; ')} — допустимых решений нет.</div>`;
    if (Rd.objOnly.length) rh += `<div class="note">${Rd.objOnly.map(j => xv(j + 1)).join(', ')} входят только в цель, ограничений на них, кроме ≥ 0, нет: при допустимой области ${pr.sense === 'max' ? 'положительный' : 'отрицательный'} коэффициент сделал бы цель неограниченной.</div>`;
    const eqRows = pr.rows.filter(r => r.s === '=');
    const reduce = sec('reduce', 'Сведение к двум переменным', (eqRows.length ? demoGauss(eqRows.map(r => ({ a: r.a, b: r.b })), pr.c.map((_, j) => xv(j + 1)), 'уравнения: метод Гаусса — выражаем лишние переменные') : '') + (Rd.basic.length ? demoReduce(pr, Rd, P2) : '') + rh);
    const lift = Rd.lift;
    const note2 = `<p class="kbd">Остальные переменные восстанавливаются по выражениям из раздела «Сведение к двум переменным».</p>`;
    const S = graph(P2, meta, { pre: [cond, sumc, reduce], finish: finish(lift, note2), noSummary: true });
    return S;
  }

  /* =================== Сборник ПЗ, 2.6: двойственная задача по общим правилам =================== */
  const signTxt = (s, lab) => s === '>=' ? `${lab} ≥ 0` : s === '<=' ? `${lab} ≤ 0` : `${lab} — любого знака`;
  function dualZ(pr, meta) {
    const S = [], P = ALGZ.normalize(pr), D = ALGZ.dualOf(P), n = P.n, m = P.rows.length, max = P.sense === 'max';
    const { st, plan } = stager();
    const sp = ALGZ.solve(P), sd = ALGZ.solve(D);
    const bLine = (pr.bounds || []).map(B => `${xv(B.j + 1)} ${sg(B.s)} ${fq(B.b)}`).join(', ');
    S.push(sec('cond', 'Исходная задача', `<div class="sys">${objLine(pr)}<br>${pr.rows.map((r, i) => rowLine(r) + ` <span class="kbd">(${i + 1})</span>`).join('<br>')}${bLine ? '<br>' + bLine : ''}</div><p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`));
    {
      const cons = sp.status === 'optimal' ? sd.status === 'optimal' && sp.f.eq(sd.f) : sp.status === 'infeasible' ? ['infeasible', 'unbounded'].includes(sd.status) : sp.status === 'unbounded' && sd.status === 'infeasible';
      const st = s => s.status === 'optimal' ? `оптимум ${fq(s.f)}` : s.status === 'infeasible' ? 'несовместна' : s.status === 'unbounded' ? 'цель не ограничена' : s.status;
      S.push(summaryCard({ main: `<i>g</i> = ${withC0(D, lin(D.c, i => yv(i + 1)))} → ${D.sense}<div class="kbd" style="font-size:14px">${D.rows.length} ограничений, ${D.n} переменных y — полностью в разделе «Двойственная задача»</div>`,
        facts: [`исходная: ${st(sp)}`, `двойственная: ${st(sd)}`],
        badges: [cons ? '<span class="badge ok">✓ согласуется с теоремами двойственности</span>' : '<span class="badge bad">✗ не согласуется</span>', '<span class="badge info">в сборнике ответа нет</span>'],
        links: [['plan', 'Этапы'], ['prep', 'Условия на переменные'], ['build', 'Двойственная задача'], ['check', 'Проверка']] }));
    }
    const planAt = S.length;
    const rule = max
      ? [['ограничение «≤»', 'yᵢ ≥ 0'], ['ограничение «≥»', 'yᵢ ≤ 0'], ['ограничение «=»', 'yᵢ любого знака'], ['xⱼ ≥ 0', 'Σ aᵢⱼyᵢ ≥ cⱼ'], ['xⱼ ≤ 0', 'Σ aᵢⱼyᵢ ≤ cⱼ'], ['xⱼ любого знака', 'Σ aᵢⱼyᵢ = cⱼ'], ['L → max', 'g = Σ bᵢyᵢ → min']]
      : [['ограничение «≥»', 'yᵢ ≥ 0'], ['ограничение «≤»', 'yᵢ ≤ 0'], ['ограничение «=»', 'yᵢ любого знака'], ['xⱼ ≥ 0', 'Σ aᵢⱼyᵢ ≤ cⱼ'], ['xⱼ ≤ 0', 'Σ aᵢⱼyᵢ ≥ cⱼ'], ['xⱼ любого знака', 'Σ aᵢⱼyᵢ = cⱼ'], ['L → min', 'g = Σ bᵢyᵢ → max']];
    S.push(sec('how', 'Как строится', `<ol class="howl"><li>Каждому ограничению (i) исходной задачи сопоставляем переменную yᵢ, каждой переменной xⱼ — ограничение (Дj) двойственной: его коэффициенты — столбец при xⱼ, правая часть — cⱼ.</li>
      <li>Правые части bᵢ становятся коэффициентами цели g, направление меняется на противоположное.</li>
      <li>Условием на знак считаем только xⱼ ≥ 0 или xⱼ ≤ 0. Другие границы (например, xⱼ ≥ 10) — обычные ограничения; переменная без условия на знак — любого знака.</li>
      <li>Знаки определяются по таблице соответствия (для задачи на ${P.sense}):</li></ol>
      <div class="tblwrap"><table class="plain"><tr><th>Исходная задача (${P.sense})</th><th>Двойственная (${D.sense})</th></tr>${rule.map(r => `<tr><td class="m">${r[0]}</td><td class="m">${r[1]}</td></tr>`).join('')}</table></div>`));
    let ph = '';
    if (pr.bounds && pr.bounds.length) {
      ph += `<ul>${P.info.map(B => `<li class="m">${xv(B.j + 1)} ${sg(B.s)} ${fq(B.b)} — ${B.kind === 'sign' ? 'условие на знак' : `обычное ограничение (${B.row + 1})`}</li>`).join('')}</ul>`;
    }
    const free = P.signs.map((s, j) => s === 'free' ? xv(j + 1) : null).filter(Boolean);
    ph += `<p>${free.length ? `Без условия на знак: ${free.join(', ')} — переменные любого знака.` : 'Все переменные имеют условие на знак.'}</p>`;
    ph += `<div class="sys">${objLine(P)}<br>${P.rows.map((r, i) => rowLine(r) + ` <span class="kbd">(${i + 1}) ↔ ${yv(i + 1)}</span>`).join('<br>')}<br>${P.signs.map((s, j) => signTxt(s, xv(j + 1))).join(', ')}</div>`;
    S.push(st('prep', 'Анализ условий на переменные',
      'разделить ограничения исходной задачи на условия на знак переменных и обычные ограничения, сопоставить каждому ограничению (i) переменную yᵢ.',
      'классификация границ: xⱼ ≥ 0 / xⱼ ≤ 0 — условия на знак, прочие границы — обычные ограничения; переменная без условия — любого знака.',
      ph));
    let mt = `<div class="tblwrap"><table class="sx"><tr><th></th>${[...Array(n)].map((_, j) => `<th>${xv(j + 1)}</th>`).join('')}<th></th><th>b</th><th>переменная</th></tr>`;
    P.rows.forEach((r, i) => { mt += `<tr><td class="bas">(${i + 1})</td>${r.a.map(v2 => `<td>${fq(v2)}</td>`).join('')}<td>${sg(r.s)}</td><td class="bcol">${fq(r.b)}</td><td class="m">${signTxt(D.signs[i], yv(i + 1))}</td></tr>`; });
    mt += `<tr class="zrow"><td class="bas"><i>c</i></td>${P.c.map(v2 => `<td>${fq(v2)}</td>`).join('')}<td colspan="3">→ ${P.sense}</td></tr><tr><td class="bas">знак</td>${P.signs.map(s => `<td>${s === 'free' ? 'любой' : sg(s) + ' 0'}</td>`).join('')}<td colspan="3"></td></tr></table></div>`;
    const why = j => P.signs[j] === 'free' ? `${xv(j + 1)} любого знака ⇒ «=»` : `${xv(j + 1)} ${sg(P.signs[j])} 0 ⇒ «${sg(D.rows[j].s)}»`;
    const dl = `<div class="dual"><div class="dl"><i>g</i> = ${withC0(D, lin(D.c, i => yv(i + 1)))} → ${D.sense}</div>${D.rows.map((r, j) => `<div class="dl">${lin(r.a, i => yv(i + 1))} ${sg(r.s)} ${fq(r.b)} <span class="kbd">(Д${j + 1}: ${why(j)})</span></div>`).join('')}<div class="dl">${D.signs.map((s, i) => signTxt(s, yv(i + 1))).join(', ')}</div></div>`;
    let bodyB = `<p>Матрица исходной задачи: строки (i) дают переменные yᵢ, столбцы xⱼ — ограничения Дj.</p>${mt}`;
    if (R.TR.on) {
      const qid = 'qz' + Math.random().toString(36).slice(2, 8);
      const sel = (ans, opts) => `<select data-ans="${ans}"><option value="">?</option>${opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`;
      const SG = [['<=', '≤'], ['>=', '≥'], ['=', '=']], YS = [['>=', '≥ 0'], ['<=', '≤ 0'], ['free', 'любого знака']];
      bodyB += `<div class="quiz" id="${qid}"><div class="trq ask"><span class="trtag">Тренажёр</span> Постройте двойственную задачу сами: выберите направление цели, знак каждого ограничения Дj и условие на каждую yᵢ (по таблице в «Как строится»). <span class="trscore">ошибок: 0</span></div>
        <div class="dual"><div class="dl"><i>g</i> = ${withC0(D, lin(D.c, i => yv(i + 1)))} → ${sel(D.sense, [['min', 'min'], ['max', 'max']])}</div>${D.rows.map((r, j) => `<div class="dl">${lin(r.a, i => yv(i + 1))} ${sel(r.s, SG)} ${fq(r.b)} <span class="kbd">(Д${j + 1}; ${P.signs[j] === 'free' ? `${xv(j + 1)} — любого знака` : `${xv(j + 1)} ${sg(P.signs[j])} 0`})</span></div>`).join('')}<div class="dl">${D.signs.map((s, i) => `${yv(i + 1)} ${sel(s, YS)} <span class="kbd">(ограничение (${i + 1}) «${sg(P.rows[i].s)}»)</span>`).join('<br>')}</div></div>
        <div class="btnrow"><button class="btn primary qcheck">Проверить</button><button class="btn qshow">Показать ответ</button></div><div class="trmsg"></div></div><div class="qans" style="display:none"><p><b>Ответ — двойственная задача:</b></p>${dl}</div>`;
      R.hooks.push(() => {
        const Qz = document.getElementById(qid); if (!Qz) return;
        let errs = 0;
        const fin = () => { Qz.nextElementSibling.style.display = ''; };
        Qz.querySelector('.qcheck').onclick = () => {
          const sels = [...Qz.querySelectorAll('select')]; let wrong = 0, empty = 0;
          sels.forEach(s => { s.classList.remove('qok', 'qbad'); if (!s.value) { empty++; return; } if (s.value === s.dataset.ans) s.classList.add('qok'); else { s.classList.add('qbad'); wrong++; } });
          errs += wrong; Qz.querySelector('.trscore').textContent = 'ошибок: ' + errs;
          const m = Qz.querySelector('.trmsg');
          if (!wrong && !empty) { m.className = 'trmsg ok'; m.innerHTML = '✓ Всё верно — двойственная задача построена.'; fin(); }
          else { m.className = 'trmsg bad'; m.innerHTML = (wrong ? `Неверно: ${wrong}. Подсказка: для задачи на ${P.sense} знак Дj зависит от знака xⱼ, а условие на yᵢ — от знака ограничения (i); смотрите таблицу соответствия.` : '') + (empty ? ` Не заполнено: ${empty}.` : ''); }
        };
        Qz.querySelector('.qshow').onclick = () => { Qz.querySelectorAll('select').forEach(s => { s.value = s.dataset.ans; s.classList.add('qok'); }); fin(); };
      });
    } else bodyB += `<p><b>Ответ — двойственная задача:</b></p>${dl}`;
    S.push(st('build', 'Построение двойственной задачи',
      'записать двойственную задачу: направление цели, знаки ограничений Дj и условия на знак yᵢ.',
      `транспонирование матрицы A; правила соответствия для задачи на ${P.sense} (знак ограничения (i) → знак yᵢ, знак xⱼ → вид ограничения Дj, b → коэффициенты g, ${P.sense} → ${D.sense}).`,
      demoDualMap(P, D) + demoBuild(P, D) + (R.TR.on ? bodyB : more(bodyB))));
    // решение обеих задач
    const stl = (s, nm, v2, val) => s.status === 'optimal' ? `<span class="m">${nm}* = ${vec(s.x)}, ${val}* = ${fq(s.f)}${approx(s.f)}</span>` : statusText(s.status);
    let sh = `<p class="kbd">Для решения переменные ≤ 0 заменяются на −x′, переменные любого знака — на разность x′ − x″ (обе ≥ 0); полученные задачи решаются двухэтапным симплекс-методом.</p>`;
    sh += `<p><b>Исходная:</b> ${stl(sp, '<i>x</i>', 0, '<i>L</i>')}.</p><p><b>Двойственная:</b> ${stl(sd, '<i>y</i>', 0, '<i>g</i>')}.</p>`;
    S.push(st('solve', 'Решение исходной и двойственной задач',
      'найти оптимальные планы обеих задач, чтобы проверить построение двойственной.',
      'замена переменных: xⱼ ≤ 0 → −x′ⱼ, xⱼ любого знака → x′ⱼ − x″ⱼ; двухэтапный симплекс-метод (метод искусственного базиса).',
      (sp.status === 'optimal' && sd.status === 'optimal' ? demoReveal('обе задачи решены', [{ name: '<i>x</i>', lab: xlab, vals: sp.x, fname: 'L', f: sp.f }, { name: '<i>y</i>', lab: ylab, vals: sd.x, fname: 'g', f: sd.f }], 'оптимальные планы обеих задач найдены') : '') + more(sh)));
    // проверка по теоремам двойственности
    let kh = '', ok;
    if (sp.status === 'optimal' && sd.status === 'optimal') {
      ok = sp.f.eq(sd.f);
      kh += `<div class="note ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} <b>L* = ${fq(sp.f)}, g* = ${fq(sd.f)}</b> — ${ok ? 'оптимальные значения совпадают (первая теорема двойственности)' : 'не совпадают'}.</div>`;
      const cp = ALG.check(P, sp.x), cd = ALG.check(D, sd.x);
      const pairs = [];
      P.rows.forEach((r, i) => pairs.push({ t: `(${i + 1}) ↔ ${yv(i + 1)}`, s: cp[i].lhs.sub(r.b), v: sd.x[i] }));
      D.rows.forEach((r, j) => pairs.push({ t: `${xv(j + 1)} ↔ Д${j + 1}`, s: cd[j].lhs.sub(r.b), v: sp.x[j] }));
      const csOk = pairs.every(p2 => p2.s.mul(p2.v).isZero());
      kh += `<p><b>Условия дополняющей нежёсткости</b> (произведение переменной на невязку сопряжённого ограничения равно 0):</p><div class="tblwrap"><table class="plain"><tr><th>Пара</th><th>Невязка</th><th>Переменная</th><th>Произведение</th></tr>${pairs.map(p2 => `<tr><td class="m">${p2.t}</td><td class="m">${fq(p2.s)}</td><td class="m">${fq(p2.v)}</td><td class="${p2.s.mul(p2.v).isZero() ? 'tick' : 'bad-t'}">${fq(p2.s.mul(p2.v))}</td></tr>`).join('')}</table></div>`;
      ok = ok && csOk;
    } else if (sp.status === 'infeasible') {
      ok = sd.status === 'infeasible' || sd.status === 'unbounded';
      kh += `<div class="note ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} У исходной задачи нет допустимых решений; тогда двойственная либо не ограничена, либо тоже несовместна. Расчёт двойственной: ${statusText(sd.status)}.</div>`;
    } else if (sp.status === 'unbounded') {
      ok = sd.status === 'infeasible';
      kh += `<div class="note ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} Цель исходной задачи не ограничена; тогда у двойственной нет допустимых решений. Расчёт двойственной: ${statusText(sd.status)}.</div>`;
    } else { ok = false; kh += `<div class="note bad">${statusText(sp.status)}</div>`; }
    kh += `<div class="note">В сборнике ответ к этому заданию не приведён — построение проверено теоремами двойственности.</div>`;
    if (meta && meta.note) kh += `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>`;
    S.push(st('check', 'Проверка по теоремам двойственности',
      'подтвердить, что двойственная задача построена верно.',
      'первая теорема двойственности (L* = g* или согласованные исходы «несовместна / не ограничена»); вторая теорема — условия дополняющей нежёсткости (произведение переменной на невязку сопряжённого ограничения равно 0).',
      (sp.status === 'optimal' && sd.status === 'optimal' && sp.f.eq(sd.f) ? demo('оптимальные значения сравниваются', bars(['L*', sp.f], ['g*', sd.f]), async A => { await A.wait(300); await growBars(A, sp.f, sd.f); A.cap('L* = g* — двойственная построена верно'); }) : '') + more(kh)));
    S.splice(planAt, 0, plan());
    S.consistent = ok;
    return S;
  }

  /* =================== Тренажёр: проверочные вопросы по методу =================== */
  // У каждого варианта ответа — комментарий: почему верно или в чём ошибка.
  const QB = {
    graph: [
      { q: 'Как узнать, какую сторону прямой a₁x₁ + a₂x₂ = b оставляет неравенство «≤ b»?', a: [
        ['Подставить точку не на прямой, обычно (0; 0): если неравенство верно — берём сторону с этой точкой', 1, 'Это универсальный способ: одна подстановка сразу показывает нужную сторону.'],
        ['Всегда берём сторону ниже прямой', 0, 'Зависит от знаков коэффициентов: например, −x₂ ≤ −2 означает x₂ ≥ 2 — сторону выше прямой.'],
        ['Всегда берём сторону с началом координат', 0, 'Только если (0; 0) удовлетворяет неравенству. Для x₁ + x₂ ≥ 1 начало координат не подходит.']] },
      { q: 'Где достигается оптимум задачи ЛП, если он есть?', a: [
        ['В вершине допустимой области (иногда — на всей её стороне)', 1, 'Линия уровня последний раз касается многоугольника в вершине или ложится на сторону.'],
        ['В центре допустимой области', 0, 'Из центра линию уровня всегда можно сдвинуть дальше и улучшить цель.'],
        ['В точке пересечения прямой с осью', 0, 'Такая точка может быть оптимальной, только если она — вершина области; это частный случай.']] },
      { q: 'Что такое линия уровня?', a: [
        ['Прямая c₁x₁ + c₂x₂ = const: во всех её точках цель одинакова', 1, 'Сдвигая её, мы смотрим, какие значения цели достижимы в области.'],
        ['Граница допустимой области', 0, 'Границы задают ограничения, а линия уровня — цель.'],
        ['Вектор, указывающий рост цели', 0, 'Это градиент (c₁; c₂). Линия уровня ему перпендикулярна.']] },
      { q: 'В задаче на минимум линию уровня сдвигают…', a: [
        ['против градиента (по антиградиенту)', 1, 'Градиент — направление роста цели, для минимума движемся в обратную сторону.'],
        ['по градиенту', 0, 'Так цель растёт — это для задачи на максимум.'],
        ['всегда к началу координат', 0, 'Направление зависит от коэффициентов цели, а не от начала координат.']] },
      { q: 'Линию уровня можно сдвигать бесконечно, и она всё время пересекает область. Значит…', a: [
        ['цель не ограничена, оптимума нет', 1, 'Цель можно сделать сколь угодно хорошей.'],
        ['допустимая область пуста', 0, 'Пустая область не пересекается ни с какой прямой.'],
        ['оптимум в самой дальней вершине', 0, 'Дальней вершины в этом направлении нет — область неограничена.']] },
      { q: 'Линия уровня в последний момент легла на сторону области. Значит…', a: [
        ['оптимальны все точки этой стороны', 1, 'Цель на стороне постоянна и равна оптимальной — решений бесконечно много.'],
        ['решения нет', 0, 'Решение есть, просто оно не единственное.'],
        ['оптимум только в середине стороны', 0, 'Значение цели одинаково во всех точках стороны, включая концы.']] },
      { q: 'Как найти точные координаты оптимальной вершины?', a: [
        ['Решить систему уравнений двух прямых, на пересечении которых она лежит', 1, 'Вершина — точка пересечения двух граничных прямых, поэтому их уравнения задают её точно.'],
        ['Считать с графика по клеткам', 0, 'Так получается приближение. Ответ должен быть точным.'],
        ['Подставить (0; 0) в цель', 0, 'Это даёт значение цели в начале координат, а не оптимум.']] }
    ],
    simplex: [
      { q: 'Какой столбец становится ведущим (задача на максимум)?', a: [
        ['Столбец с самым отрицательным числом в строке f', 1, 'Отрицательное число показывает, что рост этой переменной увеличивает f; самое отрицательное — быстрее всего.'],
        ['Столбец с наибольшим положительным числом в строке f', 0, 'Положительные числа означают, что рост переменной уменьшит f.'],
        ['Столбец с наибольшим b', 0, 'Столбец b — значения базисных переменных; ведущий столбец выбирают по строке f.']] },
      { q: 'Как выбирают ведущую строку?', a: [
        ['По наименьшему отношению b ÷ a среди строк с a > 0', 1, 'Входящая переменная может вырасти только до этого значения, иначе какая-то базисная станет отрицательной.'],
        ['По наибольшему отношению b ÷ a', 0, 'Тогда переменная строки с меньшим отношением станет отрицательной — решение выйдет из области.'],
        ['По наименьшему b', 0, 'Важно отношение b ÷ a: оно показывает, насколько может вырасти входящая переменная.']] },
      { q: 'Почему строки с a ≤ 0 в ведущем столбце не участвуют в выборе строки?', a: [
        ['Они не ограничивают рост входящей переменной', 1, 'При a ≤ 0 базисная переменная строки при росте входящей не уменьшается.'],
        ['На ноль и отрицательные числа нельзя делить', 0, 'На отрицательное делить можно; дело в смысле: такая строка не мешает росту.'],
        ['Эти строки всегда лишние', 0, 'Строки нужны, просто на этом шаге они не ограничивают рост.']] },
      { q: 'Когда симплекс-таблица оптимальна?', a: [
        ['В строке f нет отрицательных чисел', 1, 'Тогда рост любой небазисной переменной не улучшает цель.'],
        ['Все числа в столбце b положительны', 0, 'Это условие допустимости базисного решения, а не оптимальности.'],
        ['В базисе нет дополнительных переменных', 0, 'Дополнительные переменные могут оставаться в базисе и в оптимальном решении.']] },
      { q: 'По какому признаку видно, что цель не ограничена?', a: [
        ['В столбце с отрицательным числом в строке f нет положительных элементов', 1, 'Переменную этого столбца можно увеличивать бесконечно — ни одна строка её не остановит.'],
        ['Все числа строки f отрицательны', 0, 'Это просто значит, что итерации нужно продолжать.'],
        ['В столбце b появился 0', 0, 'Это вырожденное решение, а не неограниченность.']] },
      { q: 'Зачем в ограничения «≤» добавляют дополнительные (остаточные) переменные?', a: [
        ['Чтобы получить равенства и готовый стартовый базис', 1, 'При x = 0 остатки равны правым частям — это первое базисное решение.'],
        ['Чтобы изменить цель', 0, 'В цель остатки входят с коэффициентом 0.'],
        ['Чтобы сделать правые части отрицательными', 0, 'Наоборот, для стартовой таблицы нужно b ≥ 0.']] },
      { q: 'Как прочитать ответ из итоговой таблицы?', a: [
        ['Базисные переменные равны своим b, остальные равны 0', 1, 'Это базисное решение; значение цели — в столбце b строки f.'],
        ['Значения переменных — числа строки f', 0, 'Строка f показывает изменение цели, а не значения переменных.'],
        ['Значения переменных — числа ведущего столбца', 0, 'Ведущий столбец нужен только для очередного шага.']] },
      { q: 'В итоговой строке f под небазисной переменной стоит 0. Что это значит?', a: [
        ['Есть и другие оптимальные решения', 1, 'Эту переменную можно ввести в базис, не меняя значения цели.'],
        ['Решение вырожденное', 0, 'Вырожденность — это нулевое значение базисной переменной (0 в столбце b).'],
        ['Нужна ещё итерация', 0, 'Итерация нужна только при отрицательном числе.']] }
    ],
    artificial: [
      { q: 'Зачем нужны искусственные переменные?', a: [
        ['Готового базиса нет: излишки входят с минусом, и при x = 0 они были бы отрицательными', 1, 'Искусственные переменные дают стартовый базис с b ≥ 0.'],
        ['Чтобы увеличить значение цели', 0, 'В исходную цель они не входят.'],
        ['Чтобы уменьшить число ограничений', 0, 'Число ограничений не меняется — меняется число переменных.']] },
      { q: 'Что минимизируют на этапе 1?', a: [
        ['Сумму искусственных переменных h', 1, 'Если её минимум равен 0, все искусственные обнулятся и останется допустимая точка исходной задачи.'],
        ['Исходную цель f', 0, 'Цель f начинают оптимизировать на этапе 2.'],
        ['Сумму излишков', 0, 'Излишки — обычные переменные задачи, они могут быть положительными.']] },
      { q: 'После этапа 1 получилось h* > 0. Значит…', a: [
        ['у задачи нет допустимых решений', 1, 'Искусственные переменные нельзя обнулить — ограничения несовместны.'],
        ['цель не ограничена', 0, 'Цель f на этапе 1 вообще не рассматривалась.'],
        ['нужно повторить этап 1 с другим базисом', 0, 'Симплекс-метод уже нашёл минимум h — другой базис его не уменьшит.']] },
      { q: 'Почему в таблице записана строка −h, а не h?', a: [
        ['Алгоритм ищет максимум, а min h = max(−h)', 1, 'Так этап 1 решается теми же правилами, что и обычный симплекс-метод.'],
        ['Чтобы все числа стали положительными', 0, 'Числа строки −h как раз в основном отрицательные — это и запускает итерации.'],
        ['Это опечатка', 0, 'Знак минус принципиален: он превращает минимум в максимум.']] },
      { q: 'Как получить числа строки −h?', a: [
        ['Взять со знаком минус сумму строк, в которых есть искусственные переменные', 1, 'Так h выражается через небазисные переменные, а в столбцах t остаются нули.'],
        ['Переписать коэффициенты цели f', 0, 'Цель f используется только на этапе 2.'],
        ['Поставить −1 под каждой искусственной переменной', 0, 'Под базисными (искусственными) переменными в строке цели должны стоять нули.']] },
      { q: 'Что делают со столбцами искусственных переменных после этапа 1?', a: [
        ['Удаляют и переходят к этапу 2 с исходной целью', 1, 'Искусственные переменные равны 0 и больше не нужны.'],
        ['Оставляют и продолжают минимизировать h', 0, 'h уже равна 0 — этап 1 закончен.'],
        ['Переносят их в правую часть', 0, 'Они равны нулю и просто вычёркиваются.']] }
    ],
    dual: [
      { q: 'Сколько переменных у двойственной задачи?', a: [
        ['Столько, сколько ограничений в прямой задаче', 1, 'Каждому ограничению (i) соответствует своя переменная yᵢ.'],
        ['Столько, сколько переменных в прямой задаче', 0, 'Переменным прямой задачи соответствуют ограничения двойственной.'],
        ['Всегда две', 0, 'Две бывает только при двух ограничениях в прямой задаче.']] },
      { q: 'Что становится коэффициентами цели двойственной задачи?', a: [
        ['Правые части bᵢ ограничений прямой задачи', 1, 'g = Σ bᵢyᵢ.'],
        ['Коэффициенты цели cⱼ прямой задачи', 0, 'cⱼ становятся правыми частями ограничений двойственной.'],
        ['Коэффициенты первой строки матрицы', 0, 'Строки матрицы дают столбцы двойственной задачи.']] },
      { q: 'Прямая задача на максимум, ограничение «≤», xⱼ ≥ 0. Какая двойственная?', a: [
        ['Цель на минимум, ограничения Σ aᵢⱼyᵢ ≥ cⱼ, все yᵢ ≥ 0', 1, 'Это стандартная пара симметричных двойственных задач.'],
        ['Цель на максимум, ограничения «≤ cⱼ»', 0, 'Направление цели меняется: max ↔ min.'],
        ['Цель на минимум, ограничения «≤ cⱼ»', 0, 'При max и xⱼ ≥ 0 ограничения двойственной — «≥ cⱼ».']] },
      { q: 'Ограничению-равенству прямой задачи соответствует…', a: [
        ['переменная yᵢ любого знака', 1, 'Равенство можно записать двумя неравенствами — отсюда отсутствие условия на знак.'],
        ['переменная yᵢ ≥ 0', 0, 'Так для «≤» в задаче на максимум.'],
        ['переменная yᵢ = 0', 0, 'Нулю равна yᵢ только для строгого в оптимуме неравенства (по УДН).']] },
      { q: 'В оптимуме ограничение (i) прямой задачи выполняется строго (с запасом). Тогда…', a: [
        ['yᵢ = 0', 1, 'Условие дополняющей нежёсткости: ресурс с запасом «ничего не стоит».'],
        ['yᵢ > 0', 0, 'Положительной yᵢ может быть только у ограничения-равенства в оптимуме.'],
        ['ограничение двойственной (i) — равенство', 0, 'Пара для ограничения (i) — это переменная yᵢ, а не ограничение.']] },
      { q: 'В оптимуме xⱼ > 0. Что следует для двойственной задачи?', a: [
        ['j-е ограничение двойственной выполняется как равенство', 1, 'Это вторая половина условий дополняющей нежёсткости.'],
        ['yⱼ = 0', 0, 'Индексы yᵢ относятся к ограничениям прямой задачи, а не к xⱼ.'],
        ['двойственная задача не имеет решения', 0, 'Если прямая задача разрешима, двойственная тоже.']] },
      { q: 'Как связаны оптимальные значения f* и g*?', a: [
        ['Они равны', 1, 'Первая теорема двойственности — по ней и проверяют решение.'],
        ['g* всегда больше f*', 0, 'Для допустимых решений g ≥ f (задача на max), но в оптимуме — равенство.'],
        ['Не связаны', 0, 'Связаны: это главное свойство двойственности.']] },
      { q: 'Цель прямой задачи не ограничена. Что с двойственной?', a: [
        ['У неё нет допустимых решений', 1, 'Иначе любое её допустимое решение ограничивало бы цель прямой задачи.'],
        ['Её цель тоже не ограничена', 0, 'Обе задачи одновременно неограниченными быть не могут.'],
        ['Она имеет единственный оптимум', 0, 'Оптимумы есть либо у обеих задач, либо ни у одной.']] }
    ]
  };
  /* Вопросы по текущему варианту. */
  function quizDynamic(method, pr) {
    const out = [];
    if (method === 'graph' && pr.n === 2) {
      const i = pr.rows.findIndex(r => !r.b.isZero() && r.s !== '=');
      if (i >= 0) {
        const r = pr.rows[i], ok = r.s === '<=' ? Z().le(r.b) : Z().ge(r.b);
        out.push({ q: `Ограничение (${i + 1}): ${rowLine(r)}. Оставляет ли оно сторону прямой, где лежит начало координат (0; 0)?`, a: [
          ['Да', ok ? 1 : 0, ok ? `Подставляем (0; 0): 0 ${sg(r.s)} ${fq(r.b)} — верно.` : `Подставляем (0; 0): 0 ${sg(r.s)} ${fq(r.b)} — неверно, значит берём другую сторону.`],
          ['Нет', ok ? 0 : 1, ok ? `Подставьте (0; 0): 0 ${sg(r.s)} ${fq(r.b)} — неравенство верно.` : `Верно: 0 ${sg(r.s)} ${fq(r.b)} не выполняется, начало координат вне полуплоскости.`]] });
      }
    }
    if (method === 'simplex' && pr.rows.every(r => r.s === '<=')) {
      const m = pr.rows.length;
      out.push({ q: `В этом варианте ${m} ограничения «≤». Сколько остаточных переменных добавляют для приведённой задачи?`, a: [
        [String(m), 1, 'По одной на каждое ограничение «≤» — они и образуют стартовый базис.'],
        [String(pr.n), 0, 'Остатки добавляют по числу ограничений, а не переменных.'],
        [String(m + pr.n), 0, 'Это общее число переменных после приведения, а остатков — по одному на ограничение.']] });
    }
    if (method === 'artificial') {
      const m = pr.rows.length;
      out.push({ q: `Сколько искусственных переменных вводится в этом варианте (метод добавляет их в каждое уравнение)?`, a: [
        [String(m), 1, `По одной на каждое из ${m} уравнений.`], [String(pr.n), 0, 'Число искусственных равно числу уравнений, а не исходных переменных.'], ['0', 0, 'Без них не получится стартовый базис.']] });
    }
    if (method === 'dual') {
      const m = pr.rows.length + (pr.bounds ? pr.bounds.filter(B => !B.b.isZero()).length : 0);
      out.push({ q: `Сколько переменных y будет у двойственной задачи для этого варианта?`, a: [
        [String(m), 1, `По одной на каждое ограничение прямой задачи (их ${m}${pr.bounds ? ', включая границы на переменные, ставшие ограничениями' : ''}).`],
        [String(pr.n), 0, 'Это число переменных прямой задачи — им соответствуют ограничения двойственной.'],
        [String(m + pr.n), 0, 'Сумма ни к чему не относится: y — по ограничениям, ограничения двойственной — по переменным.']] });
    }
    return out;
  }
  function quiz(method, pr) {
    const id = 'qz' + Math.random().toString(36).slice(2, 8);
    R.hooks.push(() => {
      const root = document.getElementById(id); if (!root) return;
      let qs = [], i = 0, score = 0, firstTry = true;
      const deal = () => {
        const bank = (QB[method] || []).slice().sort(() => Math.random() - 0.5).slice(0, 5);
        qs = [...quizDynamic(method, pr), ...bank].slice(0, 6).map(q => ({ ...q, a: q.a.slice().sort(() => Math.random() - 0.5) }));
        i = 0; score = 0; render();
      };
      const render = () => {
        if (i >= qs.length) {
          root.innerHTML = `<div class="trq ok"><b>Результат: ${score} из ${qs.length}</b> с первой попытки.</div><div class="btnrow"><button class="btn primary qz-again">Ещё раз (другие вопросы)</button></div>`;
          root.querySelector('.qz-again').onclick = deal; return;
        }
        const Qn = qs[i]; firstTry = true;
        root.innerHTML = `<div class="trq ask"><span class="trtag">Вопрос ${i + 1} из ${qs.length}</span> ${Qn.q} <span class="trscore">верно: ${score}</span></div><div class="opts">${Qn.a.map((o, j) => `<button class="opt" data-j="${j}">${o[0]}</button>`).join('')}</div><div class="trmsg"></div>`;
        const m = root.querySelector('.trmsg');
        root.querySelectorAll('.opt').forEach(b => b.onclick = () => {
          const o = Qn.a[+b.dataset.j];
          if (o[1]) {
            if (firstTry) score++;
            b.classList.add('right'); root.querySelectorAll('.opt').forEach(x => { x.disabled = true; });
            m.className = 'trmsg ok reveal'; m.innerHTML = `<b>Верно.</b> ${o[2]}<div class="btnrow"><button class="btn primary qz-next">${i < qs.length - 1 ? 'Следующий вопрос →' : 'Итог'}</button></div>`;
            m.querySelector('.qz-next').onclick = () => { i++; render(); };
          } else { firstTry = false; b.classList.add('wrong'); b.disabled = true; m.className = 'trmsg bad reveal'; m.innerHTML = `<b>Нет.</b> ${o[2]}`; }
        });
      };
      deal();
    });
    return sec('quiz', 'Проверьте себя: идеи метода', `<p class="kbd">Короткие вопросы с вариантами ответов. После выбора — комментарий, почему ответ верный или в чём ошибка.</p><div id="${id}"></div>`);
  }

  /* =====================================================================
     ТРЕНАЖЁР: задача решается через последовательность решений.
     Каждый этап — вопрос с вариантами ответов по уже посчитанным числам;
     решение (таблицы, график, двойственная задача) появляется по мере ответов.
     ===================================================================== */
  const O = (t, ok, why) => ({ t, ok: !!ok, why });
  const realZ = s => s.z.label.startsWith('−') ? s.z.b.neg() : s.z.b;
  const cap2 = t => `<div class="tf-cap">${t}</div>`;
  const uniqOpts = opts => { const seen = new Set(); return opts.filter(o => { const k = o.t.replace(/<[^>]+>/g, ''); if (seen.has(k)) return false; seen.add(k); return true; }); };

  /* Итерации симплекс-метода как вопросы. ctx: { first: bool, ruleDone: bool } */
  function iterStages(stages, steps, chap, ctx) {
    for (let k = 0; k < steps.length; k++) {
      const s = steps[k];
      if (s.q == null) return { final: s, k };
      const z = zlab(s.z.label), nm = s.z.label.replace('−', ''), vn = j => vname(s.vars, j), m = s.rows.length;
      const ttl = `${chap} · таблица ${k}`, q = s.q;
      const tbl0 = p => { p.innerHTML = cap2(`${chap}: таблица ${k}`) + table(s, {}); p.querySelectorAll('tr.zrow td').forEach(td => td.classList.add('zfocus')); };
      // 1) кто входит в базис
      const nb = s.cols.filter(j => !s.basis.includes(j));
      const neg = nb.filter(j => s.z.a[j].s < 0).sort((a, b) => s.z.a[a].cmp(s.z.a[b])), nn = nb.filter(j => s.z.a[j].s >= 0);
      let cand = [...neg.slice(0, 3), ...nn.slice(0, 1)]; if (!cand.includes(q)) cand.unshift(q);
      const most = neg[0];
      stages.push({ ch: ttl, vis: tbl0,
        q: `Смотрим на строку ${z} (выделена). Какая переменная <b>входит в базис</b>?`,
        opts: [...cand.map(j => { const v = s.z.a[j]; return O(`${vn(j)} <span class="kbd">(${fq(v)} в строке ${z})</span>`, j === q,
          j === q ? (j === most ? `${fq(v)} — самое отрицательное число строки ${z}: рост ${vn(j)} улучшает цель быстрее всего.` : 'Берём первый столбец с отрицательным числом (правило Бленда — защита от зацикливания).')
            : v.s >= 0 ? `${fq(v)} ≥ 0: рост ${vn(j)} цель не улучшит. Кандидаты — только отрицательные числа.` : `Отрицательное — цель тоже улучшится, но по правилу берём самое отрицательное: ${fq(s.z.a[most])}.`); }),
          O('Никакая — таблица уже оптимальна', false, `В строке ${z} есть отрицательные числа (${neg.slice(0, 3).map(j => fq(s.z.a[j])).join(', ')}) — цель ещё можно улучшить.`)],
        sum: `Входит ${vn(q)} (${fq(s.z.a[q])} в строке ${z})` });
      // 2) какая строка выходит
      const rmin = s.p != null ? s.ratios[s.p] : null;
      stages.push({ ch: ttl, vis: p => { p.innerHTML = cap2(`${chap}: таблица ${k} — входит ${vn(q)}`) + table({ ...s, p: -1 }, { hl: true, ratio: true }); },
        q: `Входит ${vn(q)}. Для строк с a &gt; 0 посчитаны отношения b ÷ a (справа в таблице). Какая строка <b>выходит</b>?`,
        opts: [...s.rows.map((r, i) => { const a = r.a[q], R2 = s.ratios[i];
          return O(`строка ${vn(s.basis[i])} <span class="kbd">${R2 ? `b ÷ a = ${fq(R2)}${approx(R2)}` : `a = ${fq(a)} ≤ 0`}</span>`, !s.unbounded && i === s.p,
            !s.unbounded && i === s.p ? `Наименьшее отношение: ${vn(q)} может вырасти только до ${fq(R2)}, иначе ${vn(s.basis[i])} станет отрицательной. Она и выходит из базиса.`
              : !R2 ? `a ≤ 0: при росте ${vn(q)} переменная ${vn(s.basis[i])} не уменьшается — строка рост не ограничивает.`
              : `Если поднять ${vn(q)} до ${fq(R2)}, переменная ${vn(s.basis[s.p])} (отношение ${fq(rmin)}) станет отрицательной. Берут наименьшее отношение.`); }),
          O('Ни одна — в столбце нет a &gt; 0', s.unbounded, s.unbounded ? `${vn(q)} можно увеличивать бесконечно — <b>цель не ограничена</b>.` : `В столбце ${vn(q)} есть положительные a — одна из этих строк ограничивает рост.`)],
        sum: s.unbounded ? `В столбце ${vn(q)} нет a &gt; 0 — цель не ограничена` : `Выходит ${vn(s.basis[s.p])}: наименьшее b ÷ a = ${fq(rmin)}`, end: !!s.unbounded });
      if (s.unbounded) return { unbounded: s, k };
      const piv = s.rows[s.p].a[q], vp = vn(s.basis[s.p]), nxt = steps[k + 1], hl = p => { p.innerHTML = cap2(`${chap}: таблица ${k} — ведущий элемент`) + table(s, { hl: true, ratio: true }); };
      // 3) ведущий элемент (на первой итерации этапа)
      if (ctx.first) stages.push({ ch: ttl, vis: p => { hl(p); p.querySelectorAll('td.pe').forEach(td => { td.classList.remove('pe'); td.classList.add('pr'); }); },
        q: `Входит ${vn(q)}, выходит ${vp}. Какой элемент <b>ведущий</b>?`,
        opts: uniqOpts([O(fq(piv), true, `На пересечении ведущего столбца ${vn(q)} и ведущей строки ${vp}.`), O(fq(s.z.a[q]), false, `Это число строки ${z} — по нему выбирали столбец, а ведущий элемент стоит в строке ограничения.`),
          O(fq(s.rows[s.p].b), false, 'Это b ведущей строки. Ведущий элемент — в ведущем столбце.'), O(fq(s.ratios[s.p]), false, 'Это отношение b ÷ a, по нему выбирали строку.')]),
        sum: `Ведущий элемент ${fq(piv)}` });
      // 4) правило пересчёта (один раз)
      if (!ctx.ruleDone) { ctx.ruleDone = true; stages.push({ ch: ttl, vis: hl,
        q: 'Как получить новую таблицу?',
        opts: [O(`Ведущую строку разделить на ${fq(piv)}; из остальных строк (и из строки ${z}) вычесть её, умноженную на их число в столбце ${vn(q)}`, true, `Так в столбце ${vn(q)} получится 1 в ведущей строке и 0 в остальных — ${vn(q)} станет базисной вместо ${vp}.`),
          O(`Разделить на ${fq(piv)} все строки`, false, 'Делится только ведущая строка. Остальные получают 0 в ведущем столбце вычитанием.'),
          O(`Пересчитать строки ограничений, а строку ${z} оставить`, false, `Строку ${z} пересчитывают так же: иначе под новой базисной переменной останется ненулевое число.`)],
        sum: 'Пересчёт: ведущую строку делим, из остальных вычитаем' }); }
      // 5) как изменится цель (на первой итерации этапа)
      if (ctx.first) {
        const ov = realZ(s), nv = realZ(nxt), th = s.ratios[s.p];
        if (th.isZero()) stages.push({ ch: ttl, vis: hl,
          q: `b ведущей строки равно 0, поэтому θ = 0: ${vn(q)} войдёт в базис со значением 0. Что произойдёт с ${nm}?`,
          opts: [O(`${nm} не изменится — шаг вырожденный, меняется только базис`, true, 'Точка (базисное решение) остаётся той же, но новый базис может открыть путь к улучшению на следующем шаге.'),
            O(`${nm} улучшится на |${fq(s.z.a[q])}|`, false, `Изменение цели равно |${fq(s.z.a[q])}| · θ, а θ = 0.`), O('Метод зациклился — нужно остановиться', false, 'Вырожденный шаг — не зацикливание. От зацикливания защищает правило Бленда.')],
          sum: `Вырожденный шаг: ${nm} = ${fq(ov)} не меняется` });
        else stages.push({ ch: ttl, vis: hl,
          q: `Сейчас ${nm} = ${fq(ov)}. В строке ${z} под ${vn(q)} стоит ${fq(s.z.a[q])}, ${vn(q)} вырастет до θ = ${fq(th)}. Каким станет ${nm}?`,
          opts: uniqOpts([O(fq(nv), true, `Цель меняется на |${fq(s.z.a[q])}| · θ = ${fq(s.z.a[q].abs().mul(th))}: ${fq(ov)} → ${fq(nv)}.`),
            O(fq(ov), false, `${vn(q)} входит в базис со значением θ = ${fq(th)} &gt; 0 — цель изменится.`),
            O(fq(ov.mul(2).sub(nv)), false, 'Знак не тот: при отрицательном числе в строке цели рост переменной улучшает цель.'),
            O(fq(th), false, 'Это новое значение входящей переменной, а не цели.')]),
          sum: `${nm}: ${fq(ov)} → ${fq(nv)}` });
      }
      ctx.first = false;
      stages[stages.length - 1].after = p => { p.innerHTML = cap2(`${chap}: новая таблица ${k + 1}`) + `<div class="reveal">${table(nxt, {})}</div>`; };
    }
    return { final: steps[steps.length - 1], k: steps.length - 1 };
  }
  /* Вопросы по итоговой таблице: оптимальна ли и как прочитать ответ. */
  function answerStages(stages, res, pr, chap) {
    const last = res.last, n = pr.n, z = zlab(last.z.label);
    stages.push({ ch: chap, vis: p => { p.innerHTML = cap2('Итоговая таблица') + table(last, {}); p.querySelectorAll('tr.zrow td').forEach(td => td.classList.add('zfocus')); },
      q: `В строке ${z} нет отрицательных чисел. Что это значит?`,
      opts: [O('Решение оптимально', true, 'Рост любой небазисной переменной не улучшит цель — итерации закончены.'), O('Нужна ещё итерация', false, `Итерация нужна, только если в строке ${z} есть отрицательное число.`), O('Цель не ограничена', false, 'Признак неограниченности — отрицательное число в строке цели и столбец без положительных элементов.')],
      sum: 'Таблица оптимальна' });
    const xs = res.x, d1 = [...Array(n)].map((_, j) => last.rows[j] ? last.rows[j].b : Zq()), d3 = [...Array(n)].map((_, j) => last.z.a[j]);
    stages.push({ ch: chap, vis: p => { p.innerHTML = cap2('Итоговая таблица') + table(last, {}); },
      q: `Чему равен ответ x* = (x₁; …; x${String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('')})?`,
      opts: uniqOpts([O(vec(xs), true, `Базисные переменные равны своим b (${last.basis.filter(j => j < n).map(j => `${vname(last.vars, j)} = ${fq(last.rows[last.basis.indexOf(j)].b)}`).join(', ') || 'ни одна из x не базисная'}), остальные x — 0.`),
        O(vec(d1), false, 'Числа столбца b относятся к переменным, подписанным слева (базису), а не к x₁, x₂, … по порядку.'),
        O(vec(d3), false, `Это числа строки ${z} — они показывают изменение цели, а не значения переменных.`)]),
      sum: `x* = ${vec(xs)}` });
    if (pr.sense === 'min' && last.z.label === '−f') stages.push({ ch: chap, vis: p => { p.innerHTML = cap2('Итоговая таблица') + table(last, {}); },
      q: `В столбце b строки −f стоит ${fq(last.z.b)}. Чему равно f*?`,
      opts: uniqOpts([O(fq(res.f), true, `В таблице строка −f (min f = max(−f)), поэтому f* = −(${fq(last.z.b)})${pr.c0 ? ` + ${fq(pr.c0)} (свободный член)` : ''}.`), O(fq(last.z.b), false, 'Строка записана как −f: знак нужно сменить.'), O(fq(last.z.b.abs().add(1)), false, 'Значение цели читается из столбца b строки цели.')]),
      sum: `f* = ${fq(res.f)}` });
  }

  /* ---------- построители этапов по методам ---------- */
  function buildSimplex(pr, stages) {
    const res = ALG.twoPhase(pr), n = pr.n, m = pr.rows.length, sl = i => xv(n + i + 1);
    const sys = system(pr);
    stages.push({ ch: 'Приведение', vis: p => { p.innerHTML = cap2('Условие') + sys; },
      q: 'Чтобы превратить ограничение «≤» в равенство, что добавляют в левую часть?',
      opts: [O('Остаточную переменную со знаком «+» (≥ 0)', true, 'Она равна «недостающей» до правой части величине и не может быть отрицательной.'), O('Излишек со знаком «−»', false, 'Излишек вычитают из «≥».'), O('Искусственную переменную', false, 'Искусственные нужны, когда нет готового базиса; для «≤» с b ≥ 0 он есть.')],
      sum: `Добавляем остатки ${[...Array(m)].map((_, i) => sl(i)).join(', ')}`,
      after: p => { p.innerHTML = cap2('Приведённая задача') + `<div class="sys">${pr.rows.map((r, i) => `${lin(r.a, j => xv(j + 1))} + ${sl(i)} = ${fq(r.b)}`).join('<br>')}</div>`; } });
    stages.push({ ch: 'Приведение', q: 'Какие переменные образуют стартовый базис?',
      opts: [O(`${[...Array(m)].map((_, i) => sl(i)).join(', ')} — остатки`, true, `При x₁ = … = x${n} = 0 остатки равны правым частям (все ≥ 0) — это допустимое базисное решение.`),
        O(`${[...Array(Math.min(m, n))].map((_, j) => xv(j + 1)).join(', ')} — исходные переменные`, false, 'Исходные переменные входят в несколько уравнений сразу — готового базиса из них нет.'),
        O('Готового базиса нет — нужен метод искусственного базиса', false, 'Для «≤» с b ≥ 0 базис есть: остатки.')],
      sum: 'Стартовый базис — остатки' });
    stages.push({ ch: 'Приведение', q: 'Как заполнить строку f начальной таблицы?',
      opts: [O(`Коэффициенты цели с обратным знаком: ${pr.c.map(v => fq(v.neg())).join(', ')}`, true, 'Строка — это уравнение f − c·x = 0, поэтому коэффициенты меняют знак.'), O(`Коэффициенты цели как есть: ${pr.c.map(fq).join(', ')}`, false, 'В уравнении f − c·x = 0 коэффициенты стоят с минусом.'), O('Нулями', false, 'Нули стоят только под базисными переменными (остатками).')],
      sum: 'Строка f: коэффициенты с обратным знаком',
      after: p => { p.innerHTML = cap2('Начальная таблица') + `<div class="reveal">${table(res.phase2.steps[0], {})}</div>`; } });
    const r = iterStages(stages, res.phase2.steps, 'Итерации', { first: true, ruleDone: false });
    if (r.unbounded) return { res, end: 'Целевая функция не ограничена — оптимума нет.' };
    answerStages(stages, res, pr, 'Ответ');
    return { res, end: `x* = ${vec(res.x)}, f* = ${fq(res.f)}` };
  }

  function buildArtificial(pr, stages, all, zyk) {
    const res = ALG.twoPhase(pr, { artificialAll: all }), n = pr.n, VN = j => vname(res.vars, j);
    const hasArt = res.artOf.some(x => x !== null), artRows = res.artOf.map((x, i) => x !== null ? i : -1).filter(i => i >= 0);
    const flips = res.notes.filter(x => x.kind === 'flip');
    if (flips.length) stages.push({ ch: 'Подготовка', vis: p => { p.innerHTML = cap2('Условие') + system(pr); },
      q: `В ограничении (${flips[0].i + 1}) правая часть отрицательна (${fq(pr.rows[flips[0].i].b)}). Что делаем?`,
      opts: [O('Умножаем ограничение на −1 (знак неравенства меняется)', true, 'В симплекс-таблице все b должны быть ≥ 0.'), O('Ничего, так и оставляем', false, 'С отрицательным b базисное решение было бы недопустимым.'), O('Отбрасываем ограничение', false, 'Ограничение нельзя отбросить — изменится задача.')],
      sum: `Ограничени${flips.length > 1 ? 'я' : 'е'} ${flips.map(f => `(${f.i + 1})`).join(', ')} умножаем на −1` });
    if (res.rows.some(r => r.s === '>=')) stages.push({ ch: 'Подготовка', vis: p => { p.innerHTML = cap2('Условие') + system(pr); },
      q: 'Как превратить ограничение «≥ b» в равенство?',
      opts: [O('Вычесть излишек (переменную ≥ 0)', true, 'Излишек показывает, на сколько левая часть превышает b.'), O('Прибавить остаток', false, 'Остаток прибавляют к «≤».'), O('Умножить на −1 и прибавить остаток', false, 'Так получится «≤» с отрицательной правой частью — базисное решение будет недопустимым.')],
      sum: 'Из «≥» вычитаем излишки' });
    stages.push({ ch: 'Подготовка', vis: p => { p.innerHTML = cap2('Уравнения') + `<div class="sys">${res.rows.map((r, i) => `${lin(r.a, j => xv(j + 1))}${res.slackOf[i] === null ? '' : ` ${r.s === '<=' ? '+' : '−'} ${VN(res.slackOf[i])}`} = ${fq(r.b)}`).join('<br>')}</div>`; },
      q: 'Есть ли готовый базис (в каждом уравнении — своя переменная с коэффициентом +1 и b ≥ 0)?',
      opts: hasArt ? [O('Нет — вводим искусственные переменные t и решаем вспомогательную задачу h = Σt → min', true, all ? 'Излишки входят с −1 (при x = 0 были бы отрицательными), в «=» дополнительных переменных нет. Искусственные t дают стартовый базис.' : `В уравнениях ${artRows.map(i => `(${i + 1})`).join(', ')} нет подходящей переменной — туда добавляем t.`),
        O('Да — излишки', false, 'Излишки входят с коэффициентом −1: при x = 0 они были бы отрицательны.'), O('Нет — значит задача не имеет решения', false, 'Отсутствие готового базиса — не признак несовместности, его просто нужно построить.')]
        : [O('Да — остатки', true, 'Все ограничения «≤» с b ≥ 0: остатки сразу дают базис, этап 1 не нужен.'), O('Нет — нужны искусственные переменные', false, 'Искусственные нужны только там, где нет остатка с +1.')],
      sum: hasArt ? `Добавляем ${artRows.map(i => VN(res.artOf[i])).join(', ')}; h = Σt → min` : 'Готовый базис из остатков' });
    if (hasArt) {
      const st0 = res.phase1.steps[0];
      stages.push({ ch: 'Подготовка', q: 'Как получить строку −h начальной таблицы?',
        opts: [O('Минус сумма строк, в которых есть t (по каждому столбцу)', true, 'Так h выражается через небазисные переменные, а под t стоят нули.'), O('Записать −1 под каждой t', false, 'Под базисными переменными в строке цели должны быть нули.'), O('Коэффициенты цели f с обратным знаком', false, 'Цель f используется на этапе 2. На этапе 1 цель — h.')],
        sum: 'Строка −h: минус сумма строк с t',
        after: p => { p.innerHTML = cap2('Этап 1: начальная таблица') + `<div class="reveal">${table(st0, {})}</div>`; } });
      iterStages(stages, res.phase1.steps, 'Этап 1', { first: true, ruleDone: false });
      const fin = res.phase1.steps[res.phase1.steps.length - 1], hv = fin.z.b.neg(), feas = hv.isZero();
      stages.push({ ch: 'Этап 1', vis: p => { p.innerHTML = cap2('Этап 1: итоговая таблица') + table(fin, {}); },
        q: `В строке −h нет отрицательных, h* = ${fq(hv)}. Что это значит?`,
        opts: [O('Найдено допустимое базисное решение — переходим к этапу 2', feas, feas ? 'Все t = 0: точка удовлетворяет исходным ограничениям.' : 'Нет: h* &gt; 0, искусственные переменные не обнулились.'),
          O('Допустимых решений нет', !feas, !feas ? 'Сумму t нельзя сделать нулём — ограничения несовместны.' : 'Так было бы при h* &gt; 0.'), O('Найден оптимум исходной задачи', false, 'Этап 1 ищет только допустимую точку, цель f в нём не участвует.')],
        sum: feas ? 'h* = 0 — допустимая точка найдена' : `h* = ${fq(hv)} &gt; 0 — решений нет`, end: !feas });
      if (!feas) return { res, end: 'Допустимых решений нет.' };
      if (zyk && all && res.phase2) {
        const s0 = res.phase2.steps[0], bfs = [...Array(n)].map((_, j) => { const i = s0.basis.indexOf(j); return i < 0 ? Zq() : s0.rows[i].b; });
        stages.push({ ch: 'Этап 1', q: 'Какое допустимое базисное решение получено (ответ к заданию 2.3)?',
          opts: uniqOpts([O(vec(bfs), true, 'Базисные x равны своим b, остальные — 0.'), O(vec([...Array(n)].map((_, j) => fin.rows[j] ? fin.rows[j].b : Zq())), false, 'Числа b относятся к переменным базиса, а не к x₁, x₂, … по порядку.'), O(vec([...Array(n)].map(() => Zq())), false, 'При всех x = 0 ограничения-равенства не выполняются.')]),
          sum: `Допустимое базисное решение ${vec(bfs)}` });
      }
      stages.push({ ch: 'Переход к этапу 2', q: 'Что делаем со столбцами искусственных переменных?',
        opts: [O('Удаляем', true, 't = 0 и больше не нужны.'), O('Оставляем с нулями в строке цели', false, 'Их удаляют, чтобы t не вернулись в базис.'), O('Продолжаем минимизировать h', false, 'h уже равна 0 — этап 1 закончен.')], sum: 'Столбцы t удаляем' });
    }
    if (res.phase2) {
      stages.push({ ch: 'Переход к этапу 2', vis: p => { p.innerHTML = cap2('Строка цели «как есть»') + table(res.raw, {}); },
        q: `Цель: ${objLine(pr)}. Как записать строку цели в таблице?`,
        opts: pr.sense === 'min' ? [O('Строка −f: коэффициенты f как есть', true, 'min f = max(−f); уравнение −f + c·x = 0 даёт коэффициенты c без смены знака.'), O('Строка f: коэффициенты с обратным знаком', false, 'Так для задачи на максимум.'), O('Нули', false, 'Нули — только под базисными переменными после пересчёта.')]
          : [O('Строка f: коэффициенты с обратным знаком', true, 'f − c·x = 0.'), O('Строка −f: коэффициенты как есть', false, 'Так для задачи на минимум.'), O('Нули', false, 'Нули — только под базисными переменными после пересчёта.')],
        sum: pr.sense === 'min' ? 'Строка −f: коэффициенты f как есть' : 'Строка f: коэффициенты с обратным знаком' });
      if (res.elim.length) {
        const e = res.elim[0];
        stages.push({ ch: 'Переход к этапу 2', q: `Под базисной переменной ${VN(e.bj)} в строке цели стоит ${fq(e.k)}. Что делаем?`,
          opts: [O(`Вычитаем из строки цели строку ${VN(e.bj)}, умноженную на ${fq(e.k)}`, true, 'Под базисными переменными в строке цели должны быть нули — иначе таблица не соответствует базисному решению.'), O('Оставляем как есть', false, 'Тогда по строке цели нельзя судить об оптимальности.'), O(`Записываем 0 вместо ${fq(e.k)}`, false, 'Просто стереть число нельзя — меняется задача. Нужно вычесть строку.')],
          sum: `Обнуляем под базисными: ${res.elim.map(x => VN(x.bj)).join(', ')}`,
          after: p => { p.innerHTML = cap2('Этап 2: начальная таблица') + `<div class="reveal">${table(res.phase2.steps[0], {})}</div>`; } });
      } else stages[stages.length - 1].after = p => { p.innerHTML = cap2('Этап 2: начальная таблица') + `<div class="reveal">${table(res.phase2.steps[0], {})}</div>`; };
      const r = iterStages(stages, res.phase2.steps, hasArt ? 'Этап 2' : 'Итерации', { first: true, ruleDone: !!hasArt });
      if (r.unbounded) return { res, end: 'Целевая функция не ограничена — оптимума нет.' };
      answerStages(stages, res, pr, 'Ответ');
    }
    return { res, end: res.status === 'optimal' ? `x* = ${vec(res.x)}, f* = ${fq(res.f)}` : statusText(res.status) };
  }

  /* Графический метод: этапы управляют «живым» графиком справа. */
  function buildGraph(pr, stages, api) {
    let P = pr, lift = x => x, Rd = null, pre = [];
    if (pr.n > 2 || pr.rows.some(r => r.s === '=')) {
      Rd = ALGZ.reduce2(pr);
      if (!Rd.ok || Rd.contra.length) {
        const full = ALG.twoPhase(pr);
        stages.push({ ch: 'Сведение', vis: p => { p.innerHTML = cap2('Условие') + system(pr); }, q: 'Можно ли изобразить эту задачу на плоскости (x₁; x₂)?',
          opts: [O('Нет — после исключения переменных остаётся больше двух независимых или есть противоречие', true, Rd.ok ? 'Уравнения противоречивы — допустимых точек нет.' : Rd.reason + '.'), O('Да, всегда', false, 'Только когда после исключения остаются две свободные переменные.')], sum: 'На плоскость не сводится' });
        return { plot: null, end: statusText(full.status) };
      }
      P = Rd.pr2; lift = Rd.lift;
      stages.push({ ch: 'Сведение', vis: p => { p.querySelector('.tf-extra').innerHTML = cap2('Условие') + system(pr); },
        q: `Переменных ${pr.n}${pr.rows.some(r => r.s === '=') ? ', есть уравнения' : ''}. Как получить задачу на плоскости (x₁; x₂)?`,
        opts: [O('Выразить остальные переменные из уравнений через x₁ и x₂; их условия ≥ 0 станут неравенствами', true, 'Так задача превращается в задачу с двумя переменными — её и рисуем.'), O('Просто отбросить x₃, x₄, …', false, 'Тогда потеряются уравнения — область будет другой.'), O('Взять x₃ = x₄ = … = 0', false, 'Это лишь одна из точек, а не вся область.')],
        sum: 'Выражаем лишние переменные через x₁, x₂',
        after: p => { p.querySelector('.tf-extra').innerHTML = cap2('Задача на плоскости') + `<div class="sys">${objLine(P)}<br>${P.rows.map((r, k) => `${rowLine(r)} <span class="kbd">(${k + 1})</span>`).join('<br>')}</div>`; } });
    }
    const G = ALG.graph(P), N = q => q.toNumber(), f0 = P.c0 ? N(P.c0) : 0, naxis = 2;
    // ограничения по одному
    P.rows.forEach((r, k) => {
      const T = !r.b.isZero() ? [0, 0] : !r.a[0].isZero() ? [0, 1] : [1, 0], val = r.a[0].mul(T[0]).add(r.a[1].mul(T[1])), ok = r.s === '<=' ? val.le(r.b) : r.s === '>=' ? val.ge(r.b) : val.eq(r.b);
      const eq = r.s === '=';
      stages.push({ ch: 'Допустимая область', vis: () => api().set({ mode: 'steps', step: naxis + k, hl: [k], hideOpt: true, hideGrad: true, lvl: null }),
        q: eq ? `Ограничение (${k + 1}): ${rowLine(r)} — равенство. Что остаётся от плоскости?` : `Ограничение (${k + 1}): ${rowLine(r)}. Подставляем (${T.join('; ')}): ${fq(val)} ${sg(r.s)} ${fq(r.b)} — ${ok ? 'верно' : 'неверно'}. Какую сторону прямой оставляем?`,
        opts: eq ? [O('Только точки самой прямой', true, 'Равенство выполняется лишь на прямой — область сжимается до отрезка (или точки).'), O('Сторону с началом координат', false, 'Для равенства сторон нет — только сама прямая.'), O('Всю плоскость', false, 'Равенство сильно сужает область.')]
          : [O(`Сторону, где лежит (${T.join('; ')})`, ok, ok ? 'Неравенство в этой точке верно — значит, верно и во всей её полуплоскости.' : 'В этой точке неравенство неверно — она не в нужной полуплоскости.'),
            O('Противоположную сторону', !ok, !ok ? 'Точка не удовлетворяет неравенству, значит нужна другая сторона.' : 'Точка удовлетворяет неравенству — её сторона и нужна.'),
            O('Ограничение ничего не отсекает', false, 'Любое неравенство отсекает полуплоскость; лишним оно может оказаться лишь вместе с остальными.')],
        sum: eq ? `(${k + 1}) — остаётся прямая` : `(${k + 1}) — ${ok ? 'сторона с' : 'сторона без'} точки (${T.join('; ')})`,
        after: () => api().set({ mode: 'steps', step: naxis + k + 1, hl: [] }) });
    });
    const inf = G.status === 'infeasible' || !G.verts.length;
    stages.push({ ch: 'Допустимая область', vis: () => api().set({ mode: 'region', hl: [], hideOpt: true, hideGrad: true, lvl: null }),
      q: 'Пересечение всех полуплоскостей (и x₁, x₂ ≥ 0) — допустимая область. Какая она?',
      opts: () => { const kind = api().kind(); return [O('Ограниченный многоугольник', kind === 'ограниченный многоугольник', kind === 'ограниченный многоугольник' ? 'Область замкнута со всех сторон.' : `Посмотрите на график: область ${kind}.`), O('Неограниченная', kind === 'неограниченная', kind === 'неограниченная' ? 'Область уходит в бесконечность — цель может оказаться неограниченной.' : `Посмотрите на график: область ${kind}.`),
        O('Пустая', /пустая/.test(kind), /пустая/.test(kind) ? 'Общих точек нет — у задачи нет решения.' : 'Закрашенная часть есть — область не пуста.'), ...(/отрезок|луч/.test(kind) ? [O(cap(kind), true, 'Из-за равенства область — часть прямой.')] : [])]; },
      sum: 'Область построена', end: inf });
    if (inf) return { end: 'Допустимая область пуста — решения нет.' };
    const max = P.sense === 'max';
    stages.push({ ch: 'Оптимум', vis: () => api().set({ hideGrad: false }),
      q: `Цель ${objLine(P)}. Куда сдвигаем линию уровня?`,
      opts: [O(`По градиенту (${fq(P.c[0])}; ${fq(P.c[1])}) — зелёная стрелка`, max, max ? 'Градиент — направление роста цели; ищем максимум.' : 'Так цель растёт, а нужен минимум.'), O(`Против градиента`, !max, !max ? 'Ищем минимум — двигаемся туда, где цель убывает.' : 'Так цель убывает, а нужен максимум.'), O('К началу координат', false, 'Направление задаёт цель, а не начало координат.')],
      sum: `Сдвигаем ${max ? 'по градиенту' : 'против градиента'}` });
    const vs = G.verts.slice().sort((a, b) => b.f.cmp(a.f) * (max ? 1 : -1)).slice(0, 5);
    const vtab = `<table class="plain mini"><tr><th>Вершина</th><th>f</th></tr>${G.verts.map(w => `<tr><td class="m">${vec(w.p)}</td><td class="m">${fq(w.f)}</td></tr>`).join('')}</table>`;
    const unb = G.status === 'unbounded';
    stages.push({ ch: 'Оптимум', vis: p => { p.querySelector('.tf-extra').innerHTML = cap2('Вершины области и значения цели') + vtab; const a = api(); const fv = G.verts.map(w => N(w.f)), spanF = Math.max(...fv) - Math.min(...fv) + 1; a.anim(G.status === 'optimal' ? N(G.f) - f0 + (max ? 1 : -1) * 0.45 * spanF : null); },   // линия проходит оптимум и выходит из области — решает студент
      q: 'Линия уровня движется по стрелке. В какой вершине она последний раз касается области? (значения цели в вершинах — в таблице)',
      opts: [...vs.map(w => O(`${vec(w.p)} <span class="kbd">f = ${fq(w.f)}</span>`, !unb && G.status === 'optimal' && w.f.eq(G.f), !unb && w.f.eq(G.f) ? (G.opt.length > 1 ? `Здесь f = ${fq(w.f)} — столько же, сколько в вершине ${vec(G.opt.find(o => o !== w && !o.p.every((v, c) => v.eq(w.p[c]))).p)}: линия уровня ложится на сторону, оптимальны все её точки.` : `Здесь f = ${fq(w.f)} — ${max ? 'больше' : 'меньше'}, чем в остальных вершинах.`) : unb ? 'В направлении стрелки область уходит в бесконечность — последней точки касания нет.' : `f = ${fq(w.f)}, но есть вершина с ${max ? 'большим' : 'меньшим'} значением: ${fq(G.f)}.`)),
        O('Нигде — линию можно сдвигать бесконечно', unb, unb ? 'Область не ограничена в направлении улучшения — цель не ограничена.' : 'Область в этом направлении ограничена — касание прекращается в вершине.')],
      sum: unb ? 'Цель не ограничена' : `Оптимум в ${vec(G.optVertex.p)}`, end: unb,
      after: () => { if (!unb) { const bind = P.rows.map((r, k) => r.a[0].mul(G.optVertex.p[0]).add(r.a[1].mul(G.optVertex.p[1])).eq(r.b) ? k : -1).filter(k => k >= 0); api().set({ hideOpt: false, lvl: N(G.f) - f0, hl: bind }); } } });
    if (unb) return { end: 'Целевая функция не ограничена — оптимума нет.' };
    const w = G.optVertex, on = w.on.map(o => typeof o === 'number' ? `(${o + 1})` : o === 'x1' ? 'x₁ = 0' : 'x₂ = 0');
    const xFull = lift(w.p);
    stages.push({ ch: 'Оптимум', q: `Оптимальная вершина лежит на ${on.slice(0, 2).join(' и ')}. Как найти её точные координаты?`,
      opts: [O(`Решить систему уравнений ${on.slice(0, 2).join(' и ')}`, true, `Получаем x₁ = ${fq(w.p[0])}, x₂ = ${fq(w.p[1])}.`), O('Считать с графика по клеткам', false, 'Так получается приближение, а ответ нужен точный.'), O('Подставить вершину в цель', false, 'Так находят значение цели, а не координаты.')],
      sum: `x₁ = ${fq(w.p[0])}, x₂ = ${fq(w.p[1])}`,
      after: p => { p.querySelector('.tf-extra').innerHTML = cap2('Ответ') + `<p class="answer"><i>x</i>* = ${vec(xFull)}, &nbsp;<i>f</i>* = ${fq(ALGZ.fv(pr, xFull))}</p>`; } });
    return { end: `x* = ${vec(xFull)}, f* = ${fq(ALGZ.fv(pr, xFull))}` };
  }

  /* Двойственная задача (задание 4: прямая на max, x ≥ 0). */
  function buildDualRGR(pr, stages) {
    const res = ALG.dual(pr), D = res.D, m = pr.rows.length, n = pr.n, flips = res.norm.filter(r => r.flipped);
    const dualSys = (upto) => `<div class="sys"><i>g</i> = ${lin(D.c, i => yv(i + 1))} → min<br>${D.rows.map((r, j) => j < upto ? `${lin(r.a, i => yv(i + 1))} ≥ ${fq(r.b)} <span class="kbd">(Д${j + 1})</span>` : `<span class="kbd">Д${j + 1}: …</span>`).join('<br>')}<br>${[...Array(m)].map((_, i) => yv(i + 1)).join(', ')} ≥ 0</div>`;
    const prim = () => cap2('Прямая задача (все «≤»)') + `<div class="sys">${objLine(pr)}<br>${res.norm.map((r, i) => `${rowLine(r)} <span class="kbd">(${i + 1}) ↔ ${yv(i + 1)}</span>`).join('<br>')}</div>`;
    if (flips.length) stages.push({ ch: 'Построение', vis: p => { p.innerHTML = cap2('Прямая задача') + system(pr); },
      q: `Задача на максимум, а ограничение (${flips[0].i + 1}) — «≥». Что делаем перед построением двойственной?`,
      opts: [O('Умножаем его на −1, чтобы все неравенства стали «≤»', true, 'Для пары «max, ≤, x ≥ 0» ↔ «min, ≥, y ≥ 0» неравенства прямой задачи приводят к «≤».'), O('Ничего, знак не важен', false, 'Знак важен: от него зависит знак двойственной переменной.'), O('Отбрасываем это ограничение', false, 'Ограничения не отбрасывают — изменится задача.')],
      sum: `Ограничени${flips.length > 1 ? 'я' : 'е'} ${flips.map(r => `(${r.i + 1})`).join(', ')} умножены на −1`, after: p => { p.innerHTML = prim(); } });
    stages.push({ ch: 'Построение', vis: p => { p.innerHTML = prim(); }, q: 'Сколько переменных у двойственной задачи?',
      opts: uniqOpts([O(String(m), true, `По одной yᵢ на каждое из ${m} ограничений.`), O(String(n), false, 'Переменным прямой задачи соответствуют ограничения двойственной.'), O(String(m + n), false, 'y — по ограничениям, а не по всем величинам сразу.')]), sum: `${m} переменных y` });
    stages.push({ ch: 'Построение', q: 'Какая цель у двойственной задачи?',
      opts: [O(`<i>g</i> = ${lin(D.c, i => yv(i + 1))} → min`, true, 'Коэффициенты — правые части ограничений, max меняется на min.'), O(`<i>g</i> = ${lin(D.c, i => yv(i + 1))} → max`, false, 'Направление меняется: max ↔ min.'), O(`<i>g</i> = ${lin(pr.c.slice(0, m).concat(Array(Math.max(0, m - n)).fill(Zq())).slice(0, m), i => yv(i + 1))} → min`, false, 'Коэффициенты цели g — правые части bᵢ, а не cⱼ.')],
      sum: 'g = Σ bᵢyᵢ → min', after: p => { p.innerHTML = prim() + cap2('Двойственная задача') + dualSys(0); } });
    const r0 = D.rows[0], rowA = res.norm[0].a.slice(0, m);
    stages.push({ ch: 'Построение', q: `Как выглядит ограничение Д1 (оно соответствует переменной x₁)?`,
      opts: uniqOpts([O(`${lin(r0.a, i => yv(i + 1))} ≥ ${fq(r0.b)}`, true, 'Коэффициенты — столбец при x₁, правая часть — c₁, знак «≥».'), O(`${lin(r0.a, i => yv(i + 1))} ≤ ${fq(r0.b)}`, false, 'Для max, «≤», x ≥ 0 ограничения двойственной — «≥».'),
        O(`${lin(rowA.concat(Array(Math.max(0, m - rowA.length)).fill(Zq())), i => yv(i + 1))} ≥ ${fq(r0.b)}`, false, 'Это строка первого ограничения. Ограничение Д1 строится по столбцу при x₁.')]),
      sum: 'Д1 — по столбцу x₁, знак «≥»', after: p => { p.innerHTML = prim() + cap2('Двойственная задача') + dualSys(n); } });
    const P = res.primal;
    if (P.status !== 'optimal') {
      const inf = P.status === 'infeasible';
      stages.push({ ch: 'Вывод', q: `Прямая задача: ${statusText(P.status)}. Что можно сказать о двойственной?`,
        opts: inf ? [O('Она либо несовместна, либо её цель не ограничена', true, `Расчёт: ${statusText(res.dualLP.status)}.`), O('У неё есть оптимум', false, 'Оптимумы есть либо у обеих задач, либо ни у одной.')]
          : [O('У неё нет допустимых решений', true, 'Иначе её допустимое решение ограничивало бы цель прямой задачи.'), O('Её цель тоже не ограничена', false, 'Обе задачи не могут быть неограниченными одновременно.')], sum: 'Вывод по теореме двойственности', end: true });
      return { end: 'Оптимумов нет.' };
    }
    const cs = res.cs, tight = cs.zeroY.map((z, i) => !z ? i + 1 : null).filter(Boolean), slack = cs.zeroY.map((z, i) => z ? i + 1 : null).filter(Boolean);
    const chk = `<table class="plain mini"><tr><th></th><th>левая часть</th><th></th><th>запас</th></tr>${res.norm.map((r, i) => `<tr><td>(${i + 1})</td><td class="m">${fq(r.b.sub(cs.slack[i]))}</td><td class="m">≤ ${fq(r.b)}</td><td class="m">${fq(cs.slack[i])}</td></tr>`).join('')}</table>`;
    const subsetText = a => a.length ? a.map(i => `(${i})`).join(', ') : 'ни одно';
    stages.push({ ch: 'Условия дополняющей нежёсткости', vis: p => { p.innerHTML = cap2(`Решение прямой задачи: x* = ${vec(P.x).replace(/<[^>]+>/g, '')}, f* = ${fq(P.f).replace(/<[^>]+>/g, '')}`) + chk + cap2('Двойственная задача') + dualSys(n); },
      q: 'Подставили x* в ограничения (таблица справа). Какие из них выполняются как равенства?',
      opts: uniqOpts([O(subsetText(tight), true, 'Запас 0 — ограничение выполняется как равенство.'), O(subsetText(slack), false, 'У этих ограничений запас больше нуля.'), O('все', false, 'Есть ограничения с положительным запасом.'), O('ни одно', false, 'Есть ограничения с нулевым запасом.')]),
      sum: `Равенства: ${subsetText(tight)}` });
    if (slack.length) stages.push({ ch: 'Условия дополняющей нежёсткости', q: `Ограничения ${subsetText(slack)} выполняются с запасом. Что это даёт?`,
      opts: [O(`${slack.map(i => yv(i)).join(', ')} = 0`, true, 'УДН: ресурс с запасом «ничего не стоит» — его двойственная оценка равна нулю.'), O(`${slack.map(i => yv(i)).join(', ')} &gt; 0`, false, 'Положительными могут быть только оценки ограничений-равенств.'), O('Ничего не следует', false, 'Следует: по УДН соответствующие y равны нулю.')],
      sum: `${slack.map(i => yv(i)).join(', ')} = 0` });
    const pos = P.x.map((v, j) => v.s > 0 ? j + 1 : null).filter(Boolean);
    if (pos.length) stages.push({ ch: 'Условия дополняющей нежёсткости', q: `В оптимуме ${pos.map(j => xv(j)).join(', ')} &gt; 0. Что это даёт?`,
      opts: [O(`Ограничения ${pos.map(j => 'Д' + j).join(', ')} выполняются как равенства`, true, 'УДН: если переменная прямой задачи положительна, сопряжённое ограничение двойственной — равенство.'), O(`${pos.map(j => yv(j)).join(', ')} = 0`, false, 'Индексы y относятся к ограничениям прямой задачи, а не к переменным x.'), O('Ничего не следует', false, 'Следует: соответствующие ограничения двойственной — равенства.')],
      sum: `${pos.map(j => 'Д' + j).join(', ')} — равенства`,
      after: p => { p.innerHTML = cap2('Система по УДН') + (cs.eqs.length ? `<div class="sys">${cs.eqs.map(e => `${lin(e.a, k => yv(cs.U[k] + 1))} = ${fq(e.b)}`).join('<br>')}</div>` : '<p>Уравнений нет.</p>') + `<p class="kbd">Остальные y = 0.</p>`; } });
    if (res.unique) stages.push({ ch: 'Решение', q: 'Решите систему (справа). Чему равен y*?',
      opts: uniqOpts([O(vec(res.y), true, `Подстановка: g = ${fq(res.g)}.`), O(vec(res.y.slice().reverse()), false, 'Порядок переменных перепутан.'), O(vec(res.y.map(v => v.neg())), false, 'Знаки не те: y должны быть ≥ 0.')]), sum: `y* = ${vec(res.y)}` });
    else stages.push({ ch: 'Решение', q: `Уравнений меньше, чем неизвестных (ранг ${cs.sol.rank} &lt; ${cs.U.length}). Что это значит?`,
      opts: [O('y определяется неоднозначно — оптимумов двойственной много (вершина прямой задачи вырожденная)', true, `Остальные ограничения учитывают как неравенства; одно из оптимальных решений: y* = ${vec(res.y)}.`), O('Двойственная задача не имеет решения', false, 'Решение есть — их даже бесконечно много.'), O('Ошибка в прямой задаче', false, 'Ошибки нет — это свойство вырожденной вершины.')],
      sum: `Оптимумов много, например y* = ${vec(res.y)}` });
    stages.push({ ch: 'Проверка', q: `Чему равно g* = ${lin(D.c, i => yv(i + 1))} в найденной точке?`,
      opts: uniqOpts([O(fq(res.g), true, `И это совпадает с f* = ${fq(P.f)} — первая теорема двойственности выполняется.`), O(fq(res.g.add(1)), false, 'Подставьте y* в цель g ещё раз.'), O(fq(res.g.neg()), false, 'Знак не тот.')]), sum: `g* = ${fq(res.g)} = f*` });
    return { end: `y* = ${vec(res.y)}, g* = ${fq(res.g)} = f*` };
  }

  /* Двойственная задача сборника (2.6): знаки по таблице соответствия. */
  function buildDualZ(pr, stages) {
    const P = ALGZ.normalize(pr), D = ALGZ.dualOf(P), max = P.sense === 'max';
    const known = { dir: false, rows: {}, ys: {} };
    const dualView = () => `<div class="sys"><i>g</i> = ${withC0(D, lin(D.c, i => yv(i + 1)))} → ${known.dir ? D.sense : '?'}<br>${D.rows.map((r, j) => `${lin(r.a, i => yv(i + 1))} ${known.rows[j] ? sg(r.s) : '<b class="qmark">?</b>'} ${fq(r.b)} <span class="kbd">(Д${j + 1})</span>`).join('<br>')}<br>${D.signs.map((s, i) => known.ys[i] ? (s === 'free' ? `${yv(i + 1)} — любого знака` : `${yv(i + 1)} ${sg(s)} 0`) : `${yv(i + 1)} <b class="qmark">?</b>`).join(', ')}</div>`;
    const prim = () => cap2('Исходная задача (после разбора условий на переменные)') + `<div class="sys">${objLine(P)}<br>${P.rows.map((r, i) => `${rowLine(r)} <span class="kbd">(${i + 1}) ↔ ${yv(i + 1)}</span>`).join('<br>')}<br>${P.signs.map((s, j) => s === 'free' ? `${xv(j + 1)} — любого знака` : `${xv(j + 1)} ${sg(s)} 0`).join(', ')}</div>`;
    const vis = p => { p.innerHTML = prim() + cap2('Двойственная задача') + dualView(); };
    (P.info || []).slice(0, 6).forEach(B => stages.push({ ch: 'Условия на переменные', vis: p => { p.innerHTML = cap2('Исходная задача') + `<div class="sys">${objLine(pr)}<br>${pr.rows.map(r => rowLine(r)).join('<br>')}<br>${pr.bounds.map(b => `${xv(b.j + 1)} ${sg(b.s)} ${fq(b.b)}`).join(', ')}</div>`; },
      q: `Условие ${xv(B.j + 1)} ${sg(B.s)} ${fq(B.b)} — что это при построении двойственной?`,
      opts: [O('Условие на знак переменной', B.kind === 'sign', B.kind === 'sign' ? 'Граница с нулём задаёт знак переменной.' : 'Условием на знак считаются только xⱼ ≥ 0 и xⱼ ≤ 0 (и только одно на переменную).'),
        O('Обычное ограничение — добавляем его строкой', B.kind === 'row', B.kind === 'row' ? 'Граница не с нулём (или повторная) — это обычное неравенство, у него будет своя yᵢ.' : 'Это условие на знак, отдельной строкой его не записывают.')],
      sum: `${xv(B.j + 1)} ${sg(B.s)} ${fq(B.b)} — ${B.kind === 'sign' ? 'знак' : 'ограничение'}` }));
    const free = P.signs.map((s, j) => s === 'free' ? j : -1).filter(j => j >= 0);
    if (free.length) stages.push({ ch: 'Условия на переменные', q: `У ${free.map(j => xv(j + 1)).join(', ')} нет условия на знак. Значит…`,
      opts: [O('Переменные любого знака', true, 'Без условия xⱼ ≥ 0 или xⱼ ≤ 0 переменная свободна; в двойственной ей соответствует ограничение-равенство.'), O('Неотрицательные по умолчанию', false, 'В этом разделе сборника условия на знак указаны явно — без условия переменная свободна.')], sum: 'Свободные: ' + free.map(j => xv(j + 1)).join(', ') });
    stages.push({ ch: 'Построение', vis, q: `Исходная задача на ${P.sense}. Направление цели двойственной?`,
      opts: [O(D.sense, true, 'Направление меняется на противоположное.'), O(P.sense, false, 'Направление всегда меняется: max ↔ min.')], sum: `g → ${D.sense}`, onOk: () => { known.dir = true; } });
    P.rows.slice(0, 7).forEach((r, i) => stages.push({ ch: 'Построение', vis, q: `Ограничение (${i + 1}) «${sg(r.s)}», задача на ${P.sense}. Какое условие на ${yv(i + 1)}?`,
      opts: [['>=', '≥ 0'], ['<=', '≤ 0'], ['free', 'любого знака']].map(([v, t]) => O(`${yv(i + 1)} ${t}`, D.signs[i] === v,
        r.s === '=' ? (v === 'free' ? 'Ограничению-равенству соответствует свободная переменная.' : 'Для «=» знак y не ограничен.')
          : v === D.signs[i] ? `Для задачи на ${P.sense} ограничению «${sg(r.s)}» соответствует ${yv(i + 1)} ${t}.` : `Правило для ${P.sense}: «${max ? '≤' : '≥'}» → y ≥ 0, «${max ? '≥' : '≤'}» → y ≤ 0, «=» → любого знака.`)),
      sum: `${yv(i + 1)}: ${D.signs[i] === 'free' ? 'любого знака' : sg(D.signs[i]) + ' 0'}`, onOk: () => { known.ys[i] = true; } }));
    P.signs.slice(0, 6).forEach((s, j) => stages.push({ ch: 'Построение', vis, q: `${s === 'free' ? `${xv(j + 1)} — любого знака` : `${xv(j + 1)} ${sg(s)} 0`}. Какой знак у ограничения Д${j + 1}?`,
      opts: [['>=', '≥'], ['<=', '≤'], ['=', '=']].map(([v, t]) => O(`«${t} ${fq(D.rows[j].b)}»`, D.rows[j].s === v,
        v === D.rows[j].s ? `Для задачи на ${P.sense}: x ≥ 0 → «${max ? '≥' : '≤'}», x ≤ 0 → «${max ? '≤' : '≥'}», свободная → «=».` : `Правило для ${P.sense}: x ≥ 0 → «${max ? '≥' : '≤'}», x ≤ 0 → «${max ? '≤' : '≥'}», свободная → «=».`)),
      sum: `Д${j + 1}: «${sg(D.rows[j].s)}»`, onOk: () => { known.rows[j] = true; } }));
    const sp = ALGZ.solve(P), sd = ALGZ.solve(D);
    const st = s => s.status === 'optimal' ? `оптимум ${fq(s.f)}` : statusText(s.status);
    stages.push({ ch: 'Проверка', vis: p => { Object.keys(P.rows).forEach(i => { known.ys[i] = true; }); P.signs.forEach((_, j) => { known.rows[j] = true; }); known.dir = true; vis(p); },
      q: `Решения: исходная — ${st(sp)}; двойственная — ${st(sd)}. Это согласуется с теорией?`,
      opts: [O('Да', true, sp.status === 'optimal' ? 'Оптимальные значения равны — первая теорема двойственности.' : sp.status === 'infeasible' ? 'Если исходная несовместна, двойственная несовместна или неограничена.' : 'Если цель исходной не ограничена, двойственная несовместна.'), O('Нет, значения должны отличаться', false, 'По теореме двойственности оптимумы равны (если существуют).')],
      sum: 'Согласуется с теоремами двойственности' });
    return { end: 'Двойственная задача построена.' };
  }

  function trainerFlow(type, pr, meta, opts = {}) {
    const id = 'tf' + Math.random().toString(36).slice(2, 8), stages = [];
    let plotHtml = '', info = { end: '' }, method = type;
    const api = () => { const w = document.querySelector(`#${id} .plotwrap`); return w && w.api; };
    try {
      if (type === 'graph') {
        const pr2 = (pr.n > 2 || pr.rows.some(r => r.s === '=')) ? ALGZ.reduce2(pr) : null, P = pr2 && pr2.ok && !pr2.contra.length ? pr2.pr2 : pr;
        if (P.n === 2) {
          const G = ALG.graph(P), N = q => q.toNumber();
          const cfg = { lines: P.rows.map((r, i) => ({ a: r.a.map(N), b: N(r.b), s: r.s, name: '(' + (i + 1) + ')', html: rowLine(r), eq: r.s === '=' })), f0: P.c0 ? N(P.c0) : 0,
            c: P.c.map(N), sense: P.sense, pts: G.verts.map(w => w.p.map(N)), ax: ['x₁', 'x₂'], unbounded: G.status === 'unbounded', status: G.status };
          if (G.status === 'optimal') { cfg.opt = G.optVertex.p.map(N); cfg.fval = N(G.f) - cfg.f0; cfg.optLabel = 'x*'; }
          plotHtml = plot(cfg);
        }
        info = buildGraph(pr, stages, api);
      } else if (type === 'simplex' && !meta.zyk) info = buildSimplex(pr, stages);
      else if (type === 'simplex' || type === 'artificial') { info = buildArtificial(pr, stages, type === 'artificial', !!meta.zyk); method = type === 'simplex' ? 'simplex' : 'artificial'; }
      else if (type === 'dual') { info = meta.zyk ? buildDualZ(pr, stages) : buildDualRGR(pr, stages); }
    } catch (e) { return sec('trainer', 'Тренажёр', `<div class="note bad">Тренажёр для этой задачи не построен: ${e.message}</div>`); }
    // вопросы по теории метода — в конце
    const bank = (QB[method] || []).slice().sort(() => Math.random() - 0.5).slice(0, 3);
    bank.forEach(qq => stages.push({ ch: 'Теория', q: qq.q, opts: qq.a.map(a => O(a[0], a[1], a[2])), sum: qq.a.find(a => a[1])[0] }));
    if (opts.collect) return { stages, info };   // для проверки содержимого тренажёра
    R.hooks.push(() => runFlow(id, stages, info, api));
    return sec('trainer', 'Тренажёр', `<div class="tf" id="${id}">
      <div class="tf-top"><div class="tf-title"><span class="tf-badge">Тренажёр</span> <span class="tf-chapter"></span></div><div class="tf-stats"><span class="tf-count"></span><span class="tf-err"></span><button class="btn tf-restart" title="Начать заново">↺ Заново</button></div></div>
      <div class="tf-bar"><div class="tf-fill"></div></div>
      <div class="tf-grid"><div class="tf-left"><div class="tf-done"></div><div class="tf-cur"></div></div>
        <div class="tf-right"><div class="tf-vis"></div>${plotHtml ? `<div class="tf-plot">${plotHtml}</div>` : ''}<div class="tf-extra"></div></div></div>
      <div class="kbd tf-keys">Клавиши: 1–4 — выбрать ответ, Enter — дальше.</div></div>`);
  }

  /* Движок тренажёра: этапы по одному, прогресс, ошибки, финал с салютом. */
  function runFlow(id, stages, info, api) {
    const root = document.getElementById(id); if (!root) return;
    const vis = root.querySelector('.tf-right'), cur = root.querySelector('.tf-cur'), done = root.querySelector('.tf-done');
    const N = stages.length;
    let i = 0, errs = 0, order = [], answered = false;
    const prep = () => stages.forEach(s => { s._opts = null; });
    const optsOf = s => { if (!s._opts) { const raw = typeof s.opts === 'function' ? s.opts() : s.opts; const last = raw.filter(o => /^(Ни|Никакая|Ничего|нигде|Нигде)/.test(o.t.replace(/<[^>]+>/g, ''))); const rest = raw.filter(o => !last.includes(o)).sort(() => Math.random() - 0.5); s._opts = [...rest, ...last]; } return s._opts; };
    const head = () => {
      root.querySelector('.tf-fill').style.width = `${Math.round(100 * i / N)}%`;
      root.querySelector('.tf-count').textContent = i < N ? `Шаг ${i + 1} из ${N}` : `Готово: ${N} из ${N}`;
      root.querySelector('.tf-err').innerHTML = `Ошибок: <b>${errs}</b>`;
      root.querySelector('.tf-chapter').textContent = i < N ? stages[i].ch : 'Итог';
    };
    const show = () => {
      head(); answered = false;
      if (i >= N) return finish();
      const s = stages[i];
      if (s.vis) s.vis(vis);
      const os = optsOf(s);
      cur.innerHTML = `<div class="tf-card reveal"><div class="tf-ch">${s.ch}</div><div class="tf-q">${s.q}</div><div class="tf-opts">${os.map((o, k) => `<button class="tf-opt" data-k="${k}"><span class="tf-let">${k + 1}</span><span class="tf-t">${o.t}</span></button>`).join('')}</div><div class="tf-msg"></div></div>`;
      cur.querySelectorAll('.tf-opt').forEach(b => b.onclick = () => pick(+b.dataset.k));
    };
    const pick = kk => {
      if (answered) return;
      const s = stages[i], o = optsOf(s)[kk], b = cur.querySelector(`.tf-opt[data-k="${kk}"]`), msg = cur.querySelector('.tf-msg');
      if (!b || b.disabled) return;
      msg.classList.remove('pop'); void msg.offsetWidth; msg.classList.add('pop');
      if (o.ok) {
        answered = true; b.classList.add('right'); cur.querySelectorAll('.tf-opt').forEach(x => { x.disabled = true; });
        msg.className = 'tf-msg ok pop'; msg.innerHTML = `<b>Верно.</b> ${o.why}<div class="btnrow"><button class="btn primary tf-next">${i < N - 1 ? 'Дальше →' : 'Завершить'}</button></div>`;
        msg.querySelector('.tf-next').onclick = next;
        if (s.onOk) s.onOk();
        if (s.vis && s.onOk) s.vis(vis);
        if (s.after) s.after(vis);
      } else {
        errs++; s._err = (s._err || 0) + 1; b.classList.add('wrong'); b.disabled = true;
        msg.className = 'tf-msg bad pop'; msg.innerHTML = `<b>Нет.</b> ${o.why}`; head();
      }
    };
    const next = () => {
      const s = stages[i];
      done.insertAdjacentHTML('beforeend', `<div class="tf-dline${s._err ? ' had' : ''}"><span class="tf-ok">✓</span> <span class="tf-dch">${s.ch}</span> ${s.sum || ''}${s._err ? ` <span class="tf-de">ошибок: ${s._err}</span>` : ''}</div>`);
      i = s.end ? N : i + 1;
      show();
      cur.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    const finish = () => {
      root.querySelector('.tf-fill').style.width = '100%';
      const perfect = errs === 0;
      cur.innerHTML = `<div class="tf-card tf-end reveal ${perfect ? 'perfect' : ''}"><div class="tf-big">${perfect ? 'Без единой ошибки!' : 'Задача решена'}</div><div class="tf-res">${info.end || ''}</div>
        <div class="tf-sub">${perfect ? 'Все решения приняты верно с первой попытки.' : `Ошибок: ${errs}. Пройдите ещё раз — без ошибок будет салют.`}</div>
        <div class="btnrow"><button class="btn primary tf-again">↺ Пройти ещё раз</button><button class="btn tf-full">Показать полное решение</button></div></div>`;
      cur.querySelector('.tf-again').onclick = restart;
      cur.querySelector('.tf-full').onclick = () => document.dispatchEvent(new CustomEvent('trainer-off'));
      if (perfect) fireworks();
    };
    const restart = () => { i = 0; errs = 0; stages.forEach(s => { s._err = 0; s._opts = null; }); done.innerHTML = ''; vis.querySelector('.tf-extra') && (vis.querySelector('.tf-extra').innerHTML = ''); const a = api(); if (a) a.set({ mode: 'region', hl: [], hideOpt: true, hideGrad: true, lvl: null }); show(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    root.querySelector('.tf-restart').onclick = restart;
    const onKey = e => {
      if (!document.body.contains(root)) { document.removeEventListener('keydown', onKey); return; }
      if (e.target.closest && e.target.closest('input,select,textarea')) return;
      if (/^[1-6]$/.test(e.key) && i < N) { pick(+e.key - 1); e.preventDefault(); }
      else if (e.key === 'Enter' && answered) { next(); e.preventDefault(); }
    };
    document.addEventListener('keydown', onKey);
    prep();
    if (api()) api().set({ mode: 'steps', step: 2, hideOpt: true, hideGrad: true, lvl: null, hl: [] });
    show();
  }

  /* Салют при прохождении без ошибок. */
  function fireworks() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.createElement('canvas'); cv.className = 'fw'; document.body.appendChild(cv);
    const ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
    const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }; size();
    const COLORS = ['#3b4cca', '#e8456b', '#f4a300', '#1f9d6b', '#7b3fc4', '#0a8aa8'];
    const parts = [], rockets = [];
    const launch = () => rockets.push({ x: (0.15 + 0.7 * Math.random()) * cv.width, y: cv.height, vy: -(9 + Math.random() * 4) * dpr, ty: (0.15 + 0.35 * Math.random()) * cv.height, c: COLORS[Math.floor(Math.random() * COLORS.length)] });
    const burst = (x, y, c) => { for (let k = 0; k < 70; k++) { const a = Math.random() * Math.PI * 2, v = (1.5 + Math.random() * 4.5) * dpr; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: Math.random() < 0.25 ? '#fff' : c }); } };
    let t0 = performance.now(), last = 0;
    const tick = now => {
      const t = now - t0;
      if (t < 2600 && now - last > 280) { launch(); last = now; }
      ctx.clearRect(0, 0, cv.width, cv.height);
      rockets.forEach((r, k) => { r.y += r.vy; ctx.fillStyle = r.c; ctx.fillRect(r.x - 1.5 * dpr, r.y, 3 * dpr, 9 * dpr); if (r.y <= r.ty) { burst(r.x, r.y, r.c); rockets.splice(k, 1); } });
      for (let k = parts.length - 1; k >= 0; k--) { const p = parts[k]; p.x += p.vx; p.y += p.vy; p.vy += 0.06 * dpr; p.vx *= 0.985; p.life -= 0.012; if (p.life <= 0) { parts.splice(k, 1); continue; } ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 * dpr, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (t < 6000 && (t < 2600 || parts.length || rockets.length)) requestAnimationFrame(tick); else cv.remove();
    };
    requestAnimationFrame(tick);
  }

  /* =====================================================================
     Раздел 2.5: двойственный симплекс-метод. Анимации строятся по трассе ALGD.solve.
     ===================================================================== */
  const fqM = v => {
    if (!(v instanceof QM)) return fq(v);
    if (!v.hasM()) return fq(v.a);
    const mp = (v.m.eq(ONE()) ? '' : v.m.eq(ONE().neg()) ? '−' : fq(v.m)) + '<i class="bm">M</i>';
    return v.a.isZero() ? mp : mp + (v.a.s < 0 ? ' − ' : ' + ') + fq(v.a.abs());
  };
  const parM = v => (v instanceof QM ? v.hasM() || v.a.s < 0 : v.s < 0) ? '(' + fqM(v) + ')' : fqM(v);
  const dualRz = pr => s => { const v = pr.sense === 'max' ? s.z.b : s.z.b.neg(); return pr.c0 ? v.add(pr.c0) : v; };
  const dsNeg = (A, cells, ok) => A.each(cells, async c => { A.cls(c, 'k-act'); await A.wait(70); A.cls(c, 'k-act', false); A.cls(c, ok ? 'k-ok' : 'k-del'); });

  /* Выбор выходящей строки и входящего столбца (шаг 'D'): после него pivotSpec рисует пересчёт таблицы. */
  const dualSel = s => async (A, X) => {
    const { C, V, fm, rowAll, colAll, enter, leave, piv, cols, m, zl } = X, p = s.p, q = s.q, vars = s.vars, f = fqM, row = s.rows[p];
    const pc = j => C('tO', p, j), rrc = j => A.q(`.tO td.rr[data-j="${j}"]`), rrv = j => A.q(`.tO td.rr[data-j="${j}"] .cv`);
    const bCells = s.rows.map((_, i) => C('tO', i, -1));
    // 1. отрицательные b
    A.cap(`Смотрим на столбец b: отрицательное b — базисная переменная меньше нуля, такой базис недопустим`);
    A.cls(bCells, 'k-dim');
    await A.each(s.inf, async i => { A.cls(C('tO', i, -1), 'k-dim', false); A.cls(C('tO', i, -1), 'k-act'); await A.pulse(V('tO', i, -1)); await A.wait(100); });
    // 2. выходящая строка
    const tie = s.bland ? ' (повтор базиса — правило Бленда: берём меньший номер переменной)' : s.tieRows.length ? ' (такое b в нескольких строках — берём меньший номер переменной)' : '';
    A.cap(s.inf.length > 1 ? `Выходит переменная с самым отрицательным b = ${f(row.b)} — это ${leave}${tie}` : `Единственное отрицательное b = ${f(row.b)} — выходит ${leave}`);
    A.cls(bCells, 'k-dim', false); A.cls(s.inf.map(i => C('tO', i, -1)), 'k-act', false);
    A.cls(rowAll(p), 'k-sel');
    await A.pulse(V('tO', p, 'bas'));
    A.set(fm, `<span class="fmh">${leave} = ${f(row.b)} &lt; 0 — недопустимо; остальные строки с b ≥ 0 исправлять не нужно</span>`);
    // 3. кандидаты: отрицательные числа в выбранной строке
    A.cap(`В строке ${leave} ищем отрицательные числа: ведущий элемент обязан быть отрицательным — тогда b ÷ (отрицательное) станет положительным`);
    A.cls(cols.map(pc), 'k-dim');
    await A.each(s.negs, async j => { A.cls(pc(j), 'k-dim', false); A.cls(pc(j), 'k-act'); await A.pulse(V('tO', p, j)); await A.wait(100); });
    A.set(fm, `<span class="fmh">числа ≥ 0 в этой строке не годятся: после деления на них b остался бы отрицательным</span>`);
    // 4. отношения θ = d ÷ |a|
    A.cap(`Для каждого такого столбца считаем θ = d ÷ |a|: d — число строки ${zl} над ним, a — число выбранной строки`);
    await A.each(cols, async j => {
      const r = rrv(j);
      if (s.ratios[j]) {
        A.cls([C('tO', m, j), pc(j)], 'k-act');
        await Promise.all([A.fly(V('tO', m, j), r), A.fly(V('tO', p, j), r)]);
        A.set(r, `${f(s.z.a[j])} ÷ ${f(row.a[j].abs())} = <b>${f(s.ratios[j])}</b>`); await A.pop(r, { d: 300 });
        A.cls([C('tO', m, j), pc(j)], 'k-act', false);
      } else { A.set(r, `${f(row.a[j])} ≥ 0 — не берём`); await A.pop(r, { d: 220 }); A.cls(rrc(j), 'k-dim'); }
    });
    // 5. наименьшее θ
    const mn = s.ratios[q], others = s.negs.filter(j => j !== q);
    A.cls(cols.map(pc), 'k-dim', false);
    A.cap(s.tieCols.length ? `Наименьшее θ = ${f(mn)} у нескольких столбцов — берём с меньшим номером: ${enter}` : `Наименьшее θ = ${f(mn)} — столбец ${enter} входит в базис`);
    others.forEach(j => A.cls(rrc(j), 'k-dim')); A.cls(rrc(q), 'k-ok');
    A.cls(colAll(q), 'k-sel');
    await A.pulse(rrv(q));
    A.set(fm, `<span class="fmh">${enter} входит в базис: только при наименьшем θ все числа строки ${zl} остаются ≥ 0 (двойственная допустимость сохраняется)</span>`);
    // 6. почему не другие столбцы
    for (const j of others) {
      const dq = s.z.a[q].sub(s.ratios[j].mul(row.a[q].abs()));
      A.cls(rrc(j), 'k-dim', false); A.cls(rrc(j), 'k-act');
      if (dq.s < 0) {
        A.cap(`Почему не ${vK(vars, j)}: θ = ${f(s.ratios[j])} больше — тогда число строки ${zl} в столбце ${enter} стало бы ${f(s.z.a[q])} − ${f(s.ratios[j])}·${f(row.a[q].abs())} = ${f(dq)} < 0`);
        A.cls(C('tO', m, q), 'k-del');
      } else A.cap(`${vK(vars, j)}: такое же θ = ${f(s.ratios[j])} — тоже годится (получится d = 0), берём меньший номер`);
      await A.pulse(rrv(j)); await A.wait(150);
      A.cls(rrc(j), 'k-act', false); A.cls(rrc(j), 'k-dim'); A.cls(C('tO', m, q), 'k-del', false);
    }
    // 7. ведущий элемент
    A.cap(`Пересечение выбранных строки и столбца — ведущий элемент ${f(piv)} (отрицательный)`);
    A.cls(C('tO', p, q), 'k-pe'); await A.pulse(V('tO', p, q));
    A.set(fm, `<span class="fmh">ведущий элемент = <b>${f(piv)}</b></span>`);
  };

  /* Вспомогательный шаг: строка M делает таблицу двойственно допустимой. */
  const mSel = s => async (A, X) => {
    const { C, V, fm, rowAll, colAll, enter, piv, cols, m, zl } = X, p = s.p, q = s.q, vars = s.vars, f = fqM;
    A.cap(`В строке ${zl} есть отрицательные d: ${s.cand.map(j => `${plain(vname(vars, j))}: ${plain(f(s.z.a[j]))}`).join(', ')} — таблица не двойственно допустима`);
    A.cls(cols.map(j => C('tO', m, j)), 'k-dim');
    await A.each(s.cand, async j => { A.cls(C('tO', m, j), 'k-dim', false); A.cls(C('tO', m, j), 'k-del'); await A.pulse(V('tO', m, j)); });
    A.set(fm, `<span class="fmh bad">обычный поворот здесь не сохранил бы d ≥ 0 — вводим ограничение «Σ небазисных ≤ M»</span>`);
    A.cap(`Ведущая строка — добавленная строка M: Σ небазисных переменных + ${vname(vars, s.basis[p])} = M`);
    A.cls(rowAll(p), 'k-sel'); await A.pulse(V('tO', p, 'bas'));
    A.cap(`Ведущий столбец — с самым отрицательным d: ${f(s.z.a[q])}, это ${enter}`);
    A.cls(cols.map(j => C('tO', m, j)), 'k-dim', false); A.cls(colAll(q), 'k-sel'); await A.pulse(V('tO', m, q));
    A.set(fm, `<span class="fmh">после поворота на этот столбец все d станут ≥ 0 (двойственная допустимость восстановится)</span>`);
    A.cap(`Ведущий элемент — ${f(piv)} (строка M, столбец ${enter})`);
    A.cls(C('tO', p, q), 'k-pe'); await A.pulse(V('tO', p, q));
  };

  /* Итоговая таблица: критерии завершения и особые случаи. */
  function dualEndSpec(pr, res, s) {
    const m = s.rows.length, vars = s.vars, cols = s.cols, zl = zlab(s.z.label), f = fqM, T = s.terminal;
    const html = `<div class="pvwrap one"><div>${dtb(s, { cls: 'tO', fq: fqM })}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const { C, V } = sceneTools(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      await A.wait(250);
      if (T === 'infeasible') {
        const p = s.p, row = s.rows[p], leave = vK(vars, s.basis[p]);
        A.cap(`Строка ${leave}: b = ${f(row.b)} < 0 — переменная должна стать неотрицательной`);
        A.cls([C('tO', p, 'bas'), C('tO', p, -1), ...cols.map(j => C('tO', p, j))], 'k-sel'); await A.pulse(V('tO', p, -1));
        A.cap('Ищем в этой строке отрицательное число для ведущего элемента');
        await A.each(cols, async j => { A.cls(C('tO', p, j), 'k-act'); await A.wait(70); A.cls(C('tO', p, j), 'k-act', false); if (row.a[j].s >= 0) A.cls(C('tO', p, j), 'k-del', true); });
        A.cap('Все числа строки ≥ 0 — ведущего элемента нет, поворот невозможен');
        A.set(fm, `<span class="fmh bad">${lin(row.a, j => vK(vars, j))} = ${f(row.b)}</span>`); await A.pulse(fm);
        A.cap(`Все переменные ≥ 0 и все коэффициенты ≥ 0, значит левая часть ≥ 0, а правая равна ${plain(f(row.b))} < 0 — равенство невозможно`);
        sum.innerHTML = `<b>Допустимых решений нет.</b> Ограничение, выраженное строкой ${leave}, несовместно с условием x ≥ 0${res.bound ? ' (добавленная строка M лишь сужает область, так что и исходная задача несовместна)' : ''}.`;
        await A.show(sum);
        return;
      }
      if (T === 'cycle') {
        A.cap('Лимит итераций исчерпан — метод не завершился');
        sum.innerHTML = '<b>Алгоритм не смог завершиться (зацикливание).</b>'; await A.show(sum); return;
      }
      A.cap('Проверяем столбец b: допустимость — все b ≥ 0' + (res.bound ? ' (при достаточно большом M)' : ''));
      await dsNeg(A, s.rows.map((_, i) => C('tO', i, -1)), true);
      A.cap(`Проверяем строку ${zl}: двойственная допустимость — все d ≥ 0`);
      await dsNeg(A, cols.map(j => C('tO', m, j)), true);
      A.cap('Отрицательных b нет и все d ≥ 0 — решение допустимо и оптимально, метод останавливается');
      A.set(fm, `<span class="fmh ok">допустимость (b ≥ 0) + оптимальность (d ≥ 0) ⇒ ответ найден</span>`); await A.pulse(fm);
      if (res.bound) {
        const zb = s.z.b;
        if (res.status === 'unbounded') {
          A.cap(`Но значение цели в b строки ${zl} зависит от M: ${plain(f(zb))}`);
          A.cls(C('tO', m, -1), 'k-del'); await A.pulse(V('tO', m, -1));
          A.set(fm, `<span class="fmh bad">${zl} = ${f(zb)}: чем больше M, тем лучше цель — предела нет</span>`); await A.pulse(fm);
          A.cap('Ограничение «Σ небазисных ≤ M» оказалось существенным: исходная задача не ограничена');
          sum.innerHTML = `<b>Целевая функция не ограничена.</b> При любом M найдётся допустимая точка, в которой цель лучше; допустимые x(M) = (${[...Array(pr.n).keys()].map(j => { const i = s.basis.indexOf(j); return i < 0 ? '0' : f(s.rows[i].b); }).join('; ')}).`;
          await A.show(sum);
          return;
        }
        A.cap(`Значение цели ${plain(f(zb))} не содержит M — ограничение M не мешало: найден оптимум исходной задачи`);
        A.cls(C('tO', m, -1), 'k-ok');
      }
      A.cap('Читаем решение: базисная переменная равна своему b, остальные — 0');
      await A.each(s.rows.map((_, i) => i), async i => { A.cls([C('tO', i, 'bas'), C('tO', i, -1)], 'k-sel'); await A.pulse(V('tO', i, -1)); });
      const T2 = res.table;
      sum.innerHTML = `${s.basis.map((bj, i) => `${vK(vars, bj)} = ${f(T2.rows[i].b)}`).join(', ')}; остальные переменные = 0. &nbsp;<b>${zName(s)}</b> = ${fq(res.f)}`;
      await A.show(sum);
      if (res.alt.length) {
        A.cap(`Под ${res.alt.map(j => vK(vars, j)).join(', ')} в строке ${zl} стоит 0 — есть и другие оптимальные решения`);
        A.cls(res.alt.map(j => C('tO', m, j)), 'k-act'); await A.seq(res.alt, 100, j => A.pulse(V('tO', m, j)));
      }
      const zb = s.basis.filter((bj, i) => T2.rows[i].b.isZero() && !(res.bound && bj === res.bound.slackVar));
      if (zb.length) {
        A.cap(`Базисная ${zb.map(j => vK(vars, j)).join(', ')} равна 0 — решение вырожденное`);
        s.rows.forEach((r, i) => { if (T2.rows[i].b.isZero()) A.cls(C('tO', i, -1), 'k-act'); });
      }
    };
    return { html, script, opts: {} };
  }

  function dualScene(pr, res, k) {
    const steps = res.steps, s = steps[k];
    if (s.kind === 'end') {
      const title = s.terminal === 'infeasible' ? 'ограничение несовместно' : s.terminal === 'cycle' ? 'зацикливание' : res.status === 'unbounded' ? 'неограниченность' : 'проверка оптимальности';
      return { title: `Таблица ${k}: ${title}`, ...dualEndSpec(pr, res, s) };
    }
    const sp = pivotSpec(s, steps[k + 1], { dual: true, sel: s.kind === 'M' ? mSel(s) : dualSel(s), fq: fqM, par: parM, realZ: dualRz(pr) });
    return { title: s.kind === 'M' ? `Шаг ${k + 1}: строка M, таблица ${k} → таблица ${k + 1}` : `Как пересчитать таблицу на шаге ${k + 1}?`, ...sp };
  }

  /* Пошаговый просмотр: кнопки таблиц + анимация выбранного шага. */
  function dstepper(pr, res) {
    const id = 'ds' + (++dmUid), steps = res.steps;
    R.hooks.push(() => {
      const root = document.getElementById(id); if (!root) return;
      const box = root.querySelector('.ds-demo'); let k = 0, ctl = null;
      const show = (kk, quiet) => {
        k = kk; if (ctl) { ctl.dispose(); ctl = null; }
        root.querySelectorAll('.ds-btn').forEach((b, i) => b.classList.toggle('on', i === k));
        root.querySelector('.ds-prev').disabled = k === 0; root.querySelector('.ds-next').disabled = k === steps.length - 1;
        const sc = dualScene(pr, res, kk);
        ctl = mountInto(box, sc.title, sc.html, sc.script, { ...sc.opts, autoplay: !quiet });
      };
      root.querySelector('.ds-prev').onclick = () => k > 0 && show(k - 1);
      root.querySelector('.ds-next').onclick = () => k < steps.length - 1 && show(k + 1);
      root.querySelectorAll('.ds-btn').forEach((b, i) => { b.onclick = () => show(i); });
      show(0, true);
    });
    return `<div class="stepper dsteps" id="${id}"><div class="btnrow"><button class="btn ds-prev">← Назад</button>${steps.map((_, i) => `<button class="btn ds-btn" title="таблица ${i}">${i}</button>`).join('')}<button class="btn ds-next">Вперёд →</button></div><div class="ds-demo"></div></div>`;
  }

  const dualHint = s => s.kind === 'M' ? `добавлена строка M; входит ${vname(s.vars, s.q)} (самое отрицательное d = ${fqM(s.z.a[s.q])}), выходит ${vname(s.vars, s.basis[s.p])}, ведущий элемент ${fqM(s.rows[s.p].a[s.q])}`
    : s.kind === 'D' ? `выходит ${vname(s.vars, s.basis[s.p])} (b = ${fqM(s.rows[s.p].b)}), входит ${vname(s.vars, s.q)} (θ = ${fqM(s.ratios[s.q])}), ведущий элемент ${fqM(s.rows[s.p].a[s.q])}`
    : s.terminal === 'infeasible' ? ` — строка ${vname(s.vars, s.basis[s.p])}: b &lt; 0, отрицательных чисел нет, допустимых решений нет` : s.terminal === 'cycle' ? ' — лимит итераций' : ' — итоговая (все b ≥ 0, все d ≥ 0)';
  const dAllTables = res => res.steps.map((s, i) => `<div class="tcap">Таблица ${i}${s.kind === 'end' ? '' : ' — '}${dualHint(s)}</div>${dtb(s, { fq: fqM, hl: true })}`).join('');

  /* Строки рабочей формы → стартовая таблица: откуда взялось каждое число. */
  function demoDForm(pr, res) {
    const prep = res.prep, st0 = prep.base, work = prep.work, m = work.length, vars = st0.vars, cols = st0.cols, max = pr.sense === 'max', n = pr.n;
    const sfx = w => w.kind === 'eq-le' ? '′' : w.kind === 'eq-ge' ? '″' : '';
    const lineHtml = (w, t) => { const r = pr.rows[w.src]; return `<div class="drow dfr${w.kind === 'eq-ge' ? ' dh' : ''}" data-t="${t}"><span class="kbd">(${w.src + 1}${sfx(w)})</span> <span class="lhs">${eqTerms(r.a, xlab)}</span><span class="ex ex-s"></span> <span class="rs">${sg(r.s)}</span> <span class="rb">${fq(r.b)}</span></div>`; };
    const leg = '<div class="vleg"><span class="vk-x">● исходные переменные</span><span class="vk-s">■ добавляем остатки</span></div>';
    const html = `${leg}<div class="pvwrap"><div><div class="dmh">условие → равенства</div>${objLine2(pr)}${work.map(lineHtml).join('')}</div><div><div class="dmh">таблица двойственного симплекса</div>${dtb(st0, { cls: 'tN', blank: true, blankZ: true, fq: fqM })}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const { C, V, H } = sceneTools(A), fm = A.q('.pvfm'), sum = A.q('.pvsum'), line = t => A.q(`.dfr[data-t="${t}"]`);
      A.cls(cols.map(j => H('tN', j)), 'dh');
      work.forEach((w, t) => A.set(V('tN', t, 'bas'), ''));
      await A.wait(250);
      A.cap('Столбцы таблицы — переменные: исходные x и добавочные, которые появятся ниже');
      await A.seq(cols, 80, j => A.pop(H('tN', j), { d: 300 }));
      for (let t = 0; t < m; t++) {
        const w = work[t], rw = line(t), r = pr.rows[w.src], i1 = w.src + 1, tag = `${i1}${sfx(w)}`;
        let lhs = rw.querySelector('.lhs'); const rs = rw.querySelector('.rs'), rb = rw.querySelector('.rb'), ex = rw.querySelector('.ex-s');
        const eff = w.kind === 'eq-le' ? '<=' : w.kind === 'eq-ge' ? '>=' : r.s;
        A.cls(rw, 'on');
        if (w.kind === 'eq-le') {
          A.cap(`(${i1}) — равенство, и ни одна переменная не стоит только в нём: готового базиса нет. Заменяем равенство двумя неравенствами: «≤» и «≥»`);
          const rw2 = line(t + 1); await A.pop(rw2);
          await Promise.all([A.swap(rs, '≤', 420), A.swap(rw2.querySelector('.rs'), '≥', 420)]);
        }
        if (eff === '>=') {
          A.cap(`(${tag}) «≥»: умножаем на −1 — знак станет «≤», все числа сменят знак`);
          await Promise.all([A.swap(lhs, eqTerms(r.a.map(v => v.neg()), xlab), 520), A.swap(rs, '≤', 520), A.swap(rb, fq(r.b.neg()), 520)]);
        }
        if (w.slack) {
          A.cap(`(${tag}) «≤»: прибавляем остаток ${vK(vars, w.slackVar)} ≥ 0 — получаем равенство`);
          ex.innerHTML = `&nbsp;+&nbsp;${vK(vars, w.slackVar)}`; ex.classList.add('vk-s'); await A.pop(ex);
          await A.swap(rs, '=', 420);
        } else {
          const bt = lhs.querySelector(`.tw[data-j="${w.basic}"]`);
          A.cap(`(${i1}) — равенство: переменная ${vK(vars, w.basic)} входит только в него, её делаем базисной${w.cands && w.cands.length > 1 ? ` (кандидаты: ${w.cands.map(j => plain(vname(vars, j))).join(', ')}; берём ту, при которой все d остаются ≥ 0)` : ''}`);
          A.cls(bt, 'k-sel'); await A.pulse(bt);
          if (!w.mult.eq(ONE())) {
            A.cap(`Делим равенство на ${plain(par(r.a[w.basic]))}, чтобы при ${vK(vars, w.basic)} стояла единица`);
            await Promise.all([A.swap(lhs, eqTerms(r.a.map(v => v.mul(w.mult)), xlab), 520), A.swap(rb, fq(r.b.mul(w.mult)), 520)]);
          }
        }
        lhs = rw.querySelector('.lhs');
        // перенос в таблицу
        A.cap(`Строку (${tag}) записываем в таблицу: каждое число — в столбец своей переменной`);
        const bj = st0.basis[t], row = st0.rows[t];
        await A.put(w.slack ? ex : lhs.querySelector(`.tw[data-j="${w.basic}"]`), V('tN', t, 'bas'), vK(vars, bj));
        for (const j of cols) {
          const cell = V('tN', t, j), tw = j < n ? lhs.querySelector(`.tw[data-j="${j}"]`) : null;
          if (tw) await A.put(tw, cell, fqM(row.a[j]), { d: 450 });
          else if (w.slack && j === w.slackVar) await A.put(ex, cell, fqM(row.a[j]), { d: 450 });
          else { A.set(cell, fqM(row.a[j])); A.cls(C('tN', t, j), 'zc'); await A.pop(cell, { d: 160 }); }
        }
        await A.put(rb, V('tN', t, -1), fqM(row.b), { d: 450 });
        A.cls(rw, 'on', false); A.cls(rw, 'done');
      }
      // строка цели
      const ob = A.q('.cnobj'), z = prep.raw, zl = plain(zlab(z.label));
      A.cap(max ? `Цель f → max заменяем на g = −f → min: в строку ${zl} переносим коэффициенты цели с обратным знаком` : `Цель f → min: в строку ${zl} переносим коэффициенты цели как есть`);
      A.cls(ob, 'on');
      await A.put(A.q('.cnobj .gs'), V('tN', m, 'bas'), zlab(z.label));
      for (const j of cols) {
        const cell = V('tN', m, j), tw = j < n ? ob.querySelector(`.tw[data-j="${j}"]`) : null;
        if (tw) {
          await A.put(tw, cell, fq(pr.c[j]), { d: 450 });
          if (max) { A.cls(C('tN', m, j), 'k-act'); await A.swap(cell, fqM(z.a[j]), 480); A.cls(C('tN', m, j), 'k-act', false); }
        } else { A.set(cell, fqM(z.a[j])); A.cls(C('tN', m, j), 'zc'); await A.pop(cell, { d: 160 }); }
      }
      A.set(V('tN', m, -1), fqM(z.b)); await A.pop(V('tN', m, -1), { d: 200 });
      A.cls(ob, 'on', false);
      if (pr.c0 && !pr.c0.isZero()) A.cap(`Свободный член цели ${plain(fq(pr.c0))} в таблицу не входит — прибавим его к ответу`);
      // приведение строки цели к базису
      let zc = z;
      if (!prep.elim.length) {
        A.cap('Под базисными переменными в строке цели уже нули — приводить её к базису не нужно');
        A.cls(st0.basis.map(bj => C('tN', m, bj)), 'k-ok');
      }
      for (const e of prep.elim) {
        const kk = zc.a[e.bj], row = st0.rows[e.i], nb = { b: zc.b.sub(row.b.scale(kk)), a: zc.a.map((v, j) => v.sub(kk.mul(row.a[j]))) };
        A.cap(`Под базисной ${plain(vname(vars, e.bj))} в строке ${zl} стоит ${plain(fq(kk))}, а должен быть 0`);
        A.cls(C('tN', m, e.bj), 'k-del'); A.cls(['bas', -1, ...cols].map(j => C('tN', e.i, j)), 'k-sel'); await A.pulse(V('tN', m, e.bj));
        A.cap(`Вычитаем из строки ${zl} строку ${plain(vname(vars, e.bj))}, умноженную на ${plain(fq(kk))}`);
        for (const j of [-1, ...cols]) {
          const old = j < 0 ? zc.b : zc.a[j], nw = j < 0 ? nb.b : nb.a[j], cellv = j < 0 ? row.b : row.a[j];
          A.set(fm, `<span class="fmh"><span class="fo">□</span> − <span class="fk">□</span> × <span class="fn">□</span> = <b class="calc-result">□</b></span>`);
          A.cls(C('tN', m, j), 'k-act');
          await A.put(V('tN', m, j), A.q('.pvfm .fo'), fqM(old), { d: 420 });
          await A.put(V('tN', m, e.bj), A.q('.pvfm .fk'), parM(kk), { d: 420 });
          await A.put(V('tN', e.i, j), A.q('.pvfm .fn'), parM(cellv), { d: 420 });
          await A.swap(A.q('.pvfm .calc-result'), fqM(nw), 360);
          await A.fly(A.q('.pvfm .calc-result'), V('tN', m, j), null, { d: 450 });
          A.set(V('tN', m, j), fqM(nw)); await A.pop(V('tN', m, j), { d: 220 });
          A.cls(C('tN', m, j), 'k-act', false);
        }
        zc = nb; A.cls(['bas', -1, ...cols].map(j => C('tN', e.i, j)), 'k-sel', false); A.cls(C('tN', m, e.bj), 'k-del', false); A.cls(C('tN', m, e.bj), 'k-ok');
      }
      A.set(fm, '');
      A.cap('Таблица готова: базисная переменная равна своему b, остальные переменные равны 0');
      sum.innerHTML = `Базис: ${st0.basis.map((bj, i) => `${vK(vars, bj)} = ${fqM(st0.rows[i].b)}`).join(', ')}; остальные = 0. &nbsp;${zlab(st0.z.label)}: b = ${fqM(st0.z.b)}`;
      await A.show(sum);
    };
    return demo('Как составить первую таблицу по условию?', html, script);
  }

  /* Проверка стартовой таблицы: d ≥ 0 и знаки b. */
  function demoDStart(pr, res) {
    const st = res.base, m = st.rows.length, cols = st.cols, vars = st.vars, zl = zlab(st.z.label);
    const negB = st.rows.map((r, i) => r.b.s < 0 ? i : -1).filter(i => i >= 0), negD = res.negD;
    const html = `<div class="pvwrap one"><div>${dtb(st, { cls: 'tO', fq: fqM })}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const { C, V } = sceneTools(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      await A.wait(250);
      A.cap(`Двойственная допустимость: все числа d строки ${plain(zl)} должны быть ≥ 0 — тот же знак, что признак оптимальности обычного симплекса`);
      for (const j of cols) { const bad = st.z.a[j].s < 0; A.cls(C('tO', m, j), 'k-act'); await A.wait(80); A.cls(C('tO', m, j), 'k-act', false); A.cls(C('tO', m, j), bad ? 'k-del' : 'k-ok'); if (bad) await A.pulse(V('tO', m, j)); }
      if (negD.length) { A.cap(`Есть d < 0 (${negD.map(j => plain(vname(vars, j))).join(', ')}) — таблица не двойственно допустима`); A.set(fm, `<span class="fmh bad">d &lt; 0: двойственный симплекс с этой таблицы напрямую не стартует</span>`); }
      else { A.cap('Все d ≥ 0 — двойственная допустимость есть, таблица годится для старта'); A.set(fm, `<span class="fmh ok">все d ≥ 0 — метод сохранит это свойство на всех шагах</span>`); }
      await A.pulse(fm);
      A.cap('Теперь столбец b: допустимость базиса — все b должны быть ≥ 0');
      for (let i = 0; i < m; i++) { const bad = st.rows[i].b.s < 0; A.cls(C('tO', i, -1), 'k-act'); await A.wait(80); A.cls(C('tO', i, -1), 'k-act', false); A.cls(C('tO', i, -1), bad ? 'k-del' : 'k-ok'); if (bad) await A.pulse(V('tO', i, -1)); }
      if (negB.length) A.cap(`b < 0 в строках ${negB.map(i => plain(vname(vars, st.basis[i]))).join(', ')}: базис недопустим — именно его исправляет двойственный симплекс-метод`);
      else A.cap('Все b ≥ 0: базисное решение допустимо');
      if (negD.length) {
        sum.innerHTML = `<b>Старт не двойственно допустим.</b> Добавляем искусственное ограничение «Σ небазисных ≤ M» — оно вернёт d ≥ 0 (следующая анимация).`;
      } else if (!negB.length) {
        sum.innerHTML = '<b>Таблица допустима и оптимальна сразу</b> — итераций не нужно.';
      } else {
        sum.innerHTML = `<b>Старт подходит:</b> d ≥ 0 (двойственная допустимость) при b < 0 (прямая недопустимость) — запускаем итерации.`;
      }
      await A.show(sum);
    };
    return demo('Подходит ли начальная таблица для двойственного метода?', html, script);
  }

  /* Добавление искусственного ограничения: Σ небазисных + s = M. */
  function demoDBound(pr, res) {
    const B = res.bound, tb = B.table, p = B.row, vars = tb.vars, cols = tb.cols, sv = B.slackVar, nonb = B.nonb, m = tb.rows.length;
    const terms = nonb.map((j, k) => `<span class="tw" data-j="${j}"><span class="sgn">${k ? '&nbsp;+&nbsp;' : ''}</span><span class="cf" data-one="1"></span>${vK(vars, j)}</span>`).join('') + `<span class="tw" data-j="${sv}"><span class="sgn">&nbsp;+&nbsp;</span><span class="cf" data-one="1"></span>${vK(vars, sv)}</span>`;
    const html = `<div class="drow bdl"><span class="kbd">(M)</span> <span class="lhs">${terms}</span> = <span class="rb"><i class="bm">M</i></span></div><div class="pvwrap one"><div>${dtb(tb, { cls: 'tN', fq: fqM })}</div></div><div class="pvfm"></div>`;
    const script = async A => {
      const { C, V, H } = sceneTools(A), fm = A.q('.pvfm'), rw = A.q('.bdl');
      A.cls(rw, 'dh'); cols.forEach(j => { A.set(V('tN', p, j), ''); }); A.set(V('tN', p, 'bas'), ''); A.set(V('tN', p, -1), '');
      await A.wait(250);
      A.cap(`Строка ${plain(zlab(tb.z.label))} содержит d < 0: ${res.negD.map(j => plain(vname(vars, j))).join(', ')}. Приём: добавить ограничение «сумма небазисных переменных ≤ M», где M — очень большое число`);
      A.cls(res.negD.map(j => C('tN', m, j)), 'k-del');
      await A.pop(rw);
      A.cap(`Небазисные переменные: ${nonb.map(j => plain(vname(vars, j))).join(', ')} — они входят в сумму с коэффициентом 1`);
      A.cls(nonb.map(j => H('tN', j)), 'k-sel'); await A.seq(nonb, 80, j => A.pulse(H('tN', j)));
      A.cap(`Остаток ${vK(vars, sv)} ≥ 0 превращает неравенство в равенство и становится базисной переменной новой строки`);
      A.cls(rw.querySelector(`.tw[data-j="${sv}"]`), 'k-sel'); await A.pulse(rw.querySelector(`.tw[data-j="${sv}"]`));
      A.cap('Переносим строку M в таблицу: каждая единица — в столбец своей переменной');
      await A.put(rw.querySelector(`.tw[data-j="${sv}"]`), V('tN', p, 'bas'), vK(vars, sv));
      for (const j of cols) {
        const cell = V('tN', p, j), tw = rw.querySelector(`.tw[data-j="${j}"]`);
        if (tw) await A.put(tw, cell, '1', { d: 450 });
        else { A.set(cell, '0'); A.cls(C('tN', p, j), 'zc'); await A.pop(cell, { d: 160 }); }
      }
      await A.put(rw.querySelector('.rb'), V('tN', p, -1), fqM(tb.rows[p].b), { d: 450 });
      A.cls(H('tN', 0), 'k-sel', false); A.cls(nonb.map(j => H('tN', j)), 'k-sel', false);
      A.cap('Ограничение лишь отрезает область «за M»: при большом M оптимум исходной задачи в неё попадает. Если оптимум «упрётся» в M — задача неограничена');
      A.set(fm, `<span class="fmh">x<sub>небазисных</sub> суммарно ≤ <i class="bm">M</i> — искусственная рамка, а не часть условия</span>`);
    };
    return demo('искусственное ограничение: возвращаем двойственную допустимость', html, script);
  }

  function dsimplex(pr, meta) {
    const res = ALGD.solve(pr), S = [], n = pr.n, m = pr.rows.length, prep = res.prep;
    const optimal = res.status === 'optimal';
    S.push(sec('cond', 'Условие', system(pr) + `<p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`));
    const facts = [`итераций: ${res.iters}`, ...(res.bound ? ['искусственное ограничение M'] : []), ...(prep.split.length ? ['равенство заменено парой неравенств'] : []),
      ...(optimal && res.alt.length ? ['оптимум не единственный'] : []), ...(optimal && res.degenerate ? ['вырожденное решение'] : [])];
    S.push(summaryCard({ main: resMain(res), facts, badges: [bookBadge(pr, res, meta), checkBadge(pr, optimal ? res.x : null)],
      links: [['reduce', 'Рабочая форма'], ['iter', 'Итерации'], ['res', 'Ответ'], ['check', 'Проверка']] }));
    S.push(sec('how', 'Как решается', `<ol class="howl">
      <li><b>Рабочая форма.</b> Цель приводим к min (для max берём g = −f). «≤» — прибавляем остаток; «≥» — умножаем на −1 и прибавляем остаток; «=» — базисной делаем переменную, которая входит только в это уравнение (если такой нет — заменяем равенство парой «≤», «≥»).</li>
      <li><b>Таблица и знаки.</b> Как и в симплекс-методе проекта, строка f хранит числа d<sub>j</sub> (для min — коэффициенты цели, для max — со сменой знака), в её b стоит значение цели. Признак оптимальности обычного симплекса — «все d ≥ 0» — здесь называется <b>двойственной допустимостью</b>: её сохраняют на всех шагах, а исправляют правые части b.</li>
      <li><b>Шаг 1. Критерий остановки.</b> Нет отрицательных b — решение допустимо; вместе с d ≥ 0 оно оптимально.</li>
      <li><b>Шаг 2. Выходящая строка.</b> Берём строку с самым отрицательным b — эта базисная переменная выходит.</li>
      <li><b>Шаг 3. Несовместность.</b> Если в выбранной строке нет отрицательных чисел — при x ≥ 0 левая часть не меньше нуля, а правая отрицательна: допустимых решений нет.</li>
      <li><b>Шаг 4. Входящий столбец.</b> Среди отрицательных a строки берём столбец с наименьшим θ = d ÷ |a|. Новое d<sub>k</sub> = d<sub>k</sub> − d<sub>q</sub>·a<sub>pk</sub>/a<sub>pq</sub> остаётся ≥ 0 именно при минимальном θ.</li>
      <li><b>Шаг 5. Пересчёт.</b> Ведущую строку делим на ведущий элемент, из остальных вычитаем её, умноженную на их число в ведущем столбце.</li></ol>
      <p class="kbd">Если стартовая таблица не двойственно допустима (есть d &lt; 0), добавляется искусственное ограничение «Σ небазисных ≤ M» (M — большое число): первый поворот по самому отрицательному d возвращает d ≥ 0. Если в конце цель зависит от M — задача неограничена.</p>`));
    S.push(sec('reduce', 'Рабочая форма и стартовая таблица', demoDForm(pr, res) + `<p>Строки таблицы: ${prep.work.map((w, t) => `(${w.src + 1}${w.kind === 'eq-le' ? '′' : w.kind === 'eq-ge' ? '″' : ''}) → базис ${vname(prep.vars, prep.base.basis[t])}`).join('; ')}. Цель ${pr.sense === 'max' ? 'f → max заменена на g = −f → min' : 'f → min взята как есть'}${pr.c0 && !pr.c0.isZero() ? `; свободный член ${fq(pr.c0)} в таблицу не входит` : ''}.</p>` + dtb(res.base, { fq: fqM })));
    S.push(sec('t0', 'Проверка стартовой таблицы', demoDStart(pr, res) + (res.bound ? demoDBound(pr, res) : '') +
      (res.bound ? `<div class="note">Стартовая таблица не двойственно допустима (d &lt; 0 у ${res.negD.map(j => vname(prep.vars, j)).join(', ')}), поэтому нет корректного стартового базиса для двойственного метода «как есть». Применён стандартный приём — искусственное ограничение: оно не меняет задачу, пока M достаточно велико, и даёт допустимую по d таблицу после одного поворота.</div>` : res.negD.length ? '' : '<div class="note ok">Все d ≥ 0 — стартовый базис корректен для двойственного симплекс-метода.</div>')));
    S.push(sec('iter', 'Итерации двойственного симплекс-метода', dstepper(pr, res) +
      (res.bland ? '<div class="note">Обнаружен повтор базиса — далее применено правило Бленда, чтобы избежать зацикливания.</div>' : '') +
      (res.status === 'infeasible' ? `<div class="note bad"><b>Допустимых решений нет.</b> В строке ${vname(res.last.vars, res.last.basis[res.last.p])} b &lt; 0, а отрицательных чисел для ведущего элемента нет: условие «ведущий элемент &lt; 0» не выполнено ни в одном столбце. Итерации остановлены.</div>` : '') +
      (res.status === 'unbounded' ? '<div class="note bad"><b>Целевая функция не ограничена.</b> Таблица оптимальна только при ограничении Σ ≤ M, а значение цели зависит от M. Итерации остановлены.</div>' : '') +
      (res.status === 'cycle' ? '<div class="note bad"><b>Метод не завершился</b> за допустимое число итераций.</div>' : '')));
    S.push(sec('all', 'Все таблицы подряд', dAllTables(res)));
    let rh;
    if (optimal) {
      const last = res.last, T = res.table;
      rh = `<p>В итоговой таблице слева стоят ${last.basis.map(bj => vname(last.vars, bj)).join(', ')} — они равны своему b, остальные переменные равны 0. Добавочные переменные в ответ не входят.</p>
        <p class="answer"><i>x</i>* = ${vec(res.x)}, &nbsp;<i>f</i>* = ${fq(res.f)}${approx(res.f)}</p>`;
      if (res.dependsOnM) rh += `<div class="note">Координаты зависят от M; для проверки взято M = ${fq(res.M0)} (при любом большем M значение f то же).</div>`;
      if (res.alt.length) {
        const ai = res.altInfo;
        rh += `<div class="note">В строке f под небазисной переменной ${res.alt.map(j => vname(last.vars, j)).join(', ')} стоит 0 — есть и другие оптимальные решения с тем же f*.${ai && ai.ray ? ' Столбец этой переменной не содержит положительных чисел: оптимальные решения образуют неограниченное множество.' : ai ? (ai.same ? ' Поворот по ней вырожденный — даёт ту же вершину.' : ` Другая оптимальная вершина: <i>x</i> = ${vec(ai.x)} (поворот по ${vname(last.vars, ai.j)}).`) : ''}</div>`;
      }
      if (res.degenerate) rh += '<div class="note">Есть базисная переменная, равная 0, — решение <b>вырожденное</b>.</div>';
    } else rh = `<div class="note bad"><b>${statusText(res.status)}.</b></div>`;
    S.push(sec('res', 'Ответ', (optimal ? demoAnswer(pr, res.x, res.f, res.table, { alt: res.alt, degenerate: res.degenerate }) : '') + rh));
    const crit = optimal ? `<div class="badges" style="align-items:flex-start;flex-direction:row;flex-wrap:wrap;gap:6px;margin:6px 0"><span class="badge ok">✓ все b ≥ 0 — допустимость</span><span class="badge ok">✓ все d ≥ 0 — оптимальность</span>${ALG.check(pr, res.x).every(c => c.ok) ? '<span class="badge ok">✓ подстановка в ограничения</span>' : '<span class="badge bad">✗ ограничение нарушено</span>'}${ALGZ.fv(pr, res.x).eq(res.f) ? '<span class="badge ok">✓ f по x совпадает с таблицей</span>' : '<span class="badge bad">✗ f по x не совпадает с таблицей</span>'}</div>` : '';
    S.push(sec('check', checkTitle(meta), (optimal ? crit + checkTable(pr, res.x) + valueLine(pr, res.x) : noCheck(res)) + compare(pr, res, meta)));
    return S;
  }

  R.bridge.pivot = (box, steps, k, auto) => {
    const s = steps[k], sp = s.q == null ? optSpec(s) : pivotSpec(s, s.unbounded ? null : steps[k + 1]);
    return mountInto(box, s.q == null ? `Таблица ${k}: проверка оптимальности` : s.unbounded ? `Таблица ${k}: неограниченность` : `Как пересчитать таблицу на шаге ${k + 1}?`, sp.html, sp.script, { ...sp.opts, autoplay: auto });
  };
  return { KIT: { demo, mountInto, sceneTools, dtb, pivotSpec, vK, plain, eqTerms, xlab, TM, termIn, fqM, parM, dstepper, dAllTables, dualSel, dualRz, dualEndSpec, summaryCard, resMain, bookBadge, checkBadge, compare, statusText, noCheck, checkTitle, system, checkTable, valueLine, varLegend, demoGauss, demoDualMap, growBars, bars }, graph, simplex, artificial, dual, dsimplex, statusText, graphZ, dualZ, verdictZ, quiz, trainerFlow, stopAllDemos };
})();

