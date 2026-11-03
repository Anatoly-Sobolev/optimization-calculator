/* Геометрические сцены: допустимая область с линией уровня, целочисленная решётка, отсечение Гомори.
 * Рисуются средствами SVG; узлы управляются мышью, касанием и клавиатурой (стрелки). */
(() => {
  'use strict';
  const { esc, num, ru } = LU, S = LSCENE;
  const NS = 'http://www.w3.org/2000/svg';
  const W = 380, H = 310, M = 38;

  /* Многоугольник допустимой области по вершинам, посчитанным существующим ALG.graph. */
  function geometry(P, graphRes) {
    const g = graphRes || ALG.graph(P);
    const V = g.verts.map(v => ({ x: num(v.p[0]), y: num(v.p[1]), f: num(v.f) }));
    if (!V.length) return null;
    const cx = V.reduce((s, v) => s + v.x, 0) / V.length, cy = V.reduce((s, v) => s + v.y, 0) / V.length;
    const poly = V.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
    let mx = Math.max(...V.map(v => v.x)), my = Math.max(...V.map(v => v.y));
    P.rows.forEach(r => { const a1 = num(r.a[0]), a2 = num(r.a[1]), b = num(r.b); if (a1 > 0 && b / a1 > 0) mx = Math.max(mx, Math.min(b / a1, mx * 1.6 || b / a1)); if (a2 > 0 && b / a2 > 0) my = Math.max(my, Math.min(b / a2, my * 1.6 || b / a2)); });
    mx = (mx || 4) * 1.25; my = (my || 4) * 1.25;
    return { g, V, poly, mx, my, sx: (W - 2 * M) / mx, sy: (H - 2 * M) / my };
  }
  const px = (G, x) => M + x * G.sx, py = (G, y) => H - M - y * G.sy;
  function ticks(G) {
    const stepOf = m => { const raw = m / 5, p = 10 ** Math.floor(Math.log10(raw)); const k = raw / p; return (k < 1.5 ? 1 : k < 3.5 ? 2 : k < 7.5 ? 5 : 10) * p; };
    const tx = stepOf(G.mx), ty = stepOf(G.my); let s = '';
    for (let v = 0; v <= G.mx; v += tx) s += `<line class="geo-grid" x1="${px(G, v)}" y1="${M}" x2="${px(G, v)}" y2="${H - M}"/><text class="geo-tick" x="${px(G, v)}" y="${H - M + 14}" text-anchor="middle">${ru(v)}</text>`;
    for (let v = 0; v <= G.my; v += ty) s += `<line class="geo-grid" x1="${M}" y1="${py(G, v)}" x2="${W - M}" y2="${py(G, v)}"/><text class="geo-tick" x="${M - 6}" y="${py(G, v) + 4}" text-anchor="end">${ru(v)}</text>`;
    return s;
  }
  function lineSeg(G, a1, a2, b) {
    const pts = [];
    if (a2 !== 0) { [0, G.mx].forEach(x => { const y = (b - a1 * x) / a2; if (y >= -1e-9 && y <= G.my + 1e-9) pts.push([x, y]); }); }
    if (a1 !== 0) { [0, G.my].forEach(y => { const x = (b - a2 * y) / a1; if (x >= -1e-9 && x <= G.mx + 1e-9) pts.push([x, y]); }); }
    const u = pts.filter((p, i) => pts.findIndex(q => Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6) === i);
    return u.length >= 2 ? [u[0], u[1]] : null;
  }
  const svgOpen = (G, label) => `<svg class="geo" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" focusable="false"><defs><pattern id="geo-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="geo-hatch-line"/></pattern><marker id="geo-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" class="geo-arrow"/></marker></defs>${ticks(G)}<line class="geo-axis" x1="${M}" y1="${H - M}" x2="${W - M + 8}" y2="${H - M}" marker-end="url(#geo-arrow)"/><line class="geo-axis" x1="${M}" y1="${H - M}" x2="${M}" y2="${M - 8}" marker-end="url(#geo-arrow)"/><text class="geo-lab" x="${W - M + 4}" y="${H - M - 6}">x₁</text><text class="geo-lab" x="${M + 6}" y="${M - 4}">x₂</text>`;
  const polyPath = G => G.poly.map((v, i) => `${i ? 'L' : 'M'}${px(G, v.x)} ${py(G, v.y)}`).join('') + 'Z';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Область, линия уровня и перетаскиваемая точка ---------- */
  S.define('region', {
    goal: 'Увидеть, что допустимые планы образуют область, а цель — линия, которую можно сдвигать.',
    action: 'Сдвигайте линию уровня ползунком (стрелки на клавиатуре тоже подходят), пока она ещё касается области. Точку можно перетаскивать и проверять на допустимость.',
    takeaway: 'Оптимум — последняя точка, в которой линия уровня ещё касается области. Дальше улучшать цель можно только нарушив ограничение.',
    available: inst => { const d = inst.data; return !!(d && d.P && d.P.c.length === 2 && d.status === 'optimal' && !d.P.c.every(c => c.isZero())); },
    render: (inst, api) => {
      const d = inst.data, G = inst._G = geometry(d.P, d.rec.graph);
      if (!G) throw new Error('нет области');
      const fs = G.V.map(v => v.f), lo = Math.min(...fs), hi = Math.max(...fs), span = (hi - lo) || Math.max(1, Math.abs(hi));
      inst._range = { min: lo - span * 0.35, max: hi + span * 0.35, span, best: d.P.sense === 'max' ? hi : lo };
      const R = inst._range;
      const lines = d.P.rows.map((r, i) => { const s = lineSeg(G, num(r.a[0]), num(r.a[1]), num(r.b)); return s ? `<g><line class="geo-line" x1="${px(G, s[0][0])}" y1="${py(G, s[0][1])}" x2="${px(G, s[1][0])}" y2="${py(G, s[1][1])}"/><text class="geo-lab" x="${px(G, s[1][0]) + 4}" y="${py(G, s[1][1]) - 4}">(${i + 1})</text></g>` : ''; }).join('');
      return `${svgOpen(G, 'Допустимая область, линия уровня цели и точка')}<path class="geo-area" d="${polyPath(G)}" fill="url(#geo-hatch)"/><path class="geo-area-edge" d="${polyPath(G)}"/>${lines}<line class="geo-level" x1="0" y1="0" x2="0" y2="0"/><g class="geo-pt" tabindex="0" role="slider" aria-label="Точка x, стрелки двигают её" aria-valuetext=""><circle class="geo-pt-hit" r="18"/><circle class="geo-pt-dot" r="6"/></g></svg><label class="sc-slider geo-t"><span>Значение цели</span><input type="range" min="${R.min}" max="${R.max}" step="${R.span / 100}" value="${R.min}" aria-label="Значение функции цели, линия уровня"><output></output></label><p class="geo-read" aria-live="polite"></p>`;
    },
    bind: (body, inst, api) => {
      const d = inst.data, P = d.P, G = inst._G, R = inst._range, svg = body.querySelector('svg'), level = svg.querySelector('.geo-level'), pt = svg.querySelector('.geo-pt'), t = body.querySelector('.geo-t input'), out = body.querySelector('.geo-t output'), read = body.querySelector('.geo-read');
      const c1 = num(P.c[0]), c2 = num(P.c[1]);
      let p = { x: G.mx * 0.15, y: G.my * 0.15 }, drawn = false;
      const feasTxt = () => {
        const X = [Q.parse(String(LU.round(p.x))), Q.parse(String(LU.round(p.y)))], chk = ALG.check(P, X), bad = chk.map((c, i) => i).filter(i => !chk[i].ok);
        return bad.length ? `Точка (${ru(p.x)}; ${ru(p.y)}) недопустима: нарушено ${bad.map(i => '(' + (i + 1) + ')').join(', ')}.` : `Точка (${ru(p.x)}; ${ru(p.y)}) допустима, цель ${ru(c1 * p.x + c2 * p.y + num(P.c0 || Z()))}.`;
      };
      const drawPt = () => { pt.setAttribute('transform', `translate(${px(G, p.x)} ${py(G, p.y)})`); pt.setAttribute('aria-valuetext', feasTxt()); };
      const drawLevel = () => {
        const tv = +t.value - num(P.c0 || Z()), seg = lineSeg(G, c1, c2, tv);
        if (seg) { level.setAttribute('x1', px(G, seg[0][0])); level.setAttribute('y1', py(G, seg[0][1])); level.setAttribute('x2', px(G, seg[1][0])); level.setAttribute('y2', py(G, seg[1][1])); level.style.display = ''; } else level.style.display = 'none';
        out.textContent = ru(+t.value);
        const lo = Math.min(...G.V.map(v => v.f)), hi = Math.max(...G.V.map(v => v.f)), tol = R.span * 0.012, touches = +t.value >= lo - tol && +t.value <= hi + tol;
        read.textContent = touches ? 'Линия пересекает область: такие значения цели допустимы.' : 'Линия вышла за область: такого значения цели допустимыми планами не достичь.';
        if (touches && Math.abs(+t.value - R.best) <= R.span * 0.03) api.pass(`<strong>Линия касается области в последней точке.</strong> Здесь цель ${ru(R.best)}: лучшее значение на допустимых планах.`);
        else if (!api.solved) api.say(touches ? 'Двигайте линию в сторону улучшения цели, пока она ещё касается области.' : 'Вернитесь назад: улучшать цель дальше нельзя.');
      };
      const move = e => { const r = svg.getBoundingClientRect(), k = W / r.width; p = { x: clamp((((e.clientX - r.left) * k) - M) / G.sx, 0, G.mx), y: clamp((H - M - ((e.clientY - r.top) * k)) / G.sy, 0, G.my) }; drawPt(); read.textContent = feasTxt(); };
      pt.addEventListener('pointerdown', e => { e.preventDefault(); pt.setPointerCapture(e.pointerId); pt.classList.add('drag'); });
      pt.addEventListener('pointermove', e => { if (pt.hasPointerCapture(e.pointerId)) move(e); });
      pt.addEventListener('pointerup', e => { pt.releasePointerCapture(e.pointerId); pt.classList.remove('drag'); });
      pt.addEventListener('keydown', e => {
        const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key]; if (!k) return; e.preventDefault();
        p = { x: clamp(p.x + k[0] * G.mx / 40, 0, G.mx), y: clamp(p.y + k[1] * G.my / 40, 0, G.my) }; drawPt(); read.textContent = feasTxt();
      });
      t.addEventListener('input', drawLevel); drawPt(); drawLevel();
    }
  });

  /* ---------- Целые точки и дробный оптимум релаксации ---------- */
  S.define('lattice', {
    goal: 'Понять, почему округление дробного оптимума не решает целочисленную задачу.',
    action: 'Выберите каждую ближайшую целую точку и посмотрите, допустима ли она и какая у неё цель.',
    takeaway: 'Ближайшая целая точка может нарушать ограничение или давать худшую цель. Поэтому нужны систематические отсечения, а не округление.',
    available: inst => { const d = inst.data; return !!(d && d.P && d.lpX && d.lpX.length === d.P.c.length && d.P.c.length <= 4); },
    render: (inst, api) => {
      const d = inst.data, P = d.P, X = d.lpX, cands = inst._cands = [];
      const opts = X.map(v => { const a = v.toNumber(), fl = Math.floor(a); return Number.isInteger(a) ? [fl] : [fl, fl + 1]; });
      const rec = (j, cur) => { if (j === opts.length) { cands.push(cur.slice()); return; } opts[j].forEach(v => { cur.push(v); rec(j + 1, cur); cur.pop(); }); };
      rec(0, []);
      cands.splice(8);
      let svg = '';
      if (P.c.length === 2) {
        const G = inst._G = geometry(P), pts = [];
        if (G) {
          for (let x = 0; x <= G.mx; x++) for (let y = 0; y <= G.my; y++) if (ALG.check(P, [Q.of(x), Q.of(y)]).every(c => c.ok)) pts.push([x, y]);
          svg = `${svgOpen(G, 'Допустимая область, целые точки и дробный оптимум')}<path class="geo-area" d="${polyPath(G)}" fill="url(#geo-hatch)"/><path class="geo-area-edge" d="${polyPath(G)}"/>${pts.slice(0, 400).map(p => `<circle class="geo-int" cx="${px(G, p[0])}" cy="${py(G, p[1])}" r="2.6"/>`).join('')}<path class="geo-opt" d="M${px(G, X[0].toNumber())} ${py(G, X[1].toNumber()) - 8}l7 8l-7 8l-7 -8z"><title>Дробный оптимум релаксации</title></path><circle class="geo-sel" r="9" cx="-50" cy="-50"/></svg><p class="sc-legend">● целые допустимые точки · ◆ дробный оптимум релаксации · ◯ выбранная целая точка</p>`;
        }
      }
      return `${svg}<p class="sc-model">Оптимум без требования целых: x = ${esc(LU.vec(X))}</p><div class="sc-cands" role="group" aria-label="Ближайшие целые точки">${cands.map((c, i) => `<button type="button" class="btn sc-cand" data-i="${i}">(${c.join('; ')})</button>`).join('')}</div><p class="sc-count">Проверено точек: <span class="sc-seen">0</span> из ${cands.length}</p>`;
    },
    bind: (body, inst, api) => {
      const P = inst.data.P, G = inst._G, cands = inst._cands, seen = new Set(), cnt = body.querySelector('.sc-seen'), sel = body.querySelector('.geo-sel');
      body.querySelectorAll('.sc-cand').forEach(b => b.addEventListener('click', () => {
        const c = cands[+b.dataset.i], X = c.map(v => Q.of(v)), chk = ALG.check(P, X), ok = chk.every(r => r.ok), bad = chk.map((r, i) => i).filter(i => !chk[i].ok);
        seen.add(+b.dataset.i); cnt.textContent = seen.size; b.classList.add('seen');
        if (sel && G && c.length === 2) { sel.setAttribute('cx', px(G, c[0])); sel.setAttribute('cy', py(G, c[1])); }
        const val = LU.f(S.objValue(P, X));
        api.say(ok ? `(${c.join('; ')}) допустима, цель ${val}. Это лишь одна из целых точек: лучшая ли она — нужно доказывать.` : `(${c.join('; ')}) недопустима: нарушено ${bad.map(i => '(' + (i + 1) + ')').join(', ')}.`, ok ? 'ok' : 'bad');
        if (seen.size === cands.length) api.pass('<strong>Все ближайшие целые точки проверены.</strong> Округление не даёт гарантий.');
      }));
    }
  });

  /* ---------- Отсечение Гомори: левая часть против требуемого порога ---------- */
  S.define('cutbar', {
    goal: 'Увидеть, как отсечение «выгоняет» дробную вершину.',
    action: 'Сначала предскажите, выполняется ли отсечение в текущей вершине; затем посмотрите на шкалу.',
    takeaway: 'Отсечение требует, чтобы левая часть была не меньше дробной части b. В текущей вершине она равна 0, поэтому вершина исключается, а целые допустимые точки остаются.',
    available: inst => !!(inst.data && inst.data.cut),
    render: (inst, api) => {
      const c = inst.data.cut, fb = LU.f(c.fb), spec = inst._spec = S.choiceSpec('Выполняется ли это отсечение в текущей (дробной) вершине, где все небазисные переменные равны 0?', 'Нет: левая часть равна 0, а требуется не меньше ' + LU.txt(c.fb), [['Да: вершина остаётся допустимой', 'Если бы вершина оставалась допустимой, отсечение ничего бы не отсекло.'], ['Нельзя определить без пересчёта таблицы', 'Небазисные равны 0, значит левая часть равна 0.']], 'Левая часть складывается из небазисных переменных, равных 0; дробная часть b положительна — условие нарушено, вершина отсекается.', {
        before: `<p class="sc-model">Отсечение: ${c.parts.map(t => `${LU.f(t.f)}·${esc(LU.plain(R.vname(inst.data.cutVars, t.j)))}`).join(' + ')} ≥ ${fb}</p>`,
        reveal: `<div class="sc-cutbar" role="img" aria-label="Шкала: левая часть 0, порог ${esc(LU.txt(c.fb))}"><div class="sc-cut-track"><span class="sc-cut-lhs" style="left:0">0</span><span class="sc-cut-need" style="left:${Math.min(96, Math.max(8, c.fb.toNumber() * 100))}%">≥ ${fb}</span></div><p>Левая часть в текущей вершине: 0. Требуемый порог: ${fb}. Разрыв устраняет пересчёт двойственным симплексом.</p></div>`
      });
      return S.choiceHtml(spec, api.id);
    },
    bind: (body, inst, api) => S.bindChoice(body, inst._spec, api)
  });
})();
