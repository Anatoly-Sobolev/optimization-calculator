const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({viewport:{width:800,height:860},hasTouch:true,reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const base=process.env.BOOK_URL || pathToFileURL(path.resolve(__dirname,'../index.html')).href;
    async function lesson(name) {
      await page.goto(base+'?lesson=rgr.'+name+'&phase=0');
      await page.getByRole('button',{name:'Сразу к решению'}).click();
    }
    const view=page.locator('.demo-view:visible');
    async function choose(name) {
      await page.getByRole('button',{name:'Выбрать тему'}).click();
      await page.locator('.scene-item').filter({hasText:name}).click();
    }
    async function end() {
      await view.locator('.demo-settings summary').click();
      await view.locator('.dm-end').click();
    }
    await lesson('game');
    await choose('стратегии игроков и цена игры');await end();
    const probability=view.locator('.gx[data-i="1"]');
    await probability.press('Enter');
    assert.match(await view.locator('.cell-reading').innerText(),/13\/531 × 26,55 = 0,65/);
    await view.getByRole('button',{name:/Повторить заполнение/}).click();
    await page.waitForFunction(()=>document.querySelector('.demo-view:not([hidden]) .gx[data-i="1"] .cv')?.textContent==='0,65');
    assert.ok((await view.locator('.gy .cv').allTextContents()).every(s=>s===''));

    await lesson('netw');
    assert.equal(await view.locator('.net-times:visible').count(),0);
    await choose('ранние сроки');await end();
    assert.ok(await view.locator('.ntp').filter({hasText:'Р 0'}).count());

    await lesson('graph');
    const svg=view.locator('.gsvg'), box=()=>svg.getAttribute('viewBox');
    const original=await box();
    await view.getByRole('button',{name:'Увеличить масштаб'}).click();
    assert.notEqual(await box(),original);
    await view.locator('.graph-camera input').first().uncheck();
    await view.locator('.dm-next').click();
    assert.equal(await view.locator('.graph-camera input').first().isChecked(),false);
    await svg.scrollIntoViewIfNeeded();
    const rect=await svg.boundingBox(), x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    const start=await box();
    const cdp=await page.context().newCDPSession(page);
    const finger=(id,dx)=>({id,x:x+dx,y});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger(1,-20),finger(2,20)]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[finger(1,-45),finger(2,45)]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok(Number((await box()).split(' ')[2])<Number(start.split(' ')[2]));
    await view.getByRole('button',{name:'Исходный вид'}).click();
    assert.equal(await box(),original);assert.deepEqual(errors,[]);
    console.log('Verified calculation replay, early event times, layer persistence and two-finger zoom.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
