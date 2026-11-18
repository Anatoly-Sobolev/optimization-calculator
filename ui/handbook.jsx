import React, {useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Accordion} from '@heroui/react/accordion';
import {Button} from '@heroui/react/button';
import {Label} from '@heroui/react/label';
import {Link} from '@heroui/react/link';
import {SearchField} from '@heroui/react/search-field';
import {MethodMark} from './teaching-figures.jsx';
import {LessonIntro} from './lesson-intro.jsx';
import {PlanProbe} from './plan-probe.jsx';
import {TextArea} from '@heroui/react/textarea';

function Mast({lab}) {
  return <div className="book-mast">
    <Link className="book-brand" href="index.html"><span aria-hidden="true">∑</span>Методы оптимизации</Link>
    <nav aria-label="Навигация пособия"><Link href="index.html#contents">Оглавление</Link><Link href={lab}>Лаборатория ↗</Link></nav>
  </div>;
}

function Catalogue({groups}) {
  const [query,setQuery] = useState('');
  const [expanded,setExpanded] = useState(new Set());
  const search = query.trim().toLocaleLowerCase('ru');
  const matches = (group,term) => [group.goal,group.method,...group.routes.map(r=>r.title+' '+r.source)].join(' ').toLocaleLowerCase('ru').includes(term);
  const visible = groups.filter(group=>matches(group,search));
  function find(value) {
    setQuery(value);
    const term = value.trim().toLocaleLowerCase('ru');
    setExpanded(new Set(term ? groups.filter(group=>matches(group,term)).map(group=>group.goal) : []));
  }
  return <section id="contents" className="course-catalog">
    <div className="catalog-intro"><h2>Найти своё задание</h2>
      <SearchField value={query} onChange={find} className="topic-search">
        <Label>Поиск по задаче или методу</Label>
        <SearchField.Group><SearchField.SearchIcon/><SearchField.Input placeholder="Груз, симплекс, ресурсы…"/><SearchField.ClearButton aria-label="Очистить поиск"/></SearchField.Group>
      </SearchField>
    </div>
    <div className="topic-list">
      {visible.length ? <Accordion allowsMultipleExpanded expandedKeys={expanded} onExpandedChange={setExpanded}>
        {visible.map(group=><Accordion.Item id={group.goal} key={group.goal}>
          <Accordion.Heading><Accordion.Trigger><MethodMark type={group.type}/><span className="topic-name"><strong>{group.goal}</strong><small>{group.method}</small></span><Accordion.Indicator/></Accordion.Trigger></Accordion.Heading>
          <Accordion.Panel><Accordion.Body>{group.routes.map(r=><Link className="chapter-link" key={r.href} href={r.href}><span>{r.source}</span>{group.routes.filter(row=>row.source===r.source).length>1&&<small>{r.title}</small>}<i aria-hidden="true">↗</i></Link>)}</Accordion.Body></Accordion.Panel>
        </Accordion.Item>)}
      </Accordion> : <p role="status">Совпадений нет. Попробуйте название метода или другое слово из условия.</p>}
    </div>
  </section>;
}

function Home({groups,first,recent,lab}) {
  return <><Mast lab={lab}/><main className="book-main">
    <section className="book-intro"><div className="cover-copy">
      <p className="book-kicker">ОмГТУ · Интерактивное пособие</p>
      <h1>Методы<br/><em>оптимизации</em></h1>
      <p className="cover-lead">Как доставить груз дешевле, распределить ресурсы или выбрать лучший план? Начните с двух складов и попробуйте снизить стоимость доставки.</p>
      <div className="cover-actions"><Link href={first} className="course-cta">Разобрать доставку <span aria-hidden="true">→</span></Link><Link href="#contents">Выбрать задание ↓</Link></div>
      {recent && <Link className="resume-link" href={recent.href}>Продолжить · {recent.title} →</Link>}
    </div><div id="featured"/></section><Catalogue groups={groups}/></main></>;
}

function Lesson({title,summary,source,variant,phases,active,lab,data}) {
  const [reading,setReading]=useState(active!==0);
  const heading=useRef(null), back=useRef(null);
  function openReading() {
    setReading(true);
    requestAnimationFrame(()=>heading.current?.focus());
  }
  function openIntro() {
    setReading(false);
    requestAnimationFrame(()=>back.current?.focus());
  }
  return <><Mast lab={lab}/><main className="book-main">
    <div className="lesson-intro"><Link href="index.html#contents">← Все задания</Link>
      <div className="lesson-identity"><MethodMark type={data.type}/><p className="book-kicker">{source} · Вариант {variant}</p></div><h1 className="lesson-title" ref={back} tabIndex="-1">{title}</h1>{active!==0&&<><p className="lesson-summary">{summary}</p><Link href={phases[0].href}>Посмотреть наглядный пример с начала →</Link></>}
    </div>
    {active===0&&<><div hidden={reading}><LessonIntro data={data} onOpen={openReading}/></div>
      {reading&&<Button variant="ghost" onPress={openIntro}>← Вернуться к наглядному примеру</Button>}</>}
    <div className="book-layout" hidden={!reading}><aside className="book-outline"><h2>Ход занятия</h2>
      <nav aria-label="Этапы занятия">{phases.map(({name,href},i)=><Link key={href} href={href} aria-current={i===active?'step':undefined}><span>{i+1}</span>{name}</Link>)}</nav>
      <Link className="book-reference" href={lab}>Открыть лабораторию ↗</Link></aside>
      <section className="lesson-work"><div className="book-kicker">Этап {active+1} из {phases.length}</div><h2 tabIndex="-1" ref={heading}>{phases[active].name}</h2><div id="lesson-body"/></section>
    </div></main></>;
}

function Gallery({titles,onSelect}) {
  const [active,setActive] = useState(0);
  const [open,setOpen] = useState(false);
  const trigger = useRef(null);
  function choose(index) {
    onSelect(index);
    setActive(index);
    if (open) trigger.current?.focus({preventScroll:true});
    setOpen(false);
  }
  const choices = titles.map((title,i)=><Button key={i} variant="ghost" className="scene-item"
    aria-pressed={active===i} aria-controls={'demo-view-'+i} onPress={()=>choose(i)}>
    <span className="scene-number" aria-hidden="true">{i+1}</span><span>{title}</span>
  </Button>);
  return <div className="scene-head">
    <div className="demo-toolbar"><h3 id="demo-heading">Разбор в движении</h3>
      {titles.length>1 && <span className="demo-count">{active+1} из {titles.length}</span>}</div>
    {titles.length===1 ? <p className="scene-title">{titles[0]}</p> :
      titles.length<=3 ? <div className="short-scenes" role="group" aria-label="Темы анимации">{choices}</div> :
      <><div className="scene-current"><p className="scene-title">{titles[active]}</p>
        <Button ref={trigger} className="scene-switch" variant="secondary" aria-expanded={open} aria-controls="scene-index" onPress={()=>setOpen(!open)}>{open?'Свернуть темы':'Выбрать тему'}</Button></div>
        <div id="scene-index" hidden={!open} className="scene-index" role="group" aria-label="Темы анимации" onKeyDown={e=>{
          if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}
        }}>{open && choices}</div>
        <div className="scene-travel"><Button variant="ghost" isDisabled={active===0} aria-label="Предыдущая тема" onPress={()=>choose(active-1)}>← Назад</Button>
          <Button variant="ghost" isDisabled={active===titles.length-1} aria-label="Следующая тема" onPress={()=>choose(active+1)}>Следующая тема →</Button></div></>}
  </div>;
}

function StudyViews({onChange,items}) {
  const [view,setView] = useState(items[0][0]);
  return <div className="study-views" role="group" aria-label="Как посмотреть пример">
    {items.map(([key,title,id])=><Button key={key} variant="ghost" aria-controls={id}
      aria-pressed={view===key} onPress={()=>{onChange(key);setView(key);}}><MethodMark type={key}/>{title}</Button>)}
  </div>;
}

function ShipmentExample() {
  const [sent,setSent] = useState(0);
  const units = (count,total) => <span className="crate-strip" aria-hidden="true">{Array.from({length:total},(_,i)=><i key={i} data-full={i<count}/>)}</span>;
  return <div className="shipment-example"><p>На складе 6 ящиков. Магазин заказал 4. Отправляйте по одному и следите, сколько осталось.</p>
    <div className="shipment-ledger"><div><span>На складе</span>{units(6-sent,6)}<strong>{6-sent}</strong></div>
      <div><span>В магазине</span>{units(sent,4)}<strong>{sent} из 4</strong></div></div>
    <div className="shipment-actions"><Button variant="primary" isDisabled={sent===4} onPress={()=>setSent(n=>Math.min(n+1,4))}>Отправить 1 ящик</Button>
      <Button variant="ghost" isDisabled={sent===0} onPress={()=>setSent(0)}>Сначала</Button></div>
    <p role="status" className="shipment-status">{sent===4?'Заказ выполнен. На складе осталось 2 ящика для другого магазина.':sent>0?'До выполнения заказа осталось отправить: '+(4-sent)+'.':''}</p>
  </div>;
}

function Answer({options,numeric,hint,assess,onSolved}) {
  const [entry,setEntry] = useState('');
  const [feedback,setFeedback] = useState(null);
  const input = useRef(null);
  function submit(value,why) {
    if (feedback?.ok) return;
    const result = assess(value,why);
    setFeedback({value,...result,attempt:(feedback?.attempt || 0)+1});
    if (result.ok) onSolved();
    else if (numeric) {input.current.focus();input.current.select();}
  }
  function message() {
    return <div key={feedback.attempt} className={'answer-note '+(feedback.ok?'correct':'retry')}>
      <strong>{feedback.ok?'✓ Верно':'Попробуйте ещё раз'}</strong>{feedback.message && <span>{feedback.message}</span>}
    </div>;
  }
  return <div className="exercise-answer">
    <span className="answer-announcement" role="status" aria-atomic="true">{feedback && (feedback.ok?'Верно. ':'Попытка '+feedback.attempt+'. Попробуйте ещё раз. ')+feedback.message}</span>
    {numeric ? <form onSubmit={e=>{e.preventDefault();submit(entry);}}>
      <label htmlFor="numeric-answer">Ваш ответ</label><div className="number-entry">
        <input ref={input} id="numeric-answer" value={entry} placeholder="Число или дробь" readOnly={feedback?.ok}
          aria-invalid={feedback && !feedback.ok || undefined} onChange={e=>{setEntry(e.target.value);setFeedback(null);}}/>
        <Button type="submit" variant="primary" isDisabled={feedback?.ok}>Проверить</Button></div>
      {feedback && message()}
    </form> : <div className="answer-list" role="group" aria-label="Варианты ответа">
      {options.map(option=>{
        const selected = feedback?.value===option.value;
        return <div key={option.value} className={'answer-option'+(selected?(feedback.ok?' chosen correct':' chosen retry'):'')}>
          <Button className="book-option" variant="ghost" aria-disabled={feedback?.ok || undefined}
            onPress={()=>submit(option.value,option.why)}><span className="answer-mark" aria-hidden="true">{selected?(feedback.ok?'✓':'×'):''}</span>{option.label}</Button>
          {selected && message()}
        </div>;
      })}
    </div>}
    {hint && !feedback?.ok && <details className="exercise-hint"><summary>Взять подсказку</summary><p>{hint}</p></details>}
  </div>;
}

function Reflection({map,progress,save,next}) {
  const [draft,setDraft] = useState(progress.draft || '');
  const [compared,setCompared] = useState(Boolean(progress.compared));
  const [stored,setStored] = useState(true);
  return <div className="reflection">
    <p className="book-callout">{map.q.q}</p>
    <details className="book-map"><summary>Посмотреть схему метода</summary><ol>{map.nodes.map(([name,description])=><li key={name}><strong>{name}</strong><p>{description}</p></li>)}</ol></details>
    <label htmlFor="book-reason">Ваше объяснение <small>по желанию</small></label>
    <TextArea id="book-reason" aria-describedby="draft-help" rows={3} value={draft} onChange={event=>{
      const value = event.target.value;
      setDraft(value); setStored(save({draft:value}));
    }}/>
    <p id="draft-help">{stored ? 'Личная заметка сохраняется в этом браузере. Сравните её с объяснением ниже.' : 'Браузер блокирует сохранение. Заметка доступна до ухода со страницы.'}</p>
    <Button id="book-compare" variant="primary" onPress={()=>{save({draft,compared:true});setCompared(true);}}>Показать объяснение</Button>
    <div id="principle" aria-live="polite">{compared && <><p className="book-rule">{map.q.why}</p><Link href={next}>Дополнить решение →</Link></>}</div>
  </div>;
}

function mount(host,element) {
  const root = createRoot(host);
  flushSync(()=>root.render(element));
  return () => root.unmount();
}
export const home = (host,props) => mount(host,<Home {...props}/>);
export const lesson = (host,props) => mount(host,<Lesson {...props}/>);
export const gallery = (host,props) => mount(host,<Gallery {...props}/>);

export const reflection = (host,props) => mount(host,<Reflection {...props}/>);

export const views = (host,props) => mount(host,<StudyViews {...props}/>);
export const answer = (host,props) => mount(host,<Answer {...props}/>);
export const shipmentExample = host => mount(host,<ShipmentExample/>);

export const planProbe = (host,model) => mount(host,<PlanProbe model={model}/>);
