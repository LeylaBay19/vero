(()=>{
  const tabs=[...document.querySelectorAll('[data-stand-tab]')];
  const choices=[...document.querySelectorAll('[data-cabinet-view]')];
  const fill=document.getElementById('stand-fill');
  const archive=document.querySelector('.stand-archive');
  const historyBack=document.getElementById('stand-back'),historyForward=document.getElementById('stand-forward'),historyPosition=document.getElementById('stand-history-position');
  let section='current';
  function activeFrame(){return document.getElementById(section==='comparison'?'stand-frame-comparison':section==='schemes'?'stand-frame-schemes':['1','2'].includes(cabinet)?'codex-visualization':cabinet==='5'?'stand-frame-brief':'stand-frame-proposals');}
  function historyRequest(action='status'){if(section==='schemes')return;activeFrame()?.contentWindow?.postMessage({type:'vero:history',action},'*');}
  function pendingHistory(){historyBack.disabled=true;historyForward.disabled=true;historyPosition.textContent='';historyRequest();}
  let cabinet='2';
  function load(frame){
    if(frame?.dataset.standSrcdoc){frame.srcdoc=frame.dataset.standSrcdoc;delete frame.dataset.standSrcdoc;}
  }
  function selectCabinet(name){
    if(!['2','3','4','5'].includes(name))return;
    cabinet=name;
    choices.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cabinetView===name)));
    archive.querySelector('summary').textContent=['3','4'].includes(name)?`Архив · Вариант ${Number(name)-1}`:'Архив (2)';
    archive.classList.toggle('is-selected',['3','4'].includes(name));archive.open=false;
    const kind=['1','2'].includes(name)?'current':name==='5'?'brief':'proposals';
    const frames={current:document.getElementById('codex-visualization'),proposals:document.getElementById('stand-frame-proposals'),brief:document.getElementById('stand-frame-brief')};
    Object.entries(frames).forEach(([key,f])=>f.hidden=key!==kind);
    const frame=frames[kind],message=kind==='current'?{type:'vero:select-registration',variant:name}:kind==='proposals'?{type:'vero:select-proposal',flow:name==='3'?'proposal':'proposal2'}:null;
    const send=()=>{if(message)frame.contentWindow?.postMessage(message,'*');historyRequest();};
    if(frame.dataset.standSrcdoc){frame.addEventListener('load',send,{once:true});load(frame);}else send();
    pendingHistory();
  }
  function select(name){
    if(!['current','comparison','schemes'].includes(name))return;
    section=name;
    tabs.forEach(b=>{const selected=b.dataset.standTab===name;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;document.getElementById('stand-'+b.dataset.standTab).hidden=!selected;});
    if(name==='current')selectCabinet(cabinet);else load(document.querySelector('#stand-'+name+' iframe'));
    const downloads=document.querySelector('.stand-downloads');if(downloads)downloads.hidden=name!=='schemes';
    fill.hidden=name==='schemes';
    document.getElementById('stand-history').hidden=name==='schemes';pendingHistory();
  }
  choices.forEach(b=>b.addEventListener('click',()=>selectCabinet(b.dataset.cabinetView)));
  historyBack.addEventListener('click',()=>historyRequest('back'));historyForward.addEventListener('click',()=>historyRequest('forward'));
  fill.addEventListener('click',()=>{
    const selected=tabs.find(b=>b.getAttribute('aria-selected')==='true')?.dataset.standTab;
    const id=selected==='comparison'?'stand-frame-comparison':['1','2'].includes(cabinet)?'codex-visualization':cabinet==='5'?'stand-frame-brief':'stand-frame-proposals';
    document.getElementById(id)?.contentWindow?.postMessage({type:'vero:fill'},'*');
  });
  tabs.forEach((b,i)=>{b.addEventListener('click',()=>select(b.dataset.standTab));b.addEventListener('keydown',e=>{let index;if(e.key==='ArrowRight')index=(i+1)%tabs.length;else if(e.key==='ArrowLeft')index=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=tabs.length-1;else return;e.preventDefault();tabs[index].focus();select(tabs[index].dataset.standTab);});});
  addEventListener('message',e=>{
    if(e.data?.type==='vero:scheme-expand'&&e.source===document.getElementById('stand-frame-schemes').contentWindow&&typeof e.data.expanded==='boolean'){
      if(section==='schemes')document.body.classList.toggle('scheme-expanded',e.data.expanded);return;
    }
    if(e.data?.type==='vero:history-state'){
      if(section==='schemes'||e.source!==activeFrame()?.contentWindow||typeof e.data.back!=='boolean'||typeof e.data.forward!=='boolean')return;
      historyBack.disabled=!e.data.back;historyForward.disabled=!e.data.forward;
      historyPosition.textContent=Number.isInteger(e.data.position)&&Number.isInteger(e.data.total)&&e.data.total>0?`${e.data.position} / ${e.data.total}`:'';return;
    }
    if(!['comparison','proposals','schemes'].some(n=>document.getElementById('stand-frame-'+n).contentWindow===e.source))return;
    const data=e.data;
    if(data?.type==='vero:navigate'&&['current','schemes'].includes(data.view))select(data.view);
    if(data?.type==='vero:download'){
      const a=[...document.querySelectorAll('#stand-scheme-downloads a[download]')].find(a=>a.getAttribute('download')===data.name);
      if(!a)return;const match=/^data:(application\/xml|image\/svg\+xml);charset=utf-8,([\s\S]*)$/.exec(a.getAttribute('href'));
      if(!match)return;const url=URL.createObjectURL(new Blob([decodeURIComponent(match[2])],{type:match[1]})),link=document.createElement('a');link.href=url;link.download=a.download;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
  });
  addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('scheme-expanded'))document.getElementById('stand-frame-schemes').contentWindow.postMessage({type:'vero:scheme-close'},'*');});
  document.querySelectorAll('[data-stand-window]').forEach(a=>a.addEventListener('click',e=>{
    if(location.protocol!=='file:')return;
    const content=document.getElementById(a.dataset.standWindow)?.content.textContent;if(!content)return;
    e.preventDefault();const url=URL.createObjectURL(new Blob([content],{type:'text/html'}));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);
  }));
  document.getElementById('codex-visualization').addEventListener('load',()=>{if(['1','2'].includes(cabinet))selectCabinet(cabinet);});
  document.querySelectorAll('.stand-panel iframe').forEach(frame=>frame.addEventListener('load',()=>{if(frame===activeFrame())historyRequest();}));
  select(location.hash==='#comparison'?'comparison':location.hash==='#schemes'?'schemes':'current');
})();
