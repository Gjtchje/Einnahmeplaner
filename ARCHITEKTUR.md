# Einnahmeplaner – Architekturbeschreibung

Nach dem Architektur-Fragebogen von Dr. Mester: erst der **Steckbrief** (die App in wenigen Minuten), dann die wichtigsten **Entscheidungen als ADR**.

---

## 1. Architektur-Steckbrief

### Produkt
- **Ziel:** Nahrungsergänzungsmittel (und optional Medikamente) so über den Tag verteilen, dass sich Mittel, die sich gegenseitig stören, nicht in die Quere kommen.
- **Benutzer:** eine Person, die mehrere Mittel nimmt. Keine Rollen, kein Team.
- **Kern-Use-Cases:**
  1. Präparate anlegen, ändern, löschen (Name, Wirkstoff, Dosis, Stärke, wie oft, an welchen Tagen, Vorrat)
  2. Tagesablauf einstellen (Uhrzeiten der 6 Zeitfenster)
  3. Tagesplan ansehen (heute oder ein anderer Tag der Woche) und Einnahmen abhaken
  4. Hinweise sehen (Konflikte, Tipps, Warnungen, „bald nachkaufen“) und an Einnahmen erinnert werden
- **Out of scope:** Dosis-Empfehlungen, mehrere Benutzer, Login, Online-Betrieb

### Domäne
- **Wichtige Entitäten:** Wirkstoff, Regel (fester Katalog) · Präparat, Tagesablauf, Einnahme (Nutzerdaten)
- **Wichtige Regeln:**
  - Wenn zwei Wirkstoffe eine Abstandsregel haben (z. B. Eisen ↔ Calcium 2 Std.), dürfen ihre Zeitfenster nicht näher beieinander liegen.
  - Medikamente werden vor Nahrungsergänzungsmitteln eingeplant.
  - Wenn kein Zeitfenster passt, wird das Mittel trotzdem eingeplant und ein Konflikt angezeigt.
  - Ein Präparat erscheint nur an den Wochentagen, die in `tage` stehen.
- **Invarianten:** Ein Präparat hat immer genau einen bekannten Wirkstoff, 1–3 Einnahmen pro Tag und mindestens einen Wochentag. Haken und Vorrat ändern sich immer gemeinsam.

### Client
- **Technologie:** Vue 3 (Single File Components, Composition API), TypeScript, Vite, Vue Router
- **Rendering:** SPA (Single Page Application) – im Browser gerendert
- **State:** Server-State (Präparate, Plan, Haken) liegt im Backend und wird bei Bedarf neu geladen; Formular- und UI-State in der jeweiligen Seite (`ref`); URL-State über den Router (`/`, `/praeparate`, `/tagesablauf`)

### Backend
- **Technologie:** Deno, Hono, Zod
- **Architektur:** ein kleiner Server mit klarer Aufteilung: Routen (`main.ts`) · Fachlogik (`planer.ts`) · Datenmodell + Prüfung (`modell.ts`) · Datenbankzugriff (`datenbank.ts`)

### Schnittstellen
- **Kommunikation:** REST über HTTP, Daten als JSON
- **Contract:** Zod-Schemas im Backend (`modell.ts`) und die passenden TypeScript-Typen im Frontend (`api.ts`). Fehler immer als `{ "fehler": "…" }` mit Statuscode 400 / 404 / 500.

### Daten
- **Datenbank:** Deno KV (eingebaut, als Datei in `backend/data/`)
- **Persistenzmodell:** Schlüssel-Wert: `["praeparate", id]`, `["tagesablauf"]`, `["einnahmen", datum, praeparatId, slot]`. Der Plan wird nicht gespeichert, sondern immer neu berechnet.

### Security
- **Authentication / Authorization:** keine – Einzelnutzer-App auf dem eigenen Rechner (siehe ADR-007)
- **Sonstiges:** Jede Eingabe wird im Backend mit Zod geprüft; Fehlerdetails gehen nur ins Server-Log, nicht an den Browser.

### Infrastruktur
- **Hosting:** lokal auf dem eigenen Rechner (`localhost:8000`)
- **Deployment:** `Einnahmeplaner.bat` baut das Frontend, startet den Server und öffnet die App im eigenen Fenster

### Betrieb
- **Logging:** Server-Fenster (Fehler über `console.error`)
- **Monitoring / Backups:** keine – Backup = Ordner `backend/data` kopieren

### Wichtigste ADRs
ADR-001 Architekturform · ADR-005 eigener Katalog · ADR-006 Planungsmodell · ADR-008 keine Dosis-Empfehlung

---

## 2. Entscheidungsprotokoll

| ID | Entscheidung | Status | ADR |
|---|---|---|---|
| D-001 | Client + Backend, entkoppelt über REST | Accepted | ADR-001 |
| D-002 | Deno + Hono im Backend | Accepted | ADR-002 |
| D-003 | Deno KV als Datenbank | Accepted | ADR-003 |
| D-004 | REST-API, Plan wird berechnet statt gespeichert | Accepted | ADR-004 |
| D-005 | Eigener Wirkstoff-Katalog statt externer API | Accepted | ADR-005 |
| D-006 | Feste Zeitfenster + einfacher Planer | Accepted | ADR-006 |
| D-007 | Kein Login | Accepted | ADR-007 |
| D-008 | Keine Dosis-Empfehlung | Accepted | ADR-008 |
| D-009 | Backend liefert das Frontend aus (Ein-Klick-Start) | Accepted | ADR-009 |
| D-010 | Erste, größere Version mit 25 Dateien | Superseded (vereinfacht am 07.11.2026) | – |

---

## 3. ADRs

### ADR-001: Client + Backend, entkoppelt über REST
- **Status:** Accepted
- **Kontext:** Vorgabe des Moduls: Web-Frontend, REST-API, Backend, Persistenz.
- **Entscheidung:** Vue-Frontend und Deno-Backend als getrennte Teile, die nur über die REST-API reden.
- **Alternativen:** Monolith mit serverseitig erzeugten HTML-Seiten (MPA/SSR); alles im Browser mit `localStorage`.
- **Begründung:** Klare Aufgaben (Anzeige vs. Logik/Daten); Backend ohne Browser testbar; Frontend austauschbar (z. B. gegen eine Handy-App).
- **Konsequenzen:** + Planer-Logik an einer Stelle, testbar · − zwei Programme, Typen müssen im Frontend nachgezogen werden.
- **Folgen:** neu prüfen, falls die App nur noch offline im Browser laufen soll.

### ADR-002: Deno + Hono im Backend
- **Status:** Accepted
- **Kontext:** Wahl zwischen Java/Quarkus und TypeScript/Deno.
- **Entscheidung:** Deno mit Hono, Prüfung mit Zod.
- **Alternativen:** Quarkus (Java); Node.js mit Express.
- **Begründung:** Eine Sprache (TypeScript) im Frontend und Backend; Deno bringt Tests, Formatierer und Datenbank (KV) mit; Hono ist klein und leicht zu lesen; Erfahrung aus dem Projekt ColorBlock.
- **Konsequenzen:** + wenig Einrichtung · − kleineres Ökosystem als Java/Node.

### ADR-003: Deno KV als Datenbank
- **Status:** Accepted
- **Kontext:** Daten müssen dauerhaft gespeichert werden; wenige Datenarten, einfache Abfragen.
- **Entscheidung:** Deno KV als Datei im Projektordner.
- **Alternativen:** SQLite, PostgreSQL, JSON-Datei.
- **Begründung:** Kein extra Datenbank-Server; atomare Transaktionen eingebaut (Haken + Vorrat gemeinsam); Schlüssel-Prefixe reichen für „alle Haken eines Tages“.
- **Konsequenzen:** + einfach · − keine SQL-Abfragen, keine Werkzeuge wie DBeaver. Bei vielen Nutzern oder komplexen Auswertungen → PostgreSQL; dann müsste nur `datenbank.ts` geändert werden.

### ADR-004: REST-API; Plan wird berechnet statt gespeichert
- **Status:** Accepted
- **Kontext:** Der Plan hängt von Präparaten, Tagesablauf und Regeln ab.
- **Entscheidung:** Ressourcen `praeparate`, `tagesablauf`, `einnahmen` mit GET/POST/PUT/DELETE; der Plan ist eine berechnete Ressource `GET /api/plan?datum=…`. Abhaken über `POST /api/einnahmen/umschalten`.
- **Alternativen:** Plan speichern und bei jeder Änderung aktualisieren; GraphQL.
- **Begründung:** Ein berechneter Plan kann nie veraltet sein; REST ist im Kurs Standard und leicht zu testen.
- **Konsequenzen:** + immer aktuell · − bei jedem Aufruf wird neu gerechnet (bei ≤ 30 Präparaten egal). „umschalten“ ist kein reines REST-Verb, aber für eine Checkbox am einfachsten.

### ADR-005: Eigener Wirkstoff-Katalog statt externer API
- **Status:** Accepted
- **Kontext:** Für Wechselwirkungen und Einnahmezeitpunkte gibt es keine freie API (RxNav wurde 2024 abgeschaltet; DrugBank, ABDA, ifap sind kommerziell).
- **Entscheidung:** Kuratierter Katalog `backend/daten/wirkstoffe.json` mit 30 Wirkstoffen, 36 Regeln und **Quelle zu jeder Regel**.
- **Alternativen:** kommerzielle Datenbank; Regeln aus Beipackzetteln automatisch auslesen.
- **Begründung:** Nachvollziehbar, kostenlos, jede Regel belegt; erweiterbar, ohne Code zu ändern.
- **Konsequenzen:** + verständlich und prüfbar · − muss von Hand gepflegt werden, deckt nicht alle Mittel ab. Ein Test prüft, dass alle Verweise im Katalog stimmen.

### ADR-006: Feste Zeitfenster und einfacher Planer
- **Status:** Accepted
- **Kontext:** Mittel sollen so verteilt werden, dass Abstandsregeln eingehalten werden.
- **Entscheidung:** 6 feste Zeitfenster; Planer sortiert (Medikamente zuerst, dann wer weniger Zeitfenster hat) und nimmt für jedes Mittel das erste empfohlene Zeitfenster ohne Konflikt – sonst das beste mit Konflikt-Hinweis.
- **Alternativen:** freie Uhrzeiten mit Optimierung (Constraint-Solver); Nutzer plant selbst.
- **Begründung:** In wenigen Sätzen erklärbar und testbar; Menschen denken ohnehin in „zum Frühstück“.
- **Konsequenzen:** + einfach, deterministisch · − findet nicht in jedem Fall die beste Verteilung; nicht lösbare Fälle werden gemeldet statt gelöst.

### ADR-007: Kein Login
- **Status:** Accepted
- **Kontext:** Die App läuft lokal für eine Person; laut Modul ist ein „komplexes Login-System nicht erforderlich“.
- **Entscheidung:** keine Benutzerkonten.
- **Alternativen:** Session-Login mit Benutzerkonten.
- **Konsequenzen:** + kleiner Umfang · − nicht für mehrere Personen oder Online-Betrieb geeignet.
- **Folgen:** neu prüfen, sobald die App online gestellt wird (dann zusätzlich Gesundheitsdaten nach DSGVO Art. 9).

### ADR-008: Keine Dosis-Empfehlung
- **Status:** Accepted
- **Kontext:** Denkbar wäre, aus Körpergewicht oder Laborwerten auszurechnen, was man wie viel nehmen soll.
- **Entscheidung:** Die App berechnet **keine** Dosis. Dosis und Stärke trägt der Nutzer ein (Packungsbeilage / Arzt).
- **Alternativen:** Dosis-Empfehlung aus Körpergewicht oder Laborwerten.
- **Begründung:** Medizinisch riskant (Laborwerte brauchen ärztliche Einordnung, z. B. Überdosierung bei Vitamin D möglich); eine App mit persönlicher Dosis-Empfehlung wäre sehr wahrscheinlich ein Medizinprodukt (EU-MDR).
- **Konsequenzen:** + sicher und rechtlich unkritisch · − Nutzer muss Dosis selbst kennen.

### ADR-009: Backend liefert das Frontend aus (Ein-Klick-Start)
- **Status:** Accepted
- **Kontext:** Zum Entwickeln laufen zwei Programme (Vite auf 5173, Deno auf 8000); zum Benutzen ist das umständlich.
- **Entscheidung:** Das Frontend wird gebaut (`frontend/dist`) und vom Backend mit ausgeliefert; `Einnahmeplaner.bat` öffnet die App in einem Edge-Fenster ohne Adressleiste.
- **Alternativen:** Online-Hosting (z. B. Deno Deploy); Desktop-App (Electron).
- **Konsequenzen:** + ein Doppelklick, ein Programm · − läuft nur auf dem eigenen Rechner; Erinnerungen nur, solange das Fenster offen ist.
