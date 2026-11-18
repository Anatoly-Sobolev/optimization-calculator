import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Play,Pause,RotateCcw} from 'lucide-react';
import {lessonContext} from './lesson-context.jsx';

const t=LU.txt,sub=LU.sub;
const token=(id,value)=><mark key={id} data-carry={id}>{t(value)}</mark>;
const math=html=><div className="worked-math" dangerouslySetInnerHTML={{__html:html}}/>;
const sequence=(title,...frames)=>({title,frames});
const join=(nodes,sep)=>nodes.map((node,i)=><React.Fragment key={i}>{i>0&&sep}{node}</React.Fragment>);
const vname=(s,j)=>LU.plain(R.vname(s.vars,j).replace(/<sub>(\d+)<\/sub>/g,(_,n)=>sub(n)));
const linear=row=>math(R.lin(row.a,j=>R.xv(j+1))+' '+R.sg(row.s)+' '+LU.f(row.b));

function prepare(step,data){
  const row=step.slackRow||step.startingRow,i=step.slackIndex||0;
  const world=lessonContext(data),[name,unit]=world.rows[i]||['Строка '+(i+1),'ед.'];
  const left=<span dangerouslySetInnerHTML={{__html:R.lin(row.a,j=>R.xv(j+1))}}/>, limit=token('limit',row.b);
  if(step.startingRow&&row.s!=='='){
    const le=row.s==='<=';
    return sequence('Какие числа понадобятся в первой таблице?',
      ['В каждом ограничении одна строка. Начните со строки «'+name+'».',linear(row)],
      ['Коэффициент перед буквой показывает вклад одной единицы. Число справа задаёт '+(le?'предел.':'минимум.'),<>x₁ → {token('a0',row.a[0])} {unit} · b → {limit} {unit}</>],
      ['Перенесите числа в том же порядке: под x₁, x₂ и дальше. Справа оставьте b. Следующим шагом учтём '+(le?'остаток.':'излишек.'),<div className="walk-cells">{row.a.map((a,k)=><span key={k}><small>x{sub(k+1)}</small>{token('a'+k,a)}</span>)}<span><small>b</small>{limit}</span></div>]);
  }
  if(row.s==='=')return sequence('Как перенести равенство в таблицу?',
    ['Прочитайте условие «'+name+'». Обе стороны должны совпасть.',linear(row)],
    ['Перепишите коэффициенты в порядке переменных.',join(row.a.map((a,j)=><span>x{sub(j+1)} → {token('a'+j,a)}</span>),' · ')],
    ['В последнюю клетку b запишите требуемую величину.',<>Строка {i+1}: {join(row.a.map((a,j)=>token('a'+j,a)),' | ')} | b = {limit}</>]);
  const upper=row.s==='<=',word=upper?'остаток':'излишек',sign=upper?'+':'−';
  // A one-variable example for this row. Other constraints are checked separately.
  const j=row.a.findIndex(a=>a.s>0),q=j>=0&&row.b.s>0?(upper?row.b.div(row.a[j]).ge(1)?Q.of(1):Q.of(0):row.b.div(row.a[j]).add(1)):Q.of(0);
  const used=j<0?Q.of(0):row.a[j].mul(q),diff=upper?row.b.sub(used):used.sub(row.b);
  if(diff.s<0)return sequence('Как записать ограничение равенством?',
    ['Возьмите строку «'+name+'».',linear(row)],['Обозначьте '+word+' буквой s.',<>s = {upper?<>{limit} − (левая часть)</>:<>(левая часть) − {limit}</>}</>],
    ['Для допустимого плана s ≥ 0. В таблицу войдёт равенство.',<>{left} {sign} s = {limit}</>]);
  const example=j<0?'Все переменные равны нулю.':'Пример для этой строки: '+(world.variables[j]?.[0]||'x'+sub(j+1))+' · x'+sub(j+1)+' = '+t(q)+' '+(world.variables[j]?.[2]||'')+', остальные равны нулю.';
  return sequence(step.startingRow?'Зачем нужен ещё один столбец?':'Как записать '+word+' в строку '+(i+1)+'?',
    [example,<> {name} · {j>=0?<>{token('rate',row.a[j])} × {token('q',q)} = </>:null}{token('used',used)} {unit}. {upper?'Лимит':'Требуется'} {limit} {unit}.</>],
    [upper?'Вычтите расход из лимита. Это свободный остаток s.':'Вычтите требование из выпуска. Это излишек s.',<>s = {upper?limit:token('used',used)} − {upper?token('used',used):limit} = {token('extra',diff)} {unit}</>],
    ['Запишите '+word+' в отдельный столбец. Теперь обе стороны равны.',<><div>{token('used',used)} {sign} {token('extra',diff)} = {limit}</div>{left} {sign} s = {t(row.b)}{step.slackLabel&&<div>Столбец для s в таблице: <b dangerouslySetInnerHTML={{__html:step.slackLabel}}/></div>}</>]);
}
function pivotStep(step){
  const {table:s,dual}=step.pivotFrame,{p,q}=s,row=s.rows[p],a=row.a[q],b=row.b;
  const col=vname(s,q),name=step.title.split(': ').pop(),pos='строка '+(p+1)+', столбец '+col;
  const chosen=token('pivot',a),rhs=token('rhs',b);
  if(name==='правило выбора'&&s.kind!=='M')return sequence('Какие два выбора задают следующий план?',
    [dual?'Найдите строку, в которой b отрицательно. Её нужно исправить.':'Начните с нижней строки — оценок. Отрицательная оценка показывает, какой выпуск можно попробовать увеличить.',dual?<>Строка {p+1}: b = {rhs}</>:<>Оценка {col} = {token('score',s.z.a[q])}</>],
    [dual?'В выбранной строке найдите столбец, который позволит провести замену.':'Посмотрите, в какой строке запас первым исчерпается при увеличении выбранной переменной.',<>Столбец {col} · строка {p+1}</>],
    ['Их пересечение задаёт число для пересчёта таблицы. Следующие шаги покажут каждый выбор отдельно.',<>{pos} → {chosen}</>]);
  if(name==='поворот'||name==='правая часть'){
    const k=s.rows.findIndex((r,i)=>i!==p&&r.a[q].s!==0);
    const other=k>=0?s.rows[k]:null;
    return sequence('Как пересчитать ведущую строку?',
    ['Найдите число на пересечении выбранных строки и столбца.',<>{pos} → {chosen}. Справа b = {rhs}.</>],
    ['Разделите каждый элемент строки на это число.',<>{chosen} ÷ {t(a)} = 1<br/>{rhs} ÷ {chosen} = {token('newB',b.div(a))}</>],
    ['Запишите единицу в выбранный столбец и новое b справа. В остальных строках этот столбец обнуляют вычитанием.',<>Строка {p+1}: {col} → 1 · b → {token('newB',b.div(a))}{other&&<div>Строка {k+1}, тот же столбец: {t(other.a[q])} − ({t(other.a[q])}) × 1 = 0</div>}</>]);
  }
  if(s.kind==='M')return sequence('Как сделать подготовительный поворот?',
    ['Возьмите строку вспомогательного ограничения M.',<>b = {rhs}</>],
    ['Используйте пересечение, выбранное для подготовки таблицы.',<>{pos} → {chosen}</>],
    ['Нормируйте строку, чтобы получить единицу в выбранном столбце.',<>{chosen} ÷ {t(a)} = 1 · b = {t(b.div(a))}</>]);
  const leave=name==='выходящая строка'||(dual&&name==='правило выбора');
  if(leave&&!dual){
    const candidates=s.rows.map((r,i)=>r.a[q].s>0?<div key={i}>Строка {i+1}: {t(r.b)} ÷ {t(r.a[q])} = {token('lim'+i,r.b.div(r.a[q]))}</div>:null);
    return sequence('Какая строка первой ограничивает шаг?',
      ['Возьмите столбец '+col+' и значения b справа. Делить можно только при положительном коэффициенте.',join(s.rows.map((r,i)=>'стр. '+(i+1)+': b = '+t(r.b)+', коэффициент '+t(r.a[q])),' · ')],
      ['Разделите каждый запас на расход. Получатся пределы шага.',candidates],
      ['Выберите наименьший предел: больший шаг нарушил бы хотя бы одну строку.',<>Шаг {token('lim'+p,b.div(a))} → ведущая строка {p+1}</>]);
  }
  if(leave)return sequence('Какую строку нужно исправить?',
    ['Посмотрите на b — последний столбец. Отрицательное значение показывает нарушение.',join(s.rows.map((r,i)=><span>стр. {i+1}: {token('b'+i,r.b)}</span>),' · ')],
    [s.bland?'Среди отрицательных b выберите строку с наименьшим индексом базисной переменной.':'Найдите самое отрицательное b. Его строку будем исправлять.',<>b = {token('b'+p,b)}</>],
    ['В этой строке дальше ищем столбец для замены.',<>Ведущая строка {p+1} · {vname(s,s.basis[p])}</>]);
  if(dual)return sequence('Как выбрать столбец, чтобы исправить дефицит?',
    ['Возьмите строку '+(p+1)+'. Подходят столбцы с отрицательным коэффициентом.',join(s.cols.filter(j=>row.a[j].s<0).map(j=>vname(s,j)+' = '+t(row.a[j])),' · ')],
    ['Для этих столбцов разделите оценку на модуль коэффициента.',join(s.cols.filter(j=>row.a[j].s<0).map(j=><span>{vname(s,j)}: {t(s.z.a[j])} ÷ {t(row.a[j].abs())} = {token('ratio'+j,s.z.a[j].div(row.a[j].abs()))}</span>),' · ')],
    ['Минимум указывает входящий столбец.',<>{token('ratio'+q,s.z.a[q].div(a.abs()))} → {col}</>]);
  return sequence('Как понять, какую переменную увеличить?',
    ['Прочитайте оценки под столбцами. Минус указывает направление, в котором можно улучшить цель.',join(s.cols.map(j=><span>{vname(s,j)}: {token('score'+j,s.z.a[j])}</span>),' · ')],
    [s.bland?'По правилу защиты от повторов возьмите первый подходящий столбец.':'Сравните отрицательные оценки. При равенстве выбирайте первый столбец слева.',<>Выбранная оценка {token('score'+q,s.z.a[q])}</>],
    ['По этой оценке найдите заголовок столбца. Далее понадобится допустимая длина шага.',<>{token('score'+q,s.z.a[q])} → столбец {col}</>]);
}
function story(step,data){
  if(step.startingRow||step.slackRow)return prepare(step,data);
  if(step.pivotFrame)return pivotStep(step);
  const start=math(step.before),end=math(step.after),ans=token('answer',step.answer);
  const basic=(title,read,operation,working,write=step.answer,result=end)=>sequence(title,[read,start],[operation,working],[write,result]);
  if(step.eventStep){
    const e=step.eventStep,forward=Boolean(e.inc),arcs=forward?e.inc:e.out;
    return sequence('Когда наступит событие '+e.e+'?',
      [forward?'Возьмите сроки начала входящих работ и их длительности.':'Возьмите поздние сроки следующих событий и длительности работ.',join(arcs.map(({a})=>a.i+' → '+a.j+' · '+t(a.d)+' дн.'),' | ')],
      [forward?'К сроку начала прибавьте длительность каждой работы.':'От срока следующего события отнимите длительность работы.',arcs.map(({a,v},i)=><div key={i}>{t(forward?v.sub(a.d):v.add(a.d))} {forward?'+':'−'} {t(a.d)} = {token('time'+i,v)}</div>)],
      [forward?'Дождитесь самой поздней работы. Запишите максимум у события.':'Чтобы успеть по всем ветвям, запишите минимум у события.',<>Событие {e.e} → день {token('time'+arcs.findIndex(o=>o.v.eq(e.val)),e.val)}</>]);
  }
  if(step.potential){const [c,u,v]=step.potential;return basic('Выгодно ли открыть этот маршрут?','Найдите тариф и две оценки в подписи к таблице.','Вычтите из тарифа оценки склада и магазина.',<>{t(c)} − ({t(u)}) − ({t(v)}) = {ans}</>,'Запишите разность в свободную клетку. Отрицательный знак даёт возможность снизить затраты.',<>Оценка маршрута Δ = {ans}</>);}
  if(step.cutFrame){const s=step.cutFrame,b=s.cut.b;return basic('Как отделить неполную единицу?','Посмотрите на значения b в таблице.','Для выбранной строки вычтите из b ближайшее целое снизу.',<>Строка {s.p+1}: {t(b)} − ({t(b.sub(s.cut.fb))}) = {token('frac',s.cut.fb)}</>,'Дробная часть определяет правую сторону отсечения.',<>Строка {s.p+1} · дробная часть {token('frac',s.cut.fb)}</>);}
  if(step.dualColumn){const {row,j,P}=step.dualColumn;return sequence('Куда переходят числа из столбца x'+sub(j+1)+'?',
    ['Читайте исходный столбец сверху вниз.',join(P.rows.map((r,i)=>token('a'+i,r.a[j])),' · ')],
    ['Запишите эти числа перед оценками ресурсов в том же порядке.',join(row.a.map((a,i)=><span>({token('a'+i,a)})·y{sub(i+1)}</span>),' + ')],
    ['Справа поставьте коэффициент исходной цели при x'+sub(j+1)+'.',math(R.lin(row.a,i=>'y'+sub(i+1))+' '+R.sg(row.s)+' '+LU.f(row.b))]);}
  if(step.balanceCheck){const {row,plan}=step.balanceCheck,used=row.a.reduce((n,a,i)=>n.add(a.mul(plan[i])),Q.of(0));return basic(step.prompt,'Возьмите числа предложенного плана и условие строки.','Замените каждую букву её значением и сложите произведения.',<>{join(row.a.map((a,i)=>'('+t(a)+') × ('+t(plan[i])+')'),' + ')} = {token('sum',used)}</>,step.answer,end);}
  if(step.planeRow)return basic('С какой стороны прямой выполнено условие?','Возьмите неравенство этой границы.','Подставьте координаты начала осей.',<>{join(step.planeRow.a.map(a=>'('+t(a)+') × 0'),' + ')} = 0</>,step.planeRow.origin?'Начало координат удовлетворяет условию.':'Начало координат лежит вне допустимой стороны.',end);
  const g=data.G;
  if(g&&['Нижняя цена игры','Верхняя цена игры'].includes(step.title)){
    const lower=step.title.startsWith('Нижняя'),vals=lower?g.rowMin:g.colMax;
    return basic(lower?'Какой выигрыш A может гарантировать?':'Как B ограничивает свой проигрыш?','В клетках записан выигрыш A для каждой пары ходов.',lower?'В каждой строке выберите минимум — худший ответ B.':'В каждом столбце выберите максимум — худший исход для B.',join(vals.map((v,i)=><span>{lower?'A':'B'}{sub(i+1)} → {token('val'+i,v)}</span>),' · '),lower?'Возьмите наибольшую из гарантий строк.':'Возьмите наименьшую из оценок столбцов.',<>{lower?'α':'β'} = {token('val'+vals.findIndex(v=>t(v)===step.answer),step.answer)}</>);}
  const T=data.T,N=data.N,P=data.P,lp=data.rec.lp;
  switch(step.title){
    case 'Баланс перевозок':return sequence('Хватит ли груза для всех магазинов?',
      ['Сложите запасы складов и отдельно заказы магазинов.',<>Запас {token('stock',T.P.sa)} ящ. · заказ {token('need',T.P.sb)} ящ.</>],
      ['Из запаса вычтите заказ.',<>{token('stock',T.P.sa)} − {token('need',T.P.sb)} = {token('diff',T.P.sa.sub(T.P.sb))}</>],
      [step.answer,<>Разница {token('diff',T.P.sa.sub(T.P.sb))} ящ.</>]);
    case 'Начальный план':{const e=step.allocation?.entries[0];if(!e)break;
      return sequence('Сколько отправить первым рейсом?',['Найдите склад и магазин в выбранной клетке.',<>Склад A{e.i+1}: {token('stock',e.stock)} ящ. · магазин B{e.j+1}: {token('need',e.need)} ящ.</>],
        ['Сравните запас и заказ. Можно отправить меньшее из двух чисел.',<>min({token('stock',e.stock)}, {token('need',e.need)}) = {token('load',e.x)}</>],
        ['Запишите груз в клетку на пересечении склада и магазина.',<>A{e.i+1} → B{e.j+1}: {token('load',e.x)} ящ.</>]);}
    case 'Цикл перераспределения':{const c=step.cycleTrace,minus=c.path.filter(cell=>cell.sign!=='+' );
      return sequence('Сколько ящиков можно перенаправить?',
        ['Найдите рейсы, с которых снимают груз.',join(minus.map(({i,j},n)=><span>A{i+1}B{j+1}: {token('load'+n,c.plan[i][j]??0)}</span>),' · ')],
        ['Снять можно столько, сколько есть на самом малом из этих рейсов.',<>min({join(minus.map(({i,j},n)=>token('load'+n,c.plan[i][j]??0)),', ')}) = {token('move',c.amount)}</>],
        ['Столько же прибавьте на рейсах с плюсом. Пройдите цикл по таблице ниже.',<>Переносим {token('move',c.amount)} ящ.</>]);}
    case 'Резерв работы':{const a=step.arcStep,early=N.tp[N.events.indexOf(a.i)],late=N.tn[N.events.indexOf(a.j)];
      return sequence('На сколько дней можно задержать работу?',
        ['Возьмите ранний старт и предельный срок окончания.',<>Старт {token('early',early)} · окончание {token('late',late)} · длительность {token('d',a.d)} дн.</>],
        ['Из доступного времени вычтите длительность работы.',<>{token('late',late)} − {token('early',early)} − {token('d',a.d)} = {token('res',a.full)}</>],
        [a.crit?'Запаса времени нет. Задержка этой работы задержит проект.':'В пределах этого резерва срок проекта сохранится.',<>Работа {a.i} → {a.j}: резерв {token('res',a.full)} дн.</>]);}
    case 'Критический путь':{const path=N.paths[0];if(!path?.length)break;
      return basic('Какая цепочка задаёт длительность проекта?','Прочитайте направления и длительности работ.','Соедините работы с нулевым резервом от начала до завершения.',path.map(a=>a.i+' → '+a.j).join(' · '),'Сложите длительности работ этой цепочки.',<>{path.map(a=>t(a.d)).join(' + ')} = {t(N.T)} дн.</>);}
    case 'Направление улучшения':return basic('Куда двигать линию одинаковой выручки?','Прочитайте коэффициенты цели по горизонтали и вертикали.','Коэффициенты задают направление роста. Для минимума двигайтесь обратно.',<>Направление роста ({P.c.map(t).join('; ')})</>,step.answer);
    case 'Пересечение границ':{const [a,b]=step.boundaries,det=a.a[0].mul(b.a[1]).sub(a.a[1].mul(b.a[0])),dx=a.b.mul(b.a[1]).sub(a.a[1].mul(b.b));
      return basic('Где встречаются две границы?','На границе знак условия заменяется равенством. Возьмите оба уравнения.','Умножьте первую строку на '+t(b.a[1])+', вторую на '+t(a.a[1])+' и вычтите вторую из первой. Члены с x₂ сократятся.',<>{t(det)}·x₁ = {t(dx)} → x₁ = {token('x1',dx.div(det))}</>,'Подставьте x₁ в строку с ненулевым коэффициентом при x₂. Получатся координаты вершины.');}
    case 'Геометрический вывод':return basic('Как выбрать заказ среди вершин?','Учитывайте только точки, прошедшие все проверки.','Сравните значения цели в вершинах.',join(data.rec.graph.verts.map(v=>LU.vec(v.p)+' → '+t(v.f)),' · '),step.answer,P&&data.f!=null?<>Лучшее значение {t(data.f)}</>:end);
    case 'Соответствие задач':return basic('Откуда берутся переменные y?','У каждой строки исходной задачи есть своё условие.','Присвойте каждому условию отдельную оценку.',join(P.rows.map((_,i)=>'Строка '+(i+1)+' → y'+sub(i+1)),' · '),'Столько оценок нужно выбрать в двойственной задаче.');
    case 'Двойственная цель':return basic('Как сложить оценки всех ресурсов?','Прочитайте правые части b исходных строк.','Умножьте каждое b на оценку своей строки и сложите.',join(data.D.c.map((v,i)=><span>{token('b'+i,v)}·y{sub(i+1)}</span>),' + '),'Эта сумма входит в цель двойственной задачи.');
    case 'Равенство оптимумов':return basic('Как подтвердить оптимальность обоих планов?','Возьмите допустимые оценки y и величины ресурсов b.','Умножьте оценки на соответствующие объёмы и прибавьте свободный член.',<>{join(data.D.c.map((v,i)=>'('+t(v)+') × ('+t(data.rec.duality.y[i])+')'),' + ')} + {t(data.D.c0||0)} = {ans}</>,'Прямая и двойственная цели совпали. Это подтверждает оптимальность.');
    case 'Выбор начальной клетки':{const e=T.first.steps[0];return basic('На какой рейс назначить первый груз?','Строки — склады, столбцы — магазины.',T.init==='mc'?'Среди открытых маршрутов найдите самый низкий тариф.':'Начните с верхнего склада и самого левого открытого магазина.',<>Склад A{e.i+1} → магазин B{e.j+1}</>,'На следующем шаге сюда запишем количество ящиков.');}
    case 'Оптимальность плана':{const free=T.delta.flatMap((r,i)=>r.flatMap((v,j)=>v!=null&&T.X[i][j]==null?[v]:[]));
      return basic('Остался ли более дешёвый маршрут?','Проверьте допустимый план и оценки свободных клеток.','Для снижения затрат нужна отрицательная оценка.',free.length?'Оценки свободных клеток: '+free.map(t).join(', '):step.answer,'У всех свободных клеток оценки неотрицательны. Можно записать стоимость плана.');}
    case 'Равенства':{const row=data.rec.canon.state0.rows.find(r=>r.s!=='=');if(!row)break;return basic('Что добавить, чтобы обе стороны совпали?','Выберите строку со знаком неравенства.',row.s==='<='?'Прибавьте свободный остаток к использованному ресурсу.':'Вычтите излишек из выпуска.',<>Левая часть {row.s==='<='?'+ остаток':'− излишек'} = {t(row.b)}</>,'В системе справа остаётся то же число.');}
    case 'Замена переменной':return basic('Как считать только добавку к обязательному объёму?','Посмотрите на нижнюю границу переменной.', 'Отделите обязательную часть от добавки. Подставьте новую запись во все строки и цель.',math(step.canonStep.text),'После раскрытия скобок перенесите свободные числа вправо.');
    case 'Направление цели':return basic('Как переписать цель для минимизации?','Прочитайте направление исходной цели.','При переходе от максимума к минимуму меняют знак каждого коэффициента и свободного члена.',step.answer,'В последней строке записи прочитайте новое направление цели.',end);
    case 'Целочисленность релаксации':return basic('Можно ли отгрузить рассчитанную партию?','Прочитайте количества в плане без требования целочисленности.','Разберите каждую позицию: дробное количество целых изделий отгрузить нельзя.',join(data.lpX.map((v,i)=>'x'+sub(i+1)+' = '+t(v)+(v.isInt()?' · целое':' · дробное')),' | '),step.answer);
    case 'Сертификат оптимальности':return basic('Можно ли доказать, что предложенный выпуск лучший?','Сначала проверьте ограничения предложенного плана.','Найдите допустимые оценки ресурсов с той же целью. Тогда между оценкой и выпуском нет места для улучшения.',step.answer,'Запишите итог проверки.',end);
    case 'Итог метода':{const r=step.solution;
      if(r?.status==='optimal'&&r.x&&r.f!=null)return sequence('Как прочитать ответ и убедиться, что расчёт закончен?',
        [r.cuts!=null?'Проверьте, что количества в окончательном плане целые.':'В итоговой таблице базисные переменные берём из b, остальные равны нулю.',join(r.x.map((v,i)=><span>x{sub(i+1)} = {token('x'+i,v)}</span>),' · ')],
        ['Подставьте эти количества в исходную цель.',<>{join(r.x.map((v,i)=><span>({t(P.c[i])}) × {token('x'+i,v)}</span>),' + ')}{P.c0?.s?' + ('+t(P.c0)+')':''} = {token('opt',r.f)}</>],
        [r.cuts!=null?'Все количества целые. Можно записать лучший целочисленный план.':'Строки допустимы, улучшающих оценок больше нет. Запишите план и значение цели.',<>План {LU.vec(r.x)} · цель {token('opt',r.f)}</>]);
      return basic('Почему на этом шаге расчёт заканчивается?','Прочитайте признак остановки под последней таблицей.',step.before.includes('Отсечений:')?'Проверьте целочисленность плана и признак оптимальности в последней таблице.':'Проверьте значения b и оценки разрешённых столбцов в последней таблице.',step.answer,'Зафиксируйте вывод этого расчёта.',step.answer);}
    case 'Нормировка вероятностей':return basic('Как получить вероятность первого хода?','Найдите первый вес и сумму всех весов.','Разделите первый вес на сумму.',<>{t(g.sol.x[0])} ÷ ({t(g.sumP)}) = {ans}</>,'Запишите результат в первую позицию стратегии A.',<>x₁ = {ans}</>);
    case 'Цена исходной игры':return basic('Как вернуть выигрыш к исходной шкале?','Вспомните, сколько прибавили ко всем клеткам.','Вычтите эту прибавку из найденной цены.',<>{t(g.vprime)} − {t(g.k)} = {ans}</>,'Это средний выигрыш A при оптимальной игре.',<>v = {ans} фиш.</>);
    case 'Седловая точка':return basic('Достаточно ли каждому игроку одного хода?','Сравните гарантии двух игроков.','При совпадении гарантий одна пара чистых ходов даёт цену игры.',<>{t(g.lower)} {g.saddle?'=':'<'} {t(g.upper)}</>,step.answer);
    case 'Сравнение вершин':{const v=data.rec.graph.verts[0];return basic('Как оценить выпуск в вершине?','Возьмите координаты вершины и выручку с каждого метра.','Умножьте координаты на коэффициенты цели.',<>{join(P.c.map((a,j)=>'('+t(a)+') × ('+t(v.p[j])+')'),' + ')} + {t(P.c0||0)} = {ans}</>,'Запишите результат рядом с этой вершиной и сравните с остальными.');}
    case 'Искусственный базис':case 'Переход к исходной цели':{const first=step.title==='Искусственный базис',s=first?lp.phase1.steps[0]:lp.phase1.last,h=s.z.b.neg();
      return basic(first?'Чем заполнить начало таблицы?':'Можно ли убрать временные переменные?','Вспомогательная таблица учитывает временные величины t.','Прочитайте число справа в строке −h и поменяйте знак.',<>−h = {t(s.z.b)} → h = {token('h',h)}</>,first?'Уменьшайте сумму до нуля: тогда исходные строки смогут выполняться без временных величин.':step.answer,<>Сумма временных величин h = {token('h',h)}</>);}
    case 'Знаки двойственных переменных':{const s=step.dualSign;return basic('Какие оценки можно назначить условию?','Посмотрите на направление цели и знак этой строки.','Сопоставьте знак условия с направлением цели.',<>Цель {s.sense} · строка {s.i+1}: {R.sg(s.row.s)}</>,'Запишите требование к знаку оценки.',<>y{sub(s.i+1)} {step.answer==='free'?'любого знака':R.sg(step.answer)+' 0'}</>);}
  }
  return basic(step.prompt,'Прочитайте исходные данные этого шага.',step.reason,ans,'Запишите вывод для этого варианта.',step.after?end:ans);
}


// Keep the preceding calculation visible while its values move into the next one.
export function WorkedStep({step,data}){
  const {title,frames}=story(step,data);
  const [frame,setFrame]=useState(0),[playing,setPlaying]=useState(false);
  const host=useRef(null),extra=useRef(null);
  function select(i){setPlaying(false);setFrame(i);}
  useEffect(()=>{
    if(!playing)return;
    const timer=setTimeout(()=>{
      if(host.current?.closest('[hidden]')||frame>=2)setPlaying(false);
      else {setFrame(frame+1);if(frame===1)setPlaying(false);}
    },2100);
    return ()=>clearTimeout(timer);
  },[frame,playing]);
  useLayoutEffect(()=>{
    const root=host.current;
    if(LU.reduced()||!frame||root.closest('[hidden]'))return;
    const clean=[];
    for(const slot of root.querySelectorAll('.walk-current [data-carry]')){
      const source=root.querySelector('.walk-previous [data-carry="'+slot.dataset.carry+'"]');
      if(!source)continue;
      const from=source.getBoundingClientRect(),to=slot.getBoundingClientRect();
      const chip=document.createElement('i');chip.className='substitution-flight';chip.setAttribute('aria-hidden','true');chip.textContent=source.textContent;
      slot.append(chip);
      const motion=chip.animate([{transform:'translate('+(from.x-to.x)+'px,'+(from.y-to.y)+'px)',opacity:.9},{transform:'translate(0,0)',opacity:.9}],{duration:650,easing:'ease-out'});
      motion.onfinish=()=>chip.remove();clean.push(()=>{motion.cancel();chip.remove();});
    }
    return ()=>clean.forEach(stop=>stop());
  },[frame]);
  useEffect(()=>{
    if(frame===2&&extra.current&&(step.allocation||step.cycleTrace))LessonVisuals.transportTable(extra.current,step);
  },[frame,step]);
  return <article className="worked-step" ref={host}><h4>{title}</h4>
    <div className="walk-rail" role="group" aria-label="Кадры действия">{['Исходные данные','Действие','Запись результата'].map((s,i)=><button key={s} aria-pressed={frame===i} onClick={()=>select(i)}>{i+1}. {s}</button>)}</div>
    <div className="walk-page" key={frame}>
      {frame>0&&<div className="walk-previous"><small>Из предыдущего кадра</small>{frames[frame-1][1]}</div>}
      <div className="walk-current" aria-live="polite"><p>{frames[frame][0]}</p><div className="walk-equation">{frames[frame][1]}</div></div>
    </div>
    <div className="walk-controls">{frame<2?<button className="trial-primary" onClick={()=>select(frame+1)}>{frame===0?'Показать действие':'Показать результат'} →</button>:<button onClick={()=>select(0)}><RotateCcw size={15}/> Повторить</button>}
      <button onClick={()=>{if(playing)setPlaying(false);else{if(frame===2)setFrame(0);setPlaying(true);}}}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?'Пауза':'Проиграть'}</button></div>
    {frame===2&&(step.allocation||step.cycleTrace)&&<div ref={extra}/>}
    {(step.pivotFrame||step.startingRow||step.slackRow||step.cutFrame)&&<details><summary>Посмотреть запись в полной системе или таблице</summary><div className="book-state" dangerouslySetInnerHTML={{__html:frame===2&&step.after?step.after:step.before}}/></details>}
  </article>;
}
