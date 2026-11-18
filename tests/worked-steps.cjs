const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {chromium}=require('playwright');

(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const base=process.env.BOOK_URL||pathToFileURL(path.resolve(__dirname,'../index.html')).href;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);
    const urls=await page.locator('.chapter-link').evaluateAll(a=>a.map(l=>l.href));
    let count=0;
    for(const url of urls){
      await page.goto(url+'&view=trial');
      await page.getByRole('button',{name:'Перейти к методу'}).click();
      await page.getByRole('button',{name:'Разобрать по шагам'}).click();
      count+=await page.evaluate(async()=>{
        const host=document.querySelector('#lesson-body');
        const wait=()=>new Promise(done=>requestAnimationFrame(done));
        const detail=LEARN.selectStages(LEARN.allStages,{depth:'detail'});
        const steps=LEARN.allStages.filter(s=>detail.includes(s)||s.freightLeg!=null);
        for(let i=0;i<steps.length;i++){
          for(let k=0;k<3;k++){
            const film=host.querySelector('.freight-film');
            if(film){
              if(film.dataset.frame!=='2'||!film.querySelector('[data-cue="'+k+'"][data-shown=true]')?.innerText.trim())throw Error('Missing reduced motion explanation');
              if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Overflow '+steps[i].title);
              continue;
            }
            const tab=host.querySelectorAll('.walk-rail button')[k];
            if(!tab)throw Error('Missing frame '+steps[i].title);
            tab.click();await wait();
            const text=host.querySelector('.walk-current').innerText;
            if(!text.trim()||/undefined|NaN|\[object Object\]/.test(text))throw Error(steps[i].title+' '+text);
            if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Overflow '+steps[i].title+' '+k);
          }
          if(steps[i].freightLeg!=null){
            const e=LEARN.sceneData.T.first.steps[steps[i].freightLeg],grid=host.querySelector('.freight-grid');
            if(grid.tBodies[0].rows[e.i].cells[e.j+1].textContent!==LU.txt(e.x)
              ||grid.tBodies[0].rows[e.i].lastElementChild.textContent!==LU.txt(e.a1)
              ||grid.tFoot.rows[0].cells[e.j+1].textContent!==LU.txt(e.b1))throw Error('Incorrect allocation or balances');
          }
          if(i+1<steps.length){host.querySelector('#step-foot .book-primary').click();await wait();}
        }
        return steps.length;
      }).catch(e=>{throw Error(url+' '+e.message)});
    }
    await page.goto(base+'?lesson=rgr.simplex&phase=0&view=trial');
    await page.getByRole('textbox',{name:'x₁',exact:true}).fill('-1');
    await page.getByRole('textbox',{name:'x₄',exact:true}).fill('2');
    const first=page.locator('.sub-system li').first();
    assert.match(await first.locator('.calc-values').innerText(),/11·\(−1\).*24·2.*37.*74/);
    assert.match(await page.locator('.sub-system li').nth(1).innerText(),/Нарушено/);
    await page.getByRole('textbox',{name:'x₂',exact:true}).fill('');
    assert.equal(await first.locator('.calc-check').count(),0);
    // A new freight leg starts on Next. Keep the navigation and the table
    // fixed even when the viewport was already at the bottom of the page.
    await page.evaluate(()=>localStorage.clear());
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.setViewportSize({width:1280,height:760});
    await page.goto(base+'?lesson=rgr.transp&phase=0&view=steps');
    const next=page.locator('#step-foot .book-primary'),film=page.locator('.freight-film');
    await next.click();await next.click();
    await film.getByRole('button',{name:'Пауза'}).click();
    const position=()=>page.evaluate(()=>[scrollY,...['#step-foot','.freight-grid'].map(selector=>document.querySelector(selector).getBoundingClientRect().y)]);
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    await next.scrollIntoViewIfNeeded();
    const before=await position();
    await next.click();
    const after=await position();
    after.forEach((n,i)=>assert.ok(Math.abs(n-before[i])<2,'Freight step moved the viewport or table'));
    await film.locator('[data-cue="2"][data-shown=true]').waitFor({timeout:10000});
    assert.equal(await film.locator('[data-write]').innerText(),'11');
    assert.match(await film.locator('[data-cue="2"]').innerText(),/42 − 11 = 31/);
    await film.getByRole('button',{name:'Повторить'}).click();
    assert.equal(await film.getAttribute('data-frame'),'0');
    await film.getByRole('button',{name:'Пауза'}).click();
    await page.waitForTimeout(2400);
    assert.equal(await film.getAttribute('data-frame'),'0');
    assert.deepEqual(errors,[]);
    console.log(count+' worked transitions across '+urls.length+' routes, three frames each; signed and missing operands verified.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
