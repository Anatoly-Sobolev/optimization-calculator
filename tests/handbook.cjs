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
        if(phase===0) {
          assert.ok(await page.locator('.lesson-context dt').count()>=4,topic);
          await page.getByRole('button',{name:'Исследовать вариант',exact:true}).click();
          assert.ok(await page.locator('#variant-explorer button,#variant-explorer input,#variant-explorer [tabindex="0"]').count(),topic);
          const followup = page.locator('#variant-explorer .explorer-followup');
          await followup.locator('summary').click();
          await followup.locator('.scene-body button, .scene-body input, .scene-body [tabindex="0"]').first().waitFor({state:'attached'});
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),topic+' overflows');
      }
    }
    const artificial = topics.find(topic=>topic.includes('lesson=rgr.artificial'));
    await page.goto(artificial);
    assert.ok(await page.locator('.starting-equation').isVisible());
    const deck = page.locator('.book-demos');
    const visibleScene = deck.locator('.demo-view:visible');
    assert.equal(await visibleScene.count(),1);
    const originalScene = await deck.locator('.scene-title').innerText();
    await deck.getByRole('button',{name:'Следующая тема'}).click();
    assert.notEqual(await deck.locator('.scene-title').innerText(),originalScene);
    const initialTable = visibleScene.locator('table').first();
    await initialTable.waitFor();
    await page.waitForFunction(()=>{const el=document.querySelector('.demo-view:not([hidden]) .tblwrap');return el && el.clientWidth>0 && el.scrollWidth<=el.clientWidth+1;});
    assert.ok(await initialTable.evaluate(t=>t.getBoundingClientRect().right<=t.parentElement.getBoundingClientRect().right+1));
    await deck.getByRole('button',{name:'Выбрать тему'}).click();
    const options = deck.locator('#scene-index .scene-item');
    assert.ok(await options.count()>1);
    await options.last().click();
    assert.ok(await deck.getByRole('button',{name:'Следующая тема'}).isDisabled());
    await deck.getByRole('button',{name:'Выбрать тему'}).click();
    await options.first().click();
    await visibleScene.locator('.dm-next').click();
    const frame = await visibleScene.locator('.dmpos').innerText();
    await deck.getByRole('button',{name:'Следующая тема'}).click();
    await deck.getByRole('button',{name:'Предыдущая тема'}).click();
    assert.equal(await visibleScene.locator('.dmpos').innerText(),frame);
    await page.getByRole('button',{name:'Разобрать по шагам'}).click();
    assert.ok(await page.locator('#lesson-body').isVisible());
    assert.equal(await deck.isVisible(),false);
    await page.getByRole('button',{name:'Смотреть анимацию'}).click();
    assert.equal(await visibleScene.locator('.dmpos').innerText(),frame);

    const transport = topics.find(topic=>topic.includes('lesson=rgr.transp'));
    await page.goto(transport);
    const ship = page.getByRole('button',{name:'Отправить 1 ящик'});
    for (let i=0;i<4;i++) await ship.click();
    assert.ok(await ship.isDisabled());
    assert.match(await page.locator('.shipment-status').innerText(),/осталось 2/);
    await page.getByRole('button',{name:'Сначала',exact:true}).click();
    assert.ok(await ship.isEnabled());
    const sceneButtons = page.locator('.short-scenes button');
    assert.equal(await sceneButtons.count(),2);
    await sceneButtons.last().click();
    assert.equal(await sceneButtons.last().getAttribute('aria-pressed'),'true');
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.goto(transport.replace('phase=0','phase=3'));
    const wrong = page.getByRole('button',{name:'Баланс уже выполнен'});
    await wrong.click();
    const retry = page.locator('.answer-option.chosen.retry');
    assert.match(await retry.innerText(),/Попробуйте ещё раз/);
    assert.match(await retry.innerText(),/57/);
    assert.equal(await page.locator('#step-foot .book-primary').count(),0);
    await wrong.press('Enter');
    assert.ok(await retry.isVisible());
    await page.getByRole('button',{name:'Добавить фиктивного потребителя'}).click();
    assert.ok(await page.locator('.answer-option.chosen.correct').isVisible());
    await page.locator('#step-foot .book-primary').click();
    assert.equal(await page.locator('.answer-note').count(),0);
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
