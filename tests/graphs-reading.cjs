const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('url');
(async()=>{
 const cache=path.join(process.env.LOCALAPPDATA,'ms-playwright');
 const executablePath=fs.readdirSync(cache).filter(n=>/^chromium-\d+$/.test(n)).map(n=>path.join(cache,n,'chrome-win64/chrome.exe')).find(fs.existsSync);
 const browser=await chromium.launch({executablePath,headless:true});
 const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(pathToFileURL(path.resolve('index.html')).href+'#s=rgr&t=graph&v=2');
 const demo=page.locator('.demo').filter({has:page.locator('.gside')}).first();
 await demo.locator('.dm-end').click();await page.waitForTimeout(150);
 // Rewind to step zero without timing-dependent playback.
 while(!(await demo.locator('.dm-prev').isDisabled())){await demo.locator('.dm-prev').click();await page.waitForTimeout(15);}
 assert.ok(await demo.locator('.gside').count());
 assert.ok(await demo.locator('.gsvg .dh').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='0')));
 await demo.locator('.dm-next').click();await page.waitForTimeout(900);
 assert.ok(await demo.locator('.gside').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='0')));
 await demo.locator('.dm-end').click();await page.waitForTimeout(150);
 assert.ok(await demo.locator('.gside').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity!=='0')));
 await page.locator('#learn-presentation').selectOption('text');await page.waitForTimeout(700);
 assert.ok(await page.locator('.learn-reading article').count()>3);
 assert.equal(await page.locator('#solution').isVisible(),true);
 assert.equal(await page.locator('.dmctl:visible').count(),0);
 assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
 assert.equal(await page.locator('#solution details:not([open])').count(),0);
 await page.reload();await page.waitForTimeout(500);assert.equal(await page.locator('#learn-presentation').inputValue(),'text');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'test-results/graph-reading-mobile.png'});
 await page.locator('#learn-presentation').selectOption('animated');assert.equal(await page.locator('.learn-reading').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS graph hidden states, rewind, final arrows, static explanations, no animations, persistence, mobile, switching');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
