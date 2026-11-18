import {partialPlan} from './shipment-map.jsx';
import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Pause,Play,RotateCcw} from 'lucide-react';

const {txt,sub,vec}=LU;
const name=v=>(v.kind==='t'?'t':'x')+sub(v.k);
const x=j=>'x'+sub(j+1);
const mark=(value,...steps)=>({text:txt(value),steps});
const lit=(value,step)=>value?.steps?.includes(step)||undefined;
const text=v=>v?.text??txt(v);
const add=values=>values.reduce((a,b)=>a.add(b),Q.of(0));

// Each stop refers to the same numbers as the adjacent interactive example.
function shipments(d,n,point,leg){
  const {P,first}=d.T, s=first.steps[leg],i=s.i,j=s.j;
  const previous=partialPlan(d.T,leg,0);
  const stockBefore=P.a.map((v,k)=>LU.num(v)-previous[k].reduce((a,b)=>a+b,0));
  const demandBefore=P.b.map((v,l)=>LU.num(v)-previous.reduce((sum,row)=>sum+row[l],0));
  const store=k=>'A'+sub(k+1),shop=k=>k>=P.n0?'Резерв':'B'+sub(k+1);
  return {title:'План перевозок, ящики',headers:['Склад',...P.b.map((_,k)=>k===j?mark(shop(k),1):shop(k)),'Запас'],
    rows:[...P.a.map((stock,k)=>[k===i?mark(store(k),0):store(k),...P.b.map((_,l)=>k===i&&l===j?mark(n,2):(previous[k][l]??'·')),k===i?mark(stockBefore[k],0):stockBefore[k]]),
      ['Нужно',...demandBefore.map((v,k)=>k===j?mark(v,1):v),'—']],
    stops:[
      ['Склад','Найдите строку склада '+(i+1)+'. Справа записан его запас до отправки.',store(i)+' → '+txt(s.a0)+' ящ.'],
      [(j<P.n0?'Магазин':'Резерв'),j<P.n0?'Найдите столбец магазина '+(j+1)+'. Внизу указан остаток заказа перед рейсом. Поставку ограничивает меньшее из двух чисел.':'Последний столбец учитывает запас сверх заказов. Груз остаётся на складе.','min('+txt(s.a0)+', '+txt(s.b0)+') = '+txt(s.x)],
      [(j<P.n0?'Поставка':'Остаток'),j>=P.n0?'Перенесите остаток в клетку резерва склада. Затраты на перевозку здесь нулевые.':'На пересечении стоит отправленное количество. Другие числа показывают предыдущие поставки. Точка означает, что по маршруту пока ничего не отправили.',store(i)+' → '+shop(j)+' = '+n+' ящ.']],
    // In a manual experiment the slider may take any intermediate value.
    preset:[0,0,LU.num(s.x)],travel:n===LU.num(s.x)?txt(s.x):undefined};
}
function basis(d,n){
  const artificial=d.type==='artificial',snap=(artificial?d.rec.lp.phase1:d.rec.lp.phase2).steps[n];
  const chosen=Math.max(0,snap.basis.findIndex(j=>snap.vars[j].kind===(artificial?'t':'x')));
  const variable=name(snap.vars[snap.basis[chosen]]),b=snap.rows[chosen].b;
  const values=d.P.c.map((_,j)=>{const row=snap.basis.findIndex(k=>snap.vars[k].kind==='x'&&snap.vars[k].k===j+1);return row<0?Q.of(0):snap.rows[row].b;});
  const temporary=snap.rows.filter((_,i)=>snap.vars[snap.basis[i]].kind==='t').map(row=>row.b);
  return {title:'Как прочитать симплекс-таблицу',headers:['Строка','Базис','b'],
    rows:snap.rows.map((r,i)=>{
      const v=snap.vars[snap.basis[i]],applies=artificial?v.kind==='t':v.kind==='x';
      return [i+1,mark(name(v),i===chosen?0:null),mark(r.b,i===chosen?1:null,applies?2:null)];
    }),
    stops:[['Базис','В каждой строке указана одна переменная текущего плана. Эти переменные образуют базис.','Строка '+(chosen+1)+' → '+variable],
      ['Значение','В той же строке столбец b даёт значение переменной. Переменные вне базиса сейчас равны нулю.',variable+' = '+txt(b)],
      artificial?['Сумма t','Буквой t обозначена временная переменная. Сложите значения всех t в базисе. Нулевая сумма означает, что временные количества больше не нужны.','h = '+(temporary.map(txt).join(' + ')||'0')+' = '+txt(add(temporary))]:
      ['План','Соберите количества исходных изделий по порядку. Дополнительные переменные учитывают остатки или излишки и в выпуск не входят.','План '+vec(values)]]};
}
function balances(d,n){
  const run=d.rec.dsx,s=run.steps.find(row=>row.kind==='D'),r=s.rows[s.p],v=name(s.vars[s.q]),leave=name(s.vars[s.basis[s.p]]);
  const b=r.b.at(run.M0),coef=r.a[s.q],gain=coef.neg(),amount=b.neg().div(gain).mul(n).div(10);
  return {title:'Фрагмент строки двойственного симплекса',headers:['Базис','b',v],rows:[[leave,mark(b,0),mark(coef,1)]],
    stops:[['Дефицит','Начальное значение в столбце b отрицательно. Его модуль показывает, скольких единиц не хватает.',leave+' = '+txt(b)],
      ['Прибавка','В таблице коэффициент стоит слева в равенстве. Переносим его вправо: каждый час работы прибавляет к остатку '+txt(gain)+'.',leave+' = '+txt(b)+' + '+txt(gain)+' × '+v],
      ['Остаток','Подставьте время с ползунка. Ноль означает, что эта строка выполнена точно.',txt(b)+' + '+txt(gain)+' × '+txt(amount)+' = '+txt(b.add(gain.mul(amount)))]],
    preset:[0,0,10]};
}
function products(d,n,picked){
  const graph=d.type==='graph',point=graph?(picked||d.rec.graph.verts[n].p):d.xbar;
  const coeff=graph?d.P.c:d.P.rows[n].a, products=coeff.map((a,j)=>a.mul(point[j]));
  const sum=graph?LSCENE.objValue(d.P,point):add(products), constant=graph&&d.P.c0?.s?d.P.c0:null;
  return {title:graph?'От точки к значению цели':'Подстановка в условие '+(n+1),headers:['Величина','Количество','Коэффициент','Вклад'],
    rows:point.map((v,j)=>[x(j),mark(v,0),mark(coeff[j],1),mark(products[j],2)]),
    stops:[['План',graph?'Координаты точки задают количества. При перемещении точки эти числа меняются.':'Каждой переменной соответствует одно количество предложенного плана.',vec(point)],
      ['Вклад','Умножьте каждое количество на коэффициент из выбранного выражения. Последний столбец показывает произведения.',txt(point[0])+' × ('+txt(coeff[0])+') = '+txt(products[0])],
      [graph?'Цель':'Проверка',graph?'Сумма вкладов с учётом постоянного слагаемого даёт значение цели в выбранной точке.':'Сложите вклады и сравните сумму с правой частью исходного условия.',products.map(a=>'('+txt(a)+')').concat(constant?['('+txt(constant)+')']:[]).join(' + ')+' = '+txt(sum)+(graph?'':' '+R.sg(d.P.rows[n].s)+' '+txt(d.P.rows[n].b))]]};
}
function transpose(d,n){
  const i=Math.floor(n/d.P.c.length),j=n%d.P.c.length,a=d.P.rows[i].a[j],b=d.D.rows[j].a[i];
  return {title:'Адрес коэффициента',headers:['Запись','Строка','Столбец','Число'],
    rows:[['Прямая',mark(i+1,0),mark(x(j),0),mark(a,0)],['Двойственная',mark(j+1,1),mark('y'+sub(i+1),1),mark(b,2)]],
    stops:[['Исходная','В исходной записи число связывает условие и количество изделия. Нажмите число в матрице, чтобы проследить его путь.','Условие '+(i+1)+' · '+x(j)],
      ['Перенос','При транспонировании номера строки и столбца меняются местами. Условию соответствует оценка y.','('+[i+1,j+1].join(', ')+') → ('+[j+1,i+1].join(', ')+')'],
      ['Новая запись','Прочитайте коэффициент в новом столбце. Он умножается на оценку исходного условия.',txt(b)+' × y'+sub(i+1)]],travel:a.eq(b)?txt(b):undefined};
}
function canonical(d,n){
  const row=d.rec.canon.state0.rows[0],term=row.terms[0],limit=row.b;
  const used=limit.mul(n).div(4),quantity=used.div(term.c),slack=limit.sub(used);
  return {title:'Баланс первой строки',headers:['Часть условия','Значение'],rows:[['Предел',mark(limit,0)],['Использовано',mark(used,1)],['Остаток',mark(slack,2)]],
    stops:[['Предел','Посмотрим только на первое ограничение. Его правая часть задаёт доступное количество.', 'Доступно '+txt(limit)],
      ['Расход','Для этого примера возьмём '+term.v.replace(/\d+/g,sub)+' = '+txt(quantity)+', остальные количества положим равными нулю.','Расход = '+txt(term.c)+' × '+txt(quantity)+' = '+txt(used)],
      ['Равенство','Остаток равен пределу за вычетом расхода. Прибавив его к левой части, получаем равенство.',txt(used)+' + '+txt(slack)+' = '+txt(limit)]],preset:[0,2,2]};
}
function cuts(d){
  const {cut}=d;
  const weights=cut.parts.filter(part=>part.f.s).map(part=>txt(part.f)+'·'+name(d.cutVars[part.j])).join(' + ')||'0';
  const whole=cut.b.sub(cut.fb);
  return {title:'Строка, из которой строят отсечение',headers:['Строка','Значение b','Целая часть','Дробная часть'],
    rows:[[cut.row+1,mark(cut.b,0),mark(whole,1),mark(cut.fb,2)]],
    stops:[['Строка','В решении без требования целочисленности есть базисная переменная с дробным значением. Берём её строку.', 'b = '+txt(cut.b)],
      ['Целая часть','Найдите наибольшее целое число, которое не превосходит b.', '⌊'+txt(cut.b)+'⌋ = '+txt(whole)],
      ['Отсечение','У переменных слева сейчас нулевые значения. Сумма равна нулю и меньше '+txt(cut.fb)+'. Поэтому новое условие исключает этот план.', weights+' ≥ '+txt(cut.fb)]]};
}
function deadlines(d,n){
  const event=d.N.fwd.find(e=>e.inc.length>1),incoming=event.inc,selected=incoming[n];
  return {title:'Когда готово событие '+event.e,headers:['Работа','Начало','Длительность','Конец'],
    rows:incoming.map(({a,v},i)=>[a.i+' → '+a.j,i===n?mark(v.sub(a.d),0):v.sub(a.d),i===n?mark(a.d,1):a.d,v.eq(event.val)?mark(v,2):v]),
    stops:[['Начало','Работа на выбранной стрелке может начаться, когда готово событие '+selected.a.i+'.','Начало = '+txt(selected.v.sub(selected.a.d))],
      ['Конец','Прибавьте длительность работы к самому раннему времени её начала.',txt(selected.v.sub(selected.a.d))+' + '+txt(selected.a.d)+' = '+txt(selected.v)],
      ['Событие','Для следующего события нужны все входящие работы. Берём самое позднее из времён завершения.','max('+incoming.map(e=>txt(e.v)).join('; ')+') = '+txt(event.val)]]};
}
function guarantees(d,n){
  const g=d.G,i=Math.floor(n/g.n),j=n%g.n;
  return {title:'Гарантия игрока A',headers:['Ход A','Выигрыш при B'+sub(j+1),'Минимум строки'],
    rows:g.rowMin.map((v,k)=>['A'+sub(k+1),k===i?mark(g.C[k][j],0):g.C[k][j],mark(v,k===i?1:null,v.eq(g.lower)?2:null)]),
    stops:[['Два хода','Строку выбирает A, столбец выбирает B. Прочитайте выигрыш A на их пересечении.','A'+sub(i+1)+' и B'+sub(j+1)+' → '+txt(g.C[i][j])],
      ['Риск','Если A оставит этот ход, B может выбрать самый невыгодный для A столбец. Найдите минимум всей строки.','min('+g.C[i].map(txt).join('; ')+') = '+txt(g.rowMin[i])],
      ['Гарантия','Сравните минимумы строк. Наибольший из них — выигрыш, который A гарантирует одним постоянным ходом.','max('+g.rowMin.map(txt).join('; ')+') = '+txt(g.lower)]]};
}
const lessons={transp:shipments,graph:products,simplex:basis,artificial:basis,dsx:balances,dsimplex:balances,
  dual:transpose,duality:transpose,canon:canonical,ilp:cuts,gomory:cuts,optcheck:products,netw:deadlines,game:guarantees};

export function ReadingDiagram({data,value,choose,point,leg}){
  const [step,setStep]=useState(0),[playing,setPlaying]=useState(false);
  const root=useRef(null),overlay=useRef(null);
  const scene=lessons[data.type](data,value,point,leg),[,explain,formula]=scene.stops[step];
  const last=scene.stops.length-1;
  function go(next){
    setStep(next);
    if(scene.preset)choose(scene.preset[next]);
  }
  // The latest handler sees slider changes without restarting a running frame.
  const advance=useRef(null);
  advance.current=()=>{go(step+1);if(step+1===last)setPlaying(false);};
  useEffect(()=>{
    if(!playing)return;
    const timer=setTimeout(()=>{if(root.current?.closest('[hidden]'))setPlaying(false);else advance.current();},2200);
    return ()=>clearTimeout(timer);
  },[step,playing]);
  useLayoutEffect(()=>{
    if(LU.reduced())return;
    const sheet=root.current;
    if(sheet.closest('[hidden]'))return;
    const pairs=[];
    if(step===2&&scene.travel){
      pairs.push([sheet.querySelector('[data-flight=from]'),sheet.querySelector('[data-flight=to]')]);
    }else{
      // Carry a value only to its own operand, even if the formula wraps on a phone.
      const operands=[...sheet.querySelectorAll('[data-operand]')];
      for(const cell of sheet.querySelectorAll('tbody [data-lit]')){
        const i=operands.findIndex(el=>el.textContent===cell.textContent);
        if(i>=0)pairs.push([cell,operands.splice(i,1)[0]]);
      }
    }
    const box=sheet.getBoundingClientRect();
    const position=el=>{
      const r=el.getBoundingClientRect();
      return `translate(${r.left+r.width/2-box.left}px,${r.top+r.height/2-box.top}px) translate(-50%,-50%)`;
    };
    const flights=pairs.map(([source,target],i)=>{
      const chip=document.createElement('i');
      chip.className='reading-flight';chip.textContent=source.textContent;
      overlay.current.append(chip);
      const from=position(source),to=position(target);
      const animation=chip.animate([{transform:from,opacity:0},{transform:from,opacity:1,offset:.14},{transform:to,opacity:1,offset:.85},{transform:to,opacity:0}],{duration:700,delay:i*90,easing:'ease-in-out'});
      return ()=>{animation.cancel();chip.remove();};
    });
    return ()=>flights.forEach(remove=>remove());
  },[step,scene.travel,formula]);
  function renderCell(v,index,tag,flight,band){
    const Tag=tag;
    return <Tag key={index} scope={tag==='th'?'row':undefined} data-flight={flight} data-band={band||undefined} data-lit={lit(v,step)}>{text(v)}</Tag>;
  }
  const transport=data.type==='transp',s=transport&&data.T.first.steps[leg];
  function port(row,col){
    if(transport){
      if(row===s.i&&col===s.j+1)return 'to';
      const stock=s.a0.le(s.b0);
      if(stock?row===s.i&&col===scene.headers.length-1:row===scene.rows.length-1&&col===s.j+1)return 'from';
    }else if(scene.travel&&col===3)return row===0?'from':'to';
  }
  return <figure className="reading-diagram" ref={root} aria-label={scene.title}>
    <figcaption>{scene.title}</figcaption>
    <div className="reading-grid"><table aria-label={scene.title}><thead><tr>{scene.headers.map((h,i)=><th scope="col" key={i} data-lit={lit(h,step)}>{text(h)}</th>)}</tr></thead>
    <tbody>{scene.rows.map((r,i)=><tr key={i}>{r.map((v,j)=>renderCell(v,j,j?'td':'th',port(i,j),transport&&(step===0?i===s.i:step===1&&j===s.j+1)))}</tr>)}</tbody></table></div>
    <div className="reading-note" aria-live="polite"><b>{formula.split(/([A-Za-zА-Яа-я][₀-₉]+|[−-]?\d+(?:[,.]\d+|\/\d+)?)/u).map((part,i)=>i%2?<span key={i} data-operand>{part}</span>:part)}</b><p>{explain}</p></div>
    <div className="reading-controls"><button type="button" className="reading-play" onClick={()=>{if(playing){setPlaying(false);return;}if(step===last)go(0);setPlaying(true);}}>{playing?<Pause/>:step===last?<RotateCcw/>:<Play/>}{playing?'Пауза':step===last?'Повторить':'Показать ход'}</button>
    <div role="group" aria-label="Кадры схемы">{scene.stops.map(([l],i)=><button type="button" key={l} aria-label={'Кадр '+(i+1)+'. '+l} title={l} aria-pressed={i===step} onClick={()=>{setPlaying(false);go(i);}}>{i+1}<span>{l}</span></button>)}</div></div>
    <span aria-hidden="true" ref={overlay}/>
  </figure>;
}
