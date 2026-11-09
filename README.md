# Einnahmeplaner (Version „Ideen“)

> Diese Version enthält zusätzlich: Wochenstatistik, Wirkstoffe-Seite, farbigen Vorrat, „Alle abhaken“ und `api-tests.http`. Die einfache Version liegt im Zweig `main`.

Web-App, die Nahrungsergänzungsmittel (und optional Medikamente) so über den Tag verteilt, dass sie sich nicht gegenseitig stören.
Prüfungsprojekt T4 – Grundlagen der Entwicklung von Web-Anwendungen und mobiler Apps (Dr. Mester).

> Allgemeine Informationen aus frei zugänglichen Quellen. Ersetzt keine ärztliche oder pharmazeutische Beratung.

## Starten

**Mit einem Doppelklick:** `Einnahmeplaner.bat` öffnen.
Die App öffnet sich in einem eigenen Fenster. Der Server läuft unten in der Taskleiste (minimiert) – zum Beenden dieses Fenster schließen.

Symbol auf den Desktop: Rechtsklick auf `Einnahmeplaner.bat` → *Senden an* → *Desktop (Verknüpfung erstellen)*.
Optional eigenes Symbol: Rechtsklick auf die Verknüpfung → *Eigenschaften* → *Anderes Symbol* → `einnahmeplaner.ico`.

**Zum Entwickeln** (Änderungen sofort sehen):
1. `start-backend.bat` → Backend auf http://localhost:8000
2. `start-frontend.bat` → App auf **http://localhost:5173**
3. Tests: `test-backend.bat`
4. Stand sichern: `speichern.bat`

Beim ersten Start werden 7 Beispiel-Präparate angelegt. Die Datenbank liegt in `backend/data/`.

## Technik

- Frontend: Vue 3, TypeScript, Vite, Vue Router
- Backend: Deno, Hono, Zod, Deno KV

## REST-API

| Methode | Adresse | Zweck |
|---|---|---|
| GET | `/api/katalog` | Wirkstoffe, Zeitfenster, Regeln, Quellen |
| GET | `/api/praeparate` | alle Präparate |
| POST | `/api/praeparate` | Präparat anlegen |
| PUT | `/api/praeparate/:id` | Präparat ändern |
| DELETE | `/api/praeparate/:id` | Präparat löschen |
| GET | `/api/tagesablauf` | Uhrzeiten der Zeitfenster |
| PUT | `/api/tagesablauf` | Uhrzeiten speichern |
| GET | `/api/plan?datum=JJJJ-MM-TT` | berechneter Plan für diesen Tag (nur Präparate, die an dem Wochentag dran sind) |
| GET | `/api/einnahmen?datum=JJJJ-MM-TT` | abgehakte Einnahmen eines Tages |
| POST | `/api/einnahmen/umschalten` | Haken setzen oder entfernen (Vorrat ±1) |
| GET | `/api/statistik?von=…&bis=…` | geplante und abgehakte Einnahmen in einem Zeitraum |

Fehler kommen als `{ "fehler": "…" }` mit Status 400 oder 404.

Eine ausführliche Erklärung steht in **ERKLAERUNG.md**.
