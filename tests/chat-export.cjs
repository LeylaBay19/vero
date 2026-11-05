const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const data=JSON.parse(fs.readFileSync('history/conversation.json','utf8')),manifest=JSON.parse(fs.readFileSync('history/manifest.json','utf8'));
 assert.equal(data.messages.length,manifest.messages);assert.ok(data.messages.every(m=>['user','assistant'].includes(m.role)&&!['analysis','summary','reasoning'].includes(m.phase)));
 for(const m of data.messages)for(const image of m.images||[])assert.ok(fs.existsSync(path.join('history',image)),image);
 const b=await chromium.launch({headless:true,...(process.env.PROTOTYPE_BROWSER?{executablePath:process.env.PROTOTYPE_BROWSER}:{})});
 try{
  fs.mkdirSync('test-results',{recursive:true});const p=await b.newPage({viewport:{width:1100,height:850}}),errors=[],remote=[];
  p.on('pageerror',e=>errors.push(e.message));await p.route(/^https?:/,r=>{remote.push(r.request().url());return r.abort();});
  await p.goto(pathToFileURL(path.resolve('history/conversation.html')).href);
  assert.equal(await p.locator('article.message').count(),manifest.messages);assert.equal(await p.locator('img').count(),manifest.image_references);
  const imageFailures=await p.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>new Promise(resolve=>{img.loading='eager';if(img.complete)return resolve(img.naturalWidth>0?null:img.getAttribute('src'));img.onload=()=>resolve(null);img.onerror=()=>resolve(img.getAttribute('src'));}))));
  assert.deepEqual(imageFailures.filter(Boolean),[]);
  await p.locator('#search').fill('доверенности');const found=await p.locator('article.message:visible').count();assert.ok(found>0&&found<manifest.messages);
  await p.locator('#search').fill('');await p.screenshot({path:'test-results/chat-export.png'});
  await p.setViewportSize({width:390,height:850});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log(JSON.stringify({passed:true,messages:manifest.messages,images:manifest.image_references,search:true,mobile:true,networkRequests:remote.length}));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});
