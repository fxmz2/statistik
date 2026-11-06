// Zustand, Formatierung und Auswertung (Mannschaft + Zeitraum)
(() => {
  const T = (window.tsg = window.tsg || {});
  T.order = ['m1', 'ii'];
  T.label = {m1: '1. Mannschaft', ii: 'II'};
  T.st = {sel: new Set(['ii']), from: null, to: null, minGames: 20, group: 'overview', query: '', oppQuery: '', player: null, sorts: {}, missing: 'lineup'};
  T.ids = () => T.order.filter((t) => T.st.sel.has(t));
  T.mixId = () => (T.ids().length > 1 ? 'mix' : T.ids()[0]);
  T.color = (id) => ({m1: dash.colors[0], ii: dash.colors[1], mix: dash.colors[2], up: dash.colors[3], neu: dash.colors[4], ab: dash.colors[5],
    stamm: dash.colors[2], erg: 'var(--cds-chart-muted)', good: 'var(--color-ok)', bad: 'var(--color-bad)', mid: 'var(--cds-chart-muted)'})[id] || 'var(--cds-chart-muted)';

  const de = d3.formatLocale({decimal: ',', thousands: '.', grouping: [3], currency: ['', ' €']});
  const fInt = de.format(',d'), fInts = de.format('+,d'), f1 = de.format(',.1f'), f2 = de.format(',.2f'), f2s = de.format('+,.2f');
  T.fmt = (kind, v) => {
    if (v === null || v === undefined || Number.isNaN(v)) return '–';
    switch (kind) {
      case 'text': case 'chip': return String(v);
      case 'pct': return f1(v * 100) + ' %';
      case 'd2': return f2(v);
      case 'd2s': return v === 0 ? '±0,00' : f2s(v);
      case 'd1': return f1(v);
      case 'ints': return v === 0 ? '±0' : fInts(v);
      default: return fInt(Math.round(v));
    }
  };
  T.enc = (s) => String(s).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D').replace(/,/g, '%2C');
  T.h = (tag, props, ...kids) => {
    const e = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style') Object.assign(e.style, v);
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('data-') || k.startsWith('aria-') || k === 'href' || k === 'target' || k === 'rel') e.setAttribute(k, v);
      else e[k] = v;
    }
    for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c instanceof Node ? c : String(c));
    return e;
  };
  T.sw = (id) => T.h('i', {class: 'tsg-sw', style: {background: T.color(id)}});
  T.fail = (el) => el.replaceChildren(T.h('div', {class: 'tsg-fail', text: 'Failed to load'}));
  T.ready = (el, ids) => {
    const st = ids.map((id) => dash.data(id).status);
    if (st.every((s) => s === 'ok')) { el.classList.remove('dash-skeleton'); return true; }
    el.replaceChildren();
    if (st.some((s) => s === 'loading')) return false;
    el.classList.remove('dash-skeleton');
    if (st.some((s) => s === 'error' || s === 'connect')) T.fail(el);
    return false;
  };
  T.ok = (...ids) => ids.every((id) => dash.data(id).status === 'ok');
  T.sum = (rows, f) => rows.reduce((a, r) => a + (Number(r[f]) || 0), 0);
  T.q = (a, b, d = 2) => (b > 0 ? Math.round((a / b) * 10 ** d) / 10 ** d : null);
  T.seasonLabel = (y) => String(y % 100).padStart(2, '0') + '/' + String((y + 1) % 100).padStart(2, '0');

  // ---------- Zwischenspeicher je Auswahl ----------
  const cache = new Map();
  let refs = [];
  T.memo = (name, fn) => {
    const cur = ['spielerspiele', 'spiele', 'tabellen'].map((id) => dash.data(id).data);
    if (cur.some((r, i) => r !== refs[i])) { cache.clear(); refs = cur; }
    const key = name + '|' + T.ids().join('_') + '|' + T.st.from + '|' + T.st.to;
    if (!cache.has(key)) cache.set(key, fn());
    return cache.get(key);
  };

  // ---------- Saisons ----------
  T.allYears = () => {
    if (!T.ok('spiele')) return [];
    return [...new Set(dash.data('spiele').data.map((s) => s.seasonYear))].sort((a, b) => a - b);
  };
  T.inRange = (r) => (T.st.from === null || r.seasonYear >= T.st.from) && (T.st.to === null || r.seasonYear <= T.st.to);
  T.inSel = (r) => T.st.sel.has(r.teamId) && T.inRange(r);
  T.pm = () => T.memo('pm', () => (T.ok('spielerspiele') ? dash.data('spielerspiele').data.filter(T.inSel) : []));
  T.pmTeams = () => T.memo('pmTeams', () => (T.ok('spielerspiele') ? dash.data('spielerspiele').data.filter((r) => T.st.sel.has(r.teamId)) : []));
  T.tm = () => T.memo('tm', () => (T.ok('spiele') ? dash.data('spiele').data.filter((s) => s.category === 'league' && !s.verdict && T.inSel(s)) : []));
  T.matchMap = () => T.memo('mm', () => new Map((T.ok('spiele') ? dash.data('spiele').data : []).map((s) => [s.matchId, s])));
  T.yearsInSel = () => T.memo('yis', () => [...new Set(T.pm().map((r) => r.seasonYear))].sort((a, b) => a - b));

  // ---------- Spieler ----------
  const SUM = ['matches', 'starts', 'subIn', 'subOut', 'full', 'minutes', 'goals', 'assists', 'yellow', 'yellowRed', 'red', 'penHit', 'penMiss', 'wins', 'ptsWith'];
  const zero = () => Object.fromEntries(SUM.map((f) => [f, 0]));
  const add = (o, r) => {
    o.matches += 1; o.starts += r.start; o.subIn += r.subIn; o.subOut += r.subOut; o.full += r.full; o.minutes += r.minutes;
    o.goals += r.goals; o.assists += r.assists; o.yellow += r.yellow; o.yellowRed += r.yellowRed; o.red += r.red;
    o.penHit += r.penHit; o.penMiss += r.penMiss; o.wins += r.points === 3 ? 1 : 0; o.ptsWith += r.points;
  };
  const finish = (o) => {
    o.points = o.goals + o.assists; o.cards = o.yellow + o.yellowRed + o.red; o.notFull = o.matches - o.full; o.penTotal = o.penHit + o.penMiss;
    return o;
  };
  T.streak = (years) => {
    if (!years.length) return [null, null, 0];
    let best = [years[0], years[0], 1], cur = [years[0], 1];
    for (let i = 1; i < years.length; i++) {
      cur = years[i] === years[i - 1] + 1 ? [cur[0], cur[1] + 1] : [years[i], 1];
      if (cur[1] > best[2]) best = [cur[0], years[i], cur[1]];
    }
    return best;
  };
  T.players = () => T.memo('players', () => {
    const pm = T.pm(), tm = T.tm();
    const lineupGames = tm.filter((s) => s.starters >= 9);
    const by = new Map();
    for (const r of pm) {
      let p = by.get(r.name);
      if (!p) {
        p = {name: r.name, ...zero(), team: {}, years: new Set(), games: new Set(), pmGames: 0, gfOn: 0, gaOn: 0, pmMinutes: 0,
          inN: 0, inGain: 0, inGD: 0, inImproved: 0, inWorse: 0, outN: 0, outGain: 0, outGD: 0, outImproved: 0, outWorse: 0,
          inRes: [0, 0, 0], outRes: [0, 0, 0], inRows: [], outRows: [], pmRows: []};
        by.set(r.name, p);
      }
      add(p, r);
      if (!p.team[r.teamId]) p.team[r.teamId] = zero();
      add(p.team[r.teamId], r);
      p.years.add(r.seasonYear); p.games.add(r.matchId);
      const ri = r.points === 3 ? 0 : r.points === 1 ? 1 : 2;
      if (r.gfOn !== null) { p.pmRows.push(r); p.pmGames += 1; p.gfOn += r.gfOn; p.gaOn += r.gaOn; p.pmMinutes += Math.max(0, r.outMin - r.inMin); }
      if (r.inGain !== null) { p.inRows.push(r); p.inRes[ri] += 1; p.inN += 1; p.inGain += r.inGain; p.inGD += r.inGD; p.inImproved += r.inGain > 0 ? 1 : 0; p.inWorse += r.inGain < 0 ? 1 : 0; }
      if (r.outGain !== null) { p.outRows.push(r); p.outRes[ri] += 1; p.outN += 1; p.outGain += r.outGain; p.outGD += r.outGD; p.outImproved += r.outGain > 0 ? 1 : 0; p.outWorse += r.outGain < 0 ? 1 : 0; }
    }
    const list = [...by.values()];
    const tot = {goals: T.sum(list, 'goals'), points: T.sum(list, 'goals') + T.sum(list, 'assists'), minutes: T.sum(list, 'minutes')};
    for (const p of list) {
      finish(p);
      for (const id of Object.keys(p.team)) finish(p.team[id]);
      const ys = [...p.years].sort((a, b) => a - b);
      const [s0, s1, len] = T.streak(ys);
      p.seasons = ys.length; p.firstYear = ys[0]; p.lastYear = ys[ys.length - 1];
      p.span = ys.length > 1 ? T.seasonLabel(ys[0]) + ' – ' + T.seasonLabel(ys[ys.length - 1]) : T.seasonLabel(ys[0]);
      p.maxStreak = len; p.streakSpan = len > 1 ? T.seasonLabel(s0) + ' – ' + T.seasonLabel(s1) : T.seasonLabel(s0);
      p.teams = T.order.filter((id) => p.team[id]).map((id) => T.label[id]).join(' + ');
      const q = T.q;
      Object.assign(p, {
        minPerGoal: q(p.minutes, p.goals, 0), minPerPoint: q(p.minutes, p.points, 0), goalsPerGame: q(p.goals, p.matches), pointsPerGame: q(p.points, p.matches),
        goalsPer90: q(p.goals * 90, p.minutes), minPerGame: q(p.minutes, p.matches, 0), playRate: q(p.minutes, p.matches * 90, 3),
        startRate: q(p.starts, p.matches, 3), fullRate: q(p.full, p.matches, 3), notFullRate: q(p.notFull, p.matches, 3),
        subInRate: q(p.subIn, p.matches, 3), subOutRate: q(p.subOut, p.matches, 3), cardsPerGame: q(p.cards, p.matches), minPerCard: q(p.minutes, p.cards, 0),
        penRate: q(p.penHit, p.penTotal, 3), goalShare: q(p.goals, tot.goals, 3), pointShare: q(p.points, tot.points, 3), minutesShare: q(p.minutes, tot.minutes, 3),
        ppgWith: q(p.ptsWith, p.matches), winWith: q(p.wins, p.matches, 3),
        plusMinus: p.pmGames ? p.gfOn - p.gaOn : null, pmPer90: p.pmMinutes >= 90 ? q((p.gfOn - p.gaOn) * 90, p.pmMinutes) : null,
        inGainAvg: p.inN ? q(p.inGain, p.inN) : null,
      });
      if (!p.inN) { p.inGain = null; p.inGD = null; p.inImproved = null; }
      if (!p.outN) { p.outGain = null; p.outGD = null; }
      // ohne ihn: Ligaspiele mit Aufstellung seiner Mannschaften, in denen er nicht gespielt hat
      const own = lineupGames.filter((s) => p.team[s.teamId]);
      const without = own.filter((s) => !p.games.has(s.matchId));
      const ptsOf = (s) => (s.result === 'S' ? 3 : s.result === 'U' ? 1 : 0);
      p.gamesWithout = without.length;
      p.ppgWithout = without.length ? q(without.reduce((a, s) => a + ptsOf(s), 0), without.length) : null;
      p.winWithout = without.length ? q(without.filter((s) => s.result === 'S').length, without.length, 3) : null;
      p.ppgDiff = p.ppgWith !== null && p.ppgWithout !== null ? Math.round((p.ppgWith - p.ppgWithout) * 100) / 100 : null;
    }
    return list;
  });
  T.playerMap = () => T.memo('pmap', () => new Map(T.players().map((p) => [p.name, p])));

  // Spieler je Saison und Mannschaft
  T.playerSeasons = () => T.memo('ps', () => {
    const by = new Map();
    for (const r of T.pm()) {
      const k = r.name + '|' + r.seasonYear + '|' + r.teamId;
      if (!by.has(k)) by.set(k, {name: r.name, seasonYear: r.seasonYear, season: r.season, teamId: r.teamId, team: T.label[r.teamId], ...zero(), pm: 0, pmOk: 0});
      const o = by.get(k);
      add(o, r);
      if (r.gfOn !== null) { o.pm += r.gfOn - r.gaOn; o.pmOk += 1; }
    }
    return [...by.values()].map((o) => {
      finish(o);
      o.minPerGoal = T.q(o.minutes, o.goals, 0); o.minPerPoint = T.q(o.minutes, o.points, 0); o.plusMinus = o.pmOk ? o.pm : null;
      return o;
    });
  });

  // Mannschaft je Saison und Team (aus den Einsätzen und den Spielen)
  T.seasonTeams = () => T.memo('st', () => {
    const by = new Map();
    const get = (y, id, season) => {
      const k = y + '|' + id;
      if (!by.has(k)) by.set(k, {seasonYear: y, season, teamId: id, ...zero(), names: new Set(), games: 0, gWins: 0, gDraws: 0, gDefeats: 0, gf: 0, ga: 0});
      return by.get(k);
    };
    for (const r of T.pm()) { const o = get(r.seasonYear, r.teamId, r.season); add(o, r); o.names.add(r.name); }
    for (const s of T.tm()) {
      const o = get(s.seasonYear, s.teamId, s.season);
      o.games += 1; o.gf += s.goalsFor; o.ga += s.goalsAgainst;
      if (s.result === 'S') o.gWins += 1; else if (s.result === 'U') o.gDraws += 1; else o.gDefeats += 1;
    }
    return [...by.values()].map((o) => { finish(o); o.players = o.names.size; return o; }).sort((a, b) => a.seasonYear - b.seasonYear || a.teamId.localeCompare(b.teamId));
  });

  // Kader je Saison: Stamm (>= 10 Einsätze), neue Spieler, Abgänge (erste/letzte Saison über alle Daten der gewählten Teams)
  T.STAMM = 10;
  T.kader = () => T.memo('kader', () => {
    const all = T.pmTeams();
    const first = new Map(), last = new Map();
    for (const r of all) {
      if (!first.has(r.name) || r.seasonYear < first.get(r.name)) first.set(r.name, r.seasonYear);
      if (!last.has(r.name) || r.seasonYear > last.get(r.name)) last.set(r.name, r.seasonYear);
    }
    const years = [...new Set(all.map((r) => r.seasonYear))].sort((a, b) => a - b);
    const minY = years[0], maxY = years[years.length - 1];
    const by = new Map();
    for (const r of T.pm()) {
      if (!by.has(r.seasonYear)) by.set(r.seasonYear, new Map());
      const m = by.get(r.seasonYear);
      m.set(r.name, (m.get(r.name) || 0) + 1);
    }
    return [...by].sort((a, b) => a[0] - b[0]).map(([y, m]) => {
      const names = [...m.keys()];
      const stamm = names.filter((n) => m.get(n) >= T.STAMM).length;
      return {seasonYear: y, season: T.seasonLabel(y), players: names.length, stamm, ergaenzung: names.length - stamm,
        neu: y === minY ? null : names.filter((n) => first.get(n) === y).length,
        abgaenge: y === maxY ? null : names.filter((n) => last.get(n) === y).length};
    });
  });

  // Beide Mannschaften (nur Zeitraum, immer beide Teams)
  T.both = () => T.memo('both', () => {
    const rows = T.ok('spielerspiele') ? dash.data('spielerspiele').data.filter(T.inRange) : [];
    const per = new Map();
    for (const r of rows) {
      if (!per.has(r.name)) per.set(r.name, {m1: new Map(), ii: new Map()});
      const m = per.get(r.name)[r.teamId];
      m.set(r.seasonYear, (m.get(r.seasonYear) || 0) + 1);
    }
    const years = [...new Set(rows.filter((r) => r.teamId === 'ii').map((r) => r.seasonYear))].sort((a, b) => a - b);
    const seasons = years.map((y) => {
      let both = 0, up = 0;
      for (const p of per.values()) {
        if (p.m1.has(y) && p.ii.has(y)) both += 1;
        const f1 = Math.min(...p.m1.keys()), fii = Math.min(...p.ii.keys());
        if (f1 === y && fii < y) up += 1;
      }
      return {seasonYear: y, season: T.seasonLabel(y), both, up};
    });
    const players = [];
    for (const [name, p] of per) {
      if (!p.m1.size || !p.ii.size) continue;
      const f1 = Math.min(...p.m1.keys()), fii = Math.min(...p.ii.keys());
      const s = (m) => [...m.values()].reduce((a, b) => a + b, 0);
      players.push({name, path: fii < f1 ? 'II → 1.' : f1 < fii ? '1. → II' : 'gleichzeitig', firstII: T.seasonLabel(fii), firstM1: T.seasonLabel(f1),
        iiBefore: [...p.ii].filter(([y]) => y < f1).reduce((a, [, v]) => a + v, 0), matchesII: s(p.ii), matchesM1: s(p.m1),
        seasonsBoth: [...p.m1.keys()].filter((y) => p.ii.has(y)).length});
    }
    return {seasons, players};
  });

  // Wechsel-Auswertung
  T.subs = () => T.memo('subs', () => {
    const pm = T.pm();
    const ins = pm.filter((r) => r.subIn && r.inMin !== null);
    const insOk = ins.filter((r) => r.inGain !== null);
    const outsOk = pm.filter((r) => r.outGain !== null);
    const byState = (rows, st, g, gd) => ['Rückstand', 'Remis', 'Führung'].map((s) => {
      const x = rows.filter((r) => r[st] === s);
      return {state: s, n: x.length, better: x.filter((r) => r[g] > 0).length, same: x.filter((r) => r[g] === 0).length, worse: x.filter((r) => r[g] < 0).length,
        avgGain: T.q(T.sum(x, g), x.length), avgGD: T.q(T.sum(x, gd), x.length)};
    });
    const buckets = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75], [76, 90]].map(([a, b]) => ({season: a + '.–' + b + '.', n: ins.filter((r) => r.inMin >= a - 1 && r.inMin <= b).length}));
    return {ins, insOk, outsOk, inStates: byState(insOk, 'inState', 'inGain', 'inGD'), outStates: byState(outsOk, 'outState', 'outGain', 'outGD'), buckets,
      avgMin: ins.length ? Math.round(T.sum(ins, 'inMin') / ins.length) : null, totalSubIns: pm.filter((r) => r.subIn).length};
  });

  // Mannschaftsbilanz
  T.tab = () => T.memo('tab', () => (T.ok('tabellen') ? dash.data('tabellen').data.filter((t) => T.inSel(t) && Number(t.matches) > 0) : []));
  T.latestTabYear = () => (T.ok('tabellen') ? Math.max(...dash.data('tabellen').data.map((t) => t.seasonYear)) : null);
})();
