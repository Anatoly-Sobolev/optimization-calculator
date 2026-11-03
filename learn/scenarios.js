/* Сценарии режимов: из педагогического профиля темы и данных текущего варианта собираются списки сцен.
 * Вычисления здесь не выполняются: все числа берутся из записанных результатов существующих решателей
 * (LEARN передаёт get(ключ)). Каждая единица содержимого помечена видом (tag), который обязан входить
 * в contentKinds режима (LMODES.allows). */
const LSCEN = (() => {
  'use strict';
  const { esc, f, txt, num, vec, order, sub } = LU, S = LSCENE;
  const TITLES = {
    story: 'Роли в задаче', sort: 'Дано, найти, условия', slider: 'Ресурсы и ограничения', match: 'Обозначения и смысл', pointcheck: 'Допустимое и оптимальное',
    region: 'Область и линия уровня', lattice: 'Целые точки', cutbar: 'Отсечение Гомори', stopjudge: 'Можно ли остановиться', flows: 'Перевозки', network: 'Сеть работ',
    heat: 'Матрица игры', dualpair: 'Прямая и двойственная', shadow: 'Цена ресурса', map: 'Карта метода', choice: 'Вопрос'
  };
  const STATUS = { optimal: 'найден оптимум', infeasible: 'допустимых планов нет', unbounded: 'цель не ограничена', noint: 'целых планов нет', limit: 'достигнут предел шагов', cycle: 'остановка по циклу' };

  /* Данные текущего варианта из записей решателей. */
  function dataFrom(get, state, structure, variant) {
    const res = k => get(k) && get(k).result, arg = k => (get(k) && get(k).args) || [];
    const d = { type: state.type, state, structure, variant, rec: { graph: res('graph'), lp: res('lp'), dsx: res('dsx'), gomory: res('gomory'), dual: res('dual'), dualOf: res('dualOf'), duality: res('duality'), optcheck: res('optcheck'), canon: res('canon') }, T: res('transp'), N: res('netw'), G: res('game') };
    const t = state.type, r = d.rec;
    if (t === 'graph') { d.P = arg('graph')[0]; d.status = r.graph && r.graph.status; d.opt = r.graph && r.graph.lp && r.graph.lp.status === 'optimal' ? r.graph.lp.x : null; d.f = r.graph && r.graph.f; }
    else if (t === 'simplex' || t === 'artificial') { d.P = arg('lp')[0]; d.status = r.lp && r.lp.status; d.opt = r.lp && r.lp.status === 'optimal' ? r.lp.x : null; d.f = r.lp && r.lp.f; }
    else if (t === 'dsx' || t === 'dsimplex') { d.P = arg('dsx')[0]; const s = r.dsx; d.status = s && s.status; d.opt = s && s.status === 'optimal' ? s.x : null; d.f = s && s.f; }
    else if (t === 'ilp' || t === 'gomory') {
      const g = r.gomory; if (g) { d.P = g.pr; d.status = g.status; d.lpX = g.lpX; d.opt = null; const k = g.steps.findIndex(s => s.kind === 'cut'); if (k >= 0) { d.cut = g.steps[k].cut; d.cutVars = g.steps[k].vars; } }
    }
    else if (t === 'dual') {
      if (r.dualOf) { d.P = arg('dualOf')[0]; d.D = r.dualOf; }
      else if (r.dual) { d.P = { ...arg('dual')[0], rows: r.dual.norm }; d.D = r.dual.D; d.opt = r.dual.primal && r.dual.primal.status === 'optimal' ? r.dual.primal.x : null; }
    }
    else if (t === 'duality') { const x = r.duality; if (x) { d.P = x.P; d.D = x.D; d.opt = x.x || null; d.status = x.statusP; if (x.y) d.shadow = { y: x.y, b: x.P.rows.map(row => row.b) }; } }
    else if (t === 'optcheck') { d.P = arg('optcheck')[0]; const x = r.optcheck; if (x) { d.xbar = x.x; d.verdict = x; d.status = x.optimal ? 'optimal' : x.feasible ? 'feasible' : 'infeasible'; } }
    return d;
  }

  /* ---------- Вспомогательные построители ---------- */
  const shuffled = (arr, seed) => order(arr, seed, x => x);
  function statusText(d) { return STATUS[d.status] || null; }
  function interpretSpec(T, d) {
    const t = d.type; let right = null;
    if (['graph', 'simplex', 'artificial', 'dsx', 'dsimplex', 'dual', 'duality'].includes(t) && d.P) {
      if (d.status === 'optimal' && d.opt) right = `Лучший допустимый план x* = ${vec(d.opt)}, значение цели f* = ${txt(d.f ?? (d.shadow && d.P && S.objValue(d.P, d.opt)))}; лучшего допустимого плана нет`;
      else if (d.status === 'infeasible') right = 'Допустимых планов нет: ограничения противоречат друг другу';
      else if (d.status === 'unbounded') right = 'Цель можно улучшать неограниченно: оптимума нет';
    } else if (t === 'ilp' || t === 'gomory') {
      const g = d.rec.gomory; if (g) right = g.status === 'optimal' ? 'Получен целочисленный оптимум; его цель не лучше цели обычной релаксации' : g.status === 'noint' ? 'Целых допустимых планов нет' : 'Метод остановлен по лимиту: это не доказательство отсутствия решения';
    } else if (t === 'transp' && d.T && d.T.cost) right = `Наименьшая стоимость перевозок ${txt(d.T.cost)}; ненулевые клетки таблицы — используемые маршруты`;
    else if (t === 'netw' && d.N && d.N.status === 'ok') right = `Проект длится не менее ${txt(d.N.T)}; работы критического пути задерживать нельзя`;
    else if (t === 'game' && d.G) right = d.G.saddle ? `Цена игры ${txt(d.G.value)}: у игроков есть оптимальные чистые стратегии` : `Цена игры ${txt(d.G.value)}: оптимальная игра требует смешанных стратегий`;
    else if (t === 'optcheck' && d.verdict) right = d.verdict.optimal ? 'Предложенный вектор допустим и оптимален: найден сертификат' : d.verdict.feasible ? 'Вектор допустим, но оптимальность не подтверждена' : 'Вектор недопустим: нарушено ограничение или знак';
    else if (t === 'canon') right = 'Эквивалентная задача в каноническом виде: допустимые планы и оптимум соответствуют исходным';
    if (t === 'dual' && d.D && !right) right = `Построена двойственная задача: ${d.D.n ?? d.D.c?.length} переменных и ${d.D.rows.length} ограничений`;
    if (!right) return null;
    const wrong = T.interpWrong.slice(0, 3);
    return S.choiceSpec('Какой вывод о результате верен для вашего варианта?', right, wrong, 'Результат нужно читать через постановку: что выбиралось, что ограничивало и что значит «лучше».', { kind: 'concept' });
  }
  function misconceptionSpec(T, i) {
    const m = T.misconceptions[i % T.misconceptions.length], others = T.misconceptions.filter((_, k) => k !== i % T.misconceptions.length);
    return S.choiceSpec(`Студент рассуждает: «${m.wrong}». Что здесь не так?`, m.why, [...others.slice(0, 2).map(o => o.why), 'Всё верно: ошибки в рассуждении нет'], `${m.why} ${m.fix}`, { kind: 'error', errorKind: 'misconception:' + i });
  }
  const selfSpec = (T, i) => { const s = T.selfcheck[i % T.selfcheck.length]; return S.choiceSpec(s.q, s.right, s.wrong, s.why, { kind: 'concept' }); };
  const stopSpec = T => S.choiceSpec('По какому признаку метод считается завершённым?', T.stopSigns, ['Когда выполнено заранее заданное число шагов', 'Когда все переменные стали ненулевыми'], 'Критерий завершения — свойство текущего состояния, а не число шагов.', { kind: 'concept' });

  /* Состояния реального решения для сцены «можно ли остановиться». */
  function stopStates(d, T) {
    const t = d.type, r = d.rec, pick = steps => steps.length <= 3 ? steps.map((s, i) => i) : [0, Math.floor((steps.length - 1) / 2), steps.length - 1];
    let steps = null, dual = false, noun = '', status = d.status;
    if (t === 'simplex' && r.lp && r.lp.phase2) steps = r.lp.phase2.steps;
    else if (t === 'artificial' && r.lp) { steps = r.lp.phase1 ? r.lp.phase1.steps : r.lp.phase2 && r.lp.phase2.steps; noun = r.lp.phase1 ? ' (первый этап)' : ''; }
    else if ((t === 'dsx' || t === 'dsimplex') && r.dsx) { steps = r.dsx.steps || null; dual = true; }
    if (!steps || steps.length < 2) return null;
    const idx = pick(steps).filter((v, i, a) => a.indexOf(v) === i);
    const tab = s => R.table({ ...s, p: null, q: null }, {});
    return idx.map(i => {
      const s = steps[i], end = s.p == null || s.q == null;
      const why = end ? (dual ? (s.terminal === 'infeasible' ? 'В нарушенной строке нет отрицательных элементов: допустимых планов нет, метод заканчивается.' : 'Все правые части неотрицательны: допустимость достигнута, план оптимален.') : (t === 'artificial' && noun ? 'Нет улучшающих столбцов: первый этап закончен, дальше проверяют h.' : 'Нет улучшающих столбцов: текущий план оптимален (или цель не ограничена).')) : (dual ? 'Есть отрицательное b: план всё ещё недопустим, нужен поворот.' : 'Есть улучшающий столбец с отрицательной оценкой: цель можно улучшить.');
      return { label: `Состояние ${i + 1} из ${steps.length}${noun}`, html: tab(s), done: end, why, hint: dual ? 'Смотрите на знаки правых частей b.' : 'Смотрите на строку цели.' };
    });
  }

  /* ---------- Сцены по режимам ---------- */
  const mk = (mode, d, k, scene, spec, o = {}) => ({ id: `${d.type}-${mode}-${k}-${scene}`, kind: 'scene', scene, spec, data: d, tag: o.tag, skill: mode, title: o.title || TITLES[scene], tier: o.tier ?? 0, hint: o.hint, deep: o.deep, takeaway: o.takeaway, assess: o.assess || 'concept', goal: o.goal, action: o.action });
  const liveType = t => ({ graph: 'lp', simplex: 'lp', artificial: 'lp', dsx: 'lp', dsimplex: 'lp', dual: 'lp', duality: 'lp', optcheck: 'lp', ilp: 'ilp', gomory: 'ilp', transp: 'transp', netw: 'netw', game: 'game', canon: 'none' }[t] || 'none');

  function meaning(d, T) {
    const out = [], L = liveType(d.type);
    out.push(mk('meaning', d, 0, 'story', { analogy: T.analogy, roles: T.roles, question: S.choiceSpec(T.whynot.q, T.whynot.right, T.whynot.wrong, T.whynot.why) }, { tag: 'analogy', deep: T.summary, hint: 'Откройте все карточки: они объясняют роли.' }));
    out.push(mk('meaning', d, 1, 'sort', { buckets: T.sort.buckets, items: T.sort.items.map(([text, to, why]) => ({ text, to, why })) }, { tag: 'entities', hint: 'Спросите себя: это известно заранее, это выбираем или это правило?' }));
    if (L === 'lp') out.push(mk('meaning', d, 2, 'slider', {}, { tag: 'resources', tier: 0, deep: T.constraints, hint: 'Увеличивайте ползунки, пока не появится метка ✗.' }));
    if (L === 'ilp') out.push(mk('meaning', d, 2, 'lattice', {}, { tag: 'resources', tier: 1, hint: 'Проверьте каждую кнопку-точку.', goal: 'Понять, зачем нужна целочисленность и почему нельзя просто округлять.' }));
    if (L === 'transp') out.push(mk('meaning', d, 2, 'flows', { task: 'build' }, { tag: 'resources', hint: 'Сумма по строке не больше запаса, по столбцу — не меньше спроса.' }));
    if (L === 'netw') out.push(mk('meaning', d, 2, 'network', { task: 'wait' }, { tag: 'resources', hint: 'Ищите событие, в которое входит несколько стрелок.' }));
    if (L === 'game') out.push(mk('meaning', d, 2, 'heat', { task: 'play' }, { tag: 'resources', hint: 'Нажмите на A1, затем на A2.' }));
    out.push(mk('meaning', d, 3, 'choice', S.choiceSpec(T.better.q, T.better.right, T.better.wrong, T.better.why), { tag: 'goal-meaning', tier: 1, deep: T.objective }));
    return out;
  }
  function model(d, T) {
    const out = [], L = liveType(d.type), meanings = shuffled(T.symbols.map(s => s[1]), d.type + 'sym');
    out.push(mk('model', d, 0, 'match', { buckets: meanings, items: T.symbols.map(([sym, mean]) => ({ text: esc(sym), to: meanings.indexOf(mean), why: mean })) }, { tag: 'symbols', hint: 'Прочитайте обозначение вслух: что оно показывает?', deep: T.variables }));
    if (d.P && d.P.rows && d.P.c && ['graph', 'simplex', 'artificial', 'dsx', 'dsimplex', 'dual', 'duality', 'optcheck'].includes(d.type)) {
      const P = d.P, items = [{ text: LU.objective(P), to: 0, why: 'Это функция цели.' }, ...P.rows.slice(0, 4).map((r, i) => ({ text: `(${i + 1}) ${LU.equation(r)}`, to: 1, why: 'Это ограничение.' })), { text: `x<sub>j</sub> ≥ 0`, to: 2, why: 'Это условие знака.' }];
      out.push(mk('model', d, 1, 'sort', { buckets: ['Цель', 'Ограничения', 'Условие знака'], items, takeaway: 'Модель состоит из цели, ограничений и условий знака; именно такую запись читает метод решения.' }, { tag: 'model-assembly', title: 'Собери модель варианта', goal: 'Узнать части математической модели вашего варианта.', action: 'Для каждой записи выберите, чем она является.' }));
    }
    out.push(mk('model', d, 2, 'choice', S.choiceSpec('Какое утверждение описывает ДОПУСТИМОЕ решение?', T.feasible, [T.optimal, T.complete], 'Допустимость — свойство одного решения относительно ограничений; оптимальность требует сравнения с другими.'), { tag: 'optimality', title: 'Допустимое решение' }));
    if (L === 'lp') out.push(mk('model', d, 3, 'pointcheck', {}, { tag: 'feasibility', deep: T.feasible, hint: 'Подставьте точку в каждое ограничение.' }));
    if (L === 'ilp') out.push(mk('model', d, 3, 'lattice', {}, { tag: 'feasibility', hint: 'Нажмите на каждую кнопку-точку.', title: 'Допустимы ли округлённые точки' }));
    if (L === 'transp') out.push(mk('model', d, 3, 'flows', { task: 'violation' }, { tag: 'feasibility', hint: 'Сложите перевозки по строке или столбцу.' }));
    if (L === 'netw') out.push(mk('model', d, 3, 'network', { task: 'slack' }, { tag: 'interpretation', hint: 'Нажимайте на стрелки и читайте резерв.' }));
    if (L === 'game') out.push(mk('model', d, 3, 'heat', { task: 'read' }, { tag: 'symbols', hint: 'Ищите наибольшее число в таблице.' }));
    out.push(mk('model', d, 4, 'choice', S.choiceSpec('Какое утверждение описывает ОПТИМАЛЬНОЕ решение?', T.optimal, [T.feasible, T.complete], 'Оптимальное решение допустимо и лучшее по цели; допустимое решение само по себе оптимальным быть не обязано.'), { tag: 'optimality', tier: 1, title: 'Оптимальное решение', deep: T.optimal }));
    const ip = interpretSpec(T, d); if (ip) out.push(mk('model', d, 5, 'choice', ip, { tag: 'interpretation', title: 'Что означает результат', deep: T.interpretation }));
    return out;
  }
  function strategy(d, T) {
    const out = [], L = liveType(d.type), t = d.type;
    let at = null; if (d.status && STATUS[d.status]) at = `В вашем варианте метод завершается так: ${STATUS[d.status]}.`;
    out.push(mk('strategy', d, 0, 'map', { nodes: T.map.nodes, question: S.choiceSpec(T.map.q.q, T.map.q.right, T.map.q.wrong, T.map.q.why), at }, { tag: 'method-map', deep: T.idea, hint: 'Откройте каждое состояние по очереди.' }));
    out.push(mk('strategy', d, 1, 'choice', stopSpec(T), { tag: 'stop-criteria', title: 'Когда метод останавливается', deep: T.stopSigns }));
    const states = ['simplex', 'artificial', 'dsx', 'dsimplex'].includes(t) ? stopStates(d, T) : null;
    if (states) out.push(mk('strategy', d, 2, 'stopjudge', { states }, { tag: 'stop-criteria', deep: T.stopSigns, hint: 'Сравните состояние с признаком завершения.' }));
    if (t === 'graph') out.push(mk('strategy', d, 2, 'region', {}, { tag: 'improvement-trend', deep: T.idea, hint: 'Сдвигайте линию в сторону улучшения, пока она касается области.' }));
    if (L === 'ilp') out.push(mk('strategy', d, 2, 'cutbar', {}, { tag: 'improvement-trend', hint: 'Левая часть отсечения в вершине равна нулю.' }));
    if (L === 'transp') out.push(mk('strategy', d, 2, 'flows', { task: 'improve' }, { tag: 'improvement-trend', hint: 'Отрицательная оценка обычно снижает стоимость.' }));
    if (L === 'netw') out.push(mk('strategy', d, 2, 'network', { task: 'critical' }, { tag: 'improvement-trend', hint: 'Критическая работа — с нулевым резервом.', title: 'Критический путь' }));
    if (L === 'game') out.push(mk('strategy', d, 2, 'heat', { task: 'maximin' }, { tag: 'stop-criteria', hint: 'Сначала посмотрите на минимум каждой строки.' }));
    if (t === 'dual' || t === 'duality') out.push(mk('strategy', d, 2, 'dualpair', {}, { tag: 'method-map', hint: 'Строки превращаются в переменные, столбцы — в ограничения.' }));
    if (t === 'duality') out.push(mk('strategy', d, 3, 'shadow', {}, { tag: 'improvement-trend', tier: 1, hint: 'Цена тем больше, чем сильнее ресурс ограничивает цель.' }));
    const sg = T.outcomes.map(o => o[1]), buckets = shuffled(sg, t + 'out');
    out.push(mk('strategy', d, 4, 'match', { buckets, items: T.outcomes.map(([sign, mean]) => ({ text: esc(sign), to: buckets.indexOf(mean), why: mean })) }, { tag: 'special-outcomes', tier: 1, title: 'Особые исходы', goal: 'Научиться распознавать особые исходы метода.', action: 'Для каждого признака выберите, что он означает.' }));
    T.misconceptions.forEach((_, i) => out.push(mk('strategy', d, 5 + i, 'choice', misconceptionSpec(T, i), { tag: 'misconceptions', tier: i ? 2 : 1, title: 'Типичное заблуждение', deep: T.misconceptions[i].fix })));
    return out;
  }
  const interpretScene = (mode, d, T, k) => { const s = interpretSpec(T, d); return s ? [mk(mode, d, k, 'choice', s, { tag: 'interpretation', title: 'Вывод по результату', assess: 'concept', takeaway: T.interpretation })] : []; };
  const firstMoveScene = (d, T) => mk('solo', d, 0, 'choice', S.choiceSpec(T.first.q, T.first.right, T.first.wrong, T.first.why, { kind: 'concept', errorKind: 'plan' }), { tag: 'plan-choice', title: 'Выберите первый шаг', goal: 'Самостоятельно выбрать подход, не опираясь на готовое объяснение.', action: 'Выберите первый шаг решения. Ответ и объяснение появятся после попытки.', assess: 'concept' });

  /* Список сцен для режима «понимание». */
  function scenes(mode, d, depth) {
    const T = LPROFILES.profileFor(d.type); if (!T) return [];
    const list = ({ meaning, model, strategy })[mode](d, T), max = { brief: 0, detail: 1, deep: 2 }[depth] ?? 1;
    let res = list.filter(s => S.available(s) && LMODES.allows(mode, s.tag) && s.tier <= max);
    if (res.length < 2) res = list.filter(s => S.available(s) && LMODES.allows(mode, s.tag)).slice(0, 3);
    return res;
  }
  /* Практика: реальные этапы + выбор первого шага (solo) + итоговая интерпретация. */
  function practice(mode, d, stages) {
    const T = LPROFILES.profileFor(d.type);
    const list = stages.map(s => ({ ...s, assess: 'compute' }));
    if (!T) return list;
    const head = mode === 'solo' ? [firstMoveScene(d, T)] : [];
    return [...head, ...list, ...interpretScene(mode, d, T, 9)];
  }
  /* Проверка: сбалансированный набор «понимание + вычисления». Одна попытка на пункт. */
  function check(d, stages, format) {
    const T = LPROFILES.profileFor(d.type); if (!T) return [];
    const concept = [mk('check', d, 0, 'choice', selfSpec(T, 0), { tag: 'concept-items', title: 'Понимание: основы' }), mk('check', d, 1, 'choice', misconceptionSpec(T, 0), { tag: 'error-diagnosis', title: 'Найдите ошибку' }), ...interpretScene('check', d, T, 2).map(s => ({ ...s, tag: 'interpretation' })), mk('check', d, 3, 'choice', selfSpec(T, 1), { tag: 'concept-items', title: 'Понимание: метод' }), mk('check', d, 4, 'choice', stopSpec(T), { tag: 'concept-items', title: 'Критерий остановки' })];
    const nC = format === 'exam' ? 2 : 4, nK = format === 'exam' ? 2 : 3;
    const pool = stages.filter(s => s.tier <= 1);
    const src = pool.length >= nK ? pool : stages, comp = [];
    for (let i = 0; i < Math.min(nK, src.length); i++) comp.push(src[Math.round(i * (src.length - 1) / Math.max(1, Math.min(nK, src.length) - 1))]);
    const compute = [...new Map(comp.map(s => [s.id, { ...s, assess: 'compute', tag: 'compute-items' }])).values()];
    const items = format === 'exam' ? [concept[0], concept[1], ...compute] : [...concept.slice(0, nC), ...compute];
    return items.map(s => ({ ...s, single: true }));
  }
  /* Единая точка входа. */
  function build(mode, d, ctx) {
    if (['meaning', 'model', 'strategy'].includes(mode)) return scenes(mode, d, ctx.depth);
    if (mode === 'guided' || mode === 'solo') return practice(mode, d, ctx.stages);
    if (mode === 'check') return check(d, ctx.stages, ctx.format);
    return [];
  }
  return { dataFrom, build, scenes, practice, check, stopStates, interpretSpec, TITLES, STATUS };
})();
