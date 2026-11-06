(() => {
  const byId = id => document.getElementById(id);
  const variants = [...document.querySelectorAll('[data-variant]')];
  const tabs = [byId('stand-tab-current'), byId('stand-tab-schemes')];
  const schemeFrame = byId('stand-frame-schemes');
  const tools = byId('stand-tools');
  const back = byId('stand-back');
  const forward = byId('stand-forward');
  const position = byId('stand-history-position');
  const downloads = new Map([...byId('scheme-downloads').querySelectorAll('a[download]')]
    .map(link => [link.download, link.getAttribute('href')]));
  let activeVariant = 'ux';

  const frameFor = name => byId('stand-frame-' + name);
  const send = (frame, data) => frame.contentWindow.postMessage(data, '*');
  const history = action => send(frameFor(activeVariant), { type: 'vero:history', action });

  function load(frame) {
    if (!frame.dataset.page) return;
    frame.srcdoc = frame.dataset.page;
    delete frame.dataset.page;
  }

  function show(name) {
    const schemes = name === 'schemes';
    if (!schemes) activeVariant = name;
    tabs.forEach((tab, index) => {
      const selected = schemes === (index === 1);
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
      byId(tab.getAttribute('aria-controls')).hidden = !selected;
    });
    for (const button of variants) {
      const selected = button.dataset.variant === activeVariant;
      button.setAttribute('aria-pressed', selected);
      frameFor(button.dataset.variant).hidden = !selected;
    }
    tools.hidden = activeVariant === 'ux';
    back.disabled = forward.disabled = true;
    position.textContent = '';
    load(schemes ? schemeFrame : frameFor(activeVariant));
    if (!schemes && !tools.hidden) history('status');
  }

  function fromHash() {
    const name = location.hash.slice(1);
    return ['ux', 'letter', 'brief', 'schemes'].includes(name) ? name : 'ux';
  }
  function select(name) {
    if (fromHash() !== name) window.history.replaceState(null, '', '#' + name);
    show(name);
  }

  for (const button of variants) button.addEventListener('click', () => select(button.dataset.variant));
  tabs.forEach((tab, index) => {
    const switchTo = next => select(next === 0 ? activeVariant : 'schemes');
    tab.addEventListener('click', () => switchTo(index));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 :
        ['ArrowLeft', 'ArrowRight'].includes(event.key) ? 1 - index : -1;
      if (next < 0) return;
      event.preventDefault();
      tabs[next].focus();
      switchTo(next);
    });
  });
  for (const button of variants) frameFor(button.dataset.variant).addEventListener('load', () => {
    if (activeVariant === button.dataset.variant && !tools.hidden) history('status');
  });
  back.addEventListener('click', () => history('back'));
  forward.addEventListener('click', () => history('forward'));
  byId('stand-fill').addEventListener('click', () => send(frameFor(activeVariant), { type: 'vero:fill' }));
  addEventListener('hashchange', () => show(fromHash()));
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('scheme-expanded')) {
      send(schemeFrame, { type: 'vero:scheme-close' });
    }
  });
  addEventListener('message', event => {
    const data = event.data;
    if (event.source === frameFor(activeVariant).contentWindow && data?.type === 'vero:history-state' &&
        !tools.hidden && typeof data.back === 'boolean' && typeof data.forward === 'boolean') {
      back.disabled = !data.back;
      forward.disabled = !data.forward;
      position.textContent = Number.isInteger(data.position) && Number.isInteger(data.total) && data.total > 0
        ? `${data.position} / ${data.total}` : '';
    }
    if (event.source !== schemeFrame.contentWindow || schemeFrame.parentElement.hidden) return;
    if (data?.type === 'vero:scheme-expand' && typeof data.expanded === 'boolean') {
      document.body.classList.toggle('scheme-expanded', data.expanded);
    }
    if (data?.type !== 'vero:download') return;
    const payload = /^data:(application\/xml|image\/svg\+xml);charset=utf-8,([\s\S]*)$/.exec(downloads.get(data.name));
    if (!payload) return;
    const url = URL.createObjectURL(new Blob([decodeURIComponent(payload[2])], { type: payload[1] }));
    const link = document.createElement('a');
    link.href = url;
    link.download = data.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  });
  show(fromHash());
})();
