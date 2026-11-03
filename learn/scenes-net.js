/* Сцены для транспортной задачи, сетевого планирования, матричных игр и двойственности.
 * Все числа берутся из результатов существующих решателей (ALGT, ALGN, ALGG, ALGX); сцена только показывает и сверяет. */
(() => {
  'use strict';
  const { esc, num, f, txt, sub, order } = LU, S = LSCENE;
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* Последовательные раунды выбора внутри одной сцены (каждый раунд — отдельный вопрос). */
  function rounds(body, api, specs, intro) {
    const stage = body.querySelector('.sc-stage');
    let k = 0;
    const show = () => {
      const spec = specs[k], last = k === specs.length - 1;
      stage.innerHTML = (intro ? `<p class="sc-count">Вопрос ${k + 1} из ${specs.length}</p>` : '') + S.choiceHtml(spec, api.id + 'r' + k);
      const sub = { ...api, id: api.id, single: false, say: (m, c) => api.say(m, c), fail: (m, kind) => api.fail(m, kind), pass: m => (last ? api.pass(m) : api.say(m, 'ok')) };
      S.bindChoice(stage, spec, sub, () => {
        if (!last) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary sc-next'; b.textContent = 'Следующий вопрос'; b.addEventListener('click', () => { k++; show(); stage.querySelector('.sc-opt').focus(); }); stage.append(b); }
      });
    };
    show();
  }

  /* ---------- Транспортная сеть ---------- */
  /* В таблицах решателя свободные клетки могут быть пустыми: приводим их к нулю. */
  const nx = X => X.map(row => row.map(v => v == null ? Z() : Q.of(v)));
  const planOf = r => { const X = r.X || (r.iters && r.iters.length ? r.iters[r.iters.length - 1].X : null); return X ? nx(X) : null; };
  const nameA = (P, i) => i < (P.m0 ?? P.m) ? `A${i + 1}` : 'A (фикт.)', nameB = (P, j) => j < (P.n0 ?? P.n) ? `B${j + 1}` : 'B (фикт.)';
  const costOf = (P, X) => X.reduce((s, row, i) => row.reduce((t, v, j) => t.add(P.c[i][j].mul(v)), s), Z());
  const sumRow = (X, i) => X[i].reduce((s, v) => s.add(v), Z()), sumCol = (X, j) => X.reduce((s, row) => s.add(row[j]), Z());
  function flowSvg(P, X, label) {
    const m = P.m, n = P.n, W = 380, H = Math.max(m, n) * 52 + 24, mx = Math.max(1, ...X.flat().map(v => num(v)));
    const ya = i => 34 + i * ((H - 68) / Math.max(m - 1, 1)), yb = j => 34 + j * ((H - 68) / Math.max(n - 1, 1));
    let s = `<svg class="geo net" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" focusable="false">`;
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) { const v = num(X[i][j]); if (v <= 0) continue; const x1 = 96, x2 = W - 96, y1 = ya(i), y2 = yb(j), t = 0.32 + 0.36 * ((j + 0.5) / n); s += `<line class="flow-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${1.5 + 6 * v / mx}"/><text class="flow-val" x="${x1 + (x2 - x1) * t}" y="${y1 + (y2 - y1) * t - 5}" text-anchor="middle">${esc(txt(X[i][j]))}</text>`; }
    for (let i = 0; i < m; i++) s += `<g class="flow-node"><rect x="6" y="${ya(i) - 15}" width="90" height="30" rx="6"/><text x="51" y="${ya(i) + 4}" text-anchor="middle">${esc(nameA(P, i))}: ${esc(txt(P.a[i]))}</text></g>`;
    for (let j = 0; j < n; j++) s += `<g class="flow-node"><rect x="${W - 96}" y="${yb(j) - 15}" width="90" height="30" rx="6"/><text x="${W - 51}" y="${yb(j) + 4}" text-anchor="middle">${esc(nameB(P, j))}: ${esc(txt(P.b[j]))}</text></g>`;
    return s + '</svg>';
  }
  const planTable = (P, X, withSums) => `<div class="learn-scroll"><table class="sx"><thead><tr><th>План</th>${P.b.map((_, j) => `<th>${esc(nameB(P, j))}</th>`).join('')}<th>запас</th></tr></thead><tbody>${X.map((row, i) => `<tr><th scope="row">${esc(nameA(P, i))}</th>${row.map(v => `<td>${f(v)}</td>`).join('')}<td>${f(P.a[i])}</td></tr>`).join('')}<tr><th scope="row">спрос</th>${P.b.map(b => `<td>${f(b)}</td>`).join('')}<td></td></tr></tbody></table></div>`;
  const flowReady = inst => { const r = inst.data && inst.data.T; return !!(r && r.P && r.P.status !== 'infeasible' && planOf(r) && r.P.m * r.P.n <= 36); };

  S.define('flows', {
    goal: inst => ({ build: 'Почувствовать транспортную задачу как перевозку груза между пунктами.', violation: 'Научиться видеть, когда план перевозок нарушает запас или спрос.', improve: 'Понять, что метод шаг за шагом снижает стоимость перевозок.' }[inst.spec.task]),
    action: inst => ({ build: 'Введите, сколько груза везти по каждому маршруту, чтобы не превысить запасы и покрыть спрос.', violation: 'Сравните перевозки с запасами и спросом и найдите пункт, где условие нарушено.', improve: 'Перед каждым шагом предскажите, как изменится стоимость плана.' }[inst.spec.task]),
    takeaway: inst => ({ build: 'Допустимый план соблюдает запасы поставщиков и спрос потребителей. Цена плана — сумма «тариф × объём»; допустимых планов много, лучший ищет метод.', violation: 'Каждое условие относится к своему пункту: отгрузка не больше запаса, поставка не меньше спроса.', improve: 'Метод потенциалов строит цепочку допустимых планов; стоимость не растёт, пока остаются отрицательные оценки.' }[inst.spec.task]),
    available: flowReady,
    render: (inst, api) => {
      const r = inst.data.T, P = r.P, X = planOf(r), task = inst.spec.task;
      if (task === 'build') return `<p class="sc-model">Тарифы c: за единицу груза по маршруту.</p><div class="learn-scroll"><table class="sx flow-in"><thead><tr><th></th>${P.b.map((b, j) => `<th>${esc(nameB(P, j))}<br><small>спрос ${f(b)}</small></th>`).join('')}<th>отправлено / запас</th></tr></thead><tbody>${P.a.map((a, i) => `<tr><th scope="row">${esc(nameA(P, i))}</th>${P.b.map((_, j) => `<td><label><span class="sc-tariff">тариф ${f(P.c[i][j])}</span><input type="number" min="0" step="1" value="0" inputmode="numeric" data-i="${i}" data-j="${j}" aria-label="Перевозка ${esc(nameA(P, i))} → ${esc(nameB(P, j))}"></label></td>`).join('')}<td class="flow-rs" data-i="${i}"></td></tr>`).join('')}<tr><th scope="row">получено</th>${P.b.map((_, j) => `<td class="flow-cs" data-j="${j}"></td>`).join('')}<td class="flow-cost"></td></tr></tbody></table></div><div class="flow-svg"></div>`;
      if (task === 'violation') return `<div class="sc-stage"></div>`;
      const its = r.iters.filter(s => s.enter); inst._its = r.iters;
      return `<div class="sc-stage"></div>`;
    },
    bind: (body, inst, api) => {
      const r = inst.data.T, P = r.P, X = planOf(r), task = inst.spec.task;
      if (task === 'build') {
        const ins = [...body.querySelectorAll('input')], svg = body.querySelector('.flow-svg');
        const read = () => { const M = P.a.map(() => P.b.map(() => Z())); ins.forEach(i => { let v; try { v = Q.parse(i.value || '0'); } catch (_) { v = Z(); } if (v.s < 0) v = Z(); M[+i.dataset.i][+i.dataset.j] = v; }); return M; };
        const upd = () => {
          const M = read(); let ok = true;
          P.a.forEach((a, i) => { const s = sumRow(M, i), good = s.le(a); ok = ok && good; body.querySelector(`.flow-rs[data-i="${i}"]`).textContent = `${txt(s)} / ${txt(a)} ${good ? '✓' : '✗'}`; });
          P.b.forEach((b, j) => { const s = sumCol(M, j), good = s.ge(b); ok = ok && good; body.querySelector(`.flow-cs[data-j="${j}"]`).textContent = `${txt(s)} / ${txt(b)} ${good ? '✓' : '✗'}`; });
          const cost = costOf(P, M); body.querySelector('.flow-cost').textContent = 'стоимость ' + txt(cost);
          svg.innerHTML = flowSvg(P, M, 'Перевозки между поставщиками и потребителями');
          const total = M.flat().some(v => v.s > 0);
          if (ok && total) api.pass(`<strong>Ваш план допустим.</strong> Стоимость ${LU.f(cost)}; решатель нашёл план стоимостью ${LU.f(r.cost)}${cost.gt(r.cost) ? ': есть план дешевле' : cost.eq(r.cost) ? ': вы нашли такой же по цене' : ''}.`);
          else api.say(ok ? 'Введите перевозки.' : 'Пока условия нарушены (метки ✗): не превышайте запасы и покройте спрос.');
        };
        ins.forEach(i => i.addEventListener('input', upd)); upd();
        return;
      }
      const stage = body.querySelector('.sc-stage');
      if (task === 'violation') {
        const specs = [];
        const mk = (kind, i, j, name, N) => {
          const Y = X.map(row => row.slice()); Y[i][j] = Y[i][j].add(kind === 'sup' ? ONE() : ONE().neg());
          const names = (kind === 'sup' ? P.a : P.b).map((_, k) => (kind === 'sup' ? nameA : nameB)(P, k)), right = names[kind === 'sup' ? i : j];
          specs.push(S.choiceSpec(kind === 'sup' ? 'В этом плане одна перевозка изменена. Какой пункт отправления превысил свой запас?' : 'В этом плане одна перевозка изменена. Чей спрос теперь не покрыт?', right, names.filter(x => x !== right), kind === 'sup' ? `Отправлено из ${right}: ${LU.txt(sumRow(Y, i))}, запас ${LU.txt(P.a[i])}: условие «отгрузка ≤ запас» нарушено.` : `Получено в ${right}: ${LU.txt(sumCol(Y, j))}, спрос ${LU.txt(P.b[j])}: условие «поставка ≥ спрос» нарушено.`, { before: planTable(P, Y) + flowSvg(P, Y, 'Изменённый план перевозок'), kind: 'feasibility' }));
        };
        let fi = -1, fj = -1;
        for (let i = 0; i < P.m && fi < 0; i++) if (sumRow(X, i).eq(P.a[i])) { fi = i; fj = 0; }
        if (fi >= 0) mk('sup', fi, fj);
        for (let j = 0; j < P.n; j++) { const i = X.findIndex(row => row[j].s > 0); if (i >= 0 && sumCol(X, j).eq(P.b[j])) { mk('dem', i, j); break; } }
        if (!specs.length) { stage.innerHTML = '<p class="note warn">Для этого плана нет «жёстких» пунктов; сцена пропущена.</p>'; api.pass('Сцена пропущена.'); return; }
        rounds(body, api, specs, true);
        return;
      }
      /* improve */
      const its = r.iters, steps = its.map((s, k) => k).filter(k => its[k].enter && its[k + 1]).slice(0, 3);
      if (!steps.length) { stage.innerHTML = '<p class="note">Начальный план уже оптимален: улучшений нет.</p>'; api.pass('Сцена пропущена.'); return; }
      const specs = steps.map((k, n) => {
        const c0 = costOf(P, nx(its[k].X)), c1 = costOf(P, nx(its[k + 1].X)), d = c1.sub(c0), kind = d.s < 0 ? 'down' : d.s > 0 ? 'up' : 'eq';
        const lab = { down: 'Уменьшится', eq: 'Не изменится', up: 'Увеличится' };
        return S.choiceSpec(`Шаг ${n + 1}: план перераспределяют по циклу, вводя клетку A${its[k].enter[0] + 1}B${its[k].enter[1] + 1}. Как изменится стоимость ${LU.txt(c0)}?`, lab[kind], Object.keys(lab).filter(x => x !== kind).map(x => lab[x]), `Стоимость была ${LU.txt(c0)}, стала ${LU.txt(c1)}${kind === 'eq' ? ' (вырожденный шаг: перевозка по циклу равна нулю)' : ''}. Оценка Δ = ${LU.txt(its[k].delta[its[k].enter[0]][its[k].enter[1]])}.`, { before: flowSvg(P, nx(its[k].X), 'План перед шагом') + `<p>Стоимость плана: <strong>${LU.txt(c0)}</strong></p>`, reveal: flowSvg(P, nx(its[k + 1].X), 'План после шага') + `<p>Стоимость: <strong>${LU.txt(c1)}</strong></p>`, kind: 'strategy' });
      });
      rounds(body, api, specs, true);
    }
  });

  /* ---------- Сеть работ ---------- */
  const netReady = inst => { const r = inst.data && inst.data.N; return !!(r && r.status === 'ok' && r.events && r.arcInfo && r.arcs.length <= 14); };
  /* Раскладка: x — ранний срок события; дорожка (y) выбирается так, чтобы события не накладывались,
   * а дуга не проходила по одной линии через другое событие. */
  function netGeom(r) {
    const W = 380, ev = r.events, T = num(r.T) || 1, tp = ev.map((e, i) => num(r.tp[i]));
    const x = i => 34 + tp[i] / T * (W - 68), lane = new Array(ev.length).fill(-1);
    const orderIdx = ev.map((e, i) => i).sort((a, b) => tp[a] - tp[b] || a - b), MAXL = 6;
    orderIdx.forEach(i => {
      const preds = r.arcs.filter(a => a.j === ev[i]).map(a => ev.indexOf(a.i)).filter(k => lane[k] >= 0);
      const pref = preds.length ? Math.round(preds.reduce((s, k) => s + lane[k], 0) / preds.length) : 0;
      const cand = [...Array(MAXL).keys()].sort((a, b) => Math.abs(a - pref) - Math.abs(b - pref) || a - b);
      const clash = L => ev.some((e, k) => k !== i && lane[k] === L && Math.abs(x(k) - x(i)) < 56) || preds.some(k => ev.some((e, c) => c !== i && c !== k && lane[c] === lane[k] && lane[k] === L && Math.min(x(k), x(i)) < x(c) && x(c) < Math.max(x(k), x(i))));
      lane[i] = cand.find(L => !clash(L)) ?? cand[0];
    });
    const used = [...new Set(lane)].sort((a, b) => a - b), L = used.length, H = 56 + L * 62;
    const pos = ev.map((e, i) => ({ e, x: x(i), y: 36 + used.indexOf(lane[i]) * 62 }));
    return { W, H, pos, at: id => pos[ev.indexOf(id)] };
  }
  S.define('network', {
    goal: inst => ({ wait: 'Понять, что событие проекта наступает только после завершения всех входящих работ.', slack: 'Научиться читать резерв времени у работ.', critical: 'Понять, какие работы определяют длительность проекта.' }[inst.spec.task]),
    action: inst => ({ wait: 'Нажимайте на события и найдите то, которое ждёт несколько работ сразу.', slack: 'Нажимайте на работы (дуги) и найдите работу с самым большим запасом времени.', critical: 'Отметьте работы, которые нельзя задерживать (кнопки-дуги), и нажмите «Проверить путь».' }[inst.spec.task]),
    takeaway: inst => ({ wait: 'Событие наступает не раньше, чем завершатся все входящие работы: в расчёте берётся максимум, а не минимум.', slack: 'Полный резерв — на сколько работу можно задержать без задержки проекта; нулевой резерв означает критическую работу.', critical: 'Критический путь — цепочка работ с нулевым резервом. Его длина равна длительности проекта.' }[inst.spec.task]),
    available: netReady,
    render: (inst, api) => {
      const r = inst.data.N, G = inst._G = netGeom(r), task = inst.spec.task;
      let s = `<svg class="geo net" viewBox="0 0 ${G.W} ${G.H}" role="group" aria-label="Сеть работ: события и работы" focusable="false"><defs><marker id="net-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" class="geo-arrow"/></marker></defs>`;
      r.arcInfo.forEach((a, k) => {
        const p = G.at(a.i), q = G.at(a.j), dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
        const x1 = p.x + ux * 16, y1 = p.y + uy * 16, x2 = q.x - ux * 18, y2 = q.y - uy * 18;
        s += `<g class="net-arc" data-k="${k}" tabindex="0" role="button" aria-pressed="false" aria-label="Работа ${a.i} → ${a.j}, длительность ${esc(txt(a.d))}"><line class="net-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="net-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#net-arr)"/><text class="net-d" x="${(x1 + x2) / 2 + uy * 10}" y="${(y1 + y2) / 2 - ux * 10 + 4}" text-anchor="middle">${esc(txt(a.d))}</text></g>`;
      });
      G.pos.forEach((p, i) => { s += `<g class="net-ev" data-e="${p.e}" tabindex="0" role="button" aria-label="Событие ${p.e}"><circle cx="${p.x}" cy="${p.y}" r="15"/><text x="${p.x}" y="${p.y + 4}" text-anchor="middle">${p.e}</text><text class="net-times" x="${p.x}" y="${p.y + 30}" text-anchor="middle" hidden></text></g>`; });
      s += '</svg>';
      return s + `<div class="net-info" aria-live="polite"></div>${task === 'critical' ? '<div class="btnrow"><button type="button" class="btn primary net-check">Проверить путь</button></div>' : ''}`;
    },
    bind: (body, inst, api) => {
      const r = inst.data.N, task = inst.spec.task, info = body.querySelector('.net-info'), arcs = [...body.querySelectorAll('.net-arc')], evs = [...body.querySelectorAll('.net-ev')];
      const indeg = e => r.arcs.filter(a => a.j === e).length;
      const maxIn = Math.max(...r.events.map(indeg)), maxSlack = Math.max(...r.arcInfo.map(a => num(a.full)));
      if (task === 'wait') {
        evs.forEach(g => LU.activate(g, () => {
          const e = +g.dataset.e, inc = r.arcs.filter(a => a.j === e);
          evs.forEach(x => x.classList.remove('sel')); g.classList.add('sel');
          info.innerHTML = inc.length ? `Событие ${e} ждёт ${inc.length === 1 ? 'работу' : 'работы'}: ${inc.map(a => `${a.i}→${e} (${esc(txt(a.d))})`).join('; ')}.` : `В событие ${e} ничего не входит: оно начальное.`;
          if (inc.length === maxIn && maxIn >= 2) api.pass(`<strong>Событие ${e} ждёт ${inc.length} работ.</strong> Оно наступит, когда завершится самая поздняя из них.`);
          else if (maxIn < 2) api.pass('<strong>В этой сети нет событий с несколькими входящими работами.</strong> Но правило то же: событие ждёт все входящие работы.');
          else api.say(info.innerHTML + ' Найдите событие, в которое входит больше одной работы.');
        }));
        arcs.forEach(a => a.setAttribute('tabindex', '-1'));
      } else if (task === 'slack') {
        arcs.forEach(g => LU.activate(g, () => {
          const a = r.arcInfo[+g.dataset.k];
          arcs.forEach(x => { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); }); g.classList.add('sel'); g.setAttribute('aria-pressed', 'true');
          const msg = `Работа ${a.i}→${a.j}: длительность ${esc(txt(a.d))}, полный резерв ${esc(txt(a.full))}${a.crit ? ' — критическая' : ''}.`;
          const best = num(a.full) === maxSlack;
          if (best) api.pass(`<strong>${msg}</strong> ${maxSlack > 0 ? 'Это работа с наибольшим запасом: её можно задержать на ' + esc(txt(a.full)) + ' без вреда для проекта.' : 'Все работы критические: задерживать нельзя ни одну.'}`);
          else api.say(msg + ' Найдите работу, у которой запас больше.');
        }));
        evs.forEach(e => e.setAttribute('tabindex', '-1'));
      } else {
        const sel = new Set(), btn = body.querySelector('.net-check');
        evs.forEach(e => e.setAttribute('tabindex', '-1'));
        arcs.forEach(g => LU.activate(g, () => { const k = +g.dataset.k, on = !sel.has(k); on ? sel.add(k) : sel.delete(k); g.classList.toggle('sel', on); g.setAttribute('aria-pressed', String(on)); }));
        btn.addEventListener('click', () => {
          const need = new Set(r.arcInfo.map((a, k) => a.crit ? k : -1).filter(k => k >= 0)), miss = [...need].filter(k => !sel.has(k)), extra = [...sel].filter(k => !need.has(k));
          const nm = k => `${r.arcInfo[k].i}→${r.arcInfo[k].j}`;
          if (!miss.length && !extra.length) {
            arcs.forEach((g, k) => g.classList.toggle('crit', need.has(k))); evs.forEach((g, i) => { const t = g.querySelector('.net-times'); t.hidden = false; t.textContent = `${txt(r.tp[i])}/${txt(r.tn[i])}`; });
            api.pass(`<strong>Верно: критический путь выделен.</strong> Длительность проекта ${esc(txt(r.T))}. Подписи у событий: ранний/поздний срок; у критических работ они совпадают.`);
          } else api.fail(`<strong>Пока не так.</strong> ${extra.length ? 'Лишние: ' + extra.map(nm).join(', ') + '. ' : ''}${miss.length ? 'Не хватает работ: ' + miss.length + '.' : ''} Критическая работа — с нулевым резервом.`, 'strategy');
        });
      }
    }
  });

  /* ---------- Матричная игра ---------- */
  const gameReady = inst => { const r = inst.data && inst.data.G; return !!(r && r.C && r.rowMin && r.C.length <= 6 && r.C[0].length <= 6); };
  function heatHtml(r, opt = {}) {
    const all = r.C.flat().map(num), lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
    return `<div class="learn-scroll"><table class="sx heat"><thead><tr><th></th>${r.C[0].map((_, j) => `<th scope="col">${opt.cols ? `<button type="button" class="heat-head" data-j="${j}">B${j + 1}</button>` : `B${j + 1}`}</th>`).join('')}<th class="heat-min-h">min</th></tr></thead><tbody>${r.C.map((row, i) => `<tr><th scope="row">${opt.rows ? `<button type="button" class="heat-head" data-i="${i}">A${i + 1}</button>` : `A${i + 1}`}</th>${row.map((v, j) => `<td><button type="button" class="heat-cell" data-i="${i}" data-j="${j}" style="--h:${((num(v) - lo) / span).toFixed(2)}"${opt.cells ? '' : ' tabindex="-1"'}>${f(v)}<span class="heat-mark" aria-hidden="true"></span></button></td>`).join('')}<td class="heat-min" data-i="${i}">?</td></tr>`).join('')}<tr><th scope="row" class="heat-max-h">max</th>${r.C[0].map((_, j) => `<td class="heat-max" data-j="${j}">?</td>`).join('')}<td></td></tr></tbody></table></div>`;
  }
  S.define('heat', {
    goal: inst => ({ play: 'Почувствовать, что результат игры зависит не только от вашего выбора, но и от ответа соперника.', read: 'Научиться читать матрицу выигрышей.', maximin: 'Понять, как игрок ищет гарантированный результат.' }[inst.spec.task]),
    action: inst => ({ play: 'Выберите стратегию (строку) игрока A и посмотрите, как ответит соперник B. Попробуйте две разные строки.', read: 'Найдите клетку с наибольшим выигрышем игрока A.', maximin: 'Выберите строку с лучшим гарантированным результатом, затем столбец с лучшей гарантией для B, затем сделайте вывод.' }[inst.spec.task]),
    takeaway: inst => ({ play: 'Рациональный соперник отвечает худшим для вас образом. Поэтому важна гарантия, а не лучший возможный выигрыш.', read: 'Клетка показывает выигрыш A при одновременном выборе строки и столбца. Самое большое число не достижимо, если соперник выберет другой столбец.', maximin: 'α — лучшая гарантия A, β — лучшая гарантия B. Если α = β, есть седловая точка; иначе нужны смешанные стратегии.' }[inst.spec.task]),
    available: gameReady,
    render: (inst, api) => {
      const r = inst.data.G, t = inst.spec.task;
      return heatHtml(r, { rows: t === 'play' || t === 'maximin', cols: t === 'maximin', cells: t === 'read' }) + '<div class="sc-stage"></div>';
    },
    bind: (body, inst, api) => {
      const r = inst.data.G, t = inst.spec.task, cells = [...body.querySelectorAll('.heat-cell')], cell = (i, j) => cells.find(c => +c.dataset.i === i && +c.dataset.j === j);
      const clearMarks = () => cells.forEach(c => { c.classList.remove('pick', 'reply'); c.querySelector('.heat-mark').textContent = ''; });
      const setMin = i => { const j = r.C[i].findIndex(v => v.eq(r.rowMin[i])); body.querySelector(`.heat-min[data-i="${i}"]`).textContent = txt(r.rowMin[i]); const c = cell(i, j); c.classList.add('reply'); c.querySelector('.heat-mark').textContent = '▼'; return j; };
      const setMax = j => { const i = r.C.findIndex(row => row[j].eq(r.colMax[j])); body.querySelector(`.heat-max[data-j="${j}"]`).textContent = txt(r.colMax[j]); const c = cell(i, j); c.classList.add('reply'); c.querySelector('.heat-mark').textContent = '▲'; };
      if (t === 'read') {
        const hi = r.C.flat().reduce((a, v) => v.gt(a) ? v : a);
        cells.forEach(c => c.addEventListener('click', () => {
          const v = r.C[+c.dataset.i][+c.dataset.j];
          cells.forEach(x => x.classList.remove('pick')); c.classList.add('pick');
          if (v.eq(hi)) api.pass(`<strong>Здесь A выигрывает ${f(v)} — наибольшее число.</strong> Но выбор столбца принадлежит B: A не может его навязать.`);
          else api.fail(`<strong>Здесь ${f(v)}.</strong> В матрице есть клетка с большим выигрышем A.`, 'concept');
        }));
      } else if (t === 'play') {
        const tried = new Set();
        body.querySelectorAll('.heat-head[data-i]').forEach(b => b.addEventListener('click', () => {
          const i = +b.dataset.i; clearMarks(); tried.add(i);
          const j = setMin(i); cell(i, j).classList.add('pick');
          api.say(`Вы выбрали A${i + 1}. Соперник отвечает B${j + 1}, и ваш выигрыш равен ${f(r.rowMin[i])} (▼ — худший для вас ответ).`);
          if (tried.size >= 2) api.pass(`<strong>Вы выбрали A${i + 1}: соперник ответил B${j + 1}, выигрыш ${f(r.rowMin[i])}.</strong> Сравните разные строки: гарантированный результат у них разный.`);
        }));
      } else {
        const stage = body.querySelector('.sc-stage'); let phase = 1;
        api.say('Шаг 1: выберите строку (A1, A2, …), у которой гарантированный минимум наибольший. Нажав на строку, вы увидите её минимум.');
        const best = () => r.rowMin.reduce((a, v) => v.gt(a) ? v : a);
        body.querySelectorAll('.heat-head[data-i]').forEach(b => b.addEventListener('click', () => {
          if (phase !== 1) return; const i = +b.dataset.i; setMin(i);
          if (r.rowMin[i].eq(r.lower)) { r.rowMin.forEach((_, k) => setMin(k)); phase = 2; api.say(`<strong>Верно: α = ${f(r.lower)}.</strong> Шаг 2: выберите столбец, у которого наибольшее значение (потери B) наименьшее.`); }
          else api.fail(`Минимум строки A${i + 1}: ${f(r.rowMin[i])}. Есть строка с лучшей гарантией. Попробуйте ещё.`, 'strategy');
        }));
        body.querySelectorAll('.heat-head[data-j]').forEach(b => b.addEventListener('click', () => {
          if (phase !== 2) return; const j = +b.dataset.j; setMax(j);
          if (r.colMax[j].eq(r.upper)) {
            r.colMax.forEach((_, k) => setMax(k)); phase = 3;
            const spec = S.choiceSpec(`β = ${LU.txt(r.upper)}, α = ${LU.txt(r.lower)}. Что из этого следует?`, r.saddle ? 'α = β: есть седловая точка, чистые стратегии оптимальны' : 'α < β: чистые стратегии не устойчивы, нужны смешанные', [r.saddle ? 'α < β: нужны смешанные стратегии' : 'α = β: чистые стратегии оптимальны', 'Игра не имеет цены'], r.saddle ? 'Гарантии игроков совпали, ни одному невыгодно отклоняться.' : 'Гарантии различаются: чистой устойчивой пары нет, цену игры даёт смесь стратегий.', { kind: 'strategy' });
            api.say(`<strong>Верно: β = ${f(r.upper)}.</strong> Шаг 3: сделайте вывод.`);
            stage.innerHTML = S.choiceHtml(spec, api.id + 'w'); S.bindChoice(stage, spec, api);
          } else api.fail(`Максимум столбца B${j + 1}: ${f(r.colMax[j])}. Есть столбец с меньшим максимумом. Попробуйте ещё.`, 'strategy');
        }));
      }
    }
  });

  /* ---------- Пары прямой и двойственной задач ---------- */
  S.define('dualpair', {
    goal: 'Увидеть, как части прямой задачи соответствуют частям двойственной.',
    action: 'Отвечайте на вопросы о соответствии: строки ↔ переменные, столбцы ↔ ограничения, данные b ↔ c.',
    takeaway: 'Те же числа читаются «с другой стороны»: строки матрицы дают двойственные переменные, столбцы — двойственные ограничения, а b и c меняются ролями.',
    available: inst => { const d = inst.data; return !!(d && d.P && d.D && d.D.rows && d.P.rows.length >= 2 && d.D.rows.length === d.P.c.length); },
    render: () => '<div class="sc-stage"></div>',
    bind: (body, inst, api) => {
      const { P, D } = inst.data, specs = [], k = parseInt(LU.digest(inst.id), 36) % P.rows.length, j = parseInt(LU.digest(inst.id + 'j'), 36) % P.c.length;
      specs.push(S.choiceSpec(`Ограничению (${k + 1}) прямой задачи соответствует…`, `переменная y${sub(k + 1)}`, P.rows.map((_, i) => i).filter(i => i !== k).map(i => `переменная y${sub(i + 1)}`), `Строка ${k + 1} матрицы порождает ровно одну двойственную переменную y${sub(k + 1)}.`, { before: `<p class="sc-model">(${k + 1}) ${LU.equation(P.rows[k])}</p>`, kind: 'concept' }));
      specs.push(S.choiceSpec(`Переменной x${sub(j + 1)} прямой задачи соответствует двойственное ограничение…`, LU.equation(D.rows[j], 'y'), D.rows.map((r, i) => i).filter(i => i !== j).map(i => LU.equation(D.rows[i], 'y')), `Столбец ${j + 1} матрицы A становится строкой двойственной задачи; её правая часть — коэффициент c${sub(j + 1)} цели.`, { kind: 'concept' }));
      specs.push(S.choiceSpec('Чем становятся правые части b прямой задачи в двойственной?', 'Коэффициентами двойственной функции цели', ['Правыми частями двойственных ограничений', 'Знаками двойственных переменных'], 'Правые части b образуют цель двойственной задачи; правые части двойственных ограничений — коэффициенты c.', { kind: 'concept' }));
      rounds(body, api, specs, true);
    }
  });

  /* ---------- Теневая цена ресурса ---------- */
  S.define('shadow', {
    goal: 'Понять, что двойственная переменная — цена единицы ресурса.',
    action: 'Предскажите, увеличение какого ресурса даст наибольший выигрыш, а затем проверьте по двойственным ценам.',
    takeaway: 'Двойственная оценка показывает, как изменится цель при небольшом росте запаса, пока набор активных ограничений остаётся прежним. У ресурса с остатком цена равна нулю.',
    available: inst => { const s = inst.data && inst.data.shadow; if (!s || !s.y || s.y.length < 2) return false; const a = s.y.map(v => Math.abs(num(v))), mx = Math.max(...a); return mx > 0 && a.filter(v => v === mx).length === 1; },
    render: (inst, api) => {
      const { y, b } = inst.data.shadow, a = y.map(v => Math.abs(num(v))), best = a.indexOf(Math.max(...a));
      inst._best = best;
      const spec = inst._spec = S.choiceSpec('Запас какого ресурса выгоднее всего увеличить на единицу?', `Ресурс ${best + 1} (запас ${LU.txt(b[best])})`, y.map((_, i) => i).filter(i => i !== best).map(i => `Ресурс ${i + 1} (запас ${LU.txt(b[i])})`), `Цена ресурса ${best + 1} наибольшая: y = ${LU.txt(y[best])}.`, {
        reveal: `<ul class="sc-shadow">${y.map((v, i) => `<li><span>Ресурс ${i + 1}</span><span class="sc-shadow-bar" style="--w:${(a[i] / Math.max(...a) * 100).toFixed(0)}%"></span><strong>y${sub(i + 1)} = ${LU.txt(v)}</strong>${v.isZero() ? ' — ресурс в избытке' : ''}</li>`).join('')}</ul><label class="sc-slider"><span>Увеличить запас ресурса ${best + 1} на</span><input type="range" min="0" max="5" step="1" value="0" aria-label="Прирост запаса"><output>0</output></label><p class="sc-shadow-out" aria-live="polite">Цель изменится примерно на 0.</p>`
      });
      return S.choiceHtml(spec, api.id);
    },
    bind: (body, inst, api) => {
      const { y } = inst.data.shadow, best = inst._best;
      S.bindChoice(body, inst._spec, api, () => {
        const inp = body.querySelector('.sc-reveal input'), out = body.querySelector('.sc-reveal output'), msg = body.querySelector('.sc-shadow-out');
        inp.addEventListener('input', () => { out.textContent = inp.value; msg.textContent = `Цель изменится примерно на ${LU.txt(y[best].mul(Q.of(+inp.value)))} (оценка действует, пока набор активных ограничений не меняется).`; });
      });
    }
  });
})();
