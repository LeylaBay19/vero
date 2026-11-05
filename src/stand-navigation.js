(()=>{
  const tabs=[...document.querySelectorAll('[data-stand-tab]')];
  const choices=[...document.querySelectorAll('[data-cabinet-view]')];
  let cabinet='current';
  function load(frame){
    if(frame?.dataset.standSrcdoc){frame.srcdoc=frame.dataset.standSrcdoc;delete frame.dataset.standSrcdoc;}
  }
  function selectCabinet(name){
    if(!['current','proposal','proposal2'].includes(name))return;
    cabinet=name;
    choices.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cabinetView===name)));
    document.getElementById('codex-visualization').hidden=name!=='current';
    const frame=document.getElementById('stand-frame-proposals');frame.hidden=name==='current';
    if(name!=='current'){
      const send=()=>frame.contentWindow?.postMessage({type:'vero:select-proposal',flow:cabinet},'*');
      if(frame.dataset.standSrcdoc){frame.addEventListener('load',send,{once:true});load(frame);}else send();
    }
  }
  function select(name){
    if(!['current','comparison','schemes'].includes(name))return;
    tabs.forEach(b=>{const selected=b.dataset.standTab===name;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;document.getElementById('stand-'+b.dataset.standTab).hidden=!selected;});
    if(name==='current')selectCabinet(cabinet);else load(document.querySelector('#stand-'+name+' iframe'));
    document.querySelector('.stand-downloads').hidden=name!=='schemes';
  }
  choices.forEach(b=>b.addEventListener('click',()=>selectCabinet(b.dataset.cabinetView)));
  tabs.forEach((b,i)=>{b.addEventListener('click',()=>select(b.dataset.standTab));b.addEventListener('keydown',e=>{let index;if(e.key==='ArrowRight')index=(i+1)%tabs.length;else if(e.key==='ArrowLeft')index=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=tabs.length-1;else return;e.preventDefault();tabs[index].focus();select(tabs[index].dataset.standTab);});});
  addEventListener('message',e=>{
    if(!['comparison','proposals','schemes'].some(n=>document.getElementById('stand-frame-'+n).contentWindow===e.source))return;
    const data=e.data;
    if(data?.type==='vero:navigate'&&['current','schemes'].includes(data.view))select(data.view);
    if(data?.type==='vero:download'){const a=[...document.querySelectorAll('.stand-downloads a[download]')].find(a=>a.getAttribute('download')===data.name);a?.click();}
  });
  document.querySelectorAll('[data-stand-window]').forEach(a=>a.addEventListener('click',e=>{
    if(location.protocol!=='file:')return;
    const content=document.getElementById(a.dataset.standWindow)?.content.textContent;if(!content)return;
    e.preventDefault();const url=URL.createObjectURL(new Blob([content],{type:'text/html'}));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);
  }));
  select(location.hash==='#comparison'?'comparison':location.hash==='#schemes'?'schemes':'current');
})();
