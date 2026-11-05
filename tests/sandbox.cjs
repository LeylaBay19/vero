require('node:fs').mkdirSync('test-results',{recursive:true});
const path=require('node:path'),{pathToFileURL}=require('node:url');const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.PROTOTYPE_BROWSER?{executablePath:process.env.PROTOTYPE_BROWSER}:{})});try{
 const p=await b.newPage({viewport:{width:1100,height:1050}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route(/^https?:/,r=>r.abort());
 await p.goto(pathToFileURL(path.resolve('web/index.html')).href,{waitUntil:'domcontentloaded'});const f=p.frameLocator('#codex-visualization');
 const stableClick=async locator=>{await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await locator.click();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 await f.locator('#ap-screen h2').filter({hasText:'Создайте личный аккаунт'}).waitFor();await stableClick(f.locator('[data-p-action=start-mos]'));await f.locator('#ap-screen h2').filter({hasText:'Вход через mos.ru'}).waitFor();await stableClick(f.locator('[data-p-action=mos-return]'));await f.locator('#ap-screen h2').filter({hasText:'Завершите создание аккаунта'}).waitFor();await f.locator('#p-consent').check();await stableClick(f.locator('[data-form=p-mos-profile] button[type=submit]'));
 if(await f.locator('#ap-screen h2').textContent()!=='Подключитесь к компании')throw Error('Sandbox form blocked');
 await f.locator('#ap-proposal-path').selectOption('employee');await f.locator('#ap-invite-mchd-mode').selectOption('no');await stableClick(f.locator('[data-p-action=start-mos]'));await stableClick(f.locator('[data-p-action=mos-return]'));
 await f.locator('#ap-screen h2').filter({hasText:'Примите приглашение'}).waitFor();
 // Let the parent apply the iframe's new height before the next physical click.
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await f.locator('#p-invite-confirm').check();await f.locator('[data-p-action=accept-invite]').click();await f.locator('#ap-screen h2').filter({hasText:'Личный кабинет'}).waitFor({timeout:5000});
 await p.screenshot({path:'test-results/sandbox-site.png',fullPage:true});
 await f.locator('#ap-proposal-entry').selectOption('mos-org');await stableClick(f.locator('[data-p-action=start-mos]'));await f.locator('#ap-screen h2').filter({hasText:'Вход через mos.ru'}).waitFor();await stableClick(f.locator('[data-p-action=mos-return]'));await f.locator('#ap-screen h2').filter({hasText:'Ваша организация'}).waitFor({timeout:5000});if(await f.locator('[data-go="p-workspace"]').count())throw Error('External membership granted platform access');
 await f.locator('#ap-proposal-path').selectOption('powers');await f.locator('#p-mchd-power-contracts').check();await f.locator('[data-form=p-mchd-generate] button[type=submit]').click();await f.locator('[data-go=p-mchd-sign]').click();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await f.locator('[data-p-action=mchd-sign]').click();await f.locator('#ap-screen h2').filter({hasText:'МЧД подписана'}).waitFor({timeout:5000});
 await p.goto(pathToFileURL(path.resolve('web/processes.html')).href);if(await p.locator('h1').innerText()!=='Вариант 1 · регистрация и вход')throw Error('Expected current variant 1 schemes');
 await p.screenshot({path:'test-results/processes-page.png',fullPage:true});if(errors.length)throw Error(errors.join(';'));console.log('Local file: sandboxed iframe, mos registration, invitation and empty schemes passed');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
