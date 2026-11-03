/* Learning adapters consume the very results used by the existing views.
 * Contract: {id, title, before, prompt, answer, options?, reason, hint, deep,
 *            after, tier, skill}. No solver inputs or results are mutated.
 * All persistence is browser-local. No requests or telemetry. */
const LEARN = (() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt = q => q == null ? '—' : typeof q.toText === 'function' ? q.toText() : String(q);
  const f = q => esc(txt(q));
  const sum = xs => xs.reduce((a,b) => a.add(Q.of(b)), Z());
  const KEY = 'optimization.learning.v1';
  const fresh = () => ({version:1, settings:{mode:'next',depth:'detail',hint:'error'}, topics:{}, sessions:{}, streak:0, best:0});
  let data = fresh(), storageOK = true;
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d?.version === 1 && d.settings && d.topics && d.sessions) data = {...fresh(),...d}; } catch (_) { storageOK = false; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { storageOK = false; } };
  let records = [], recording = false, active = false, context, root, stages = [], allStages = [], session, signature, animations = [], animationEpoch = 0;
  const modes = {understand:'Понять решение',next:'Следующий логический этап',error:'Разобрать ошибку или выбор',self:'Решить самостоятельно',quiz:'Викторина по теме',exam:'Подготовка к экзамену'};
  const descriptions = {understand:'Читайте цель этапа, затем открывайте настоящее преобразование.',next:'Выберите следующее действие. Ошибка оставляет вас на том же этапе.',error:'Проверьте предложенное рассуждение и объясните выбор.',self:'Вычисляйте ключевые величины: принимаются целые, десятичные и дроби.',quiz:'До пяти вопросов по текущей задаче, от подготовки до результата.',exam:'Шесть задач из разных разделов обоих источников. Подсказок постепенно меньше.'};
  const wrap = (object, name, key) => { const original = object[name]; object[name] = function(...args) { const result = original.apply(this,args); if(recording) records.push({key,args,result}); return result; }; };
  [[ALG,'twoPhase','lp'],[ALG,'graph','graph'],[ALG,'dual','dual'],[ALGZ,'dualOf','dualOf'],[ALGZ,'reduce2','reduce'],[ALGD,'solve','dsx'],[ALGT,'solve','transp'],[ALGN,'solve','netw'],[ALGG,'solve','game'],[ALGK,'convert','canon'],[ALGI,'solve','gomory'],[ALGI,'bnb','bnb'],[ALGX,'check','optcheck'],[ALGX,'duality','duality']].forEach(a=>wrap(...a));
  function stop() { animationEpoch++; animations.forEach(a=>a.cancel()); animations=[]; }
  function begin() { stop(); records=[]; recording=true; }
  const get = k => records.find(r=>r.key===k);
  const matrix = (rows, headers) => `<div class="learn-scroll"><table class="sx"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const equation = (r, variable='x') => `${r.a.map((a,j)=>`${f(a)}·${variable}<sub>${j+1}</sub>`).join(' + ')} ${esc(r.s)} ${f(r.b)}`;
  const problem = p => `<p>${p.c.map((c,j)=>`${f(c)}·x<sub>${j+1}</sub>`).join(' + ')} → ${esc(p.sense)}</p>${p.rows.map((r,i)=>`<p>(${i+1}) ${equation(r)}</p>`).join('')}`;
  const tableau = (s, mark) => R.table({...s,p:null,q:null},{mark});
  function choice(title,before,prompt,answer,alternatives,reason,extra={}) {
    return {title,before,prompt,answer:String(answer),options:[{value:String(answer),label:String(answer),why:reason},...alternatives.filter(a=>String(a[0])!==String(answer)).map(([label,why])=>({value:String(label),label:String(label),why}))],reason,hint:reason,deep:'Проверяйте предпосылки правила: допустимость и условия на знаки важны не меньше вычислений.',after:`<p>${esc(reason)}</p>`,tier:0,skill:title,...extra};
  }
  function number(title,before,prompt,answer,reason,extra={}) { return {title,before,prompt,answer:txt(answer),numeric:true,reason,hint:reason,deep:'Используйте точные дроби: округление промежуточных значений может изменить сравнение и выбор шага.',after:`<p>${esc(prompt)} <strong>${f(answer)}</strong></p>`,tier:0,skill:title,...extra}; }
  function verdict(status,before='',label='Итог метода') {
    const names={optimal:'Конечный оптимум найден',infeasible:'Допустимых решений нет',unbounded:'Цель не ограничена',noint:'Целочисленных решений нет',limit:'Достигнут предел вычислений',cycle:'Вычисление остановлено: цикл',ok:'Преобразование завершено'};
    const answer=names[status]||'Нужна дополнительная проверка';
    return choice(label,before,'Какой вывод допускает полученный результат?',answer,Object.values(names).filter(s=>s!==answer).map(s=>[s,'Этот вывод требует другого критерия. Проверьте последний этап и его условия.']),`Результат текущей трассы: ${answer.toLowerCase()}. Предел итераций не доказывает отсутствие решения.`,{deep:'Не смешивайте несовместность ограничений, неограниченность цели и остановку реализации по лимиту.'});
  }
  function pivots(ss, dual=false, prefix='Итерация', onlyFirst=false) {
    const out=[];
    ss.forEach((s,k)=>{
      if(onlyFirst && k>0)return;
      if(s.p==null || s.q==null || s.kind==='cut') return;
      const d=dual && s.kind!=='M', before=tableau(s,(i,j)=>d?(j===-1?'learn-relevant':''):(i===s.rows.length?'learn-relevant':''));
      const next=ss[k+1];
      const after=next?tableau(next):tableau(d?ALGD.pivot(s,s.p,s.q):s.kind==='M'?ALGD.pivot(s,s.p,s.q):ALG.pivot(s,s.p,s.q));
      const rule=d?'Выходящая строка имеет отрицательное b. Среди отрицательных коэффициентов этой строки выбираем минимальное dⱼ/(−aᵢⱼ), сохраняя d ≥ 0.':s.kind==='M'?'Искусственное ограничение M помогает восстановить двойственную допустимость. Используем подготовительный поворот, показанный в трассе.':'Входит столбец с отрицательной оценкой. Выходит строка с минимальным bᵢ/aᵢⱼ среди aᵢⱼ > 0: это сохраняет допустимость.';
      out.push(choice(`${prefix} ${k+1}: правило выбора`,before,'Как выбрать разрешающий элемент на этом этапе?',d?'Сначала отрицательное b, затем минимум d/(−a)':s.kind==='M'?'Подготовительный поворот с ограничением M':'Отрицательная оценка, затем минимум b/a при a > 0',[
        ['Максимальное отношение b/a','Максимум может сделать другой базисный компонент отрицательным.'],
        [d?'Отрицательная оценка, затем минимум b/a при a > 0':'Сначала отрицательное b, затем минимум d/(−a)','Это правило другого симплекс-метода; проверьте, какая допустимость нарушена.']
      ],rule,{after,tier:k?1:0,deep:`В этой трассе выбрана строка ${s.p+1}, столбец ${s.q+1}. При равенстве отношений возможны несколько корректных поворотов; здесь воспроизводится выбор решателя. Вырожденный поворот может не менять цель.`}));
      const vn=j=>R.vname(s.vars,j).replace(/<[^>]*>/g,'');
      if(s.kind!=='M') {
        const minScore=s.cols.filter(j=>s.z.a[j].s<0).reduce((best,j)=>best===null||s.z.a[j].lt(s.z.a[best])?j:best,null);
        const bland=!d&&minScore!==null&&!s.z.a[minScore].eq(s.z.a[s.q]);
        const enteringRule=d?'В выделенной выходящей строке допустимы только aᵢⱼ < 0. Сравните dⱼ/(−aᵢⱼ); при равенстве выберите первый столбец слева.':bland?'На этом шаге действует защита от зацикливания: выберите первый слева столбец с отрицательной оценкой.':'Выберите самую отрицательную оценку; при равенстве — первый столбец слева.';
        const entry=choice(`${prefix} ${k+1}: входящая переменная`,tableau(s,(i,j)=>d?(i===s.p?'learn-relevant':''):(i===s.rows.length?'learn-relevant':'')),enteringRule,vn(s.q),s.cols.filter(j=>j!==s.q).map(j=>[vn(j),'Этот столбец не удовлетворяет указанному правилу выбора. '+enteringRule]),enteringRule,{after:tableau(s,(i,j)=>j===s.q?'learn-relevant':''),tier:1});
        const leavingRule=d?(s.bland?'Среди отрицательных b выберите строку с наименьшим индексом базисной переменной.':'Выберите самое отрицательное b; при равенстве — наименьший индекс базисной переменной.'):'Для выделенного столбца сравните b/a только при a > 0. Выберите минимум; при равенстве — наименьший индекс базисной переменной.';
        const leave=choice(`${prefix} ${k+1}: выходящая строка`,tableau(s,(i,j)=>j===(d?-1:s.q)?'learn-relevant':''),leavingRule,`Строка ${s.p+1}`,s.rows.map((_,i)=>[`Строка ${i+1}`,'Этот выбор нарушает правило минимального допустимого шага или правило разрешения равенств. '+leavingRule]),leavingRule,{after:tableau(s,(i,j)=>i===s.p||j===s.q?'learn-relevant':''),tier:1});
        entry.interaction={kind:'column',values:s.cols.map(j=>vn(j))};
        leave.interaction={kind:'row',values:s.rows.map((_,i)=>`Строка ${i+1}`)};
        out.push(...(d?[leave,entry]:[entry,leave]).filter(stage=>stage.options.length>1));
      }
      out.push(number(`${prefix} ${k+1}: поворот`,tableau(s,(i,j)=>i===s.p||j===s.q?'learn-relevant':''),`Строка ${s.p+1}, столбец ${s.q+1} выделены. На какое число делим ведущую строку?`,s.rows[s.p].a[s.q],'Разделите ведущую строку на элемент пересечения. Затем вычтите её кратные из остальных строк, чтобы столбец стал единичным.',{after,tier:1,interaction:{kind:'cell',row:s.p,col:s.q,values:s.rows.map(row=>Object.fromEntries(s.cols.map(j=>[j,txt(row.a[j])])))} }));
      if(next && next.rows.length===s.rows.length) {
        const b=s.rows[s.p].b, a=s.rows[s.p].a[s.q];
        if(!(b instanceof QM) || b.m.isZero()) out.push(number(`${prefix} ${k+1}: правая часть`,tableau(s,(i,j)=>i===s.p?'learn-relevant':''),'Чему станет равно b ведущей строки после нормировки?',(b instanceof QM?b.a:b).div(a),'Новое b равно прежнему b, делённому на ведущий элемент. Все элементы строки делятся на одно число.',{after,tier:2}));
      }
    });
    return out;
  }
  function lpStages(rec,dual=false) {
    const p=rec.args[0], r=rec.result, out=[];
    out.push(choice('Подготовка системы',problem(p),'Что необходимо для табличного метода?','Равенства и явно заданный базис',[
      ['Заменить все знаки на ≤ без изменения коэффициентов','Так изменится допустимое множество. Знак меняют вместе с умножением строки на −1.'],
      ['Сразу приравнять все исходные переменные нулю','Такая точка может нарушать ограничения; нужен допустимый базис или вспомогательный этап.']
    ],'Неравенства заменяют равенствами с неотрицательными остатками или излишками. Базис определяет текущую таблицу.',{after:problem(p)}));
    p.rows.forEach((row,i)=>{ if(row.s==='=') return; out.push(choice('Дополнительные переменные',`<p>(${i+1}) ${equation(row)}</p>`,'Какой член добавить слева, чтобы получить равенство (s ≥ 0)?',row.s==='<='?'+s':'−s',[[row.s==='<='?'−s':'+s','Остаток для ≤ прибавляется, излишек для ≥ вычитается.'],['Ничего, просто заменить знак','Это оставит только границу и изменит множество допустимых точек.']],'Для a·x ≤ b остаток s=b−a·x ≥ 0. Для a·x ≥ b излишек s=a·x−b ≥ 0.',{tier:i?2:1,after:`<p>${equation({...row,s:'='})}; слева добавлено ${row.s==='<='?'+s':'−s'}, s ≥ 0.</p>`})); });
    if(r.phase1) {
      out.push(choice('Искусственный базис',tableau(r.phase1.steps[0]),'Что минимизируется на вспомогательном этапе?','Сумма искусственных переменных',[
        ['Исходная целевая функция','Сначала требуется найти допустимый базис исходной системы.'],['Сумма исходных переменных','Она не проверяет возможность обнулить искусственные переменные.']
      ],'Минимум h=Σt должен быть нулём, чтобы искусственные переменные можно было удалить.',{after:tableau(r.phase1.steps[0]),deep:'Нулевая искусственная переменная иногда остаётся базисной: её выводят поворотом либо удаляют зависимую строку. Положительный минимум h означает несовместность.'}));
      out.push(...pivots(r.phase1.steps,false,'Вспомогательный этап'));
      const h=r.phase1.last.z.b.neg();
      out.push(choice('Переход к исходной цели',tableau(r.phase1.last),'Можно ли перейти к исходной задаче?',h.isZero()?'Да, h = 0':'Нет, h > 0',[[h.isZero()?'Нет, h > 0':'Да, h = 0','Проверьте значение h: в таблице записано −h, а не h.']],'Переход допустим только при h=0; ненулевой минимум суммы неотрицательных искусственных переменных доказывает несовместность.',{after:`<p>h = ${f(h)}.</p>`}));
    }
    if(dual) out.push(...pivots(r.steps,true,'Двойственный симплекс'));
    else if(r.phase2) out.push(...pivots(r.phase2.steps));
    const last=r.last;
    const why= r.status==='optimal'?(dual?'В последней таблице b ≥ 0, двойственная допустимость сохранена.':'В последней таблице b ≥ 0 и нет отрицательных оценок разрешённых столбцов.'):r.status==='unbounded'?'У улучшающего столбца нет положительных элементов, ограничивающих шаг.':r.status==='infeasible'?'Трасса установила противоречие допустимости (см. последний вспомогательный этап или строку двойственного симплекса).':'Решатель остановлен без доказанного конечного оптимума.';
    out.push(verdict(r.status,(last?tableau(last):'')+`<p>${why}</p>`));
    return out;
  }
  function graphStages(rec) {
    const p=rec.args[0],r=rec.result,out=[];
    const reduction=get('reduce');
    if(reduction) out.push(choice('Сведение к плоскости',problem(reduction.args[0]),'Как сохранить смысл задачи при переходе к двум координатам?','Выразить остальные переменные и подставить во все условия',[
      ['Отбросить переменные после x₂','Теряются ограничения и вклад в цель.'],['Положить остальные переменные равными нулю','Это может исключить оптимальные точки.']
    ],'Уравнения позволяют выразить зависимые переменные. Их неотрицательность тоже превращается в ограничения на плоскости.',{after:problem(p)}));
    r.lines.forEach((line,i)=>out.push(choice('Допустимая полуплоскость',`<p>${equation(line)}</p>`,'Принадлежит ли начало координат этому ограничению?',line.origin?'Да':'Нет',[[line.origin?'Нет':'Да','Подставьте x₁=x₂=0 и сравните 0 с правой частью с исходным знаком.']],'В начале координат левая часть равна 0. Проверяем исходный знак; при равенстве это точка на границе.',{after:`<p>0 ${esc(line.s)} ${f(line.b)}: ${line.origin?'выполнено':'не выполнено'}.</p>`,tier:i?2:0})));
    const direction=p.sense==='max'?'Вдоль градиента цели':'Против градиента цели';
    out.push(choice('Направление улучшения',`<p>c = (${p.c.map(f).join('; ')}), ${esc(p.sense)}</p>`,'Куда сдвигать линию уровня для улучшения цели?',p.c.every(c=>c.isZero())?'Цель постоянна':direction,[['Цель постоянна','Она постоянна только при нулевых коэффициентах.'],[p.sense==='max'?'Против градиента цели':'Вдоль градиента цели','Учитывайте направление max/min.']],'Градиент указывает направление роста. Для минимума идём в обратную сторону; нулевой градиент означает постоянную цель.',{after:`<p>${p.c.every(c=>c.isZero())?'Цель постоянна':direction}.</p>`}));
    if(r.verts.length) {
      const w=r.verts[0];
      const boundaries=[...p.rows,{a:[ONE(),Z()],b:Z()},{a:[Z(),ONE()],b:Z()}].filter(row=>sum(row.a.map((a,j)=>a.mul(w.p[j]))).eq(row.b));
      let pair=null;
      for(let i=0;i<boundaries.length&&!pair;i++)for(let j=i+1;j<boundaries.length;j++)if(!boundaries[i].a[0].mul(boundaries[j].a[1]).eq(boundaries[i].a[1].mul(boundaries[j].a[0]))){pair=[boundaries[i],boundaries[j]];break;}
      if(pair)out.push(number('Пересечение границ',pair.map(row=>`<p>${equation({...row,s:'='})}</p>`).join(''),'Решите систему границ. Чему равна координата x₁?',w.p[0],'Вершина получается на пересечении независимых границ. После решения системы проверьте остальные ограничения и неотрицательность.',{tier:1,after:`<p>Пересечение: (${w.p.map(f).join('; ')}). Оно удовлетворяет всем ограничениям.</p>`}));
      out.push(number('Сравнение вершин',`<p>Допустимая вершина (${w.p.map(f).join('; ')}).</p><p>c = (${p.c.map(f).join('; ')}), свободный член ${f(p.c0||Z())}.</p>`,'Чему равна цель в этой вершине?',w.f,'Подставьте координаты вершины в цель, включая свободный член. Значения сравнивают только среди допустимых точек.',{tier:1,after:matrix(r.verts.map(v=>[v.p.map(f).join('; '),f(v.f)]),['Допустимая вершина','Цель'])}));
    }
    out.push(verdict(r.status,`<p>Допустимых вершин: ${r.verts.length}. ${r.status==='optimal'?`Лучшее значение ${f(r.f)}; проверка решателем подтверждает конечный оптимум.`:r.status==='unbounded'?'Проверка обнаружила допустимое направление неограниченного улучшения.':'Проверка системы не нашла допустимых точек.'}</p>`,'Геометрический вывод'));
    return out;
  }
  function dualStages(P,D) {
    const out=[choice('Соответствие задач',problem(P),'Чему соответствует одно ограничение прямой задачи?','Одной переменной двойственной задачи',[
      ['Одному ограничению двойственной задачи','Ограничения двойственной соответствуют переменным прямой.'],['Одной вершине допустимого множества','Соответствие строится по строкам и столбцам матрицы, а не вершинам.']
    ],'Матрица транспонируется: m строк → m двойственных переменных, n столбцов → n двойственных ограничений.',{after:`<p>Двойственная: ${D.n} переменных, ${D.rows.length} ограничений, ${esc(D.sense)}.</p>`})];
    P.rows.forEach((r,i)=>out.push(choice('Знаки двойственных переменных',`<p>Прямая задача: ${esc(P.sense)}. Ограничение (${i+1}): ${equation(r)}</p>`,`Какое условие на y${i+1}?`,D.signs?.[i]||'>=',[['>=','Этот знак выбирают с учётом направления цели и знака строки.'],['<=','Этот знак выбирают с учётом направления цели и знака строки.'],['free','Свободная двойственная переменная соответствует равенству.']],'Для max: строка ≤ даёт y≥0, ≥ даёт y≤0; для min — наоборот. Равенство даёт свободную y.',{tier:i?2:0,after:`<p>y<sub>${i+1}</sub>: ${esc(D.signs?.[i]||'>=')} (free — любого знака).</p>`})));
    D.rows.forEach((row,j)=>out.push(number('Транспонирование',problem(P),`Какова правая часть двойственного ограничения для x${j+1}?`,row.b,'Правая часть двойственного ограничения равна коэффициенту cⱼ исходной цели; коэффициенты слева берутся из столбца j.',{tier:j?2:1,after:`<p>${equation(row,'y')}</p>`})));
    out.push(choice('Двойственная цель',`<p>Исходная цель: ${esc(P.sense)}; b = (${P.rows.map(r=>f(r.b)).join('; ')}).</p>`,'Как построить двойственную цель?',D.sense==='min'?'Минимизировать bᵀy':'Максимизировать bᵀy',[[D.sense==='min'?'Максимизировать bᵀy':'Минимизировать bᵀy','Направление цели меняется на противоположное.'],['Использовать c вместо b','Коэффициенты c становятся правыми частями двойственных ограничений.']],'Правые части исходных ограничений становятся коэффициентами двойственной цели; свободный член сохраняется.',{after:`<p>${D.c.map((c,i)=>`${f(c)}·y<sub>${i+1}</sub>`).join(' + ')} → ${esc(D.sense)}</p>`}));
    return out;
  }
  function complement(P,x,checks) {
    const out=checks.map((c,i)=>choice('Дополняющая нежёсткость',`<p>x = (${x.map(f).join('; ')}).</p><p>${equation(P.rows[i])}. Ограничение ${c.tight?'активно (равенство)':'выполнено строго'}.</p>`,`Что следует для y${i+1} именно из этого условия УДН?`,c.tight?'Одно это условие не определяет y':'y = 0',[[c.tight?'y = 0':'Одно это условие не определяет y',c.tight?'Нулевой резерв даёт 0·y=0 при любом y.':'Ненулевой резерв в произведении с y требует y=0.']],'Произведение двойственной переменной и резерва равно нулю. Активность сама по себе не означает, что y обязательно положительна.',{tier:i?2:0,after:`<p>${c.tight?'0·y = 0: используйте остальные УДН и двойственную допустимость.':'Ненулевой резерв ⇒ y = 0.'}</p>`}));
    x.forEach((q,j)=>{if(q.s<=0)return;out.push(choice('Равенства для двойственных переменных',`<p>x<sub>${j+1}</sub> = ${f(q)} > 0. Столбец коэффициентов: (${P.rows.map(r=>f(r.a[j])).join('; ')}); c<sub>${j+1}</sub> = ${f(P.c[j])}.</p>`,'Что требует УДН от соответствующего двойственного ограничения?','Оно выполняется как равенство',[['Его можно не проверять','Положительная прямая переменная требует нулевого двойственного резерва.'],['Соответствующая y обязательно равна нулю','Индекс x соответствует ограничению двойственной задачи, а не отдельной y.']],'Произведение xⱼ и двойственного резерва равно нулю. При xⱼ>0 резерв равен нулю, получаем уравнение для y.',{tier:1,after:`<p>${equation({a:P.rows.map(r=>r.a[j]),s:'=',b:P.c[j]},'y')}</p>`}));});return out;
  }
  function transport(rec) {
    const r=rec.result,P=r.P,out=[];
    const grid=(X)=>matrix(X.map((row,i)=>[`A${i+1}`,...row.map(f)]),['План',...P.b.map((_,j)=>`B${j+1}`)]);
    out.push(choice('Баланс перевозок',`<p>Σa = ${f(P.sa)}, Σb = ${f(P.sb)}. Условия: отгрузка ≤ запас, поставка ≥ спрос.</p>`,'Что требуется при таком балансе?',P.sa.lt(P.sb)?'Спрос невыполним':P.sa.gt(P.sb)?'Добавить фиктивного потребителя':'Баланс уже выполнен',[
      ['Спрос невыполним','Это верно только при недостатке запасов.'],['Добавить фиктивного потребителя','Он поглощает только избыток запасов.'],['Добавить фиктивного поставщика','В показанной постановке нельзя создавать недостающий реальный товар.'],['Баланс уже выполнен','Для баланса суммы должны совпасть.']
    ],'Для показанных неравенств нехватка запасов означает несовместность. Избыток учитывают фиктивным потребителем с нулевым тарифом.',{after:`<p>Разность Σa−Σb = ${f(P.sa.sub(P.sb))}.</p>`}));
    if(!r.first) return out;
    out.push(choice('Выбор начальной клетки',matrix(P.c.map(row=>row.map(f)),P.b.map((_,j)=>`B${j+1}`)),`Как выбираем первую клетку методом «${r.init==='mc'?'минимальная стоимость':'северо-западный угол'}»?`,r.init==='mc'?'Минимальный тариф среди доступных клеток':'Левая верхняя доступная клетка',[[r.init==='mc'?'Левая верхняя доступная клетка':'Минимальный тариф среди доступных клеток','Это правило другого способа построения начального плана.'],['Максимальная возможная перевозка независимо от клетки','Размер перевозки определяют после выбора клетки.']],'Северо-западный угол не использует тарифы; минимальная стоимость сначала сравнивает тарифы доступных клеток.',{after:`<p>Первая клетка трассы: A${r.first.steps[0].i+1}B${r.first.steps[0].j+1}.</p>`,tier:1}));
    r.first.steps.forEach((s,k)=>out.push(number('Начальный план',`<p>Метод: ${r.init==='mc'?'минимальная стоимость':'северо-западный угол'}. Клетка A${s.i+1}B${s.j+1}; остаток запаса ${f(s.a0)}, спроса ${f(s.b0)}${s.c?`, тариф ${f(s.c)}`:''}.</p>`,'Сколько можно перевезти в выбранной клетке?',s.x,'Берём минимум оставшегося запаса и спроса: нельзя превысить ни один из них.',{tier:k?2:0,after:`<p>x<sub>${s.i+1},${s.j+1}</sub> = min(${f(s.a0)}, ${f(s.b0)}) = ${f(s.x)}.</p>`})));
    r.iters.forEach((s,k)=>{
      if(!s.enter) return;
      const [i,j]=s.enter;
      out.push(number('Потенциалы и оценки',grid(s.X)+`<p>Клетка A${i+1}B${j+1}: c=${f(P.c[i][j])}, u=${f(s.pot.u[i])}, v=${f(s.pot.v[j])}.</p>`,'Вычислите оценку Δ = c − u − v.',s.delta[i][j],'Отрицательная оценка означает уменьшение стоимости при вводе свободной клетки; потенциалы удовлетворяют uᵢ+vⱼ=cᵢⱼ в базисе.',{tier:k?1:0,after:`<p>Δ = ${f(s.delta[i][j])}.</p>`,deep:'Если все свободные оценки ≥0, план оптимален. Нулевая оценка может дать другой оптимальный план; вырожденный цикл может иметь нулевой шаг.'}));
      out.push(number('Цикл перераспределения',grid(s.X)+`<p>Цикл: ${s.cyc.map(c=>`${c.sign} A${c.i+1}B${c.j+1}`).join(' → ')}.</p>`,'Каков максимальный шаг θ, сохраняющий неотрицательность?',s.theta,'θ — минимум перевозок в клетках со знаком «−». В плюсовых прибавляем θ, в минусовых вычитаем; суммы строк и столбцов сохраняются.',{after:r.iters[k+1]?grid(r.iters[k+1].X):'',tier:k?1:0}));
    });
    out.push(choice('Оптимальность плана',grid(r.X||r.iters.at(-1).X),'Как проверить оптимальность методом потенциалов?','Все свободные оценки Δ ≥ 0',[
      ['Все перевозки строго положительны','Нулевые базисные перевозки возможны при вырождении.'],['Все свободные оценки Δ ≤ 0','Для минимизации стоимости отрицательная оценка позволяет улучшение.']
    ],'При допустимом плане и uᵢ+vⱼ=cᵢⱼ в базисе неотрицательные свободные оценки удостоверяют минимум.',{after:`<p>Стоимость плана ${f(r.cost)}.</p>`}));
    return out;
  }
  function network(rec) {
    const r=rec.result,out=[];
    if(r.status!=='ok') return [choice('Проверка сети',`<p>Работы: ${r.arcs.map(a=>`${a.i}→${a.j}`).join(', ')}.</p>`,'Можно ли вычислять сроки прямым и обратным проходами?','Нет, сначала устранить некорректность сети',[['Да, начать с любого события','Для прохода требуется непустой ориентированный ациклический граф.']],`Проверка сети: ${r.status}. В цикле нет топологического порядка.`)];
    const net=()=>`<div class="learn-network">${r.arcs.map(a=>`<span>${a.i} ─${f(a.d)}→ ${a.j}</span>`).join(' ')}</div>`;
    r.fwd.filter(s=>s.inc.length).forEach((s,k)=>out.push(number('Ранние сроки',net()+`<p>Событие ${s.e}. tр(i)+dᵢⱼ: ${s.inc.map(v=>`${v.a.i}→${s.e}: ${f(v.v)}`).join('; ')}.</p>`,'Каков ранний срок события?',s.val,'Берём максимум: событие наступит только после завершения всех входящих работ.',{tier:k?1:0,after:`<p>tр(${s.e}) = ${f(s.val)}.</p>`,deep:'Минимум соответствовал бы ожиданию лишь самой быстрой ветви и нарушил бы зависимости.'})));
    r.bwd.filter(s=>s.out.length).forEach((s,k)=>out.push(number('Поздние сроки',net()+`<p>Событие ${s.e}. tп(j)−dᵢⱼ: ${s.out.map(v=>`${s.e}→${v.a.j}: ${f(v.v)}`).join('; ')}. Длительность проекта ${f(r.T)}.</p>`,'Каков поздний срок события без задержки проекта?',s.val,'Берём минимум допустимых сроков по всем исходящим работам; обратный проход начинается со срока T.',{tier:k?2:0,after:`<p>tп(${s.e}) = ${f(s.val)}.</p>`})));
    r.arcInfo.slice(0,3).forEach((a,k)=>out.push(number('Резерв работы',`<p>Работа ${a.i}→${a.j}: d=${f(a.d)}, tр(i)=${f(r.tp[r.events.indexOf(a.i)])}, tп(j)=${f(r.tn[r.events.indexOf(a.j)])}.</p>`,'Вычислите полный резерв работы.',a.full,'Полный резерв равен tп(j)−tр(i)−dᵢⱼ. Нулевой резерв означает критическую работу.',{tier:k?2:0,after:`<p>Резерв ${f(a.full)}; ${a.crit?'критическая работа':'работу можно задержать в пределах резерва'}.</p>`})));
    out.push(choice('Критический путь',net(),'Какие работы образуют критический путь?','Связная цепочка работ с нулевым полным резервом',[
      ['Работы с наибольшей отдельной длительностью','Нужна связная цепочка, определяющая длительность всего проекта.'],['Любые события с нулевым резервом','Нужно проверить соединяющие их работы и связность пути.']
    ],'Критический путь идёт от начала к завершению проекта по критическим работам; его длительность равна T.',{after:`<p>T = ${f(r.T)}. Пути: ${r.paths.map(p=>[p[0].i,...p.map(a=>a.j)].join(' → ')).join('; ')}.</p>`})); return out;
  }
  function game(rec) {
    const r=rec.result, grid=matrix(r.C.map(row=>row.map(f)),r.C[0].map((_,j)=>`B${j+1}`));
    const out=[number('Нижняя цена игры',grid,'Найдите α = maxᵢ minⱼ aᵢⱼ.',r.lower,'Сначала минимум каждой строки (худший ответ соперника), затем максимум этих гарантий.',{after:`<p>Минимумы строк: ${r.rowMin.map(f).join('; ')}. α=${f(r.lower)}.</p>`}),number('Верхняя цена игры',grid,'Найдите β = minⱼ maxᵢ aᵢⱼ.',r.upper,'Второй игрок минимизирует максимальный проигрыш: максимум каждого столбца, затем минимум.',{after:`<p>Максимумы столбцов: ${r.colMax.map(f).join('; ')}. β=${f(r.upper)}.</p>`,tier:1}),choice('Седловая точка',`<p>α=${f(r.lower)}, β=${f(r.upper)}.</p>`,'Какие стратегии требуются?',r.saddle?'Достаточно чистых стратегий':'Нужны смешанные стратегии',[[r.saddle?'Нужны смешанные стратегии':'Достаточно чистых стратегий','Чистая седловая точка существует тогда и только тогда, когда α=β.']],'При α=β строка и столбец седловой точки дают оптимальные чистые стратегии. При α<β ищем вероятностные смеси.',{after:`<p>${r.saddle?'Седловые клетки: '+r.points.map(([i,j])=>`A${i+1}B${j+1}`).join('; '):'Переходим к задаче ЛП для смешанных стратегий.'}</p>`})];
    if(r.status==='mixed') {
      out.push(number('Нормировка вероятностей',`<p>Вспомогательные веса p = (${r.sol.x.map(f).join('; ')}), Σp=${f(r.sumP)}.</p>`,'Чему равна вероятность первой стратегии x₁=p₁/Σp?',r.x[0],'Веса решения ЛП нормируются на сумму, поэтому вероятности неотрицательны и в сумме дают 1.',{after:`<p>x=(${r.x.map(f).join('; ')}), y=(${r.y.map(f).join('; ')}).</p>`,tier:1}));
      out.push(number('Цена исходной игры',`<p>Цена сдвинутой игры ${f(r.vprime)}; к каждому выигрышу прибавлено k=${f(r.k)}.</p>`,'Какова цена исходной игры?',r.value,'Вычтите сдвиг k: он меняет цену, но не оптимальные стратегии.',{after:`<p>v = ${f(r.value)}.</p>`}));
    } return out;
  }
  const canonState = s => `<p>${s.obj.terms.map(t=>`${f(t.c)}·${esc(t.v)}`).join(' + ')} + ${f(s.obj.c0)} → ${esc(s.obj.sense)}</p>${s.rows.map(r=>`<p>${r.terms.map(t=>`${f(t.c)}·${esc(t.v)}`).join(' + ')} ${esc(r.s)} ${f(r.b)}</p>`).join('')}`;
  function canonical(rec) {
    const r=rec.result, out=[]; let prev=r.state0;
    for(const s of r.steps) {
      const before=canonState(prev),after=canonState(s.state); prev=s.state;
      if(s.kind==='subst') out.push(choice('Замена переменной',before,`Какая замена x${s.j+1} сохраняет её ограничения?`,s.text.replace(/<[^>]*>/g,''),[['Положить исходную переменную равной нулю','Это удалит допустимые значения.'],['Объявить исходную переменную неотрицательной без замены','Условия на знак нельзя менять без эквивалентного преобразования.']],s.vkind==='free'?'Свободную переменную представляют разностью двух неотрицательных.':'Подстановка учитывает границу или фиксированное значение и выполняется во всех строках и цели.',{after,deep:'Проверьте обратную замену. Для двусторонней границы сохраняется дополнительное верхнее ограничение; свободный член цели тоже меняется.'}));
      else if(s.kind==='slack') out.push(choice('Равенства',before,'Как превратить неравенства в эквивалентные равенства?','Для ≤ добавить остаток, для ≥ вычесть излишек',[['Просто заменить все знаки на =','Тогда остаются только границы полупространств.'],['Добавить положительный остаток при любом знаке','Знак дополнительной переменной зависит от направления неравенства.']],'Все дополнительные переменные неотрицательны. Исходные равенства не требуют остатка.',{after}));
      else if(s.kind==='min') out.push(choice('Направление цели',before,'Как получить минимизацию?',s.same?'Сохранить исходную цель':'Минимизировать отрицание всей цели',[[s.same?'Минимизировать отрицание всей цели':'Изменить только надпись max на min','Значения цели и направление предпочтения должны оставаться согласованными.']],'max f эквивалентно min(−f); при уже заданном min цель сохраняется.',{after}));
      else out.push(verdict('infeasible',before+'<p>Нижняя граница переменной больше верхней.</p>','Совместность границ'));
    } return out;
  }
  function gomory(rec) {
    const r=rec.result,out=[];
    out.push(...lpStages({args:[r.pr],result:r.lp}).map(s=>({...s,tier:Math.max(1,s.tier)})));
    if(r.lpX) out.push(choice('Целочисленность релаксации',`<p>x ЛП=(${r.lpX.map(f).join('; ')}).</p>`,'Можно ли принять этот оптимум ЛП как целочисленный?',r.lpX.every(q=>q.isInt())?'Да, все координаты целые':'Нет, требуется отсечение',[[r.lpX.every(q=>q.isInt())?'Нет, требуется отсечение':'Да, округлить координаты','Округление может нарушить ограничения и не доказывает оптимальность.']],'Целый оптимум релаксации оптимален и среди целых точек; дробный оптимум требует продолжения.',{after:`<p>Трасса строит отсечений: ${r.cuts}.</p>`}));
    r.steps.forEach((s,k)=>{ if(s.kind!=='cut') {out.push(...pivots(r.steps.slice(k,k+2),true,`Пересчёт ${k+1} ·`,true).map(t=>({...t,tier:Math.max(1,t.tier)})));return;} const c=s.cut;
      if(s.rows.length>1)out.push(choice('Выбор дробной строки',tableau(s),'Выберите строку с наибольшей дробной частью b; при равенстве — наименьший индекс базисной переменной.',`Строка ${s.p+1}`,s.rows.map((_,i)=>[`Строка ${i+1}`,'Сравнивайте именно b−floor(b), а не величины b. Целые строки не дают нужного отсечения.']),'Правило текущего решателя выбирает максимальную дробную часть; при равенстве используется индекс базисной переменной.',{tier:1,after:tableau(s,(i)=>i===s.p?'learn-relevant':'')}));
      out.push(number('Дробная часть и отсечение',tableau(s,(i)=>i===s.p?'learn-relevant':'')+`<p>Выбрана строка ${s.p+1}; b=${f(c.b)}.</p>`,'Чему равна дробная часть b − floor(b)?',c.fb,'Дробная часть всегда в [0,1). Для отрицательных чисел floor округляет вниз, а не к нулю.',{after:`<p>${c.parts.map(t=>`${f(t.f)}·${R.vname(s.vars,t.j)}`).join(' + ')} ≥ ${f(c.fb)}</p>`+(r.steps[k+1]?tableau(r.steps[k+1]):''),tier:k?1:0,deep:'Отсечение сохраняет все целые допустимые точки и исключает текущую дробную вершину. Перед ним решатель умножает дробные строки на НОК знаменателей, обеспечивая целочисленность добавочных переменных.'}));
    });
    out.push(verdict(r.status,(r.last?tableau(r.last):'')+`<p>Отсечений: ${r.cuts}. ${r.status==='optimal'?'Все базисные значения целые; критерий ЛП выполнен.':r.status==='limit'?'Лимит отсечений не доказывает оптимальность. Исходный разбор отдельно сверяет результат ветвями и границами.':r.status==='noint'?'После отсечения система несовместна.':'Смотрите критерий остановки релаксации.'}</p>`)); return out;
  }
  function build(state,variant) {
    let out=[], rec;
    if(variant?.broken) return [choice('Неполное условие','<p>В источнике ограничение напечатано без знака или правой части.</p>','Как поступить с такой задачей?','Запросить полное условие',[['Молча дописать знак и ноль','Это будет другая задача без подтверждения исходных данных.']],'Сохраните исходное предупреждение; однозначного решения без полного условия нет.')];
    const type=state.type;
    if(type==='graph') { rec=get('graph'); if(rec) out=graphStages(rec); else { rec=get('reduce'); if(rec) out=[choice('Границы графического метода',problem(rec.args[0]),'Можно ли продолжить построение на плоскости x₁,x₂?','Нет, данное сведение не применимо',[['Да, отбросить оставшиеся переменные','Это меняет задачу.']],rec.result.reason||'Сведение к двум координатам не удалось. Исходный разбор показывает результат табличного метода.')]; } }
    else if(['simplex','artificial','dsx','dsimplex'].includes(type)) { rec=get(type==='dsx'||type==='dsimplex'?'dsx':'lp'); if(rec) out=lpStages(rec,type==='dsx'||type==='dsimplex'); }
    else if(type==='dual') {
      rec=get('dualOf')||get('dual');
      if(rec) { const old=rec.key==='dual'; const P=old?{...rec.args[0],rows:rec.result.norm}:rec.args[0],D=old?rec.result.D:rec.result;
        out=dualStages(P,D);
        if(old && rec.result.primal?.status==='optimal') out.push(...complement(P,rec.result.primal.x,ALG.check(P,rec.result.primal.x)));
      }
    }
    else if(type==='duality') { rec=get('duality'); if(rec) {const r=rec.result; out=dualStages(r.P,r.D); if(r.x && r.y) {out.push(...complement(r.P,r.x,r.csRows)); out.push(number('Равенство оптимумов',`<p>y=(${r.y.map(f).join('; ')}), b=(${r.D.c.map(f).join('; ')}), свободный член ${f(r.D.c0||Z())}.</p>`,'Вычислите значение двойственной цели.',r.g,'Для допустимой пары равенство целей удостоверяет оптимальность. Добавьте свободный член, если он есть.',{after:`<p>L*=${f(r.L)}, g*=${f(r.g)}.</p>`}));} else out.push(verdict(r.statusP,`<p>Статус прямой задачи: ${esc(r.statusP)}; двойственной: ${esc(r.statusD)}.</p>`)); } }
    else if(type==='optcheck') { rec=get('optcheck'); if(rec) {const p=rec.args[0],r=rec.result; out=r.rowCheck.map((c,i)=>choice('Допустимость вектора',`<p>x̄=(${r.x.map(f).join('; ')}).</p><p>(${i+1}) ${equation(p.rows[i])}; левая часть ${f(c.lhs)}.</p>`,'Выполнено ли это ограничение?',c.ok?'Да':'Нет',[[c.ok?'Нет':'Да','Сравните вычисленную левую часть с правой, сохранив исходный знак.']],'Оптимальный вектор должен удовлетворять каждому ограничению и условиям на знак.',{tier:i?1:0,after:`<p>${f(c.lhs)} ${esc(p.rows[i].s)} ${f(p.rows[i].b)} — ${c.ok?'выполнено':'нарушено'}.</p>`})); if(r.feasible) out.push(...complement(p,r.x,r.rowCheck)); out.push(choice('Сертификат оптимальности',`<p>Вектор ${r.feasible?'допустим':'недопустим'}. ${r.feasible?(r.optimal?'Найден двойственный допустимый y, удовлетворяющий УДН.':'Система двойственной допустимости и УДН несовместна.'):'Нарушены ограничения или условия на знак.'}</p>`,'Какой итог проверки?',r.optimal?'Вектор оптимален':'Вектор не оптимален',[[r.optimal?'Вектор не оптимален':'Вектор оптимален','Допустимость необходима; достаточность доказывается двойственным сертификатом с УДН.']],'Допустимость вместе с допустимым двойственным вектором и УДН удостоверяет оптимальность.',{after:r.y?`<p>y=(${r.y.map(f).join('; ')}), g=${f(r.g)}.</p>`:'<p>Условия оптимальности не выполнены.</p>'})); } }
    else if(type==='transp') {rec=get('transp');if(rec)out=transport(rec);}
    else if(type==='netw') {rec=get('netw');if(rec)out=network(rec);}
    else if(type==='game') {rec=get('game');if(rec)out=game(rec);}
    else if(type==='canon') {rec=get('canon');if(rec)out=canonical(rec);}
    else if(type==='ilp'||type==='gomory') {rec=get('gomory');if(rec)out=gomory(rec);}
    return out.map((s,i)=>({...s,id:`${type}-${i}`}));
  }
  function registry() {
    return [['rgr',DB],['zyk',DB_ZYK]].flatMap(([src,db])=>Object.entries(db.types).flatMap(([type,t])=>type==='dual'&&src==='rgr'?t.bases.map(b=>({src,type,base:b.type,title:`${t.short} (${b.label})`,variants:DB.types[b.type].variants})): [{src,type,title:t.short,variants:t.variants||[]}])).filter(t=>t.variants.length);
  }
  function accept(step,value) { if(step.numeric) {try{return Q.parse(value).eq(Q.parse(step.answer));}catch(_){return false;}} return String(value)===step.answer; }
  function selectStages(all,settings=data.settings) {
    const threshold={brief:0,detail:1,deep:2}[settings.depth]??1;
    let picked=all.filter(s=>s.tier<=threshold);
    if(settings.mode==='quiz' && picked.length>5) picked=Array.from({length:5},(_,i)=>picked[Math.round(i*(picked.length-1)/4)]);
    return picked;
  }
  function digest(s) { let h=2166136261; for(const c of s) h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(36); }
  function options(step) {
    let opts=step.options;
    if(step.numeric) {
      const q=Q.parse(step.answer), vals=[q,q.neg(),q.add(ONE()),q.sub(ONE()),Z()];
      opts=[...new Map(vals.map(v=>[txt(v),{value:txt(v),label:txt(v),why:'Проверьте знак, формулу и арифметику. '+step.reason}])).values()].slice(0,4);
    }
    const unique=[...new Map(opts.map(o=>[o.value,o])).values()];
    // Stable permutation: no answer-position cue, stable across retries/reload.
    return unique.map(o=>({...o,sort:digest(step.id+o.value)})).sort((a,b)=>a.sort.localeCompare(b.sort));
  }
  function mount(state,structure) {
    recording=false; context={state:{...state},structure,variant:structure.variants.find(v=>v.v===state.v)};
    document.getElementById('learning')?.remove();
    root=document.createElement('section'); root.id='learning';root.className='card';root.setAttribute('aria-label','Обучение');
    document.getElementById('solution').before(root);
    if(state.trainer) active=false;
    let all;
    try { all=build(state,state.mode==='db'?context.variant:null); }
    catch(error) { console.error('Учебный адаптер:',error); all=[]; }
    // Reuse the actual graph produced by the selected task after the final decision.
    if(['graph','netw'].includes(state.type)&&all.length) {
      const visual=document.querySelector('#solution #plot svg, #solution #graph svg');
      if(visual) { const clone=visual.cloneNode(true); clone.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));clone.removeAttribute('id');all[all.length-1].after+=`<div class="learn-scroll">${clone.outerHTML}</div>`; }
    }
    allStages=all;stages=selectStages(all);
    signature=digest(JSON.stringify([state.src,state.type,state.base,state.mode,state.v,state.tinit,all.map(s=>[s.id,s.before,s.answer]),data.settings]));
    session=data.sessions[signature]||{index:0,answers:{},done:false};
    if(session.index>stages.length) session={index:0,answers:{},done:false};
    data.sessions[signature]=session;
    // Bound local history; preserve the current session.
    const keys=Object.keys(data.sessions); if(keys.length>80) keys.slice(0,keys.length-80).forEach(k=>{if(k!==signature)delete data.sessions[k];});
    draw();
  }
  const button=(label,action,cls='')=>`<button type="button" class="btn ${cls}" data-learn="${action}">${label}</button>`;
  function draw() {
    stop();
    const hidden=active && stages.length>0 && session.index<stages.length;
    document.getElementById('solution').hidden=hidden;
    document.getElementById('secnav').hidden=hidden;
    root.innerHTML=`<div class="learn-top"><div><h2>Обучение</h2><p class="kbd">От понимания метода к самостоятельному решению</p></div>${button(active?'Закрыть обучение':'Начать обучение','toggle','primary')}</div>`;
    if(!active) {root.innerHTML+=`<p>Разбирайте решение по шагам, выбирайте действия в таблицах и проверяйте себя. Шесть режимов — от знакомства с методом до подготовки к экзамену.</p>`;bindUI();return;}
    root.innerHTML+=`<div class="learn-settings"><label>Режим<select id="learn-mode">${Object.entries(modes).map(([k,v])=>`<option value="${k}"${k===data.settings.mode?' selected':''}>${v}</option>`).join('')}</select></label><label>Глубина<select id="learn-depth">${[['brief','Кратко'],['detail','Подробно'],['deep','Глубоко']].map(([k,v])=>`<option value="${k}"${k===data.settings.depth?' selected':''}>${v}</option>`).join('')}</select></label><label>Подсказки<select id="learn-hint">${[['now','Сразу'],['error','После ошибки'],['request','По запросу']].map(([k,v])=>`<option value="${k}"${k===data.settings.hint?' selected':''}>${v}</option>`).join('')}</select></label></div><p>${descriptions[data.settings.mode]}</p>`;
    if(!storageOK) root.innerHTML+='<p class="note warn">Браузер не разрешил сохранение: прогресс доступен только до закрытия страницы.</p>';
    const note=context.variant?.note;
    if(context.state.mode==='db'&&(note||context.variant?.warn))root.innerHTML+=`<div class="note warn">Примечание источника: ${note||esc(context.variant.warn)}</div>`;
    if(data.settings.mode==='exam')root.innerHTML+=`<p class="kbd">${data.exam?`Экзаменационная подборка: задача ${data.exam.at+1} из ${data.exam.queue.length}.`:'Начните подборку из шести разделов.'}</p>${button(data.exam?'Новая подборка':'Начать смешанную подборку','exam')}`;
    if(!stages.length)root.innerHTML+='<p class="note warn">Учебные этапы не получены. Введите корректное условие и нажмите «Решить»; полный разбор остаётся доступным.</p>';
    else if(session.index>=stages.length) drawEnd();
    else drawStep();
    root.innerHTML+=`<details class="learn-history"><summary>Освоение тем и локальный прогресс</summary><p>Сохраняются ответы по этапам, ошибки, использование помощи и завершённые прохождения. Данные остаются в этом браузере.</p><p>Лучшая серия: ${data.best}.</p>${Object.entries(data.topics).map(([k,t])=>`<p>${esc(t.title)}: ${t.mastered?'✓ освоено самостоятельно':'в работе'}, завершено ${t.completed}.</p>`).join('')||'<p>Завершённых тем пока нет.</p>'}${button('Сбросить учебный прогресс','reset')}</details>`;
    bindUI();
  }
  function drawStep() {
    const s=stages[session.index],a=session.answers[s.id]||{},mode=data.settings.mode;
    const condition=document.querySelector('#solution #cond');
    const direct=s.interaction && ['next','quiz','self','exam'].includes(mode) && !(s.numeric&&['self','exam'].includes(mode));
    root.innerHTML+=`<div class="learn-progress"><label for="learn-progress">Этап ${session.index+1} из ${stages.length} · серия ${data.streak}</label><progress id="learn-progress" max="${stages.length}" value="${session.index+(a.solved?1:0)}"></progress></div>${condition?`<details><summary>Условие выбранной задачи</summary>${condition.innerHTML}</details>`:''}<h3 tabindex="-1" id="learn-heading">${esc(s.title)}</h3><p class="learn-question" id="learn-question">${esc(s.prompt)}</p>${direct&&!a.solved?`<p class="learn-instruction">${{column:'Выберите заголовок столбца прямо в таблице.',row:'Выберите строку нажатием на её базисную переменную.',cell:'Нажмите на ведущий элемент в таблице.'}[s.interaction.kind]} Можно пользоваться Tab и Enter.</p>`:''}<div class="learn-situation">${s.before}</div>`;
    if(!a.solved) {
      if(mode==='understand')root.innerHTML+=`<p>${esc(s.reason)}</p>${button('Показать преобразование','reveal','primary')}`;
      else if(mode==='error') {
        const opts=options(s),candidate=opts[session.index%opts.length];
        root.innerHTML+=`<p>Студент предлагает: <strong>${esc(candidate.label)}</strong>. Оцените этот выбор.</p><div class="learn-answers">${[true,false].map(v=>`<button class="btn" type="button" data-assess="${v}" data-candidate="${esc(candidate.value)}">${v?'Верно':'Ошибка'}</button>`).join('')}</div>`;
      } else if(s.numeric && (mode==='self'||mode==='exam'))root.innerHTML+='<form id="learn-answer-form"><label for="learn-answer">Ваш ответ (например, −3/7 или 1,25)</label><div class="learn-input"><input id="learn-answer" autocomplete="off" inputmode="text" required><button class="btn primary" type="submit">Проверить</button></div></form>';
      else root.innerHTML+=`${direct?'<details class="learn-alternative"><summary>Ответить списком вариантов</summary>':''}<div class="learn-answers">${options(s).map(o=>`<button class="btn" type="button" data-answer="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div>${direct?'</details>':''}`;
      const autoHint=data.settings.hint==='now'||data.settings.hint==='error'&&a.errors>0;
      if(mode!=='understand')root.innerHTML+=`<div class="btnrow">${button('Подсказка','hint')}${button('Показать объяснение / сдаться','reveal')}</div>`;
      if(a.hint || autoHint) {if(!a.hint){a.hint=true;session.answers[s.id]=a;save();}root.innerHTML+=`<p class="note">${esc(s.hint)}</p>`;}
    }
    root.innerHTML+=`<div id="learn-feedback" tabindex="-1" role="status" aria-live="polite">${a.solved&&!a.revealed?'<span class="learn-success"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14"/><path d="M9 16l5 5 10-11"/></svg><strong>Верно, можно двигаться дальше</strong></span>':''}${a.feedback?`<p class="note ${a.solved?'ok':'bad'}">${esc(a.feedback)}</p>`:''}</div>`;
    if(a.solved)root.innerHTML+=`${data.settings.depth==='deep'?`<p class="note">${esc(s.deep)}</p>`:''}<div class="learn-view-controls" role="group" aria-label="Просмотр преобразования">${[['before','До шага'],['after','После шага'],['compare','Сравнить рядом']].map(([k,label])=>`<button class="btn" type="button" data-view="${k}" aria-pressed="${k==='after'}">${label}</button>`).join('')}</div><div id="learn-transformation" class="learn-transformation"><h4>После шага</h4>${s.after}</div><div class="btnrow">${button('Повторить преобразование','replay')}${button('Остановить анимацию','stop')}${button(session.index===stages.length-1?'Завершить':'Следующий этап','next','primary')}</div>`;
    root.innerHTML+=`<div class="btnrow">${session.index?button('Предыдущий этап','previous'):''}${button('Начать прохождение заново','restart')}</div>`;
  }
  function drawEnd() {
    if(!session.done) {
      session.done=true; const answers=Object.values(session.answers), errors=answers.reduce((n,a)=>n+(a.errors||0),0),help=answers.some(a=>a.hint||a.revealed);
      const k=context.state.src+':'+context.state.type, old=data.topics[k]||{title:context.structure.short,completed:0,mastered:false};
      old.completed++;old.mastered ||= !errors&&!help&&['self','next','exam'].includes(data.settings.mode); data.topics[k]=old; save();
    }
    const answers=Object.values(session.answers),errors=answers.reduce((n,a)=>n+(a.errors||0),0),help=answers.filter(a=>a.hint||a.revealed).length;
    const weak=[...new Set(stages.filter(s=>{const a=session.answers[s.id];return a&&(a.errors||a.hint||a.revealed);}).map(s=>s.skill))];
    root.innerHTML+=`<h3 tabindex="-1" id="learn-heading">Прохождение завершено</h3><p>${stages.length} этапов · ошибок ${errors} · этапов с помощью ${help}.</p><p>${!errors&&!help&&data.settings.mode!=='understand'?'✓ Самостоятельное прохождение без подсказок.':'Вы разобрали метод; повторите трудные этапы самостоятельно.'}</p><p>${weak.length?'Повторить: '+weak.map(esc).join(', '):'Сильная сторона: последовательное применение правил выбранного метода.'}</p><p>Полное решение, итоговый ответ, графики и исходные анимации открыты ниже.</p><div class="btnrow">${button('Повторить задачу','restart')}${data.settings.mode==='exam'&&data.exam?button(data.exam.at+1<data.exam.queue.length?'Следующая тема экзамена':'Завершить подборку','exam-next','primary'):''}</div>`;
  }
  function respond(value,assessment,cell) {
    const s=stages[session.index],a=session.answers[s.id]||{errors:0}; if(a.solved)return;
    const correct=(assessment===undefined?accept(s,value):assessment===accept(s,value))&&(!cell||(cell.row===s.interaction.row&&cell.col===s.interaction.col));
    if(correct) {a.solved=true;a.feedback='Верно. '+s.reason; if(!a.errors&&!a.hint){data.streak++;data.best=Math.max(data.best,data.streak);}else data.streak=0;}
    else {a.errors=(a.errors||0)+1;data.streak=0;a.feedback=(cell?'Выбран другой элемент таблицы. Нужна ячейка на пересечении ведущей строки и столбца.':assessment!==undefined?'Проверьте оценку предложенного рассуждения. '+s.reason:(s.options?.find(o=>o.value===value)?.why||'Проверьте вычисление. '+s.reason))+' Попробуйте ещё раз.';}
    session.answers[s.id]=a;save();draw();root.querySelector('#learn-feedback')?.focus({preventScroll:true});if(correct){animate();celebrate();}
  }
  function celebrate() {
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const badge=root.querySelector('.learn-success'),path=badge?.querySelector('path');
    if(badge)animations.push(badge.animate([{opacity:0,transform:'translateY(5px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'}));
    if(path)animations.push(path.animate([{strokeDasharray:'32',strokeDashoffset:32},{strokeDasharray:'32',strokeDashoffset:0}],{duration:450,easing:'ease-out'}));
    const progress=root.querySelector('progress');if(progress)animations.push(progress.animate([{opacity:.45},{opacity:1}],{duration:500}));
  }
  function inspect(view) {
    stop();const s=stages[session.index],target=root.querySelector('#learn-transformation');if(!target)return;
    root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    target.innerHTML=view==='compare'?`<div class="learn-compare"><div><h4>До шага</h4>${s.before}</div><div><h4>После шага</h4>${s.after}</div></div>`:view==='before'?'<h4>До шага</h4>'+s.before:'<h4>После шага</h4>'+s.after;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)animations.push(target.animate([{opacity:.6,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:220}));
  }
  function bindTable() {
    const s=stages[session.index],a=s&&session.answers[s.id];
    if(!s?.interaction||a?.solved||!['next','quiz','self','exam'].includes(data.settings.mode)||(s.numeric&&['self','exam'].includes(data.settings.mode)))return;
    const table=root.querySelector('.learn-situation table'),pick=s.interaction;if(!table)return;
    const add=(cell,value,label,position)=>{
      if(!cell)return;const b=document.createElement('button');b.type='button';b.className='learn-pick';b.innerHTML=cell.innerHTML;b.setAttribute('aria-label',label);b.setAttribute('aria-describedby','learn-question');b.dataset.pick=value;
      if(position){b.dataset.row=position.row;b.dataset.col=position.col;}
      b.onclick=()=>respond(value,undefined,position);cell.replaceChildren(b);
      b.onpointerenter=b.onfocus=()=>{const tr=cell.closest('tr');if(pick.kind==='row')tr.classList.add('learn-hover');else if(pick.kind==='column')table.querySelectorAll('tr').forEach(row=>row.children[cell.cellIndex]?.classList.add('learn-hover'));};
      b.onpointerleave=b.onblur=()=>table.querySelectorAll('.learn-hover').forEach(el=>el.classList.remove('learn-hover'));
    };
    if(pick.kind==='column')pick.values.forEach((v,i)=>add(table.querySelectorAll('thead th')[i+2],v,'Выбрать столбец '+v));
    if(pick.kind==='row')pick.values.forEach((v,i)=>add(table.querySelectorAll('tbody tr')[i]?.children[0],v,'Выбрать '+v.toLowerCase()));
    if(pick.kind==='cell')table.querySelectorAll('tbody td[data-i][data-j]').forEach(cell=>{const row=Number(cell.dataset.i),col=Number(cell.dataset.j),v=pick.values[row]?.[col];if(v!==undefined)add(cell,v,`Строка ${row+1}, столбец ${col+1}, значение ${v}`,{row,col});});
  }
  async function animate() {
    stop(); const target=document.getElementById('learn-transformation');if(!target)return;
    root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='after')));
    const s=stages[session.index],epoch=animationEpoch;
    target.innerHTML='<h4>После шага</h4>'+s.after;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    target.innerHTML='<h4>До преобразования</h4>'+s.before;
    const transition=target.animate([{opacity:1},{opacity:.35}],{duration:450});animations.push(transition);
    try {await transition.finished;}catch(_){return;}
    if(epoch!==animationEpoch||!target.isConnected)return;
    target.innerHTML='<h4>После шага</h4>'+s.after;
    // Highlight cells whose actual trace values changed, not a decorative whole-page animation.
    const before=document.createElement('div'); before.innerHTML=s.before;
    const cells=target.querySelectorAll('td[data-i][data-j]');
    cells.forEach(c=>{const old=before.querySelector(`td[data-i="${c.dataset.i}"][data-j="${c.dataset.j}"]`);if(!old||old.textContent!==c.textContent)animations.push(c.animate([{background:'#c7e8dd'},{background:'transparent'}],{duration:1000}));});
    if(!cells.length){const pieces=[...target.children].filter(el=>el.tagName!=='H4');pieces.forEach((el,i)=>animations.push(el.animate([{opacity:.25,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,delay:Math.min(i,5)*65,easing:'ease-out',fill:'backwards'})));}
  }
  function goExam(item) { Object.assign(APP.state,{src:item.src,type:item.type,base:item.base||'graph',v:item.v,mode:'db',trainer:false,tinit:null,lastCustom:null});active=true;APP.render();root.scrollIntoView({block:'start'}); }
  function newExam() {
    const pool=registry().filter(t=>!t.base),chosen=[];
    for(let i=0;i<6;i++){const eligible=pool.filter(t=>t.src===(i%2?'zyk':'rgr')&&!chosen.some(c=>c.type===t.type));const t=eligible[Math.floor(Math.random()*eligible.length)];if(!t)continue;const variants=t.variants.filter(v=>!v.broken);const v=variants[Math.floor(Math.random()*variants.length)];if(v)chosen.push({src:t.src,type:t.type,v:v.v});}
    data.exam={at:0,queue:chosen};data.settings.mode='exam';data.settings.hint='error';save();goExam(chosen[0]);
  }
  function bindUI() {
    root.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>{
      const action=b.dataset.learn,s=stages[session.index];
      if(action==='toggle'){active=!active;if(active&&APP.state.trainer){APP.state.trainer=false;APP.render();}else draw();}
      if(action==='hint'){const a=session.answers[s.id]||{errors:0};a.hint=true;session.answers[s.id]=a;data.streak=0;save();draw();}
      if(action==='reveal'){const a=session.answers[s.id]||{errors:0};Object.assign(a,{solved:true,revealed:true,feedback:`Ответ: ${s.answer}. ${s.reason}`});session.answers[s.id]=a;data.streak=0;save();draw();animate();}
      if(action==='next'&&session.answers[s.id]?.solved){session.index++;save();draw();root.querySelector('#learn-heading')?.focus();}
      if(action==='previous'){session.index=Math.max(0,session.index-1);save();draw();}
      if(action==='restart'){session={index:0,answers:{},done:false};data.sessions[signature]=session;save();draw();}
      if(action==='replay')animate();
      if(action==='stop'){stop();root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='after')));const target=root.querySelector('#learn-transformation');if(target)target.innerHTML='<h4>После шага</h4>'+s.after;}
      if(action==='reset'){data=fresh();session={index:0,answers:{},done:false};try{localStorage.removeItem(KEY);}catch(_){} APP.render();}
      if(action==='exam')newExam();
      if(action==='exam-next') {if(data.exam.at+1<data.exam.queue.length){data.exam.at++;data.settings.hint=data.exam.at>=2?'request':'error';save();goExam(data.exam.queue[data.exam.at]);}else {delete data.exam;save();draw();}}
    });
    root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>respond(b.dataset.answer));
    root.querySelectorAll('[data-assess]').forEach(b=>b.onclick=()=>respond(b.dataset.candidate,b.dataset.assess==='true'));
    root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>inspect(b.dataset.view));
    bindTable();
    const form=root.querySelector('#learn-answer-form');if(form)form.onsubmit=e=>{e.preventDefault();respond(root.querySelector('#learn-answer').value);};
    ['mode','depth','hint'].forEach(k=>{const el=root.querySelector('#learn-'+k);if(el)el.onchange=()=>{data.settings[k]=el.value;save();APP.render();};});
    // Cloned condition is informational, so strip duplicate IDs from the original solution.
    root.querySelectorAll('details [id]').forEach(el=>el.removeAttribute('id'));
  }
  return {begin,mount,registry,build,selectStages,accept,options,get active(){return active;},get allStages(){return allStages;},get stages(){return stages;},get session(){return session;}};
})();
