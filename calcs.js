// Einsätze je Ligaspiel aus den FuPa-Aufstellungen, angereichert mit Spiel- und Torminuten-Daten
dash.calc('spielerspiele', {
  title: 'Einsätze je Ligaspiel',
  description: 'Jeder Einsatz in einem Ligaspiel aus den FuPa-Aufstellungen, mit Saison, Mannschaft und Ergebnis. Wo FuPa alle Torminuten hat (und das Spiel nicht am grünen Tisch gewertet wurde) zusätzlich: Tore für und gegen, während der Spieler auf dem Platz stand, und die Veränderung von Spielstand und Punkten nach seiner Ein- oder Auswechslung. Wechselminute = 90 minus Einsatzminuten.',
  inputs: ['spiele', 'aufstellungen', 'tore'],
  fn: (spiele, aufstellungen, tore) => {
    const games = new Map(spiele.filter((s) => s.category === 'league').map((s) => [s.matchId, s]));
    const goals = new Map();
    for (const t of tore) {
      if (!goals.has(t.matchId)) goals.set(t.matchId, []);
      goals.get(t.matchId).push(t);
    }
    const pts = (f, a) => (f > a ? 3 : f === a ? 1 : 0);
    const score = (g, from, to) => {
      let f = 0, a = 0;
      for (const t of g) if (t.minute > from && t.minute <= to) { if (t.side === 'F') f += 1; else a += 1; }
      return [f, a];
    };
    const state = (f, a) => (f > a ? 'Führung' : f === a ? 'Remis' : 'Rückstand');
    const out = [];
    for (const a of aufstellungen) {
      const s = games.get(a.matchId);
      if (!s) continue;
      const n = (k) => Number(a[k]) || 0;
      const start = n('start') > 0, sub = !start && n('subIn') > 0, off = n('subOut') > 0, sent = n('red') + n('yellowRed') > 0;
      const minutes = Math.max(0, n('minutes'));
      let inMin = null, outMin = null;
      if (start) { inMin = 0; outMin = off || sent ? minutes : 90; }
      else if (sub && !off && !sent) { inMin = Math.max(0, 90 - Math.min(90, minutes)); outMin = 90; }
      const ok = !s.verdict && s.goalMinutes === 'complete' && inMin !== null;
      const g = goals.get(a.matchId) || [];
      const row = {
        matchId: s.matchId, season: s.season, seasonYear: s.seasonYear, teamId: s.teamId, date: s.date, name: a.name,
        start: start ? 1 : 0, subIn: sub ? 1 : 0, subOut: off ? 1 : 0, full: start && !off && !sent ? 1 : 0, minutes,
        goals: n('goals'), assists: n('assists'), yellow: n('yellow'), yellowRed: n('yellowRed'), red: n('red'), penHit: n('penHit'), penMiss: n('penMiss'),
        points: pts(s.goalsFor, s.goalsAgainst), inMin, outMin, minutesOk: ok,
        gfOn: null, gaOn: null, inState: null, inScore: null, inGain: null, inGD: null, outState: null, outScore: null, outGain: null, outGD: null,
      };
      if (ok) {
        const [f, ag] = score(g, inMin === 0 ? -1 : inMin, outMin);
        row.gfOn = f; row.gaOn = ag;
        const final = pts(s.goalsFor, s.goalsAgainst), fd = s.goalsFor - s.goalsAgainst;
        if (sub) {
          const [f0, a0] = score(g, -1, inMin);
          row.inState = state(f0, a0); row.inScore = f0 + ':' + a0; row.inGain = final - pts(f0, a0); row.inGD = fd - (f0 - a0);
        }
        if (start && off && !sent) {
          const [f0, a0] = score(g, -1, outMin);
          row.outState = state(f0, a0); row.outScore = f0 + ':' + a0; row.outGain = final - pts(f0, a0); row.outGD = fd - (f0 - a0);
        }
      }
      out.push(row);
    }
    return out;
  },
});
