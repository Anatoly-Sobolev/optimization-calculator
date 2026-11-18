const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({ viewport: { width:390, height:844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = pathToFileURL(path.resolve(__dirname,'../index.html')).href;
    await page.goto(base);
    const topics = await page.locator('.chapter-link').evaluateAll(links => links.map(link=>link.href));
    assert.equal(topics.length,20);
    for(const price of [26,21,16,11]) {
      assert.ok((await page.locator('.delivery-total').innerText()).includes(price+' ₽'));
      await page.locator('.cycle-control button').click();
    }
    assert.equal(await page.locator('.delivery-total').innerText(),'Доставка невозможна');
    assert.match(await page.locator('.cycle-caption').innerText(),/недопустим/);
    for(const topic of topics) {
      for(let phase=0;phase<4;phase++) {
        await page.goto(topic.replace('phase=0','phase='+phase));
        assert.equal(await page.locator('#lesson-body h3, #book-reason').count(),1,topic);
        if(phase===0) assert.ok(await page.locator('.lesson-context dt').count()>=4,topic);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),topic+' overflows');
      }
    }
    const artificial = topics.find(topic=>topic.includes('lesson=rgr.artificial'));
    await page.goto(artificial);
    assert.ok(await page.locator('.starting-equation').isVisible());
    const deck = page.locator('.book-demos');
    const visibleScene = deck.locator('.demo-view:visible');
    assert.equal(await visibleScene.count(),1);
    const picker = deck.getByRole('button',{name:/Что разобрать/});
    const originalScene = await picker.innerText();
    await deck.getByRole('button',{name:'Следующая тема'}).click();
    assert.notEqual(await picker.innerText(),originalScene);
    await picker.click();
    const options = page.getByRole('listbox').getByRole('option');
    assert.ok(await options.count()>1);
    await options.last().click();
    assert.ok(await deck.getByRole('button',{name:'Следующая тема'}).isDisabled());
    await picker.click();
    await options.first().click();
    await visibleScene.locator('.dm-next').click();
    const frame = await visibleScene.locator('.dmpos').innerText();
    await deck.getByRole('button',{name:'Следующая тема'}).click();
    await deck.getByRole('button',{name:'Предыдущая тема'}).click();
    assert.equal(await visibleScene.locator('.dmpos').innerText(),frame);
    await page.goto(topics[0].replace('phase=0','phase=1'));
    await page.locator('textarea').fill('Проверяю допустимость.');
    await page.locator('#book-compare').click();
    assert.ok(await page.locator('#principle a').isVisible());
    await page.reload();
    assert.equal(await page.locator('textarea').inputValue(),'Проверяю допустимость.');
    await page.goto(base+'#s=rgr&t=simplex&v=2');
    assert.equal(await page.locator('#taskType').inputValue(),'simplex');
    assert.deepEqual(errors,[]);
    console.log('Verified 20 chapters × 4 phases, mobile layout, diagram, draft restoration and legacy URL.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
