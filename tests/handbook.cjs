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
    const base = process.env.BOOK_URL || pathToFileURL(path.resolve(__dirname,'../index.html')).href;
    await page.goto(base);
    const topics = await page.locator('.chapter-link').evaluateAll(links => links.map(link=>link.href));
    assert.equal(topics.length,20);
    assert.equal(await page.locator('.chapter-link:visible').count(),20);

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
          const trial=page.locator('.context-trial');
          assert.ok(await trial.isVisible(),topic);
          const opening=trial.locator('.lesson-opening');
          assert.ok(await opening.isVisible(),topic);
          if(topic.includes('.transp')){
            await opening.locator('.town-map image').evaluate(el=>{const img=new Image();img.src=el.getAttribute('href');return img.decode();});
          }else await opening.locator('.lesson-art img').evaluate(image=>image.decode());

          assert.equal(await trial.locator('input:visible, .trial-challenge:visible').count(),0);
          assert.doesNotMatch(await opening.innerText(),/undefined|NaN|\[object Object\]/,topic);
          const effect=opening.locator('.opening-example p'),original=await effect.innerText();
          await opening.locator('.quantity-choice button').nth(1).click();
          assert.notEqual(await effect.innerText(),original,topic);
          await opening.locator('.quantity-choice button').first().click();
          assert.equal(await effect.innerText(),original,topic);
          await opening.locator('footer button').click();
          assert.equal(await trial.locator('.trial-challenge:visible, .freight-sim:visible').count(),1,topic);
          assert.doesNotMatch(await trial.innerText(),/undefined|NaN/);
          await trial.getByRole('button',{name:'Перейти к методу'}).click();
          await page.getByRole('button',{name:'Разобранный пример',exact:true}).click();
          const primer=page.locator('.lesson-primer');
          assert.ok(await primer.isVisible(),topic);
          assert.ok(await page.locator('.book-layout').isHidden(),topic);
          for (let n=0;n<3;n++) {
            assert.equal(await primer.locator('[aria-current="step"]').count(),1);
            assert.ok((await primer.locator('.primer-copy h2').innerText()).length>5);
            assert.doesNotMatch(await primer.innerText(),/undefined|NaN/);
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),topic);
            if(n===0)assert.ok(await primer.locator('.intro-key dt').count()>=2,topic);
            if(n===1){
              const sheet=primer.locator('.reading-diagram');
              assert.ok(await sheet.getByRole('table').isVisible(),topic);
              const frames=sheet.getByRole('group',{name:'Кадры схемы'}).getByRole('button');
              for(let frame=0;frame<3;frame++){
                await frames.nth(frame).click();
                assert.equal(await frames.nth(frame).getAttribute('aria-pressed'),'true',topic);
                assert.doesNotMatch(await sheet.innerText(),/undefined|NaN|\[object Object\]/);
              }
              if(topic.includes('transp')){
                const amount=await primer.getByRole('slider').inputValue();
                assert.equal(await sheet.locator('[data-flight=to]').innerText(),amount);
                await primer.getByRole('slider').press('Home');
                assert.equal(await sheet.locator('[data-flight=to]').innerText(),'0');
              }
            }
            const dial=primer.getByRole('slider'), choice=primer.locator('.primer-art button[aria-pressed="false"]').first();
            if(await dial.count()) await dial.press('End');
            else if(await choice.count()) await choice.click();
            await primer.locator('.primer-next').click();
          }
          assert.ok(await page.locator('.book-layout').isVisible());
          assert.ok(await page.locator('.lesson-context dt').count()>=4,topic);
          await page.getByRole('button',{name:'Исследовать вариант',exact:true}).click();
          assert.ok(await page.locator('#variant-explorer button,#variant-explorer input,#variant-explorer [tabindex="0"]').count(),topic);
          const followup = page.locator('#variant-explorer .explorer-followup');
          if(topic.includes('.transp'))await page.locator('.freight-inquiry .inquiry-pick-grid button').first().waitFor();
          else{
            await followup.locator('summary').click();
            await followup.locator('.scene-body button, .scene-body input, .scene-body [tabindex="0"]').first().waitFor({state:'attached'});
          }
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),topic+' overflows');
      }
    }
    // Follow a split order across two depots, then account for the surplus locally.
    await page.goto(topics.find(u=>u.includes('lesson=rgr.transp'))+'&view=example&part=scheme');
    const map=page.locator('.shipment-network'),sheet=page.locator('.reading-diagram'),volume=page.locator('.primer-art input[type=range]');
    assert.equal(await map.locator('[data-side=supply]').count(),4);
    assert.equal(await map.locator('[data-side=demand]').count(),4);
    await volume.press('End');
    assert.equal(await sheet.locator('[data-flight=to]').innerText(),'24');
    await page.getByRole('button',{name:'Следующая поставка'}).click();
    assert.match(await map.locator('.shipment-receipt').last().innerText(),/24 из 35/);
    await volume.press('End');
    assert.match(await map.locator('.shipment-receipt').last().innerText(),/24 \(A₁\) \+ 11 \(A₂\) = 35 из 35/);
    assert.equal(await sheet.locator('[data-flight=to]').innerText(),'11');
    await page.locator('.shipment-legs select').selectOption('7');
    await volume.press('End');
    assert.equal(await map.locator('.fleet-truck').count(),0);
    assert.match(await map.locator('.shipment-receipt').first().innerText(),/5 из 36/);
    assert.match(await map.locator('.shipment-receipt').last().innerText(),/5 из 5/);
    await page.locator('.primer-next').click();
    await map.getByRole('button',{name:/Выбрать A2 → B1/}).press('Enter');
    assert.match(await map.locator('.route-heading').innerText(),/A₂ → B₁/);

    await page.goto(topics.find(u=>u.includes('lesson=zyk.transp'))+'&view=example&part=scheme');
    const legs=page.locator('.shipment-legs select');
    await legs.selectOption('5');await volume.press('End');
    await legs.selectOption('6');assert.ok(await volume.isDisabled());
    await legs.selectOption('7');await volume.press('End');
    assert.equal(await sheet.locator('[data-flight=to]').innerText(),'14');

    const dualSimplex = topics.find(topic=>topic.includes('lesson=rgr.dsx'));
    await page.goto(dualSimplex+'&view=example');
    const intro=page.locator('.lesson-primer');
    await intro.getByRole('button',{name:'Включить на час'}).click();
    assert.equal(await intro.locator('.primer-order .filled').count(),10);
    assert.equal(await intro.locator('.primer-formula').innerText(),'10 − 14 = −4');
    await intro.locator('.primer-next').click();
    await intro.getByRole('slider').press('End');
    assert.equal(await intro.locator('.primer-gauge strong').innerText(),'0');
    await intro.locator('.primer-next').click();
    assert.match(await intro.innerText(),/Минимальные затраты · 15/);

    const artificial = topics.find(topic=>topic.includes('lesson=rgr.artificial'));
    await page.goto(artificial+'&view=trial');
    await page.getByRole('button',{name:'Перейти к методу'}).click();
    await page.locator('details.lesson-context > summary').click();
    assert.ok(await page.locator('.starting-equation').isVisible());
    const deck = page.locator('.book-demos');
    const visibleScene = deck.locator('.demo-view:visible');
    assert.equal(await visibleScene.count(),1);
    const originalScene = await deck.locator('.scene-title').innerText();
    await deck.getByRole('button',{name:'Следующая анимация'}).click();
    assert.notEqual(await deck.locator('.scene-title').innerText(),originalScene);
    const initialTable = visibleScene.locator('table').first();
    await initialTable.waitFor();
    await page.waitForFunction(()=>{const el=document.querySelector('.demo-view:not([hidden]) .tblwrap');return el && el.clientWidth>0 && el.scrollWidth<=el.clientWidth+1;});
    assert.ok(await initialTable.evaluate(t=>t.getBoundingClientRect().right<=t.parentElement.getBoundingClientRect().right+1));
    await deck.getByRole('button',{name:'Список анимаций'}).click();
    const options = deck.locator('#scene-index .scene-item');
    assert.ok(await options.count()>1);
    await options.last().click();
    assert.ok(await deck.getByRole('button',{name:'Следующая анимация'}).isDisabled());
    await deck.getByRole('button',{name:'Список анимаций'}).click();
    await options.first().click();
    await visibleScene.locator('.dm-next').click();
    const frame = await visibleScene.locator('.dmpos').innerText();
    await deck.getByRole('button',{name:'Следующая анимация'}).click();
    await deck.getByRole('button',{name:'Предыдущая анимация'}).click();
    assert.equal(await visibleScene.locator('.dmpos').innerText(),frame);
    await page.getByRole('button',{name:'Разобрать по шагам'}).click();
    assert.ok(await page.locator('#lesson-body').isVisible());
    assert.equal(await deck.isVisible(),false);
    await page.getByRole('button',{name:'Смотреть анимацию'}).click();
    assert.equal(await visibleScene.locator('.dmpos').innerText(),frame);

    const transport = topics.find(topic=>topic.includes('lesson=rgr.transp'));
    await page.goto(transport+'&view=trial');
    await page.getByRole('button',{name:'Перейти к методу'}).click();
    await page.locator('details.lesson-context > summary').click();
    const ship = page.getByRole('button',{name:'Отправить 1 ящик'});
    for (let i=0;i<4;i++) await ship.click();
    assert.ok(await ship.isDisabled());
    assert.match(await page.locator('.shipment-status').innerText(),/осталось 2/);
    await page.getByRole('button',{name:'Сначала',exact:true}).click();
    assert.ok(await ship.isEnabled());
    await page.getByRole('button',{name:'Список анимаций'}).click();
    const sceneButtons=page.locator('#scene-index .scene-item');
    assert.ok(await sceneButtons.count()>2);
    await sceneButtons.last().click();
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.getByRole('button',{name:'Исследовать вариант'}).click();
    const inquiry=page.locator('.freight-inquiry');
    await inquiry.getByRole('button',{name:'Записать в A₂ → B₁'}).click();
    assert.match(await inquiry.getByRole('status').innerText(),/Проверьте строку/);
    await inquiry.getByRole('button',{name:'Записать в A₁ → B₁'}).click();
    assert.match(await inquiry.getByRole('status').innerText(),/24 ящ/);
    await inquiry.getByText('Следующий вопрос →').click();
    assert.match(await inquiry.locator('.inquiry-trip').innerText(),/35 → 11/);
    await inquiry.getByText('Только заказом магазина').click();
    assert.equal(await inquiry.locator('[role=status]').getAttribute('data-answer'),'wrong');
    await inquiry.getByText('Только запасом склада').click();
    await inquiry.getByText('Следующий вопрос →').click();
    const tickets=inquiry.locator('.inquiry-prices button'),prices=await tickets.locator('b').allTextContents();
    await tickets.nth(parseInt(prices[0])<parseInt(prices[1])?0:1).click();
    await inquiry.getByText('Завершить исследование').click();
    await inquiry.getByText('Пройти ещё раз').click();
    await inquiry.locator('.inquiry-pick-grid').waitFor();
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
