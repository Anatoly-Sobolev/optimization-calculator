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
        const steps=LEARN.selectStages(LEARN.allStages,{depth:'detail'});
        for(let i=0;i<steps.length;i++){
          for(let k=0;k<3;k++){
            const tab=host.querySelectorAll('.walk-rail button')[k];
            if(!tab)throw Error('Missing frame '+steps[i].title);
            tab.click();await wait();
            const text=host.querySelector('.walk-current').innerText;
            if(!text.trim()||/undefined|NaN|\[object Object\]/.test(text))throw Error(steps[i].title+' '+text);
            if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Overflow '+steps[i].title+' '+k);
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
    assert.deepEqual(errors,[]);
    console.log(count+' worked transitions across '+urls.length+' routes, three frames each; signed and missing operands verified.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
