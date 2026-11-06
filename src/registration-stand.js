(() => {
  const byId = id => document.getElementById(id);
  const variants = [...document.querySelectorAll('[data-variant]')];
  const sections = ['current', 'comparison', 'schemes'];
  const tabs = sections.map(name => byId('stand-tab-' + name));
  const schemeFrame = byId('stand-frame-schemes');
  const back = byId('stand-back');
  const forward = byId('stand-forward');
  const position = byId('stand-history-position');
  const downloads = new Map([...byId('scheme-downloads').querySelectorAll('a[download]')]
    .map(link => [link.download, link.getAttribute('href')]));
  let activeVariant = 'letter';

  const frameFor = name => byId('stand-frame-' + name);
  const send = (frame, data) => frame.contentWindow.postMessage(data, '*');
  const history = action => send(frameFor(activeVariant), { type: 'vero:history', action });

  function load(frame) {
    if (!frame.dataset.page) return;
    frame.srcdoc = frame.dataset.page;
    delete frame.dataset.page;
  }

  function show(name) {
    const section = sections.includes(name) ? name : 'current';
    if (section === 'current') activeVariant = name;
    tabs.forEach((tab, index) => {
      const selected = sections[index] === section;
      tab.setAttribute('aria-selected', selected);
      tab.tabIndex = selected ? 0 : -1;
      byId(tab.getAttribute('aria-controls')).hidden = !selected;
    });
    for (const button of variants) {
      const selected = button.dataset.variant === activeVariant;
      button.setAttribute('aria-pressed', selected);
      frameFor(button.dataset.variant).hidden = !selected;
    }
    back.disabled = forward.disabled = true;
    position.textContent = '';
    load(frameFor(section === 'current' ? activeVariant : section));
    if (section === 'current') history('status');
  }

  function fromHash() {
    const name = location.hash.slice(1);
    return ['letter', 'brief', 'comparison', 'schemes'].includes(name) ? name : 'letter';
  }
  function select(name) {
    if (fromHash() !== name) window.history.replaceState(null, '', '#' + name);
    show(name);
  }

  for (const button of variants) button.addEventListener('click', () => select(button.dataset.variant));
  tabs.forEach((tab, index) => {
    const switchTo = next => select(next === 0 ? activeVariant : sections[next]);
    tab.addEventListener('click', () => switchTo(index));
    tab.addEventListener('keydown', event => {
      const next = {
        Home: 0,
        End: tabs.length - 1,
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
      }[event.key] ?? -1;
      if (next < 0) return;
      event.preventDefault();
      tabs[next].focus();
      switchTo(next);
    });
  });
  for (const button of variants) frameFor(button.dataset.variant).addEventListener('load', () => {
    if (activeVariant === button.dataset.variant) history('status');
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
        typeof data.back === 'boolean' && typeof data.forward === 'boolean') {
      back.disabled = !data.back;
      forward.disabled = !data.forward;
      position.textContent = Number.isInteger(data.position) && Number.isInteger(data.total) && data.total > 0
        ? `${data.position} / ${data.total}` : '';
    }
    const comparison = frameFor('comparison');
    if (event.source === comparison.contentWindow && !comparison.parentElement.hidden && data?.type === 'vero:navigate') {
      if (data.view === 'schemes') select('schemes');
      if (data.view === 'current') select(activeVariant);
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
