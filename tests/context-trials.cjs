const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const base=process.env.BOOK_URL||pathToFileURL(path.resolve(__dirname,'../index.html')).href;
    const open=id=>page.goto(base+'?lesson='+id+'&phase=0&view=trial');
    const click=name=>page.getByRole('button',{name,exact:true}).click();
    const win=async()=>assert.equal(await page.locator('.trial-outcome:visible').getAttribute('data-won'),'true');
    await open('rgr.transp');
    const town=page.locator('.town-map');
    const cell=(i,j)=>page.getByRole('textbox',{name:'Склад '+(i+1)+', магазин '+(j+1),exact:true});
    const launch=page.locator('.launch-fleet'),result=page.locator('.fleet-result');
    const add=page.getByRole('button',{name:'Добавить ящик: склад 1, магазин 1',exact:true});
    await add.click();await add.click();
    assert.equal(await cell(0,0).inputValue(),'2');
    await click('Убрать ящик с выбранного рейса');assert.equal(await cell(0,0).inputValue(),'1');
    await click('2. Груз');assert.match(await page.locator('.freight-guide-page').innerText(),/до 24 ящ/);
    await click('3. Стоимость');assert.match(await page.locator('.freight-guide-page').innerText(),/1 ящ. × 5 ед. за ящик = 5 ед/);
    await click('Взять максимум · 24');assert.ok(await add.isDisabled());
    await click('Очистить');
    await page.setViewportSize({width:360,height:740});
    await add.click();assert.equal(await cell(0,0).inputValue(),'1');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.setViewportSize({width:1280,height:720});
    await town.getByRole('button',{name:/Склад 2,/}).press('Enter');
    await town.getByRole('button',{name:/Магазин 3,/}).click();
    assert.equal(await cell(1,2).getAttribute('data-active'),'true');
    await cell(1,2).fill('99');assert.ok(await launch.isDisabled());assert.match(await result.innerText(),/больше запаса/);
    await cell(1,2).fill('5');await cell(0,0).fill('2');
    assert.equal(await town.locator('.assigned-route').count(),2);
    await open('zyk.transp');assert.equal(await cell(1,2).inputValue(),'');
    await open('rgr.transp');await page.reload();assert.equal(await cell(1,2).inputValue(),'5');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await launch.click();
    assert.equal(await town.locator('.fleet-truck').count(),2);
    assert.ok(await cell(1,2).isDisabled());
    const positions=()=>town.locator('animateMotion').evaluateAll(ms=>ms.map(m=>{const v=m.parentNode.getCTM();return [v.e,v.f];}));
    const from=await positions();await page.waitForTimeout(300);const to=await positions();
    assert.equal(to.length,2);to.forEach((xy,k)=>assert.notDeepEqual(xy,from[k]));
    await page.waitForFunction(()=>document.querySelector('.fleet-result')?.dataset.state==='result');
    assert.match(await result.innerText(),/113 ящ/);assert.match(await page.locator('.freight-console dl').innerText(),/25 ед/);
    await click('Перейти к методу');await click('К моему эксперименту');
    await click('Очистить');await click('Вернуть план');assert.equal(await cell(0,0).inputValue(),'2');
    await click('Очистить');await page.emulateMedia({reducedMotion:'reduce'});
    const plans=await page.evaluate(()=>{
      const {P,X,X0}=LEARN.sceneData.T;
      const matrix=x=>x.slice(0,P.m0).map(r=>r.slice(0,P.n0).map(v=>v?LU.num(v):0));
      const locations=[...document.querySelectorAll('.town-stop')].map(el=>el.getAttribute('transform').match(/\d+/g).map(Number));
      const c=locations.slice(0,P.m0).map(([x,y])=>locations.slice(P.m0).map(([u,v])=>(Math.abs(x-u)+Math.abs(y-v))/38));
      const distance=ALGT.solve({a:P.a.slice(0,P.m0),b:P.b.slice(0,P.n0),c});
      return {optimal:matrix(X),first:matrix(X0),distance:matrix(distance.X)};
    });
    for(const [key,mode,won] of [['distance','km',true],['first','variant',false],['optimal','variant',true]]){
      await page.getByLabel('Тариф',{exact:true}).selectOption(mode);
      for(const [i,row] of plans[key].entries())for(const [j,q] of row.entries())if(q)await cell(i,j).fill(String(q));
      await launch.click();
      assert.equal(await result.getAttribute('data-state'),won?'won':'result');
      assert.match(await result.innerText(),won?/план оптимален/:/план не оптимален/);
      if(key==='first'){
        const qty=()=>page.locator('.dispatch-matrix input').evaluateAll(xs=>xs.map(x=>x.value));
        const before=await qty();
        const cost=()=>page.locator('.freight-console dd').last().innerText().then(s=>Number(s.match(/\d+/)[0]));
        const firstCost=await cost();
        await page.locator('.freight-improvement summary').click();
        await click('Испытать этот обмен');await launch.click();
        assert.ok(await cost()<firstCost);
        assert.match(await result.innerText(),/Все заказы выполнены/);
        await click('Вернуть план');assert.deepEqual(await qty(),before);
      }
      await click('Очистить');
    }
    await open('rgr.netw');
    const dates=await page.evaluate(()=>LEARN.sceneData.N.fwd.map(r=>[r.e,LU.num(r.val)]));
    for(const [event,date] of dates)if(date){
      await page.locator('.event-days button').filter({hasText:new RegExp('№ '+event+'день')}).click();
      await page.getByLabel('День события '+event,{exact:true}).fill(String(date));
    }
    await click('Испытать расписание');await win();
    await open('rgr.game');
    const weights=await page.evaluate(()=>{
      const x=LEARN.sceneData.G.x,lcm=x.reduce((v,q)=>v*q.d/Q.gcd(v,q.d),1n);
      return x.map(q=>String(q.n*lcm/q.d));
    });
    for(const [i,w] of weights.entries())await page.locator('.game-weights input').nth(i).fill(w);
    await click('Испытать стратегию');await win();
    await click('Сыграть партию');assert.ok(await page.locator('.round-receipt').isVisible());
    await page.goto(base);
    const paths=await page.locator('.chapter-link').evaluateAll(links=>links.map(a=>a.href));
    for(const url of paths.filter(u=>!/\.transp|\.netw|\.game/.test(u))){
      await page.goto(url+'&view=trial');
      const result=await page.evaluate(()=>{
        const d=LEARN.sceneData;
        let p=d.D??d.P;
        if(d.type==='canon'){
          const v=d.variant;
          p=ALGZ.normalize({...v,c:v.c.map(Q.of),rows:v.rows.map(r=>({...r,a:r.a.map(Q.of),b:Q.of(r.b)})),bounds:v.bounds.map(b=>({...b,b:Q.of(b.b)}))});
        }
        const r=d.rec.gomory??ALGZ.solve(p);
        return {status:r.status,x:r.x?.map(LU.txt)};
      });
      if(result.status==='optimal'){
        const inputs=page.locator('.trial-stepper input:visible');
        for(const [i,v] of result.x.entries())await inputs.nth(i).fill(v);
        await click('Проверить план');
      }else{
        await page.locator('.trial-challenge:visible summary').click();
        await page.locator('.trial-challenge:visible').getByRole('combobox').selectOption(result.status);await click('Проверить гипотезу');
      }
      await win();
    }
    assert.deepEqual(errors,[]);
    console.log('Verified free dispatch, replay, both price models, feasible and optimal plans, schedule, mixed strategy and all linear challenges.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
