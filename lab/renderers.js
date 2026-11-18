/* =====================================================================
   4. ПОСТРОЕНИЕ ПОЯСНЕНИЙ (HTML из фактических вычислений)
   ===================================================================== */
const R = (() => {
  const ONEQ = () => new Q(1n);
  const fq = q => {
    const t = q.toText();
    if (!t.includes('/')) return t;
    const neg = t.startsWith('−'); const [n, d] = t.replace('−', '').split('/');
    return (neg ? '−' : '') + `<span class="fr"><span class="nu">${n}</span><span class="de">${d}</span></span>`;
  };
  const approx = q => q.finiteDecimal() ? '' : ` <span class="approx">≈ ${q.toNumber().toFixed(4).replace(/0+$/, '').replace('.', ',')}</span>`;
  const par = q => q.s < 0 ? '(' + fq(q) + ')' : fq(q);
  const xv = k => `<i>x</i><sub>${k}</sub>`, tv = k => `<i class="tv">t</i><sub>${k}</sub>`, yv = k => `<i>y</i><sub>${k}</sub>`;
  const vname = (vars, j) => vars[j].kind === 't' ? tv(vars[j].k) : vars[j].cut ? `<i>S</i><sub>${vars[j].cut}</sub>` : xv(vars[j].k);
  const zlab = l => l.replace('h', '<i>h</i>').replace('f', '<i>f</i>').replace('g', '<i>g</i>');
  const sg = s => s === '<=' ? '≤' : s === '>=' ? '≥' : '=';
  /* Линейное выражение Σ a_j·lab(j) без нулевых слагаемых. */
  const lin = (a, lab) => {
    let s = '';
    a.forEach((v, j) => {
      if (v.isZero()) return;
      const coef = v.abs().eq(ONEQ()) ? '' : fq(v.abs());
      s += s === '' ? (v.s < 0 ? '−' : '') + coef + lab(j) : (v.s < 0 ? ' − ' : ' + ') + coef + lab(j);
    });
    return s || '0';
  };
  const vec = xs => '(' + xs.map(fq).join('; ') + ')';
  const WRAPIDS = new Set(['verts', 'reduce', 't0', 'canon', 'hrow', 'ph2s', 'check']);
  const sec = (id, title, body, extra = '') => {
    // памятка по методу одинакова для всех вариантов — по умолчанию свёрнута
    if (id === 'how') body = `<details class="howd"><summary>Показать алгоритм</summary>${body}</details>`;
    // анимации — основное объяснение; текст и таблицы после них уходят в «Подробно»
    if (id === 'lines') body = `<details class="dmmore"><summary>Подробно (таблица прямых и точек)</summary>${body}</details>`;
    else if (WRAPIDS.has(id)) {
      const k = body.lastIndexOf('<!--dmend-->');
      if (k >= 0) {
        const head = body.slice(0, k + 12), tail = body.slice(k + 12);
        if (tail.trim() && !/class="answer"|class="dmmore"/.test(tail)) body = head + `<details class="dmmore"><summary>Подробно (текст и таблицы)</summary>${tail}</details>`;
      }
    }
    if (id === 'all') body = `<details class="alld"><summary>Показать все таблицы одной лентой (для переписывания в тетрадь)</summary>${body}</details>`;
    return `<section class="card sol" id="${id}" data-title="${title}"${extra}><h3>${title}</h3>${body}</section>`;
  };

  /* ---------- симплекс-таблица ---------- */
  const priorTable=new WeakMap();
  function rememberTables(steps) {
    steps.forEach((s,i)=>{
      const next=steps[i+1];
      if(next && s.p!=null && s.q!=null && s.kind!=='cut' && s.z.label===next.z.label && s.cols.length===next.cols.length && s.rows.length===next.rows.length && next.basis[s.p]===s.q)
        priorTable.set(next.rows,s);
    });
  }
  function originFor(st,i,j,value) {
    const prior=priorTable.get(st.rows);
    const get=(t,k,l)=>{const row=t.rows[k]||t.z;return l<0?row.b:row.a[l];};
    if(prior) {
      const old=get(prior,i,j).toText(), pivot=get(prior,prior.p,prior.q).toText();
      if(i===prior.p)return `Делим прежнее значение ведущей строки на ведущий элемент: (${old}) ÷ (${pivot}) = ${value.toText()}.`;
      return `Из прежнего числа вычитаем произведение коэффициента ведущего столбца и числа из новой ведущей строки: (${old}) − (${get(prior,i,prior.q).toText()}) × (${get(st,prior.p,j).toText()}) = ${value.toText()}.`;
    }
    const row=st.rows[i]||st.z;
    const terms=row.a.map((v,k)=>!v.isZero()?`(${v.toText()})·${st.vars[k].kind==='t'?'t':'x'}${st.vars[k].k}`:null).filter(Boolean);
    if(i===st.rows.length)return (j<0?'Правая часть':'Коэффициент переменной')+' в уравнении цели для этого базиса: '+row.label+(terms.length?' + '+terms.join(' + '):'')+' = '+row.b.toText()+'.';
    return (j<0?'Правая часть равенства':'Коэффициент переменной в равенстве')+' строки '+(i+1)+': '+terms.join(' + ')+' = '+row.b.toText()+'.';
  }
  function table(st, o = {}) {
    const hl = o.hl && st.q != null, rat = o.ratio && st.q != null;
    let h = '<table class="sx"><thead><tr><th>Базис</th><th>b</th>' + st.cols.map(j => { const v = st.vars[j], kc = v.kind === 'x' ? 'vk-x' : v.kind === 't' ? 'vk-t' : v.sign < 0 ? 'vk-e' : 'vk-s', kt = v.kind === 'x' ? 'исходная' : v.kind === 't' ? 'искусств.' : v.sign < 0 ? 'излишек' : 'остаток'; return `<th class="${v.kind === 't' ? 'tcol ' : ''}${kc}">${vname(st.vars, j)}<span class="vtag">${kt}</span></th>`; }).join('') + (rat ? '<th>b ÷ ведущий столбец</th>' : '') + '</tr></thead><tbody>';
    const m = st.rows.length;
    const cell = (v, i, j) => {
      let c = j < 0 ? 'bcol' : '';
      if (hl) { if (j === st.q && i === st.p) c += ' pe'; else if (j === st.q) c += ' pc'; else if (i === st.p) c += ' pr'; }
      if (o.mark) { const mk = o.mark(i, j); if (mk) c += ' ' + mk; }
      if (o.click && (o.clickRow == null || o.clickRow === i)) c += ' click';
      return `<td class="${c}" data-i="${i}" data-j="${j}" tabindex="0" data-origin="${originFor(st,i,j,v)}">${fq(v)}</td>`;
    };
    st.rows.forEach((r, i) => {
      h += `<tr><td class="bas">${vname(st.vars, st.basis[i])}</td>` + cell(r.b, i, -1) + st.cols.map(j => cell(r.a[j], i, j)).join('');
      if (rat) { const Rr = st.ratios[i]; h += Rr ? `<td class="ratio${i === st.p ? ' min' : ''}">${fq(r.b)} ÷ ${fq(r.a[st.q])} = ${fq(Rr)}</td>` : '<td class="ratio">— (не берём)</td>'; }
      h += '</tr>';
    });
    h += `<tr class="zrow"><td class="bas">${zlab(st.z.label)}</td>` + cell(st.z.b, m, -1) + st.cols.map(j => cell(st.z.a[j], m, j)).join('') + (rat ? '<td class="ratio"></td>' : '') + '</tr></tbody></table>';
    return `<div class="tblwrap">${h}</div>`;
  }

  /* Базисное решение и значение цели для таблицы. */
  function basicSol(st, realLabel) {
    const vals = st.basis.map((bj, i) => `${vname(st.vars, bj)} = ${fq(st.rows[i].b)}`).join(', ');
    const zb = st.z.b, isNeg = st.z.label.startsWith('−');
    const real = isNeg ? zb.neg() : zb;
    return `<p class="kbd">Базисное решение: ${vals}, остальные переменные = 0. ${realLabel || (isNeg ? st.z.label.slice(1) : st.z.label)} = ${fq(real)}.</p>`;
  }

  /* Описание одного шага симплекс-метода: три действия, каждое подсвечивает свои ячейки таблицы. */
  function stepText(st, label) {
    const z = zlab(st.z.label);
    if (st.q == null) return `<div class="note ok"><b>Критерий остановки выполнен:</b> в строке ${z} нет отрицательных чисел — базисное решение оптимально.</div>`;
    const negs = st.cols.filter(j => st.z.a[j].s < 0).map(j => `${vname(st.vars, j)}: ${fq(st.z.a[j])}`).join(', ');
    if (st.unbounded) return `<div class="note bad"><b>Целевая функция не ограничена.</b> В строке ${z} отрицательное число в столбце ${vname(st.vars, st.q)}, а все элементы этого столбца ≤ 0: переменную можно увеличивать бесконечно, ни одно ограничение её не остановит (шаг 2 алгоритма).</div>`;
    const piv = st.rows[st.p].a[st.q];
    return `<ol class="chips">
      <li data-hl="col" style="--c:var(--col)"><span class="t">Входит ${vname(st.vars, st.q)}</span><span class="d">самое отрицательное число строки ${z}: <b class="m">${fq(st.z.a[st.q])}</b></span><span class="kbd">отрицательные: ${negs}</span></li>
      <li data-hl="row" style="--c:var(--row)"><span class="t">Выходит ${vname(st.vars, st.basis[st.p])}</span><span class="d">наименьшее b ÷ a = <b class="m">${fq(st.ratios[st.p])}</b></span><span class="kbd">берём только a &gt; 0</span></li>
      <li data-hl="pe" style="--c:#f7a8bb"><span class="t">Ведущий элемент ${fq(piv)}</span><span class="d">строку делим на ${fq(piv)}, из остальных вычитаем её × их число в столбце ${vname(st.vars, st.q)}</span></li></ol>`;
  }

  /* Мини-график значения цели по таблицам: видно, что f растёт (h падает) с каждой итерацией. */
  function spark(steps) {
    const vals = steps.map(s => { const neg = s.z.label.startsWith('−'); return (neg ? s.z.b.neg() : s.z.b).toNumber(); });
    const nm = steps[0].z.label.replace('−', '');
    const W = 240, H = 64, L = 6, Rr = 6, T = 8, B = 16, lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
    const X = i => L + (steps.length < 2 ? (W - L - Rr) / 2 : i * (W - L - Rr) / (steps.length - 1)), Y = v => T + (hi - v) / span * (H - T - B);
    const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    return `<div><div class="kbd">${nm === 'h' ? 'h по таблицам (должно упасть до 0)' : nm + ' по таблицам'}</div><svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><polyline class="sl" points="${pts}"/>${vals.map((v, i) => `<circle class="sp" data-k="${i}" cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="5"><title>таблица ${i}: ${nm} = ${fq(nm === 'h' ? steps[i].z.b.neg() : steps[i].z.label.startsWith('−') ? steps[i].z.b.neg() : steps[i].z.b).replace(/<[^>]+>/g, '')}</title></circle>`).join('')}<text x="${L}" y="${H - 3}">0</text><text x="${W - Rr}" y="${H - 3}" text-anchor="end">${steps.length - 1}</text></svg></div>`;
  }

  /* Пошаговый просмотр таблиц с расчётом любой ячейки по клику. */
  let uid = 0;
  const hooks = [];
  const bridge = {};
  const R_last = { id: null };
  // слушатели событий между блоками (степпер ↔ график); снимаются при каждой перерисовке
  const evs = [];
  const on = (t, fn) => { document.addEventListener(t, fn); evs.push([t, fn]); };
  const offAll = () => evs.splice(0).forEach(([t, fn]) => document.removeEventListener(t, fn));
  // режим тренажёра (переключается в интерфейсе) и степпер, которым управляют клавиши ← →
  const TR = { on: false };
  const ACT = { cur: null };
  document.addEventListener('keydown', e => {
    if (!ACT.cur || !document.body.contains(ACT.cur.root) || (e.target.closest && e.target.closest('input,select,textarea'))) return;
    if (e.key === 'ArrowRight') { ACT.cur.go(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { ACT.cur.go(-1); e.preventDefault(); }
  });
  /* Формула пересчёта одной ячейки новой таблицы (для подсказок и разбора). */
  function cellFormula(s, nxt, i, j) {
    const m = s.rows.length, get = (S, ii, jj) => { const r = ii === m ? S.z : S.rows[ii]; return jj < 0 ? r.b : r.a[jj]; };
    const old = get(s, i, j), nw = get(nxt, i, j), piv = s.rows[s.p].a[s.q];
    const rn = i === m ? zlab(s.z.label) : vname(s.vars, nxt.basis[i]), cn = j < 0 ? 'b' : vname(s.vars, j);
    let h = `<div class="kbd">Строка ${rn}, столбец ${cn}</div>`;
    if (i === s.p) h += `<div>Ведущая строка (была ${vname(s.vars, s.basis[s.p])}, стала ${vname(s.vars, s.q)}) — делим на ведущий элемент:</div><div class="big">${fq(old)} ÷ ${par(piv)} = <b>${fq(nw)}</b></div>`;
    else { const kk2 = get(s, i, s.q), npv = get(nxt, s.p, j); h += `<div>старое число − <i>k</i> × (число новой ведущей строки в этом столбце), <i>k</i> = ${fq(kk2)} — число строки в ведущем столбце:</div><div class="big">${fq(old)} − ${par(kk2)} × ${par(npv)} = <b>${fq(nw)}</b></div>`; }
    return { html: h, value: nw };
  }
  function stepper(steps, title) {
    rememberTables(steps);
    const id = 'st' + (++uid);
    R_last.id = id;
    hooks.push(() => {
      const root = document.getElementById(id); if (!root) return;
      let k = 0, timers = [], tr = null, errs = 0;
      const stop = () => { timers.forEach(clearTimeout); timers = []; };
      const tblBox = root.querySelector('.st-table'), txt = root.querySelector('.st-text'), calc = root.querySelector('.st-calc'), demoBox = root.querySelector('.st-demo'), fullBox = root.querySelector('.stfull');
      let dctl = null;
      const tbl = () => tblBox.querySelector('table.sx');
      const focus = what => {
        const T = tbl(); if (!T) return;
        T.querySelectorAll('.focus').forEach(e => e.classList.remove('focus'));
        root.querySelectorAll('.chips li').forEach(li => li.classList.toggle('on', li.dataset.hl === what));
        if (!what) { T.classList.remove('dim'); return; }
        T.classList.add('dim');
        const sel = { col: 'td.pc, td.pe', row: 'td.pr, td.pe, td.ratio.min', pe: 'td.pe' }[what];
        T.querySelectorAll(sel).forEach(e => e.classList.add('focus'));
        if (what === 'col') { const s = steps[k], m = s.rows.length; const zc = T.querySelector(`td[data-i="${m}"][data-j="${s.q}"]`); if (zc) zc.classList.add('focus'); }
      };
      /* ---------- обычный разбор ---------- */
      function renderNormal(s) {
        tblBox.innerHTML = table(s, { hl: true, ratio: true });
        txt.innerHTML = stepText(s) + basicSol(s);
        root.querySelectorAll('.chips li').forEach(li => { li.onmouseenter = () => focus(li.dataset.hl); li.onmouseleave = () => focus(null); li.onclick = () => focus(li.dataset.hl); });
        if (s.q != null && !s.unbounded && steps[k + 1]) {
          const nxt = steps[k + 1];
          calc.innerHTML = `<div class="kbd">Новая таблица ${k + 1} — нажмите на ячейку, чтобы увидеть расчёт:</div>` + table({ ...nxt, q: null }, { click: true }) + '<div class="calc"></div>';
          const out = calc.querySelector('.calc');
          const explain = (i, j) => {
            calc.querySelectorAll('td.sel').forEach(t => t.classList.remove('sel'));
            const td = calc.querySelector(`td[data-i="${i}"][data-j="${j}"]`); if (td) td.classList.add('sel');
            out.innerHTML = cellFormula(s, nxt, i, j).html;
          };
          calc.querySelectorAll('td.click').forEach(td => td.onclick = () => explain(+td.dataset.i, +td.dataset.j));
          explain(0, -1);
        } else calc.innerHTML = '';
      }
      /* ---------- тренажёр: студент сам выбирает столбец, строку и считает ячейки ---------- */
      const score = () => `<span class="trscore">ошибок: ${errs}</span>`;
      const msg = (cls, html) => { const b = root.querySelector('.trmsg'); if (!b) return; b.className = 'trmsg ' + cls; b.innerHTML = html; b.classList.remove('reveal'); void b.offsetWidth; b.classList.add('reveal'); root.querySelectorAll('.trscore').forEach(e => e.textContent = 'ошибок: ' + errs); };
      const bad = td => { td.classList.remove('trbad'); void td.offsetWidth; td.classList.add('trbad'); };
      /* Вопрос с вариантами ответов: у каждого варианта свой комментарий, неверные можно перебирать. */
      const shuffle = (arr, seed = k + 1) => arr.map((x, i) => [x, Math.sin((i + 1) * 12.9898 * seed) * 43758.5453 % 1]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
      function ask(n, total, q, opts, done) {
        txt.innerHTML = `<div class="trq ask"><span class="trtag">Тренажёр${total ? ` · вопрос ${n} из ${total}` : ''}</span> ${q} ${score()}</div><div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}">${o.html}</button>`).join('')}</div><div class="trmsg"></div>`;
        const box = txt.querySelector('.opts'), m = txt.querySelector('.trmsg');
        box.querySelectorAll('.opt').forEach(b => b.onclick = () => {
          const o = opts[+b.dataset.i];
          m.classList.remove('reveal'); void m.offsetWidth; m.classList.add('reveal');
          if (o.ok) {
            b.classList.add('right'); box.querySelectorAll('.opt').forEach(x => { x.disabled = true; });
            m.className = 'trmsg ok reveal'; m.innerHTML = `<b>Верно.</b> ${o.why}<div class="btnrow"><button class="btn primary tr-go">Дальше →</button></div>`;
            m.querySelector('.tr-go').onclick = done;
          } else {
            errs++; b.classList.add('wrong'); b.disabled = true;
            m.className = 'trmsg bad reveal'; m.innerHTML = `<b>Нет.</b> ${o.why}`;
            root.querySelectorAll('.trscore').forEach(e => { e.textContent = 'ошибок: ' + errs; });
          }
        });
      }
      function renderTrainer() {
        const s = steps[k], m = s.rows.length, z = zlab(s.z.label), ph1 = s.z.label === '−h';
        calc.innerHTML = '';
        const vn = j => vname(s.vars, j);
        // ---- итоговая таблица ----
        if (s.q == null) {
          tblBox.innerHTML = table(s, {});
          if (tr.phase === 'col' && ph1) {
            const hv = s.z.b.neg(), feas = hv.isZero();
            return ask(1, 1, `В строке −h нет отрицательных чисел, h* = ${fq(hv)}. Что это значит?`, shuffle([
              { html: 'Найдено допустимое базисное решение — переходим к этапу 2', ok: feas, why: feas ? 'Все искусственные переменные равны 0, значит точка удовлетворяет исходным ограничениям. Теперь можно искать оптимум цели f.' : 'Так было бы при h* = 0. Здесь h* > 0: хотя бы одна искусственная переменная осталась положительной.' },
              { html: 'Допустимых решений нет', ok: !feas, why: !feas ? 'Минимум суммы искусственных переменных больше 0 — обнулить их нельзя. Точек, удовлетворяющих всем ограничениям, нет.' : 'Так было бы при h* > 0. Здесь h* = 0 — допустимая точка найдена.' },
              { html: 'Найден оптимум исходной задачи', ok: false, why: 'Этап 1 ищет только допустимую точку: цель f в нём не участвует. Оптимум ищут на этапе 2.' }
            ]), () => { tr.phase = 'done'; renderTrainer(); });
          }
          if (tr.phase === 'col') return ask(1, 2, `В строке ${z} нет отрицательных чисел. Что это значит?`, shuffle([
            { html: 'Решение оптимально — итерации закончены', ok: true, why: `Отрицательное число в строке ${z} означало бы, что рост этой переменной улучшает цель. Таких нет — улучшать нечего.` },
            { html: 'Нужна ещё одна итерация', ok: false, why: `Новая итерация нужна, только если в строке ${z} есть отрицательное число.` },
            { html: 'Цель не ограничена', ok: false, why: 'Неограниченность видна по столбцу с отрицательным числом в строке цели, в котором нет положительных элементов. Здесь отрицательных чисел вообще нет.' }
          ]), () => { tr.phase = 'read'; renderTrainer(); });
          if (tr.phase === 'read') return ask(2, 2, 'Как прочитать решение по этой таблице?', shuffle([
            { html: 'Переменные слева (базис) равны своим числам в столбце b, остальные равны 0', ok: true, why: `Здесь: ${s.basis.map((bj, i) => `${vn(bj)} = ${fq(s.rows[i].b)}`).join(', ')}, остальные — 0. Значение цели стоит в столбце b строки ${z}.` },
            { html: `Значения переменных — числа строки ${z}`, ok: false, why: `Строка ${z} показывает, как изменится цель при росте каждой переменной, а не значения переменных.` },
            { html: 'Значения переменных — числа первой строки таблицы', ok: false, why: 'Первая строка — одно из уравнений системы. Решение читается по столбцу b.' }
          ]), () => { tr.phase = 'done'; renderTrainer(); });
          txt.innerHTML = `<div class="trq ok"><b>Таблица разобрана.</b> Ошибок: ${errs}.</div>` + basicSol(s);
          return;
        }
        // ---- вопрос 1: кто входит в базис ----
        if (tr.phase === 'col') {
          tblBox.innerHTML = table(s, {});
          T0zrow();
          let cand = s.cols.filter(j => !s.basis.includes(j));
          const neg = cand.filter(j => s.z.a[j].s < 0).sort((a, b) => s.z.a[a].cmp(s.z.a[b]));
          const nonneg = cand.filter(j => s.z.a[j].s >= 0);
          cand = [...neg.slice(0, 4), ...nonneg.slice(0, Math.max(1, 5 - Math.min(neg.length, 4)))];
          if (!cand.includes(s.q)) cand.unshift(s.q);
          const most = neg[0];
          return ask(1, 3, `Какая переменная <b>входит в базис</b>? Смотрим на строку ${z} (выделена).`, cand.map(j => {
            const v = s.z.a[j];
            return { html: `${vn(j)} <span class="kbd">в строке ${z}: ${fq(v)}</span>`, ok: j === s.q,
              why: j === s.q ? (j === most ? `${fq(v)} — самое отрицательное число строки ${z}: при росте ${vn(j)} цель улучшается быстрее всего.` : `По правилу Бленда (защита от зацикливания) берём первый столбец с отрицательным числом.`)
                : v.s >= 0 ? `Здесь ${fq(v)} ≥ 0: рост ${vn(j)} цель не улучшит. Кандидаты — только столбцы с отрицательным числом.`
                : `Число отрицательное, цель тоже улучшится, но по правилу берём самое отрицательное — ${fq(s.z.a[most])}.` };
          }), () => { tr.phase = 'row'; renderTrainer(); });
        }
        // ---- вопрос 2: какая строка выходит (отношения уже посчитаны) ----
        if (tr.phase === 'row') {
          tblBox.innerHTML = table({ ...s, p: -1 }, { hl: true, ratio: true });
          const q = s.q, rmin = s.p != null ? s.ratios[s.p] : null;
          const opts = s.rows.map((r, i) => {
            const a = r.a[q], R2 = s.ratios[i];
            return { html: `строка ${vn(s.basis[i])} <span class="kbd">${R2 ? `b ÷ a = ${fq(r.b)} ÷ ${fq(a)} = ${fq(R2)}${approx(R2)}` : `a = ${fq(a)} ≤ 0`}</span>`, ok: !s.unbounded && i === s.p,
              why: !s.unbounded && i === s.p ? `Наименьшее отношение: ${vn(q)} может вырасти только до ${fq(R2)}. Дальше ${vn(s.basis[i])} стала бы отрицательной — поэтому она и выходит из базиса.`
                : !R2 ? `В этой строке a ≤ 0: при росте ${vn(q)} переменная ${vn(s.basis[i])} не уменьшается, строка рост не ограничивает. Такие строки не рассматривают.`
                : `Если увеличить ${vn(q)} до ${fq(R2)}, переменная ${vn(s.basis[s.p])} из строки с отношением ${fq(rmin)} станет отрицательной. Берут наименьшее отношение.` };
          });
          opts.push({ html: 'ни одна — в столбце нет положительных a', ok: !!s.unbounded,
            why: s.unbounded ? `${vn(q)} можно увеличивать бесконечно, ни одно ограничение её не остановит — цель не ограничена.` : `В столбце ${vn(q)} есть a > 0 — такие строки ограничивают рост, одна из них выходит.` });
          return ask(2, 3, `Входит ${vn(q)} (столбец выделен). Какая строка <b>выходит</b> из базиса? Отношения b ÷ a уже посчитаны справа.`, opts, () => { tr.phase = s.unbounded ? 'unb' : 'piv'; renderTrainer(); });
        }
        if (tr.phase === 'unb') { tblBox.innerHTML = table(s, { hl: true, ratio: true }); txt.innerHTML = `<div class="trq ok"><b>Цель не ограничена.</b> Ошибок: ${errs}.</div>` + stepText(s); return; }
        // ---- вопрос 3: как пересчитать таблицу ----
        const piv = s.rows[s.p].a[s.q], vq = vn(s.q), vp = vn(s.basis[s.p]);
        if (tr.phase === 'piv') {
          tblBox.innerHTML = table(s, { hl: true, ratio: true });
          return ask(3, 3, `Ведущий элемент ${fq(piv)} — на пересечении столбца ${vq} и строки ${vp}. Как получить новую таблицу?`, shuffle([
            { html: `Ведущую строку разделить на ${fq(piv)}; из остальных строк вычесть её, умноженную на их число в столбце ${vq}`, ok: true, why: `В столбце ${vq} получится 1 в ведущей строке и 0 во всех остальных (включая строку ${z}) — ${vq} становится базисной вместо ${vp}.` },
            { html: `Разделить на ${fq(piv)} все строки таблицы`, ok: false, why: 'Делится только ведущая строка — чтобы на месте ведущего элемента стала 1. Остальные строки получают 0 в этом столбце вычитанием.' },
            { html: `Строку ${z} не трогать, пересчитать только строки ограничений`, ok: false, why: `Строку ${z} пересчитывают так же, как остальные: иначе под новой базисной переменной в ней останется ненулевое число.` },
            { html: `Поменять местами строку ${vp} и строку ${z}`, ok: false, why: 'Строки не переставляют: меняется только подпись базиса у ведущей строки, а числа пересчитываются.' }
          ]), () => { tr.phase = 'next'; renderTrainer(); });
        }
        // ---- результат шага ----
        tblBox.innerHTML = table(s, { hl: true, ratio: true });
        const nxt = steps[k + 1], zv = st => st.z.label.startsWith('−') ? st.z.b.neg() : st.z.b, nm = s.z.label.replace('−', '');
        txt.innerHTML = `<div class="trq ok"><b>Шаг разобран.</b> ${vq} входит в базис вместо ${vp}. ${nm}: ${fq(zv(s))} → <b>${fq(zv(nxt))}</b>. Ошибок: ${errs}.</div>`;
        calc.innerHTML = `<div class="kbd">Новая таблица ${k + 1} (посчитана по правилу из вопроса 3; нажмите на ячейку — покажем расчёт):</div>` + table({ ...nxt, q: null }, { click: true }) + `<div class="calc"></div><div class="btnrow"><button class="btn primary tr-next">Следующая таблица →</button></div>`;
        const out = calc.querySelector('.calc');
        calc.querySelectorAll('td.click').forEach(td => td.onclick = () => { calc.querySelectorAll('td.sel').forEach(t => t.classList.remove('sel')); td.classList.add('sel'); out.innerHTML = cellFormula(s, nxt, +td.dataset.i, +td.dataset.j).html; });
        calc.querySelector('.tr-next').onclick = () => show(k + 1);
        calc.classList.remove('reveal'); void calc.offsetWidth; calc.classList.add('reveal');
      }
      // выделить строку цели в тренажёре (вопрос 1)
      function T0zrow() { const T = tbl(); if (T) T.querySelectorAll('tr.zrow td').forEach(td => td.classList.add('zfocus')); }
      const show = (kk, quiet) => {
        stop(); k = kk; const s = steps[k];
        root.querySelector('.st-title').innerHTML = `${title} · таблица ${k}${k === 0 ? ' (начальная)' : ''}${s.q == null && !TR.on ? ' (итоговая)' : ''}`;
        root.querySelectorAll('.st-btn').forEach((b, i) => b.classList.toggle('on', i === k));
        root.querySelectorAll('.spark .sp').forEach((c, i) => c.classList.toggle('cur', i === k));
        root.querySelector('.st-prev').disabled = k === 0; root.querySelector('.st-next').disabled = k === steps.length - 1;
        const play = root.querySelector('.st-play'); play.disabled = s.q == null || s.unbounded; play.style.display = TR.on ? 'none' : '';
        root.querySelector('.legend').style.display = TR.on ? 'none' : '';
        if (TR.on) { tr = { phase: 'col' }; renderTrainer(); } else renderNormal(s);
        if (dctl) { dctl.dispose(); dctl = null; }
        if (TR.on) { demoBox.innerHTML = ''; fullBox.open = true; } else if (bridge.pivot) dctl = bridge.pivot(demoBox, steps, k, !quiet);
        if (!quiet) document.dispatchEvent(new CustomEvent('sxstep', { detail: { id, k } }));
      };
      root.querySelector('.st-play').onclick = () => {
        const s = steps[k]; if (s.q == null || s.unbounded) return;
        stop(); fullBox.open = true; tblBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        [['col', 0], ['row', 1500], ['pe', 3000], [null, 4500]].forEach(([w, t]) => timers.push(setTimeout(() => focus(w), t)));
        timers.push(setTimeout(() => { calc.classList.remove('reveal'); void calc.offsetWidth; calc.classList.add('reveal'); calc.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 4600));
      };
      root.querySelector('.st-prev').onclick = () => k > 0 && show(k - 1);
      root.querySelector('.st-next').onclick = () => k < steps.length - 1 && show(k + 1);
      root.querySelectorAll('.st-btn').forEach((b, i) => b.onclick = () => show(i));
      root.querySelectorAll('.spark .sp').forEach(c => c.onclick = () => show(+c.dataset.k));
      on('sxgo', e => { if (e.detail.id === id) { show(e.detail.k, e.detail.quiet); if (!e.detail.quiet) root.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
      const me = { root, go: d => { const n = k + d; if (n >= 0 && n < steps.length) show(n); } };
      root.addEventListener('pointerenter', () => { ACT.cur = me; });
      if (!ACT.cur || !document.body.contains(ACT.cur.root)) ACT.cur = me;
      show(0, true);
    });
    return `<div class="stepper" id="${id}"><div class="st-head"><div><div class="btnrow"><button class="btn st-prev">← Назад</button>${steps.map((_, i) => `<button class="btn st-btn">${i}</button>`).join('')}<button class="btn st-next">Вперёд →</button><button class="btn primary st-play" title="Подсветить по очереди: ведущий столбец, ведущую строку, ведущий элемент и показать новую таблицу">▶ Разобрать шаг</button></div>
      <h4 class="st-title"></h4></div>${steps.length > 1 ? spark(steps) : ''}</div><div class="legend"><span style="--c:var(--col)">входит в базис</span><span style="--c:var(--row)">выходит из базиса</span><span style="--c:var(--pe)">ведущий элемент</span><span class="kbd" style="margin-left:6px">наведите на карточку шага — подсветятся её ячейки · ← → листают таблицы</span></div>
      <div class="st-demo"></div><details class="dmmore stfull"><summary>Подробно: таблица, пояснение шага и расчёт любой ячейки</summary><div class="st-table"></div><div class="st-text"></div><div class="st-calc"></div></details></div>`;
  }
  const allTables = (steps, offset = 0) => steps.map((s, i) => `<div class="tcap">Таблица ${i + offset}${s.q != null && !s.unbounded ? ` — входит ${vname(s.vars, s.q)}, выходит ${vname(s.vars, s.basis[s.p])}, ведущий элемент ${fq(s.rows[s.p].a[s.q])}` : s.unbounded ? ' — неограниченность' : ' — итоговая'}</div>${table(s, { hl: true, ratio: true })}`).join('');

  /* ---------- графики (SVG) ---------- */
  const niceStep = r => { const raw = r / 5, p = 10 ** Math.floor(Math.log10(raw)); for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= raw - 1e-12) return k * p; return 10 * p; };
  const niceMax = v => { if (!(v > 0)) return 1; const st = niceStep(v); return Math.ceil(v / st) * st; };
  function clipPoly(poly, a, b, s) { // оставить точки с a·p (s) b
    if (s === '=') return clipPoly(clipPoly(poly, a, b, '<='), a, b, '>=');
    const f = p => { const v = a[0] * p[0] + a[1] * p[1] - b; return s === '<=' ? -v : v; };
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const P = poly[i], C = poly[(i + 1) % poly.length], fp = f(P), fc = f(C);
      if (fp >= -1e-12) out.push(P);
      if ((fp >= -1e-12) !== (fc >= -1e-12)) { const t = fp / (fp - fc); out.push([P[0] + t * (C[0] - P[0]), P[1] + t * (C[1] - P[1])]); }
    }
    return out;
  }
  /* Пояснение к графику: что он показывает и пошаговый разбор. Каждый шаг меняет состояние графика и объясняет, на что смотреть. */
  const guideBar = purpose => `<div class="guide"><div class="gtxt"><b>Что показывает график.</b> ${purpose}</div><div class="btnrow"><button class="btn primary g-start">▶ Объяснить по шагам</button><span class="g-nav" style="display:none"><button class="btn g-prev">← Назад</button><span class="gpos kbd"></span><button class="btn primary g-next">Далее →</button><button class="btn g-exit">Закончить</button></span></div></div>`;
  function runGuide(root, purpose, build, exit) {
    const box = root.querySelector('.guide'); if (!box) return;
    const txt = box.querySelector('.gtxt'), nav = box.querySelector('.g-nav'), start = box.querySelector('.g-start'), prev = box.querySelector('.g-prev'), next = box.querySelector('.g-next');
    let steps = null, i = 0;
    const show = () => {
      const s = steps[i]; if (s.run) s.run();
      txt.innerHTML = `<span class="gstep">${i + 1} / ${steps.length}</span> <b>${s.title}.</b> ${typeof s.text === 'function' ? s.text() : s.text}`;
      txt.classList.remove('reveal'); void txt.offsetWidth; txt.classList.add('reveal');
      prev.disabled = i === 0; next.textContent = i === steps.length - 1 ? 'Готово ✓' : 'Далее →';
      const r = box.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight * 0.4) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const finish = () => { steps = null; nav.style.display = 'none'; start.style.display = ''; box.classList.remove('on'); txt.innerHTML = `<b>Что показывает график.</b> ${purpose}`; exit(); };
    start.onclick = () => { steps = build(); i = 0; start.style.display = 'none'; nav.style.display = ''; box.classList.add('on'); show(); };
    prev.onclick = () => { if (i > 0) { i--; show(); } };
    next.onclick = () => { if (i < steps.length - 1) { i++; show(); } else finish(); };
    box.querySelector('.g-exit').onclick = finish;
  }

  /* Отрезок прямой a·p = b внутри прямоугольника B = [x0, x1, y0, y1]. */
  function segIn(a, b, B) {
    const [x0, x1, y0, y1] = B, pts = [], e = 1e-9 * (Math.abs(x1 - x0) + Math.abs(y1 - y0));
    const add = (x, y) => { if (x >= x0 - e && x <= x1 + e && y >= y0 - e && y <= y1 + e) pts.push([x, y]); };
    if (a[1] !== 0) { add(x0, (b - a[0] * x0) / a[1]); add(x1, (b - a[0] * x1) / a[1]); }
    if (a[0] !== 0) { add((b - a[1] * y0) / a[0], y0); add((b - a[1] * y1) / a[0], y1); }
    let best = null, d = -1;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const dd = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (dd > d) { d = dd; best = [pts[i], pts[j]]; } }
    return best && d > e ? best : null;
  }
  const PAL = ['#3b4cca', '#e08a00', '#1f9d6b', '#c0284f', '#7b3fc4', '#0a8aa8', '#a0780a', '#d4508a', '#4f7f2a', '#5b6bd6', '#b35c1e', '#2f8f8f'];
  const fmtN = v => { const r = Math.round(v * 1000) / 1000; return (r < 0 ? '−' : '') + String(Math.abs(r)).replace('.', ','); };
  const fmtLin = (a, ax) => {
    let s = '';
    a.forEach((v, j) => { if (Math.abs(v) < 1e-12) return; const c = Math.abs(Math.abs(v) - 1) < 1e-12 ? '' : fmtN(Math.abs(v)); s += s === '' ? (v < 0 ? '−' : '') + c + ax[j] : (v < 0 ? ' − ' : ' + ') + c + ax[j]; });
    return s || '0';
  };
  const sgN = s => s === '<=' ? '≤' : s === '>=' ? '≥' : '=';
  const okN = (l, s, b) => { const e = 1e-9 * (1 + Math.abs(b)); return s === '<=' ? l <= b + e : s === '>=' ? l >= b - e : Math.abs(l - b) < e; };

  /* Интерактивный график задачи с двумя переменными.
     cfg: {lines:[{a,b,s,name,html?,eq?}], c, sense, ax, pts, opt, optSeg, optLabel, fval, f0, fname, endText, anim, unbounded,
           paths:[{pts,from,cls,prefix,title}], pathHidden, nonneg (по умолчанию true), side,
           trainer (тренажёр: найти оптимальную вершину), status, whatif (ползунки «что если»), duals (оценки yᵢ по строкам)}
     Можно: двигать и масштабировать плоскость, включать/выключать ограничения, закрашивать полуплоскости,
     строить область по шагам, проверять точку щелчком, двигать линию уровня, менять b и c. */
  function plot(cfg) {
    const id = 'pl' + (++uid);
    const verts0 = (cfg.pts || []).slice();
    const xs = [0], ys = [0];
    (cfg.paths || []).forEach(P => P.pts.forEach(p => (cfg.pts = cfg.pts || []).push(p)));
    (cfg.pts || []).forEach(p => { xs.push(p[0]); ys.push(p[1]); });
    cfg.lines.forEach(L => { if (L.a[0] !== 0 && L.b / L.a[0] > 0) xs.push(L.b / L.a[0]); if (L.a[1] !== 0 && L.b / L.a[1] > 0) ys.push(L.b / L.a[1]); });
    const span = (vert, inter) => {
      const vm = Math.max(0, ...vert), pos = inter.filter(v => v > 1e-12), im = pos.length ? Math.min(...pos) : 0, iM = pos.length ? Math.max(...pos) : 0;
      const v = Math.max(vm * 1.3, Math.min(iM * 1.08, Math.max(vm * 2.5, im * 1.08)));
      return v > 1e-9 ? v : 1;
    };
    const vx = (cfg.pts || []).map(p => p[0]), vy = (cfg.pts || []).map(p => p[1]);
    let X = span(vx, xs.slice(1 + vx.length)), Y = span(vy, ys.slice(1 + vy.length));
    if (cfg.unbounded) { X *= 1.6; Y *= 1.6; }
    X = niceMax(X); Y = niceMax(Y);
    const home = [-0.07 * X, X, -0.07 * Y, Y];
    const ax = cfg.ax, f0 = cfg.f0 || 0, fname = cfg.fname || 'f';
    const C = cfg.lines.map((L, k) => ({ ...L, color: PAL[k % PAL.length], html: L.html || `${fmtLin(L.a, ax)} ${sgN(L.s)} ${fmtN(L.b)}` }));
    const nRows = C.length;
    if (cfg.nonneg !== false) {
      C.push({ a: [1, 0], b: 0, s: '>=', name: ax[0] + ' ≥ 0', html: ax[0] + ' ≥ 0', axis: true, color: '#6b6f7c' });
      C.push({ a: [0, 1], b: 0, s: '>=', name: ax[1] + ' ≥ 0', html: ax[1] + ' ≥ 0', axis: true, color: '#6b6f7c' });
    }
    const order = [...C.keys()].sort((i, j) => (C[j].axis ? 1 : 0) - (C[i].axis ? 1 : 0) || i - j);
    const W = 600, H = 470, L0 = 50, R0 = 14, T0 = 14, B0 = 34, PW = W - L0 - R0, PH = H - T0 - B0;
    const trainer = TR.on && cfg.trainer;
    const b0 = C.map(c => c.b), c00 = cfg.c.slice();

    hooks.push(() => {
      const root = document.getElementById(id + 'w'); if (!root) return;
      const svgEl = root.querySelector('svg'), layer = svgEl.querySelector('.layer'), coord = svgEl.querySelector('.coord');
      const Cc = cfg.c.slice();   // коэффициенты цели (меняются ползунками «что если»)
      const S = { v: home.slice(), inc: C.map(() => true), fill: C.map(() => false), hov: null, mode: 'region', step: order.length, test: null,
        lvl: !trainer && cfg.fval != null ? cfg.fval : null, path: !cfg.pathHidden, cur: {}, revealed: !trainer, await: null, errs: 0, lastB: null, hl: [], hideOpt: false, hideGrad: false, hidePath: false };
      const sx = x => L0 + (x - S.v[0]) / (S.v[1] - S.v[0]) * PW, sy = y => H - B0 - (y - S.v[2]) / (S.v[3] - S.v[2]) * PH;
      const P = poly => poly.map(p => sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1)).join(' ');
      const box = (m = 0.02) => { const [a, b, c, d] = S.v, mx = (b - a) * m, my = (d - c) * m; return [[a - mx, c - my], [b + mx, c - my], [b + mx, d + my], [a - mx, d + my]]; };
      const active = () => S.mode === 'steps' ? order.slice(0, S.await != null ? S.step - 1 : S.step) : [...C.keys()].filter(k => S.inc[k]);
      const regionOf = (ks, bx) => { let r = bx; ks.forEach(k => { r = clipPoly(r, C[k].a, C[k].b, C[k].s); }); return r; };
      const pixDir = d => { const kx = PW / (S.v[1] - S.v[0]), ky = PH / (S.v[3] - S.v[2]); const px = d[0] * kx, py = -d[1] * ky, n = Math.hypot(px, py) || 1; return [px / n, py / n]; };
      const val = p => Cc[0] * p[0] + Cc[1] * p[1];
      let raf = null, tmo = null; const run = () => { cancelAnimationFrame(raf); clearTimeout(tmo); raf = tmo = null; draw(); }; const redraw = () => { if (raf || tmo) return; raf = requestAnimationFrame(run); tmo = setTimeout(run, 80); }; // таймер — запасной путь для фоновой вкладки
      const modified = () => C.some((c, k) => c.b !== b0[k]) || Cc.some((v, j) => v !== c00[j]) || S.inc.some(v => !v);

      /* Численное решение задачи на плоскости перебором вершин (для «что если» и отключённых ограничений). */
      function lp2() {
        const ks = [...C.keys()].filter(k => S.inc[k]), BIG = 1e4 * Math.max(X, Y);
        const L = ks.map(k => C[k]).concat([{ a: [1, 0], b: BIG, s: '<=' }, { a: [1, 0], b: -BIG, s: '>=' }, { a: [0, 1], b: BIG, s: '<=' }, { a: [0, 1], b: -BIG, s: '>=' }]);
        const vs = [];
        for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
          const A = L[i], B2 = L[j], det = A.a[0] * B2.a[1] - A.a[1] * B2.a[0];
          if (Math.abs(det) < 1e-12) continue;
          const p = [(A.b * B2.a[1] - A.a[1] * B2.b) / det, (A.a[0] * B2.b - A.b * B2.a[0]) / det];
          if (L.every(Ln => okN(Ln.a[0] * p[0] + Ln.a[1] * p[1], Ln.s, Ln.b))) vs.push(p);
        }
        if (!vs.length) return { status: 'infeasible' };
        const sg = cfg.sense === 'min' ? -1 : 1;
        let best = vs[0]; vs.forEach(p => { if (sg * val(p) > sg * val(best)) best = p; });
        if (Math.abs(best[0]) > BIG / 2 || Math.abs(best[1]) > BIG / 2) return { status: 'unbounded' };
        const bv = val(best), ties = vs.filter(p => Math.abs(val(p) - bv) < 1e-9 * (1 + Math.abs(bv)) && Math.hypot(p[0] - best[0], p[1] - best[1]) > 1e-9);
        return { status: 'optimal', pt: best, val: bv, seg: ties.length ? [best, ties[0]] : null };
      }
      const optInfo = () => modified() ? lp2() : { status: cfg.status || (cfg.opt ? 'optimal' : cfg.unbounded ? 'unbounded' : 'infeasible'), pt: cfg.opt, val: cfg.fval, seg: cfg.optSeg };

      function draw() {
        const V = S.v, B = [V[0], V[1], V[2], V[3]], O = optInfo(), mod = modified();
        let g = `<rect x="${L0}" y="${T0}" width="${PW}" height="${PH}" class="pbg"/><g clip-path="url(#cp${id})">`;
        const stx = niceStep(V[1] - V[0]), sty = niceStep(V[3] - V[2]);
        let tk = '';
        for (let t = Math.ceil(V[0] / stx) * stx; t <= V[1] + 1e-9; t += stx) { g += `<line x1="${sx(t)}" y1="${T0}" x2="${sx(t)}" y2="${H - B0}" class="grid"/>`; tk += `<text x="${sx(t)}" y="${H - B0 + 15}" class="tk" text-anchor="middle">${fmtN(t)}</text>`; }
        for (let t = Math.ceil(V[2] / sty) * sty; t <= V[3] + 1e-9; t += sty) { g += `<line x1="${L0}" y1="${sy(t)}" x2="${W - R0}" y2="${sy(t)}" class="grid"/>`; tk += `<text x="${L0 - 6}" y="${sy(t) + 4}" class="tk" text-anchor="end">${fmtN(t)}</text>`; }
        if (V[0] <= 0 && V[1] >= 0) g += `<line x1="${sx(0)}" y1="${T0}" x2="${sx(0)}" y2="${H - B0}" class="axis"/>`;
        if (V[2] <= 0 && V[3] >= 0) g += `<line x1="${L0}" y1="${sy(0)}" x2="${W - R0}" y2="${sy(0)}" class="axis"/>`;
        // полуплоскости
        const curStep = S.mode === 'steps' && S.step > 0 ? order[S.step - 1] : null;
        C.forEach((Cn, k) => {
          const shown = S.fill[k] || S.hov === k || (curStep === k && S.await == null);
          if (!shown || Cn.s === '=') return;
          const poly = clipPoly(box(0.05), Cn.a, Cn.b, Cn.s);
          if (poly.length > 2) g += `<polygon points="${P(poly)}" fill="${Cn.color}" class="hpf${S.hov === k || curStep === k ? ' strong' : ''}"/>`;
        });
        // область
        if (S.mode === 'steps' && S.step > 1 && S.await == null) { const pr = regionOf(order.slice(0, S.step - 1), box()); if (pr.length > 2) g += `<polygon points="${P(pr)}" class="prevreg"/>`; }
        const reg = regionOf(active(), box());
        if (reg.length > 2) g += `<polygon points="${P(reg)}" class="region${S.mode === 'steps' ? ' grow' : ''}"/>`;
        // границы, стрелки, подписи
        C.forEach((Cn, k) => {
          const pend = S.mode === 'steps' && order.indexOf(k) >= S.step, off = S.mode === 'region' && !S.inc[k], quiz = S.await === k;
          const sgm = segIn(Cn.a, Cn.b, B); if (!sgm) return;
          const cls = `ln2${Cn.eq ? ' leq' : ''}${pend || off ? ' faint' : ''}${S.hov === k || curStep === k || S.hl.includes(k) ? ' hot' : ''}`;
          g += `<line x1="${sx(sgm[0][0])}" y1="${sy(sgm[0][1])}" x2="${sx(sgm[1][0])}" y2="${sy(sgm[1][1])}" stroke="${Cn.color}" class="${cls}" data-k="${k}"/>`;
          if (Cn.axis || pend || off) return;
          const t = 0.22 + 0.56 * ((k * 0.37) % 1), mx = sgm[0][0] + (sgm[1][0] - sgm[0][0]) * t, my = sgm[0][1] + (sgm[1][1] - sgm[0][1]) * t;
          if (Cn.s !== '=' && !quiz) {
            const d = pixDir(Cn.s === '<=' ? [-Cn.a[0], -Cn.a[1]] : Cn.a), px = sx(mx), py = sy(my);
            g += `<line x1="${px}" y1="${py}" x2="${px + d[0] * 18}" y2="${py + d[1] * 18}" stroke="${Cn.color}" class="sidearr" marker-end="url(#sa${id}${k})"/>`;
            g += `<text x="${px - d[0] * 10 + 3}" y="${py - d[1] * 10 - 3}" class="lbl2" fill="${Cn.color}">${Cn.name}</text>`;
          } else g += `<text x="${sx(mx) + 4}" y="${sy(my) - 6}" class="lbl2" fill="${Cn.color}">${Cn.name}${quiz ? ' ?' : ''}</text>`;
        });
        const full = !(S.mode === 'steps' && S.step < order.length) && S.await == null;
        if (full && S.lvl != null) {
          const s = segIn(Cc, S.lvl, B);
          if (s) g += `<line x1="${sx(s[0][0])}" y1="${sy(s[0][1])}" x2="${sx(s[1][0])}" y2="${sy(s[1][1])}" class="lvl"/><text x="${sx(s[0][0]) + 6}" y="${sy(s[0][1]) - 6}" class="lvlt">${fname} = ${fmtN(S.lvl + f0)}</text>`;
        }
        const showOpt = full && S.revealed && !S.hideOpt && O.status === 'optimal';
        if (full && !S.hideGrad && (Cc[0] || Cc[1])) {
          const o = showOpt ? O.pt : [(V[0] + V[1]) / 2, (V[2] + V[3]) / 2], d = pixDir(cfg.sense === 'min' ? [-Cc[0], -Cc[1]] : Cc), ox = sx(o[0]), oy = sy(o[1]);
          g += `<line x1="${ox}" y1="${oy}" x2="${ox + d[0] * 64}" y2="${oy + d[1] * 64}" class="grad" marker-end="url(#ar${id})"/>`;
        }
        if (showOpt && O.seg) g += `<line x1="${sx(O.seg[0][0])}" y1="${sy(O.seg[0][1])}" x2="${sx(O.seg[1][0])}" y2="${sy(O.seg[1][1])}" class="optseg"/>`;
        if (full && S.revealed && S.path && !S.hidePath && !mod) (cfg.paths || []).forEach((Pt, pi) => {
          if (!Pt.pts.length) return;
          g += `<polyline class="spath ${Pt.cls || ''}" points="${P(Pt.pts)}"/>`;
          const seen = [];
          Pt.pts.forEach((p, i) => { const same = seen.find(s => Math.abs(s.p[0] - p[0]) < 1e-9 && Math.abs(s.p[1] - p[1]) < 1e-9); if (same) same.n.push(i); else seen.push({ p, n: [i] }); });
          seen.forEach(s => {
            const cur = S.cur[pi] != null && s.n.includes(S.cur[pi]);
            g += `<circle class="spt ${Pt.cls || ''}${cur ? ' cur' : ''}" data-path="${pi}" data-k="${s.n[0]}" cx="${sx(s.p[0])}" cy="${sy(s.p[1])}" r="${cur ? 8 : 6}"><title>${Pt.title || 'таблица'} ${s.n.join(', ')}</title></circle>`;
            g += `<text class="sptl ${Pt.cls || ''}" x="${sx(s.p[0]) + (Pt.cls === 'p1' ? 10 : -10)}" y="${sy(s.p[1]) + (Pt.cls === 'p1' ? 16 : -9)}" text-anchor="${Pt.cls === 'p1' ? 'start' : 'end'}">${(Pt.prefix || '') + s.n.join(',')}</text>`;
          });
        });
        if (showOpt) g += `<circle cx="${sx(O.pt[0])}" cy="${sy(O.pt[1])}" r="6" class="opt"/><text x="${sx(O.pt[0]) + 9}" y="${sy(O.pt[1]) + 18}" class="optt">${mod ? `x* ≈ (${fmtN(O.pt[0])}; ${fmtN(O.pt[1])})` : cfg.optLabel || ''}</text>`;
        if (S.test) {
          const ok = active().every(k => okN(C[k].a[0] * S.test[0] + C[k].a[1] * S.test[1], C[k].s, C[k].b)), tx = sx(S.test[0]), ty = sy(S.test[1]);
          g += `<line x1="${tx}" y1="${T0}" x2="${tx}" y2="${H - B0}" class="tline"/><line x1="${L0}" y1="${ty}" x2="${W - R0}" y2="${ty}" class="tline"/><circle cx="${tx}" cy="${ty}" r="7" class="tpt ${ok ? 'ok' : 'no'}"/>`;
        }
        g += `</g>${tk}`;
        layer.innerHTML = g;
        updatePanel(O, mod);
      }

      /* ---------- панель ---------- */
      const stepBox = root.querySelector('.stepbox'), stepTxt = root.querySelector('.steptxt'), stepRange = root.querySelector('.steprange'), testBox = root.querySelector('.testbox');
      const trBox = root.querySelector('.ptrain'), wres = root.querySelector('.wres');
      const regionKind = ks => {
        const big = [[S.v[0] - 1e4 * X, S.v[2] - 1e4 * Y], [S.v[1] + 1e4 * X, S.v[2] - 1e4 * Y], [S.v[1] + 1e4 * X, S.v[3] + 1e4 * Y], [S.v[0] - 1e4 * X, S.v[3] + 1e4 * Y]];
        const r = regionOf(ks, big);
        if (!r.length) return 'пустая — общих точек нет';
        const hasEq = ks.some(k => C[k].s === '=');
        const unb = r.some(p => Math.abs(p[0]) > 5e3 * X || Math.abs(p[1]) > 5e3 * Y);
        if (hasEq) return unb ? 'луч или прямая (есть равенство)' : 'отрезок или точка (есть равенство)';
        return unb ? 'неограниченная' : 'ограниченный многоугольник';
      };
      const testPt = Cn => Math.abs(Cn.b) > 1e-12 ? [0, 0] : Math.abs(Cn.a[0]) > 1e-12 ? [1, 0] : [0, 1];
      const sideText = k => {
        const Cn = C[k];
        if (Cn.axis) return `${Cn.html}: ${Cn.a[0] ? 'правее оси ' + ax[1] : 'выше оси ' + ax[0]} (включая ось).`;
        if (Cn.s === '=') return `${Cn.name} ${Cn.html} — равенство: допустимые точки лежат на самой прямой.`;
        const T = testPt(Cn), v = Cn.a[0] * T[0] + Cn.a[1] * T[1], ok = okN(v, Cn.s, Cn.b);
        return `${Cn.name} ${Cn.html}. Проверяем точку (${fmtN(T[0])}; ${fmtN(T[1])}): ${fmtN(v)} ${sgN(Cn.s)} ${fmtN(Cn.b)} — <b>${ok ? 'верно' : 'неверно'}</b> ⇒ берём ${ok ? 'полуплоскость с этой точкой' : 'противоположную полуплоскость'} (стрелка у прямой).`;
      };
      let trMsg = '', stMsg = '';
      function updatePanel(O, mod) {
        root.querySelectorAll('.ci').forEach(el => { const k = +el.dataset.k; el.classList.toggle('off', S.mode === 'region' ? !S.inc[k] : order.indexOf(k) >= S.step); el.classList.toggle('cur', curK() === k); el.querySelector('.paint').classList.toggle('on', S.fill[k]); });
        root.querySelectorAll('.mode').forEach(b => b.classList.toggle('on', b.dataset.m === S.mode));
        stepBox.style.display = S.mode === 'steps' ? '' : 'none';
        if (S.mode === 'steps') {
          stepRange.value = S.step;
          stepTxt.innerHTML = S.step === 0 ? 'Шаг 0: ограничений ещё нет — подходит вся плоскость. Нажмите «Следующее ограничение».'
            : S.await != null ? `<b>Шаг ${S.step} из ${order.length}.</b> Прямая ${C[S.await].name}: ${C[S.await].html}. <b>Щёлкните по той стороне прямой, где ограничение выполняется.</b>${stMsg}`
            : `<b>Шаг ${S.step} из ${order.length}.</b> ${sideText(order[S.step - 1])}<br>Область после шага: <b>${regionKind(order.slice(0, S.step))}</b>.${stMsg}`;
        }
        if (S.test) {
          const t = S.test, ks = active();
          const rows = ks.map(k => { const Cn = C[k], l = Cn.a[0] * t[0] + Cn.a[1] * t[1], ok = okN(l, Cn.s, Cn.b); return `<tr><td style="color:${Cn.color}">${Cn.name}</td><td>${fmtN(l)} ${sgN(Cn.s)} ${fmtN(Cn.b)}</td><td class="${ok ? 'tick' : 'bad-t'}">${ok ? '✓' : '✗'}</td></tr>`; }).join('');
          const all = ks.every(k => okN(C[k].a[0] * t[0] + C[k].a[1] * t[1], C[k].s, C[k].b));
          testBox.innerHTML = `<div><b>Точка (${fmtN(t[0])}; ${fmtN(t[1])})</b> — ${all ? '<span class="tick">допустима</span>' : '<span class="bad-t">вне области</span>'}; ${fname} = ${fmtN(val(t) + f0)}</div><table class="plain mini">${rows}</table>`;
        }
        if (trBox) {
          const ask = cfg.sense === 'max' ? 'максимум' : 'минимум';
          trBox.innerHTML = S.revealed
            ? `<div class="trq ok">✓ ${O.status === 'optimal' ? `Верно: ${ask} в точке (${fmtN(O.pt[0])}; ${fmtN(O.pt[1])}), ${fname}* = ${fmtN(O.val + f0)}` : O.status === 'unbounded' ? `Верно: ${fname} не ограничена` : 'Верно: допустимая область пуста'}. <span class="trscore">ошибок: ${S.errs}</span></div>`
            : `<div class="trq ask"><span class="trtag">Тренажёр</span> Щёлкните по вершине, где ${fname} достигает ${ask === 'максимум' ? 'максимума' : 'минимума'}. Подсказка: двигайте линию уровня ползунком по направлению стрелки. <span class="trscore">ошибок: ${S.errs}</span></div><div class="btnrow"><button class="btn tr-empty">Область пуста</button><button class="btn tr-unb">${fname} не ограничена</button></div><div class="trmsg ${trMsg ? 'bad' : ''}">${trMsg}</div>`;
          const bE = trBox.querySelector('.tr-empty'), bU = trBox.querySelector('.tr-unb');
          if (bE) bE.onclick = () => answerKind('infeasible'); if (bU) bU.onclick = () => answerKind('unbounded');
        }
        if (wres) {
          const orig = cfg.fval != null ? cfg.fval + f0 : null;
          let h = '';
          if (!mod) h = '<span class="kbd">Подвигайте ползунки — прямые, область и оптимум пересчитаются.</span>';
          else if (O.status !== 'optimal') h = `<b>${O.status === 'unbounded' ? `${fname} не ограничена` : 'Допустимая область пуста'}</b>${orig != null ? ` (было ${fname}* = ${fmtN(orig)})` : ''}.`;
          else {
            h = `<b>${fname}* = ${fmtN(O.val + f0)}</b> в точке (${fmtN(O.pt[0])}; ${fmtN(O.pt[1])})${orig != null ? `; было ${fmtN(orig)}, изменение ${fmtN(O.val + f0 - orig)}` : ''}.`;
            const k = S.lastB;
            if (k != null && orig != null && Math.abs(C[k].b - b0[k]) > 1e-12 && C.every((c, kk) => kk === k || c.b === b0[kk]) && Cc.every((v, j) => v === c00[j])) {
              const r = (O.val + f0 - orig) / (C[k].b - b0[k]);
              h += `<br>Δ${fname}* ÷ Δb${k + 1} = <b>${fmtN(r)}</b> — на столько меняется оптимум на единицу правой части ${C[k].name}.`;
              if (cfg.duals && cfg.duals[k] != null) h += ` Двойственная оценка y${k + 1} = <b>${fmtN(cfg.duals[k])}</b> (задание 4)${Math.abs(r - cfg.duals[k]) < 1e-6 ? ' — совпадает: y показывает «цену» ресурса, пока оптимальная вершина образована теми же прямыми.' : ' — при большом сдвиге оптимум перешёл в другую вершину, и отношение уже другое.'}`;
            }
          }
          wres.innerHTML = h;
        }
      }
      const curK = () => S.hov != null ? S.hov : S.mode === 'steps' && S.step > 0 ? order[S.step - 1] : null;
      function answerKind(kind) {
        const O = optInfo();
        if (O.status === kind) { S.revealed = true; trMsg = ''; if (O.status === 'optimal') S.lvl = O.val; }
        else { S.errs++; trMsg = kind === 'infeasible' ? 'Область не пуста — посмотрите на закрашенную часть.' : `${fname} ограничена: линия уровня последней касается области в вершине.`; }
        redraw();
      }

      /* ---------- управление ---------- */
      root.querySelectorAll('.ci').forEach(el => {
        const k = +el.dataset.k;
        el.onmouseenter = () => { S.hov = k; redraw(); }; el.onmouseleave = () => { S.hov = null; redraw(); };
        el.querySelector('.inc').onchange = e => { S.inc[k] = e.target.checked; if (S.mode !== 'region') { S.mode = 'region'; S.step = order.length; S.await = null; } redraw(); };
        el.querySelector('.paint').onclick = e => { e.preventDefault(); S.fill[k] = !S.fill[k]; redraw(); };
      });
      root.querySelector('.fillall').onclick = () => { const any = S.fill.some(Boolean); S.fill = S.fill.map(() => !any); redraw(); };
      let auto = null; const stopAuto = () => { clearInterval(auto); auto = null; const a = root.querySelector('.st-auto'); if (a) a.textContent = '▶ Авто'; };
      root.querySelectorAll('.mode').forEach(b => b.onclick = () => { S.mode = b.dataset.m; S.step = S.mode === 'steps' ? 0 : order.length; S.await = null; stMsg = ''; stopAuto(); redraw(); });
      const nextStep = () => {
        if (S.await != null || S.step >= order.length) return false;
        S.step++; stMsg = '';
        const k = order[S.step - 1];
        if (TR.on && !C[k].axis && C[k].s !== '=') S.await = k;
        return true;
      };
      root.querySelector('.st-n').onclick = () => { stopAuto(); nextStep(); redraw(); };
      root.querySelector('.st-p').onclick = () => { stopAuto(); if (S.await != null) S.await = null; if (S.step > 0) S.step--; stMsg = ''; redraw(); };
      root.querySelector('.st-auto').onclick = e => { if (auto) return stopAuto(); if (S.step >= order.length) S.step = 0; e.target.textContent = '⏸ Пауза'; auto = setInterval(() => { if (!nextStep() || S.await != null) stopAuto(); redraw(); }, 1600); };
      stepRange.oninput = () => { stopAuto(); S.await = null; stMsg = ''; S.step = +stepRange.value; redraw(); };
      const zoom = (f, cx, cy) => { const v = S.v; cx = cx == null ? (v[0] + v[1]) / 2 : cx; cy = cy == null ? (v[2] + v[3]) / 2 : cy; S.v = [cx + (v[0] - cx) * f, cx + (v[1] - cx) * f, cy + (v[2] - cy) * f, cy + (v[3] - cy) * f]; redraw(); };
      root.querySelector('.zin').onclick = () => zoom(0.7); root.querySelector('.zout').onclick = () => zoom(1 / 0.7);
      root.querySelector('.zhome').onclick = () => { S.v = home.slice(); redraw(); };
      root.querySelector('.zall').onclick = () => { S.v = [-X, X, -Y, Y]; redraw(); };
      const sp = root.querySelector('.showpath'); if (sp) sp.onchange = () => { S.path = sp.checked; redraw(); };
      // линия уровня
      const lr = root.querySelector('.lvlrange'), linfo = root.querySelector('.lvlinfo');
      const hb = [[home[0], home[2]], [home[1], home[2]], [home[1], home[3]], [home[0], home[3]]];
      const setRange = () => { const allv = hb.map(val), lo = Math.min(...allv), hi = Math.max(...allv); lr.min = lo; lr.max = hi; lr.step = (hi - lo) / 400 || 0.01; };
      setRange(); lr.value = S.lvl != null ? S.lvl : (+lr.min + +lr.max) / 2;
      lr.oninput = () => { cancelAnimationFrame(la); S.lvl = +lr.value; linfo.innerHTML = `${fname} = ${fmtN(S.lvl + f0)}`; redraw(); };
      let la = null;
      const lb = root.querySelector('.lvlbtn');
      if (lb) lb.onclick = () => {
        cancelAnimationFrame(la); const t0 = performance.now(), D = 2600, O = optInfo();
        const reg = regionOf([...C.keys()].filter(k => S.inc[k]), hb), rv = (reg.length ? reg : hb).map(val);
        const target = O.status === 'optimal' && S.revealed ? O.val : (cfg.sense === 'min' ? Math.min(...rv) : Math.max(...rv)) * (O.status === 'unbounded' ? 3 : 1);
        if (LEARN.staticMode) { S.lvl = target; lr.value = target; linfo.innerHTML = cfg.endText || `${fname} = ${fmtN(target + f0)}`; draw(); return; }
        const start = cfg.sense === 'min' ? Math.max(...hb.map(val)) : Math.min(...rv, 0);
        const fr = now => { const e = Math.min(1, (now - t0) / D), k = start + (target - start) * (1 - (1 - e) ** 2); S.lvl = k; lr.value = k; draw(); linfo.innerHTML = e < 1 ? `${fname} = ${fmtN(k + f0)}` : (S.revealed && !modified() ? cfg.endText || '' : `${fname} = ${fmtN(k + f0)}`); if (e < 1) la = requestAnimationFrame(fr); };
        la = requestAnimationFrame(fr);
      };
      // «что если»
      root.querySelectorAll('[data-wb]').forEach(inp => inp.oninput = () => { const k = +inp.dataset.wb; C[k].b = +inp.value; S.lastB = k; inp.nextElementSibling.textContent = fmtN(C[k].b); redraw(); });
      root.querySelectorAll('[data-wc]').forEach(inp => inp.oninput = () => { const j = +inp.dataset.wc; Cc[j] = +inp.value; S.lastB = null; inp.nextElementSibling.textContent = fmtN(Cc[j]); setRange(); redraw(); });
      const wr = root.querySelector('.wreset');
      if (wr) wr.onclick = () => { C.forEach((c, k) => { c.b = b0[k]; }); c00.forEach((v, j) => { Cc[j] = v; }); S.lastB = null; root.querySelectorAll('[data-wb]').forEach(i => { i.value = b0[+i.dataset.wb]; i.nextElementSibling.textContent = fmtN(+i.value); }); root.querySelectorAll('[data-wc]').forEach(i => { i.value = c00[+i.dataset.wc]; i.nextElementSibling.textContent = fmtN(+i.value); }); setRange(); redraw(); };
      // мышь / палец
      const toData = e => { const r = svgEl.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width, py = (e.clientY - r.top) * H / r.height; return [S.v[0] + (px - L0) / PW * (S.v[1] - S.v[0]), S.v[2] + (H - B0 - py) / PH * (S.v[3] - S.v[2]), px, py]; };
      const inPlot = d => d[2] >= L0 && d[2] <= W - R0 && d[3] >= T0 && d[3] <= H - B0;
      function clickAt(d) {
        const p = [d[0], d[1]];
        if (S.await != null) {   // тренажёр: какая сторона прямой
          const Cn = C[S.await], l = Cn.a[0] * p[0] + Cn.a[1] * p[1];
          if (okN(l, Cn.s, Cn.b)) { S.await = null; stMsg = `<div class="trmsg ok">✓ Верно: в точке (${fmtN(p[0])}; ${fmtN(p[1])}) ${fmtN(l)} ${sgN(Cn.s)} ${fmtN(Cn.b)}.</div>`; }
          else { S.errs++; stMsg = `<div class="trmsg bad">В точке (${fmtN(p[0])}; ${fmtN(p[1])}) получаем ${fmtN(l)} ${sgN(Cn.s)} ${fmtN(Cn.b)} — неверно. Это не та сторона.</div>`; }
          S.test = p; redraw(); return;
        }
        if (trainer && !S.revealed && S.mode === 'region') {   // тренажёр: оптимальная вершина
          const O = optInfo(), vs = modified() ? [] : verts0;
          let best = null, bd = 1e9; vs.forEach(v => { const dd = Math.hypot(sx(v[0]) - d[2], sy(v[1]) - d[3]); if (dd < bd) { bd = dd; best = v; } });
          if (best && bd < 16) {
            if (O.status === 'optimal' && Math.abs(val(best) - O.val) < 1e-9 * (1 + Math.abs(O.val))) { S.revealed = true; trMsg = ''; S.lvl = O.val; }
            else { S.errs++; trMsg = `В вершине (${fmtN(best[0])}; ${fmtN(best[1])}) ${fname} = ${fmtN(val(best) + f0)}. ${O.status === 'optimal' ? `Есть вершина, где ${fname} ${cfg.sense === 'max' ? 'больше' : 'меньше'}.` : 'Подумайте: достигается ли оптимум вообще?'} Подвиньте линию уровня по стрелке.`; }
            S.test = null; redraw(); return;
          }
          trMsg = 'Оптимум задачи ЛП достигается в вершине — щёлкните ближе к углу области.';
        }
        S.test = p; redraw();
      }
      let drag = null;
      const fingers=new Map();
      const distance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      svgEl.addEventListener('pointerdown', e => { fingers.set(e.pointerId,e); drag = { x: e.clientX, y: e.clientY, v: S.v.slice(), moved: false }; try { svgEl.setPointerCapture(e.pointerId); } catch (_) { /* синтетические события */ } });
      svgEl.addEventListener('pointermove', e => {
        const last=fingers.get(e.pointerId);
        if(last) fingers.set(e.pointerId,e);
        if(last && fingers.size===2){
          const other=[...fingers.values()].find(f=>f.pointerId!==e.pointerId);
          const was=distance(last,other), now=distance(e,other);
          if(was>1 && now>1){const mid=toData({clientX:(e.clientX+other.clientX)/2,clientY:(e.clientY+other.clientY)/2});zoom(was/now,mid[0],mid[1]);}
          drag=null;return;
        }
        const d = toData(e);
        coord.textContent = inPlot(d) ? `${ax[0]} = ${fmtN(d[0])}; ${ax[1]} = ${fmtN(d[1])}` : '';
        if (!drag) return;
        const r = svgEl.getBoundingClientRect(), dx = (e.clientX - drag.x) * W / r.width, dy = (e.clientY - drag.y) * H / r.height;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        if (!drag.moved) return;
        svgEl.classList.add('dragging');
        const ux = dx / PW * (drag.v[1] - drag.v[0]), uy = dy / PH * (drag.v[3] - drag.v[2]);
        S.v = [drag.v[0] - ux, drag.v[1] - ux, drag.v[2] + uy, drag.v[3] + uy]; redraw();
      });
      svgEl.addEventListener('pointerup', e => {
        fingers.delete(e.pointerId);svgEl.classList.remove('dragging');
        if (drag && !drag.moved) {
          const c = e.target.closest && e.target.closest('circle.spt');
          if (c) { const Pt = cfg.paths[+c.dataset.path]; if (Pt && Pt.from) document.dispatchEvent(new CustomEvent('sxgo', { detail: { id: Pt.from, k: +c.dataset.k } })); }
          else { const d = toData(e); if (inPlot(d)) clickAt(d); }
        }
        drag = null;
      });
      svgEl.addEventListener('pointerleave', () => { coord.textContent = ''; });
      svgEl.addEventListener('pointercancel',e=>{fingers.delete(e.pointerId);drag=null;});
      svgEl.addEventListener('wheel', e => { e.preventDefault(); const d = toData(e); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, d[0], d[1]); }, { passive: false });
      root.querySelector('.tclear').onclick = () => { S.test = null; testBox.innerHTML = '<span class="kbd">Щёлкните по графику — проверим любую точку.</span>'; redraw(); };
      (cfg.paths || []).forEach((Pt, pi) => { if (Pt.from) on('sxstep', e => { if (e.detail.id === Pt.from) { S.cur[pi] = e.detail.k; redraw(); } }); });
      if (S.lvl != null) linfo.innerHTML = `${fname} = ${fmtN(S.lvl + f0)}`;
      // ---- пошаговое пояснение графика ----
      const anim = (from, to, D = 2200) => { cancelAnimationFrame(la); if (LEARN.staticMode) { S.lvl = to; lr.value = to; linfo.innerHTML = `${fname} = ${fmtN(to + f0)}`; draw(); return; } const t0 = performance.now(); const fr = now => { const e = Math.min(1, (now - t0) / D); S.lvl = from + (to - from) * (1 - (1 - e) ** 2); lr.value = S.lvl; linfo.innerHTML = `${fname} = ${fmtN(S.lvl + f0)}`; draw(); if (e < 1) la = requestAnimationFrame(fr); }; la = requestAnimationFrame(fr); setTimeout(() => { if (Math.abs(S.lvl - to) > 1e-9) { S.lvl = to; draw(); } }, D + 300); };
      const initLvl = S.lvl;
      const base = () => { S.inc = C.map(() => true); S.fill = C.map(() => false); S.hl = []; S.test = null; S.v = home.slice(); S.revealed = true; };
      const build = () => {
        base();
        const st = [], O = optInfo(), allK = [...C.keys()], hb2 = [[home[0], home[2]], [home[1], home[2]], [home[1], home[3]], [home[0], home[3]]];
        const reg = regionOf(allK, hb2), rv = (reg.length ? reg : hb2).map(val);
        const lvStart = cfg.sense === 'min' ? Math.max(...rv) + (Math.max(...rv) - Math.min(...rv)) * 0.6 : Math.min(...rv) - (Math.max(...rv) - Math.min(...rv)) * 0.6;
        const pre = { hideOpt: true, hideGrad: true, hidePath: true };
        st.push({ title: 'Начинаем с пустой плоскости', run: () => { Object.assign(S, pre, { mode: 'steps', step: 0, lvl: null }); draw(); },
          text: `Будем добавлять ограничения по одному и смотреть, какая часть плоскости остаётся. Каждое неравенство отрезает полуплоскость — сторону своей прямой.` });
        order.forEach((k, idx) => st.push({ title: C[k].axis ? `Условие ${C[k].html}` : `Ограничение ${C[k].name}`, run: () => { Object.assign(S, pre, { mode: 'steps', step: idx + 1 }); draw(); },
          text: () => `${sideText(k)} Закрашена допустимая полуплоскость; пунктир — область до этого шага. Сейчас область: <b>${regionKind(order.slice(0, idx + 1))}</b>.` }));
        const empty = !regionOf(allK, [[-1e6, -1e6], [1e6, -1e6], [1e6, 1e6], [-1e6, 1e6]]).length;
        st.push({ title: 'Допустимая область', run: () => { Object.assign(S, pre, { mode: 'region', step: order.length }); draw(); },
          text: empty ? 'Полуплоскости не имеют общей точки — <b>допустимая область пуста</b>, у задачи нет решения. Дальше двигать нечего.' : `Пересечение всех полуплоскостей (синяя заливка) — допустимые точки задачи. Щёлкните в любом месте графика: справа появится проверка каждого ограничения в этой точке.` });
        if (empty || !(Cc[0] || Cc[1])) return st;
        st.push({ title: cfg.sense === 'max' ? 'Направление роста цели' : 'Направление убывания цели', run: () => { Object.assign(S, pre, { hideGrad: false }); draw(); },
          text: `Зелёная стрелка — ${cfg.sense === 'max' ? `градиент (${fmtN(Cc[0])}; ${fmtN(Cc[1])}): в эту сторону ${fname} растёт быстрее всего` : `антиградиент (${fmtN(-Cc[0])}; ${fmtN(-Cc[1])}): в эту сторону ${fname} убывает быстрее всего`}. Нам нужен ${cfg.sense === 'max' ? 'максимум' : 'минимум'}, поэтому двигаться будем по стрелке.` });
        st.push({ title: 'Линия уровня', run: () => { Object.assign(S, pre, { hideGrad: false }); anim(lvStart, O.status === 'optimal' ? O.val : O.status === 'unbounded' ? lvStart + (O.status === 'unbounded' ? (cfg.sense === 'max' ? 1 : -1) * 4 * (Math.max(...rv) - Math.min(...rv) + 1) : 0) : lvStart); },
          text: `Красная пунктирная прямая ${fname} = const: во всех её точках значение цели одинаковое. Сдвигаем её по стрелке — ${fname} меняется в нужную сторону — пока у неё остаются общие точки с областью.` });
        if (O.status === 'unbounded') st.push({ title: 'Цель не ограничена', run: () => {}, text: `Область уходит в бесконечность по направлению стрелки: линию уровня можно сдвигать сколько угодно, ${fname} растёт без предела — <b>оптимума нет</b>.` });
        else if (O.status === 'optimal') {
          const bind = allK.filter(k => Math.abs(C[k].a[0] * O.pt[0] + C[k].a[1] * O.pt[1] - C[k].b) < 1e-7 * (1 + Math.abs(C[k].b)));
          const nm = bind.map(k => C[k].axis ? C[k].html : C[k].name);
          st.push({ title: 'Оптимум — последняя точка касания', run: () => { Object.assign(S, pre, { hideGrad: false, hideOpt: false, lvl: O.val, hl: bind }); draw(); },
            text: `Дальше линия уровня выходит из области. Последняя общая точка — <b>(${fmtN(O.pt[0])}; ${fmtN(O.pt[1])}), ${fname}* = ${fmtN(O.val + f0)}</b>. Это вершина: в ней пересекаются ${nm.join(' и ')} (выделены). Поэтому её координаты находят из системы уравнений этих прямых.${O.seg ? ' Линия уровня параллельна стороне области — оптимальны все точки зелёного отрезка.' : ''}${bind.length > 2 ? ' Через вершину проходит больше двух прямых — она вырожденная.' : ''}` });
        }
        if (!cfg.pathHidden) (cfg.paths || []).forEach((Pt, pi) => Pt.pts.forEach((p, i) => st.push({ title: `${Pt.title || 'Таблица'} ${i}`,
          run: () => { Object.assign(S, pre, { hidePath: false, hideOpt: false, hideGrad: false, path: true, hl: [] }); S.cur = {}; S.cur[pi] = i; draw(); if (Pt.from) document.dispatchEvent(new CustomEvent('sxgo', { detail: { id: Pt.from, k: i, quiet: true } })); },
          text: () => { const inside = allK.every(k => okN(C[k].a[0] * p[0] + C[k].a[1] * p[1], C[k].s, C[k].b)); const prevV = i ? val(Pt.pts[i - 1]) : null;
            return `Базисное решение этой симплекс-таблицы — точка (${fmtN(p[0])}; ${fmtN(p[1])}), ${fname} = ${fmtN(val(p) + f0)}. ${inside ? 'Это вершина допустимой области.' : 'Точка <b>вне</b> области: искусственные переменные ещё не нулевые — этап 1 как раз ведёт в допустимую вершину.'}${prevV != null && Math.abs(val(p) - prevV) > 1e-12 ? ` По сравнению с предыдущей таблицей ${fname} ${val(p) > prevV ? 'выросла' : 'уменьшилась'} — метод переходит к соседней вершине с лучшим значением.` : prevV != null ? ' Точка та же, сменился только базис (вырожденный шаг).' : ''} Таблица открыта в пошаговом разборе выше.`; } })));
        return st;
      };
      runGuide(root, cfg.purpose, build, () => { Object.assign(S, { hideOpt: false, hideGrad: false, hidePath: false, hl: [], mode: 'region', step: order.length, lvl: initLvl }); S.cur = {}; draw(); });
      // управление графиком извне (тренажёр)
      root.api = {
        set: o => { Object.assign(S, o); if (o.mode === 'region') S.step = order.length; draw(); },
        kind: () => regionKind([...C.keys()]),
        anim: target => {
          const hb2 = [[home[0], home[2]], [home[1], home[2]], [home[1], home[3]], [home[0], home[3]]], reg = regionOf([...C.keys()], hb2), rv = (reg.length ? reg : hb2).map(val), span = Math.max(...rv) - Math.min(...rv) + 1;
          const start = cfg.sense === 'min' ? Math.max(...rv) + span * 0.5 : Math.min(...rv) - span * 0.5;
          anim(start, target != null ? target : start + (cfg.sense === 'min' ? -1 : 1) * 4 * span);
        }
      };
      draw();
    });

    const markers = C.map((Cn, k) => `<marker id="sa${id}${k}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0L10,5L0,10z" fill="${Cn.color}"/></marker>`).join('');
    const svg = `<svg viewBox="0 0 ${W} ${H}" class="plot iplot" id="${id}"><defs><clipPath id="cp${id}"><rect x="${L0}" y="${T0}" width="${PW}" height="${PH}"/></clipPath><marker id="ar${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#1f9d6b"/></marker>${markers}</defs><g class="layer"></g><text x="${W - R0 - 4}" y="${T0 + 14}" class="coord" text-anchor="end"></text><text x="${W - R0}" y="${H - 4}" class="axl" text-anchor="end">${ax[0]}</text><text x="6" y="${T0 + 12}" class="axl">${ax[1]}</text></svg>`;
    const list = C.map((Cn, k) => `<label class="ci" data-k="${k}"><input type="checkbox" class="inc" checked title="учитывать в области"><span class="sw" style="--c:${Cn.color}"></span><span class="ct"><b style="color:${Cn.color}">${Cn.axis ? '' : Cn.name + ' '}</b><span class="m">${Cn.html}</span></span><button class="paint" title="закрасить полуплоскость этого ограничения">◐</button></label>`).join('');
    const paths = cfg.paths && cfg.paths.length;
    const rng = (v, attr, lab) => { const m = Math.max(Math.abs(v), 1); return `<label class="wrow"><span class="wl">${lab}</span><input type="range" ${attr} min="${v - m}" max="${v + m}" step="${(2 * m / 200).toPrecision(3)}" value="${v}"><span class="wv">${fmtN(v)}</span></label>`; };
    const whatif = cfg.whatif ? `<details class="whatif"><summary>Что если… изменить правые части и коэффициенты цели</summary>
        ${C.slice(0, nRows).map((Cn, k) => Cn.s === '=' ? '' : rng(Cn.b, `data-wb="${k}"`, `b${k + 1} <span style="color:${Cn.color}">${Cn.name}</span>`)).join('')}
        ${rng(cfg.c[0], 'data-wc="0"', 'c₁')}${rng(cfg.c[1], 'data-wc="1"', 'c₂')}
        <div class="wres"></div><button class="btn wreset">Сбросить</button></details>` : '';
    return `<div class="plotwrap" id="${id}w">
      <div class="btnrow ptool"><span class="seg"><button class="btn mode on" data-m="region">Вся область</button><button class="btn mode" data-m="steps">Построить по шагам</button></span>
        <span class="seg"><button class="btn zout" title="отдалить">−</button><button class="btn zin" title="приблизить">+</button><button class="btn zhome" title="вернуть исходный вид">Вписать</button><button class="btn zall" title="показать все четыре четверти">±</button></span>
        <span class="kbd">перетаскивайте поле · колесо или два пальца — масштаб · щелчок — проверить точку</span></div>
      ${!trainer && cfg.purpose ? guideBar(cfg.purpose) : ''}
      <div class="stepbox" style="display:none"><div class="btnrow"><button class="btn st-p">← Назад</button><input type="range" class="steprange" min="0" max="${order.length}" value="0"><button class="btn primary st-n">Следующее ограничение →</button><button class="btn st-auto">▶ Авто</button></div><div class="steptxt note"></div></div>
      ${trainer ? '<div class="ptrain"></div>' : ''}
      <div class="plotgrid"><div>${svg}
        <div class="btnrow lvlrow">${cfg.fval != null || cfg.anim || trainer ? '<button class="btn primary lvlbtn">▶ Сдвигать линию уровня</button>' : ''}<label class="kbd">линия уровня <input type="range" class="lvlrange"></label><span class="lvlinfo kbd"></span></div></div>
        <div><div class="kbd">Ограничения — наведите, чтобы увидеть полуплоскость; ◐ — закрасить; флажок — учитывать в области:</div><div class="clist">${list}</div>
          <div class="btnrow"><button class="btn fillall">◐ Закрасить все / снять</button>${paths ? `<label class="tg-l"><input type="checkbox" class="showpath"${cfg.pathHidden ? '' : ' checked'}> путь симплекс-метода</label>` : ''}</div>
          ${whatif}
          <div class="testbox"><span class="kbd">Щёлкните по графику — проверим любую точку.</span></div><button class="btn tclear">Убрать точку</button>
          <div class="legend col"><span style="--c:#c9d1ff">допустимая область</span><span style="--c:#e8456b">линия уровня</span><span style="--c:#1f9d6b">${cfg.sense === 'min' ? 'антиградиент (уменьшение)' : 'градиент (рост)'} цели</span>${paths ? '<span style="--c:#e8456b">вершины, которые проходит симплекс-метод (номер = номер таблицы)</span>' : ''}</div>${cfg.side || ''}</div></div></div>`;
  }

  /* Трёхмерная допустимая область (три переменные): многогранник, который можно вращать, и путь симплекс-метода по его вершинам.
     cfg: {planes:[{a:[a1,a2,a3], b, s, name, html}], c, sense, paths:[{pts:[[x1,x2,x3]], from, cls, prefix, title}], ax} */
  function plot3d(cfg) {
    const id = 'p3' + (++uid), ax = cfg.ax || ['x₁', 'x₂', 'x₃'];
    const W = 600, H = 470;
    // --- геометрия (числа с плавающей точкой) ---
    const dot = (a, p) => a[0] * p[0] + a[1] * p[1] + a[2] * p[2];
    const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const det3 = (A) => A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
    const PL = cfg.planes.map((p, k) => ({ ...p, k, color: PAL[k % PAL.length] }));
    [0, 1, 2].forEach(j => { const a = [0, 0, 0]; a[j] = 1; PL.push({ a, b: 0, s: '>=', name: ax[j] + ' ≥ 0', html: ax[j] + ' ≥ 0', axis: true, color: '#9a9890' }); });
    const ok = (P, p) => { const l = dot(P.a, p), e = 1e-7 * (1 + Math.abs(P.b)); return P.s === '<=' ? l <= P.b + e : P.s === '>=' ? l >= P.b - e : Math.abs(l - P.b) < e; };
    const vertsOf = L => {
      const out = [];
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) for (let k = j + 1; k < L.length; k++) {
        const A = [L[i].a, L[j].a, L[k].a], d = det3(A); if (Math.abs(d) < 1e-10) continue;
        const bb = [L[i].b, L[j].b, L[k].b];
        const p = [0, 1, 2].map(c => det3(A.map((row, r) => row.map((v, cc) => cc === c ? bb[r] : v))) / d);
        if (L.every(P => ok(P, p)) && !out.some(q => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < 1e-7 * (1 + Math.hypot(...p)))) out.push(p);
      }
      return out;
    };
    // ограничивающая рамка, если область неограничена
    const v0 = vertsOf(PL), pathPts = (cfg.paths || []).flatMap(P => P.pts);
    const scaleRef = Math.max(1e-9, ...v0.flat(), ...pathPts.flat(), ...PL.filter(P => !P.axis).flatMap(P => P.a.map(a => a > 1e-12 && P.b / a > 0 ? P.b / a : 0)));
    // ограничена ли область: вершины при очень большой рамке не должны лежать на рамке
    const HUGE = 1e6 * scaleRef, hugeBox = [0, 1, 2].map(j => { const a = [0, 0, 0]; a[j] = 1; return { a, b: HUGE, s: '<=' }; });
    const bounded = vertsOf(PL.concat(hugeBox)).every(p => Math.max(...p) < HUGE / 2);
    // неограниченную область показываем вокруг пути метода и оптимума, иначе дальние вершины скрывают главное
    const focus = Math.max(0, ...pathPts.flat(), ...(cfg.opt || []));
    const M = bounded ? 1.15 * scaleRef : focus > 0 ? Math.min(1.25 * scaleRef, 2.4 * focus) : 1.25 * scaleRef;
    const BOX = [0, 1, 2].map(j => { const a = [0, 0, 0]; a[j] = 1; return { a, b: M, s: '<=', name: 'рамка', box: true, color: '#c8c4b8' }; });
    const ALL = PL.concat(BOX), V = vertsOf(ALL);
    const act = V.map(p => ALL.map((P, i) => Math.abs(dot(P.a, p) - P.b) < 1e-7 * (1 + Math.abs(P.b)) ? i : -1).filter(i => i >= 0));
    const cut = V.some((p, i) => act[i].some(t => ALL[t].box));
    // грани: вершины, лежащие на одной плоскости, упорядоченные по углу
    const faces = [];
    ALL.forEach((P, t) => {
      const idx = V.map((_, i) => i).filter(i => act[i].includes(t)); if (idx.length < 3) return;
      const cen = [0, 1, 2].map(c => idx.reduce((s, i) => s + V[i][c], 0) / idx.length), n = P.a;
      let u = cross(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]); const nu = Math.hypot(...u); u = u.map(x => x / nu);
      let w = cross(n, u); const nw = Math.hypot(...w); w = w.map(x => x / nw);
      idx.sort((i, j) => { const a = V[i].map((x, c) => x - cen[c]), b = V[j].map((x, c) => x - cen[c]); return Math.atan2(dot(w, a), dot(u, a)) - Math.atan2(dot(w, b), dot(u, b)); });
      faces.push({ t, idx });
    });
    const edges = [];
    for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) { const sh = act[i].filter(t => act[j].includes(t)); if (sh.length >= 2) { if (sh.every(t => ALL[t].box)) continue; edges.push([i, j, sh.every(t => ALL[t].box || ALL[t].axis)]); } }
    const sense = cfg.sense === 'min' ? -1 : 1, cv = p => dot(cfg.c, p);
    const opt = cfg.opt || null;

    hooks.push(() => {
      const root = document.getElementById(id + 'w'); if (!root) return;
      const svgEl = root.querySelector('svg'), layer = svgEl.querySelector('.layer'), info = root.querySelector('.p3info');
      const S = { th: -0.75, ph: 0.42, zoom: 1, spin: false, cur: {}, hov: null, hl: [], lp: null, bigV: false, hidePath: false, hideOpt: false };
      // плоскость уровня c·x = k внутри куба [0, M]³
      const corners = [0, 1].flatMap(a => [0, 1].flatMap(b => [0, 1].map(c => [a * M, b * M, c * M])));
      const cubeEdges = []; corners.forEach((p, i) => corners.forEach((q, j) => { if (j > i && p.filter((v, c) => v !== q[c]).length === 1) cubeEdges.push([p, q]); }));
      const levelPoly = k => {
        const pts = [];
        cubeEdges.forEach(([p, q]) => { const fp = cv(p) - k, fq2 = cv(q) - k; if (fp === 0) pts.push(p); else if (fp * fq2 < 0) { const t = fp / (fp - fq2); pts.push(p.map((v, c) => v + t * (q[c] - v))); } });
        if (pts.length < 3) return null;
        const cen = [0, 1, 2].map(c => pts.reduce((s, p) => s + p[c], 0) / pts.length), n = cfg.c;
        let u = cross(n, Math.abs(n[0]) < 0.9 * Math.hypot(...n) ? [1, 0, 0] : [0, 1, 0]); const nu = Math.hypot(...u) || 1; u = u.map(x => x / nu);
        let w = cross(n, u); const nw = Math.hypot(...w) || 1; w = w.map(x => x / nw);
        return pts.sort((a, b) => { const A = a.map((x, c) => x - cen[c]), B = b.map((x, c) => x - cen[c]); return Math.atan2(dot(w, A), dot(u, A)) - Math.atan2(dot(w, B), dot(u, B)); });
      };
      const cvals = corners.map(cv), cmin = Math.min(...cvals), cmax = Math.max(...cvals);
      const sc = () => 230 * S.zoom / M, cx = W / 2, cy = H / 2 + 30;
      const proj = p => {
        const q = p.map(x => x - M * 0.45);
        const x1 = q[0] * Math.cos(S.th) - q[1] * Math.sin(S.th), y1 = q[0] * Math.sin(S.th) + q[1] * Math.cos(S.th), z1 = q[2];
        const y2 = y1 * Math.cos(S.ph) - z1 * Math.sin(S.ph), z2 = y1 * Math.sin(S.ph) + z1 * Math.cos(S.ph);
        return [cx + x1 * sc(), cy - z2 * sc(), y2];
      };
      function draw() {
        let g = '';
        // оси
        [0, 1, 2].forEach(j => { const e = [0, 0, 0]; e[j] = M * 1.12; const o = proj([0, 0, 0]), t = proj(e); g += `<line x1="${o[0]}" y1="${o[1]}" x2="${t[0]}" y2="${t[1]}" class="ax3" marker-end="url(#a3${id})"/><text x="${t[0] + 6}" y="${t[1] - 4}" class="axl">${ax[j]}</text>`; });
        // грани — от дальних к ближним
        const F = faces.map(fc => ({ ...fc, pts: fc.idx.map(i => proj(V[i])) })).map(fc => ({ ...fc, d: fc.pts.reduce((s, p) => s + p[2], 0) / fc.pts.length })).sort((a, b) => b.d - a.d);
        F.forEach(fc => {
          const P = ALL[fc.t], hot = S.hov === fc.t || S.hl.includes(fc.t);
          g += `<polygon points="${fc.pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" class="f3${P.box ? ' box' : ''}${P.axis ? ' axf' : ''}${hot ? ' hot' : ''}" style="--fc:${P.color}" data-t="${fc.t}"><title>${P.box ? 'рамка обрезки (область неограничена)' : P.name + ': ' + P.html.replace(/<[^>]+>/g, '')}</title></polygon>`;
        });
        edges.forEach(([i, j, weak]) => { const a = proj(V[i]), b = proj(V[j]); g += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="e3${weak ? ' weak' : ''}"/>`; });
        if (S.lp != null) { const lpP = levelPoly(S.lp); if (lpP) { const pp = lpP.map(proj); g += `<polygon points="${pp.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" class="lp3"/>`; const q = pp[0]; g += `<text x="${q[0] + 6}" y="${q[1] - 6}" class="lvlt">${cfg.fname || 'f'} = ${fmtN(S.lp)}</text>`; } }
        V.forEach(p => { const q = proj(p); g += `<circle cx="${q[0]}" cy="${q[1]}" r="${S.bigV ? 5.5 : 3}" class="v3${S.bigV ? ' big' : ''}"><title>(${p.map(fmtN).join('; ')}), f = ${fmtN(cv(p))}</title></circle>`; });
        if (!S.hidePath) (cfg.paths || []).forEach((Pt, pi) => {
          const pts = Pt.pts.map(proj);
          g += `<polyline points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}" class="spath ${Pt.cls || ''}"/>`;
          const seen = [];
          Pt.pts.forEach((p, i) => { const s2 = seen.find(s => Math.hypot(s.p[0] - p[0], s.p[1] - p[1], s.p[2] - p[2]) < 1e-9); if (s2) s2.n.push(i); else seen.push({ p, n: [i] }); });
          seen.forEach(s => { const q = proj(s.p), cur = S.cur[pi] != null && s.n.includes(S.cur[pi]); g += `<circle class="spt ${Pt.cls || ''}${cur ? ' cur' : ''}" data-path="${pi}" data-k="${s.n[0]}" cx="${q[0]}" cy="${q[1]}" r="${cur ? 8 : 6}"><title>${Pt.title || 'таблица'} ${s.n.join(', ')}: (${s.p.map(fmtN).join('; ')})</title></circle><text class="sptl ${Pt.cls || ''}" x="${q[0] + (Pt.cls === 'p1' ? 10 : -10)}" y="${q[1] + (Pt.cls === 'p1' ? 16 : -9)}" text-anchor="${Pt.cls === 'p1' ? 'start' : 'end'}">${(Pt.prefix || '') + s.n.join(',')}</text>`; });
        });
        if (opt && !S.hideOpt) { const q = proj(opt); g += `<circle cx="${q[0]}" cy="${q[1]}" r="7" class="opt"/>`; }
        layer.innerHTML = g;
        if (S.hov != null) { const P = ALL[S.hov]; info.innerHTML = P.box ? 'Серая грань — рамка: область уходит в бесконечность, на рисунке она обрезана.' : `Грань лежит на плоскости <b style="color:${P.color}">${P.name}</b>: <span class="m">${P.html}</span>`; }
      }
      let raf = null, tmo = null; const run = () => { cancelAnimationFrame(raf); clearTimeout(tmo); raf = tmo = null; draw(); }; const redraw = () => { if (raf || tmo) return; raf = requestAnimationFrame(run); tmo = setTimeout(run, 80); }; // таймер — запасной путь для фоновой вкладки
      let drag = null;
      svgEl.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, th: S.th, ph: S.ph, moved: false }; try { svgEl.setPointerCapture(e.pointerId); } catch (_) { /* синтетические события */ } });
      svgEl.addEventListener('pointermove', e => {
        if (!drag) { const f = e.target.closest && e.target.closest('polygon.f3'); const t = f ? +f.dataset.t : null; if (t !== S.hov) { S.hov = t; redraw(); } return; }
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        S.th = drag.th + dx * 0.01; S.ph = Math.max(-1.45, Math.min(1.45, drag.ph + dy * 0.01)); redraw();
      });
      svgEl.addEventListener('pointerup', e => {
        if (drag && !drag.moved) { const c = e.target.closest && e.target.closest('circle.spt'); if (c) { const Pt = cfg.paths[+c.dataset.path]; if (Pt && Pt.from) document.dispatchEvent(new CustomEvent('sxgo', { detail: { id: Pt.from, k: +c.dataset.k } })); } }
        drag = null;
      });
      svgEl.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); S.zoom *= e.deltaY > 0 ? 0.9 : 1.1; redraw(); }, { passive: false });
      root.querySelector('.r3home').onclick = () => { S.th = -0.75; S.ph = 0.42; S.zoom = 1; redraw(); };
      root.querySelectorAll('.r3view').forEach(b => b.onclick = () => { const v = b.dataset.v.split(',').map(Number); S.th = v[0]; S.ph = v[1]; redraw(); });
      root.querySelector('.zin3').onclick = () => { S.zoom *= 1.2; redraw(); }; root.querySelector('.zout3').onclick = () => { S.zoom /= 1.2; redraw(); };
      let spin = null; root.querySelector('.r3spin').onclick = e => { if (spin) { cancelAnimationFrame(spin); spin = null; e.target.textContent = '↻ Вращать'; return; } e.target.textContent = '⏸ Стоп'; let t0 = performance.now(); const f = now => { S.th += (now - t0) * 0.0006; t0 = now; draw(); if (document.body.contains(root)) spin = requestAnimationFrame(f); }; spin = requestAnimationFrame(f); };
      (cfg.paths || []).forEach((Pt, pi) => { if (Pt.from) on('sxstep', e => { if (e.detail.id === Pt.from) { S.cur[pi] = e.detail.k; redraw(); } }); });
      // плоскость уровня: ползунок и анимация
      const lr3 = root.querySelector('.lp3range'), li3 = root.querySelector('.lp3info');
      lr3.min = cmin; lr3.max = cmax; lr3.step = (cmax - cmin) / 400 || 0.01; lr3.value = opt ? cv(opt) : (cmin + cmax) / 2;
      lr3.oninput = () => { cancelAnimationFrame(la3); S.lp = +lr3.value; li3.textContent = `${cfg.fname || 'f'} = ${fmtN(S.lp)}`; redraw(); };
      let la3 = null;
      const anim3 = (from, to, D = 2400) => { cancelAnimationFrame(la3); if (LEARN.staticMode) { S.lp = to; lr3.value = to; li3.textContent = `${cfg.fname || 'f'} = ${fmtN(to)}`; draw(); return; } const t0 = performance.now(); const fr = now => { const e = Math.min(1, (now - t0) / D); S.lp = from + (to - from) * (1 - (1 - e) ** 2); lr3.value = S.lp; li3.textContent = `${cfg.fname || 'f'} = ${fmtN(S.lp)}`; draw(); if (e < 1) la3 = requestAnimationFrame(fr); }; la3 = requestAnimationFrame(fr); setTimeout(() => { if (Math.abs(S.lp - to) > 1e-9) { S.lp = to; draw(); } }, D + 300); };
      const lpStart = cfg.sense === 'min' ? cmax : cmin;
      root.querySelector('.lp3btn').onclick = () => anim3(lpStart, opt ? cv(opt) : (cfg.sense === 'min' ? cmin : cmax));
      // пошаговое пояснение
      const optIdx = opt ? V.findIndex(p => Math.hypot(p[0] - opt[0], p[1] - opt[1], p[2] - opt[2]) < 1e-6 * (1 + M)) : -1;
      const faceOf = t => faces.some(fc => fc.t === t);
      const build = () => {
        S.th = -0.75; S.ph = 0.42; S.zoom = 1; S.hl = []; S.lp = null; S.bigV = false;
        const pre = { hidePath: true, hideOpt: true, bigV: false, lp: null };
        const st = [];
        if (!V.length) return [{ title: 'Область пуста', run: () => { Object.assign(S, pre); draw(); }, text: 'Плоскости ограничений не имеют общей допустимой точки — многогранника нет, у задачи нет решения.' }];
        st.push({ title: 'Допустимая область — многогранник', run: () => { Object.assign(S, pre, { hl: [] }); draw(); },
          text: `Точки, где выполнены все ограничения и x ≥ 0, образуют многогранник. Каждое неравенство отсекает полупространство по одну сторону плоскости. Поворачивайте рисунок мышью — так легче понять форму.` });
        PL.forEach((P, t) => { if (P.axis) return; st.push({ title: `Ограничение ${P.name}`, run: () => { Object.assign(S, pre, { hl: faceOf(t) ? [t] : [] }); draw(); },
          text: faceOf(t) ? `Выделенная грань лежит на плоскости <span class="m">${P.html.replace(/[≤≥]/, '=')}</span>. Неравенство <span class="m">${P.html}</span> оставляет область по одну сторону от неё.` : `Ограничение <span class="m">${P.html}</span> <b>не образует грани</b>: в допустимой области оно выполняется с запасом и на форму многогранника не влияет.` }); });
        st.push({ title: 'Условия xⱼ ≥ 0', run: () => { Object.assign(S, pre, { hl: PL.map((P, t) => P.axis && faceOf(t) ? t : -1).filter(t => t >= 0) }); draw(); }, text: 'Серые грани лежат на координатных плоскостях: это условия x₁, x₂, x₃ ≥ 0.' + (cut ? ' Область уходит в бесконечность, поэтому дальняя часть обрезана почти невидимой рамкой.' : '') });
        st.push({ title: 'Вершины — базисные решения', run: () => { Object.assign(S, pre, { hl: [], bigV: true }); draw(); },
          text: `В каждой из ${V.length} вершин сходятся три плоскости: три ограничения выполняются как равенства. Это базисные решения — именно их перебирает симплекс-метод, двигаясь по рёбрам. Наведите на вершину — увидите её координаты и значение цели.` });
        (cfg.paths || []).forEach((Pt, pi) => Pt.pts.forEach((p, i) => st.push({ title: `${Pt.title || 'Таблица'} ${i}`,
          run: () => { Object.assign(S, pre, { hidePath: false, hl: [] }); S.cur = {}; S.cur[pi] = i; draw(); if (Pt.from) document.dispatchEvent(new CustomEvent('sxgo', { detail: { id: Pt.from, k: i, quiet: true } })); },
          text: () => { const inside = PL.every(P => ok(P, p)), prevV = i ? cv(Pt.pts[i - 1]) : null;
            return `Базисное решение таблицы — точка (${p.map(fmtN).join('; ')}), ${cfg.fname || 'f'} = ${fmtN(cv(p))}. ${inside ? 'Это вершина многогранника.' : 'Точка <b>вне</b> многогранника: искусственные переменные ещё не нулевые, этап 1 ведёт к допустимой вершине.'}${prevV != null && Math.abs(cv(p) - prevV) > 1e-12 ? ` Цель ${cv(p) > prevV ? 'выросла' : 'уменьшилась'} — шаг по ребру к соседней вершине.` : prevV != null ? ' Точка та же, сменился только базис (вырожденный шаг).' : ''}`; } })));
        if (opt) {
          const act0 = optIdx >= 0 ? act[optIdx].filter(t => !ALL[t].box) : [];
          st.push({ title: 'Плоскость уровня', run: () => { Object.assign(S, pre, { hidePath: true }); anim3(lpStart, cv(opt)); },
            text: `Розовая плоскость — все точки с одинаковым значением цели. Сдвигаем её ${cfg.sense === 'max' ? 'в сторону роста' : 'в сторону убывания'} ${cfg.fname || 'f'}, пока у неё есть общие точки с многогранником. Последняя точка касания — оптимум (как линия уровня на плоскости, только в пространстве).` });
          st.push({ title: 'Оптимальная вершина', run: () => { Object.assign(S, pre, { hideOpt: false, hidePath: false, lp: cv(opt), hl: act0 }); draw(); },
            text: `Плоскость уровня касается многогранника в точке <b>x* = (${opt.map(fmtN).join('; ')}), ${cfg.fname || 'f'}* = ${fmtN(cv(opt))}</b>. В ней сходятся выделенные грани: ${act0.map(t => ALL[t].axis ? ALL[t].html : ALL[t].name).join(', ')}. Эти ограничения выполняются как равенства, остальные — с запасом; на этом и основаны условия дополняющей нежёсткости (задание 4).` });
        } else st.push({ title: 'Оптимума нет', run: () => { Object.assign(S, pre, { hidePath: false }); draw(); }, text: 'Многогранник неограничен в направлении улучшения цели: плоскость уровня можно сдвигать бесконечно.' });
        return st;
      };
      runGuide(root, cfg.purpose, build, () => { Object.assign(S, { hl: [], lp: null, bigV: false, hidePath: false, hideOpt: false }); S.cur = {}; draw(); });
      draw();
    });
    const svg = `<svg viewBox="0 0 ${W} ${H}" class="plot p3\" id="${id}"><defs><marker id="a3${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#6b6f7c"/></marker></defs><rect x="0" y="0" width="${W}" height="${H}" class="pbg"/><g class="layer"></g></svg>`;
    return `<div class="plotwrap" id="${id}w">${cfg.purpose ? guideBar(cfg.purpose) : ''}<div class="btnrow ptool"><span class="seg"><button class="btn zout3">−</button><button class="btn zin3">+</button><button class="btn r3home">Исходный вид</button></span>
      <span class="seg"><button class="btn r3view" data-v="0,0" title="смотреть вдоль x₂">x₁x₃</button><button class="btn r3view" data-v="-1.5708,0" title="смотреть вдоль x₁">x₂x₃</button><button class="btn r3view" data-v="0,1.5708" title="смотреть сверху">x₁x₂</button></span>
      <button class="btn r3spin">↻ Вращать</button><span class="kbd">тяните мышью — поворот · Ctrl + колесо — масштаб</span></div>
      <div class="plotgrid"><div>${svg}<div class="btnrow lvlrow"><button class="btn primary lp3btn">▶ Сдвигать плоскость уровня</button><label class="kbd">плоскость уровня <input type="range" class="lp3range"></label><span class="lp3info kbd"></span></div></div><div>
        ${V.length ? `<p class="kbd">Вершин: ${V.length}. Каждая вершина — базисное решение; симплекс-метод переходит по рёбрам многогранника.${cut ? ' Область неограничена — на рисунке обрезана серой рамкой.' : ''}</p>` : '<div class="note bad">Допустимая область пуста.</div>'}
        <div class="p3info note">Наведите на грань — покажем, какому ограничению она соответствует.</div>
        <div class="legend col"><span style="--c:#c9d1ff">грани допустимой области</span><span style="--c:#e8456b">вершины, которые проходит симплекс-метод (номер = номер таблицы)</span><span style="--c:#e8456b">● оптимальная вершина</span><span style="--c:#f7a8bb">плоскость уровня c·x = const</span></div></div></div></div>`;
  }

  return { originFor, rememberTables, fq, approx, par, xv, tv, yv, vname, zlab, sg, lin, vec, sec, table, basicSol, stepText, stepper, allTables, plot, plot3d, hooks, R_last, spark, offAll, TR, bridge };
})();

