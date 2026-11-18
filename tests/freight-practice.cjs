const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const base=process.env.BOOK_URL||pathToFileURL(path.resolve(__dirname,'../index.html')).href;
    for(const source of ['rgr','zyk']){
      const lesson=base+'?lesson='+source+'.transp&phase=';
      await page.goto(lesson+'1');
      const scheme=page.locator('.freight-map-lesson'),exchange=scheme.locator('.freight-exchange');
      const before=await exchange.locator('.freight-proof-cost').innerText();
      await exchange.getByRole('button',{name:/Перенести/}).click();
      assert.notEqual(await exchange.locator('.freight-proof-cost').innerText(),before);
      await exchange.getByRole('button',{name:/Вернуть/}).click();
      assert.equal(await exchange.locator('.freight-proof-cost').innerText(),before);
      for(const name of ['Баланс','Первый рейс','Обмен','Минимум']){
        await scheme.getByRole('button',{name,exact:true}).click();
        await scheme.locator('.freight-grid').waitFor();
      }
      await page.goto(lesson+'3');
      const task=page.locator('.freight-practice'),click=name=>task.getByRole('button',{name,exact:true}).click();
      const expected=await page.evaluate(()=>{
        const T=LEARN.sceneData.T;
        return {cost:LU.txt(T.cost),amount:LU.txt(T.P.sb),charges:T.iters.map(s=>LU.txt(s.cost)),
          firstCycle:LEARN.allStages.findIndex(s=>s.cycleTrace),actions:LEARN.allStages.map(s=>{
            if(s.freightLeg!=null){
              const e=T.first.steps[s.freightLeg],P=T.P;
              const a=e.i<P.m0?'A'+LU.sub(e.i+1):'Недопоставка',b=e.j<P.n0?'B'+LU.sub(e.j+1):'Резерв';
              return s.freightLeg%2?'Выбрать '+a+' → '+b:LU.txt(e.x)+' ящ.';
            }
            if(s.cycleTrace)return s.answer+' ящ.';
            if(s.potential)return 'Построить цикл через эту клетку и проверить возможный обмен';
            if(s.title==='Баланс перевозок')return T.P.fict==='col'?'Добавить столбец для остатка на складах':'Начать распределение без дополнительного столбца';
            if(s.title==='Выбор начальной клетки')return T.init==='nw'?'С верхней левой клетки':'С доступной клетки с наименьшим тарифом';
            return 'Завершить расчёт и записать стоимость';
          })};
      });
      await click('Начать решение');
      for(let k=0;k<expected.actions.length;k++){
        assert.equal(await task.locator('.freight-film').count(),0);
        if(k===3){
          await click('Выбрать A₁ → B₁');
          await task.getByRole('status').waitFor();
          assert.equal(await task.locator('.freight-film').count(),0);
        }
        const motion=source==='rgr'&&k===expected.firstCycle;
        if(motion)await page.emulateMedia({reducedMotion:'no-preference'});
        await click(expected.actions[k]);
        if(motion){
          await task.locator('.freight-film .cycle-trail').waitFor();
          assert.ok(await task.getByRole('button',{name:'Следующее действие →'}).isDisabled());
          await task.locator('.freight-moving-number').first().waitFor({timeout:10000});
          assert.ok(await task.locator('.freight-moving-number').count()>=2);
          await page.emulateMedia({reducedMotion:'reduce'});
        }
        await task.locator('.freight-film[data-frame="2"]').waitFor();
        if(k===1){
          await page.reload();await click('Продолжить решение');
          await task.locator('.freight-film[data-frame="2"]').waitFor();
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await click(k===expected.actions.length-1?'Посмотреть всё решение':'Следующее действие →');
      }
      const final=task.locator('.freight-result');
      assert.match(await final.locator('h3').innerText(),new RegExp(expected.cost));
      assert.equal(await final.locator('.freight-history li').count(),expected.actions.length);
      for(const cost of expected.charges)assert.ok((await final.innerText()).includes(cost));
      await final.locator('.freight-history button').first().click();
      await task.locator('.freight-film').waitFor();await click('К полному решению');
      await page.reload();await click('Открыть готовое решение');await final.waitFor();
      await click('Решить ещё раз');await click('Начать решение');
      assert.match(await task.locator('.freight-position').innerText(),/Действие 1 из/);
    }
    assert.deepEqual(errors,[]);console.log('Both freight variants: illustrated method, gated choices, full solver trace, resume, replay and optimality certificate.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
