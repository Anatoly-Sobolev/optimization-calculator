/* Реестр учебных режимов. Каждый режим решает отдельную образовательную задачу и описан контрактом:
 * goal, audience, contentKinds, interactionKinds, completionRule, excludedKinds.
 * Сценарии (learn/scenarios.js) метят каждую единицу содержимого видом из contentKinds;
 * LMODES.allows() не пропускает вид, не входящий в контракт режима. */
const LMODES = (() => {
  'use strict';
  const list = [
    {
      id: 'meaning', label: 'Знакомство с задачей', group: 'understand', skill: 'meaning', engine: 'scenes', settings: ['depth'],
      goal: 'Понять, какую жизненную проблему описывает задача, кто и что в ней выбирает, чем это ограничено и что значит «лучше».',
      audience: 'Предварительных знаний не требуется.',
      contentKinds: ['analogy', 'entities', 'resources', 'goal-meaning'],
      interactionKinds: ['открыть карточку', 'отсортировать «дано / найти / условия»', 'подвигать ползунок или маршрут', 'выбрать объяснение'],
      completionRule: 'Пройдены все сцены: вы объяснили, что выбирается, что ограничено и что значит лучший вариант. Вычислений не требуется.',
      excludedKinds: ['tableau', 'pivot', 'numeric-entry', 'algorithm-step', 'method-map', 'stop-criteria'],
      difference: 'Только смысл задачи: без формул, таблиц и шагов метода.'
    },
    {
      id: 'model', label: 'Чтение модели', group: 'understand', skill: 'model', engine: 'scenes', settings: ['depth'],
      goal: 'Научиться читать математическую постановку: что означают переменные, цель и ограничения, чем допустимое решение отличается от оптимального и как понимать ответ.',
      audience: 'Знаком смысл задачи (режим «Знакомство с задачей») или общее представление о линейных моделях.',
      contentKinds: ['symbols', 'model-assembly', 'feasibility', 'optimality', 'interpretation'],
      interactionKinds: ['сопоставить обозначение и смысл', 'собрать модель из частей', 'отметить допустимые и недопустимые решения', 'истолковать результат'],
      completionRule: 'Верно сопоставлены обозначения, собрана модель варианта, проверена допустимость решений и выбрана верная интерпретация результата.',
      excludedKinds: ['algorithm-step', 'pivot', 'numeric-entry', 'stop-criteria', 'analogy'],
      difference: 'Читаем готовую модель и результат; метод решения не выполняется.'
    },
    {
      id: 'strategy', label: 'Стратегия метода', group: 'understand', skill: 'strategy', engine: 'scenes', settings: ['depth'],
      goal: 'Понять, какую трудность устраняет метод, что улучшается на каждом шаге, почему процесс останавливается и какие особые исходы возможны.',
      audience: 'Прочитана постановка задачи; вычислительные детали не нужны.',
      contentKinds: ['method-map', 'stop-criteria', 'special-outcomes', 'misconceptions', 'improvement-trend'],
      interactionKinds: ['пройти карту метода', 'предсказать до показа', 'решить, можно ли остановиться', 'распознать особый исход'],
      completionRule: 'Пройдена карта метода, верно определены критерий остановки и особые исходы, разобраны типичные заблуждения.',
      excludedKinds: ['numeric-entry', 'pivot-calculation', 'analogy', 'model-assembly'],
      difference: 'Общая картина процесса и критерии завершения без выполнения вычислений.'
    },
    {
      id: 'guided', label: 'Практика с поддержкой', group: 'practice', skill: 'guided', engine: 'stages', settings: ['depth', 'hint'],
      goal: 'Выполнять метод на реальном решении текущего варианта: прогнозировать шаг, выбирать элемент в таблице и сравнивать состояние до и после.',
      audience: 'Понятны постановка и общая идея метода.',
      contentKinds: ['real-stages', 'table-selection', 'before-after', 'interpretation'],
      interactionKinds: ['выбрать строку, столбец, клетку или правило', 'запросить подсказку', 'сравнить «до» и «после»', 'увидеть изменившиеся значения'],
      completionRule: 'Все этапы реального решения пройдены; допускаются ошибки и подсказки, они учитываются отдельно.',
      excludedKinds: ['analogy', 'method-map', 'assessment-score', 'concept-items'],
      difference: 'Управляемая практика с подсказками и объяснением после каждого шага.'
    },
    {
      id: 'solo', label: 'Самостоятельное решение', group: 'practice', skill: 'solo', engine: 'stages', settings: ['depth'],
      goal: 'Выполнить ключевые шаги без готового объяснения: самому выбрать подход, вводить значения и получать диагностику ошибок.',
      audience: 'Метод уже выполнялся с поддержкой.',
      contentKinds: ['real-stages', 'numeric-entry', 'plan-choice', 'error-diagnosis', 'interpretation'],
      interactionKinds: ['выбрать первый шаг', 'ввести число или дробь', 'исправить ошибку по диагностике', 'истолковать результат'],
      completionRule: 'Пройдены все этапы; оценивается ход решения: доля этапов с первой попытки, число подсказок и типы ошибок.',
      excludedKinds: ['analogy', 'automatic-hints', 'method-map', 'answer-before-attempt'],
      difference: 'Подсказки только по запросу, объяснение после ответа, оценивается ход решения.'
    },
    {
      id: 'check', label: 'Проверка знаний', group: 'assessment', skill: 'check', engine: 'check', settings: [],
      goal: 'Проверить, сформировано ли понимание: отдельно концептуальное (модель, метод, интерпретация, ошибки) и вычислительное.',
      audience: 'Материал темы пройден; нужна независимая оценка.',
      contentKinds: ['concept-items', 'compute-items', 'error-diagnosis', 'interpretation', 'report'],
      interactionKinds: ['один ответ на вопрос', 'вычислить отдельный шаг', 'найти ошибку в рассуждении'],
      completionRule: 'Даны ответы на все вопросы; результат — два отдельных балла (понимание и вычисления) и рекомендации; порог — 70% по каждому.',
      excludedKinds: ['hints', 'retry', 'explanation-before-answer', 'analogy'],
      difference: 'Единственная попытка без подсказок; формат «Экзамен» — шесть тем двух источников.'
    }
  ];
  const byId = Object.fromEntries(list.map(m => [m.id, m]));
  /* Старые значения настройки режима → новые. */
  const migrate = { understand: 'strategy', next: 'guided', error: 'guided', self: 'solo', quiz: 'check', exam: 'check' };
  const depthRoles = {
    brief: 'Кратко: только основные сцены и этапы, без необязательных примеров.',
    detail: 'Подробно: добавляются промежуточные связи и дополнительные сцены.',
    deep: 'Глубоко: добавляются причины, исключения и интерпретация особых случаев.'
  };
  const allows = (mode, kind) => !!byId[mode] && byId[mode].contentKinds.includes(kind) && !byId[mode].excludedKinds.includes(kind);
  function validate() {
    const problems = [], keys = ['goal', 'audience', 'contentKinds', 'interactionKinds', 'completionRule', 'excludedKinds'];
    list.forEach(m => keys.forEach(k => { if (!m[k] || (Array.isArray(m[k]) && !m[k].length)) problems.push(`${m.id}: нет поля ${k}`); }));
    const uniq = k => new Set(list.map(m => JSON.stringify(m[k]))).size === list.length;
    ['goal', 'completionRule', 'contentKinds'].forEach(k => { if (!uniq(k)) problems.push('повтор поля ' + k); });
    list.forEach(m => m.contentKinds.forEach(k => { if (m.excludedKinds.includes(k)) problems.push(`${m.id}: ${k} одновременно разрешён и исключён`); }));
    return problems;
  }
  return { list, byId, migrate, depthRoles, allows, validate, default: 'meaning' };
})();
