createPrototypeHistory({
 scope:()=>`legacy:${S.flow}`,
 read:()=>({signature:[S.screen,S.flow==='proposal2'?V2?.screen:'',S.isDirector,document.querySelector('dialog[open]')?.textContent.slice(0,60)].join('|'),model:{S,V2,drafts}}),
 write:model=>{Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,model.S);V2=model.V2;Object.keys(drafts).forEach(k=>delete drafts[k]);Object.assign(drafts,model.drafts);render();}
});
