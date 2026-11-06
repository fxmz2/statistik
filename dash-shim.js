// Kleine Laufzeit für die eigenständige Version: lädt data/*.json und stellt die
// Schnittstelle bereit, die calcs.js, core.js und views.js erwarten (dash.data, dash.calc, dash.draw …).
(() => {
  const SOURCES = ['spiele', 'aufstellungen', 'tore', 'tabellen', 'saisons'];
  const store = {}, failed = {}, calcs = {}, draws = new Map(), onDataFns = [];
  const hiddenUp = (el) => { for (let e = el; e; e = e.parentElement) if (e.hidden) return true; return false; };

  const dash = {
    colors: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--series-${i})`),
    calc(id, o) { calcs[id] = o; },
    data(id) {
      if (!store[id] && calcs[id]) {
        const ins = calcs[id].inputs.map((i) => dash.data(i));
        if (ins.every((d) => d.status === 'ok')) {
          try { store[id] = calcs[id].fn(...ins.map((d) => d.data)); } catch (e) { console.error(id, e); failed[id] = true; }
        } else if (ins.some((d) => d.status === 'error')) failed[id] = true;
      }
      if (store[id]) return {status: 'ok', data: store[id], columns: [], meta: []};
      return {status: failed[id] ? 'error' : 'loading', data: [], columns: [], meta: []};
    },
    onData(fn) { onDataFns.push(fn); try { fn(); } catch (e) { console.error(e); } },
    draw(name, fn) {
      if (fn) { draws.set(name, fn); return; }
      run(name);
    },
    setLink(name) { try { history.replaceState(null, '', '#' + name); } catch (e) { /* egal */ } },
    params: () => ({}), setParams() {}, resetParams() {}, refresh() {},
  };
  window.dash = dash;

  function run(name) {
    const fn = draws.get(name);
    if (!fn) return;
    for (const el of document.querySelectorAll(`[data-draw="${name}"]`)) {
      if (hiddenUp(el)) continue;
      try { fn(el); } catch (e) { console.error(name, e); }
    }
  }
  function runAll() {
    onDataFns.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    for (const name of draws.keys()) run(name);
  }
  let pending = 0;
  const schedule = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(runAll); };

  document.addEventListener('DOMContentLoaded', () => {
    schedule();
    // eingeblendete Bereiche (Reiter, Ansichten) zeichnen, sobald sie sichtbar werden
    new MutationObserver((list) => { if (list.some((m) => m.attributeName === 'hidden' && !m.target.hidden)) schedule(); })
      .observe(document.body, {attributes: true, subtree: true, attributeFilter: ['hidden']});
    let w = window.innerWidth;
    window.addEventListener('resize', () => { if (window.innerWidth !== w) { w = window.innerWidth; schedule(); } });
    Promise.all(SOURCES.map((id) => fetch(`data/${id}.json`, {cache: 'no-cache'}).then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then((d) => { store[id] = d; }).catch(() => { failed[id] = true; }))).then(schedule);
    fetch('data/meta.json', {cache: 'no-cache'}).then((r) => r.json()).then((m) => {
      const el = document.getElementById('datenstand');
      if (el && m.updated) el.textContent = 'Datenstand: ' + new Date(m.updated).toLocaleString('de-DE', {dateStyle: 'medium', timeStyle: 'short'}) + ' Uhr';
    }).catch(() => {});
  });
})();
