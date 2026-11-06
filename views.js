// Bedienung und Darstellung
(() => {
  const T = window.tsg;
  const h = T.h;
  const ALL = ['cfrange', 'duowahl', 'duoname', 'duotabelle', 'gamessum', 'spieltabelle', 'seasonsel', 'summary', 'kpi', 'kpisplit', 'spot', 'mdesc', 'legend', 'saisonchart', 'lead', 'profilwahl', 'pval', 'profilchart', 'profilspiele',
    'profiltabelle', 'spielertabelle', 'wkpi', 'subhist', 'statetabelle', 'mitohnetabelle', 'kaderlegend', 'kaderchart', 'durchchart', 'beidetabelle', 'bkpi',
    'platzchart', 'tabellentabelle', 'heimtabelle', 'spielliste', 'gegnertabelle', 'bestseason', 'msrecent', 'msnext', 'rbsum', 'rueckblick', 'factsum', 'fact', 'tjchart', 'abdeckung', 'fehlliste', 'abweichung', 'bilanzkurz', 'mittabelle', 'vorltabelle', 'pgegtabelle'];
  T.redraw = (names = ALL) => names.forEach((n) => dash.draw(n));
  const $$ = (sel) => document.querySelectorAll(sel);
  const on = (sel, ev, fn) => $$(sel).forEach((el) => el.addEventListener(ev, (e) => fn(el, e)));
  // Ereignisse innerhalb der Seite abfangen (nicht am Dokument): so kommen sie auch im eingebetteten Dashboard an
  T.root = document.querySelector('.tsg') || document;
  T.setOptions = (sel, opts) => {
    const sig = opts.map(([t, v]) => v + '=' + t).join('|');
    if (sel.dataset.sig !== sig) { sel.replaceChildren(...opts.map(([t, v]) => new Option(t, v))); sel.dataset.sig = sig; }
  };

  // ---------- Eigener Filter je Karte ----------
  // Jede Karte mit data-scope kann Mannschaft und Zeitraum für sich überschreiben.
  T.scopes = new Map();
  T.rangeOf = (v) => {
    const ys = T.allYears();
    if (!v || !ys.length) return null;
    const last = ys[ys.length - 1];
    if (v === 'all') return [null, null];
    if (v.startsWith('last')) return [Math.max(ys[0], last - Number(v.slice(4)) + 1), last];
    if (v.startsWith('y')) { const y = Number(v.slice(1)); return [y, y]; }
    return null;
  };
  T.scoped = (el, fn) => {
    const card = el.closest('[data-scope]');
    const sc = card && T.scopes.get(card.id);
    if (!sc || (!sc.team && !sc.range)) return fn();
    const keep = {sel: T.st.sel, from: T.st.from, to: T.st.to};
    try {
      if (sc.team) T.st.sel = new Set(sc.team === 'both' ? ['m1', 'ii'] : [sc.team]);
      const r = T.rangeOf(sc.range);
      if (r) { T.st.from = r[0]; T.st.to = r[1]; }
      return fn();
    } finally { Object.assign(T.st, keep); }
  };
  T.draw = (name, fn) => dash.draw(name, (el, ...rest) => T.scoped(el, () => fn(el, ...rest)));
  const redrawCard = (card) => [...new Set([...card.querySelectorAll('[data-draw]')].map((x) => x.dataset.draw))].forEach((nm) => dash.draw(nm));
  const cfChange = (e) => {
    const s = e.target.closest('.tsg-cf-team, .tsg-cf-range');
    if (!s) return;
    const card = s.closest('[data-scope]');
    if (!card) return;
    const sc = T.scopes.get(card.id) || {team: '', range: ''};
    if (s.classList.contains('tsg-cf-team')) sc.team = s.value; else sc.range = s.value;
    T.scopes.set(card.id, sc);
    s.classList.toggle('tsg-cf-on', !!s.value);
    card.classList.toggle('tsg-card-scoped', !!(sc.team || sc.range));
    redrawCard(card);
  };
  $$('.tsg-cf-team, .tsg-cf-range').forEach((x) => x.addEventListener('change', (e) => { e.stopPropagation(); cfChange(e); }));
  T.root.addEventListener('change', cfChange);

  // ---------- Bedienung ----------
  const syncTeams = () => $$('.tsg-team').forEach((b) => {
    const sel = T.st.sel.has(b.dataset.team);
    b.setAttribute('aria-pressed', String(sel));
    b.disabled = sel && T.st.sel.size === 1;
  });
  syncTeams();
  on('.tsg-team', 'click', (b) => {
    const t = b.dataset.team;
    if (T.st.sel.has(t)) { if (T.st.sel.size > 1) T.st.sel.delete(t); } else T.st.sel.add(t);
    syncTeams(); T.redraw();
  });

  const syncPresets = (active) => $$('.tsg-preset[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === active)));
  on('.tsg-preset[data-preset]', 'click', (b) => {
    const ys = T.allYears();
    const p = b.dataset.preset;
    if (p === 'all' || !ys.length) { T.st.from = null; T.st.to = null; }
    else { const last = ys[ys.length - 1]; T.st.to = last; T.st.from = Math.max(ys[0], last - Number(p) + 1); }
    syncPresets(p); T.redraw();
  });
  on('#season-from, #season-to', 'change', (s) => {
    const ys = T.allYears();
    let from = Number(document.getElementById('season-from')?.value), to = Number(document.getElementById('season-to')?.value);
    if (from > to) [from, to] = s.id === 'season-from' ? [from, from] : [to, to];
    T.st.from = from === ys[0] ? null : from; T.st.to = to === ys[ys.length - 1] ? null : to;
    syncPresets(T.st.from === null && T.st.to === null ? 'all' : ''); T.redraw();
  });
  on('#mingames', 'change', (s) => { T.st.minGames = Number(s.value) || 1; T.redraw(['summary', 'spot', 'lead', 'mitohnetabelle']); });

  const openTab = (name, link) => {
    if (![...$$('.tsg-tab')].some((t) => t.dataset.tab === name)) return;
    $$('.tsg-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    $$('.tsg-panel').forEach((p) => { p.hidden = p.id !== name; });
    if (link) dash.setLink(name);
  };
  T.openTab = openTab;
  on('.tsg-tab', 'click', (t) => openTab(t.dataset.tab, true));
  openTab(location.hash.slice(1), false);

  const showPlayer = (name) => {
    if (!name) return;
    T.st.player = name;
    T.redraw(['profilwahl', 'pval', 'profilchart', 'profilspiele', 'profiltabelle', 'bilanzkurz', 'mittabelle', 'vorltabelle', 'pgegtabelle', 'gamessum', 'spieltabelle']);
    openTab('spieler', true);
    document.getElementById('spielerprofil')?.scrollIntoView({behavior: 'smooth', block: 'start'});
  };
  T.showPlayer = showPlayer;
  on('#profil-spieler', 'change', (s) => { T.st.player = s.value; T.redraw(['pval', 'profilchart', 'profilspiele', 'profiltabelle', 'bilanzkurz', 'mittabelle', 'vorltabelle', 'pgegtabelle', 'gamessum', 'spieltabelle']); });
  on('.tsg-bviewpick .tsg-preset', 'click', (b) => {
    $$('.tsg-bviewpick .tsg-preset').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $$('[data-bview-panel]').forEach((p) => { p.hidden = p.dataset.bviewPanel !== b.dataset.bview; });
  });
  on('.tsg-lead', 'click', (ol, e) => { if (e.target.closest('button, .tsg-detail')) return; showPlayer(e.target.closest('li[data-name]')?.dataset.name); });
  on('.tsg-clickrows', 'click', (tb, e) => showPlayer(e.target.closest('tr[data-name]')?.dataset.name));
  on('.tsg-spot', 'click', (b) => showPlayer(T.spotTop(b.dataset.spot)?.name));

  on('.tsg-lead-metric, .tsg-lead-dir', 'change', () => T.redraw(['lead', 'mdesc']));
  on('.tsg-season-metric', 'change', () => T.redraw(['saisonchart', 'legend', 'mdesc']));
  on('.tsg-profil-metric', 'change', () => dash.draw('profilchart'));
  on('.tsg-kader-view', 'change', () => T.redraw(['kaderlegend', 'kaderchart']));
  on('.tsg-best-metric', 'change', () => dash.draw('bestseason'));
  on('.tsg-ms-cat', 'change', () => T.redraw(['msrecent', 'msnext']));
  on('.tsg-rb-range', 'change', () => T.redraw(['rbsum', 'rueckblick']));
  on('.tsg-rb', 'click', (box, e) => showPlayer(e.target.closest('[data-name]')?.dataset.name));
  on('.tsg-tj-metric', 'change', () => dash.draw('tjchart'));
  on('.tsg-state-kind', 'change', () => dash.draw('statetabelle'));
  on('.tsg-missing', 'change', () => dash.draw('fehlliste'));
  on('#spielersuche', 'input', (i) => { T.st.query = i.value.trim().toLowerCase(); dash.draw('spielertabelle'); });
  on('#gegnersuche', 'input', (i) => { T.st.oppQuery = i.value.trim().toLowerCase(); dash.draw('gegnertabelle'); });

  const syncColumns = () => {
    $$('#tbl-spieler thead th').forEach((th) => {
      const g = (th.dataset.groups || '').split(' ');
      th.hidden = !(g.includes('all') || g.includes(T.st.group));
    });
    $$('.tsg-colpick .tsg-preset').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.group === T.st.group)));
  };
  syncColumns();
  on('.tsg-colpick .tsg-preset', 'click', (b) => { T.st.group = b.dataset.group; syncColumns(); dash.draw('spielertabelle'); });

  $$('.tsg-table').forEach((table) => {
    table.querySelectorAll('.tsg-th').forEach((th) => th.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
      const f = th.dataset.field;
      const cur = T.st.sorts[table.id] || {};
      const textual = th.dataset.fmt === 'text' || th.dataset.fmt === 'chip';
      const next = cur.field === f ? {field: f, dir: cur.dir === 'desc' ? 'asc' : 'desc'} : {field: f, dir: textual ? 'asc' : 'desc'};
      T.st.sorts[table.id] = next;
      table.querySelectorAll('.tsg-th').forEach((o) => {
        if (o.dataset.field === f) o.setAttribute('aria-sort', next.dir === 'desc' ? 'descending' : 'ascending');
        else o.removeAttribute('aria-sort');
      });
      table.querySelectorAll('tbody[data-draw]').forEach((tb) => dash.draw(tb.dataset.draw));
    })));
  });

  dash.onData(() => { $$('[data-sw]').forEach((s) => { s.style.background = T.color(s.dataset.sw); }); });

  // ---------- „Weitere anzeigen“ unter Listen ----------
  T.limits = new WeakMap();
  T.cut = (el, rows, def) => rows.slice(0, T.limits.get(el) || def);
  T.more = (el, total, def) => {
    const lim = T.limits.get(el) || def;
    if (total <= def) return;
    const row = h('li', {class: 'tsg-more-row'});
    if (lim < total) row.append(h('button', {type: 'button', class: 'tsg-more', 'data-def': String(def), text: `Weitere ${Math.min(10, total - lim)} anzeigen`}),
      h('span', {class: 'tsg-note', text: `${Math.min(lim, total)} von ${total}`}));
    if (lim > def) row.append(h('button', {type: 'button', class: 'tsg-more', 'data-def': String(def), 'data-less': '1', text: 'Weniger anzeigen'}));
    el.append(row);
  };
  T.root.addEventListener('click', (e) => {
    const b = e.target.closest('.tsg-more');
    if (!b || b.classList.contains('tsg-detail-btn')) return;
    const list = b.closest('[data-draw]');
    if (!list) return;
    const def = Number(b.dataset.def) || 10;
    T.limits.set(list, b.dataset.less ? def : (T.limits.get(list) || def) + 10);
    dash.draw(list.dataset.draw);
  });

  // ---------- Helfer ----------
  T.sortRows = (table, rows) => {
    let s = T.st.sorts[table.id];
    if (!s) {
      const th = table.querySelector('.tsg-th[aria-sort]');
      s = th ? {field: th.dataset.field, dir: th.getAttribute('aria-sort') === 'ascending' ? 'asc' : 'desc'} : null;
    }
    if (!s) return rows;
    return rows.slice().sort((a, b) => {
      const va = a[s.field], vb = b[s.field];
      const na = va === null || va === undefined, nb = vb === null || vb === undefined;
      if (na || nb) return na === nb ? 0 : na ? 1 : -1;
      const c = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'de', {numeric: true});
      return s.dir === 'desc' ? -c : c;
    });
  };
  const SIGNED = new Set(['ints', 'd2s']);
  T.fillTable = (tbody, rows, keys = null) => {
    const table = tbody.closest('table');
    const cols = [...table.querySelectorAll('thead th')].map((th) => ({f: th.dataset.field, fmt: th.dataset.fmt, hidden: th.hidden, left: th.classList.contains('tsg-l')}));
    for (const p of T.sortRows(table, rows)) {
      const tr = h('tr', {'data-key': keys ? keys.map((k) => T.enc(p[k])).join(',') : null, 'data-name': p.name || null});
      for (const c of cols) {
        const td = h('td', {class: c.left ? 'tsg-l' : null});
        td.hidden = c.hidden;
        if (c.fmt === 'chip') td.append(h('span', {class: 'tsg-chip' + (String(p[c.f]).includes('+') ? ' tsg-chip-multi' : ''), text: p[c.f]}));
        else {
          td.textContent = T.fmt(c.fmt, p[c.f]);
          if (SIGNED.has(c.fmt) && typeof p[c.f] === 'number' && p[c.f] !== 0) td.classList.add(p[c.f] > 0 ? 'tsg-good' : 'tsg-bad');
        }
        tr.append(td);
      }
      tbody.append(tr);
    }
  };
  const tipLine = (id, text) => h('div', {class: 'tsg-tip-l'}, id ? T.sw(id) : null, text);
  const tipBox = (el) => {
    const tip = h('div', {class: 'tsg-tip'});
    tip.hidden = true;
    el.append(tip);
    return {
      show: (ev, title, lines) => {
        tip.replaceChildren(h('div', {class: 'tsg-tip-h', text: title}), ...lines);
        tip.hidden = false;
        const [px, py] = d3.pointer(ev, el);
        tip.style.left = Math.max(0, Math.min(el.clientWidth - tip.offsetWidth, px + 12)) + 'px';
        tip.style.top = Math.max(0, py - tip.offsetHeight - 8) + 'px';
      },
      hide: () => { tip.hidden = true; },
    };
  };
  // Säulen; rows = [{season, parts:{id:v}, total}]
  T.columns = (el, rows, ids, tipLines, opts = {}) => {
    el.replaceChildren();
    if (!rows.length) { el.append(h('div', {class: 'tsg-fail tsg-empty', text: 'Keine Daten in dieser Auswahl.'})); return; }
    const kind = opts.fmt || 'int';
    const fmt = (v) => T.fmt(kind === 'ints' ? 'int' : kind, v);
    const H = opts.height || 260, W = Math.max(260, el.clientWidth), mt = 18, mb = 26, mr = 6;
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', opts.label || 'Diagramm');
    const neg = opts.neg || [];
    const up = d3.max(rows, (r) => ids.filter((i) => !neg.includes(i)).reduce((a, i) => a + Math.max(0, r.parts[i] || 0), 0)) || 1;
    const down = d3.max(rows, (r) => neg.reduce((a, i) => a + (r.parts[i] || 0), 0)) || 0;
    const y = d3.scaleLinear([-down, up], [H - mb, mt]).nice();
    let ticks = y.ticks(5);
    if (kind === 'int') ticks = ticks.filter((t) => Number.isInteger(t));
    const meas = svg.append('text').attr('class', 'tsg-tick');
    let lw = 0;
    for (const t of ticks) { meas.text(fmt(Math.abs(t))); lw = Math.max(lw, meas.node().getComputedTextLength()); }
    meas.remove();
    const ml = Math.ceil(lw) + 10;
    const x = d3.scaleBand(rows.map((r) => r.season), [ml, W - mr]).paddingInner(0.28).paddingOuter(0.1);
    const bw = x.bandwidth();
    const g = svg.append('g');
    g.selectAll('line').data(ticks).join('line').attr('x1', ml).attr('x2', W - mr).attr('y1', (t) => y(t)).attr('y2', (t) => y(t))
      .attr('stroke', (t) => (t === 0 ? 'var(--cds-chart-axis)' : 'var(--cds-chart-grid)')).attr('stroke-width', 1);
    g.selectAll('text').data(ticks).join('text').attr('class', 'tsg-tick').attr('x', ml - 6).attr('y', (t) => y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').text((t) => fmt(Math.abs(t)));
    const segs = [];
    for (const r of rows) {
      let u = 0, d = 0;
      for (const id of ids) {
        const v = r.parts[id] || 0;
        if (v <= 0) continue;
        if (neg.includes(id)) { segs.push({r, id, y0: -d, y1: -(d + v)}); d += v; } else { segs.push({r, id, y0: u, y1: u + v}); u += v; }
      }
    }
    const bars = svg.append('g').selectAll('rect').data(segs).join('rect').attr('x', (s) => x(s.r.season)).attr('width', bw)
      .attr('y', (s) => Math.min(y(s.y0), y(s.y1))).attr('height', (s) => Math.max(0, Math.abs(y(s.y0) - y(s.y1)) - (s.y0 !== 0 ? 1 : 0)))
      .attr('rx', Math.min(2, bw / 2)).attr('fill', (s) => T.color(s.id));
    if (!opts.noLabels && bw >= d3.max(rows, (r) => fmt(r.total).length) * 7) {
      svg.append('g').selectAll('text').data(rows).join('text').attr('class', 'tsg-barval').attr('x', (r) => x(r.season) + bw / 2)
        .attr('y', (r) => y(Math.max(0, r.total)) - 4).attr('text-anchor', 'middle').text((r) => fmt(r.total));
    }
    const lab = d3.max(rows, (r) => String(r.season).length) * 6.5 + 6;
    const every = Math.max(1, Math.ceil(lab / x.step()));
    svg.append('g').selectAll('text').data(rows.filter((r, i) => (rows.length - 1 - i) % every === 0)).join('text').attr('class', 'tsg-tick')
      .attr('x', (r) => x(r.season) + bw / 2).attr('y', H - mb + 16).attr('text-anchor', 'middle').text((r) => r.season);
    const tip = tipBox(el);
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (r) => x(r.season) - (x.step() - bw) / 2).attr('width', x.step()).attr('y', mt).attr('height', H - mb - mt).attr('fill', 'transparent')
      .on('pointerenter pointermove', (ev, r) => { bars.attr('opacity', (s) => (s.r === r ? 1 : 0.45)); tip.show(ev, (opts.tipPrefix ?? 'Saison ') + r.season, tipLines(r)); })
      .on('pointerleave', () => { bars.attr('opacity', 1); tip.hide(); });
  };
  const empty = (el, text) => el.append(h('li', {class: 'tsg-empty', text}));
  const optOf = (sel) => sel?.selectedOptions?.[0];
  const isSigned = (fmt) => SIGNED.has(fmt);

  // ---------- Kopf ----------
  T.draw('seasonsel', (sel) => {
    const ys = T.allYears();
    T.setOptions(sel, ys.map((y) => [T.seasonLabel(y), String(y)]));
    if (!ys.length) return;
    sel.value = String(sel.dataset.which === 'from' ? (T.st.from ?? ys[0]) : (T.st.to ?? ys[ys.length - 1]));
  });
  T.draw('summary', (el) => {
    el.replaceChildren();
    if (!T.ok('spielerspiele', 'spiele')) { el.textContent = '—'; return; }
    const ys = T.allYears();
    const from = T.st.from ?? ys[0], to = T.st.to ?? ys[ys.length - 1];
    el.append(h('b', {text: T.ids().map((i) => T.label[i]).join(' + ')}), ' · ', h('b', {text: T.seasonLabel(from) + '–' + T.seasonLabel(to)}),
      ' · ', T.fmt('int', T.tm().length), ' Spiele · ', T.fmt('int', T.players().length), ' Spieler · Quoten ab ', T.fmt('int', T.st.minGames));
  });

  // ---------- Überblick ----------
  const kpis = () => T.memo('kpis', () => {
    const tm = T.tm(), ps = T.players(), pm = T.pm();
    const c = (r) => tm.filter((s) => s.result === r).length;
    const ins = pm.filter((r) => r.subIn && r.inMin !== null);
    return {games: tm.length, S: c('S'), U: c('U'), N: c('N'), players: ps.length, goals: T.sum(ps, 'goals'), teamGoals: T.sum(tm, 'goalsFor'),
      assists: T.sum(ps, 'assists'), minutes: T.sum(ps, 'minutes'), cards: T.sum(ps, 'cards'), yellow: T.sum(ps, 'yellow'), yellowRed: T.sum(ps, 'yellowRed'),
      red: T.sum(ps, 'red'), subIn: T.sum(ps, 'subIn'), subInMin: ins.length ? Math.round(T.sum(ins, 'inMin') / ins.length) : null,
      penHit: T.sum(ps, 'penHit'), penTotal: T.sum(ps, 'penTotal')};
  });
  T.draw('kpi', (el) => {
    if (!T.ok('spielerspiele', 'spiele')) { el.textContent = '—'; return; }
    el.classList.remove('dash-skeleton');
    const k = kpis(), f = (v) => T.fmt('int', v);
    const text = {games: f(k.games), record: `${f(k.S)} S · ${f(k.U)} U · ${f(k.N)} N`, players: f(k.players), goals: f(k.goals),
      teamGoals: `Mannschaft laut Ergebnissen: ${f(k.teamGoals)}`, assists: f(k.assists), minutes: f(k.minutes), cards: f(k.cards),
      cardsSplit: `${f(k.yellow)} Gelb · ${f(k.yellowRed)} Gelb-Rot · ${f(k.red)} Rot`, subIn: f(k.subIn),
      subInMin: k.subInMin === null ? 'Wechselminute unbekannt' : `im Schnitt in der ${k.subInMin}. Minute`, penHit: f(k.penHit), penOf: `von ${f(k.penTotal)} geschossenen`}[el.dataset.k];
    el.textContent = text ?? '—';
  });
  T.draw('kpisplit', (el) => {
    el.replaceChildren();
    if (!T.ok('spielerspiele')) { el.textContent = '—'; return; }
    const ids = T.ids(), k = el.dataset.k;
    if (ids.length < 2) { el.textContent = 'nur ' + T.label[ids[0]]; return; }
    for (const id of ids) {
      const ps = T.players().filter((p) => p.team[id]);
      const v = k === 'players' ? ps.length : ps.reduce((a, p) => a + (p.team[id][k] || 0), 0);
      el.append(h('span', null, T.sw(id), T.label[id] + ' ' + T.fmt('int', v)));
    }
  });
  const SPOT = {matches: ['Einsätze', (p) => true], goals: ['Tore', (p) => true], inGain: ['Punkte nach Einwechslungen', (p) => p.inN >= 3],
    pmPer90: ['pro 90 Minuten', (p) => p.matches >= T.st.minGames]};
  T.spotTop = (m) => {
    const [, ok] = SPOT[m];
    return T.players().filter((p) => p[m] !== null && p[m] !== undefined && ok(p)).sort((a, b) => b[m] - a[m] || b.matches - a.matches)[0] || null;
  };
  T.draw('spot', (el) => {
    if (!T.ok('spielerspiele', 'spiele')) { el.textContent = '—'; return; }
    const m = el.dataset.metric, p = T.spotTop(m);
    if (!p) { el.textContent = el.dataset.part === 'name' ? '–' : 'zu wenige Daten'; return; }
    if (el.dataset.part === 'name') { el.textContent = p.name; return; }
    const fmt = m === 'pmPer90' ? 'd2s' : m === 'inGain' ? 'ints' : 'int';
    const extra = m === 'inGain' ? ` · ${T.fmt('int', p.inN)} Einwechslungen` : m === 'pmPer90' ? ` · ${T.fmt('int', p.matches)} Einsätze` : ` · ${p.span}`;
    el.textContent = T.fmt(fmt, p[m]) + ' ' + SPOT[m][0] + extra;
  });
  T.draw('mdesc', (el) => {
    const o = optOf(document.getElementById(el.dataset.for));
    el.textContent = o?.dataset.desc || '';
  });
  T.draw('legend', (el) => {
    el.replaceChildren();
    if (el.closest('#saisonverlauf') && document.getElementById('season-metric')?.value === 'players') { el.append(h('span', null, T.sw('mix'), 'Gewählte Mannschaften zusammen')); return; }
    for (const id of T.ids()) el.append(h('span', null, T.sw(id), T.label[id]));
  });
  T.draw('saisonchart', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    const sel = document.getElementById('season-metric');
    const m = sel?.value || 'goals', label = optOf(sel)?.textContent || '';
    const ids = T.ids();
    if (m === 'players') {
      const by = d3.rollup(T.pm(), (v) => new Set(v.map((r) => r.name)).size, (r) => r.seasonYear);
      const rows = [...by].sort((a, b) => a[0] - b[0]).map(([y, n]) => ({season: T.seasonLabel(y), parts: {mix: n}, total: n}));
      T.columns(el, rows, ['mix'], (r) => [tipLine(null, T.fmt('int', r.total) + ' Spieler eingesetzt')], {label});
      return;
    }
    const by = new Map();
    for (const s of T.seasonTeams()) {
      if (!by.has(s.seasonYear)) by.set(s.seasonYear, {season: s.season, parts: {}, total: 0});
      const o = by.get(s.seasonYear);
      o.parts[s.teamId] = s[m] || 0; o.total += s[m] || 0;
    }
    const withPlayers = new Set(T.yearsInSel());
    const rows = [...by].filter(([y]) => withPlayers.has(y)).sort((a, b) => a[0] - b[0]).map(([, o]) => o);
    T.columns(el, rows, ids, (r) => {
      const lines = ids.filter((id) => r.parts[id] !== undefined).map((id) => tipLine(id, T.label[id] + ': ' + T.fmt('int', r.parts[id])));
      if (lines.length > 1) lines.push(tipLine(null, 'Zusammen: ' + T.fmt('int', r.total)));
      return [tipLine(null, label), ...lines];
    }, {label});
  });

  // ---------- Details zu Wechseln und Plus/Minus ----------
  const DETAIL = {inGain: 'in', inGainAvg: 'in', inGD: 'in', inImproved: 'in', outGain: 'out', outGD: 'out', plusMinus: 'pm', pmPer90: 'pm'};
  T.openDetails = new Set();
  const subLine = (n, what, better, worse, res) => `aus ${T.fmt('int', n)} ${what}: ${better}× besser, ${n - better - worse}× gleich, ${worse}× schlechter · am Ende ${res[0]} S, ${res[1]} U, ${res[2]} N`;
  T.root.addEventListener('click', (e) => {
    const b = e.target.closest('.tsg-detail-btn');
    if (!b) return;
    const k = b.dataset.key;
    if (T.openDetails.has(k)) T.openDetails.delete(k); else T.openDetails.add(k);
    const list = b.closest('[data-draw]');
    if (list) dash.draw(list.dataset.draw);
  });
  T.detailTable = (p, kind) => {
    const mm = T.matchMap();
    const rows = (kind === 'in' ? p.inRows : kind === 'out' ? p.outRows : p.pmRows).slice().sort((a, b) => b.date.localeCompare(a.date));
    const sign = (v) => (v > 0 ? 'tsg-good' : v < 0 ? 'tsg-bad' : '');
    const word = {Führung: 'vorne', Remis: 'Remis', Rückstand: 'hinten'};
    const box = h('ol', {class: 'tsg-dlist'});
    for (const r of rows) {
      const s = mm.get(r.matchId);
      const opp = s ? (s.venue === 'Heim' ? 'gegen ' : 'bei ') + s.opponent + (T.ids().length > 1 ? ' · ' + T.label[r.teamId] : '') : '';
      const end = s ? h('span', {class: s.result === 'S' ? 'tsg-good' : s.result === 'N' ? 'tsg-bad' : '', text: s.goalsFor + ':' + s.goalsAgainst}) : '–';
      let meta, val;
      if (kind === 'pm') {
        const pm = r.gfOn - r.gaOn;
        meta = [`auf dem Platz ${r.inMin}.–${r.outMin}. Min. · Tore dabei ${r.gfOn}:${r.gaOn} · Endstand `, end];
        val = h('span', {class: 'tsg-pval ' + sign(pm), text: T.fmt('ints', pm)});
      } else {
        const g = kind === 'in' ? r.inGain : r.outGain, st = kind === 'in' ? r.inState : r.outState, sc = kind === 'in' ? r.inScore : r.outScore;
        meta = [`${kind === 'in' ? 'rein' : 'raus'} ${kind === 'in' ? r.inMin : r.outMin}. Min. bei ${sc} (${word[st] || st}) → Endstand `, end];
        val = h('span', {class: 'tsg-pval ' + sign(g), text: T.fmt('ints', g) + ' Pkt.'});
      }
      box.append(h('li', null, h('span', {class: 'tsg-rank', text: ddmmyy(r.date)}), h('span', {class: 'tsg-pname', text: opp}), val, h('span', {class: 'tsg-psplit'}, ...meta)));
    }
    return box;
  };

  // ---------- Bestenliste (überall dieselbe Logik)
  T.draw('lead', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    el.replaceChildren();
    const card = el.closest('.tsg-card');
    const sel = card?.querySelector('.tsg-lead-metric'), o = optOf(sel);
    if (!o) return;
    const f = sel.value, kind = o.dataset.fmt || 'int', rate = o.dataset.rate === '1', low = o.dataset.low === '1';
    const need = o.dataset.need, needMin = Number(o.dataset.needmin) || 0;
    const worst = card.querySelector('.tsg-lead-dir')?.value === 'worst';
    const signed = isSigned(kind);
    const all_rows = T.players().filter((p) => p[f] !== null && p[f] !== undefined && (!rate || p.matches >= T.st.minGames) && (!need || p[need] >= needMin) && (signed || rate || need || p[f] > 0))
      .sort((a, b) => ((low !== worst) ? a[f] - b[f] : b[f] - a[f]) || b.matches - a.matches || a.name.localeCompare(b.name, 'de'));
    const rows = T.cut(el, all_rows, 10);
    if (!rows.length) { empty(el, 'Kein Spieler erfüllt die Bedingungen – Zeitraum größer wählen oder Mindest-Einsätze senken.'); return; }
    const max = d3.max(rows, (p) => Math.abs(p[f])) || 1;
    const ids = T.ids();
    const stack = !rate && !signed && kind === 'int' && ids.length > 1 && rows.every((p) => Object.values(p.team).every((t) => t[f] !== undefined));
    let rank = 0;
    rows.forEach((p, i) => {
      if (i === 0 || p[f] !== rows[i - 1][f]) rank = i + 1;
      const track = h('span', {class: 'tsg-track'});
      let parts = [[signed ? (p[f] >= 0 ? 'good' : 'bad') : T.mixId(), Math.abs(p[f])]];
      if (stack) parts = ids.map((id) => [id, p.team[id]?.[f] || 0]).filter(([, v]) => v > 0);
      for (const [id, v] of parts) track.append(h('i', {style: {width: (100 * v / max) + '%', background: T.color(id)}}));
      let sub = '';
      if (f === 'maxStreak') sub = p.streakSpan;
      else if (f === 'seasons') sub = p.span;
      else if (stack && parts.length > 1) sub = parts.map(([id, v]) => T.label[id] + ' ' + T.fmt('int', v)).join(' · ');
      else if (f.startsWith('in')) sub = subLine(p.inN, 'Einwechslungen', p.inImproved, p.inWorse, p.inRes);
      else if (f.startsWith('out')) sub = subLine(p.outN, 'Auswechslungen', p.outImproved, p.outWorse, p.outRes);
      else if (f === 'plusMinus' || f === 'pmPer90') sub = `${T.fmt('int', p.gfOn)}:${T.fmt('int', p.gaOn)} Tore auf dem Platz · ${T.fmt('int', p.pmGames)} Spiele`;
      else if (f === 'ppgDiff') sub = `mit ${T.fmt('d2', p.ppgWith)} · ohne ${T.fmt('d2', p.ppgWithout)} (${T.fmt('int', p.gamesWithout)} Spiele)`;
      else if (rate || kind === 'pct') sub = `${T.fmt('int', p.matches)} Einsätze · ${T.fmt('int', p.minutes)} Min.`;
      const val = h('span', {class: 'tsg-pval' + (signed && p[f] !== 0 ? (p[f] > 0 ? ' tsg-good' : ' tsg-bad') : ''), text: T.fmt(kind, p[f])});
      const dk = DETAIL[f], key = (sel.id || '') + '|' + p.name, open = dk && T.openDetails.has(key);
      el.append(h('li', {'data-name': p.name, title: 'Profil öffnen'}, h('span', {class: 'tsg-rank', text: rank + '.'}), h('span', {class: 'tsg-pname', text: p.name}), val, track,
        sub ? h('span', {class: 'tsg-psplit', text: sub}) : null,
        dk ? h('span', {class: 'tsg-detail-bar'}, h('button', {type: 'button', class: 'tsg-more tsg-detail-btn', 'data-key': key, 'aria-expanded': String(open), text: open ? 'Spiele ausblenden' : 'Spiele anzeigen'})) : null));
      if (open) el.append(h('li', {class: 'tsg-detail'}, T.detailTable(p, dk)));
    });
    T.more(el, all_rows.length, 10);
  });

  // ---------- Spieler ----------
  T.cur = () => {
    const m = T.playerMap();
    if (T.st.player && m.has(T.st.player)) return m.get(T.st.player);
    return T.players().slice().sort((a, b) => b.matches - a.matches)[0] || null;
  };
  T.draw('profilwahl', (sel) => {
    const names = T.ok('spielerspiele', 'spiele') ? T.players().map((p) => p.name).sort((a, b) => a.localeCompare(b, 'de')) : [];
    T.setOptions(sel, names.map((n) => [n, n]));
    const c = T.cur();
    if (c) sel.value = c.name;
  });
  T.draw('pval', (el) => {
    const p = T.ok('spielerspiele', 'spiele') ? T.cur() : null;
    el.classList.remove('tsg-good', 'tsg-bad');
    if (!p) { el.textContent = '—'; return; }
    el.classList.remove('dash-skeleton');
    const v = p[el.dataset.field];
    el.textContent = T.fmt(el.dataset.fmt || (typeof v === 'number' ? 'int' : 'text'), v);
    if (el.dataset.signed && typeof v === 'number' && v !== 0) el.classList.add(v > 0 ? 'tsg-good' : 'tsg-bad');
  });
  T.draw('profilchart', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    const p = T.cur();
    if (!p) { el.replaceChildren(); return; }
    const sel = document.getElementById('profil-metric'), m = sel?.value || 'matches', label = optOf(sel)?.textContent || '';
    const rows = T.playerSeasons().filter((r) => r.name === p.name);
    const years = d3.range(p.firstYear, p.lastYear + 1);
    const data = years.map((y) => {
      const parts = {};
      let total = 0;
      for (const r of rows.filter((x) => x.seasonYear === y)) { parts[r.teamId] = r[m]; total += r[m]; }
      return {season: T.seasonLabel(y), parts, total};
    });
    const ids = T.ids();
    T.columns(el, data, ids, (r) => {
      const l = ids.filter((id) => r.parts[id] !== undefined).map((id) => tipLine(id, T.label[id] + ': ' + T.fmt('int', r.parts[id])));
      return [tipLine(null, label), ...(l.length ? l : [tipLine(null, 'kein Einsatz')])];
    }, {height: 200, label: label + ' von ' + p.name});
  });
  T.draw('profilspiele', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    el.replaceChildren();
    const p = T.cur();
    if (!p) return;
    const mm = T.matchMap();
    const all_games = T.pm().filter((r) => r.name === p.name).sort((a, b) => b.date.localeCompare(a.date));
    const games = T.cut(el, all_games, 10);
    if (!games.length) { empty(el, 'Keine Spiele in dieser Auswahl.'); return; }
    for (const r of games) {
      const s = mm.get(r.matchId);
      const role = r.start ? (r.subOut ? `Startelf, ausgewechselt (${r.minutes}.)` : r.full ? 'Startelf, 90 Min.' : `Startelf, ${r.minutes} Min.`) : `eingewechselt${r.inMin !== null ? ' (' + r.inMin + '.)' : ''}, ${r.minutes} Min.`;
      const bits = [role];
      if (r.goals) bits.push(r.goals === 1 ? '1 Tor' : r.goals + ' Tore');
      if (r.assists) bits.push(r.assists === 1 ? '1 Vorlage' : r.assists + ' Vorlagen');
      if (r.gfOn !== null) bits.push('+/− ' + T.fmt('ints', r.gfOn - r.gaOn));
      if (r.inGain !== null && r.inGain !== 0) bits.push('nach Einwechslung ' + T.fmt('ints', r.inGain) + ' Pkt.');
      const res = s ? s.result : '';
      el.append(h('li', null, h('span', {class: 'tsg-score ' + (res === 'S' ? 'tsg-good' : res === 'N' ? 'tsg-bad' : ''), text: s ? s.goalsFor + ':' + s.goalsAgainst : '–'}),
        h('span', {class: 'tsg-pname', text: s ? (s.venue === 'Heim' ? 'gegen ' : 'bei ') + s.opponent : ''}),
        h('span', {class: 'tsg-rank', text: r.date.slice(8, 10) + '.' + r.date.slice(5, 7) + '.' + r.date.slice(2, 4)}),
        h('span', {class: 'tsg-meta', text: T.label[r.teamId] + ' · ' + bits.join(' · ')})));
    }
    T.more(el, all_games.length, 10);
  });
  T.draw('profiltabelle', (el) => {
    el.replaceChildren();
    const p = T.ok('spielerspiele', 'spiele') ? T.cur() : null;
    if (p) T.fillTable(el, T.playerSeasons().filter((r) => r.name === p.name));
  });
  T.draw('spielertabelle', (el) => {
    el.replaceChildren();
    const none = $$('.tsg-none');
    if (!T.ok('spielerspiele', 'spiele')) { none.forEach((n) => { n.hidden = true; }); return; }
    const q = T.st.query;
    const rows = T.players().filter((p) => !q || p.name.toLowerCase().includes(q));
    T.fillTable(el, rows);
    none.forEach((n) => { n.hidden = rows.length > 0; });
  });

  // ---------- Wechsel & Wirkung ----------
  T.draw('wkpi', (el) => {
    if (!T.ok('spielerspiele', 'spiele')) { el.textContent = '—'; return; }
    el.classList.remove('dash-skeleton', 'tsg-good', 'tsg-bad');
    const s = T.subs(), ok = s.insOk;
    const b = ok.filter((r) => r.inGain > 0).length, w = ok.filter((r) => r.inGain < 0).length, g = T.sum(ok, 'inGain');
    const text = {total: T.fmt('int', s.totalSubIns), withData: `${T.fmt('int', ok.length)} davon mit allen Torminuten`, avgMin: s.avgMin === null ? '–' : s.avgMin + '.',
      bsw: ok.length ? `${b} · ${ok.length - b - w} · ${w}` : '–', gain: ok.length ? T.fmt('ints', g) : '–', gd: `Tordifferenz danach ${T.fmt('ints', T.sum(ok, 'inGD'))}`}[el.dataset.k];
    el.textContent = text ?? '—';
    if (el.dataset.k === 'gain' && ok.length && g !== 0) el.classList.add(g > 0 ? 'tsg-good' : 'tsg-bad');
  });
  T.draw('subhist', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    const rows = T.subs().buckets.map((b) => ({season: b.season, parts: {[T.mixId()]: b.n}, total: b.n}));
    T.columns(el, rows, [T.mixId()], (r) => [tipLine(null, T.fmt('int', r.total) + ' Einwechslungen')], {height: 200, label: 'Einwechslungen nach Minute', tipPrefix: 'Minute '});
  });
  T.draw('statetabelle', (el) => {
    el.replaceChildren();
    if (!T.ok('spielerspiele', 'spiele')) return;
    const kind = document.getElementById('state-kind')?.value || 'in';
    T.fillTable(el, kind === 'in' ? T.subs().inStates : T.subs().outStates);
  });
  T.draw('mitohnetabelle', (el) => {
    el.replaceChildren();
    if (!T.ok('spielerspiele', 'spiele')) return;
    T.fillTable(el, T.players().filter((p) => p.matches >= T.st.minGames && p.ppgWithout !== null));
  });

  // ---------- Kader ----------
  T.draw('kaderlegend', (el) => {
    el.replaceChildren();
    const v = document.getElementById('kader-view')?.value || 'stamm';
    const items = v === 'stamm' ? [['stamm', 'Stamm (ab 10 Einsätzen)'], ['erg', 'Ergänzung']] : [['neu', 'Neue Spieler (nach oben)'], ['ab', 'Abgänge (nach unten)']];
    for (const [id, t] of items) el.append(h('span', null, T.sw(id), t));
  });
  T.draw('kaderchart', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    const v = document.getElementById('kader-view')?.value || 'stamm';
    const k = T.kader(), f = (x) => T.fmt('int', x);
    if (v === 'stamm') {
      T.columns(el, k.map((r) => ({season: r.season, parts: {stamm: r.stamm, erg: r.ergaenzung}, total: r.players, raw: r})), ['stamm', 'erg'],
        (r) => [tipLine('stamm', 'Stamm: ' + f(r.raw.stamm)), tipLine('erg', 'Ergänzung: ' + f(r.raw.ergaenzung)), tipLine(null, 'Eingesetzt: ' + f(r.raw.players))], {label: 'Kader'});
    } else {
      T.columns(el, k.map((r) => ({season: r.season, parts: {neu: r.neu || 0, ab: r.abgaenge || 0}, total: r.neu ?? 0, raw: r})), ['neu', 'ab'],
        (r) => [tipLine('neu', 'Neue Spieler: ' + T.fmt('int', r.raw.neu)), tipLine('ab', 'Abgänge: ' + T.fmt('int', r.raw.abgaenge)), tipLine(null, 'Eingesetzt: ' + f(r.raw.players))],
        {neg: ['ab'], noLabels: true, label: 'Zugänge und Abgänge'});
    }
  });
  T.draw('durchchart', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    T.columns(el, T.both().seasons.map((r) => ({season: r.season, parts: {mix: r.both, up: r.up}, total: r.both + r.up, raw: r})), ['mix', 'up'],
      (r) => [tipLine('mix', 'In beiden Teams: ' + T.fmt('int', r.raw.both)), tipLine('up', 'Erstmals in der 1., vorher II: ' + T.fmt('int', r.raw.up))], {noLabels: true, label: 'Durchlässigkeit'});
  });
  T.draw('beidetabelle', (el) => {
    el.replaceChildren();
    if (T.ok('spielerspiele', 'spiele')) T.fillTable(el, T.both().players);
  });

  // ---------- Mannschaft ----------
  T.draw('bkpi', (el) => {
    if (!T.ok('tabellen')) { el.textContent = '—'; return; }
    el.classList.remove('dash-skeleton');
    const rows = T.tab(), s = (f) => T.sum(rows, f), m = s('matches'), latest = T.latestTabYear();
    const titles = rows.filter((t) => Number(t.rank) === 1 && t.seasonYear !== latest);
    const text = {matches: T.fmt('int', m), seasons: `in ${rows.length} Saisonwertungen`, sun: `${T.fmt('int', s('wins'))} · ${T.fmt('int', s('draws'))} · ${T.fmt('int', s('defeats'))}`,
      winRate: 'Siegquote ' + T.fmt('pct', T.q(s('wins'), m, 3)), ppg: T.fmt('d2', T.q(s('points'), m)), points: T.fmt('int', s('points')) + ' Punkte',
      goals: `${T.fmt('int', s('goalsFor'))} : ${T.fmt('int', s('goalsAgainst'))}`, gpg: `Ø ${T.fmt('d2', T.q(s('goalsFor'), m))} Tore pro Spiel`,
      titles: T.fmt('int', titles.length), avgRank: (titles.length ? titles.map((t) => t.season + ' ' + T.label[t.teamId]).join(', ') + ' · ' : '') + 'Ø Platz ' + T.fmt('d1', T.q(s('rank'), rows.length, 1))}[el.dataset.k];
    el.textContent = text ?? '—';
  });
  T.draw('platzchart', (el) => {
    if (!T.ready(el, ['tabellen'])) return;
    el.replaceChildren();
    const all = T.tab();
    if (!all.length) { el.append(h('div', {class: 'tsg-fail tsg-empty', text: 'Keine Tabellen in dieser Auswahl.'})); return; }
    const years = [...new Set(all.map((t) => t.seasonYear))].sort((a, b) => a - b);
    const W = Math.max(260, el.clientWidth), H = 260, mt = 14, mb = 26, ml = 30, mr = 10;
    const maxRank = d3.max(all, (t) => t.teams) || 16;
    const x = d3.scalePoint(years, [ml + 8, W - mr - 8]), y = d3.scaleLinear([1, maxRank], [mt, H - mb]);
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Platzierungen');
    const ticks = [1, 5, 10, 15].filter((t) => t <= maxRank);
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', ml).attr('x2', W - mr).attr('y1', (t) => y(t)).attr('y2', (t) => y(t)).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'tsg-tick').attr('x', ml - 6).attr('y', (t) => y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').text((t) => t + '.');
    const step = years.length > 1 ? x.step() : W - ml - mr;
    const every = Math.max(1, Math.ceil(40 / step));
    svg.append('g').selectAll('text').data(years.filter((yy, i) => (years.length - 1 - i) % every === 0)).join('text').attr('class', 'tsg-tick')
      .attr('x', (yy) => x(yy)).attr('y', H - mb + 16).attr('text-anchor', 'middle').text((yy) => T.seasonLabel(yy));
    for (const id of T.ids()) {
      const rows = all.filter((t) => t.teamId === id).sort((a, b) => a.seasonYear - b.seasonYear);
      const segs = [];
      let cur = [];
      for (const r of rows) { if (cur.length && r.seasonYear !== cur[cur.length - 1].seasonYear + 1) { segs.push(cur); cur = []; } cur.push(r); }
      if (cur.length) segs.push(cur);
      for (const sg of segs) svg.append('path').datum(sg).attr('fill', 'none').attr('stroke', T.color(id)).attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
        .attr('d', d3.line().x((r) => x(r.seasonYear)).y((r) => y(r.rank)));
      svg.append('g').selectAll('circle').data(rows).join('circle').attr('cx', (r) => x(r.seasonYear)).attr('cy', (r) => y(r.rank)).attr('r', (r) => (r.rank === 1 ? 5 : 3))
        .attr('fill', T.color(id)).attr('stroke', 'var(--color-panel)').attr('stroke-width', 1);
    }
    const tip = tipBox(el);
    svg.append('g').selectAll('rect').data(years).join('rect').attr('x', (yy) => x(yy) - step / 2).attr('width', step).attr('y', mt).attr('height', H - mb - mt).attr('fill', 'transparent')
      .on('pointerenter pointermove', (ev, yy) => tip.show(ev, 'Saison ' + T.seasonLabel(yy), all.filter((t) => t.seasonYear === yy).map((t) =>
        tipLine(t.teamId, `${T.label[t.teamId]}: Platz ${t.rank} von ${t.teams} · ${t.wins}-${t.draws}-${t.defeats} · ${t.points} Pkt.`))))
      .on('pointerleave', () => tip.hide());
  });
  T.draw('tabellentabelle', (el) => { el.replaceChildren(); if (T.ok('tabellen')) T.fillTable(el, T.tab(), ['season', 'teamId']); });
  const record = (g) => {
    const c = (r) => g.filter((s) => s.result === r).length;
    return {matches: g.length, wins: c('S'), draws: c('U'), defeats: c('N'), goalsFor: T.sum(g, 'goalsFor'), goalsAgainst: T.sum(g, 'goalsAgainst'), ppg: T.q(3 * c('S') + c('U'), g.length)};
  };
  T.draw('heimtabelle', (el) => {
    el.replaceChildren();
    if (!T.ok('spiele')) return;
    T.fillTable(el, ['Heim', 'Auswärts'].map((v) => ({venue: v, ...record(T.tm().filter((s) => s.venue === v))})));
  });
  T.draw('spielliste', (el) => {
    if (!T.ready(el, ['spiele'])) return;
    el.replaceChildren();
    const kind = el.dataset.kind;
    const all_rows = T.tm().filter((s) => s.result === kind)
      .sort((a, b) => Math.abs(b.goalsFor - b.goalsAgainst) - Math.abs(a.goalsFor - a.goalsAgainst) || (kind === 'S' ? b.goalsFor - a.goalsFor : b.goalsAgainst - a.goalsAgainst) || b.date.localeCompare(a.date));
    const rows = T.cut(el, all_rows, 8);
    if (!rows.length) { empty(el, 'Keine Spiele in dieser Auswahl.'); return; }
    for (const s of rows) el.append(h('li', null, h('span', {class: 'tsg-score ' + (kind === 'S' ? 'tsg-good' : 'tsg-bad'), text: s.goalsFor + ':' + s.goalsAgainst}),
      h('span', {class: 'tsg-pname', text: (s.venue === 'Heim' ? 'gegen ' : 'bei ') + s.opponent}),
      h('span', {class: 'tsg-rank', text: s.date.slice(8, 10) + '.' + s.date.slice(5, 7) + '.' + s.date.slice(2, 4)}),
      h('span', {class: 'tsg-meta', text: T.label[s.teamId] + ' · Saison ' + s.season})));
    T.more(el, all_rows.length, 8);
  });
  T.draw('gegnertabelle', (el) => {
    el.replaceChildren();
    if (!T.ok('spiele')) return;
    const q = T.st.oppQuery;
    const by = d3.group(T.tm(), (s) => s.opponent);
    T.fillTable(el, [...by].filter(([o]) => !q || o.toLowerCase().includes(q)).map(([opponent, g]) => ({opponent, ...record(g)})));
  });

  // ---------- Rekorde ----------
  T.draw('bestseason', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    el.replaceChildren();
    const sel = document.getElementById('best-metric'), o = optOf(sel);
    if (!o) return;
    const f = sel.value, low = o.dataset.low === '1', rate = o.dataset.rate === '1', kind = o.dataset.fmt || 'int', signed = isSigned(kind);
    const all_rows = T.playerSeasons().filter((r) => r[f] !== null && r[f] !== undefined && (rate ? r.matches >= 10 : signed || r[f] > 0))
      .sort((a, b) => (low ? a[f] - b[f] : b[f] - a[f]) || b.matches - a.matches);
    const rows = T.cut(el, all_rows, 10);
    if (!rows.length) { empty(el, 'Keine Daten in dieser Auswahl.'); return; }
    const max = d3.max(rows, (r) => Math.abs(r[f])) || 1;
    let rank = 0;
    rows.forEach((r, i) => {
      if (i === 0 || r[f] !== rows[i - 1][f]) rank = i + 1;
      el.append(h('li', {'data-name': r.name}, h('span', {class: 'tsg-rank', text: rank + '.'}), h('span', {class: 'tsg-pname', text: r.name}),
        h('span', {class: 'tsg-pval', text: T.fmt(kind, r[f])}),
        h('span', {class: 'tsg-track'}, h('i', {style: {width: (100 * Math.abs(r[f]) / max) + '%', background: T.color(r.teamId)}})),
        h('span', {class: 'tsg-psplit', text: `Saison ${r.season} · ${r.team} · ${T.fmt('int', r.matches)} Einsätze`})));
    });
    T.more(el, all_rows.length, 10);
  });
  // ---------- Meilensteine ----------
  const MS = {
    matches: {marks: [25, 50, 100, 150, 200, 250, 300, 400, 500], one: 'Einsatz', many: 'Einsätze', val: () => 1},
    goals: {marks: [10, 25, 50, 75, 100, 150, 200, 250], one: 'Tor', many: 'Tore', val: (r) => r.goals},
    assists: {marks: [10, 25, 50, 75, 100, 150], one: 'Vorlage', many: 'Vorlagen', val: (r) => r.assists},
    points: {marks: [25, 50, 100, 150, 200, 250, 300], one: 'Scorerpunkt', many: 'Scorerpunkte', val: (r) => r.goals + r.assists},
    minutes: {marks: [1000, 2500, 5000, 7500, 10000, 12500, 15000, 20000, 25000, 30000, 40000], one: 'Spielminute', many: 'Spielminuten', val: (r) => r.minutes},
  };
  const msLabel = (cat, mark) => (cat === 'minutes' ? `${T.fmt('int', mark)} Spielminuten` : `${T.fmt('int', mark)}. ${MS[cat].one}`);
  const ddmmyy = (d) => d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(2, 4);
  T.milestones = () => T.memo('ms', () => {
    const rows = T.pmTeams().slice().sort((a, b) => a.date.localeCompare(b.date) || a.matchId - b.matchId);
    const latest = d3.max(rows, (r) => r.seasonYear);
    const reached = [], tot = new Map(), hist = new Map(), active = new Set();
    for (const r of rows) {
      if (!tot.has(r.name)) { tot.set(r.name, Object.fromEntries(Object.keys(MS).map((c) => [c, 0]))); hist.set(r.name, []); }
      const t = tot.get(r.name);
      for (const [c, m] of Object.entries(MS)) {
        const before = t[c];
        t[c] += m.val(r);
        for (const mark of m.marks) if (before < mark && t[c] >= mark) reached.push({name: r.name, cat: c, mark, date: r.date, matchId: r.matchId, teamId: r.teamId});
      }
      hist.get(r.name).push(r);
      if (r.seasonYear === latest) active.add(r.name);
    }
    const next = [];
    for (const name of active) {
      const t = tot.get(name), last = hist.get(name).slice(-20);
      for (const [c, m] of Object.entries(MS)) {
        const mark = m.marks.find((x) => x > t[c]);
        if (mark === undefined) continue;
        const rate = last.reduce((a, r) => a + m.val(r), 0) / last.length;
        if (!(rate > 0)) continue;
        const games = Math.ceil((mark - t[c]) / rate);
        next.push({name, cat: c, mark, now: t[c], to: mark - t[c], games});
      }
    }
    reached.sort((a, b) => b.date.localeCompare(a.date) || b.mark - a.mark);
    next.sort((a, b) => a.games - b.games || a.to / a.mark - b.to / b.mark);
    return {reached, next};
  });
  const msCat = () => document.getElementById('ms-cat')?.value || 'all';
  T.draw('msrecent', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    el.replaceChildren();
    const c = msCat(), mm = T.matchMap();
    const all_rows = T.milestones().reached.filter((x) => c === 'all' || x.cat === c);
    const rows = T.cut(el, all_rows, 10);
    if (!rows.length) { empty(el, 'Noch keine Meilensteine in dieser Auswahl.'); return; }
    for (const x of rows) {
      const s = mm.get(x.matchId);
      el.append(h('li', {'data-name': x.name}, h('span', {class: 'tsg-rank', text: ddmmyy(x.date)}), h('span', {class: 'tsg-pname', text: x.name}),
        h('span', {class: 'tsg-pval', text: msLabel(x.cat, x.mark)}),
        h('span', {class: 'tsg-psplit', text: (s ? (s.venue === 'Heim' ? 'gegen ' : 'bei ') + s.opponent + ' · ' : '') + T.label[x.teamId] + ' · Saison ' + (s ? s.season : '')})));
    }
    T.more(el, all_rows.length, 10);
  });
  T.draw('msnext', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    el.replaceChildren();
    const c = msCat();
    const all_rows = T.milestones().next.filter((x) => c === 'all' || x.cat === c);
    const rows = T.cut(el, all_rows, 10);
    if (!rows.length) { empty(el, 'Kein aktiver Spieler in der Auswahl.'); return; }
    for (const x of rows) {
      const unit = x.to === 1 ? MS[x.cat].one : MS[x.cat].many;
      el.append(h('li', {'data-name': x.name}, h('span', {class: 'tsg-rank', text: x.games === 1 ? '1 Sp.' : '~' + x.games + ' Sp.'}), h('span', {class: 'tsg-pname', text: x.name}),
        h('span', {class: 'tsg-pval', text: msLabel(x.cat, x.mark)}),
        h('span', {class: 'tsg-track'}, h('i', {style: {width: (100 * x.now / x.mark) + '%', background: T.color(T.mixId())}})),
        h('span', {class: 'tsg-psplit', text: `noch ${T.fmt('int', x.to)} ${unit} · voraussichtlich ${x.games === 1 ? 'im nächsten Spiel' : 'in etwa ' + x.games + ' Spielen'}`})));
    }
    T.more(el, all_rows.length, 10);
  });
  T.draw('tjchart', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    const sel = document.getElementById('tj-metric'), f = sel?.value || 'top3Share', kind = optOf(sel)?.dataset.fmt || 'pct', label = optOf(sel)?.textContent || '';
    const by = d3.rollup(T.pm(), (v) => d3.rollup(v, (w) => T.sum(w, 'goals'), (r) => r.name), (r) => r.seasonYear);
    const rows = [...by].sort((a, b) => a[0] - b[0]).map(([y, m]) => {
      const g = [...m].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      const total = g.reduce((a, [, v]) => a + v, 0);
      if (!total) return null;
      const top3 = g.slice(0, 3).reduce((a, [, v]) => a + v, 0);
      const raw = {teamGoals: total, top3Goals: top3, top3Share: top3 / total, topShare: g[0][1] / total, scorers: g.length, top: g.filter(([, v]) => v === g[0][1]).map(([n]) => n).join(', '), topGoals: g[0][1]};
      return {season: T.seasonLabel(y), parts: {[T.mixId()]: raw[f]}, total: raw[f], raw};
    }).filter(Boolean);
    T.columns(el, rows, [T.mixId()], (r) => [tipLine(null, label + ': ' + T.fmt(kind, r.raw[f])),
      tipLine(null, `Tore gesamt ${T.fmt('int', r.raw.teamGoals)}, davon Top 3: ${T.fmt('int', r.raw.top3Goals)}`),
      tipLine(null, `Bester Torschütze: ${r.raw.top} (${T.fmt('int', r.raw.topGoals)})`), tipLine(null, `Verschiedene Torschützen: ${T.fmt('int', r.raw.scorers)}`)], {fmt: kind, label});
  });

  // ---------- Datenqualität ----------
  T.draw('abdeckung', (el) => {
    el.replaceChildren();
    if (!T.ok('spiele')) return;
    const by = d3.group(T.tm(), (s) => s.seasonYear + '|' + s.teamId);
    T.fillTable(el, [...by.values()].map((g) => {
      const full = g.filter((s) => s.starters >= 11).length;
      return {season: g[0].season, team: T.label[g[0].teamId], games: g.length, full, partial: g.filter((s) => s.starters > 0 && s.starters < 11).length,
        none: g.filter((s) => s.starters === 0).length, goalsOk: g.filter((s) => s.goalMinutes === 'complete' || s.goalsFor + s.goalsAgainst === 0).length, share: T.q(full, g.length, 3)};
    }));
  });
  T.draw('fehlliste', (el) => {
    if (!T.ready(el, ['spiele'])) return;
    el.replaceChildren();
    const k = document.getElementById('missing-kind')?.value || 'lineup';
    const test = {lineup: (s) => s.starters === 0, partial: (s) => s.starters > 0 && s.starters < 11, goals: (s) => s.goalMinutes !== 'complete' && s.goalsFor + s.goalsAgainst > 0}[k];
    const rows = T.tm().filter(test).sort((a, b) => b.date.localeCompare(a.date));
    if (!rows.length) { empty(el, 'Nichts offen in dieser Auswahl.'); return; }
    empty(el, `${T.fmt('int', rows.length)} Spiele, neueste zuerst. Klick öffnet das Spiel auf FuPa.`);
    for (const s of rows) {
      const a = h('a', {href: 'https://www.fupa.net/match/' + s.slug, target: '_blank', rel: 'noopener', text: (s.venue === 'Heim' ? 'gegen ' : 'bei ') + s.opponent});
      const info = k === 'partial' ? ` · ${s.starters} in der Startelf eingetragen` : '';
      el.append(h('li', null, h('span', {class: 'tsg-score', text: s.goalsFor + ':' + s.goalsAgainst}), h('span', {class: 'tsg-pname'}, a),
        h('span', {class: 'tsg-rank', text: s.date.slice(8, 10) + '.' + s.date.slice(5, 7) + '.' + s.date.slice(2, 4)}),
        h('span', {class: 'tsg-meta', text: T.label[s.teamId] + ' · Saison ' + s.season + info})));
    }
  });
  T.draw('abweichung', (el) => {
    el.replaceChildren();
    const none = $$('.tsg-abw-none');
    if (!T.ok('spielerspiele', 'saisons')) { none.forEach((n) => { n.hidden = true; }); return; }
    const mine = new Map();
    for (const r of T.pm()) {
      const k = r.name + '|' + r.season + '|' + r.teamId;
      const o = mine.get(k) || {mA: 0, gA: 0, minA: 0};
      o.mA += 1; o.gA += r.goals; o.minA += r.minutes; mine.set(k, o);
    }
    const fupa = new Map();
    for (const r of dash.data('saisons').data) {
      const teamId = r.team === '1. Mannschaft' ? 'm1' : 'ii';
      const y = 2000 + Number(String(r.season).slice(0, 2));
      if (!T.st.sel.has(teamId) || !T.inRange({seasonYear: y}) || !(Number(r.matches) > 0)) continue;
      const k = r.name + '|' + r.season + '|' + teamId;
      const o = fupa.get(k) || {mF: 0, gF: 0, minF: 0};
      o.mF += Number(r.matches) || 0; o.gF += Number(r.goals) || 0; o.minF += Number(r.minutes) || 0; fupa.set(k, o);
    }
    const rows = [];
    for (const k of new Set([...mine.keys(), ...fupa.keys()])) {
      const a = mine.get(k) || {mA: 0, gA: 0, minA: 0}, b = fupa.get(k) || {mF: 0, gF: 0, minF: 0};
      if (a.mA === b.mF && a.gA === b.gF && a.minA === b.minF) continue;
      const [name, season, teamId] = k.split('|');
      rows.push({name, season, team: T.label[teamId], ...a, ...b});
    }
    T.fillTable(el, rows);
    none.forEach((n) => { n.hidden = rows.length > 0; });
  });

  // ---------- Spieler-Bilanz ----------
  T.bilanz = (name) => T.memo('bil|' + name, () => {
    const bym = T.memo('bym', () => d3.group(T.pm(), (r) => r.matchId));
    const mm = T.matchMap();
    const mates = new Map(), pairs = new Map(), opp = new Map();
    const mate = (n) => { if (!mates.has(n)) mates.set(n, {name: n, games: 0, wins: 0, draws: 0, defeats: 0, pts: 0, bothScored: 0}); return mates.get(n); };
    const pair = (n) => { if (!pairs.has(n)) pairs.set(n, {name: n, gaveSure: 0, gotSure: 0, gavePossible: 0, gotPossible: 0}); return pairs.get(n); };
    const mine = new Map();
    for (const r of T.pm()) if (r.name === name && !mine.has(r.matchId)) mine.set(r.matchId, r);
    for (const me of mine.values()) {
      const s = mm.get(me.matchId);
      const rows = [...new Map((bym.get(me.matchId) || []).map((r) => [r.name, r])).values()];
      const others = rows.filter((r) => r.name !== name);
      for (const o of others) {
        const m = mate(o.name);
        m.games += 1; m.pts += me.points;
        if (me.points === 3) m.wins += 1; else if (me.points === 1) m.draws += 1; else m.defeats += 1;
        if (me.goals > 0 && o.goals > 0) m.bothScored += 1;
      }
      if (me.assists > 0) {
        const sc = others.filter((r) => r.goals > 0);
        if (sc.length === 1 && sc[0].goals >= me.assists) pair(sc[0].name).gaveSure += me.assists;
        for (const r of sc) pair(r.name).gavePossible += 1;
      }
      for (const o of others.filter((r) => r.assists > 0)) {
        const sc = rows.filter((r) => r.name !== o.name && r.goals > 0);
        if (sc.length === 1 && sc[0].name === name && me.goals >= o.assists) pair(o.name).gotSure += o.assists;
        if (me.goals > 0) pair(o.name).gotPossible += 1;
      }
      if (s) {
        if (!opp.has(s.opponent)) opp.set(s.opponent, {opponent: s.opponent, matches: 0, wins: 0, draws: 0, defeats: 0, pts: 0, goals: 0, assists: 0});
        const o = opp.get(s.opponent);
        o.matches += 1; o.pts += me.points; o.goals += me.goals; o.assists += me.assists;
        if (me.points === 3) o.wins += 1; else if (me.points === 1) o.draws += 1; else o.defeats += 1;
      }
    }
    return {
      mates: [...mates.values()].map((m) => ({...m, ppg: T.q(m.pts, m.games), winRate: T.q(m.wins, m.games, 3)})),
      pairs: [...pairs.values()],
      opp: [...opp.values()].map((o) => ({...o, ppg: T.q(o.pts, o.matches), goalsPerGame: T.q(o.goals, o.matches)})),
    };
  });
  T.draw('bilanzkurz', (el) => {
    el.replaceChildren();
    const p = T.ok('spielerspiele', 'spiele') ? T.cur() : null;
    if (!p) { el.textContent = '—'; return; }
    const b = T.bilanz(p.name);
    const bits = [];
    const most = b.mates.slice().sort((x, y) => y.games - x.games)[0];
    if (most) bits.push(['Häufigster Mitspieler: ', most.name, ` (${T.fmt('int', most.games)} Spiele zusammen)`]);
    const best = b.mates.filter((m) => m.games >= 5).sort((x, y) => y.ppg - x.ppg || y.games - x.games)[0];
    if (best) bits.push(['Bester Partner (ab 5 Spielen): ', best.name, ` (${T.fmt('d2', best.ppg)} Punkte pro Spiel)`]);
    const fav = b.opp.filter((o) => o.goals > 0).sort((x, y) => y.goals - x.goals || x.matches - y.matches)[0];
    if (fav) bits.push(['Lieblingsgegner: ', fav.opponent, ` (${T.fmt('int', fav.goals)} ${fav.goals === 1 ? 'Tor' : 'Tore'} in ${T.fmt('int', fav.matches)} Spielen)`]);
    const vp = b.pairs.filter((x) => x.gaveSure + x.gotSure > 0).sort((x, y) => (y.gaveSure + y.gotSure) - (x.gaveSure + x.gotSure))[0];
    if (vp) bits.push(['Sicheres Vorlagen-Duo: ', vp.name, ` (${T.fmt('int', vp.gaveSure)} vorgelegt, ${T.fmt('int', vp.gotSure)} bekommen)`]);
    if (!bits.length) { el.textContent = 'Noch keine Bilanz in dieser Auswahl.'; return; }
    bits.forEach(([a, n, c], i) => { if (i) el.append(' · '); el.append(a, h('b', {text: n}), c); });
  });
  T.draw('mittabelle', (el) => { el.replaceChildren(); const p = T.ok('spielerspiele', 'spiele') ? T.cur() : null; if (p) T.fillTable(el, T.bilanz(p.name).mates); });
  T.draw('vorltabelle', (el) => { el.replaceChildren(); const p = T.ok('spielerspiele', 'spiele') ? T.cur() : null; if (p) T.fillTable(el, T.bilanz(p.name).pairs); });
  T.draw('pgegtabelle', (el) => { el.replaceChildren(); const p = T.ok('spielerspiele', 'spiele') ? T.cur() : null; if (p) T.fillTable(el, T.bilanz(p.name).opp); });

  // ---------- Erste Male und Rückblick ----------
  const byDate = (a, b) => a.date.localeCompare(b.date) || a.matchId - b.matchId;
  T.firsts = () => T.memo('firsts', () => {
    const seen = new Map(), ev = [];
    for (const r of T.pmTeams().slice().sort(byDate)) {
      if (!seen.has(r.name)) seen.set(r.name, new Set());
      const s = seen.get(r.name);
      const push = (k, text) => { if (!s.has(k)) { s.add(k); ev.push({date: r.date, matchId: r.matchId, teamId: r.teamId, name: r.name, kind: k, text, row: r}); } };
      const debut = !s.has('debut');
      if (debut) {
        push('debut', r.start ? 'Debüt in der Startelf' : 'Debüt (eingewechselt)');
        if (r.start) s.add('start');
        if (r.full) s.add('full');
      } else if (!s.has('team-' + r.teamId)) push('team-' + r.teamId, 'erstes Spiel für die ' + T.label[r.teamId]);
      s.add('team-' + r.teamId);
      if (r.start) push('start', 'erstmals in der Startelf');
      if (r.full) push('full', 'erstmals 90 Minuten');
      if (r.goals >= 3) { push('hattrick', 'erster Hattrick'); s.add('brace'); }
      if (r.goals >= 2) push('brace', 'erster Doppelpack');
      if (r.goals >= 1) push('goal', debut ? 'Tor beim Debüt' : 'erstes Tor');
      if (r.assists >= 1) push('assist', 'erste Vorlage');
      if (r.red + r.yellowRed > 0) push('red', 'erster Platzverweis');
    }
    return ev;
  });
  const addDays = (iso, d) => { const x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
  const wd = (iso) => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(iso + 'T12:00:00Z').getUTCDay()];
  T.rueckblick = () => {
    const pm = T.pmTeams();
    if (!pm.length) return null;
    const latest = d3.max(pm, (r) => r.date);
    const v = document.getElementById('rb-range')?.value || '7';
    let matches = [...T.matchMap().values()].filter((s) => s.category === 'league' && T.st.sel.has(s.teamId) && s.players > 0);
    if (v === 'last') {
      const lastPerTeam = d3.rollup(matches.filter((s) => s.date <= latest), (g) => d3.max(g, (s) => s.date), (s) => s.teamId);
      matches = matches.filter((s) => lastPerTeam.get(s.teamId) === s.date);
    } else {
      const from = addDays(latest, -Number(v) + 1);
      matches = matches.filter((s) => s.date >= from && s.date <= latest);
    }
    matches.sort((a, b) => b.date.localeCompare(a.date) || a.teamId.localeCompare(b.teamId));
    const ids = new Set(matches.map((s) => s.matchId));
    const firsts = T.firsts().filter((e) => ids.has(e.matchId));
    const ms = T.milestones().reached.filter((e) => ids.has(e.matchId));
    return {matches, firsts, ms, from: matches.length ? matches[matches.length - 1].date : latest, to: latest};
  };
  T.draw('rbsum', (el) => {
    el.replaceChildren();
    if (!T.ok('spielerspiele', 'spiele')) { el.textContent = '—'; return; }
    const r = T.rueckblick();
    if (!r || !r.matches.length) { el.textContent = 'Keine Spiele in diesem Zeitraum.'; return; }
    const c = (k) => r.firsts.filter((e) => e.kind === k).length;
    const bits = [[r.matches.length, r.matches.length === 1 ? 'Spiel' : 'Spiele'], [c('debut'), c('debut') === 1 ? 'Debüt' : 'Debüts'],
      [c('goal'), c('goal') === 1 ? 'erstes Tor' : 'erste Tore'], [c('assist'), c('assist') === 1 ? 'erste Vorlage' : 'erste Vorlagen'],
      [r.ms.length, r.ms.length === 1 ? 'Meilenstein' : 'Meilensteine']].filter(([n]) => n > 0);
    el.append(r.from === r.to ? `Am ${ddmmyy(r.to)}: ` : `${ddmmyy(r.from)} bis ${ddmmyy(r.to)}: `);
    bits.forEach(([n, w], i) => { if (i) el.append(' · '); el.append(h('b', {text: String(n)}), ' ' + w); });
  });
  T.draw('rueckblick', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    el.replaceChildren();
    const r = T.rueckblick();
    if (!r || !r.matches.length) { el.append(h('p', {class: 'tsg-note', text: 'Keine Spiele in diesem Zeitraum.'})); return; }
    const pm = T.pmTeams();
    for (const s of r.matches) {
      const rows = pm.filter((x) => x.matchId === s.matchId);
      const scorers = rows.filter((x) => x.goals > 0).sort((a, b) => b.goals - a.goals).map((x) => x.name + (x.goals > 1 ? ' ' + x.goals : ''));
      const assists = rows.filter((x) => x.assists > 0).map((x) => x.name + (x.assists > 1 ? ' ' + x.assists : ''));
      const evs = [...r.firsts.filter((e) => e.matchId === s.matchId).map((e) => ({name: e.name, text: e.text, ms: false})),
        ...r.ms.filter((e) => e.matchId === s.matchId).map((e) => ({name: e.name, text: msLabel(e.cat, e.mark), ms: true}))];
      const box = h('div', {class: 'tsg-rb-match'},
        h('div', {class: 'tsg-rb-head'}, h('span', {class: 'tsg-score ' + (s.result === 'S' ? 'tsg-good' : s.result === 'N' ? 'tsg-bad' : ''), text: s.goalsFor + ':' + s.goalsAgainst}),
          h('span', {text: (s.venue === 'Heim' ? 'gegen ' : 'bei ') + s.opponent}), h('span', {class: 'tsg-note', text: `${wd(s.date)}, ${ddmmyy(s.date)} · ${T.label[s.teamId]}`})),
        scorers.length || assists.length ? h('div', {class: 'tsg-rb-scorers', text: [scorers.length ? 'Tore: ' + scorers.join(', ') : '', assists.length ? 'Vorlagen: ' + assists.join(', ') : ''].filter(Boolean).join(' · ')}) : null,
        evs.length ? h('ul', {class: 'tsg-rb-events'}, evs.map((e) => h('li', {'data-name': e.name, class: e.ms ? 'tsg-rb-ms' : null}, h('b', {text: e.name}), ': ' + e.text)))
          : h('div', {class: 'tsg-rb-scorers', text: s.players < 9 ? 'Aufstellung bei FuPa noch unvollständig.' : 'Keine ersten Male oder Meilensteine.'}));
      el.append(box);
    }
  });

  // ---------- Fakten ----------
  T.facts = () => T.memo('facts', () => {
    const ps = T.players();
    const seqs = d3.group(T.pm().slice().sort(byDate), (r) => r.name);
    const run = (rows, test) => {
      let best = 0, cur = 0, bestEnd = null;
      rows.forEach((r, i) => { cur = test(r) ? cur + 1 : 0; if (cur > best) { best = cur; bestEnd = i; } });
      return {best, ongoing: cur > 0 && cur === best, from: best ? rows[bestEnd - best + 1].date : null, to: best ? rows[bestEnd].date : null};
    };
    const span = (x) => (x.from === x.to ? ddmmyy(x.from) : ddmmyy(x.from) + ' – ' + ddmmyy(x.to)) + (x.ongoing ? ' · läuft noch' : '');
    const out = {};
    const noGoal = ps.filter((p) => p.goals === 0);
    out.noGoal = {sum: `${noGoal.length} von ${ps.length} Spielern ohne Ligator`, rows: noGoal.sort((a, b) => b.matches - a.matches).map((p) => ({name: p.name, val: p.matches + ' Sp.', sub: p.span}))};
    const noCard = ps.filter((p) => p.cards === 0);
    out.noCard = {sum: `${noCard.length} von ${ps.length} Spielern ohne Karte`, rows: noCard.sort((a, b) => b.matches - a.matches).map((p) => ({name: p.name, val: p.matches + ' Sp.', sub: p.span}))};
    const streak = (test, filter = () => true) => [...seqs].filter(([n]) => filter(n)).map(([name, rows]) => ({name, ...run(rows, test)})).filter((x) => x.best > 0).sort((a, b) => b.best - a.best || b.to.localeCompare(a.to));
    out.unbeaten = {rows: streak((r) => r.points >= 1).map((x) => ({name: x.name, val: x.best + ' Sp.', sub: span(x)}))};
    out.goalStreak = {rows: streak((r) => r.goals > 0).filter((x) => x.best >= 2).map((x) => ({name: x.name, val: x.best + ' Sp.', sub: span(x)}))};
    const scorers = new Set(ps.filter((p) => p.goals > 0).map((p) => p.name));
    out.drought = {rows: streak((r) => r.goals === 0, (n) => scorers.has(n)).map((x) => ({name: x.name, val: x.best + ' Sp.', sub: span(x)}))};
    // Spiele in Folge: Ligaspiele der Mannschaft mit Aufstellung
    const teamGames = d3.group(T.tm().filter((s) => s.players > 0).sort(byDate), (s) => s.teamId);
    const played = d3.rollup(T.pm(), (v) => new Set(v.map((r) => r.matchId)), (r) => r.name);
    const app = [];
    for (const [name, set] of played) {
      let best = {best: 0};
      for (const [teamId, games] of teamGames) {
        const x = run(games, (s) => set.has(s.matchId));
        if (x.best > best.best) best = {...x, teamId};
      }
      if (best.best > 0) app.push({name, ...best});
    }
    app.sort((a, b) => b.best - a.best || b.to.localeCompare(a.to));
    out.appStreak = {rows: app.map((x) => ({name: x.name, val: x.best + ' Sp.', sub: T.label[x.teamId] + ' · ' + span(x)}))};
    const jok = d3.rollup(T.pm().filter((r) => r.subIn && r.goals > 0), (v) => ({g: T.sum(v, 'goals'), n: v.length}), (r) => r.name);
    out.superSub = {sum: `${T.fmt('int', T.sum([...jok.values()], 'g'))} Tore nach Einwechslung`,
      rows: [...jok].sort((a, b) => b[1].g - a[1].g).map(([name, x]) => ({name, val: x.g + ' Tore', sub: `in ${x.n} Spielen als Joker getroffen`}))};
    const mul = d3.rollup(T.pm().filter((r) => r.goals >= 2), (v) => ({n: v.length, h: v.filter((r) => r.goals >= 3).length, max: d3.max(v, (r) => r.goals)}), (r) => r.name);
    out.multi = {sum: `${T.fmt('int', T.sum([...mul.values()], 'n'))} Spiele mit Doppelpack oder mehr`,
      rows: [...mul].sort((a, b) => b[1].n - a[1].n || b[1].max - a[1].max).map(([name, x]) => ({name, val: x.n + '×', sub: (x.h ? `davon ${x.h} Hattrick${x.h > 1 ? 's' : ''} · ` : '') + `Bestwert ${x.max} Tore`}))};
    const mm = T.matchMap();
    const deb = T.firsts().filter((e) => e.kind === 'debut' && e.row.goals > 0 && T.inSel(e.row)).sort((a, b) => b.date.localeCompare(a.date));
    out.debutGoal = {sum: `${deb.length} Spieler`, rows: deb.map((e) => { const s = mm.get(e.matchId); return {name: e.name, val: e.row.goals + (e.row.goals > 1 ? ' Tore' : ' Tor'), sub: ddmmyy(e.date) + (s ? ((s.venue === 'Heim' ? ' gegen ' : ' bei ') + s.opponent) : '') + ' · ' + T.label[e.teamId]}; })};
    const career = d3.rollup(T.pmTeams(), (v) => v, (r) => r.name);
    const once = [...career].filter(([, v]) => v.length === 1 && T.inSel(v[0])).map(([name, v]) => v[0]).sort((a, b) => b.date.localeCompare(a.date));
    out.oneTimers = {sum: `${once.length} Spieler mit genau einem Einsatz`, rows: once.map((r) => { const s = mm.get(r.matchId); return {name: r.name, val: r.minutes + ' Min.', sub: ddmmyy(r.date) + (s ? ((s.venue === 'Heim' ? ' gegen ' : ' bei ') + s.opponent + ' ' + s.goalsFor + ':' + s.goalsAgainst) : '') + ' · ' + T.label[r.teamId]}; })};
    return out;
  });
  T.draw('factsum', (el) => {
    if (!T.ok('spielerspiele', 'spiele')) { el.textContent = '—'; return; }
    const f = T.facts()[el.dataset.fact];
    el.textContent = f?.sum || '';
  });
  T.draw('fact', (el) => {
    if (!T.ready(el, ['spielerspiele', 'spiele'])) return;
    el.replaceChildren();
    const f = T.facts()[el.dataset.fact];
    const all_rows = (f?.rows || []);
    const rows = T.cut(el, all_rows, 5);
    if (!rows.length) { empty(el, 'Keine Einträge in dieser Auswahl.'); return; }
    rows.forEach((r, i) => el.append(h('li', {'data-name': r.name}, h('span', {class: 'tsg-rank', text: (i + 1) + '.'}), h('span', {class: 'tsg-pname', text: r.name}),
      h('span', {class: 'tsg-pval', text: r.val}), r.sub ? h('span', {class: 'tsg-psplit', text: r.sub}) : null)));
    T.more(el, all_rows.length, 5);
  });

  // Zeitraum-Auswahl je Karte (Saisons aus den Daten)
  dash.draw('cfrange', (sel) => {
    const ys = T.allYears();
    const card = sel.closest('[data-scope]');
    const cur = (card && T.scopes.get(card.id)?.range) || '';
    T.setOptions(sel, [['Zeitraum wie oben', ''], ['Alle Saisons', 'all'], ['Letzte 10 Saisons', 'last10'], ['Letzte 5 Saisons', 'last5'],
      ['Letzte 3 Saisons', 'last3'], ['Aktuelle Saison', 'last1'], ...ys.slice().reverse().map((y) => ['Nur ' + T.seasonLabel(y), 'y' + y])]);
    sel.value = cur;
  });

  // ---------- Alle Spiele eines Spielers ----------
  T.openGames = new Set();
  const GAMEFILTER = {all: () => true, scored: (r) => r.goals + r.assists > 0, start: (r) => r.start, full: (r) => r.full, sub: (r) => r.subIn,
    off: (r) => r.subOut, card: (r) => r.yellow + r.yellowRed + r.red > 0, S: (r, s) => s?.result === 'S', U: (r, s) => s?.result === 'U', N: (r, s) => s?.result === 'N'};
  T.playerGames = () => {
    const p = T.cur();
    if (!p) return [];
    const mm = T.matchMap();
    const f = GAMEFILTER[document.getElementById('games-filter')?.value || 'all'] || GAMEFILTER.all;
    return T.pm().filter((r) => r.name === p.name).map((r) => {
      const s = mm.get(r.matchId);
      const role = r.start ? (r.subOut ? `Startelf, raus ${r.minutes}.` : r.full ? 'Startelf, 90 Min.' : 'Startelf') : (r.subIn ? `eingewechselt${r.inMin !== null ? ' ' + r.inMin + '.' : ''}` : '');
      return {r, s, date: r.date, season: r.season, opponent: s ? (s.venue === 'Heim' ? '' : 'bei ') + s.opponent : '', score: s ? s.goalsFor + ':' + s.goalsAgainst : '–',
        result: s?.result, role, minutes: r.minutes, goals: r.goals, assists: r.assists, pm: r.gfOn !== null ? r.gfOn - r.gaOn : null, cards: r.yellow + r.yellowRed + r.red};
    }).filter((g) => f(g.r, g.s));
  };
  T.draw('gamessum', (el) => {
    el.replaceChildren();
    if (!T.ok('spielerspiele', 'spiele')) { el.textContent = '—'; return; }
    const g = T.playerGames();
    if (!g.length) { el.textContent = 'Keine Spiele in dieser Auswahl.'; return; }
    const c = (x) => g.filter((y) => y.result === x).length;
    el.append(h('b', {text: String(g.length)}), ` Spiele · ${c('S')} S, ${c('U')} U, ${c('N')} N · ${T.fmt('int', T.sum(g, 'minutes'))} Min. · ${T.sum(g, 'goals')} Tore · ${T.sum(g, 'assists')} Vorlagen`);
  });
  T.matchDetail = (matchId, me) => {
    const s = T.matchMap().get(matchId);
    const all = dash.data('spielerspiele').data.filter((r) => r.matchId === matchId);
    const goals = T.ok('tore') ? dash.data('tore').data.filter((t) => t.matchId === matchId).sort((a, b) => a.minute - b.minute) : [];
    const withMin = s && s.goalMinutes === 'complete';
    let f = 0, a = 0;
    const tl = h('ol');
    for (const t of goals) {
      if (t.side === 'F') f += 1; else a += 1;
      const who = t.side === 'F' ? (t.scorer || (t.kind === 'goal_own_goal' ? 'Eigentor Gegner' : 'TSGV')) : (s ? s.opponent : 'Gegner');
      const kind = t.kind === 'penalty_foul' || t.kind === 'penalty_hand' ? ' (Elfmeter)' : t.kind === 'goal_own_goal' ? ' (Eigentor)' : '';
      tl.append(h('li', {class: t.scorer === me ? 'tsg-me' : null}, (withMin ? Math.floor(t.minute) + '. ' : '') + f + ':' + a + ' ' + who + kind));
    }
    if (!goals.length) tl.append(h('li', {class: 'tsg-note', text: s && s.goalsFor + s.goalsAgainst === 0 ? 'Keine Tore.' : 'Keine Torereignisse bei FuPa.'}));
    const line = (r) => {
      const bits = [];
      if (r.goals) bits.push(r.goals > 1 ? r.goals + ' Tore' : 'Tor');
      if (r.assists) bits.push(r.assists > 1 ? r.assists + ' Vorl.' : 'Vorl.');
      if (r.yellow) bits.push('Gelb');
      if (r.yellowRed) bits.push('Gelb-Rot');
      if (r.red) bits.push('Rot');
      const when = r.start ? (r.subOut ? ` (raus ${r.minutes}.)` : '') : (r.inMin !== null ? ` (rein ${r.inMin}.)` : ' (eingewechselt)');
      return h('li', {class: r.name === me ? 'tsg-me' : null}, r.name + when + (bits.length ? ' · ' + bits.join(', ') : ''));
    };
    const starters = all.filter((r) => r.start), subs = all.filter((r) => !r.start).sort((x, y) => (x.inMin ?? 99) - (y.inMin ?? 99));
    return h('div', {class: 'tsg-gd'},
      h('div', {class: 'tsg-gd-grid'},
        h('div', null, h('h4', {text: 'Torverlauf'}), tl),
        h('div', null, h('h4', {text: `Startelf (${starters.length})`}), h('ul', null, starters.map(line))),
        h('div', null, h('h4', {text: `Eingewechselt (${subs.length})`}), h('ul', null, subs.length ? subs.map(line) : [h('li', {class: 'tsg-note', text: 'niemand eingetragen'})]))),
      s ? h('a', {href: 'https://www.fupa.net/match/' + s.slug, target: '_blank', rel: 'noopener', text: 'Spiel auf FuPa öffnen'}) : null);
  };
  T.draw('spieltabelle', (el) => {
    el.replaceChildren();
    if (!T.ok('spielerspiele', 'spiele')) return;
    const p = T.cur();
    const table = el.closest('table');
    const cols = [...table.querySelectorAll('thead th')].map((th) => ({f: th.dataset.field, fmt: th.dataset.fmt, left: th.classList.contains('tsg-l')}));
    for (const g of T.sortRows(table, T.playerGames())) {
      const open = T.openGames.has(g.r.matchId);
      const tr = h('tr', {class: 'tsg-gamerow', 'data-match': String(g.r.matchId), 'aria-expanded': String(open)});
      for (const c of cols) {
        const v = g[c.f];
        let txt = c.f === 'date' ? ddmmyy(v) : T.fmt(c.fmt, v);
        if (c.f === 'goals' || c.f === 'assists' || c.f === 'cards') txt = v ? String(v) : '';
        const td = h('td', {class: c.left ? 'tsg-l' : null, text: txt});
        if (c.f === 'score') td.className = g.result === 'S' ? 'tsg-good' : g.result === 'N' ? 'tsg-bad' : '';
        if (c.f === 'pm' && typeof v === 'number' && v !== 0) td.className = v > 0 ? 'tsg-good' : 'tsg-bad';
        if (c.f === 'opponent' && T.ids().length > 1) td.title = T.label[g.r.teamId];
        tr.append(td);
      }
      el.append(tr);
      if (open) el.append(h('tr', null, h('td', {class: 'tsg-gamedetail', colSpan: cols.length}, T.matchDetail(g.r.matchId, p?.name))));
    }
  });
  T.root.addEventListener('click', (e) => {
    const tr = e.target.closest('.tsg-gamesbody tr.tsg-gamerow');
    if (!tr) return;
    const id = Number(tr.dataset.match);
    if (T.openGames.has(id)) T.openGames.delete(id); else T.openGames.add(id);
    dash.draw('spieltabelle');
  });
  $$('#games-filter').forEach((x) => x.addEventListener('change', () => T.redraw(['gamessum', 'spieltabelle'])));

  // ---------- Duo-Vergleich ----------
  T.st.duo = {};
  const duoDefaults = () => {
    const ps = T.players().slice().sort((a, b) => b.matches - a.matches).map((p) => p.name);
    return {a1: ps[0], a2: ps[1], b1: ps[2], b2: ps[3]};
  };
  const duoPick = (slot) => {
    const names = new Set(T.players().map((p) => p.name));
    const v = T.st.duo[slot];
    return v && names.has(v) ? v : duoDefaults()[slot];
  };
  T.draw('duowahl', (sel) => {
    if (!T.ok('spielerspiele', 'spiele')) { T.setOptions(sel, []); return; }
    const names = T.players().map((p) => p.name).sort((a, b) => a.localeCompare(b, 'de'));
    T.setOptions(sel, names.map((n) => [n, n]));
    const v = duoPick(sel.dataset.slot);
    if (v) sel.value = v;
  });
  const duoChange = (e) => {
    const s = e.target.closest('.tsg-duo-sel');
    if (!s || T.st.duo[s.dataset.slot] === s.value) return;
    T.st.duo[s.dataset.slot] = s.value;
    T.redraw(['duoname', 'duotabelle']);
  };
  T.root.addEventListener('change', duoChange);
  T.root.addEventListener('input', duoChange);
  $$('.tsg-duo-sel').forEach((x) => { x.addEventListener('change', duoChange); x.addEventListener('input', duoChange); });
  T.draw('duoname', (el) => {
    const d = el.dataset.duo;
    const n1 = T.ok('spielerspiele', 'spiele') ? duoPick(d + '1') : null, n2 = n1 ? duoPick(d + '2') : null;
    el.textContent = n1 && n2 ? n1 + ' + ' + n2 : (d === 'a' ? 'Duo A' : 'Duo B');
  });
  T.goalsByMatch = () => T.memo('gbm', () => d3.group(T.ok('tore') ? dash.data('tore').data : [], (t) => t.matchId));
  T.duo = (n1, n2) => {
    const mm = T.matchMap(), gbm = T.goalsByMatch();
    const rowsOf = (n) => new Map(T.pm().filter((r) => r.name === n).map((r) => [r.matchId, r]));
    const A = rowsOf(n1), B = rowsOf(n2);
    const shared = [...A.keys()].filter((id) => B.has(id));
    const pts = (s) => (s.result === 'S' ? 3 : s.result === 'U' ? 1 : 0);
    const res = (ids) => {
      const g = ids.map((id) => mm.get(id)).filter(Boolean);
      const c = (r) => g.filter((s) => s.result === r).length;
      return {n: g.length, S: c('S'), U: c('U'), N: c('N'), ppg: g.length ? T.q(g.reduce((a, s) => a + pts(s), 0), g.length) : null,
        win: g.length ? T.q(c('S'), g.length, 3) : null, gf: T.sum(g, 'goalsFor'), ga: T.sum(g, 'goalsAgainst')};
    };
    const both = res(shared);
    let ovMin = 0, ovF = 0, ovA = 0, ovGames = 0;
    for (const id of shared) {
      const a = A.get(id), b = B.get(id), s = mm.get(id);
      if (!s || s.verdict || s.goalMinutes !== 'complete' || a.inMin === null || b.inMin === null) continue;
      const from = Math.max(a.inMin, b.inMin), to = Math.min(a.outMin, b.outMin);
      ovGames += 1;
      if (to <= from) continue;
      ovMin += to - from;
      for (const t of gbm.get(id) || []) if (t.minute > (from === 0 ? -1 : from) && t.minute <= to) { if (t.side === 'F') ovF += 1; else ovA += 1; }
    }
    const pairPts = shared.reduce((acc, id) => acc + A.get(id).goals + A.get(id).assists + B.get(id).goals + B.get(id).assists, 0);
    const only1 = res([...A.keys()].filter((id) => !B.has(id))), only2 = res([...B.keys()].filter((id) => !A.has(id)));
    return {n1, n2, both, gdpg: both.n ? T.q(both.gf - both.ga, both.n) : null, gfpg: both.n ? T.q(both.gf, both.n) : null, gapg: both.n ? T.q(both.ga, both.n) : null,
      pairPts, pairPtsPg: both.n ? T.q(pairPts, both.n) : null, ovMin, ovGames, ovPm: ovGames ? ovF - ovA : null, ovF, ovA,
      ovPm90: ovMin >= 90 ? T.q((ovF - ovA) * 90, ovMin) : null, only1, only2};
  };
  T.draw('duotabelle', (el) => {
    el.replaceChildren();
    if (!T.ok('spielerspiele', 'spiele')) return;
    const A = T.duo(duoPick('a1'), duoPick('a2')), B = T.duo(duoPick('b1'), duoPick('b2'));
    const rows = [
      ['group', 'Beide im Spiel'],
      ['Gemeinsame Spiele', (d) => d.both.n, 'int', 0],
      ['Siege · Unentschieden · Niederlagen', (d) => `${d.both.S} · ${d.both.U} · ${d.both.N}`, 'text', 0],
      ['Punkte pro Spiel', (d) => d.both.ppg, 'd2', 1],
      ['Siegquote', (d) => d.both.win, 'pct', 1],
      ['Tore : Gegentore pro Spiel', (d) => (d.both.n ? `${T.fmt('d2', d.gfpg)} : ${T.fmt('d2', d.gapg)}` : '–'), 'text', 0],
      ['Tordifferenz pro Spiel', (d) => d.gdpg, 'd2s', 1],
      ['Tore + Vorlagen des Duos', (d) => d.pairPts, 'int', 1],
      ['… pro gemeinsames Spiel', (d) => d.pairPtsPg, 'd2', 1],
      ['group', 'Gemeinsam auf dem Platz'],
      ['Minuten zusammen', (d) => d.ovMin, 'int', 0],
      ['Tore : Gegentore in dieser Zeit', (d) => (d.ovGames ? `${d.ovF} : ${d.ovA}` : '–'), 'text', 0],
      ['Plus/Minus pro 90 Minuten', (d) => d.ovPm90, 'd2s', 1],
      ['group', 'Nur einer dabei'],
      ['Punkte pro Spiel – nur erster Spieler', (d) => d.only1.ppg, 'd2', 0, (d) => `${d.n1}, ${d.only1.n} Sp.`],
      ['Punkte pro Spiel – nur zweiter Spieler', (d) => d.only2.ppg, 'd2', 0, (d) => `${d.n2}, ${d.only2.n} Sp.`],
    ];
    for (const r of rows) {
      if (r[0] === 'group') { el.append(h('tr', {class: 'tsg-duo-group'}, h('td', {colSpan: 3, text: r[1]}))); continue; }
      const [label, get, fmt, cmp, sub] = r;
      const va = get(A), vb = get(B);
      const cell = (v, other, d) => {
        const td = h('td', null, fmt === 'text' ? String(v) : T.fmt(fmt, v));
        if (sub) td.append(h('div', {class: 'tsg-note', text: sub(d)}));
        if (cmp && typeof v === 'number' && typeof other === 'number' && v > other) td.className = 'tsg-duo-best tsg-good';
        if ((fmt === 'd2s' || fmt === 'ints') && typeof v === 'number' && v !== 0 && !td.className) td.className = v > 0 ? 'tsg-good' : 'tsg-bad';
        return td;
      };
      el.append(h('tr', null, h('td', {class: 'tsg-l', text: label}), cell(va, vb, A), cell(vb, va, B)));
    }
  });
})();
