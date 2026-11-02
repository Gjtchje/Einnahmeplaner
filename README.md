# Einnahmeplaner

Eine Web-App, die Nahrungsergänzungsmittel (und optional Medikamente) so über den Tag verteilt, dass sie sich nicht gegenseitig stören.
Prüfungsprojekt T4 – Grundlagen der Entwicklung von Web-Anwendungen und mobiler Apps (Dr. Mester).

> Allgemeine Informationen aus frei zugänglichen Quellen. Ersetzt keine ärztliche oder pharmazeutische Beratung.

## Starten

Voraussetzungen: [Deno](https://deno.com) und [Node.js](https://nodejs.org) (wie bei ColorBlock).

1. `start-backend.bat` doppelklicken → Backend läuft auf http://localhost:8000
2. `start-frontend.bat` doppelklicken → beim ersten Mal wird `npm install` ausgeführt, danach läuft die App auf **http://localhost:5173**
3. Tests: `test-backend.bat`
4. Stand sichern: `speichern.bat` (legt beim ersten Mal ein Git-Repository an; `git push` nur, wenn ein GitHub-Remote eingerichtet ist)

Beim allerersten Start legt das Backend sieben Beispiel-Präparate an, damit man direkt etwas sieht.
Die Datenbank liegt in `backend/data/` – wer neu anfangen will, löscht diesen Ordner.

Ist Port 5173 noch belegt: `port-5173-freigeben.bat`.

## Funktionen

- **Heute**: berechneter Tagesplan, Einnahmen abhaken, Fortschritt, Hinweise des Planers, „Bald nachkaufen“, Erinnerungen per Browser-Benachrichtigung
- **Präparate**: anlegen, bearbeiten, löschen (Name, Wirkstoff, Menge, Einheit, 1–3× täglich, Stärke, Vorrat, Notiz)
- **Tagesablauf**: Uhrzeiten der sechs Zeitfenster einstellen
- **Wirkstoffe**: alle 19 Wirkstoffe mit Regeln und Quellen zum Nachschlagen

## Aufbau

```
Einnahmeplaner/
├── backend/                 Deno + Hono + Zod + Deno KV
│   ├── main.ts              Start: Datenbank öffnen, Beispieldaten, Server starten
│   ├── app.ts               alle REST-Routen
│   ├── planer.ts            ★ Planungslogik (reine Funktion)
│   ├── modell.ts            Zod-Schemas = Datenmodell + Validierung
│   ├── katalog.ts           lädt daten/wirkstoffe.json (Zeitfenster, Wirkstoffe, Regeln, Quellen)
│   ├── speicher.ts          alle Zugriffe auf Deno KV
│   ├── beispieldaten.ts     Präparate für den ersten Start
│   ├── planer_test.ts       13 Tests für den Planer und den Katalog
│   ├── app_test.ts          6 Tests für die API
│   └── daten/wirkstoffe.json
├── frontend/                Vue 3 + TypeScript + Vite + Vue Router
│   └── src/
│       ├── api.ts           alle fetch-Aufrufe ans Backend
│       ├── types.ts         Typen (Vertrag mit dem Backend)
│       ├── views/           HeuteView, PraeparateView, TagesablaufView, WirkstoffeView, NichtGefundenView
│       ├── components/      FormFeld, MeldungsListe
│       └── composables/     useKatalog, useErinnerungen, useDatum
├── ERKLAERUNG.md            Erklärung aller Teile fürs Prüfungsgespräch
└── *.bat                    Start-, Test- und Speicher-Skripte
```

## REST-API

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/health` | Läuft der Server? |
| GET | `/api/katalog` | Zeitfenster, Wirkstoffe, Regeln, Quellen |
| GET | `/api/wirkstoffe/:id` | ein Wirkstoff mit seinen Regeln |
| GET | `/api/praeparate` | alle Präparate (+ berechnete Reichweite) |
| GET | `/api/praeparate/:id` | ein Präparat |
| POST | `/api/praeparate` | anlegen → 201 |
| PUT | `/api/praeparate/:id` | ändern |
| DELETE | `/api/praeparate/:id` | löschen → 204 |
| GET | `/api/tagesablauf` | Uhrzeiten der Zeitfenster |
| PUT | `/api/tagesablauf` | Uhrzeiten speichern |
| GET | `/api/plan` | berechneter Tagesplan + Meldungen |
| GET | `/api/einnahmen?datum=JJJJ-MM-TT` | abgehakte Einnahmen eines Tages |
| POST | `/api/einnahmen` | abhaken (Vorrat −Menge) → 201, doppelt → 409 |
| DELETE | `/api/einnahmen` | Haken entfernen (Vorrat +Menge) → 204 |

Fehlerformat: `{ "fehler": "…", "details": [{ "feld": "name", "meldung": "…" }] }` (Statuscodes 400, 404, 409, 500).

## Quellen

Fachliche Quellen stehen in `backend/daten/wirkstoffe.json` und in der App unter „Wirkstoffe“.
Technik: offizielle Dokumentationen von Vue, Vue Router, Vite, Deno, Hono, Zod und MDN.
KI: Claude (Anthropic) für Recherche, Code und Erklärungen.
