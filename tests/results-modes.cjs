const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('url');
(async()=>{
 const cache=path.join(process.env.LOCALAPPDATA,'ms-playwright');
 const executablePath=fs.readdirSync(cache).filter(n=>/^chromium-\d+$/.test(n)).map(n=>path.join(cache,n,'chrome-win64/chrome.exe')).find(fs.existsSync);
 const browser=await chromium.launch({executablePath,headless:true});
 try{
 const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('index.html')).href+'#s=rgr&t=simplex&v=1');
 const result=await page.evaluate(async()=>{
  const q=x=>Q.parse(String(x));
  const pr={n:2,c:[q(1),q(1)],sense:'max',rows:[{a:[q(3),q(1)],b:q(1),s:'<='},{a:[q(1),q(3)],b:q(1),s:'<='}]};
  const result=ALG.twoPhase(pr),steps=result.phase2.steps;let checked=0,fractional=0;
  for(let i=0;i<steps.length-1;i++){
   if(steps[i].p==null||steps[i].q==null)continue;
   const spec=VIEWS.KIT.pivotSpec(steps[i],steps[i+1]);
   const box=document.createElement('div');document.body.append(box);
   const script=async A=>{
    A.detail=true;const swap=A.swap;
    A.swap=async(el,h,d)=>{
     if(el?.matches('.calc-result')){
      const fm=el.closest('.pvfm'),operands=[...fm.querySelectorAll('.fo,.fk,.fn,.fp')];
      const before=operands.map(e=>e.innerHTML);fractional+=operands.some(e=>e.querySelector('.fr'))?1:0;
      await swap(el,h,d);checked++;
      if(el.innerHTML!==h||operands.some((e,j)=>e.innerHTML!==before[j]))throw Error('Result overwrote operand');
     }else await swap(el,h,d);
    };await spec.script(A);
   };
   const ctl=VIEWS.KIT.mountInto(box,'Regression',spec.html,script,{manual:true});await ctl.settle();ctl.dispose();box.remove();
  }
  return {checked,fractional,errors:window.__dmErr||[]};
 });
 assert.ok(result.checked>0);assert.ok(result.fractional>0);assert.deepEqual(result.errors,[]);
 for(const mode of ['learning','text','animated']){
  await page.locator('#learn-presentation').selectOption(mode);
  assert.equal(await page.evaluate(()=>LEARN.active),mode==='learning');
  assert.equal(await page.locator('.learn-reading').count(),mode==='text'?1:0);
  assert.equal(await page.locator('#solution').isVisible(),mode!=='learning');
  await page.reload();assert.equal(await page.locator('#learn-presentation').inputValue(),mode);
 }
 assert.deepEqual(errors,[]);console.log('PASS fractional result targets and persisted three modes',result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
