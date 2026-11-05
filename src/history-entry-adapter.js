createPrototypeHistory({
 deferReset:true,
 scope:()=>`entry:${registrationVariant}:${scenario.value}:${$('intent').value}`,
 read:()=>({signature:[state.screen,registration2.screen(),state.modal,state.context?.id,state.application?.status].join('|'),model:{state,registration:registration2.snapshot(),registrationVariant}}),
 write:model=>{state=model.state;registrationVariant=model.registrationVariant;registration2.restore(model.registration);render();}
});
