/* Целевые проверки новой учебной модели: контракты режимов, профили, сцены, прогресс.
 * Запуск: node tests/learning-model.cjs  (открывает index.html по file://, сервер не нужен).
 * Проверяются структура и поведение, а не точные тексты. */
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const url=pathToFileURL(path.join(root,'index.html')).href;
const browserRoot=path.join(process.env.LOCALAPPDATA||'','ms-playwright');
const installed=fs.existsSync(browserRoot)?fs.readdirSync(browserRoot).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse():[];
const executable=process.env.CHROMIUM_PATH||installed.map(n=>path.join(browserRoot,n,'chrome-win64','chrome.exe')).find(fs.existsSync);
const checks=[];const ok=m=>{checks.push(m);console.log('OK  '+m);};
const KEY='optimization.learning.v2';

(async()=>{
  const browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{})});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>m.type()==='error'&&errors.push(m.text()));
    await page.goto(url);
    const routes=await page.evaluate(()=>LEARN.registry().map(t=>({src:t.src,type:t.type,base:t.base||'graph',v:t.variants.find(v=>!v.broken).v})));
    assert.equal(routes.length,20);
    const setRoute=r=>page.evaluate(r=>{Object.assign(APP.state,{src:r.src,type:r.type,base:r.base,v:r.v,mode:'db',trainer:false,tinit:null,lastCustom:null});APP.render();},r);
    const setMode=async m=>{await page.locator('#learn-mode').selectOption(m);};
    await page.locator('#learn-presentation').selectOption('learning');

    /* 1. Контракты режимов */
    const modes=await page.evaluate(()=>({problems:LMODES.validate(),list:LMODES.list.map(m=>({id:m.id,goal:m.goal,kinds:m.contentKinds,excl:m.excludedKinds,rule:m.completionRule,inter:m.interactionKinds,aud:m.audience,engine:m.engine}))}));
    assert.deepEqual(modes.problems,[]);
    assert.equal(modes.list.length,6);
    for(const k of ['goal','rule']) assert.equal(new Set(modes.list.map(m=>m[k])).size,modes.list.length,'повтор '+k);
    assert.equal(new Set(modes.list.map(m=>JSON.stringify(m.kinds))).size,modes.list.length);
    assert.ok(modes.list.every(m=>m.excl.length&&m.inter.length&&m.aud));
    const meaningKinds=modes.list.find(m=>m.id==='meaning');
    assert.ok(!meaningKinds.kinds.some(k=>/numeric|pivot|tableau|real-stages/.test(k)),'знакомство не содержит вычислений');
    ok('Контракты режимов: уникальные цели, виды содержимого и критерии завершения');

    /* 2. Профили */
    const prof=await page.evaluate(()=>({missing:LPROFILES.missing(),bad:LEARN.registry().filter(t=>!LPROFILES.profileFor(t.type)).map(t=>t.type),mis:LPROFILES.keys().filter(k=>{const m=LPROFILES.types[k].misconceptions.length,s=LPROFILES.types[k].selfcheck.length;return m<2||m>4||s<2;}),texts:LPROFILES.keys().map(k=>LPROFILES.types[k].analogy)}));
    assert.deepEqual(prof.missing,[]);assert.deepEqual(prof.bad,[]);assert.deepEqual(prof.mis,[]);
    assert.equal(new Set(prof.texts).size,prof.texts.length);
    assert.ok(prof.texts.every(t=>/аналог/i.test(t)),'бытовой пример помечен как учебная аналогия');
    ok('Педагогические профили: все темы, 2–4 заблуждения, аналогии помечены, тексты не копируются');

    /* 3. Сценарии всех маршрутов */
    let total=0;const sceneTypes=new Set();const perRoute=[];
    for(const r of routes){
      await setRoute(r);
      const res=await page.evaluate(()=>{
        const out={},allowed=(m,k)=>LMODES.allows(m,k);
        const ids=new Set(LEARN.allStages.map(s=>s.id));
        for(const m of ['meaning','model','strategy','guided','solo','check']){
          const list=LEARN.scenario(m,'topic','deep');
          out[m]={n:list.length,scenes:list.filter(s=>s.kind==='scene').map(s=>s.scene),
            badTag:list.filter(s=>s.kind==='scene'&&!allowed(m,s.tag)).map(s=>s.id),
            noDef:list.filter(s=>s.kind==='scene'&&!LSCENE.has(s.scene)).map(s=>s.id),
            nonScene:list.filter(s=>s.kind!=='scene'),
            realStages:list.filter(s=>s.kind!=='scene').every(s=>ids.has(s.id)),
            tags:list.filter(s=>s.kind==='scene').map(s=>s.tag),assess:list.map(s=>s.assess||null),ids:list.map(s=>s.id),
            single:list.every(s=>s.single===true)};
          out[m].nonScene=out[m].nonScene.length;
        }
        out.defs=Object.values(LSCENE.defs).map(d=>({id:d.id,goal:!!d.goal,action:!!d.action,take:!!d.takeaway}));
        return out;
      });
      for(const m of ['meaning','model','strategy']){
        assert.ok(res[m].n>=3,`${r.type}: мало сцен в ${m}`);
        assert.deepEqual(res[m].badTag,[]);assert.deepEqual(res[m].noDef,[]);
        assert.equal(res[m].nonScene,0,'режим понимания не содержит вычислительных этапов');
        res[m].scenes.forEach(s=>sceneTypes.add(s));total+=res[m].n;
      }
      assert.ok(res.model.tags.includes('symbols')&&res.model.tags.includes('optimality'),'модель: обозначения и допустимое/оптимальное');
      assert.ok(res.model.tags.some(t=>['feasibility','interpretation'].includes(t)),'модель: допустимость или чтение результата');
      assert.ok(res.model.tags.includes('interpretation')||r.type==='canon','модель: интерпретация');
      assert.ok(res.strategy.tags.includes('method-map')&&res.strategy.tags.includes('stop-criteria'),'стратегия: карта и критерий остановки');
      assert.ok(res.guided.realStages&&res.solo.realStages&&res.check.realStages,'практика использует реальные этапы решения');
      assert.ok(res.guided.nonScene>0&&res.solo.nonScene>0);
      assert.equal(res.solo.scenes[0],'choice');
      assert.ok(res.check.assess.includes('concept')&&res.check.assess.includes('compute'),'проверка: понимание и вычисления');
      assert.ok(res.check.single,'проверка: одна попытка');
      const ids=[...res.meaning.ids,...res.model.ids,...res.strategy.ids];assert.equal(new Set(ids).size,ids.length,'сцены разных режимов не повторяются');
      assert.ok(res.meaning.assess.every(a=>a!=='compute'));
      assert.ok(res.defs.every(d=>d.goal&&d.action&&d.take),'у сцены есть цель, действие и вывод');
      perRoute.push(res);
    }
    assert.ok(total>=100,'десятки применений сцен: '+total);
    assert.ok(sceneTypes.size>=14,'типов сцен: '+sceneTypes.size);
    ok(`Сценарии 20 маршрутов: ${total} применений, ${sceneTypes.size} типов сцен, теги соответствуют контрактам, практика берёт реальные этапы`);

    /* 4. Все сцены монтируются без ошибок и не дают горизонтального переполнения (390 px) */
    let mounted=0;
    for(const r of routes){
      for(const m of ['meaning','model','strategy']){
        await setRoute(r);await page.evaluate(m=>{LEARN.progress.settings.mode=m;LEARN.progress.settings.depth='deep';APP.render();},m);
        const n=await page.evaluate(()=>LEARN.stages.length);
        for(let i=0;i<n;i++){
          await page.evaluate(i=>LEARN.go(i),i);
          const q=await page.evaluate(()=>({warn:!!document.querySelector('.scene .note.warn'),len:document.querySelector('.scene-body')?.textContent.length,over:document.documentElement.scrollWidth-innerWidth,scenes:document.querySelectorAll('.scene').length}));
          assert.ok(!q.warn&&q.len>0&&q.over<=0&&q.scenes===1,`${r.src}/${r.type}/${m}/${i}: ${JSON.stringify(q)}`);mounted++;
        }
      }
    }
    ok(`Все ${mounted} сцен монтируются; на 390 px нет переполнения`);
    await page.evaluate(()=>{LEARN.progress.settings.depth='detail';});

    /* 5. Сцены: мышь, клавиатура, касание */
    const graph=routes.find(r=>r.src==='rgr'&&r.type==='graph');
    await setRoute(graph);await setMode('meaning');
    assert.ok(await page.locator('.sc-opt').first().isDisabled(),'вопрос закрыт, пока не открыты карточки');
    await page.locator('.sc-chip').first().focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('.sc-chip').first().getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Tab');await page.keyboard.press('Space');
    assert.equal(await page.locator('.sc-chip').nth(1).getAttribute('aria-expanded'),'true');
    const chips=page.locator('.sc-chip');for(let i=2;i<await chips.count();i++)await chips.nth(i).click();
    await page.locator('.sc-opt[data-v="w0"]').click();
    assert.equal(await page.locator('.scene-nav [data-learn="next"]').isHidden(),true,'неверный ответ не открывает переход');
    await page.locator('.sc-opt[data-v="r"]').click();
    assert.ok(await page.locator('.scene-nav [data-learn="next"]').isVisible());assert.ok(await page.locator('.scene-takeaway').isVisible());
    await page.locator('[data-learn="next"]').click();
    for(const i of [...Array(await page.locator('.sc-row').count()).keys()]){
      const to=await page.evaluate(i=>LEARN.stages[LEARN.session.index].spec.items[i].to,i);
      await page.locator(`.sc-row[data-i="${i}"] .sc-opt[data-k="${to}"]`).click();
    }
    assert.ok(await page.locator('.scene-nav [data-learn="next"]').isVisible(),'сортировка засчитана');
    ok('Знакомство: карточки (Enter/Space), закрытый вопрос, неверный ответ не пропускает, сортировка');

    await setMode('strategy');
    const regionIdx=await page.evaluate(()=>LEARN.stages.findIndex(s=>s.scene==='region'));assert.ok(regionIdx>=0);
    await page.evaluate(i=>LEARN.go(i),regionIdx);
    await page.locator('.geo-pt').focus();
    const v0=await page.locator('.geo-pt').getAttribute('aria-valuetext');
    for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
    assert.notEqual(await page.locator('.geo-pt').getAttribute('aria-valuetext'),v0,'стрелки двигают точку');
    const box=await page.locator('.geo-pt-dot').boundingBox();const t0=await page.locator('.geo-pt').getAttribute('aria-valuetext');
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+60,box.y-40,{steps:5});await page.mouse.up();
    assert.notEqual(await page.locator('.geo-pt').getAttribute('aria-valuetext'),t0,'точку можно перетащить мышью');
    const best=await page.evaluate(()=>LEARN.sceneData.f.toNumber());
    await page.locator('.geo-t input').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(best));
    assert.ok(await page.locator('.scene-nav [data-learn="next"]').isVisible(),'линия уровня у оптимума засчитана');
    ok('Область и линия уровня: стрелки, перетаскивание мышью, засчитывание оптимума');

    const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const tp=await touch.newPage();await tp.goto(url);await tp.evaluate(()=>{LEARN.progress.settings.presentation='learning';LEARN.progress.settings.mode='meaning';});
    await tp.evaluate(r=>{Object.assign(APP.state,{src:r.src,type:r.type,base:r.base,v:r.v,mode:'db',trainer:false,tinit:null,lastCustom:null});APP.render();},graph);
    await tp.locator('.sc-chip').first().tap();assert.equal(await tp.locator('.sc-chip').first().getAttribute('aria-expanded'),'true');
    const tapSize=await tp.locator('.sc-chip').first().boundingBox();assert.ok(tapSize.height>=44,'крупная область нажатия');
    await touch.close();
    ok('Касание: карточка раскрывается, высота цели нажатия ≥ 44 px');

    /* 6. Специальные сцены: транспорт, сеть, игра, двойственность */
    const byType=t=>routes.find(r=>r.type===t&&r.src==='rgr')||routes.find(r=>r.type===t);
    const doScene=async(type,mode,scene,fn)=>{await setRoute(byType(type));await setMode(mode);const idx=await page.evaluate(s=>LEARN.stages.findIndex(x=>x.scene===s),scene);assert.ok(idx>=0,`${type}/${mode}/${scene}`);await page.evaluate(i=>LEARN.go(i),idx);await fn();assert.ok(await page.locator('.scene-nav [data-learn="next"]').isVisible(),`${type}/${scene} не засчитана`);};
    await doScene('transp','meaning','flows',async()=>{ // строим допустимый план по решению решателя
      const plan=await page.evaluate(()=>{const r=LEARN.sceneData.T;const X=r.X||r.iters.at(-1).X;return X.map(row=>row.map(v=>v==null?'0':v.toText().replace('−','-')));});
      for(let i=0;i<plan.length;i++)for(let j=0;j<plan[i].length;j++)await page.locator(`.flow-in input[data-i="${i}"][data-j="${j}"]`).fill(plan[i][j]);});
    await doScene('transp','model','flows',async()=>{for(let k=0;k<2;k++){const right=await page.locator('.sc-opt[data-v="r"]').count();if(!right)break;await page.locator('.sc-opt[data-v="r"]').click();const nx=page.locator('.sc-next');if(await nx.count())await nx.click();}});
    await doScene('transp','strategy','flows',async()=>{for(let k=0;k<3;k++){if(!await page.locator('.sc-opt[data-v="r"]').count())break;await page.locator('.sc-opt[data-v="r"]').click();const nx=page.locator('.sc-next');if(await nx.count())await nx.click();}});
    await doScene('netw','meaning','network',async()=>{const e=await page.evaluate(()=>{const r=LEARN.sceneData.N;const c=e=>r.arcs.filter(a=>a.j===e).length;return r.events.reduce((b,x)=>c(x)>c(b)?x:b);});await page.locator(`.net-ev[data-e="${e}"]`).click();});
    await doScene('netw','model','network',async()=>{const k=await page.evaluate(()=>{const r=LEARN.sceneData.N;const m=Math.max(...r.arcInfo.map(a=>a.full.toNumber()));return r.arcInfo.findIndex(a=>a.full.toNumber()===m);});await page.locator(`.net-arc[data-k="${k}"]`).focus();await page.keyboard.press('Enter');});
    await doScene('netw','strategy','network',async()=>{const ks=await page.evaluate(()=>LEARN.sceneData.N.arcInfo.map((a,k)=>a.crit?k:-1).filter(k=>k>=0));for(const k of ks){await page.locator(`.net-arc[data-k="${k}"]`).focus();await page.keyboard.press('Enter');}await page.locator('.net-check').click();});
    await doScene('game','meaning','heat',async()=>{await page.locator('.heat-head[data-i="0"]').click();await page.locator('.heat-head[data-i="1"]').click();});
    await doScene('game','model','heat',async()=>{const [i,j]=await page.evaluate(()=>{const C=LEARN.sceneData.G.C;let b=[0,0];C.forEach((r,i)=>r.forEach((v,j)=>{if(v.gt(C[b[0]][b[1]]))b=[i,j];}));return b;});await page.locator(`.heat-cell[data-i="${i}"][data-j="${j}"]`).click();});
    await doScene('game','strategy','heat',async()=>{
      const [i,j]=await page.evaluate(()=>{const G=LEARN.sceneData.G;return [G.rowMin.findIndex(v=>v.eq(G.lower)),G.colMax.findIndex(v=>v.eq(G.upper))];});
      await page.locator(`.heat-head[data-i="${i}"]`).click();await page.locator(`.heat-head[data-j="${j}"]`).click();await page.locator('.sc-opt[data-v="r"]').click();});
    await doScene('ilp','strategy','cutbar',async()=>{await page.locator('.sc-opt[data-v="r"]').click();});
    await doScene('ilp','model','lattice',async()=>{const n=await page.locator('.sc-cand').count();for(let i=0;i<n;i++)await page.locator('.sc-cand').nth(i).click();});
    await doScene('dual','strategy','dualpair',async()=>{for(let k=0;k<3;k++){await page.locator('.sc-opt[data-v="r"]').click();const nx=page.locator('.sc-next');if(await nx.count())await nx.click();}});
    await doScene('duality','strategy','shadow',async()=>{await page.locator('.sc-opt[data-v="r"]').click();});
    await doScene('simplex','strategy','stopjudge',async()=>{const st=await page.evaluate(()=>LEARN.stages.find(s=>s.scene==='stopjudge').spec.states.map(s=>s.done));for(let i=0;i<st.length;i++)await page.locator(`.sc-state[data-i="${i}"] .sc-opt[data-k="${st[i]?'stop':'go'}"]`).click();});
    await doScene('simplex','model','pointcheck',async()=>{
      const pts=await page.evaluate(()=>LEARN.stages.find(s=>s.scene==='pointcheck')&&0);
      const info=await page.evaluate(()=>{const inst=document.querySelectorAll('.sc-point');const P=LEARN.sceneData.P;return [...inst].map(li=>li.querySelector('.sc-pt').textContent);});
      for(let i=0;i<info.length;i++){const text=info[i].replace('x = ','');const feas=await page.evaluate(t=>{const P=LEARN.sceneData.P;const x=t.slice(1,-1).split('; ').map(s=>Q.parse(s));return ALG.check(P,x).every(c=>c.ok);},text);await page.locator('.sc-point').nth(i).locator(`.sc-opt[data-k="${feas?'y':'n'}"]`).click();}
      const b=page.locator('.sc-stage2 .sc-opt[data-v="r"]');if(await b.count())await b.click();});
    await doScene('simplex','meaning','slider',async()=>{const n=await page.locator('.sc-slider input').count();await page.locator('.sc-slider input').first().evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('.sc-slider input').first().evaluate(el=>{el.value=el.max;el.dispatchEvent(new Event('input',{bubbles:true}));});if(n>1)await page.locator('.sc-slider input').nth(1).evaluate(el=>{el.value=el.max;el.dispatchEvent(new Event('input',{bubbles:true}));});
      if(!await page.locator('.scene-nav [data-learn="next"]').isVisible())for(let k=0;k<n;k++)await page.locator('.sc-slider input').nth(k).evaluate(el=>{el.value=el.max;el.dispatchEvent(new Event('input',{bubbles:true}));});});
    ok('Сцены потоков, сети, игры, Гомори, двойственности, остановки, допустимости и ресурсов проходятся действиями пользователя');

    /* 7. Смена темы, повторные render, отмена */
    await setRoute(graph);await setMode('guided');
    await page.evaluate(()=>{for(let i=0;i<4;i++)APP.render();});
    const dup=await page.evaluate(()=>({dd:document.querySelectorAll('.dd').length,menus:document.querySelectorAll('.dd-menu').length,scenes:document.querySelectorAll('.scene').length,learning:document.querySelectorAll('#learning').length,idDup:[...document.querySelectorAll('[id]')].length-new Set([...document.querySelectorAll('[id]')].map(e=>e.id)).size}));
    assert.equal(dup.menus,0);assert.equal(dup.learning,1);assert.equal(dup.idDup,0);
    await setMode('strategy');
    await page.evaluate(i=>LEARN.go(i),regionIdx);
    await page.locator('#taskType').selectOption('simplex');
    const after=await page.evaluate(()=>({type:LEARN.stages[0].id.split('-')[0],anim:document.getElementById('learning').getAnimations({subtree:true}).filter(x=>!(x instanceof CSSTransition)).length,scenes:document.querySelectorAll('.scene').length,sessions:APP.state.type}));
    assert.equal(after.type,'simplex');assert.equal(after.anim,0);assert.equal(after.scenes,1);
    ok('Повторные render() без дублей; смена темы заменяет сцену и отменяет анимации');

    /* 8. Практика с поддержкой: изменившиеся значения; самостоятельно: диагностика; проверка: одна попытка */
    await setRoute(graph);await setMode('solo');
    await page.locator('.sc-opt[data-v="w0"]').click();
    assert.ok(await page.locator('.scene-out.bad').isVisible(),'неверный первый шаг — диагностика без ответа');
    await page.locator('.sc-opt[data-v="r"]').click();await page.locator('[data-learn="next"]').click();
    let diagnosed=false;
    for(let guard=0;guard<30&&!diagnosed;guard++){
      const s=await page.evaluate(()=>{const x=LEARN.stages[LEARN.session.index];return {scene:x.kind==='scene',num:!!x.numeric,ans:x.answer};});
      if(s.scene)break;
      if(s.num&&!/^[−-]?0$/.test(s.ans)){
        const neg=s.ans.startsWith('−')?s.ans.slice(1):'-'+s.ans;
        await page.locator('#learn-answer').fill(neg);await page.locator('#learn-answer-form button[type=submit]').click();
        const fb=await page.locator('#learn-feedback').textContent();assert.match(fb,/знак/);assert.ok(!fb.includes('Ответ:'),'ответ не раскрывается');
        diagnosed=true;break;
      }
      if(await page.locator('.learn-pick').count()||true){const a=await page.evaluate(()=>LEARN.stages[LEARN.session.index].answer);if(s.num){await page.locator('#learn-answer').fill(s.ans);await page.locator('#learn-answer-form button[type=submit]').click();}else await page.locator(`[data-answer="${a.replace(/"/g,'\\"')}"]`).first().click({force:true}).catch(async()=>{await page.locator('.learn-alternative summary').click();await page.locator(`[data-answer="${a.replace(/"/g,'\\"')}"]`).first().click();});}
      await page.locator('[data-learn="next"]').click();
    }
    assert.ok(diagnosed,'найден числовой этап для диагностики знака');
    ok('Самостоятельное решение: выбор первого шага, диагностика ошибки знака без раскрытия ответа');

    await setRoute(graph);await setMode('check');
    const n=await page.evaluate(()=>LEARN.stages.length);
    assert.ok(await page.locator('[data-learn="hint"]').count()===0,'в проверке нет подсказок');
    await page.locator('.sc-opt[data-v^="w"]').first().click();
    assert.ok(await page.locator('.sc-opt').first().isDisabled(),'одна попытка: варианты заблокированы');
    assert.equal(await page.evaluate(()=>Object.values(LEARN.session.answers)[0].correct),false);
    for(let i=0;i<n;i++){
      const s=await page.evaluate(()=>{const x=LEARN.stages[LEARN.session.index];return {scene:x.kind==='scene',num:!!x.numeric,ans:x.answer};});
      if(!(await page.evaluate(()=>!!LEARN.session.answers[LEARN.stages[LEARN.session.index].id]?.solved))){
        if(s.scene)await page.locator('.sc-opt[data-v="r"]').click();
        else if(s.num){await page.locator('#learn-answer').fill(s.ans);await page.locator('#learn-answer-form button[type=submit]').click();}
        else{const a=s.ans;await page.evaluate(a=>{const b=[...document.querySelectorAll('[data-answer]')].find(x=>x.dataset.answer===a);if(b)b.click();else document.querySelector('.learn-pick')?.click();},a);}
      }
      await page.locator('[data-learn="next"]').click();
    }
    const end=await page.locator('#learning').textContent();assert.match(end,/Понимание:/);assert.match(end,/Вычисления:/);
    const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).skills['rgr:graph'].check,KEY);
    assert.ok(saved.concept.total>=3&&saved.compute.total>=1&&saved.concept.right<saved.concept.total);
    ok('Проверка знаний: одна попытка, раздельные баллы понимания и вычислений сохранены');

    const simplex=routes.find(r=>r.src==='rgr'&&r.type==='simplex');
    await setRoute(simplex);await setMode('guided');await page.locator('#learn-hint').selectOption('request');
    let seenPick=false,seenChanged=false;
    for(let guard=0;guard<60&&!seenChanged;guard++){
      const s=await page.evaluate(()=>{const x=LEARN.stages[LEARN.session.index];return {scene:x.kind==='scene',kind:x.interaction?.kind,ans:x.answer};});
      if(s.scene){await page.locator('.sc-opt[data-v="r"]').click();}
      else if(s.kind){
        seenPick=seenPick||await page.locator('.learn-pick').count()>0;
        await page.evaluate(()=>{const x=LEARN.stages[LEARN.session.index];const b=[...document.querySelectorAll('.learn-pick')].find(el=>el.dataset.pick===x.answer&&(x.interaction.kind!=='cell'||(+el.dataset.row===x.interaction.row&&+el.dataset.col===x.interaction.col)));b.click();});
        if(s.kind==='cell'){await page.waitForTimeout(900);seenChanged=await page.locator('.learn-changed').count()>0;}
      } else await page.evaluate(()=>{const x=LEARN.stages[LEARN.session.index];[...document.querySelectorAll('[data-answer]')].find(el=>el.dataset.answer===x.answer).click();});
      if(!seenChanged)await page.locator('[data-learn="next"]').click();
    }
    assert.ok(seenPick,'выбор в таблице доступен');assert.ok(seenChanged,'после шага рамкой отмечены изменившиеся значения');
    ok('Практика с поддержкой использует прежний механизм этапов');

    /* 9. Прогресс: модель освоения */
    const mastery=await page.evaluate(()=>{
      const d=LPROG.fresh();const k='x';
      const r=(mode,o)=>LPROG.record(d,k,mode,{total:5,firstTry:5,errors:0,hints:0,revealed:0,errorKinds:[],concept:{right:0,total:0},compute:{right:0,total:0},...o});
      r('guided',{});r('solo',{});const a=LPROG.mastered(d.skills[k]);
      r('meaning',{});r('model',{});r('strategy',{});const b=LPROG.mastered(d.skills[k]);
      r('check',{concept:{right:4,total:5},compute:{right:3,total:4}});const c=LPROG.mastered(d.skills[k]);
      const e=LPROG.fresh();LPROG.record(e,'y','solo',{total:5,firstTry:5,errors:0,hints:2,revealed:0,errorKinds:[],concept:{right:0,total:0},compute:{right:0,total:0}});
      return {a,b,c,hinted:LPROG.levels(e.skills.y).practice};
    });
    assert.equal(mastery.a,false);assert.equal(mastery.b,false);assert.equal(mastery.c,true);assert.equal(mastery.hinted,false);
    ok('Освоение темы требует понимания, практики и проверки; один маршрут не делает тему освоенной');

    /* 10. Сохранение после перезагрузки */
    await setRoute(graph);await setMode('model');
    await page.evaluate(()=>LEARN.go(1));
    await page.reload();
    assert.equal(await page.locator('#learn-mode').inputValue(),'model');
    assert.equal(await page.evaluate(()=>LEARN.session.index),1);
    ok('Режим и позиция сохраняются после перезагрузки');

    /* 11. Старые данные localStorage */
    const old=await browser.newPage({viewport:{width:390,height:844}});const oe=[];old.on('pageerror',e=>oe.push(e.message));
    await old.addInitScript(()=>{if(!localStorage.getItem('optimization.learning.v1')&&!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('optimization.learning.v1',JSON.stringify({version:1,settings:{mode:'next',depth:'brief',hint:'request',presentation:'learning'},topics:{'rgr:graph':{title:'Графический метод',completed:2,mastered:true}},sessions:{old:{index:3,answers:{},done:false}},streak:3,best:5}));}});
    await old.goto(url);
    const mig=await old.evaluate(()=>({mode:LEARN.progress.settings.mode,depth:LEARN.progress.settings.depth,solo:LEARN.progress.skills['rgr:graph'].solo.done,mastered:LPROG.mastered(LEARN.progress.skills['rgr:graph']),best:LEARN.progress.best,v1:!!localStorage.getItem('optimization.learning.v1'),visible:!document.getElementById('learning').hidden}));
    assert.equal(mig.mode,'guided');assert.equal(mig.depth,'brief');assert.equal(mig.solo,true);assert.equal(mig.mastered,false);assert.equal(mig.best,5);assert.equal(mig.v1,true);assert.ok(mig.visible);
    await old.close();
    const bad=await browser.newPage({viewport:{width:390,height:844}});const be=[];bad.on('pageerror',e=>be.push(e.message));
    await bad.addInitScript(()=>{localStorage.setItem('optimization.learning.v2','{не json');});
    await bad.goto(url);
    assert.equal(await bad.evaluate(()=>LEARN.progress.settings.mode),'meaning');assert.deepEqual(be,[]);
    await bad.close();assert.deepEqual(oe,[]);
    ok('Старый ключ v1 переносится без потерь для приложения; повреждённый v2 заменяется чистым состоянием');

    /* 12. Математическое решение не изменилось */
    const base=await browser.newPage({viewport:{width:390,height:844}});
    await base.route('**/learning.js*',r=>r.fulfill({contentType:'text/javascript',body:'const LEARN={begin(){},mount(){}};'}));
    await base.goto(url);
    for(const r of routes){
      const [a,b]=await Promise.all([page.evaluate(r=>{Object.assign(APP.state,{src:r.src,type:r.type,base:r.base,v:r.v,mode:'db',trainer:false,tinit:null,lastCustom:null});APP.render();return document.querySelector('#solution').textContent;},r),base.evaluate(r=>{Object.assign(APP.state,{src:r.src,type:r.type,base:r.base,v:r.v,mode:'db',trainer:false,tinit:null,lastCustom:null});APP.render();return document.querySelector('#solution').textContent;},r)]);
      assert.equal(a,b,`решение изменилось: ${r.src}/${r.type}`);
    }
    ok('Текст математического решения всех 20 маршрутов совпадает с контрольным рендером без учебного слоя');
    await base.close();

    assert.deepEqual(errors,[],'ошибки консоли: '+errors.slice(0,3).join(' | '));
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
    fs.writeFileSync(path.join(root,'test-results','learning-model-report.json'),JSON.stringify({checks,scenes:total,types:[...sceneTypes]},null,2));
    console.log('PASS: '+checks.length+' групп проверок');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
