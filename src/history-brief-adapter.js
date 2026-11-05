createPrototypeHistory({
 scope:()=> 'brief',
 read:()=>({signature:[S.screen,S.context,S.role,S.contact,S.modal?.title||S.modal?.kind||S.modal,document.querySelector('dialog[open]')?.textContent.slice(0,60)].join('|'),model:{S,accounts,role:$('role').value,context:$('context').value,dataState:$('data-state').value}}),
 write:model=>{$('brief-dialog')?.remove();S=model.S;accounts.splice(0,accounts.length,...model.accounts);$('role').value=model.role;$('context').value=model.context;$('data-state').value=model.dataState;render();if(S.modal)confirm(S.modal.title,S.modal.html,S.modal.action);}
});
