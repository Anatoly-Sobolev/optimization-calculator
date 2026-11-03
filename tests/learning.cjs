/* Run: npm test. Uses a local HTTP server and a locally installed Chromium. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const finishOnly=process.argv.includes('--finish-only');
const browserRoot=path.join(process.env.LOCALAPPDATA||'', 'ms-playwright');
const installed=fs.existsSync(browserRoot)?fs.readdirSync(browserRoot).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse():[];
const executable=process.env.CHROMIUM_PATH || installed.map(n=>path.join(browserRoot,n,'chrome-win64','chrome.exe')).find(fs.existsSync);
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');
  res.end(fs.readFileSync(file));
});
const report={rendered:0,stages:0,flows:0,registry:[],errors:[],checks:[]};
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{})});
  try {
    const page=await browser.newPage(),baseline=await browser.newPage();
    page.on('pageerror',e=>report.errors.push(e.message));
    await baseline.route('**/learning.js*',r=>r.fulfill({contentType:'text/javascript',body:'const LEARN={begin(){},mount(){}};'}));
    await Promise.all([page.goto(url),baseline.goto(url)]);
    const registry=await page.evaluate(()=>LEARN.registry().map(t=>({...t,variants:t.variants.map(v=>({v:v.v,broken:!!v.broken}))})));
    report.registry=registry.map(t=>({source:t.src,topic:t.type,base:t.base,title:t.title,count:t.variants.length}));
    const render=async(p,t,v)=>p.evaluate(({t,v})=>{
      Object.assign(APP.state,{src:t.src,type:t.type,base:t.base||'graph',v,mode:'db',trainer:false,tinit:null,lastCustom:null});
      APP.render();
      return {text:document.querySelector('#solution').textContent,stages:typeof LEARN.allStages==='undefined'?null:LEARN.allStages.map(s=>({id:s.id,valid:LEARN.accept(s,s.answer),count:s.options?LEARN.options(s).length:0})),error:document.querySelector('#solution').textContent.includes('Ошибка вычислений:')};
    },{t,v});
    for(const t of (finishOnly?[]:registry)){
      for(const v of t.variants){
        try {
          const [a,b]=await Promise.all([render(page,t,v.v),render(baseline,t,v.v)]);
          assert.equal(a.text,b.text,'Existing solution changed');
          assert.equal(a.error,false,'Solver render error');
          assert.ok(a.stages.length>0,'No lesson stages');
          assert.ok(a.stages.every(s=>s.valid),'Answer does not pass its validator');
          assert.ok(a.stages.every(s=>s.count!==1),'Choice has no distractors');
          report.rendered++;report.stages+=a.stages.length;
        }catch(e){report.errors.push(`${t.src}/${t.type}/${t.base||''}/${v.v}: ${e.message}`);}
      }
      console.log(`Rendered ${t.src}/${t.type}/${t.base||''}: ${t.variants.length}`);
    }
    if(report.errors.length)throw new Error(report.errors.slice(0,10).join('\n'));
    if(!finishOnly)report.checks.push('All database variants: rendered, stages nonempty, valid answers, unchanged original solution text');
    await page.locator('#learn-presentation').selectOption('learning');
    for(const t of (finishOnly?[]:registry)){
      const variant=t.variants.find(v=>!v.broken).v;
      for(const mode of ['meaning','model','strategy','guided','solo','check']){
        await render(page,t,variant);
        await page.locator('#learn-mode').selectOption(mode);
        if(await page.locator('#learn-depth').count())await page.locator('#learn-depth').selectOption('brief');
        if(await page.locator('#learn-hint').count())await page.locator('#learn-hint').selectOption('request');
        await page.locator('[data-learn="restart"]').click();
        let count=0;
        while(await page.locator('#learn-progress').count()){
          if(++count>100)throw new Error('Unbounded flow');
          const state=await page.evaluate(()=>({s:LEARN.stages[LEARN.session.index],i:LEARN.session.index}));
          if(state.s.kind==='scene')await page.locator('.sc-opt[data-v="r"]').count()&&['solo','check'].includes(mode)?await page.locator('.sc-opt[data-v="r"]').click():await page.locator('[data-learn="reveal"]').click();
          else if(await page.locator('#learn-answer').count()){
            await page.locator('#learn-answer').fill(state.s.answer);await page.locator('#learn-answer-form button').click();
          }else await page.locator('[data-answer]').filter({hasText:/./}).evaluateAll((els,answer)=>els.find(el=>el.dataset.answer===answer).click(),state.s.answer);
          assert.equal(await page.locator('[data-learn="next"]:not([hidden])').count(),1,'Correct answer did not unlock');
          await page.locator('[data-learn="next"]').click();
        }
        assert.match(await page.locator('#learning').textContent(),/Режим пройден/);
        report.flows++;
      }
      console.log(`Flows ${t.src}/${t.type}/${t.base||''}: 6 modes`);
    }
    if(!finishOnly)report.checks.push('Six modes completed for a representative of every source/topic/base');
    const fastComplete=()=>{
      let count=0,numeric=0;
      while(LEARN.session.index<LEARN.stages.length){
        if(++count>2000)throw new Error('Flow did not terminate');
        const s=LEARN.stages[LEARN.session.index];
        const input=document.querySelector('#learn-answer');
        if(s.kind==='scene')document.querySelector('.sc-opt[data-v="r"]').click();
        else if(input){const q=Q.parse(s.answer);input.value=String(q.n*2n)+'/'+String(q.d*2n);document.querySelector('#learn-answer-form').requestSubmit();numeric++;}
        else {const b=[...document.querySelectorAll('[data-answer]')].find(b=>b.dataset.answer===s.answer);if(b)b.click();else if(!document.querySelector('[data-learn="next"]'))throw new Error('No answer control');}
        const next=document.querySelector('[data-learn="next"]');if(!next)throw new Error('Correct answer blocked');next.click();
      }
      return {count,numeric};
    };
    for(const t of (finishOnly?[]:registry)){
      await render(page,t,t.variants.find(v=>!v.broken).v);
      await page.locator('#learn-mode').selectOption('solo');await page.locator('#learn-depth').selectOption('deep');await page.locator('[data-learn="restart"]').click();
      await page.evaluate(fastComplete);report.flows++;
      await page.evaluate(()=>{APP.state.custom={};APP.state.lastCustom=null;});
      await page.locator('#cvar').selectOption('custom');await page.locator('#fsolve').click();
      assert.ok(await page.evaluate(()=>LEARN.stages.length>0),`Custom stages ${t.type}`);
      assert.equal(await page.locator('#ferr .bad').count(),0,`Custom input ${t.type}`);
    }
    if(!finishOnly)report.checks.push('Deep independent flows for all 20 representatives; equivalent fractions accepted; custom inputs solve in all sections');
    await page.locator('#learn-mode').selectOption('check');await page.locator('#learn-format').selectOption('exam');await page.locator('[data-learn="exam"]').click();
    for(let i=0;i<6;i++){
      await page.evaluate(fastComplete);
      assert.equal(await page.locator('[data-learn="exam-next"]').count(),1);
      await page.locator('[data-learn="exam-next"]').click();
    }
    assert.ok(await page.evaluate(()=>!JSON.parse(localStorage.getItem('optimization.learning.v2')).exam));
    report.checks.push('Full six-task mixed exam (check mode) completes');
    await render(page,registry[0],registry[0].variants[0].v);
    await page.locator('#learn-mode').selectOption('guided');await page.locator('#learn-hint').selectOption('request');await page.locator('[data-learn="restart"]').click();
    const before=await page.evaluate(()=>LEARN.session.index);
    await page.locator('[data-answer]').evaluateAll((els,answer)=>els.find(el=>el.dataset.answer!==answer).click(),await page.evaluate(()=>LEARN.stages[LEARN.session.index].answer));
    assert.equal(await page.evaluate(()=>LEARN.session.index),before);assert.equal(await page.locator('[data-learn="next"]').count(),0);
    await page.locator('[data-learn="hint"]').click();await page.locator('[data-learn="reveal"]').click();
    assert.ok(await page.evaluate(()=>{const a=LEARN.session.answers[LEARN.stages[LEARN.session.index].id];return a.errors===1&&a.hint&&a.revealed&&a.solved;}));
    await page.reload();await page.locator('#learn-presentation').selectOption('learning');
    assert.ok(await page.evaluate(()=>Object.values(LEARN.session.answers).some(a=>a.errors===1&&a.hint&&a.revealed)));
    report.checks.push('Wrong answer blocks; hint/reveal recorded; reload restores session');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('[data-learn="replay"]').click();assert.equal(await page.locator('#learning').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('#learning').isVisible(),false);assert.equal(await page.locator('#solution').isVisible(),true);
    await page.emulateMedia({media:'screen'});
    report.checks.push('Reduced motion and print visibility');
    await page.setViewportSize({width:390,height:844});
    for(const t of registry){await render(page,t,t.variants[0].v);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Mobile overflow ${t.src}/${t.type}`);}
    await page.screenshot({path:path.join(root,'test-results','learning-mobile.png'),fullPage:true});
    report.checks.push('390px layout: all source/topic/base representatives, no page horizontal overflow');
    await page.setViewportSize({width:1366,height:1000});
    await page.locator('[data-learn="restart"]').click();
    assert.ok(await page.locator('#learning').evaluate(e=>e.getBoundingClientRect().width>700),'Desktop lesson collapsed into navigation column');
    await page.locator('[data-answer]').first().focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    assert.equal(await page.locator('[data-answer]').first().evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.locator('[data-learn="reveal"]').click();await page.locator('[data-learn="replay"]').click();
    assert.ok(await page.locator('#learning').evaluate(el=>el.getAnimations({subtree:true}).length>0),'Replay animation did not start');
    await page.locator('#taskType').selectOption('graph');
    assert.ok(await page.evaluate(()=>LEARN.stages.every(s=>s.id.startsWith('graph-'))));
    assert.equal(await page.locator('#learning').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    await page.locator('#csrc').selectOption('rgr');await page.locator('#csrc').selectOption('zyk');
    const nextVariant=await page.locator('#cvar').evaluate(el=>el.options[1].value);
    await page.locator('#cvar').selectOption(nextVariant);
    assert.equal(await page.evaluate(()=>APP.state.src),'zyk');assert.equal(await page.evaluate(()=>APP.state.v),Number(nextVariant));
    assert.equal(await page.locator('#learn-transformation').count(),0);
    report.checks.push('Desktop width, keyboard focus, topic switch clears old question and animations');
    await page.locator('.learn-history summary').click();await page.locator('[data-learn="reset"]').click();
    assert.ok(await page.evaluate(()=>!localStorage.getItem('optimization.learning.v2')));
    report.checks.push('Local progress reset');
    assert.equal(report.errors.length,0);
    report.completed=true;
  } catch(error) {
    report.errors.push(error.message);throw error;
  } finally {
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});fs.writeFileSync(path.join(root,'test-results',finishOnly?'learning-interaction-report.json':'learning-report.json'),JSON.stringify(report,null,2));
    await browser.close();server.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
