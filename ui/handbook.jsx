import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Accordion} from '@heroui/react/accordion';
import {Button} from '@heroui/react/button';
import {Label} from '@heroui/react/label';
import {Link} from '@heroui/react/link';
import {ListBox} from '@heroui/react/list-box';
import {SearchField} from '@heroui/react/search-field';
import {Select} from '@heroui/react/select';
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
          <Accordion.Heading><Accordion.Trigger><span className="topic-name"><strong>{group.goal}</strong><small>{group.method}</small></span><Accordion.Indicator/></Accordion.Trigger></Accordion.Heading>
          <Accordion.Panel><Accordion.Body>{group.routes.map(r=><Link className="chapter-link" key={r.href} href={r.href}><span>{r.title}</span><small>{r.source} →</small></Link>)}</Accordion.Body></Accordion.Panel>
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

function Lesson({title,summary,source,variant,phases,active,lab}) {
  return <><Mast lab={lab}/><main className="book-main">
    <div className="lesson-intro"><Link href="index.html#contents">← Все задания</Link>
      <p className="book-kicker">{source} · Вариант {variant}</p><h1 className="lesson-title">{title}</h1><p className="lesson-summary">{summary}</p>
    </div>
    <div className="book-layout"><aside className="book-outline"><h2>Ход занятия</h2>
      <nav aria-label="Этапы занятия">{phases.map(({name,href},i)=><Link key={href} href={href} aria-current={i===active?'step':undefined}><span>{i+1}</span>{name}</Link>)}</nav>
      <Link className="book-reference" href={lab}>Открыть лабораторию ↗</Link></aside>
      <section className="lesson-work"><div className="book-kicker">Этап {active+1} из {phases.length}</div><h2>{phases[active].name}</h2><div id="lesson-body"/></section>
    </div></main></>;
}

function Gallery({titles,onSelect}) {
  const [active,setActive] = useState(0);
  function choose(index) {
    onSelect(index);
    setActive(index);
  }
  return <><div className="demo-toolbar"><h3 id="demo-heading">Разбор в движении</h3><span className="demo-count">Тема {active+1} из {titles.length}</span></div>
    {titles.length===1 ? <p className="only-scene">{titles[0]}</p> :
    <div className="scene-navigation">
      <Select className="scene-choice" value={String(active)} onChange={key=>key!=null && choose(Number(key))}>
        <Label>Что разобрать</Label><Select.Trigger><Select.Value/><Select.Indicator/></Select.Trigger>
        <Select.Popover className="scene-menu"><ListBox>{titles.map((name,i)=><ListBox.Item id={String(i)} key={i} textValue={name}>{name}<ListBox.ItemIndicator/></ListBox.Item>)}</ListBox></Select.Popover>
      </Select>
      <div className="scene-arrows"><Button isIconOnly variant="secondary" aria-label="Предыдущая тема" isDisabled={active===0} onPress={()=>choose(active-1)}>←</Button>
      <Button isIconOnly variant="secondary" aria-label="Следующая тема" isDisabled={active===titles.length-1} onPress={()=>choose(active+1)}>→</Button></div>
    </div>}</>;
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
}
export const home = (host,props) => mount(host,<Home {...props}/>);
export const lesson = (host,props) => mount(host,<Lesson {...props}/>);
export const gallery = (host,props) => mount(host,<Gallery {...props}/>);

export const reflection = (host,props) => mount(host,<Reflection {...props}/>);
