# Einnahmeplaner

Web-App, die Nahrungsergänzungsmittel (und optional Medikamente) so über den Tag verteilt, dass sie sich nicht gegenseitig stören.
Prüfungsprojekt T4 – Grundlagen der Entwicklung von Web-Anwendungen und mobiler Apps (Dr. Mester).

> Allgemeine Informationen aus frei zugänglichen Quellen. Ersetzt keine ärztliche oder pharmazeutische Beratung.

## Starten

1. `start-backend.bat` → Backend auf http://localhost:8000
2. `start-frontend.bat` → App auf **http://localhost:5173** (beim ersten Mal wird `npm install` ausgeführt)
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
| GET | `/api/plan` | berechneter Tagesplan mit Hinweisen |
| GET | `/api/einnahmen?datum=JJJJ-MM-TT` | abgehakte Einnahmen eines Tages |
| POST | `/api/einnahmen/umschalten` | Haken setzen oder entfernen (Vorrat ±1) |

Fehler kommen als `{ "fehler": "…" }` mit Status 400 oder 404.

Eine ausführliche Erklärung steht in **ERKLAERUNG.md**.
