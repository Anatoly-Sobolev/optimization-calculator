/* Модель учебного прогресса (localStorage, версия 2).
 * Навыки учитываются отдельно: смысл, чтение модели, стратегия, практика с поддержкой,
 * самостоятельное решение, проверка (понимание и вычисления считаются раздельно).
 * Тема считается освоенной только при выполнении трёх условий: понимание, практика, проверка.
 * Старый ключ v1 читается и переносится без удаления; повреждённые данные заменяются чистым состоянием. */
const LPROG = (() => {
  'use strict';
  const KEY = 'optimization.learning.v2', OLD = 'optimization.learning.v1';
  const MODES = ['meaning', 'model', 'strategy', 'guided', 'solo', 'check'];
  const THRESHOLD = 0.7, MIN_ITEMS = 3;
  const fresh = () => ({ version: 2, settings: { mode: 'meaning', depth: 'detail', hint: 'error', presentation: 'animated', format: 'topic' }, sessions: {}, skills: {}, streak: 0, best: 0 });
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const modeOf = m => MODES.includes(m) ? m : (LMODES.migrate[m] || 'meaning');
  const cleanSettings = s => {
    const base = fresh().settings, out = { ...base, ...(isObj(s) ? s : {}) };
    out.mode = modeOf(out.mode);
    if (!['brief', 'detail', 'deep'].includes(out.depth)) out.depth = base.depth;
    if (!['now', 'error', 'request'].includes(out.hint)) out.hint = base.hint;
    if (!['animated', 'learning', 'text'].includes(out.presentation)) out.presentation = base.presentation;
    if (!['topic', 'exam'].includes(out.format)) out.format = 'topic';
    return out;
  };
  const emptySkill = () => ({ meaning: {}, model: {}, strategy: {}, guided: {}, solo: {}, check: {}, errors: {}, hints: 0 });
  const skillOf = (data, key) => (data.skills[key] = { ...emptySkill(), ...(isObj(data.skills[key]) ? data.skills[key] : {}) });
  function normalize(raw) {
    const d = fresh();
    d.settings = cleanSettings(raw.settings);
    if (isObj(raw.sessions)) d.sessions = raw.sessions;
    if (isObj(raw.skills)) d.skills = raw.skills;
    d.streak = Number(raw.streak) || 0; d.best = Number(raw.best) || 0;
    if (isObj(raw.exam) && Array.isArray(raw.exam.queue) && Number.isInteger(raw.exam.at)) d.exam = raw.exam;
    return d;
  }
  function fromV1(raw) {
    const d = fresh();
    d.settings = cleanSettings(raw.settings);
    d.streak = Number(raw.streak) || 0; d.best = Number(raw.best) || 0;
    if (isObj(raw.topics)) for (const [k, t] of Object.entries(raw.topics)) {
      if (!isObj(t)) continue;
      const sk = skillOf(d, k);
      if (t.completed > 0) sk.guided = { done: true, runs: Number(t.completed) || 1, migrated: true };
      if (t.mastered) sk.solo = { done: true, runs: 1, clean: true, migrated: true };
    }
    return d;
  }
  /* Возвращает {data, ok, migrated}: ok=false, если хранилище недоступно или данные повреждены. */
  function load(storage) {
    let ok = true;
    const read = k => { try { const s = storage.getItem(k); return s == null ? null : JSON.parse(s); } catch (_) { ok = false; return null; } };
    const v2 = read(KEY);
    if (isObj(v2) && v2.version === 2) return { data: normalize(v2), ok, migrated: false };
    const v1 = read(OLD);
    if (isObj(v1) && v1.version === 1 && isObj(v1.settings)) return { data: fromV1(v1), ok, migrated: true };
    return { data: fresh(), ok, migrated: false };
  }
  function save(storage, data) { try { storage.setItem(KEY, JSON.stringify(data)); return true; } catch (_) { return false; } }
  function clear(storage) { try { storage.removeItem(KEY); storage.removeItem(OLD); } catch (_) { /* недоступно */ } }
  const ratio = r => r && r.total ? r.right / r.total : 0;
  /* Фиксирует итог прохождения режима по теме. res: {total, firstTry, errors, hints, revealed, concept, compute, errorKinds}. */
  function record(data, topicKey, mode, res) {
    const sk = skillOf(data, topicKey), cur = sk[mode] || {};
    const clean = !res.revealed && !res.hints && res.total > 0 && res.firstTry / res.total >= THRESHOLD;
    const next = { done: true, runs: (cur.runs || 0) + 1, clean: !!(cur.clean || clean), firstTry: res.firstTry, total: res.total };
    if (mode === 'check') {
      for (const part of ['concept', 'compute']) {
        const now = res[part] || { right: 0, total: 0 }, prev = cur[part];
        next[part] = prev && ratio(prev) >= ratio(now) ? prev : now;
      }
    }
    sk[mode] = next;
    if (res.title) sk.title = res.title;
    sk.hints = (sk.hints || 0) + (res.hints || 0);
    for (const k of res.errorKinds || []) sk.errors[k] = (sk.errors[k] || 0) + 1;
    return sk;
  }
  const levels = sk => {
    const c = sk.check || {};
    return {
      understanding: !!(sk.meaning.done && sk.model.done && sk.strategy.done),
      practice: !!(sk.guided.done && sk.solo.done && sk.solo.clean),
      proof: !!(c.done && c.concept && c.compute && c.concept.total >= MIN_ITEMS && c.compute.total >= MIN_ITEMS && ratio(c.concept) >= THRESHOLD && ratio(c.compute) >= THRESHOLD)
    };
  };
  const mastered = sk => { const l = levels(sk); return l.understanding && l.practice && l.proof; };
  return { KEY, OLD, MODES, THRESHOLD, fresh, load, save, clear, record, levels, mastered, skillOf, normalize, fromV1, ratio };
})();
