#!/usr/bin/env python3
"""Lädt die FuPa-Daten des TSGV Rechberg (1. Mannschaft, Reserve, II) und schreibt sie nach data/.

Nur Python-Standardbibliothek. Aufruf:  python3 scripts/update_data.py
Ergebnis:
  data/spiele.json         alle Spiele mit Ergebnis
  data/aufstellungen.json  eingesetzte Spieler je Spiel
  data/tore.json           Torereignisse mit Minute
  data/tabellen.json       Ligatabellen je Saison
  data/saisons.json        FuPa-Saisonstatistik (nur zum Abgleich)
  data/meta.json           Zeitpunkt der Aktualisierung
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

CLUB = 'tsgv-rechberg'
LINES = {'m1': ('m1', '1. Mannschaft'), 'mr1': ('ii', 'Reserve'), 'mr2': ('ii', 'II')}
FIRST_YEAR = 2007
API = 'https://api.fupa.net/v1'
WEB = 'https://www.fupa.net'
UA = {'User-Agent': 'Mozilla/5.0 (compatible; tsgv-statistik)'}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data')


def get(url, as_json=True, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                body = r.read().decode('utf-8')
                return json.loads(body) if as_json else body
        except urllib.error.HTTPError as e:
            if e.code in (404, 422):
                return None
        except Exception:
            pass
        time.sleep(1 + 2 * i)
    print('Fehler beim Abruf:', url, file=sys.stderr)
    return None


def highlights(html):
    """Torereignisse aus den eingebetteten Seitendaten einer FuPa-Spielseite."""
    if not html:
        return None
    j = html.find('"highlights":[')
    if j < 0:
        return None
    i = j + len('"highlights":')
    depth, instr, esc = 0, False, False
    for k in range(i, len(html)):
        ch = html[k]
        if instr:
            if esc:
                esc = False
            elif ch == '\\':
                esc = True
            elif ch == '"':
                instr = False
            continue
        if ch == '"':
            instr = True
        elif ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                return json.loads(html[i:k + 1])
    return None


def name_of(p):
    return ((p.get('firstName') or '').strip() + ' ' + (p.get('lastName') or '').strip()).strip()


def main():
    today = dt.date.today()
    last_year = today.year if today.month >= 7 else today.year - 1
    seasons = [(lin, y) for lin in LINES for y in range(FIRST_YEAR, last_year + 1)]

    def team(x):
        lin, y = x
        slug = f'{CLUB}-{lin}-{y}-{(y + 1) % 100:02d}'
        t = get(f'{API}/teams/{slug}')
        return (lin, y, slug, t) if t else None

    with ThreadPoolExecutor(6) as ex:
        teams = [t for t in ex.map(team, seasons) if t]
    # Je Mannschaft (1. bzw. II/Reserve) und Saison nur eine Team-Seite: bei Reserve (mr1) und II (mr2)
    # in derselben Saison gewinnt die neuere Linie, sonst würden dieselben Spiele doppelt gezählt.
    order = list(LINES)
    best = {}
    for x in teams:
        key = (LINES[x[0]][0], x[1])
        if key not in best or order.index(x[0]) > order.index(best[key][0]):
            best[key] = x
    dropped = [f'{x[0]}-{x[1]}' for x in teams if best[(LINES[x[0]][0], x[1])] is not x]
    teams = sorted(best.values(), key=lambda x: (order.index(x[0]), x[1]))
    print('Team-Saisons:', len(teams), '(übersprungen, doppelt:', ', '.join(dropped) or 'keine', ')')

    def team_data(x):
        lin, y, slug, t = x
        comp = (t.get('competition') or {}).get('slug')
        st = get(f'{API}/standings?competition={comp}&season={y}-{(y + 1) % 100:02d}') if comp else None
        ms = get(f'{API}/teams/{slug}/matches?flavor=past&limit=100') or []
        ps = get(f'{API}/teams/{slug}/player-stats') or []
        return x, st, ms, ps

    with ThreadPoolExecutor(6) as ex:
        tdata = list(ex.map(team_data, teams))

    matches, seen = [], set()
    for x, st, ms, ps in tdata:
        for m in ms:
            if m.get('homeGoal') is None or m['id'] in seen:
                continue
            seen.add(m['id'])
            matches.append((x, m))
    print('Spiele:', len(matches))

    def match_detail(xm):
        x, m = xm
        lu = get(f'{API}/matches/{m["slug"]}/lineup') or {}
        hl = highlights(get(f'{WEB}/match/{m["slug"]}', as_json=False)) or []
        return lu, hl

    with ThreadPoolExecutor(6) as ex:
        details = list(ex.map(match_detail, matches))

    tabellen, spiele, aufst, tore, saisons = [], [], [], [], []
    for (lin, y, slug, t), st, ms, ps in tdata:
        tid, tname = LINES[lin]
        season = f'{y % 100:02d}/{(y + 1) % 100:02d}'
        rows = (st or {}).get('standings') or []
        me = [r for r in rows if r['team']['teamId'] == t['teamId']]
        if me:
            r = me[0]
            tabellen.append({'season': season, 'seasonYear': y, 'teamId': tid, 'team': tname, 'league': t['competition']['name'].strip(),
                             'rank': r['rank'], 'teams': len(rows), 'matches': r['matches'], 'wins': r['wins'], 'draws': r['draws'],
                             'defeats': r['defeats'], 'goalsFor': r['ownGoals'], 'goalsAgainst': r['againstGoals'], 'points': r['points']})
        for p in ps:
            saisons.append({'season': season, 'team': tname, 'fupaId': p['id'], 'name': name_of(p), 'matches': p['matches'], 'goals': p['goals'],
                            'assists': p['assists'], 'minutes': p['minutesPlayed'], 'yellow': p['yellowCards'], 'yellowRed': p['yellowRedCards'],
                            'red': p['redCards'], 'subIn': p['substitutesIn'], 'subOut': p['substitutesOut'],
                            'penTotal': p['penaltiesTotal'], 'penHit': p['penaltiesHit']})

    for ((lin, y, slug, t), m), (lu, hl) in zip(matches, details):
        tid, tname = LINES[lin]
        season = f'{y % 100:02d}/{(y + 1) % 100:02d}'
        home = m['homeTeam']['teamId'] == t['teamId']
        opp = m['awayTeam' if home else 'homeTeam']
        gf, ga = (m['homeGoal'], m['awayGoal']) if home else (m['awayGoal'], m['homeGoal'])
        pl = [p for p in ((lu.get('homeTeam' if home else 'awayTeam') or {}).get('lineup') or []) if not p.get('coach')]
        played = [p for p in pl if p.get('starting') or p['statistics']['substituteIn']]
        goals = [e for e in hl if e.get('type') == 'goal' and e.get('subtype') != 'penalty_shootout']
        cat = m.get('category') if isinstance(m.get('category'), str) else str(m.get('category'))
        row = {'matchId': m['id'], 'slug': m['slug'], 'season': season, 'seasonYear': y, 'teamId': tid, 'team': tname,
               'date': m['kickoff'][:10], 'venue': 'Heim' if home else 'Auswärts',
               'opponent': (opp.get('club') or {}).get('name') or opp['name']['full'],
               'goalsFor': gf, 'goalsAgainst': ga, 'result': 'S' if gf > ga else ('U' if gf == ga else 'N'),
               'category': cat, 'verdict': 'verdict' in (m.get('flags') or []),
               'starters': sum(1 for p in pl if p.get('starting')), 'players': len(played),
               'goalMinutes': 'complete' if len(goals) == gf + ga else ('partial' if goals else 'none')}
        spiele.append(row)
        ph = pa = 0
        f = a = 0
        for e in sorted(goals, key=lambda e: (e['minute'], e.get('additionalMinute') or 0, e['id'])):
            h, aw = e.get('homeGoal'), e.get('awayGoal')
            if h is not None and aw is not None and (h, aw) != (ph, pa):
                side_home = h > ph
                ph, pa = h, aw
            else:
                side_home = e['team']['slug'] == m['homeTeam']['slug']
                ph, pa = (ph + 1, pa) if side_home else (ph, pa + 1)
            ours = side_home == home
            f, a = (f + 1, a) if ours else (f, a + 1)
            pr = e.get('primaryRole') or {}
            tore.append({'matchId': m['id'], 'minute': e['minute'] + (e.get('additionalMinute') or 0) / 100, 'side': 'F' if ours else 'G',
                         'scorer': name_of(pr) if ours and pr.get('lastName') else None, 'kind': e.get('subtype')})
        if row['goalMinutes'] == 'complete' and (f, a) != (gf, ga):
            row['goalMinutes'] = 'partial'
        for p in played:
            s = p['statistics']
            aufst.append({'matchId': m['id'], 'name': name_of(p['player']), 'start': 1 if p.get('starting') else 0,
                          'subIn': s['substituteIn'], 'subOut': s['substituteOut'], 'minutes': s['minutes'], 'goals': s['goals'],
                          'assists': s['assists'], 'yellow': s['yellowCard'], 'yellowRed': s['yellowRedCard'], 'red': s['redCard'],
                          'penHit': s['penaltyHits'], 'penMiss': s['penaltyMisses']})

    if not spiele or not aufst:
        sys.exit('Keine Daten erhalten – nichts geschrieben.')
    os.makedirs(OUT, exist_ok=True)
    for name, rows in [('spiele', spiele), ('aufstellungen', aufst), ('tore', tore), ('tabellen', tabellen), ('saisons', saisons)]:
        with open(os.path.join(OUT, name + '.json'), 'w', encoding='utf-8') as fh:
            json.dump(rows, fh, ensure_ascii=False, separators=(',', ':'))
        print(f'{name}: {len(rows)} Zeilen')
    with open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8') as fh:
        json.dump({'updated': dt.datetime.now(dt.timezone.utc).isoformat(timespec='minutes')}, fh)


if __name__ == '__main__':
    main()
