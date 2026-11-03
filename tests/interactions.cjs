const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright');
const executable=process.env.CHROMIUM_PATH||fs.readdirSync(cache).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse().map(n=>path.join(cache,n,'chrome-win64/chrome.exe')).find(fs.existsSync);
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:executable});
  const page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(pathToFileURL(path.join(root,'index.html')).href+'#s=rgr&t=simplex&v=1');
    assert.equal(await page.locator('#trmode').count(),0);
    assert.doesNotMatch(await page.locator('#learning').textContent(),/старый|классический тренажёр/i);
    await page.locator('#learn-presentation').selectOption('learning');await page.locator('#learn-mode').selectOption('guided');
    await page.locator('#learn-hint').selectOption('request');
    const answer=async()=>{
      const value=await page.evaluate(()=>LEARN.stages[LEARN.session.index].answer);
      await page.locator('[data-answer]').evaluateAll((buttons,v)=>buttons.find(b=>b.dataset.answer===v).click(),value);
    };
    const advance=async(kind)=>{
      while(await page.evaluate(k=>LEARN.stages[LEARN.session.index]?.interaction?.kind!==k,kind)){
        assert.ok(await page.locator('#learn-progress').count(),'Missing interaction '+kind);
        if(!await page.locator('[data-learn="next"]').count())await answer();
        await page.locator('[data-learn="next"]').click();
      }
    };
    await advance('column');
    let s=await page.evaluate(()=>LEARN.stages[LEARN.session.index]);
    const originalIndex=await page.evaluate(()=>LEARN.session.index);
    const wrong=s.interaction.values.find(v=>v!==s.answer);
    await page.getByRole('button',{name:'Выбрать столбец '+wrong,exact:true}).click();
    assert.equal(await page.evaluate(()=>LEARN.session.index),originalIndex);
    assert.equal(await page.locator('[data-learn="next"]').count(),0);
    assert.equal(await page.locator('.learn-success').count(),0);
    const correct=page.getByRole('button',{name:'Выбрать столбец '+s.answer,exact:true});
    await correct.focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('.learn-success').count(),1);
    assert.ok(await page.locator('.learn-success').evaluate(e=>e.getAnimations({subtree:true}).length>0));
    assert.equal(Number(await page.locator('#learn-progress').getAttribute('value')),originalIndex+1);
    await page.locator('[data-view="compare"]').click();
    await page.waitForTimeout(600); // An interrupted replay must not overwrite comparison.
    assert.equal(await page.locator('.learn-compare > div').count(),2);
    await page.locator('[data-view="before"]').click();assert.equal(await page.locator('#learn-transformation h4').textContent(),'До шага');
    await page.locator('[data-view="after"]').click();assert.equal(await page.locator('#learn-transformation h4').textContent(),'После шага');
    await page.locator('[data-learn="next"]').click();await advance('row');
    s=await page.evaluate(()=>LEARN.stages[LEARN.session.index]);
    await page.getByRole('button',{name:'Выбрать '+s.answer.toLowerCase(),exact:true}).click();
    assert.equal(await page.locator('.learn-success').count(),1);
    await page.locator('[data-learn="next"]').click();await advance('cell');
    s=await page.evaluate(()=>LEARN.stages[LEARN.session.index]);
    const cell=page.locator(`.learn-pick[data-row="${s.interaction.row}"][data-col="${s.interaction.col}"]`);
    // Wrong location must remain wrong even if it contains the same number.
    const duplicate=await page.locator('.learn-pick').evaluateAll((bs,a)=>bs.findIndex(b=>b.dataset.pick===a.answer&&(Number(b.dataset.row)!==a.interaction.row||Number(b.dataset.col)!==a.interaction.col)),s);
    if(duplicate>=0){await page.locator('.learn-pick').nth(duplicate).click();assert.equal(await page.locator('[data-learn="next"]').count(),0);}
    else {const wrongCell=page.locator('.learn-pick').filter({hasText:/./});await wrongCell.evaluateAll((bs,a)=>bs.find(b=>Number(b.dataset.row)!==a.interaction.row||Number(b.dataset.col)!==a.interaction.col).click(),s);assert.equal(await page.locator('[data-learn="next"]').count(),0);}
    await cell.click();assert.equal(await page.locator('.learn-success').count(),1);
    await page.locator('[data-view="compare"]').click();
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.locator('.learn-compare').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),1);
    await page.screenshot({path:path.join(root,'test-results','interactive-mobile.png')});
    await page.locator('[data-learn="replay"]').click();await page.locator('#taskType').selectOption('graph');await page.waitForTimeout(600);
    assert.equal(await page.locator('#learn-transformation').count(),0);
    assert.equal(await page.locator('#learning').evaluate(e=>e.getAnimations({subtree:true}).length),0);
    await page.emulateMedia({reducedMotion:'reduce'});await answer();
    assert.equal(await page.locator('.learn-success').count(),1);
    assert.equal(await page.locator('#learning').evaluate(e=>e.getAnimations({subtree:true}).length),0);
    await page.locator('[data-view="compare"]').click();assert.equal(await page.locator('#learning').evaluate(e=>e.getAnimations({subtree:true}).length),0);
    await page.locator('#learn-depth').selectOption('deep');await page.locator('[data-learn="reveal"]').click();
    assert.equal(await page.locator('.learn-success').count(),0,'Reading/revealing is not a correct answer');
    await page.locator('[data-view="compare"]').click();assert.equal(await page.locator('.learn-compare > div').count(),2);
    assert.deepEqual(errors,[]);
    console.log('PASS: column/row/cell answers, wrong-answer gate, keyboard, success animation, progress, before/after comparison, mobile, cancellation, reduced motion, reading mode; duplicate-value cell tested: '+(duplicate>=0));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
