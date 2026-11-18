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
    const open=id=>page.goto(base+'?lesson='+id+'&phase=0');
    const click=name=>page.getByRole('button',{name,exact:true}).click();
    const win=async()=>assert.equal(await page.locator('.trial-outcome:visible').getAttribute('data-won'),'true');
    await open('rgr.transp');
    const town=page.locator('.town-map'),amount=page.getByLabel('Ящиков',{exact:true});
    await town.getByRole('button',{name:/Склад 2,/}).press('Enter');
    await town.getByRole('button',{name:/Магазин 3,/}).click();
    assert.match(await town.locator('figcaption').innerText(),/3 км/);
    await amount.fill('99');await click('Отправить');assert.match(await page.locator('.dispatch-note').innerText(),/невозможен/);
    await amount.fill('5');await click('Отправить');
    assert.match(await page.locator('.dispatch-ledger .trial-verdict').innerText(),/Затраты по плану · 15/);
    await click('Проиграть мои рейсы');
    await page.waitForFunction(()=>document.querySelector('.dispatch-note')?.textContent.includes('Рейс 1'));
    await page.waitForFunction(()=>!document.querySelector('.dispatch-controls').disabled);
    await click('Перейти к методу');await click('К моему эксперименту');
    assert.equal(await page.locator('.trial-ledger [aria-pressed=true]').innerText(),'5');
    await click('Отменить рейс');
    const plans=await page.evaluate(()=>{
      const {P,X,X0}=LEARN.sceneData.T;
      const matrix=x=>x.slice(0,P.m0).map(r=>r.slice(0,P.n0).map(v=>v?LU.num(v):0));
      const locations=[...document.querySelectorAll('.town-stop')].map(el=>el.getAttribute('transform').match(/\d+/g).map(Number));
      const c=locations.slice(0,P.m0).map(([x,y])=>locations.slice(P.m0).map(([u,v])=>(Math.abs(x-u)+Math.abs(y-v))/38));
      const distance=ALGT.solve({a:P.a.slice(0,P.m0),b:P.b.slice(0,P.n0),c});
      return {optimal:matrix(X),first:matrix(X0),distance:matrix(distance.X)};
    });
    for(const [key,mode,won] of [['distance','km',true],['first','variant',false],['optimal','variant',true]]){
      await page.getByLabel('Как считать затраты').selectOption(mode);
      for(const [i,row] of plans[key].entries())for(const [j,q] of row.entries())if(q){
        await page.getByLabel('Откуда',{exact:true}).selectOption(String(i));await page.getByLabel('Куда',{exact:true}).selectOption(String(j));
        await amount.fill(String(q));await click('Отправить');
      }
      await click('Оценить мой план');
      assert.equal(await page.locator('.trial-outcome:visible').getAttribute('data-won'),String(won));
      await click('Новый план');
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
      await page.goto(url);
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
