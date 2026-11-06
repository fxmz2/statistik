# TSGV Rechberg · Alltime

Spielerstatistik der Herren des TSGV Rechberg (1. Mannschaft und II inkl. Reserve) aus den FuPa-Aufstellungen.
Die Seite läuft als statische Webseite über GitHub Pages und aktualisiert ihre Daten automatisch.

## Was die Seite zeigt

- **Überblick:** Kennzahlen, Saisonverlauf, Bestenlisten mit frei wählbarer Kennzahl
- **Spieler:** Profil je Spieler mit Saisonverlauf, letzten Spielen und Bilanz (Mitspieler, Vorlagen-Partner, Gegner), Tabelle aller Spieler
- **Wechsel & Wirkung:** Plus/Minus, Punkte nach Ein- und Auswechslungen, Joker-Rangliste, „Mit wem punkten wir?“
- **Kader:** Stamm und Ergänzung, Zu- und Abgänge, Durchlässigkeit zwischen 1. Mannschaft und II
- **Mannschaft:** Ligabilanz, Platzierungen, Heim/Auswärts, höchste Siege und Niederlagen, Bilanz gegen Gegner
- **Rekorde:** beste Einzelsaisons, nächste Meilensteine, Abhängigkeit von den Torjägern
- **Datenqualität:** fehlende Aufstellungen und Torminuten mit Link zum Spiel auf FuPa

Mannschaft und Zeitraum (von Saison bis Saison) wählst du über „Filter“ oben.

## Aktualisierung

Der Workflow `.github/workflows/update.yml` lädt jeden Montag früh die Daten neu von FuPa
(`scripts/update_data.py`), speichert sie in `data/` und veröffentlicht die Seite.
Sofort aktualisieren: Reiter **Actions** → „Daten aktualisieren und veröffentlichen“ → **Run workflow**.

## Einmalig einrichten

1. **Settings → Pages → Build and deployment → Source:** „GitHub Actions“ auswählen.
2. **Actions** → „Daten aktualisieren und veröffentlichen“ → **Run workflow**.
3. Nach ein paar Minuten ist die Seite unter `https://<benutzer>.github.io/<repository>/` erreichbar.

## Lokal ansehen

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html`, `theme.css` | Seite und Gestaltung |
| `calcs.js` | Einsätze je Ligaspiel inkl. Plus/Minus und Wechsel-Wirkung |
| `core.js` | Auswertung je Mannschaft und Zeitraum |
| `views.js` | Darstellung und Bedienung |
| `dash-shim.js` | lädt `data/*.json` und verbindet sie mit der Darstellung |
| `scripts/update_data.py` | Datenabruf von FuPa (nur Python-Standardbibliothek) |
| `data/` | Spiele, Aufstellungen, Torereignisse, Tabellen, FuPa-Saisonstatistik |

Daten: [FuPa](https://www.fupa.net/club/tsgv-rechberg).
