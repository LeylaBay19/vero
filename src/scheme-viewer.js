(()=>{
  let expanded=null,returnFocus=null;
  const current=card=>card.querySelector('.diagram:not([hidden])');
  function scale(card,value){
    const box=current(card),svg=box.querySelector('svg'),base=svg.viewBox.baseVal.width;
    value=Math.max(.1,Math.min(2.5,value));svg.dataset.scale=value;svg.style.width=base*value+'px';
    card.querySelector('[data-scale]').textContent=Math.round(value*100)+'%';
  }
  function expand(card,on){
    if(expanded&&expanded!==card)expand(expanded,false);
    card.classList.toggle('is-expanded',on);card.querySelector('[data-expand]').setAttribute('aria-expanded',String(on));
    card.querySelector('[data-expand]').textContent=on?'Свернуть · Esc':'На весь экран';
    document.body.classList.toggle('has-expanded-scheme',on);expanded=on?card:null;
    if(on){returnFocus=document.activeElement;card.querySelector('[data-expand]').focus();}
    else returnFocus?.focus();
    if(parent!==window)parent.postMessage({type:'vero:scheme-expand',expanded:on},'*');
  }
  document.addEventListener('click',e=>{
    const expandButton=e.target.closest('[data-expand]');
    if(expandButton){const card=expandButton.closest('article');expand(card,expanded!==card);return;}
    const mode=e.target.closest('[data-layout]');
    if(mode){
      const card=mode.closest('article'),orientation=mode.dataset.layout;
      card.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b===mode)));
      card.querySelectorAll('[data-orientation]').forEach(box=>{box.hidden=box.dataset.orientation!==orientation;box.scrollTop=0;box.scrollLeft=0;});
      card.querySelectorAll('[data-layout-downloads]').forEach(el=>el.hidden=el.dataset.layoutDownloads!==orientation);
      scale(card,orientation==='horizontal'?.7:Math.min(1,(current(card).clientWidth-30)/1040));return;
    }
    const b=e.target.closest('[data-zoom]');if(!b)return;
    const card=b.closest('article'),box=current(card),svg=box.querySelector('svg'),base=svg.viewBox.baseVal.width;
    const value=Number(svg.dataset.scale||Math.min(1,(box.clientWidth-30)/base));
    scale(card,b.dataset.zoom==='fit'?Math.min(1,(box.clientWidth-30)/base):value+(b.dataset.zoom==='in'?.15:-.15));
  });
  document.addEventListener('keydown',e=>{
    if(!expanded)return;
    if(e.key==='Escape'){e.preventDefault();expand(expanded,false);}
    if(e.key==='Tab'){
      const controls=[...expanded.querySelectorAll('button,a,[tabindex="0"]')].filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='vero:scheme-close'&&expanded)expand(expanded,false);});
})();
