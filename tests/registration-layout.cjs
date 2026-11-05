const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.PROTOTYPE_BROWSER?{executablePath:process.env.PROTOTYPE_BROWSER}:{})});try{
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route(/^https?:/,r=>r.abort());fs.mkdirSync('test-results',{recursive:true});
 await p.goto(pathToFileURL(path.resolve('platform-entry-variant2.html')).href);
 const click=a=>p.locator(`[data-r2-action="${a}"]`).click(),screen=s=>p.locator(`[data-registration-screen="${s}"]`).waitFor();
 await screen('entry');assert.equal(await p.getByLabel('Email',{exact:true}).isVisible(),true);assert.equal(await p.locator('[data-r2-action=login]').count(),0);assert.equal(await p.locator('[data-registration-screen=entry] .eyebrow').count(),0);
 await p.screenshot({path:'test-results/v1.11-login.png',fullPage:true});
 await p.locator('#r2-login').fill('my@example.test');await p.locator('#r2-password').fill('Keep-my-input');await click('mos-login');
 assert.equal(await p.locator('#r2-dialog').evaluate(d=>d.matches(':modal')),true);await click('mos-return');assert.match(await p.locator('#r2-alert').innerText(),/Укажите/);await click('mos-fill');assert.equal(await p.locator('#r2-terms').isChecked(),false);
 await p.screenshot({path:'test-results/v1.11-mos-dialog.png',fullPage:true});await p.keyboard.press('Escape');await screen('entry');assert.equal(await p.locator('#r2-login').inputValue(),'my@example.test');assert.equal(await p.locator('#r2-password').inputValue(),'Keep-my-input');assert.equal(await p.locator('#r2-dialog').count(),0);
 await click('register');await p.locator('#fill').click();await p.locator('#r2-terms').check();await click('mos-login');assert.equal(await p.locator('#r2-terms').isChecked(),false);await click('cancel-mos');assert.equal(await p.locator('#r2-terms').isChecked(),true);assert.equal(await p.locator('#r2-new-password').inputValue(),'Example-2026!');
 for(const [width,height] of [[1440,900],[390,844],[320,740]]){
  await p.setViewportSize({width,height});assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),true);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await p.locator('#main').evaluate(x=>getComputedStyle(x).overflowY),'auto');
  await p.locator('#main').evaluate(x=>x.scrollTop=x.scrollHeight);assert.ok(await p.locator('#main').evaluate(x=>x.scrollHeight<=x.clientHeight||x.scrollTop>0));
  await p.screenshot({path:`test-results/v1.11-registration-${width}.png`,fullPage:true});
  await click('mos-login');assert.ok(await p.locator('#r2-dialog').evaluate(x=>x.getBoundingClientRect().height<=innerHeight));await click('mos-fill');await click('cancel-mos');
 }
 assert.deepEqual(errors,[]);console.log('Registration layout passed: reference email/password entry, modal mos.ru, validation, Escape/cancel preserves input and consent, viewport height, internal scrolling and mobile dialogs.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
