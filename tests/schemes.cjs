require('node:fs').mkdirSync('test-results',{recursive:true});
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.PROTOTYPE_BROWSER?{executablePath:process.env.PROTOTYPE_BROWSER}:{})});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],remote=[];p.on('pageerror',e=>errors.push(e.message));await p.route(/^https?:/,r=>{remote.push(r.request().url());return r.abort()});await p.goto(pathToFileURL(path.resolve('schemes.html')).href);
 if(await p.locator('.diagram-canvas svg').count()!==4)throw Error('Missing diagrams');
 for(const link of await p.locator('a[download]').all()){const name=await link.getAttribute('download'),href=await link.getAttribute('href'),data=Buffer.from(href.split(',')[1],'base64');if(!data.equals(fs.readFileSync(path.resolve('diagrams',name))))throw Error('Embedded BPMN differs: '+name);}
 const section=p.locator('section').first();await section.locator('[data-scale=in]').click();if(await section.locator('output').textContent()!=='150%')throw Error('Zoom failed');await section.locator('[data-scale=fit]').click();if(await section.locator('output').textContent()!=='100%')throw Error('Fit failed');
 for(const width of [390,1440]){await p.setViewportSize({width,height:1000});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow '+width);}
 await p.screenshot({path:'test-results/shareable-schemes.png',fullPage:true});if(errors.length||remote.length)throw Error(JSON.stringify({errors,remote}));console.log('Passed: four embedded SVGs, four exact BPMN downloads, zoom, mobile layout, no external requests, no JavaScript errors.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
