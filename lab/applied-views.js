/* =====================================================================
   7. НОВЫЕ ТЕМЫ: транспортная задача, сеть, игры, каноническая форма, Гомори,
   проверка оптимальности, теоремы двойственности. Анимации строятся по трассам ALGT / ALGN / ALGG / ALGK / ALGI / ALGX.
   ===================================================================== */
const VIEWS2 = (() => {
  const K = VIEWS.KIT, { demo, mountInto, sceneTools, dtb, vK, eqTerms, xlab, TM, termIn, fqM, parM, dstepper, dAllTables, summaryCard, resMain, bookBadge, checkBadge, compare, statusText, noCheck, checkTitle, system, checkTable, valueLine, varLegend, demoGauss, demoDualMap, growBars, bars } = K;
  const { fq, approx, par, xv, yv, vname, zlab, sg, lin, vec, sec } = R;
  const ZQ = () => new Q(0n);
  /* Разметка → простой текст; дроби записываются как a/b (в captions вместо «слипшихся» цифр). */
  const plain = h => String(h).replace(/<span class="fr"><span class="nu">(\d+)<\/span><span class="de">(\d+)<\/span><\/span>/g, '$1/$2').replace(/<[^>]+>/g, '');
  let uid2 = 0;
  const fqp = v => v.s < 0 ? '(' + fq(v) + ')' : fq(v);
  const t2 = v => v.toText();                      // число без разметки
  const note = (cls, h) => `<div class="note${cls ? ' ' + cls : ''}">${h}</div>`;
  const cap2 = s => s[0].toUpperCase() + s.slice(1);
  const one = sp => demo(sp.title, sp.html, sp.script, sp.opts || {});

  /* ---------- Универсальный пошаговый просмотр: кнопки/список + анимация выбранного шага ---------- */
  function stepperOf(items, o = {}) {
    const id = 'sx' + (++uid2);
    R.hooks.push(() => {
      const root = document.getElementById(id); if (!root) return;
      const box = root.querySelector('.sx-demo'), sel = root.querySelector('.sx-sel'); let k = 0, ctl = null;
      const show = (kk, quiet) => {
        k = kk; if (ctl) { ctl.dispose(); ctl = null; }
        root.querySelectorAll('.sx-btn').forEach((b, i) => b.classList.toggle('on', i === k));
        if (sel) sel.value = String(k);
        root.querySelector('.sx-prev').disabled = k === 0; root.querySelector('.sx-next').disabled = k === items.length - 1;
        const sc = items[kk].build();
        ctl = mountInto(box, sc.title || items[kk].title, sc.html, sc.script, { ...(sc.opts || {}), autoplay: !quiet });
      };
      root.querySelector('.sx-prev').onclick = () => k > 0 && show(k - 1);
      root.querySelector('.sx-next').onclick = () => k < items.length - 1 && show(k + 1);
      root.querySelectorAll('.sx-btn').forEach((b, i) => { b.onclick = () => show(i); });
      if (sel) sel.onchange = () => show(+sel.value);
      show(0, true);
    });
    const many = items.length > 14;
    return `<div class="stepper dsteps" id="${id}"><div class="btnrow"><button class="btn sx-prev">← Назад</button>${many ? `<select class="sx-sel" aria-label="Шаг">${items.map((it, i) => `<option value="${i}">${it.label}</option>`).join('')}</select>` : items.map((it, i) => `<button class="btn sx-btn" title="${plain(it.title || '')}">${it.label}</button>`).join('')}<button class="btn sx-next">Вперёд →</button></div><div class="sx-demo"></div></div>`;
  }

  /* ====================== ТРАНСПОРТНАЯ ЗАДАЧА ====================== */
  /* Сетка плана: в клетке — тариф (справа вверху), оценка Δ (слева вверху) и перевозка (внизу). */
  function tgrid(P, o = {}) {
    const m = P.m, n = P.n, nm = i => (P.fict === 'row' && i === m - 1) ? 'A<sub>ф</sub>' : `A<sub>${i + 1}</sub>`, nn = j => (P.fict === 'col' && j === n - 1) ? 'B<sub>ф</sub>' : `B<sub>${j + 1}</sub>`;
    let h = `<div class="tblwrap"><table class="sx tg ${o.cls || 'tT'}"><thead><tr><th></th>${[...Array(n).keys()].map(j => `<th data-j="${j}">${nn(j)}</th>`).join('')}<th class="tha">запас <i>a</i></th>${o.pot ? '<th class="thp">u</th>' : ''}</tr></thead><tbody>`;
    for (let i = 0; i < m; i++) {
      h += `<tr data-i="${i}"><th class="trh" data-i="${i}">${nm(i)}</th>` + [...Array(n).keys()].map(j => `<td class="tcell" data-i="${i}" data-j="${j}"><span class="tdl"><span class="cv"></span></span><span class="tcc">${fq(P.c[i][j])}</span><span class="tsg"></span><span class="tvv"><span class="cv"></span></span></td>`).join('') + `<td class="ta" data-i="${i}"><span class="cv">${fq(P.a[i])}</span></td>${o.pot ? `<td class="tu" data-i="${i}"><span class="cv dh"></span></td>` : ''}</tr>`;
    }
    h += `<tr class="tbrow"><th class="trh">спрос <i>b</i></th>${[...Array(n).keys()].map(j => `<td class="tb" data-j="${j}"><span class="cv">${fq(P.b[j])}</span></td>`).join('')}<td class="tsum">Σ</td>${o.pot ? '<td></td>' : ''}</tr>`;
    if (o.pot) h += `<tr class="tvrow"><th class="trh">v</th>${[...Array(n).keys()].map(j => `<td class="tvp" data-j="${j}"><span class="cv dh"></span></td>`).join('')}<td></td><td></td></tr>`;
    return h + '</tbody></table></div>';
  }
  const tsel = A => ({
    cell: (i, j) => A.q(`.tT td.tcell[data-i="${i}"][data-j="${j}"]`),
    val: (i, j) => A.q(`.tT td.tcell[data-i="${i}"][data-j="${j}"] .tvv .cv`),
    del: (i, j) => A.q(`.tT td.tcell[data-i="${i}"][data-j="${j}"] .tdl .cv`),
    cst: (i, j) => A.q(`.tT td.tcell[data-i="${i}"][data-j="${j}"] .tcc`),
    sg: (i, j) => A.q(`.tT td.tcell[data-i="${i}"][data-j="${j}"] .tsg`),
    sup: i => A.q(`.tT td.ta[data-i="${i}"] .cv`), dem: j => A.q(`.tT td.tb[data-j="${j}"] .cv`),
    pu: i => A.q(`.tT td.tu[data-i="${i}"] .cv`), pv: j => A.q(`.tT td.tvp[data-j="${j}"] .cv`),
    row: i => [...A.qa(`.tT td.tcell[data-i="${i}"]`), A.q(`.tT th.trh[data-i="${i}"]`), A.q(`.tT td.ta[data-i="${i}"]`)],
    col: j => [...A.qa(`.tT td.tcell[data-j="${j}"]`), A.q(`.tT th[data-j="${j}"]`), A.q(`.tT td.tb[data-j="${j}"]`)]
  });
  const costFormula = (P, X) => { const t = []; X.forEach((r, i) => r.forEach((x, j) => { if (x) t.push(`${fq(x)}·${fqp(P.c[i][j])}`); })); return t.join(' + ') || '0'; };
  const setPlan = (A, T, X) => X.forEach((r, i) => r.forEach((x, j) => { const e = T.val(i, j); if (e) A.set(e, x === null ? '' : fq(x)); }));

  /* Начальный план: северо-западный угол или минимальная стоимость. */
  function demoInit(res) {
    const P = res.P, first = res.first, mc = res.init === 'mc', steps = first.steps, X0 = res.X0;
    const html = `<div class="pvwrap one"><div>${tgrid(P)}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const T = tsel(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      await A.wait(250);
      A.cap(mc ? 'Минимальная стоимость: каждый раз выбираем самый дешёвый тариф среди невычеркнутых строк и столбцов' : 'Северо-западный угол: начинаем с верхней левой клетки и двигаемся вправо-вниз');
      for (const s of steps) {
        const cell = T.cell(s.i, s.j);
        if (mc) {
          A.cap('Невычеркнутые клетки: ищем наименьший тариф');
          const alive = []; s.alive[0].forEach(i => s.alive[1].forEach(j => alive.push([i, j])));
          alive.forEach(([i, j]) => A.cls(T.cst(i, j), 'k-act'));
          await A.wait(250);
          alive.forEach(([i, j]) => A.cls(T.cst(i, j), 'k-act', false));
          A.cls(T.cst(s.i, s.j), 'k-ok');
          A.cap(s.ties.length ? `Наименьший тариф ${plain(fq(s.c))} встречается несколько раз — берём клетку с меньшим номером: (${s.i + 1}; ${s.j + 1})` : `Наименьший тариф ${plain(fq(s.c))} — клетка (${s.i + 1}; ${s.j + 1})`);
          await A.pulse(T.cst(s.i, s.j));
          A.cls(T.cst(s.i, s.j), 'k-ok', false);
        }
        A.cls(cell, 'k-sel');
        A.cap(`Клетка (${s.i + 1}; ${s.j + 1}): запас ${plain(fq(s.a0))}, спрос ${plain(fq(s.b0))} — перевозим меньшее из двух`);
        A.set(fm, `<span class="fmh">x<sub>${s.i + 1}${s.j + 1}</sub> = min(<span class="fo">□</span>; <span class="fp">□</span>) = <b class="calc-result">□</b></span>`);
        await Promise.all([A.put(T.sup(s.i), A.q('.pvfm .fo'), fq(s.a0), { d: 500 }), A.put(T.dem(s.j), A.q('.pvfm .fp'), fq(s.b0), { d: 500 })]);
        await A.swap(A.q('.pvfm .calc-result'), fq(s.x), 360);
        await A.put(A.q('.pvfm .calc-result'), T.val(s.i, s.j), fq(s.x), { d: 600 });
        A.cap(`Остаток запаса: ${plain(fq(s.a0))} − ${plain(fq(s.x))} = ${plain(fq(s.a1))}; остаток спроса: ${plain(fq(s.b0))} − ${plain(fq(s.x))} = ${plain(fq(s.b1))}`);
        await Promise.all([A.swap(T.sup(s.i), fq(s.a1), 380), A.swap(T.dem(s.j), fq(s.b1), 380)]);
        A.cls(cell, 'k-sel', false); A.cls(cell, 'k-ok');
        if (s.elim === 'row') {
          A.cap(s.both ? 'Запас и спрос исчерпаны одновременно: вычёркиваем только строку — в базисе должна остаться нулевая перевозка' : `Запас пункта A${s.i + 1} исчерпан — строка вычёркивается`);
          A.cls(T.row(s.i), 'k-dim');
        } else {
          A.cap(`Спрос пункта B${s.j + 1} удовлетворён — столбец вычёркивается`);
          A.cls(T.col(s.j), 'k-dim');
        }
        await A.wait(200);
      }
      A.set(fm, '');
      if (res.added && res.added.length) {
        A.cap(`Базисных клеток ${res.X0.flat().filter(v => v !== null).length - res.added.length} < m + n − 1 = ${P.m + P.n - 1}: добавляем нулевые перевозки в самые дешёвые клетки, не образующие цикла`);
        for (const [i, j] of res.added) { A.set(T.val(i, j), '0'); A.cls(T.cell(i, j), 'k-act'); await A.pop(T.val(i, j)); }
      }
      A.cap(`Опорный план построен: C = ${plain(costFormula(P, X0))} = ${plain(fq(res.cost0))}`);
      sum.innerHTML = `Начальный план (${mc ? 'минимальная стоимость' : 'северо-западный угол'}): базисных клеток ${P.m + P.n - 1}; стоимость <b>C₀ = ${fq(res.cost0)}</b>`;
      await A.show(sum);
    };
    return demo(`начальный план: ${mc ? 'метод минимальной стоимости' : 'метод северо-западного угла'}`, html, script);
  }

  /* Одна итерация метода потенциалов. */
  function iterSpec(res, k) {
    const P = res.P, it = res.iters[k], last = !it.enter, nxt = res.iters[k + 1];
    const html = `<div class="pvwrap one"><div>${tgrid(P, { pot: true })}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const T = tsel(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      setPlan(A, T, it.X);
      await A.wait(250);
      A.cap(`Текущий план: C = ${plain(costFormula(P, it.X))} = ${plain(fq(it.cost))}. Ищем потенциалы u, v: в базисных клетках u + v = c`);
      it.cells.forEach(c => A.cls(T.cell(c.i, c.j), 'k-sel'));
      await A.wait(250);
      const pot = it.pot;
      for (const o of pot.order) {
        if (o.start) { A.cap('Полагаем u₁ = 0'); A.set(T.pu(0), '0'); await A.pop(T.pu(0)); continue; }
        const [fi, fj] = o.from, cc = P.c[fi][fj];
        const unk = o.kind === 'v' ? `v<sub>${o.k + 1}</sub>` : `u<sub>${o.k + 1}</sub>`, known = o.kind === 'v' ? it.pot.u[fi] : it.pot.v[fj];
        A.cap(`Базисная клетка (${fi + 1}; ${fj + 1}): u<sub>${fi + 1}</sub> + v<sub>${fj + 1}</sub> = c = ${plain(fq(cc))} ⇒ ${plain(unk)} = ${plain(fq(o.val))}`);
        A.cls(T.cell(fi, fj), 'k-act');
        A.set(fm, `<span class="fmh">${unk} = <span class="fo">□</span> − <span class="fk">□</span> = <b class="calc-result">□</b></span>`);
        await Promise.all([A.put(T.cst(fi, fj), A.q('.pvfm .fo'), fq(cc), { d: 450 }), A.put(o.kind === 'v' ? T.pu(fi) : T.pv(fj), A.q('.pvfm .fk'), fqp(known), { d: 450 })]);
        await A.swap(A.q('.pvfm .calc-result'), fq(o.val), 320);
        const dst = o.kind === 'v' ? T.pv(o.k) : T.pu(o.k);
        await A.put(A.q('.pvfm .calc-result'), dst, fq(o.val), { d: 500 });
        A.cls(T.cell(fi, fj), 'k-act', false);
      }
      A.set(fm, '');
      it.cells.forEach(c => A.cls(T.cell(c.i, c.j), 'k-sel', false));
      A.cap('Для свободных клеток считаем оценку Δ = c − (u + v): если Δ < 0, перевозка в этой клетке удешевит план');
      const free = []; it.delta.forEach((r, i) => r.forEach((d, j) => { if (d !== null) free.push([i, j, d]); }));
      let firstFree = true;
      for (const [i, j, d] of free) {
        A.cls(T.cell(i, j), 'k-act');
        if (A.detail || firstFree) {
          A.set(fm, `<span class="fmh">Δ<sub>${i + 1}${j + 1}</sub> = <span class="fo">□</span> − (<span class="fk">□</span> + <span class="fn">□</span>) = <b class="calc-result">□</b></span>`);
          await Promise.all([A.put(T.cst(i, j), A.q('.pvfm .fo'), fq(P.c[i][j]), { d: 380 }), A.put(T.pu(i), A.q('.pvfm .fk'), fqp(it.pot.u[i]), { d: 380 }), A.put(T.pv(j), A.q('.pvfm .fn'), fqp(it.pot.v[j]), { d: 380 })]);
          await A.swap(A.q('.pvfm .calc-result'), fq(d), 300);
          await A.put(A.q('.pvfm .calc-result'), T.del(i, j), fq(d), { d: 420 });
          firstFree = false;
        } else { A.set(T.del(i, j), fq(d)); await A.pop(T.del(i, j), { d: 140 }); }
        A.cls(T.cell(i, j), 'k-act', false);
        if (d.s < 0) A.cls(T.cell(i, j), 'k-del');
      }
      A.set(fm, '');
      if (last) {
        A.cap('Все оценки Δ ≥ 0 — план оптимален: ни одна перевозка по свободной клетке не уменьшит стоимость');
        free.forEach(([i, j]) => { A.cls(T.cell(i, j), 'k-del', false); A.cls(T.cell(i, j), 'k-ok'); });
        const zeros = free.filter(f => f[2].isZero());
        sum.innerHTML = `Оптимальный план: <b>C* = ${fq(it.cost)}</b>${zeros.length ? `. Δ = 0 в клетках ${zeros.map(f => `(${f[0] + 1}; ${f[1] + 1})`).join(', ')} — есть и другие оптимальные планы` : ''}${it.cells.some(c => c.x.isZero()) ? '. В базисе есть нулевая перевозка — план вырожденный' : ''}`;
        await A.show(sum);
        return;
      }
      const [ei, ej] = it.enter, dmin = it.delta[ei][ej];
      const negs = free.filter(f => f[2].s < 0);
      A.cap(`Есть отрицательные Δ (${negs.length}); берём самую отрицательную: Δ<sub>${ei + 1}${ej + 1}</sub> = ${plain(fq(dmin))} — клетка (${ei + 1}; ${ej + 1}) войдёт в базис`);
      negs.forEach(([i, j]) => A.cls(T.cell(i, j), 'k-del', false));
      A.cls(T.cell(ei, ej), 'k-pe'); await A.pulse(T.del(ei, ej));
      A.cap('Строим цикл: из клетки идём по базисным клеткам, поворачивая в каждой на 90°; знаки «+» и «−» чередуются');
      for (const c of it.cyc) { A.set(T.sg(c.i, c.j), c.sign); A.cls(T.cell(c.i, c.j), c.sign === '+' ? 'k-ok' : 'k-del'); if (!(c.i === ei && c.j === ej)) A.cls(T.cell(c.i, c.j), 'k-pe', false); await A.wait(160); }
      A.set(fm, `<span class="fmh">цикл: ${it.cyc.map(c => `(${c.i + 1};${c.j + 1})<b>${c.sign}</b>`).join(' → ')}</span>`);
      const minus = it.cyc.filter(c => c.sign === '−');
      A.cap(`θ = наименьшая перевозка в клетках со знаком «−»: min(${minus.map(c => plain(fq(it.X[c.i][c.j]))).join('; ')}) = ${plain(fq(it.theta))}`);
      await A.each(minus, async c => { A.cls(T.cell(c.i, c.j), 'k-act'); await A.pulse(T.val(c.i, c.j)); });
      A.set(fm, `<span class="fmh">θ = min(${minus.map(c => `<span class="fo m${c.i}_${c.j}">□</span>`).join('; ')}) = <b class="calc-result">${fq(it.theta)}</b></span>`);
      await Promise.all(minus.map(c => A.put(T.val(c.i, c.j), A.q(`.pvfm .m${c.i}_${c.j}`), fq(it.X[c.i][c.j]), { d: 500 })));
      minus.forEach(c => A.cls(T.cell(c.i, c.j), 'k-act', false));
      A.cap(`Из клетки (${it.leave.i + 1}; ${it.leave.j + 1}) перевозка уходит в ноль — она выходит из базиса${it.ties.length ? ' (θ достигается и в других клетках — берём клетку с меньшим номером; остальные остаются в базисе с нулём: вырождение)' : ''}`);
      A.cls(T.cell(it.leave.i, it.leave.j), 'k-pe'); await A.pulse(T.val(it.leave.i, it.leave.j));
      A.cap(`Перераспределяем: в клетках «+» прибавляем θ = ${plain(fq(it.theta))}, в клетках «−» вычитаем`);
      for (const c of it.cyc) {
        const old = it.X[c.i][c.j] || ZQ(), nw = c.sign === '+' ? old.add(it.theta) : old.sub(it.theta);
        A.set(fm, `<span class="fmh">x<sub>${c.i + 1}${c.j + 1}</sub> = ${fq(old)} ${c.sign === '+' ? '+' : '−'} ${fq(it.theta)} = <b>${fq(nw)}</b></span>`);
        const isLeave = c.i === it.leave.i && c.j === it.leave.j;
        await A.swap(T.val(c.i, c.j), isLeave ? '' : fq(nw), 380);
      }
      A.set(fm, '');
      A.cap(`Стоимость изменилась на θ·Δ = ${plain(fq(it.theta))}·${plain(fqp(dmin))} = ${plain(fq(it.gain))}: C = ${plain(fq(it.cost))} → ${plain(fq(nxt.cost))}`);
      sum.innerHTML = `Новый план: <b>C = ${fq(nxt.cost)}</b> <span class="kbd">(было ${fq(it.cost)}; изменение θ·Δ = ${fq(it.theta)}·${fqp(dmin)} = ${fq(it.gain)}${it.theta.isZero() ? ' — нулевой шаг: вырожденный план' : ''})</span>`;
      await A.show(sum);
    };
    return { html, script, opts: { detail: 'считать каждую оценку Δ с перелётом чисел' } };
  }

  function transportSections(inp, meta, init) {
    const S = [], res = ALGT.solve(inp, init), P = res.P;
    const P0 = ALGT.prepare(inp, 'short');
    const dataTbl = `<div class="tblwrap"><table class="sx"><thead><tr><th></th>${inp.b.map((_, j) => `<th>B<sub>${j + 1}</sub></th>`).join('')}<th>запас a</th></tr></thead><tbody>${inp.c.map((r, i) => `<tr><th>A<sub>${i + 1}</sub></th>${r.map(v => `<td>${fq(Q.of(v))}</td>`).join('')}<td class="bcol">${fq(Q.of(inp.a[i]))}</td></tr>`).join('')}<tr><th>спрос b</th>${inp.b.map(v => `<td class="bcol">${fq(Q.of(v))}</td>`).join('')}<td>Σa = ${t2(P0.sa)}; Σb = ${t2(P0.sb)}</td></tr></tbody></table></div>`;
    S.push(sec('cond', 'Условие', `<p>Минимизировать стоимость перевозок <i>C</i> = Σ <i>c<sub>ij</sub>x<sub>ij</sub></i> при Σ<sub>j</sub> x<sub>ij</sub> ≤ a<sub>i</sub>, Σ<sub>i</sub> x<sub>ij</sub> ≥ b<sub>j</sub>, x<sub>ij</sub> ≥ 0.</p>${dataTbl}<p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`));
    const opt = res.status === 'optimal', ck = opt ? ALGT.check(inp, res.plan) : null;
    S.push(summaryCard({ main: opt ? `<i>C</i>* = ${fq(res.cost)}` : cap2(res.status === 'infeasible' ? 'запасов меньше спроса — условие не может быть выполнено' : '—'),
      facts: [`итераций: ${opt ? res.iters.length - 1 : 0}`, `начальный план: ${init === 'mc' ? 'минимальная стоимость' : 'северо-западный угол'}`, ...(P.fict ? [P.fict === 'col' ? 'введён фиктивный потребитель' : 'введён фиктивный поставщик'] : []), ...(opt && res.alt.length ? ['оптимум не единственный'] : []), ...(opt && res.degenerate ? ['вырожденный план'] : [])],
      badges: [bookBadge2(meta, res), opt ? `<span class="badge ${ck.ok ? 'ok' : 'bad'}">${ck.ok ? '✓ ограничения выполнены' : '✗ ограничение нарушено'}</span>` : ''],
      links: [['init', 'Начальный план'], ['iter', 'Потенциалы'], ['res', 'Ответ'], ['check', 'Проверка']] }));
    S.push(sec('how', 'Как решается', `<ol class="howl"><li><b>Баланс.</b> Если Σa &gt; Σb, добавляем фиктивного потребителя с нулевыми тарифами (спрос Σa − Σb). Если Σa &lt; Σb, спрос не покрыть — условие несовместно.</li>
      <li><b>Начальный план</b> с m + n − 1 базисными клетками: северо-западный угол (идём по таблице вправо-вниз) или минимальная стоимость (берём самые дешёвые клетки).</li>
      <li><b>Потенциалы.</b> u<sub>1</sub> = 0, в базисных клетках u<sub>i</sub> + v<sub>j</sub> = c<sub>ij</sub>.</li>
      <li><b>Оценки</b> свободных клеток: Δ<sub>ij</sub> = c<sub>ij</sub> − (u<sub>i</sub> + v<sub>j</sub>). Все Δ ≥ 0 — план оптимален.</li>
      <li><b>Цикл.</b> Для клетки с наименьшей Δ&lt;0 строим цикл со знаками «+ −», θ = наименьшая перевозка в клетках «−», передвигаем θ по циклу — стоимость уменьшается на θ·|Δ|.</li></ol>`));
    if (res.status === 'infeasible') {
      const sh = ALGT.solve(inp, 'nw', 'short');
      S.push(sec('res', 'Ответ', note('bad', `<b>Запасов меньше спроса: Σa = ${t2(P.sa)} &lt; Σb = ${t2(P.sb)}.</b> Условие «спрос каждого потребителя удовлетворён» невыполнимо, план перевозок не существует.`) +
        (sh.status === 'optimal' ? note('', `Для справки: если разрешить недопоставку (фиктивный поставщик с нулевыми тарифами), наименьшая стоимость — <b>${fq(sh.cost)}</b>.`) : '')));
      S.push(sec('check', 'Проверка и сравнение с ответом', note('', 'Проверка подстановкой не выполняется: плана не существует.') + cmpTransport(inp, res, meta)));
      return S;
    }
    S.push(sec('init', 'Начальный опорный план', (P.fict ? note('', `Σa = ${t2(P.sa)} &gt; Σb = ${t2(P.sb)}: вводим фиктивного потребителя B<sub>ф</sub> со спросом ${fq(P.b[P.n - 1])} и нулевыми тарифами.`) : note('ok', 'Задача сбалансирована (Σa = Σb).')) + demoInit(res)));
    const items = res.iters.map((it, k) => ({ label: k === res.iters.length - 1 ? 'итог' : String(k + 1), title: k === res.iters.length - 1 ? 'Проверка оптимальности' : `Итерация ${k + 1}`, build: () => { const sp = iterSpec(res, k); return { title: k === res.iters.length - 1 ? `План ${k}: проверка оптимальности` : `Итерация ${k + 1}: план ${k} → план ${k + 1}`, ...sp }; } }));
    S.push(sec('iter', 'Метод потенциалов', stepperOf(items)));
    S.push(sec('res', 'Ответ', `<p>Оптимальный план (строки — поставщики, столбцы — потребители):</p>${planTable(inp, res)}<p class="answer"><i>C</i>* = ${costFormulaOrig(inp, res)} = ${fq(res.cost)}</p>` +
      (res.alt.length ? note('', `Оценка Δ = 0 в свободных клетках ${res.alt.map(([i, j]) => `(${i + 1}; ${j + 1})`).join(', ')}: те же затраты достигаются и другими планами.`) : '') + (res.degenerate ? note('', 'В базисе есть нулевая перевозка — план <b>вырожденный</b>.') : '')));
    S.push(sec('check', 'Проверка и сравнение с ответом', `<div class="tblwrap"><table class="plain"><tr><th></th><th>Сумма</th><th>Условие</th><th></th></tr>${ck.rows.map((r, i) => `<tr><td>поставщик ${i + 1}</td><td class="m">${fq(r.s)}</td><td class="m">≤ ${fq(Q.of(inp.a[i]))}</td><td class="${r.ok ? 'tick' : 'bad-t'}">${r.ok ? '✓' : '✗'}</td></tr>`).join('')}${ck.cols.map((r, j) => `<tr><td>потребитель ${j + 1}</td><td class="m">${fq(r.s)}</td><td class="m">≥ ${fq(Q.of(inp.b[j]))}</td><td class="${r.ok ? 'tick' : 'bad-t'}">${r.ok ? '✓' : '✗'}</td></tr>`).join('')}</table></div><p class="m big2"><i>C</i> = ${fq(ck.C)}</p>` + cmpTransport(inp, res, meta)));
    return S;
  }
  const planTable = (inp, res) => `<div class="tblwrap"><table class="sx"><thead><tr><th></th>${inp.b.map((_, j) => `<th>B<sub>${j + 1}</sub></th>`).join('')}<th>Σ</th></tr></thead><tbody>${res.plan.map((r, i) => `<tr><th>A<sub>${i + 1}</sub></th>${r.map(x => `<td class="${x.isZero() ? 'zc' : 'bcol'}">${x.isZero() ? '·' : fq(x)}</td>`).join('')}<td>${fq(r.reduce((s, v) => s.add(v), ZQ()))} ≤ ${fq(Q.of(inp.a[i]))}</td></tr>`).join('')}</tbody></table></div>`;
  const costFormulaOrig = (inp, res) => { const t = []; res.plan.forEach((r, i) => r.forEach((x, j) => { if (!x.isZero()) t.push(`${fq(x)}·${fq(Q.of(inp.c[i][j]))}`); })); return t.join(' + ') || '0'; };
  function bookBadge2(meta, res) {
    if (!meta || !meta.answer || meta.answer.C === undefined) return '<span class="badge info">собственные коэффициенты</span>';
    if (res.status !== 'optimal') return '<span class="badge warn">⚠ в сборнике другой ответ — см. «Проверка»</span>';
    return res.cost.eq(Q.of(meta.answer.C)) ? '<span class="badge ok">✓ совпадает с ответом</span>' : '<span class="badge warn">⚠ отличается от ответа — см. «Проверка»</span>';
  }
  function cmpTransport(inp, res, meta) {
    let h = '';
    if (meta && meta.answer && meta.answer.C !== undefined) {
      h += `<p>Ответ в источнике: <b><i>C</i>* = ${meta.answer.C}</b>.</p>`;
      if (res.status === 'optimal' && res.cost.eq(Q.of(meta.answer.C))) h += note('ok', '✓ Расчёт совпадает с ответом источника.');
      else if (res.status === 'optimal') h += note('warn', `<b>⚠ Расхождение с ответом источника.</b> Расчёт: <i>C</i>* = ${fq(res.cost)}; напечатано ${meta.answer.C}. Решение проверено подстановкой, потенциалы удовлетворяют признаку оптимальности (все Δ ≥ 0).`);
      else h += note('warn', `<b>⚠ Расхождение с ответом источника.</b> Напечатано <i>C</i>* = ${meta.answer.C}, но Σa &lt; Σb: спрос не может быть удовлетворён, при таком условии ответа не существует.`);
    }
    if (meta && meta.note) h += `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>`;
    return h;
  }
  /* ====================== СЕТЕВОЕ ПЛАНИРОВАНИЕ ====================== */
  /* Раскладка: столбец — уровень события (самый длинный путь от начала), строка — порядок внутри уровня. */
  function netLayout(res) {
    const lvl = new Map();
    res.order.forEach(e => { const inc = res.arcs.filter(a => a.j === e); lvl.set(e, inc.length ? Math.max(...inc.map(a => lvl.get(a.i) + 1)) : 0); });
    const L = Math.max(...lvl.values()) + 1, by = [...Array(L)].map(() => []);
    res.events.forEach(e => by[lvl.get(e)].push(e));
    const W = Math.max(640, 110 * L + 80), H = Math.max(260, Math.max(...by.map(c => c.length)) * 92 + 40), pos = new Map();
    by.forEach((col, l) => col.forEach((e, k) => pos.set(e, { x: 60 + l * (W - 120) / Math.max(1, L - 1), y: H * (k + 1) / (col.length + 1) })));
    return { W, H, pos, lvl };
  }
  function netSvg(res) {
    const { W, H, pos } = netLayout(res), r = 19;
    const edge = a => { const p = pos.get(a.i), q = pos.get(a.j), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d; return { x1: p.x + ux * r, y1: p.y + uy * r, x2: q.x - ux * (r + 4), y2: q.y - uy * (r + 4), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 }; };
    let s = `<svg class="netsvg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#6b6f7c"/></marker></defs>`;
    res.arcs.forEach((a, k) => { const e = edge(a); s += `<g class="nar" data-a="${k}"><line class="nal" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" marker-end="url(#arr)"/><rect class="nbg" x="${e.mx - 17}" y="${e.my - 10}" width="34" height="19" rx="5"/><text class="ntd" x="${e.mx}" y="${e.my + 4}" text-anchor="middle">${t2(a.d)}</text><text class="ncand" data-a="${k}" x="${e.mx}" y="${e.my - 16}" text-anchor="middle"></text></g>`; });
    res.events.forEach(e => { const p = pos.get(e); s += `<g class="nnd" data-e="${e}"><circle cx="${p.x}" cy="${p.y}" r="${r}"/><text class="nne" x="${p.x}" y="${p.y + 5}" text-anchor="middle">${e}</text><rect class="ntb" x="${p.x - 31}" y="${p.y + r + 5}" width="62" height="20" rx="5"/><text class="ntp" x="${p.x - 15}" y="${p.y + r + 19}" text-anchor="middle"></text><text class="nsp" x="${p.x}" y="${p.y + r + 19}" text-anchor="middle">|</text><text class="ntn" x="${p.x + 15}" y="${p.y + r + 19}" text-anchor="middle"></text></g>`; });
    return s + '</svg>';
  }
  const nsel = A => ({ nd: e => A.q(`.netsvg g.nnd[data-e="${e}"]`), ar: k => A.q(`.netsvg g.nar[data-a="${k}"]`), cand: k => A.q(`.netsvg .ncand[data-a="${k}"]`), tp: e => A.q(`.netsvg g.nnd[data-e="${e}"] .ntp`), tn: e => A.q(`.netsvg g.nnd[data-e="${e}"] .ntn`) });
  const setT = (el, v) => { if (el) el.textContent = v; };

  function netScene(res, kind) {
    const evI = e => res.events.indexOf(e);
    const list = `<div class="nlist">${res.arcs.map((a, k) => `<span class="nli" data-a="${k}">(${a.i}, ${a.j}, ${t2(a.d)})</span>`).join('')}</div>`;
    const html = `${list}<div class="netbox">${netSvg(res)}</div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    let script;
    if (kind === 'build') {
      script = async A => {
        const N = nsel(A), sum = A.q('.pvsum');
        res.events.forEach(e => N.nd(e).classList.add('dh')); res.arcs.forEach((a, k) => N.ar(k).classList.add('dh'));
        await A.wait(250);
        A.cap('События — вершины графа (стадии проекта). Раскладываем их слева направо по самому длинному пути');
        await A.seq(res.events, 90, e => A.show(N.nd(e), { d: 300 }));
        for (let k = 0; k < res.arcs.length; k++) {
          const a = res.arcs[k], li = A.q(`.nli[data-a="${k}"]`);
          A.cap(`Работа (${a.i}, ${a.j}, ${t2(a.d)}): дуга из события ${a.i} в событие ${a.j}, длительность ${t2(a.d)}`);
          A.cls(li, 'k-act'); A.cls(N.nd(a.i), 'k-act'); A.cls(N.nd(a.j), 'k-act');
          await A.show(N.ar(k), { d: 350 });
          A.cls(li, 'k-act', false); A.cls(li, 'k-ok'); A.cls(N.nd(a.i), 'k-act', false); A.cls(N.nd(a.j), 'k-act', false);
        }
        A.cap(`Сетевой график построен: ${res.events.length} событий и ${res.arcs.length} работ. Начальные события: ${res.sources.join(', ')}; конечные: ${res.sinks.join(', ')}`);
        sum.innerHTML = `Порядок расчёта (топологический): ${res.order.join(' → ')} — событие считается после всех, из которых в него ведут работы`; await A.show(sum);
      };
    } else if (kind === 'fwd') {
      script = async A => {
        const N = nsel(A), sum = A.q('.pvsum');
        await A.wait(250);
        A.cap('Ранние сроки t<sub>р</sub>: событие наступает, когда закончены все предшествующие работы — берём максимум по входящим');
        for (const f of res.fwd) {
          const e = f.e;
          A.cls(N.nd(e), 'k-act');
          if (!f.inc.length) {
            A.cap(`Событие ${e}: работ в него не входит — это начало, t<sub>р</sub>(${e}) = 0`);
            setT(N.tp(e), '0'); await A.show(N.tp(e), { d: 250 });
          } else {
            A.cap(`Событие ${e}: для каждой входящей работы считаем t<sub>р</sub>(начала) + длительность`);
            for (const c of f.inc) { const k = res.arcs.indexOf(c.a); A.cls(N.ar(k), 'k-act'); setT(N.cand(k), t2(c.v)); await A.show(N.cand(k), { d: 220 }); }
            const mx = f.inc.length > 1 ? `max(${f.inc.map(c => t2(c.v)).join('; ')})` : t2(f.val);
            A.cap(`t<sub>р</sub>(${e}) = ${mx} = ${t2(f.val)}${f.inc.length > 1 ? ' — выбираем наибольшее: событие ждёт самую долгую цепочку' : ''}`);
            f.inc.forEach(c => { const k = res.arcs.indexOf(c.a); A.cls(N.ar(k), c.v.eq(f.val) ? 'k-ok' : 'k-dim'); });
            setT(N.tp(e), t2(f.val)); await A.show(N.tp(e), { d: 300 });
            f.inc.forEach(c => { const k = res.arcs.indexOf(c.a); A.cls(N.ar(k), 'k-act', false); A.cls(N.ar(k), 'k-ok', false); A.cls(N.ar(k), 'k-dim', false); N.cand(k).textContent = ''; });
          }
          A.cls(N.nd(e), 'k-act', false);
        }
        A.cap(`Срок выполнения проекта T = ${t2(res.T)} (наибольший ранний срок)`);
        sum.innerHTML = `Ранние сроки: ${res.events.map((e, i) => `t<sub>р</sub>(${e}) = ${t2(res.tp[i])}`).join('; ')}. Проект длится <b>T = ${t2(res.T)}</b>`; await A.show(sum);
      };
    } else if (kind === 'bwd') {
      script = async A => {
        const N = nsel(A), sum = A.q('.pvsum');
        res.events.forEach((e, i) => setT(N.tp(e), t2(res.tp[i])));
        await A.wait(250);
        A.cap(`Поздние сроки t<sub>п</sub>: идём с конца; у завершающих событий t<sub>п</sub> = T = ${t2(res.T)}, у остальных — минимум по исходящим (t<sub>п</sub>(конца) − длительность)`);
        for (const f of res.bwd) {
          const e = f.e; A.cls(N.nd(e), 'k-act');
          if (!f.out.length) {
            A.cap(`Событие ${e}: исходящих работ нет — t<sub>п</sub>(${e}) = T = ${t2(res.T)}`);
            setT(N.tn(e), t2(f.val)); await A.show(N.tn(e), { d: 250 });
          } else {
            A.cap(`Событие ${e}: для каждой исходящей работы считаем t<sub>п</sub>(конца) − длительность`);
            for (const c of f.out) { const k = res.arcs.indexOf(c.a); A.cls(N.ar(k), 'k-act'); setT(N.cand(k), t2(c.v)); await A.show(N.cand(k), { d: 220 }); }
            A.cap(`t<sub>п</sub>(${e}) = ${f.out.length > 1 ? `min(${f.out.map(c => t2(c.v)).join('; ')})` : t2(f.val)} = ${t2(f.val)}${f.out.length > 1 ? ' — берём наименьшее: иначе позже начавшаяся работа сорвёт срок' : ''}`);
            f.out.forEach(c => { const k = res.arcs.indexOf(c.a); A.cls(N.ar(k), c.v.eq(f.val) ? 'k-ok' : 'k-dim'); });
            setT(N.tn(e), t2(f.val)); await A.show(N.tn(e), { d: 300 });
            f.out.forEach(c => { const k = res.arcs.indexOf(c.a); A.cls(N.ar(k), 'k-act', false); A.cls(N.ar(k), 'k-ok', false); A.cls(N.ar(k), 'k-dim', false); N.cand(k).textContent = ''; });
          }
          A.cls(N.nd(e), 'k-act', false);
        }
        sum.innerHTML = `Поздние сроки: ${res.events.map((e, i) => `t<sub>п</sub>(${e}) = ${t2(res.tn[i])}`).join('; ')}`; await A.show(sum);
      };
    } else {
      script = async A => {
        const N = nsel(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
        res.events.forEach((e, i) => { setT(N.tp(e), t2(res.tp[i])); setT(N.tn(e), t2(res.tn[i])); });
        await A.wait(250);
        A.cap('Резерв события R = t<sub>п</sub> − t<sub>р</sub>: на сколько событие можно сдвинуть, не затягивая проект');
        for (const e of res.events) {
          const i = evI(e), r0 = res.R[i];
          A.cls(N.nd(e), 'k-act');
          A.set(fm, `<span class="fmh">R(${e}) = ${t2(res.tn[i])} − ${t2(res.tp[i])} = <b>${t2(r0)}</b></span>`);
          await A.wait(r0.isZero() ? 150 : 230);
          A.cls(N.nd(e), 'k-act', false);
          A.cls(N.nd(e), r0.isZero() ? 'crit' : 'free');
        }
        A.cap('События с нулевым резервом — критические: любое их опоздание удлиняет проект');
        A.set(fm, `<span class="fmh">критические события: ${res.critEvents.join(', ')}</span>`);
        A.cap('Полный резерв работы (i, j): R = t<sub>п</sub>(j) − t<sub>р</sub>(i) − d. Работа с R = 0 — критическая');
        for (let k = 0; k < res.arcs.length; k++) {
          const a = res.arcInfo[k];
          A.set(fm, `<span class="fmh">(${a.i}, ${a.j}): ${t2(res.tn[evI(a.j)])} − ${t2(res.tp[evI(a.i)])} − ${t2(a.d)} = <b>${t2(a.full)}</b></span>`);
          A.cls(N.ar(k), 'k-act'); await A.wait(a.crit ? 150 : 200); A.cls(N.ar(k), 'k-act', false);
          A.cls(N.ar(k), a.crit ? 'crit' : 'free');
          if (!a.crit) { const c = N.cand(k); c.textContent = `R=${t2(a.full)}`; await A.show(c, { d: 150 }); }
        }
        A.set(fm, '');
        if (res.paths.length) {
          A.cap(`Критический путь${res.paths.length > 1 ? ' (их несколько)' : ''}: цепочка критических работ от начала до конца проекта`);
          sum.innerHTML = res.paths.map(p => `<b>${[p[0].i, ...p.map(a => a.j)].join(' → ')}</b>: ${p.map(a => t2(a.d)).join(' + ')} = ${t2(p.reduce((s, a) => s.add(a.d), ZQ()))}`).join('<br>') + `<br>Длина критического пути равна сроку проекта <b>T = ${t2(res.T)}</b>`;
        } else sum.innerHTML = 'Критический путь не найден.';
        await A.show(sum);
      };
    }
    const titles = { build: 'построение сетевого графика', fwd: 'ранние сроки событий (прямой ход)', bwd: 'поздние сроки событий (обратный ход)', crit: 'резервы и критический путь' };
    return { title: titles[kind], html, script, opts: {} };
  }

  function networkSections(v, meta) {
    const S = [], arcsQ = v.arcs.map(a => [a[0], a[1], Q.of(a[2])]), res = ALGN.solve(arcsQ);
    S.push(sec('cond', 'Условие', `<p>Работы заданы списком (номер события начала, номер события окончания, длительность). Построить сетевой график, найти ранние и поздние сроки событий, резервы и критический путь.</p><div class="sys">${arcsQ.map(a => `(${a[0]}, ${a[1]}, ${t2(a[2])})`).join(' &nbsp; ')}</div><p class="kbd">${meta ? meta.title : 'Собственные данные'}.</p>`));
    if (res.status !== 'ok') {
      const why = { empty: 'список работ пуст', loop: 'есть работа, у которой начало и конец — одно событие', cycle: `в графе есть цикл (события ${(res.stuck || []).join(', ')}): события нельзя упорядочить, сроки не определены` }[res.status];
      S.push(sec('res', 'Ответ', note('bad', `<b>Сетевой график не может быть рассчитан:</b> ${why}.`)));
      return S;
    }
    S.push(summaryCard({ main: `<i>T</i> = ${t2(res.T)}`, facts: [`событий: ${res.events.length}`, `работ: ${res.arcs.length}`, `критических работ: ${res.arcInfo.filter(a => a.crit).length}`, ...(res.paths.length > 1 ? ['несколько критических путей'] : [])],
      badges: [netBadge(v, res)], links: [['graph', 'Граф и сроки'], ['res', 'Ответ'], ['check', 'Проверка']] }));
    S.push(sec('how', 'Как решается', `<ol class="howl"><li>События — вершины, работы — дуги с длительностями. События упорядочиваем так, чтобы все работы шли «вперёд».</li><li><b>Ранний срок</b> t<sub>р</sub>(j) = max по работам (i, j) [t<sub>р</sub>(i) + d]; у начальных событий t<sub>р</sub> = 0. Наибольший ранний срок — длительность проекта T.</li><li><b>Поздний срок</b> t<sub>п</sub>(i) = min по работам (i, j) [t<sub>п</sub>(j) − d]; у завершающих событий t<sub>п</sub> = T.</li><li><b>Резерв</b> события R = t<sub>п</sub> − t<sub>р</sub>; критические события и работы — с нулевым резервом, они образуют критический путь.</li></ol>`));
    const items = ['build', 'fwd', 'bwd', 'crit'].map(k => ({ label: { build: 'Граф', fwd: 'Ранние t<sub>р</sub>', bwd: 'Поздние t<sub>п</sub>', crit: 'Резервы' }[k], title: k, build: () => netScene(res, k) }));
    S.push(sec('graph', 'Сетевой график и сроки событий', stepperOf(items)));
    S.push(sec('all', 'Таблицы сроков', `<div class="tblwrap"><table class="sx"><thead><tr><th>Событие</th><th>t<sub>р</sub></th><th>t<sub>п</sub></th><th>Резерв R</th><th></th></tr></thead><tbody>${res.events.map((e, i) => `<tr><td class="bas">${e}</td><td>${t2(res.tp[i])}</td><td>${t2(res.tn[i])}</td><td>${t2(res.R[i])}</td><td>${res.R[i].isZero() ? 'критическое' : ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="tblwrap"><table class="sx"><thead><tr><th>Работа</th><th>d</th><th>Полный резерв</th><th>Свободный резерв</th><th></th></tr></thead><tbody>${res.arcInfo.map(a => `<tr><td class="bas">(${a.i}, ${a.j})</td><td>${t2(a.d)}</td><td>${t2(a.full)}</td><td>${t2(a.free)}</td><td>${a.crit ? 'критическая' : ''}</td></tr>`).join('')}</tbody></table></div>`));
    S.push(sec('res', 'Ответ', `<p class="answer"><i>T</i> = ${t2(res.T)}</p><p>Ранние и поздние сроки: ${res.events.map((e, i) => `${e}: (${t2(res.tp[i])}; ${t2(res.tn[i])})`).join('; ')}.</p>` + (res.paths.length ? `<p>Критический путь: ${res.paths.map(p => `<b>${[p[0].i, ...p.map(a => a.j)].join(' → ')}</b>`).join('; ')}.</p>` : '')));
    S.push(sec('check', 'Проверка и сравнение с ответом', cmpNet(v, res, meta)));
    return S;
  }
  function netMism(v, res) {
    const bad = [];
    (v.answer || []).forEach((p, k) => { const i = res.events.indexOf(k + 1); if (i < 0) { bad.push({ e: k + 1, miss: true }); return; } if (!res.tp[i].eq(Q.of(p[0])) || !res.tn[i].eq(Q.of(p[1]))) bad.push({ e: k + 1 }); });
    return bad;
  }
  const netBadge = (v, res) => !v.answer ? '<span class="badge info">собственные данные</span>' : netMism(v, res).length ? '<span class="badge warn">⚠ отличается от ответа — см. «Проверка»</span>' : '<span class="badge ok">✓ совпадает с ответом</span>';
  function cmpNet(v, res, meta) {
    let h = '<div class="tblwrap"><table class="plain"><tr><th>Событие</th><th>t<sub>р</sub> (расчёт)</th><th>t<sub>п</sub> (расчёт)</th>' + (v.answer ? '<th>в источнике</th><th></th>' : '') + '</tr>';
    res.events.forEach((e, i) => {
      const p = v.answer && v.answer[e - 1], ok = !p || (res.tp[i].eq(Q.of(p[0])) && res.tn[i].eq(Q.of(p[1])));
      h += `<tr><td>${e}</td><td class="m">${t2(res.tp[i])}</td><td class="m">${t2(res.tn[i])}</td>${v.answer ? `<td class="m">${p ? `${p[0]}; ${p[1]}` : '—'}</td><td class="${ok ? 'tick' : 'bad-t'}">${ok ? '✓' : '✗'}</td>` : ''}</tr>`;
    });
    h += '</table></div>';
    if (v.answer) {
      const bad = netMism(v, res);
      h += !bad.length ? note('ok', '✓ Расчёт совпадает с ответом источника.') : note('warn', `<b>⚠ Расхождение с ответом источника</b> в событиях ${bad.map(b => b.e).join(', ')}. Сроки пересчитаны по определению: t<sub>р</sub> — максимум по входящим работам, t<sub>п</sub> — минимум по исходящим, у завершающих событий t<sub>п</sub> = T; напечатанные значения этому правилу не удовлетворяют.`);
    }
    if (meta && meta.note) h += `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>`;
    return h;
  }
  /* ====================== МАТРИЧНЫЕ ИГРЫ ====================== */
  const mtbl = (G, o = {}) => {
    const m = G.m, n = G.n, M = o.matrix || G.C;
    let h = `<div class="tblwrap"><table class="sx gmx ${o.cls || ''}"><thead><tr><th></th>${[...Array(n).keys()].map(j => `<th data-j="${j}">B<sub>${j + 1}</sub></th>`).join('')}${o.rowmin ? '<th class="gmin">min по строке</th>' : ''}${o.xs ? '<th class="gxs">x</th>' : ''}</tr></thead><tbody>`;
    for (let i = 0; i < m; i++) h += `<tr data-i="${i}"><th class="trh" data-i="${i}">A<sub>${i + 1}</sub></th>${[...Array(n).keys()].map(j => `<td class="gc" data-i="${i}" data-j="${j}"><span class="cv">${fq(M[i][j])}</span></td>`).join('')}${o.rowmin ? `<td class="gr" data-i="${i}"><span class="cv dh"></span></td>` : ''}${o.xs ? `<td class="gx" data-i="${i}"><span class="cv dh"></span></td>` : ''}</tr>`;
    if (o.colmax) h += `<tr class="gcmrow"><th class="trh gmax">max по столбцу</th>${[...Array(n).keys()].map(j => `<td class="gm" data-j="${j}"><span class="cv dh"></span></td>`).join('')}${o.rowmin ? '<td></td>' : ''}${o.xs ? '<td></td>' : ''}</tr>`;
    if (o.ys) h += `<tr class="gyrow"><th class="trh">y</th>${[...Array(n).keys()].map(j => `<td class="gy" data-j="${j}"><span class="cv dh"></span></td>`).join('')}${o.rowmin ? '<td></td>' : ''}${o.xs ? '<td></td>' : ''}</tr>`;
    return h + '</tbody></table></div>';
  };
  const gsel = A => ({ c: (i, j) => A.q(`.gmx td.gc[data-i="${i}"][data-j="${j}"]`), cv: (i, j) => A.q(`.gmx td.gc[data-i="${i}"][data-j="${j}"] .cv`), r: i => A.q(`.gmx td.gr[data-i="${i}"] .cv`), rc: i => A.q(`.gmx td.gr[data-i="${i}"]`), m: j => A.q(`.gmx td.gm[data-j="${j}"] .cv`), mc: j => A.q(`.gmx td.gm[data-j="${j}"]`),
    row: i => [...A.qa(`.gmx td.gc[data-i="${i}"]`), A.q(`.gmx th.trh[data-i="${i}"]`)], col: j => A.qa(`.gmx td.gc[data-j="${j}"]`), x: i => A.q(`.gmx td.gx[data-i="${i}"] .cv`), y: j => A.q(`.gmx td.gy[data-j="${j}"] .cv`) });

  /* Сцена 1: нижняя и верхняя цены игры, седловая точка. */
  function gameSaddle(G) {
    const m = G.m, n = G.n;
    const html = `<div class="pvwrap one"><div>${mtbl(G, { rowmin: true, colmax: true })}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const T = gsel(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      await A.wait(250);
      A.cap('Первый игрок выбирает строку и хочет получить побольше; в каждой строке ему гарантирован минимум');
      for (let i = 0; i < m; i++) {
        A.cls(T.row(i), 'k-sel');
        const j0 = [...Array(n).keys()].find(j => G.C[i][j].eq(G.rowMin[i]));
        A.cls(T.c(i, j0), 'k-act'); await A.pulse(T.cv(i, j0));
        await A.put(T.cv(i, j0), T.r(i), fq(G.rowMin[i]), { d: 450 });
        A.cls(T.c(i, j0), 'k-act', false); A.cls(T.row(i), 'k-sel', false);
      }
      A.cap(`Нижняя цена игры α = max из минимумов строк = max(${G.rowMin.map(v => plain(fq(v))).join('; ')}) = ${plain(fq(G.lower))}`);
      G.rowMin.forEach((v, i) => A.cls(T.rc(i), v.eq(G.lower) ? 'k-ok' : 'k-dim'));
      A.set(fm, `<span class="fmh">α = ${fq(G.lower)}</span>`);
      await A.wait(300);
      A.cap('Второй игрок выбирает столбец и хочет проиграть поменьше; в каждом столбце ему грозит максимум');
      for (let j = 0; j < n; j++) {
        A.cls(T.col(j), 'k-sel');
        const i0 = [...Array(m).keys()].find(i => G.C[i][j].eq(G.colMax[j]));
        A.cls(T.c(i0, j), 'k-act'); await A.pulse(T.cv(i0, j));
        await A.put(T.cv(i0, j), T.m(j), fq(G.colMax[j]), { d: 450 });
        A.cls(T.c(i0, j), 'k-act', false); A.cls(T.col(j), 'k-sel', false);
      }
      A.cap(`Верхняя цена игры β = min из максимумов столбцов = min(${G.colMax.map(v => plain(fq(v))).join('; ')}) = ${plain(fq(G.upper))}`);
      G.colMax.forEach((v, j) => A.cls(T.mc(j), v.eq(G.upper) ? 'k-ok' : 'k-dim'));
      A.set(fm, `<span class="fmh">α = ${fq(G.lower)}, β = ${fq(G.upper)}</span>`);
      await A.wait(300);
      if (G.saddle) {
        A.cap(`α = β = ${plain(fq(G.value))}: седловая точка есть — игра решается в чистых стратегиях`);
        G.points.forEach(([i, j]) => A.cls(T.c(i, j), 'k-pe'));
        A.set(fm, `<span class="fmh ok">α = β = ${fq(G.value)} — седловая точка (${G.points.map(([i, j]) => `${i + 1}; ${j + 1}`).join('), (')})</span>`);
        sum.innerHTML = `Седловая точка: игрок 1 выбирает строку ${G.points[0][0] + 1}, игрок 2 — столбец ${G.points[0][1] + 1}. Цена игры <b>u* = ${fq(G.value)}</b>${G.points.length > 1 ? '; седловых точек несколько' : ''}.`;
      } else {
        A.cap(`α = ${plain(fq(G.lower))} < β = ${plain(fq(G.upper))}: седловой точки нет — нужны смешанные стратегии, цена игры лежит между α и β`);
        A.set(fm, `<span class="fmh bad">α &lt; β — седловой точки нет</span>`);
        sum.innerHTML = `Цена игры <b>u*</b> лежит в промежутке [${fq(G.lower)}; ${fq(G.upper)}]. Находим её через задачу ЛП (следующий шаг).`;
      }
      await A.show(sum);
    };
    return { title: 'нижняя и верхняя цены игры, седловая точка', html, script, opts: {} };
  }

  /* Сцена 2: сдвиг матрицы и запись задачи ЛП. */
  function gameShift(G) {
    const m = G.m, n = G.n;
    const html = `<div class="pvwrap"><div><div class="dmh">матрица выигрышей C</div>${mtbl(G, { cls: 'gl' })}</div><div><div class="dmh">после сдвига: P = C + k</div>${mtbl(G, { cls: 'gp2' })}</div></div><div class="pvfm"></div><div class="glp dh"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const fm = A.q('.pvfm'), sum = A.q('.pvsum'), lp = A.q('.glp');
      const L = A.q('.gmx.gl'), Pm = A.q('.gmx.gp2');
      const cl = (T, i, j) => T.querySelector(`td.gc[data-i="${i}"][data-j="${j}"] .cv`);
      await A.wait(250);
      A.cap(`Чтобы свести игру к ЛП, делаем все выигрыши положительными: наименьшее число матрицы ${plain(fq(G.C.flat().reduce((a, v) => v.lt(a) ? v : a)))}, прибавляем k = ${plain(fq(G.k))}`);
      A.set(fm, `<span class="fmh">k = 1 − min C = <b>${fq(G.k)}</b> (цена игры при сдвиге меняется на k)</span>`);
      for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) { A.cls(cl(L, i, j).parentNode, 'k-act'); await A.put(cl(L, i, j), cl(Pm, i, j), fq(G.P[i][j]), { d: 260 }); A.cls(cl(L, i, j).parentNode, 'k-act', false); }
      A.cap('Игрок 1 ищет p<sub>i</sub> = x<sub>i</sub>/v′ (v′ = u + k): тогда Σp<sub>i</sub> = 1/v′, а выигрыш в каждом столбце не меньше 1');
      lp.innerHTML = `<div class="sys"><i>g</i> = ${G.lp.c.map((_, i) => `p<sub>${i + 1}</sub>`).join(' + ')} → min<br>${G.lp.rows.map((r, j) => `${lin(r.a, i => `p<sub>${i + 1}</sub>`)} ≥ 1 <span class="kbd">(столбец ${j + 1})</span>`).join('<br>')}<br>${G.lp.c.map((_, i) => `p<sub>${i + 1}</sub>`).join(', ')} ≥ 0</div>`;
      await A.show(lp);
      sum.innerHTML = 'Минимум Σp = 1/v′ ⇒ v′ = 1/Σp, <i>x</i><sub>i</sub> = p<sub>i</sub>·v′, цена игры <i>u</i> = v′ − k. Эта задача на min с ограничениями «≥» и положительными ценами — стартовая таблица двойственно допустима (все d ≥ 0), для неё подходит двойственный симплекс-метод.';
      await A.show(sum);
    };
    return { title: 'сдвиг матрицы и задача ЛП', html, script, opts: {} };
  }

  /* Сцена 3: чтение стратегий из итоговой таблицы и проверка. */
  function gameAnswer(G) {
    const m = G.m, n = G.n;
    const html = `<div class="pvwrap one"><div>${mtbl(G, { xs: true, ys: true })}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const T = gsel(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      await A.wait(250);
      A.cap(`Из итоговой таблицы: p = (${G.sol.x.map(v => plain(fq(v))).join('; ')}), Σp = ${plain(fq(G.sumP))}, v′ = 1/Σp = ${plain(fq(G.vprime))}`);
      A.set(fm, `<span class="fmh">v′ = 1 / ${fq(G.sumP)} = <b>${fq(G.vprime)}</b></span>`);
      await A.wait(300);
      A.cap('Стратегия первого игрока: x<sub>i</sub> = p<sub>i</sub>·v′');
      for (let i = 0; i < m; i++) { A.set(T.x(i), fq(G.x[i])); await A.pop(T.x(i), { d: 250 }); }
      A.cap('Стратегия второго игрока — из оценок d итоговой таблицы под добавочными переменными (двойственные значения): y<sub>j</sub> = y′<sub>j</sub>·v′');
      for (let j = 0; j < n; j++) { A.set(T.y(j), fq(G.y[j])); await A.pop(T.y(j), { d: 250 }); }
      A.cap(`Цена игры: u = v′ − k = ${plain(fq(G.vprime))} − ${plain(fq(G.k))} = ${plain(fq(G.value))}`);
      A.set(fm, `<span class="fmh">u* = ${fq(G.vprime)} − ${fq(G.k)} = <b>${fq(G.value)}</b></span>`);
      const V = ALGG.verify(G.C, G.x, G.y, G.value);
      A.cap('Проверка: при x выигрыш по каждому столбцу не меньше u*; при y проигрыш по каждой строке не больше u*');
      for (let j = 0; j < n; j++) { A.cls(T.col(j), 'k-act'); await A.wait(120); A.cls(T.col(j), 'k-act', false); A.cls(T.col(j), V.colPay[j].ge(G.value) ? 'k-ok' : 'k-del'); }
      for (let i = 0; i < m; i++) { A.cls(T.row(i), 'k-act'); await A.wait(120); A.cls(T.row(i), 'k-act', false); A.cls(T.row(i), V.rowPay[i].le(G.value) ? 'k-ok' : 'k-del'); }
      sum.innerHTML = `x* = ${vec(G.x)}, y* = ${vec(G.y)}, <b>u* = ${fq(G.value)}</b>`; await A.show(sum);
    };
    return { title: 'стратегии игроков и цена игры', html, script, opts: {} };
  }

  const gameBook = v => v.answer ? { x: v.answer.x.map(Q.parse), y: v.answer.y.map(Q.parse), u: Q.parse(v.answer.u) } : null;
  function gameSections(v, meta) {
    const S = [], G = ALGG.solve(v.C), bk = gameBook(v);
    S.push(sec('cond', 'Условие', `<p>Матричная игра: первый игрок выбирает строку, второй — столбец; число на пересечении — выигрыш первого (проигрыш второго). Найти оптимальные стратегии и цену игры.</p>${mtbl(G)}<p class="kbd">${meta ? meta.title : 'Собственная матрица'}.</p>`));
    const ok = G.status !== 'error', ver = ok ? ALGG.verify(G.C, G.x, G.y, G.value) : null;
    let badge = '<span class="badge info">собственная матрица</span>', cmpHtml = '';
    if (bk && ok) {
      const sameU = G.value.eq(bk.u), vb = ALGG.verify(G.C, bk.x, bk.y, bk.u), sameS = G.x.every((a, i) => a.eq(bk.x[i])) && G.y.every((a, i) => a.eq(bk.y[i]));
      badge = !sameU ? '<span class="badge warn">⚠ цена игры отличается от ответа</span>' : vb.ok ? '<span class="badge ok">✓ совпадает с ответом</span>' : '<span class="badge warn">⚠ стратегии источника не оптимальны — см. «Проверка»</span>';
      cmpHtml = `<p>Ответ в источнике: <b>x* = (${bk.x.map(q => t2(q)).join('; ')}), y* = (${bk.y.map(q => t2(q)).join('; ')}), u* = ${t2(bk.u)}</b>.</p>` +
        (sameU ? (vb.ok ? note('ok', `✓ Цена игры совпадает с ответом${sameS ? ' и стратегии тоже' : '; напечатанные стратегии также оптимальны (оптимальные стратегии могут быть не единственными)'}.`)
          : note('warn', `<b>⚠ Цена игры совпадает (u* = ${fq(G.value)}), но напечатанные стратегии не оптимальны:</b> ${vb.colPay.some(p => p.lt(bk.u)) ? 'при x источника выигрыш в некоторых столбцах меньше u*' : ''}${vb.rowPay.some(p => p.gt(bk.u)) ? '; при y источника проигрыш в некоторых строках больше u* (вероятности, видимо, округлены или перепутаны)' : ''}. Расчёт: x* = ${vec(G.x)}, y* = ${vec(G.y)}.`))
          : note('warn', `<b>⚠ Расхождение с ответом.</b> Расчёт: u* = ${fq(G.value)}, в источнике ${t2(bk.u)}.`));
    }
    S.push(summaryCard({ main: ok ? `<i>u</i>* = ${fq(G.value)}${approx(G.value)}, &nbsp;<i>x</i>* = ${vec(G.x)}, &nbsp;<i>y</i>* = ${vec(G.y)}` : 'не удалось решить', facts: [G.saddle ? 'есть седловая точка' : 'смешанные стратегии', `нижняя цена α = ${t2(G.lower)}`, `верхняя цена β = ${t2(G.upper)}`, ...(G.saddle && G.points.length > 1 ? ['седловых точек несколько'] : [])],
      badges: [badge, ver ? `<span class="badge ${ver.ok ? 'ok' : 'bad'}">${ver.ok ? '✓ стратегии оптимальны (проверено)' : '✗ проверка не пройдена'}</span>` : ''], links: [['saddle', 'Цены игры'], ...(G.saddle ? [] : [['mix', 'Смешанные стратегии']]), ['res', 'Ответ'], ['check', 'Проверка']] }));
    S.push(sec('how', 'Как решается', `<ol class="howl"><li>Нижняя цена α = max<sub>i</sub> min<sub>j</sub> c<sub>ij</sub>, верхняя β = min<sub>j</sub> max<sub>i</sub> c<sub>ij</sub>. Всегда α ≤ β.</li><li>Если α = β — седловая точка: оптимальны чистые стратегии, цена игры u = α.</li><li>Иначе стратегии смешанные: матрицу сдвигаем так, чтобы все числа были &gt; 0, решаем ЛП min Σp при Σ P<sub>ij</sub>p<sub>i</sub> ≥ 1 (двойственным симплекс-методом), затем x = p·v′, u = v′ − k, а y берём из двойственных оценок итоговой таблицы.</li><li>Проверка: при x выигрыш по каждому столбцу ≥ u, при y проигрыш по каждой строке ≤ u.</li></ol>`));
    S.push(sec('saddle', 'Нижняя и верхняя цены игры', one(gameSaddle(G))));
    if (!G.saddle && ok) S.push(sec('mix', 'Смешанные стратегии: решение задачи ЛП', one(gameShift(G)) + '<p>Решаем задачу ЛП двойственным симплекс-методом (все d = 1 ≥ 0, стартовая таблица двойственно допустима):</p>' + dstepper(G.lp, G.sol) + one(gameAnswer(G))));
    S.push(sec('res', 'Ответ', ok ? `<p class="answer"><i>x</i>* = ${vec(G.x)}, &nbsp;<i>y</i>* = ${vec(G.y)}, &nbsp;<i>u</i>* = ${fq(G.value)}${approx(G.value)}</p>` : note('bad', 'Не удалось решить игру.')));
    const chk = ver ? `<div class="tblwrap"><table class="plain"><tr><th>Столбец</th><th>Выигрыш при x</th><th>≥ u*</th></tr>${ver.colPay.map((p, j) => `<tr><td>${j + 1}</td><td class="m">${fq(p)}</td><td class="${p.ge(G.value) ? 'tick' : 'bad-t'}">${p.ge(G.value) ? '✓' : '✗'}</td></tr>`).join('')}</table></div><div class="tblwrap"><table class="plain"><tr><th>Строка</th><th>Проигрыш при y</th><th>≤ u*</th></tr>${ver.rowPay.map((p, i) => `<tr><td>${i + 1}</td><td class="m">${fq(p)}</td><td class="${p.le(G.value) ? 'tick' : 'bad-t'}">${p.le(G.value) ? '✓' : '✗'}</td></tr>`).join('')}</table></div>` : '';
    S.push(sec('check', 'Проверка и сравнение с ответом', chk + cmpHtml + (meta && meta.note ? `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>` : '')));
    return S;
  }
  /* ====================== КАНОНИЧЕСКАЯ ФОРМА (2.1) ====================== */
  const kTerms = (terms, H) => !terms.length ? '0' : terms.map((t, i) => { const neg = t.c.s < 0, a = t.c.abs(), one1 = a.eq(ONE()); return `<span class="vt" data-v="${t.v}">${i ? (neg ? '&nbsp;−&nbsp;' : '&nbsp;+&nbsp;') : (neg ? '−' : '')}${one1 ? '' : fq(a)}${H[t.v]}</span>`; }).join('');
  const kObj = (S, H) => { const c0 = S.obj.c0; const lead = c0.isZero() ? '' : `${fq(c0)} ${S.obj.terms.length ? (S.obj.terms[0].c.s < 0 ? '' : '+ ') : ''}`; return `<i>${S.obj.label}</i> = ${lead}${kTerms(S.obj.terms, H)} → ${S.obj.sense}`; };
  const kRow = (r, H) => `${kTerms(r.terms, H)} ${sg(r.s)} ${fq(r.b)}`;
  const kConds = S => S.conds.map(c => `<span class="kcond ${c.kind}" data-v="${c.v || ''}" data-src="${c.src === undefined ? '' : c.src}">${c.html}</span>`).join(', ');
  const kState = (S, H) => `<div class="drow kl" data-r="o">${kObj(S, H)}</div>` + S.rows.map((r, i) => `<div class="drow kl" data-r="${i}">${kRow(r, H)}${r.note && r.note.box ? ' <span class="kbd">(граница)</span>' : ''}</div>`).join('') + `<div class="drow kc" data-r="c">${kConds(S)}</div>`;

  function canonScene(cv, k) {
    const st = cv.steps[k], H = cv.html, after = st.state;
    const before = st.before || (k === 0 ? cv.state0 : cv.steps[k - 1].state);
    const html = `<div class="kbox">${kState(before, H)}</div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const fm = A.q('.pvfm'), sum = A.q('.pvsum');
      const line = r => A.q(`.kl[data-r="${r}"]`), cond = A.q('.kc');
      const swapLine = async (r, S) => { const el = line(r); if (!el) return; await A.swap(el, r === 'o' ? kObj(S, H) : kRow(S.rows[r], H) + (S.rows[r].note && S.rows[r].note.box ? ' <span class="kbd">(граница)</span>' : ''), 460); };
      await A.wait(250);
      if (st.kind === 'conflict') {
        A.cap('Условия на переменную несовместны: нижняя граница больше верхней');
        A.cls(cond, 'k-del');
        sum.innerHTML = `<b>Канонической формы нет:</b> ${cv.conflicts.map(j => `для x<sub>${j + 1}</sub> условия ${cv.state0.conds.find(c => c.src === j).html}`).join('; ')}. Допустимого значения переменной не существует, поэтому задача не имеет решения.`;
        await A.show(sum); return;
      }
      if (st.kind === 'slack') {
        const rows = before.rows.map((r, i) => ({ r, i })).filter(o => o.r.s !== '=');
        if (!rows.length) { A.cap('Все ограничения уже равенства — дополнительные переменные не нужны'); A.set(fm, '<span class="fmh ok">в системе только «=»</span>'); }
        for (const { r, i } of rows) {
          const y = H[st.state.rows[i].note.y];
          A.cap(r.s === '<=' ? `(${i + 1}) «≤»: прибавляем дополнительную переменную ${y} ≥ 0 — получаем равенство` : `(${i + 1}) «≥»: вычитаем дополнительную переменную ${y} ≥ 0 — получаем равенство`);
          A.cls(line(i), 'on');
          A.set(fm, `<span class="fmh">${kTerms(r.terms, H)} ${sg(r.s)} ${fq(r.b)} &nbsp;⇒&nbsp; ${kTerms(r.terms, H)} ${r.s === '<=' ? '+' : '−'} ${y} = ${fq(r.b)}</span>`);
          await swapLine(i, after); A.cls(line(i), 'on', false); A.cls(line(i), 'done');
        }
        A.swap(cond, kConds(after), 400);
        A.cap('Новые переменные неотрицательны — добавляем это условие'); await A.wait(300);
        sum.innerHTML = 'Все ограничения — равенства. Осталось привести условия на знак переменных к «≥ 0».'; await A.show(sum);
      } else if (st.kind === 'subst') {
        const j = st.j, id = 'x' + (j + 1), x = H[id];
        const cnd = before.conds.find(c => c.src === j);
        A.cap(`Условие на ${x}: ${cnd ? cnd.html : ''} — приводим к виду «≥ 0» заменой переменной`);
        A.cls(A.qa('.kcond').filter(e => e.dataset.src === String(j)), 'k-act');
        await A.wait(350);
        const kindTxt = { ge: 'сдвигаем границу в нуль', le: 'меняем знак (переменная ограничена сверху)', free: 'раскладываем на разность двух неотрицательных', box: 'сдвигаем нижнюю границу в нуль (верхняя станет отдельным ограничением)', fixed: 'переменная принимает единственное значение' }[st.vkind];
        A.cap(`Замена: ${st.text} — ${kindTxt}`);
        A.set(fm, `<span class="fmh">${st.text}</span>`); await A.pop(fm, { d: 300 });
        A.cls(A.qa(`.vt[data-v="${id}"]`), 'k-act'); await A.wait(400);
        const affected = ['o', ...before.rows.map((_, i) => i)].filter(r => (r === 'o' ? before.obj.terms : before.rows[r].terms).some(t => t.v === id));
        for (const r of affected) {
          const bR = r === 'o' ? before.obj : before.rows[r], aR = r === 'o' ? after.obj : after.rows[r];
          const d = r === 'o' ? aR.c0.sub(bR.c0) : bR.b.sub(aR.b);
          A.cap(r === 'o' ? `Цель: подставляем замену${d.isZero() ? '' : `; постоянное слагаемое ${plain(fq(d))} выносим в свободный член`}` : `Ограничение (${r + 1}): подставляем замену${d.isZero() ? '' : `; число ${plain(fq(d))} переносим в правую часть: ${plain(fq(bR.b))} − ${plain(fqp(d))} = ${plain(fq(aR.b))}`}`);
          A.cls(line(r), 'on'); await swapLine(r, after); A.cls(line(r), 'on', false); A.cls(line(r), 'done');
        }
        if (st.boxRow) {
          A.cap(`Верхняя граница x′ ≤ ${plain(fq(st.boxRow.b))} превращается в ограничение с дополнительной переменной: ${plain(kTerms(st.boxRow.terms, H))} = ${plain(fq(st.boxRow.b))}`);
          const el = document.createElement('div'); el.className = 'drow kl dh'; el.dataset.r = String(after.rows.length - 1); el.innerHTML = kRow(st.boxRow, H) + ' <span class="kbd">(граница)</span>';
          cond.parentNode.insertBefore(el, cond); await A.pop(el);
        }
        await A.swap(cond, kConds(after), 400);
        A.cap('Теперь все новые переменные неотрицательны'); await A.wait(250);
        sum.innerHTML = `Переменная ${x} исключена: ${st.text}.`; await A.show(sum);
      } else {
        if (st.same) { A.cap('Цель уже на минимум — оставляем как есть'); A.set(fm, '<span class="fmh ok">min → без изменений</span>'); sum.innerHTML = 'Цель не меняется.'; await A.show(sum); return; }
        A.cap('Каноническая форма требует минимума: заменяем max L на min L′ = −L — все коэффициенты цели (и свободный член) меняют знак');
        A.cls(line('o'), 'on'); A.set(fm, '<span class="fmh">L′ = −L → min</span>');
        await swapLine('o', after); A.cls(line('o'), 'on', false); A.cls(line('o'), 'done');
        sum.innerHTML = 'Решение исходной задачи: L* = −L′*.'; await A.show(sum);
      }
    };
    const titles = { slack: 'шаг 1: ограничения → равенства', subst: `шаг: условие на x${(st.j || 0) + 1} → «≥ 0»`, min: 'последний шаг: цель на минимум', conflict: 'противоречивые условия' };
    return { title: titles[st.kind], html, script, opts: {} };
  }

  function canonSections(v, meta) {
    const S = [];
    const pr = { n: v.n, sense: v.sense, c: v.c.map(Q.of), rows: v.rows.map(r => ({ a: r.a.map(Q.of), s: r.s, b: Q.of(r.b) })), bounds: (v.bounds || []).map(B => ({ j: B.j, s: B.s, b: Q.of(B.b) })) };
    if (v.c0 !== undefined) pr.c0 = Q.of(v.c0);
    const cv0 = ALGK.convert(pr), S0 = cv0.state0;
    const sys = `<div class="sys">${kObj(S0, cv0.html)}<br>${S0.rows.map((r, i) => `${kRow(r, cv0.html)} <span class="kbd">(${i + 1})</span>`).join('<br>')}<br>${kConds(S0)}</div>`;
    S.push(sec('cond', 'Условие', `<p>Привести задачу ЛП к канонической форме: минимизация, все ограничения — равенства, все переменные ≥ 0. Переменные без условий — свободные.</p>${sys}<p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`));
    if (v.broken) {
      S.push(summaryCard({ main: 'условие в источнике неполное', badges: ['<span class="badge warn">⚠ см. примечание</span>'], links: [] }));
      S.push(sec('res', 'Ответ', note('bad', '<b>Приведение невозможно:</b> в источнике первое ограничение напечатано без знака и правой части, поэтому система определена не полностью. Условие сохранено как напечатано; введите полное ограничение в режиме «свои коэффициенты».') + (meta && meta.note ? `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>` : '')));
      return S;
    }
    const cv = cv0, ver = ALGK.verify(pr, cv), H = cv.html;
    S.push(summaryCard({ main: cv.status === 'ok' ? `канонических переменных: ${cv.vars.length}, уравнений: ${cv.final.rows.length}` : 'условия на переменные противоречивы',
      facts: cv.status === 'ok' ? [`дополнительных переменных: ${cv.vars.filter(x => x[0] === 'y' || x[0] === 'w').length}`, `шагов преобразования: ${cv.steps.length}`, ...(pr.sense === 'max' ? ['цель max → min'] : [])] : [],
      badges: [cv.status === 'ok' ? (ver.sameStatus && (!ver.x || (ver.sameValue && ver.feasible)) ? '<span class="badge ok">✓ оптимумы задач совпадают</span>' : '<span class="badge bad">✗ оптимумы не совпали</span>') : '<span class="badge warn">⚠ нет канонической формы</span>'],
      links: [['steps', 'Преобразования'], ['res', 'Каноническая форма'], ['check', 'Проверка']] }));
    S.push(sec('how', 'Как решается', `<ol class="howl"><li><b>Неравенства → равенства.</b> В «≤» прибавляем, из «≥» вычитаем неотрицательную дополнительную переменную y.</li><li><b>Условия на переменные → «≥ 0».</b> x ≥ l: x = x′ + l; x ≤ u: x = u − x′; l ≤ x ≤ u: x = x′ + l и ограничение x′ + w = u − l; свободная: x = x′ − x″. Постоянные слагаемые переносятся в правые части и в свободный член цели.</li><li><b>Цель на минимум.</b> max L заменяем на min L′ = −L.</li><li>Проверка: исходная и каноническая задачи решаются независимо — оптимумы должны совпасть (L* = −L′*), а решение переводится обратно в x.</li></ol>`));
    const items = cv.steps.map((s, k) => ({ label: s.kind === 'slack' ? 'y' : s.kind === 'subst' ? `x<sub>${s.j + 1}</sub>` : s.kind === 'min' ? 'min' : '!', title: s.kind, build: () => canonScene(cv, k) }));
    S.push(sec('steps', 'Пошаговое преобразование', stepperOf(items)));
    if (cv.status !== 'ok') {
      S.push(sec('res', 'Ответ', note('bad', `<b>Канонической формы не существует:</b> для ${cv.conflicts.map(j => 'x<sub>' + (j + 1) + '</sub>').join(', ')} нижняя граница больше верхней. Допустимого значения нет — задача не имеет решения.`)));
      S.push(sec('check', 'Проверка', (meta && meta.note ? `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>` : '') + '<p>Проверка не требуется: допустимой области нет.</p>'));
      return S;
    }
    const F = cv.final;
    S.push(sec('res', 'Каноническая форма', `<div class="sys">${kObj(F, H)}<br>${F.rows.map((r, i) => `${kRow(r, H)} <span class="kbd">(${i + 1})</span>`).join('<br>')}<br>${cv.vars.map(x => H[x]).join(', ')} ≥ 0</div>
      <p>Связь с исходными переменными: ${cv.back.map((b, j) => `${xv(j + 1)} = ${(!b.konst.isZero() ? fq(b.konst) + (b.terms.length ? (b.terms[0].c.s < 0 ? ' ' : ' + ') : '') : '') + (b.terms.length ? kTerms(b.terms, H) : (b.konst.isZero() ? '0' : ''))}`).join('; ')}.</p>`));
    let ck = '';
    if (ver.orig.status === 'optimal' && ver.canon.status === 'optimal') {
      ck = `<p>Решаем независимо исходную и каноническую задачи (точная арифметика):</p><ul><li>исходная: <i>L</i>* = ${fq(ver.orig.f)} в точке ${vec(ver.orig.x)};</li><li>каноническая: <i>L′</i>* = ${fq(ver.Lcanon)} ⇒ <i>L</i>* = ${pr.sense === 'max' ? '−' : ''}(${fq(ver.Lcanon)}) = ${fq(ver.L)};</li><li>обратный перевод решения: <i>x</i> = ${vec(ver.x)}, ${ver.feasible ? 'подстановка в исходные ограничения и условия выполнена' : 'ограничение нарушено!'}, <i>L</i>(x) = ${fq(ver.fx)}.</li></ul>${ver.sameValue && ver.feasible ? note('ok', '✓ Оптимумы совпадают, решение канонической задачи переводится в допустимое решение исходной.') : note('bad', '✗ Значения не совпали.')}`;
    } else ck = `<p>Обе задачи имеют одинаковый статус: ${statusText(ver.orig.status)}.</p>${ver.sameStatus ? note('ok', '✓ Статусы исходной и канонической задач совпадают.') : note('bad', '✗ Статусы различаются.')}`;
    S.push(sec('check', 'Проверка', ck + (meta && meta.note ? `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>` : '')));
    return S;
  }
  /* ====================== МЕТОД ГОМОРИ ====================== */
  const sub2 = k => String(k).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('');
  function cutSpec(pr, res, k) {
    const s = res.steps[k], nxt = res.steps[k + 1], cut = s.cut, vars = s.vars, cols = s.cols, m = s.rows.length, p = cut.row;
    const sv = nxt.vars.length - 1, Sn = vname(nxt.vars, sv);
    const html = `<div class="pvwrap"><div><div class="dmh">было: оптимальная таблица (есть дробные b)</div>${dtb(s, { cls: 'tO', fq: fqM })}</div><div><div class="dmh">стало: добавлено отсечение</div>${dtb(nxt, { cls: 'tN', fq: fqM })}</div></div><div class="pvfm"></div><div class="pvfm gfa"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const { C, V } = sceneTools(A), fm = A.q('.pvfm'), fa = A.q('.gfa'), sum = A.q('.pvsum');
      const rowAll = i => [C('tO', i, 'bas'), C('tO', i, -1), ...cols.map(j => C('tO', i, j))];
      [-1, ...nxt.cols].forEach(j => A.set(V('tN', m, j), '')); A.set(V('tN', m, 'bas'), '');
      await A.wait(250);
      A.cap('Решение LP нецелое: в столбце b есть дробные числа — целое решение нужно получить отсечением');
      const fr = cut.fracRows;
      for (let i = 0; i < m; i++) A.cls(C('tO', i, -1), fr.some(o => o.i === i) ? 'k-act' : 'k-ok');
      A.set(fm, `<span class="fmh">дробные части {b}: ${fr.map(o => `${vK(vars, s.basis[o.i])}: <span class="fb" data-i="${o.i}">□</span>`).join('; ')}</span>`);
      await A.each(fr, async o => { await A.put(V('tO', o.i, -1), A.q(`.fb[data-i="${o.i}"]`), fq(o.f), { d: 450 }); });
      A.cap(`Выбираем строку с наибольшей дробной частью: ${vK(vars, s.basis[p])}, {b} = ${plain(fq(cut.fb))}${fr.filter(o => o.f.eq(cut.fb)).length > 1 ? ' (одинаковые — берём меньший номер переменной)' : ''}`);
      for (let i = 0; i < m; i++) { A.cls(C('tO', i, -1), 'k-act', false); A.cls(C('tO', i, -1), 'k-ok', false); }
      A.cls(rowAll(p), 'k-sel'); await A.pulse(V('tO', p, -1));
      A.cap('Дробные части коэффициентов этой строки при небазисных переменных: {a} = a − [a] (для отрицательных a получается положительное число)');
      A.set(fa, `<span class="fmh">${cut.parts.map(pt => `{${plain(vname(vars, pt.j))}}: <span class="fc" data-j="${pt.j}">□</span>`).join('; ')}</span>`);
      await A.each(cut.parts, async pt => { A.cls(C('tO', p, pt.j), 'k-act'); await A.put(V('tO', p, pt.j), A.q(`.fc[data-j="${pt.j}"]`), fq(pt.f), { d: 420 }); A.cls(C('tO', p, pt.j), 'k-act', false); });
      A.cap(`Отсечение Гомори: Σ{a}·x ≥ {b}, то есть −Σ{a}·x + ${Sn} = −{b}, где ${Sn} ≥ 0 — новая переменная`);
      const ineq = `${cut.parts.filter(pt => !pt.f.isZero()).map(pt => `${fq(pt.f)}·${vname(vars, pt.j)}`).join(' + ') || '0'} ≥ ${fq(cut.fb)}`;
      A.set(fm, `<span class="fmh">${ineq}</span>`);
      A.set(fa, '');
      A.cap('Записываем отсечение новой строкой таблицы: коэффициенты — {a} со знаком «−», правая часть −{b}');
      A.cls(C('tN', m, 'bas'), 'k-ok');
      A.set(V('tN', m, 'bas'), vK(nxt.vars, sv)); await A.pop(V('tN', m, 'bas'), { d: 350 });
      for (const j of nxt.cols) {
        if (j === sv) { A.set(V('tN', m, j), '1'); await A.pop(V('tN', m, j), { d: 140 }); continue; }
        const pt = cut.parts.find(q => q.j === j), val = nxt.rows[m].a[j];
        if (pt && !pt.f.isZero()) await A.put(V('tO', p, j), V('tN', m, j), fq(val), { d: 380 });
        else { A.set(V('tN', m, j), fq(val)); A.cls(C('tN', m, j), 'zc'); await A.pop(V('tN', m, j), { d: 140 }); }
      }
      A.set(V('tN', m, -1), fq(nxt.rows[m].b)); await A.pop(V('tN', m, -1), { d: 300 });
      A.cls(rowAll(p), 'k-sel', false);
      A.cap('Новая строка имеет b < 0 — базис недопустим; решение продолжает двойственный симплекс-метод (d ≥ 0 сохраняются)');
      A.cls(C('tN', m, -1), 'k-del');
      sum.innerHTML = `Отсечение ${cut.id}: <b>${ineq}</b>. Текущая нецелая вершина ему не удовлетворяет (при нулевых небазисных левая часть 0 &lt; ${fq(cut.fb)}), а все целые точки — удовлетворяют.`;
      await A.show(sum);
    };
    return { title: `Отсечение ${cut.id}: строка ${plain(vname(vars, s.basis[p]))}`, html, script, opts: {} };
  }

  function gomEndSpec(pr, res, s) {
    const m = s.rows.length, vars = s.vars, cols = s.cols, zl = zlab(s.z.label);
    const html = `<div class="pvwrap one"><div>${dtb(s, { cls: 'tO', fq: fqM })}</div></div><div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const { C, V } = sceneTools(A), fm = A.q('.pvfm'), sum = A.q('.pvsum');
      await A.wait(250);
      A.cap('Проверяем столбец b: допустимость — все b ≥ 0, и целочисленность — все b целые');
      for (let i = 0; i < m; i++) { A.cls(C('tO', i, -1), 'k-act'); await A.wait(80); A.cls(C('tO', i, -1), 'k-act', false); A.cls(C('tO', i, -1), s.rows[i].b.a.isInt() && s.rows[i].b.s >= 0 ? 'k-ok' : 'k-del'); }
      A.cap(`Строка ${zl}: все d ≥ 0 — оптимальность`);
      for (const j of cols) A.cls(C('tO', m, j), 'k-ok');
      A.set(fm, '<span class="fmh ok">все b целые и ≥ 0, все d ≥ 0 ⇒ целочисленное оптимальное решение</span>'); await A.pulse(fm);
      A.cap('Читаем решение: базисные переменные равны своему b, остальные — 0');
      await A.each(s.rows.map((_, i) => i), async i => { A.cls([C('tO', i, 'bas'), C('tO', i, -1)], 'k-sel'); await A.pulse(V('tO', i, -1)); });
      sum.innerHTML = `${s.basis.map((bj, i) => `${vK(vars, bj)} = ${fqM(s.rows[i].b)}`).join(', ')}; остальные = 0. &nbsp;<b>${s.z.label.replace('−', '')}</b> = ${fq(res.f)}`; await A.show(sum);
    };
    return { html, script, opts: {} };
  }

  function gomScene(pr, res, k) {
    const steps = res.steps, s = steps[k];
    if (s.kind === 'cut') return cutSpec(pr, res, k);
    if (s.kind === 'end') {
      if (s.terminal === 'infeasible') return { title: `Таблица ${k}: допустимых решений нет`, ...K.dualEndSpec(pr, { status: 'infeasible' }, s) };
      if (s.terminal === 'optimal') return { title: `Таблица ${k}: целочисленное решение`, ...gomEndSpec(pr, res, s) };
      return { title: `Таблица ${k}: лимит отсечений`, ...K.dualEndSpec(pr, { status: 'cycle' }, { ...s, terminal: 'cycle' }) };
    }
    const sp = K.pivotSpec(s, steps[k + 1], { dual: true, sel: K.dualSel(s), fq: fqM, par: parM, realZ: K.dualRz(pr) });
    return { title: `Как пересчитать таблицу на шаге ${k + 1}?`, ...sp };
  }
  const gomStepper = (pr, res) => stepperOf(res.steps.map((s, k) => ({ label: s.kind === 'cut' ? `S<sub>${s.cut.id}</sub>` : s.kind === 'end' ? 'итог' : String(k), title: s.kind, build: () => gomScene(pr, res, k) })));
  const gomHint = s => s.kind === 'cut' ? ` — отсечение ${s.cut.id} по строке ${vname(s.vars, s.basis[s.p])}: {b} = ${fq(s.cut.fb)}` : s.kind === 'D' ? ` — выходит ${vname(s.vars, s.basis[s.p])}, входит ${vname(s.vars, s.q)}, ведущий элемент ${fqM(s.rows[s.p].a[s.q])}` : s.terminal === 'optimal' ? ' — итоговая (целочисленная)' : s.terminal === 'infeasible' ? ' — допустимых решений нет' : ' — лимит';
  const gomAll = res => res.steps.map((s, k) => `<div class="tcap">Таблица ${k}${gomHint(s)}</div>${dtb(s, { fq: fqM, hl: s.kind === 'D' })}`).join('');
  const zrows = (pr, lab) => pr.rows.map(r => `${lin(r.a, j => lab(j + 1))} ${sg(r.s)} ${fq(r.b)}`);

  function gomorySections(v, meta) {
    const S = [], prIn = { n: v.n, sense: v.sense, c: v.c.map(Q.of), rows: v.rows.map(r => ({ a: r.a.map(Q.of), s: r.s, b: Q.of(r.b) })) };
    if (v.c0 !== undefined) prIn.c0 = Q.of(v.c0);
    const res = ALGI.solve(prIn), pr = res.pr;
    S.push(sec('cond', 'Условие', system(prIn).replace('≥ 0</div>', '≥ 0, целые</div>') + `<p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`));
    const okI = res.status === 'optimal';
    const ref = res.status === 'limit' ? ALGI.bnb(prIn) : null;
    const fin = okI ? { x: res.x, f: res.f } : ref && ref.status === 'optimal' ? { x: ref.x, f: ref.f, ref: true } : null;
    const main = okI ? `<i>x</i>* = ${vec(res.x)}, &nbsp;<i>f</i>* = ${fq(res.f)}` : res.status === 'noint' ? 'целочисленных решений нет' : res.status === 'limit' ? (fin ? `<i>x</i>* = ${vec(fin.x)}, &nbsp;<i>f</i>* = ${fq(fin.f)} <span class="kbd">(сверка ветвями и границами)</span>` : 'не найдено') : cap2(statusText(res.status));
    const finOk = fin && fin.x && ALG.check(prIn, fin.x).every(c => c.ok) && fin.x.every(q => q.isInt());
    S.push(summaryCard({ main, facts: [`отсечений: ${res.cuts}`, ...(res.info && res.info.changed ? ['строки приведены к целым'] : []), ...(res.status === 'limit' ? ['отсечения сходятся медленно'] : [])], badges: [bookBadgeI(v, res, fin), fin && fin.x ? `<span class="badge ${finOk ? 'ok' : 'bad'}">${finOk ? '✓ допустимо и целочисленно' : '✗ проверка не пройдена'}</span>` : ''], links: [['lp', 'Задача ЛП'], ['cuts', 'Отсечения Гомори'], ['res', 'Ответ'], ['check', 'Проверка']] }));
    S.push(sec('how', 'Как решается', `<ol class="howl"><li>Решаем задачу ЛП без требования целочисленности (симплекс-метод). Если решение целое — готово.</li><li>Выбираем строку с дробным значением базисной переменной (с наибольшей дробной частью {b}).</li><li><b>Отсечение Гомори:</b> Σ<sub>j∈J</sub> {a<sub>ij</sub>}·x<sub>j</sub> ≥ {b<sub>i</sub>}, где J — небазисные переменные, {·} — дробная часть. Его выполняют все целые допустимые точки, а текущая вершина — нет.</li><li>Добавляем отсечение строкой −Σ{a}x + S = −{b} (S ≥ 0) и продолжаем <b>двойственным симплекс-методом</b>: d ≥ 0 сохраняются, исправляется b &lt; 0.</li><li>Повторяем, пока все b не станут целыми. Если после отсечения допустимых решений нет — целочисленных решений нет.</li></ol><p class="kbd">Отсечение верно, когда все переменные, включая добавочные, целые: для этого строки с дробными коэффициентами умножаются на общий знаменатель.</p>`));
    if (res.info.changed) S.push(sec('scale', 'Приведение к целым коэффициентам', `<p>Чтобы добавочные переменные тоже были целыми, умножаем ограничения с дробными коэффициентами на общий знаменатель:</p><div class="sys">${zrows(pr, xv).map((r, i) => `${r} ${res.info.scales[i].eq(ONE()) ? '' : `<span class="kbd">(было ${zrows(prIn, xv)[i]}, множитель ${fq(res.info.scales[i])})</span>`}`).join('<br>')}</div>`));
    const lp = res.lp;
    if (lp.status !== 'optimal') {
      S.push(sec('lp', 'Задача ЛП (релаксация)', note('bad', `<b>${cap2(statusText(lp.status))}.</b> ${lp.status === 'infeasible' ? 'Даже без требования целочисленности допустимых решений нет — целочисленных тем более.' : 'Без требования целочисленности цель не ограничена — задача не имеет конечного оптимума.'}`)));
      S.push(sec('res', 'Ответ', note('bad', `<b>${cap2(statusText(lp.status))}.</b>`)));
      S.push(sec('check', 'Проверка и сравнение с ответом', cmpGom(v, res, null, meta, prIn)));
      return S;
    }
    S.push(sec('lp', 'Задача ЛП без целочисленности', `<p>Решение релаксации: <i>x</i> = ${vec(lp.x)}, <i>f</i> = ${fq(lp.f)}${lp.x.every(q => q.isInt()) ? ' — решение уже целое.' : ' — есть дробные координаты, нужны отсечения.'}</p>` + (lp.phase1 ? R.stepper(lp.phase1.steps, 'Этап 1 (искусственный базис)') : '') + R.stepper(lp.phase2.steps, 'Симплекс-метод')));
    S.push(sec('cuts', 'Отсечения Гомори и двойственный симплекс-метод', gomStepper(pr, res)));
    S.push(sec('all', 'Все таблицы подряд', gomAll(res)));
    let rh;
    if (okI) rh = `<p>В итоговой таблице все базисные переменные целые.</p><p class="answer"><i>x</i>* = ${vec(res.x)}, &nbsp;<i>f</i>* = ${fq(res.f)}${approx(res.f)}</p>`;
    else if (res.status === 'noint') rh = note('bad', '<b>Целочисленных решений нет:</b> после добавления отсечения в его строке нет отрицательных коэффициентов при b &lt; 0 — допустимая область пуста.');
    else rh = note('warn', `<b>Метод Гомори не завершился за ${res.cuts} отсечений</b> (дробные отсечения могут сходиться очень медленно).${fin ? ` Для сверки задача решена ветвями и границами: <i>x</i>* = ${vec(fin.x)}, <i>f</i>* = ${fq(fin.f)}.` : ''}`);
    S.push(sec('res', 'Ответ', rh));
    S.push(sec('check', 'Проверка и сравнение с ответом', (fin && fin.x ? checkTable(prIn, fin.x) + valueLine(prIn, fin.x) : '') + cmpGom(v, res, fin, meta, prIn)));
    return S;
  }
  function bookBadgeI(v, res, fin) {
    const A = v.answer; if (!A) return '<span class="badge info">собственные коэффициенты</span>';
    if (A.none) return res.status === 'noint' || (res.lp && res.lp.status === 'infeasible') ? '<span class="badge ok">✓ совпадает с ответом</span>' : '<span class="badge warn">⚠ в источнике другой ответ — см. «Проверка»</span>';
    return fin && fin.f.eq(Q.parse(A.f)) ? '<span class="badge ok">✓ совпадает с ответом</span>' : '<span class="badge warn">⚠ в источнике другой ответ — см. «Проверка»</span>';
  }
  function cmpGom(v, res, fin, meta, prIn) {
    const A = v.answer; let h = '';
    if (A) {
      if (A.none) {
        h += '<p>Ответ в источнике: <b>целочисленных решений нет</b>.</p>';
        h += res.status === 'noint' || (res.lp && res.lp.status === 'infeasible') ? note('ok', '✓ Расчёт совпадает с ответом источника.') : note('warn', `<b>⚠ Расхождение с ответом источника.</b> Расчёт нашёл целочисленное решение ${fin ? `<i>x</i> = ${vec(fin.x)}, <i>f</i> = ${fq(fin.f)}` : ''}.`);
      } else {
        const xb = A.x.map(Q.parse), fb = Q.parse(A.f), xn = xb.slice(0, prIn.n);
        h += `<p>Ответ в источнике: <b><i>f</i>* = ${A.f.replace('-', '−')}, <i>x</i>* = (${A.x.join('; ')})</b>.</p>`;
        if (fin && fin.f.eq(fb)) {
          const same = xn.length === prIn.n && fin.x.every((q, i) => q.eq(xn[i]));
          h += note('ok', `✓ Расчёт совпадает с ответом источника${same ? '' : ': значение цели то же, точка другая — оптимум не единственный'}${A.x.length > prIn.n ? ` (в источнике после координат x₁…x${sub2(prIn.n)} выписаны значения добавочных переменных)` : ''}.`);
        } else {
          const ck = xn.length === prIn.n ? ALG.check(prIn, xn) : null, feas = ck && ck.every(c => c.ok) && xn.every(q => q.s >= 0), fv = ck ? ALGZ.fv(prIn, xn) : null;
          h += note('warn', `<b>⚠ Расхождение с ответом источника.</b><ul>${ck ? (feas ? `<li>точка из ответа допустима, значение цели в ней ${fq(fv)}${fv.eq(fb) ? '' : ` (в источнике указано ${A.f})`};</li>` : `<li>точка из ответа <b>недопустима</b>${ck.map((c, i) => c.ok ? '' : `: ограничение (${i + 1}) — ${fq(c.lhs)} ${sg(prIn.rows[i].s)} ${fq(prIn.rows[i].b)} не выполнено`).join('')};</li>`) : ''}<li>расчёт: ${fin ? `<i>f</i>* = ${fq(fin.f)} в точке ${vec(fin.x)}` : res.status === 'noint' ? 'целочисленных решений нет' : (res.lp && res.lp.status !== 'optimal') ? statusText(res.lp.status) : '—'}.</li></ul>`);
        }
      }
    }
    if (meta && meta.note) h += `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>`;
    return h;
  }
  /* ====================== ПРОВЕРКА ВЕКТОРА НА ОПТИМАЛЬНОСТЬ (2.8) ====================== */
  const ylab2 = i => yv(i + 1);
  const toPrV = v => { const pr = { n: v.n, sense: v.sense, c: v.c.map(Q.of), rows: v.rows.map(r => ({ a: r.a.map(Q.of), s: r.s, b: Q.of(r.b) })) }; if (v.c0 !== undefined) pr.c0 = Q.of(v.c0); return pr; };

  /* Подстановка вектора в ограничения и условия x ≥ 0. */
  function demoFeas(pr, res) {
    const x = res.x, m = pr.rows.length;
    const chips = `<div class="dmbig"><i>x̄</i> = (${x.map((v, j) => `<span class="ch xs" data-j="${j}">${xv(j + 1)} = ${fq(v)}</span>`).join('; ')})</div>`;
    const rows = pr.rows.map((r, i) => `<div class="drow ocr" data-i="${i}"><span class="kbd">(${i + 1})</span> <span class="lhs">${TM(r.a, xlab)}</span> <span class="ch rs">${sg(r.s)}</span> ${fq(r.b)} <span class="ch okc dh"></span></div>`).join('');
    const nn = `<div class="drow ocn"><span class="kbd">x ≥ 0</span> ${x.map((v, j) => `<span class="ch nnc" data-j="${j}">${xv(j + 1)} = ${fq(v)}<span class="okc dh"> ${v.s >= 0 ? '✓' : '✕'}</span></span>`).join('; ')}</div>`;
    const html = `${chips}<div class="dmh" style="margin-top:6px">подстановка в ограничения</div>${rows}${nn}`;
    const script = async A => {
      await A.wait(250);
      for (let i = 0; i < m; i++) {
        const row = A.q(`.ocr[data-i="${i}"]`), r = pr.rows[i], stt = termIn(r.a, (j, one1) => (one1 ? '' : '·') + par(x[j]));
        const ck = res.rowCheck[i];
        A.cap(`Ограничение (${i + 1}): подставляем x̄ — левая часть ${plain(fq(ck.lhs))}`);
        A.cls(row, 'on');
        await A.seq([...row.querySelectorAll('.tm')], 90, (el, k) => { const jj = +el.dataset.j; return A.fly(A.q(`.xs[data-j="${jj}"]`), el, plain(fq(x[jj])), { d: 600 }).then(() => A.swap(el, stt[k] ? stt[k].h : el.innerHTML, 380)); });
        await A.swap(row.querySelector('.lhs'), `<b>${fq(ck.lhs)}</b>`, 420);
        const mk = row.querySelector('.okc');
        mk.innerHTML = ck.ok ? (ck.tight ? '✓ активно (равенство)' : `✓ запас ${fq(ck.lhs.sub(r.b).abs())}`) : '✕ не выполнено'; mk.style.color = ck.ok ? '' : '#c0284f';
        await A.pop(mk); A.cls(row, 'on', false); A.cls(row, ck.ok ? 'done' : 'bad');
      }
      A.cap('Проверяем условия неотрицательности x̄ ≥ 0');
      const nnr = A.q('.ocn'); A.cls(nnr, 'on');
      await A.seq(A.qa('.nnc .okc'), 120, el => A.pop(el));
      A.cls(nnr, 'on', false); A.cls(nnr, res.negative.length ? 'bad' : 'done');
      A.cap(res.feasible ? 'x̄ допустим: все ограничения и условия выполнены — можно проверять оптимальность' : `x̄ недопустим${res.negative.length ? ` (отрицательные координаты: ${res.negative.map(j => plain(xv(j + 1))).join(', ')})` : ''} — недопустимый вектор не может быть оптимальным`);
    };
    return demo('шаг 1: допустим ли вектор — подстановка в ограничения', html, script);
  }

  /* Условия дополняющей нежёсткости: какие y равны нулю и какие ограничения двойственной — равенства. */
  function demoCS(pr, res) {
    const D = res.D, m = pr.rows.length, n = pr.n;
    const html = `<div class="dmh">двойственная задача: ограничения Д<sub>j</sub> (по одному на каждую переменную x<sub>j</sub>)</div>` + D.rows.map((r, j) => `<div class="drow dcr" data-j="${j}"><span class="kbd">Д${j + 1}</span> <span class="lhs">${TM(r.a, ylab2)}</span> <span class="ch rs">${sg(r.s)}</span> ${fq(r.b)}</div>`).join('') + '<div class="pvfm"></div><div class="pvsum dh"></div>';
    const script = async A => {
      const sum = A.q('.pvsum');
      await A.wait(250);
      A.cap('Теорема о дополняющей нежёсткости: допустимые x и y оптимальны, если в каждой паре «ограничение — связанная переменная» хотя бы одно выполнено как равенство');
      for (let i = 0; i < m; i++) {
        const ck = res.rowCheck[i];
        if (!res.zeroY[i]) { A.cap(`Ограничение (${i + 1}) активно (равенство) — ${plain(ylab2(i))} пока неизвестна`); await A.wait(150); continue; }
        A.cap(`Ограничение (${i + 1}) выполнено со строгим запасом ${plain(fq(ck.lhs.sub(pr.rows[i].b).abs()))} ⇒ ${plain(ylab2(i))} = 0`);
        const els = A.qa('.dcr .tm').filter(e => +e.dataset.j === i);
        A.cls(els, 'strike'); await A.wait(450);
        await A.seq(els, 60, el => { const w = el.offsetWidth; A.cls(el, 'cut'); return A.anim(el, [{ width: w + 'px', opacity: 1 }, { width: '0px', opacity: 0, padding: 0 }], { d: 450 }); });
      }
      A.cap('Переменные x̄<sub>j</sub> > 0: соответствующее ограничение двойственной обязано быть равенством');
      for (let j = 0; j < n; j++) {
        const row = A.q(`.dcr[data-j="${j}"]`);
        if (!res.eqJ[j]) { A.cap(`${plain(xv(j + 1))} = 0 — ограничение Д${j + 1} остаётся неравенством «${sg(D.rows[j].s)}»`); A.cls(row, 'k-dim'); await A.wait(150); continue; }
        A.cap(`${plain(xv(j + 1))} = ${plain(fq(res.x[j]))} > 0 ⇒ Д${j + 1} — равенство`);
        A.cls(row, 'on'); await A.swap(row.querySelector('.rs'), '=', 420); A.cls(row, 'on', false); A.cls(row, 'done');
      }
      A.cap(`Получили ${res.eqs.length} уравнений относительно y${res.eqs.length ? '' : ' — система пуста'}`);
      sum.innerHTML = res.eqs.length ? `Система УДН: ${res.eqs.map(e => e.kind === 'y' ? `${yv(e.i + 1)} = 0` : `Д${e.j + 1}: ${lin(e.a, ylab2)} = ${fq(e.b)}`).join('; ')}.` : 'Уравнений нет: остаётся проверить неравенства двойственной задачи.'; await A.show(sum);
    };
    return demo('шаг 3: условия дополняющей нежёсткости (УДН)', html, script);
  }

  /* Итог проверки: подстановка y в двойственные ограничения и сравнение значений. */
  function demoVerdict(pr, res, y) {
    const D = res.D;
    const ysH = y ? `<div class="dmbig"><i>y</i> = (${y.map((v, i) => `<span class="ch ys" data-i="${i}">${yv(i + 1)} = ${fq(v)}</span>`).join('; ')})</div>` : '';
    const rows = y ? D.rows.map((r, j) => `<div class="drow vr" data-j="${j}"><span class="kbd">Д${j + 1}</span> <span class="lhs">${TM(r.a, ylab2)}</span> <span class="ch rs">${sg(r.s)}</span> ${fq(r.b)} <span class="ch okc dh"></span></div>`).join('') : '';
    const sg2 = y ? `<div class="drow vsg">${y.map((v, i) => { const s = D.signs[i], ok = s === 'free' || (s === '>=' ? v.s >= 0 : v.s <= 0); return `<span class="ch sgc" data-i="${i}">${yv(i + 1)} ${s === 'free' ? 'любого знака' : s === '>=' ? '≥ 0' : '≤ 0'}<span class="okc dh"> ${ok ? '✓' : '✕'}</span></span>`; }).join('; ')}</div>` : '';
    const html = `${ysH}${rows}${sg2}<div class="pvfm"></div><div class="pvsum dh"></div>`;
    const script = async A => {
      const fm = A.q('.pvfm'), sum = A.q('.pvsum');
      await A.wait(250);
      if (!y) {
        A.cap(res.gauss && res.gauss.status !== 'ok' ? 'Система УДН несовместна: допустимого y с дополняющей нежёсткостью не существует' : 'Среди решений системы УДН нет допустимого для двойственной задачи');
        sum.innerHTML = '<b>Вектор не оптимален:</b> для него нельзя подобрать двойственный план, удовлетворяющий УДН и условиям двойственной задачи.'; await A.show(sum); return;
      }
      A.cap(res.unique ? `Решаем систему: y = (${y.map(v => plain(fq(v))).join('; ')})` : `Система УДН имеет много решений; среди них находим допустимое для двойственной задачи: y = (${y.map(v => plain(fq(v))).join('; ')})`);
      for (let j = 0; j < D.rows.length; j++) {
        const row = A.q(`.vr[data-j="${j}"]`), r = D.rows[j], stt = termIn(r.a, (i, one1) => (one1 ? '' : '·') + par(y[i]));
        const lhs = r.a.reduce((s, a, i) => s.add(a.mul(y[i])), ZQ()), ok = r.s === '>=' ? lhs.ge(r.b) : r.s === '<=' ? lhs.le(r.b) : lhs.eq(r.b);
        A.cap(`Д${j + 1}: подставляем y — ${plain(fq(lhs))} ${sg(r.s)} ${plain(fq(r.b))} — ${ok ? 'выполнено' : 'НЕ выполнено'}`);
        A.cls(row, 'on');
        await A.seq([...row.querySelectorAll('.tm')], 80, (el, k) => { const ii = +el.dataset.j; return A.fly(A.q(`.ys[data-i="${ii}"]`), el, plain(fq(y[ii])), { d: 500 }).then(() => A.swap(el, stt[k] ? stt[k].h : el.innerHTML, 330)); });
        await A.swap(row.querySelector('.lhs'), `<b>${fq(lhs)}</b>`, 380);
        const mk = row.querySelector('.okc'); mk.innerHTML = ok ? '✓' : '✕'; await A.pop(mk); A.cls(row, 'on', false); A.cls(row, ok ? 'done' : 'bad');
      }
      A.cap('Знаки двойственных переменных');
      await A.seq(A.qa('.sgc .okc'), 100, el => A.pop(el));
      const g = D.c.reduce((s, c, i) => s.add(c.mul(y[i])), ZQ()), gg = D.c0 ? g.add(D.c0) : g;
      A.cap(`Значения целей: f(x̄) = ${plain(fq(res.fx))}, g(y) = ${plain(fq(gg))} — ${res.fx.eq(gg) ? 'равны' : 'не равны'}`);
      A.set(fm, `<span class="fmh ${res.fx.eq(gg) ? 'ok' : 'bad'}">f(x̄) = ${fq(res.fx)} ${res.fx.eq(gg) ? '=' : '≠'} g(y) = ${fq(gg)}</span>`); await A.pulse(fm);
      sum.innerHTML = '<b>Вектор x̄ оптимален</b>: y допустим для двойственной задачи, УДН выполнены, значения целевых функций совпадают.'; await A.show(sum);
    };
    return demo('шаг 5: допустимость y и равенство значений целей', html, script);
  }
  const withC0b = (D, s) => !D.c0 || D.c0.isZero() ? s : s === '0' ? fq(D.c0) : fq(D.c0) + (s.startsWith('−') ? ' − ' + s.slice(1) : ' + ' + s);
  const ZDual = D => `<i>g</i> = ${withC0b(D, lin(D.c, i => yv(i + 1)))} → ${D.sense}<br>${D.rows.map((r, j) => `${lin(r.a, i => yv(i + 1))} ${sg(r.s)} ${fq(r.b)} <span class="kbd">(Д${j + 1})</span>`).join('<br>')}<br>${D.signs.map((s, i) => `${yv(i + 1)} ${s === 'free' ? '— любого знака' : s === '>=' ? '≥ 0' : '≤ 0'}`).join('; ')}`;

  function optSections(v, meta) {
    const S = [], pr = toPrV(v), res = ALGX.check(pr, v.xbar.map(Q.of));
    S.push(sec('cond', 'Условие', system(pr) + `<p>Проверить, является ли вектор <i>x̄</i> = ${vec(res.x)} оптимальным решением.</p><p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`));
    const verdict = res.optimal ? 'вектор оптимален' : 'вектор не оптимален', book = v.answer ? v.answer.opt : null;
    S.push(summaryCard({ main: cap2(verdict) + (res.feasible ? '' : ' <span class="kbd">(недопустим)</span>'), facts: [`f(x̄) = ${t2(res.fx)}`, res.feasible ? 'допустим' : 'недопустим', ...(res.optimal ? ['y найден, УДН выполнены'] : [])],
      badges: [book === null ? '<span class="badge info">собственные коэффициенты</span>' : (book === res.optimal ? '<span class="badge ok">✓ совпадает с ответом</span>' : '<span class="badge warn">⚠ в источнике другой ответ — см. «Проверка»</span>')], links: [['feas', 'Допустимость'], ...(res.feasible ? [['cs', 'УДН и двойственная'], ['verdict', 'Критерий']] : []), ['res', 'Ответ']] }));
    S.push(sec('how', 'Как проверяется', `<ol class="howl"><li>Подставляем x̄ в ограничения и проверяем x̄ ≥ 0. Недопустимый вектор оптимальным быть не может.</li><li>Строим двойственную задачу.</li><li>Условия дополняющей нежёсткости (УДН): для неактивных ограничений (строгое неравенство) y<sub>i</sub> = 0; для x̄<sub>j</sub> &gt; 0 ограничение Д<sub>j</sub> двойственной — равенство.</li><li>Решаем полученную систему относительно y.</li><li>x̄ оптимален тогда и только тогда, когда найдётся y, допустимый в двойственной задаче и удовлетворяющий УДН (тогда значения целевых функций совпадают).</li></ol>`));
    S.push(sec('feas', 'Допустимость вектора', demoFeas(pr, res)));
    if (res.feasible) {
      S.push(sec('dual', 'Двойственная задача', demoDualMap(res.P, res.D) + `<div class="sys">${ZDual(res.D)}</div>`));
      S.push(sec('cs', 'Условия дополняющей нежёсткости', demoCS(pr, res) + (res.eqs.length ? demoGauss(res.eqs.map(e => ({ a: e.a, b: e.b })), [...Array(pr.rows.length).keys()].map(i => yv(i + 1)), 'решаем систему УДН методом Гаусса') : '')));
      const y = res.optimal ? res.y : (res.gauss && res.gauss.status === 'ok' && res.unique ? res.gauss.x0 : null);
      S.push(sec('verdict', 'Критерий оптимальности', demoVerdict(pr, res, y)));
    }
    S.push(sec('res', 'Ответ', res.feasible ? (res.optimal ? note('ok', `<b>Вектор x̄ оптимален.</b> Найден допустимый y = ${vec(res.y)}, УДН выполнены, f(x̄) = g(y) = ${fq(res.g)}.`) : note('bad', '<b>Вектор x̄ не оптимален:</b> ни один допустимый y не удовлетворяет условиям дополняющей нежёсткости.')) : note('bad', `<b>Вектор x̄ не оптимален — он недопустим:</b> ${res.negative.length ? `координаты ${res.negative.map(j => 'x̄<sub>' + (j + 1) + '</sub>').join(', ')} отрицательны; ` : ''}${res.rowCheck.map((c, i) => c.ok ? '' : `ограничение (${i + 1}): ${fq(c.lhs)} ${sg(pr.rows[i].s)} ${fq(pr.rows[i].b)} не выполнено`).filter(Boolean).join('; ')}.`)));
    let cmp = '';
    if (book !== null) {
      cmp = `<p>Ответ в источнике: <b>${book ? 'вектор оптимален' : 'вектор не оптимален'}</b>.</p>` + (book === res.optimal ? note('ok', '✓ Расчёт совпадает с ответом источника.') : note('warn', `<b>⚠ Расхождение с ответом источника.</b> Расчёт: ${verdict}${res.feasible ? '' : ' (вектор недопустим)'}. ${book && !res.feasible ? 'Источник признаёт недопустимый вектор оптимальным.' : book && !res.optimal ? 'Для допустимого вектора не существует y, удовлетворяющего УДН.' : 'Существует допустимый y с УДН: вектор оптимален.'}`));
    }
    if (meta && meta.note) cmp += `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>`;
    S.push(sec('check', 'Проверка и сравнение с ответом', cmp));
    return S;
  }

  /* ====================== ТЕОРЕМЫ ДВОЙСТВЕННОСТИ (2.7) ====================== */
  function demoTheorem(pr, r) {
    const D = r.D, x = r.x, y = r.y, m = pr.rows.length, n = pr.n;
    const left = pr.rows.map((c, i) => `<div class="drow thr" data-i="${i}"><span class="kbd">(${i + 1})</span> ${lin(c.a, j => xv(j + 1))} ${sg(c.s)} ${fq(c.b)} <span class="ch tsl dh"></span></div>`).join('');
    const right = D.rows.map((c, j) => `<div class="drow thc" data-j="${j}"><span class="kbd">Д${j + 1}</span> ${lin(c.a, i => yv(i + 1))} ${sg(c.s)} ${fq(c.b)} <span class="ch tsl dh"></span></div>`).join('');
    const html = `<div class="pvwrap"><div><div class="dmh">прямая: x* = ${vec(x)}</div>${left}</div><div><div class="dmh">двойственная: y* = ${vec(y)}</div>${right}</div></div>${bars(['L*', r.L], ['g*', r.g])}<div class="pvsum dh"></div>`;
    const script = async A => {
      const sum = A.q('.pvsum');
      await A.wait(250);
      A.cap('Вторая теорема двойственности: для оптимальных x*, y* произведение «запас ограничения × связанная переменная» равно нулю');
      for (let i = 0; i < m; i++) {
        const row = A.q(`.thr[data-i="${i}"]`), ck = r.csRows[i], lhs = pr.rows[i].a.reduce((s, a, j) => s.add(a.mul(x[j])), ZQ()), slack = lhs.sub(pr.rows[i].b).abs();
        A.cap(`Ограничение (${i + 1}): запас ${plain(fq(slack))}, y<sub>${i + 1}</sub> = ${plain(fq(y[i]))}: ${slack.isZero() ? 'запаса нет' : 'y = 0'} ⇒ произведение ${plain(fq(slack.mul(y[i]).abs()))} = 0 ✓`);
        A.cls(row, 'on'); const mk = row.querySelector('.tsl'); mk.innerHTML = `запас ${fq(slack)} · y = ${fq(y[i])} = ${fq(slack.mul(y[i]).abs())}`; await A.pop(mk); A.cls(row, 'on', false); A.cls(row, ck.ok ? 'done' : 'bad');
      }
      for (let j = 0; j < n; j++) {
        const row = A.q(`.thc[data-j="${j}"]`), ck = r.csCols[j], slack = ck.lhs.sub(D.rows[j].b).abs();
        A.cap(`Д${j + 1}: запас ${plain(fq(slack))}, x<sub>${j + 1}</sub> = ${plain(fq(x[j]))} ⇒ произведение ${plain(fq(slack.mul(x[j]).abs()))} = 0 ✓`);
        A.cls(row, 'on'); const mk = row.querySelector('.tsl'); mk.innerHTML = `запас ${fq(slack)} · x = ${fq(x[j])} = ${fq(slack.mul(x[j]).abs())}`; await A.pop(mk); A.cls(row, 'on', false); A.cls(row, ck.ok ? 'done' : 'bad');
      }
      A.cap(`Первая теорема: значения целевых функций равны — L* = ${plain(fq(r.L))}, g* = ${plain(fq(r.g))}`);
      await growBars(A, r.L, r.g);
      sum.innerHTML = r.cs && r.equal ? '<b>Дополняющая нежёсткость выполнена, L* = g*</b> — решения исходной и двойственной задач найдены верно.' : '<b>Проверка не пройдена.</b>'; await A.show(sum);
    };
    return demo('УДН для пары (x*, y*) и равенство оптимумов', html, script);
  }
  const dualStatus = r => r.statusP === 'infeasible' ? 'исходная задача несовместна — решения нет' : r.statusP === 'unbounded' ? 'исходная задача неограничена — оптимума нет' : statusText(r.statusP);
  const dualRelation = r => r.statusP === 'unbounded' ? 'По теоремам двойственности: если целевая функция прямой задачи неограничена, двойственная задача несовместна.' : r.statusP === 'infeasible' ? `Исходная задача несовместна, значит двойственная либо неограничена, либо тоже несовместна (расчёт: ${statusText(r.statusD)}).` : '';

  function dualitySections(v, meta) {
    const S = [], pr = toPrV(v), r = ALGX.duality(pr);
    S.push(sec('cond', 'Условие', system(pr) + `<p>Решить исходную и двойственную задачи, используя теоремы двойственности.</p><p class="kbd">${meta ? meta.title : 'Собственные коэффициенты'}.</p>`));
    const ok = r.statusP === 'optimal' && r.statusD === 'optimal', A = v.answer || null;
    let badge = '<span class="badge info">собственные коэффициенты</span>';
    if (A) { if (A.none) badge = r.statusP !== 'optimal' ? '<span class="badge ok">✓ совпадает с ответом</span>' : '<span class="badge warn">⚠ в источнике другой ответ</span>'; else badge = ok && r.L.eq(Q.parse(A.f)) ? '<span class="badge ok">✓ L* совпадает с ответом</span>' : '<span class="badge warn">⚠ в источнике другой ответ — см. «Проверка»</span>'; }
    S.push(summaryCard({ main: ok ? `<i>L</i>* = ${fq(r.L)}, &nbsp;<i>x</i>* = ${vec(r.x)}, &nbsp;<i>y</i>* = ${vec(r.y)}` : cap2(dualStatus(r)), facts: ok ? [`g* = ${t2(r.g)}`, r.equal ? 'L* = g*' : 'L* ≠ g*', r.cs ? 'УДН выполнены' : 'УДН нарушены'] : [], badges: [badge], links: [['dual', 'Двойственная задача'], ['primal', 'Исходная задача'], ['cst', 'УДН и сверка'], ['res', 'Ответ'], ['check', 'Проверка']] }));
    S.push(sec('how', 'Как решается', `<ol class="howl"><li>Строим двойственную задачу по правилам соответствия (знак ограничения ↔ знак y, знак x ↔ знак двойственного ограничения, max ↔ min).</li><li>Решаем исходную задачу (двойственным симплекс-методом).</li><li><b>Первая теорема:</b> если одна из пары разрешима, то разрешима и другая, и L* = g*.</li><li><b>Вторая теорема (УДН):</b> оптимальные x*, y* связаны равенствами: неактивное ограничение ⇒ его y = 0, x<sub>j</sub> &gt; 0 ⇒ Д<sub>j</sub> — равенство. Решая эти уравнения, находим y*.</li><li>Если исходная задача не имеет решения: при неограниченной цели двойственная несовместна, при несовместной — двойственная неограничена или несовместна.</li></ol>`));
    S.push(sec('dual', 'Двойственная задача', demoDualMap(r.P, r.D) + `<div class="sys">${ZDual(r.D)}</div>`));
    S.push(sec('primal', 'Решение исходной задачи', dstepper(pr, r.primal)));
    if (ok) {
      const eqs = []; r.csRows.forEach((c, i) => { if (!c.tight) { const a = new Array(pr.rows.length).fill(null).map(ZQ); a[i] = ONE(); eqs.push({ a, b: ZQ() }); } });
      r.x.forEach((xj, j) => { if (xj.s > 0) eqs.push({ a: r.D.rows[j].a.slice(), b: r.D.rows[j].b }); });
      S.push(sec('cst', 'Решение двойственной задачи по УДН и сверка', `<p>Из УДН получаем уравнения для y; решение двойственной задачи: <i>y</i>* = ${vec(r.y)}, <i>g</i>* = ${fq(r.g)}.</p>` + (eqs.length ? demoGauss(eqs, pr.rows.map((_, i) => yv(i + 1)), 'система УДН: Гаусс') : '') + demoTheorem(pr, r)));
    } else S.push(sec('cst', 'Двойственная задача', `<p>Состояние исходной задачи: ${statusText(r.statusP)}; двойственной: ${statusText(r.statusD)}.</p>` + note('', dualRelation(r))));
    S.push(sec('res', 'Ответ', ok ? `<p class="answer"><i>L</i>* = ${fq(r.L)}, <i>x</i>* = ${vec(r.x)}; &nbsp;<i>g</i>* = ${fq(r.g)}, <i>y</i>* = ${vec(r.y)}</p>` + note('ok', 'L* = g*: первая теорема двойственности выполнена.') : note('bad', `<b>${cap2(dualStatus(r))}.</b> ${dualRelation(r)}`)));
    let cmp = '';
    if (A) {
      if (A.none) cmp += '<p>Ответ в источнике: <b>решений нет</b>.</p>' + (r.statusP !== 'optimal' ? note('ok', '✓ Расчёт совпадает: исходная задача не имеет решения.') : note('warn', '<b>⚠ Расхождение с ответом.</b>'));
      else if (ok) {
        const xb = A.x.map(Q.parse), fb = Q.parse(A.f), ub = A.u.map(Q.parse);
        cmp += `<p>Ответ в источнике: <b>L* = ${A.f}, x* = (${A.x.join('; ')}), u* = (${A.u.join('; ')})</b>.</p>`;
        const items = [];
        if (!r.L.eq(fb)) items.push(`значение L*: расчёт ${fq(r.L)}, в источнике ${A.f}${xb.length === pr.n ? `; в напечатанной точке цель равна ${fq(ALGZ.fv(pr, xb))}` : ''}`);
        if (xb.length !== pr.n) items.push(`в x* ${xb.length} координат, а переменных ${pr.n}`);
        else { const ck = ALGX.check(pr, xb); if (!ck.feasible) items.push(`напечатанная точка x* недопустима (${ck.rowCheck.map((c, i) => c.ok ? '' : `ограничение (${i + 1}): ${fq(c.lhs)} ${sg(pr.rows[i].s)} ${fq(pr.rows[i].b)}`).filter(Boolean).join('; ') || 'отрицательные координаты'})`); else if (!ALGZ.fv(pr, xb).eq(r.L)) items.push('напечатанная точка допустима, но не оптимальна'); else if (!r.x.every((q, j) => q.eq(xb[j]))) items.push('<span class="ok-t">напечатанная точка x* тоже оптимальна (оптимум не единственный)</span>'); }
        const cd = ALGX.checkDual(r.D, ub), cdn = ALGX.checkDual(r.D, ub.map(q => q.neg()));
        if (cd.len) items.push(`в u* ${ub.length} координат, а двойственных переменных ${r.D.n}`);
        else if (cd.feas && cd.g.eq(r.g)) { if (!r.y.every((q, i) => q.eq(ub[i]))) items.push('<span class="ok-t">напечатанный u* допустим и даёт то же g* (двойственное решение не единственно)</span>'); }
        else if (cdn.feas && cdn.g.eq(r.g)) items.push(`напечатанный u* верен с точностью до знака (для задачи этого вида y имеют противоположные знаки): расчёт y* = ${vec(r.y)}`);
        else items.push(`напечатанный u* не удовлетворяет двойственной задаче${cd.feas ? '' : ' (нарушены её ограничения или знаки)'}; расчёт y* = ${vec(r.y)}`);
        const bad = items.filter(t => !t.includes('ok-t'));
        cmp += bad.length ? note('warn', `<b>⚠ Расхождение с ответом источника.</b><ul>${items.map(t => `<li>${t};</li>`).join('')}</ul>`) : note('ok', `✓ Расчёт совпадает с ответом источника.${items.length ? `<ul>${items.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}`);
      } else cmp += `<p>Ответ в источнике: L* = ${A.f}.</p>${note('warn', `<b>⚠ Расхождение с ответом источника.</b> Расчёт: ${statusText(r.statusP)}.`)}`;
    }
    if (meta && meta.note) cmp += `<p class="kbd"><b>Комментарий к записи базы:</b> ${meta.note}</p>`;
    S.push(sec('check', 'Проверка и сравнение с ответом', (ok ? checkTable(pr, r.x) + valueLine(pr, r.x, 'L') : '') + cmp));
    return S;
  }

  /* ====================== РЕЕСТР ТЕМ ====================== */
  function run(kind, v, meta, o = {}) {
    if (kind === 'transp') return transportSections({ a: v.a, b: v.b, c: v.c }, meta, o.init || 'nw');
    if (kind === 'netw') return networkSections(v, meta);
    if (kind === 'game') return gameSections(v, meta);
    if (kind === 'canon') return canonSections(v, meta);
    if (kind === 'gomory') return gomorySections(v, meta);
    if (kind === 'optcheck') return optSections(v, meta);
    if (kind === 'duality') return dualitySections(v, meta);
    throw new Error('Неизвестная тема: ' + kind);
  }
  return { run, toPrV };
})();
