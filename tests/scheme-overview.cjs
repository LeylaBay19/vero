const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PROTOTYPE_BROWSER});try{
 const p=await browser.newPage({viewport:{width:1720,height:1100}});
 const models=JSON.parse(fs.readFileSync('processes-v1/model.json','utf8'));
 await p.setContent('<html lang="ru"><head><style>body{font:16px Arial;margin:20px;background:#fff}section{margin:25px 0}svg{width:100%;height:auto;display:block}h2{font-size:20px}</style></head><body>'+models.map(m=>'<section><h2>'+m.title+'</h2>'+fs.readFileSync('processes-v1/'+m.id.toLowerCase().replaceAll('_','-')+'-horizontal.svg','utf8')+'</section>').join('')+'</body></html>');
 assert.equal(await p.locator('svg').count(),6);await p.locator('svg').evaluateAll(xs=>xs.forEach(svg=>{svg.style.width='1660px';svg.style.height=1660*svg.viewBox.baseVal.height/svg.viewBox.baseVal.width+'px';}));await p.screenshot({path:'test-results/schemes-horizontal-overview.png',fullPage:true});
 const svg=fs.readFileSync('processes-v1/auth1-email-horizontal.svg','utf8');await p.setViewportSize({width:3200,height:1100});await p.setContent('<html><head><style>body{margin:0}svg{display:block;width:3060px;height:auto}</style></head><body>'+svg+'</body></html>');await p.locator('svg').evaluate(el=>el.style.height=3060*el.viewBox.baseVal.height/el.viewBox.baseVal.width+'px');
 await p.screenshot({path:'test-results/email-retry-route.png',clip:{x:600,y:110,width:1150,height:440}});
 await p.screenshot({path:'test-results/email-condition-route.png',clip:{x:1810,y:170,width:1200,height:420}});
 console.log('Visual overview and the annotated email route details captured.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
