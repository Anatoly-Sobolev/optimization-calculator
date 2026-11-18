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
      await page.goto(base+'?lesson=rgr.'+name+'&phase=0&view=trial');
      await page.getByRole('button',{name:'Перейти к методу'}).click();
    }
    const view=page.locator('.demo-view:visible');
    async function choose(name) {
      await page.getByRole('button',{name:'Список анимаций'}).click();
      await page.locator('.scene-item').filter({hasText:name}).click();
    }
    async function end() {
      await view.locator('.demo-settings summary').click();
      await view.locator('.dm-end').click();
    }
    // Every freight animation frame must keep all cell boundaries in place.
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const width of [360,1250]){
      await page.setViewportSize({width,height:780});
      await lesson('transp');
      const grid=view.locator('table.tg').first(),next=view.locator('.dm-next');
      const geometry=()=>grid.evaluate(t=>{
        const origin=t.getBoundingClientRect();
        return [...t.rows].flatMap(row=>[...row.cells].flatMap(cell=>{
          const r=cell.getBoundingClientRect();
          return [r.x-origin.x,r.y-origin.y,r.width,r.height];
        }));
      });
      const start=await geometry();
      while(await next.isEnabled()){
        await next.click();
        await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
        const frame=await geometry();
        assert.equal(frame.length,start.length);
        assert.ok(frame.every((v,i)=>Math.abs(v-start[i])<1),'Freight cell moved at '+width+'px');
      }
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

    await page.goto(base+'?lesson=rgr.graph&phase=0&view=example');
    const primer=page.locator('.primer-plot:visible'),rulers=primer.locator('.field-rulers');
    await primer.scrollIntoViewIfNeeded();
    const fixed=await rulers.boundingBox(),initialWindow=await primer.getAttribute('data-window');
    const firstLine=primer.locator('.gl').first(),edge=()=>firstLine.evaluate(el=>[el.x1.baseVal.value,el.y1.baseVal.value,el.x2.baseVal.value,el.y2.baseVal.value]);
    const originalEdge=await edge();
    await page.locator('.primer-art:visible').getByRole('button',{name:'Уменьшить масштаб'}).click();
    assert.notDeepEqual(await edge(),originalEdge);
    assert.deepEqual(await rulers.boundingBox(),fixed);
    const z=await primer.getAttribute('data-window'),field=await primer.boundingBox();
    await page.mouse.move(field.x+field.width*.6,field.y+field.height*.4);
    await page.mouse.down();
    await page.mouse.move(field.x+field.width*.35,field.y+field.height*.45,{steps:4});
    await page.mouse.up();
    assert.notEqual(await primer.getAttribute('data-window'),z);
    await page.locator('.primer-art:visible').getByRole('button',{name:'Исходный вид'}).click();
    assert.equal(await primer.getAttribute('data-window'),initialWindow);
    // A layer must cover newly visible mathematical points after a zoom or a pan.
    await page.goto(base+'?lesson=zyk.graph&phase=0&view=trial');
    const plane=page.locator('.wide-plot');
    const layerContains=(selector,x,y)=>plane.evaluate((el,[selector,x,y])=>{
      const [L,T,W,H]=el.dataset.frame.split(' ').map(Number);
      const [X,Y]=el.dataset.extent.split(' ').map(Number);
      return el.querySelector(selector).isPointInFill(new DOMPoint(L+x*W/X,T+H-y*H/Y));
    },[selector,x,y]);
    const out=page.getByRole('button',{name:'Уменьшить масштаб'});
    for(let k=0;k<4;k++)await out.click();
    assert.ok(await layerContains('.gh[data-i="1"]',4,1),'x+y ≥ 1 continues beyond the original right edge');
    assert.ok(await layerContains('.gh[data-i="0"]',-1,2),'3x+2y ≤ 6 extends to negative x');
    assert.ok(!await layerContains('.primer-region',-1,2),'common region respects non-negativity');
    const box2=await plane.boundingBox(),midX=box2.x+box2.width*.55,midY=box2.y+box2.height*.5;
    await page.mouse.move(midX,midY);await page.mouse.down();
    await page.mouse.move(midX-box2.width*.5,midY,{steps:4});await page.mouse.up();
    const [left,bottom,width,height]=(await plane.getAttribute('data-window')).split(' ').map(Number);
    const nx=left+.9*width,ny=bottom+.5*height;
    assert.ok(nx>3&&nx+ny>1&&await layerContains('.gh[data-i="1"]',nx,ny),'half-plane extends after dragging');
    await page.goto(base+'?lesson=rgr.artificial&phase=0');
    await page.locator('.quantity-choice').getByRole('button',{name:'1 ч',exact:true}).click();
    assert.match(await page.locator('.output-trays').innerText(),/10 шт. · нужно 5/);
    assert.match(await page.locator('.opening-example p').innerText(),/стенки/);
    await page.goto(base+'?lesson=rgr.simplex&phase=0&view=trial');
    await page.getByRole('button',{name:'Увеличить x₁'}).click();
    const delta=await page.locator('.effect-receipt').innerText();
    assert.match(delta,/Рейка · 0 → 1 м/);assert.match(delta,/Распил · 0 → 11 мин/);
    assert.match(delta,/Выручка · 0 → 16 ₽/);
    await lesson('graph');
    const svg=view.locator('.gsvg'), box=()=>svg.getAttribute('data-window');
    const original=await box(), frame=await svg.getAttribute('viewBox');
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
    assert.equal(await svg.getAttribute('viewBox'),frame);assert.equal(await box(),original);assert.deepEqual(errors,[]);
    console.log('Verified calculation replay, early event times, layer persistence and two-finger zoom.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
