/* In-memory testing history. State and field values never leave the child frame. */
function createPrototypeHistory({read,write,scope}){
 const clone=x=>structuredClone(x),stacks=new Map();let restoring=false,queued=false;
 const fields=()=>[...document.querySelectorAll('input,select,textarea')];
 function ui(){return {fields:fields().map((el,index)=>({id:el.id,index,value:el.type==='file'?null:el.value,checked:el.checked,selected:el.tagName==='SELECT'&&el.multiple?[...el.selectedOptions].map(o=>o.value):null})),details:[...document.querySelectorAll('details')].map((el,index)=>({id:el.id,index,open:el.open})),scroll:[...document.querySelectorAll('#main,dialog,[data-history-scroll]')].map((el,index)=>({id:el.id,index,left:el.scrollLeft,top:el.scrollTop})),window:{left:scrollX,top:scrollY}};}
 function capture(){return {...clone(read()),ui:ui()};}
 function stack(){const key=String(scope());if(!stacks.has(key))stacks.set(key,{entries:[],index:-1});return stacks.get(key);}
 function emit(){const s=stack();if(parent!==window)parent.postMessage({type:'vero:history-state',back:s.index>0,forward:s.index<s.entries.length-1,position:s.index+1,total:s.entries.length,scope:String(scope())},'*');}
 function checkpoint(){if(restoring)return;const s=stack(),now=capture();if(s.index>=0&&s.entries[s.index].signature===now.signature)s.entries[s.index]=now;}
 function flush(){queued=false;if(restoring)return;const s=stack(),now=capture();if(s.index>=0&&s.entries[s.index].signature===now.signature)s.entries[s.index]=now;else{s.entries.splice(s.index+1);s.entries.push(now);if(s.entries.length>80)s.entries.shift();s.index=s.entries.length-1;}emit();}
 function record(){if(restoring||queued)return;queued=true;queueMicrotask(flush);}
 function restoreUI(saved){const inputs=fields();for(const v of saved.fields){const el=v.id?document.getElementById(v.id):inputs[v.index];if(!el||v.value===null)continue;if(v.selected&&el.multiple)[...el.options].forEach(o=>o.selected=v.selected.includes(o.value));else el.value=v.value;if(['checkbox','radio'].includes(el.type))el.checked=v.checked;}
  const details=[...document.querySelectorAll('details')];for(const v of saved.details){const el=v.id?document.getElementById(v.id):details[v.index];if(el)el.open=v.open;}
  const scrollers=[...document.querySelectorAll('#main,dialog,[data-history-scroll]')];for(const v of saved.scroll){const el=v.id?document.getElementById(v.id):scrollers[v.index];if(el){el.scrollLeft=v.left;el.scrollTop=v.top;}}window.scrollTo(saved.window.left,saved.window.top);
 }
 function travel(direction){flush();const s=stack(),next=s.index+direction;if(next<0||next>=s.entries.length)return emit();restoring=true;try{s.index=next;const saved=clone(s.entries[next]);write(saved.model);restoreUI(saved.ui);}finally{restoring=false;}emit();}
 function reset(){if(restoring)return;stacks.delete(String(scope()));flush();}
 for(const type of ['click','submit','input','change','cancel'])document.addEventListener(type,e=>{if(restoring)return;checkpoint();const resetClick=type==='click'&&e.target.closest?.('#reset,#ap-start');const fixture=type==='change'&&e.target.matches?.('#scenario,#intent,#ap-v2-path,#ap-proposal-path,#ap-proposal-entry,#ap-org-case,#ap-repeat');if(resetClick||fixture)queueMicrotask(reset);else record();},true);
 addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='vero:history')return;const action=e.data.action;if(action==='back')travel(-1);else if(action==='forward')travel(1);else if(action==='status'){if(!stack().entries.length)flush();else emit();}});
 flush();return {record,reset};
}
