const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright');
const executable=process.env.CHROMIUM_PATH||fs.readdirSync(cache).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse().map(n=>path.join(cache,n,'chrome-win64/chrome.exe')).find(fs.existsSync);
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:executable});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(pathToFileURL(path.resolve('index.html')).href);
    const registry=await page.evaluate(()=>LEARN.registry().map(t=>({src:t.src,type:t.type,base:t.base,v:t.variants.find(v=>!v.broken).v})));
    let tables=0;
    for(const t of registry){
      await page.evaluate(t=>{Object.assign(APP.state,{...t,base:t.base||'graph',mode:'db',trainer:false});APP.render();document.querySelectorAll('#solution details').forEach(d=>d.open=true);},t);
      for(const width of [320,390,650]){
        await page.setViewportSize({width,height:844});await page.waitForTimeout(120);
        const check=await page.evaluate(()=>{
          const visible=[...document.querySelectorAll('#solution table')].filter(t=>t.getClientRects().length&&t.getBoundingClientRect().width);
          return {count:visible.length,bad:visible.filter(t=>{const p=t.parentElement,s=getComputedStyle(p),available=p.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight);return t.getBoundingClientRect().width>available+1;}).map(t=>({width:t.getBoundingClientRect().width,available:t.parentElement.clientWidth,zoom:t.style.zoom,cls:t.className})),overflow:[...document.querySelectorAll('#solution .tblwrap')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+1).map(e=>({width:e.clientWidth,scroll:e.scrollWidth}))};
        });
        assert.deepEqual(check.bad,[],`${t.src}/${t.type} at ${width}px: full table must fit`);
        assert.deepEqual(check.overflow,[],`${t.src}/${t.type} at ${width}px: table scrollbar`);
        tables+=check.count;
      }
      console.log('Fits: '+t.src+'/'+t.type+'/'+(t.base||''));
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{Object.assign(APP.state,{src:'rgr',type:'simplex',v:1});APP.render();});
    await page.locator('#learn-presentation').selectOption('learning');await page.locator('#learn-hint').selectOption('request');
    await page.evaluate(()=>{while(LEARN.stages[LEARN.session.index].interaction?.kind!=='column'){const s=LEARN.stages[LEARN.session.index];[...document.querySelectorAll('[data-answer]')].find(b=>b.dataset.answer===s.answer).click();document.querySelector('[data-learn="next"]').click();}});
    await page.waitForTimeout(150);
    const expected=await page.evaluate(()=>LEARN.stages[LEARN.session.index].answer);
    await page.getByRole('button',{name:'Выбрать столбец '+expected,exact:true}).click();assert.equal(await page.locator('.learn-success').count(),1);
    await page.locator('[data-view="compare"]').click();await page.waitForTimeout(150);
    assert.ok(await page.locator('#learning table').evaluateAll(ts=>ts.every(t=>t.getBoundingClientRect().width<=t.parentElement.clientWidth+1)));
    await page.locator('#learn-feedback').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/mobile-fit.png'});
    await page.setViewportSize({width:1366,height:1000});await page.waitForTimeout(120);
    assert.equal(await page.locator('.mobile-fit-table').count(),0);
    await page.setViewportSize({width:390,height:844});await page.emulateMedia({media:'print'});await page.waitForTimeout(120);
    assert.equal(await page.locator('.mobile-fit-table').count(),0);
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${tables} visible table checks, all 20 routes at 320/390/650px; mobile table click, comparison, desktop reset, print reset.`);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
