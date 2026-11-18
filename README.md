# Einnahmeplaner

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

Es kann immer nur **ein** Server gleichzeitig laufen (Port 8000). Vor dem Start einer anderen Version das Server-Fenster schließen.

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

Fehler kommen als `{ "fehler": "…" }` mit Status 400 (falsche Eingabe), 404 (nicht gefunden) oder 500 (Fehler im Server).

Die Architekturbeschreibung (Steckbrief, Entscheidungen als ADRs, Diagramme) steht in **ARCHITEKTUR.md**.

## Quellen

Die Einnahmeregeln und Hinweise im Katalog (`backend/daten/wirkstoffe.json`) stammen aus diesen frei zugänglichen Quellen. In der JSON-Datei steht bei jeder Regel, auf welche Quelle sie sich bezieht. Stand: 2026-11-18.

- [Verbraucherzentrale – Wechselwirkungen, Nebenwirkungen, Gegenanzeigen von Nahrungsergänzungen](https://www.verbraucherzentrale.de/wissen/lebensmittel/nahrungsergaenzungsmittel/wechselwirkungen-nebenwirkungen-gegenanzeigen-von-nahrungsergaenzungen-50991)
- [Apotheken Umschau – Eisen richtig einnehmen](https://www.apotheken-umschau.de/medikamente/basiswissen/eisen-richtig-einnehmen-719457.html)
- [Apotheken Umschau – Blutgerinnungshemmer: warum bei manchen Lebensmitteln mit Vitamin K Vorsicht geboten ist](https://www.apotheken-umschau.de/medikamente/blutgerinnungshemmer-bei-manche-lebensmitteln-mit-vitamin-k-ist-vorsicht-geboten-1226265.html)
- [APOTHEKE ADHOC – Fünf Tipps zur Magnesium-Einnahme](https://www.apotheke-adhoc.de/nachrichten/detail/pta-live/fuenf-tipps-zur-magnesium-einnahme-mineralstoffe/)
- [PTAheute – Muss L-Thyroxin immer morgens nüchtern eingenommen werden?](https://www.ptaheute.de/aktuelles/2018/04/03/muss-l-thyroxin-immer-morgens-nuechtern-eingenommen-werden)
- [PTAheute – Antibiotikatherapie: Wann sind Probiotika indiziert?](https://www.ptaheute.de/wissen-am-hv/darmgesundheit/antibiotikatherapie-wann-sind-probiotika-indiziert)
- [aponet.de – So entfalten Antibiotika ihre volle Wirkung: die wichtigsten Tipps](https://www.aponet.de/artikel/so-entfalten-antibiotika-ihre-volle-wirkung-die-wichtigsten-tipps-32438)
- [Apotheken Umschau – Beipackzettel Alendronsäure dura 70 mg Tabletten](https://www.apotheken-umschau.de/medikamente/beipackzettel/alendronsaeure-dura-70-mg-tabletten-735345.html)
- [DocCheck Flexikon – Pantoprazol](https://flexikon.doccheck.com/de/Pantoprazol)
- [Verbraucherzentrale – Nahrungsergänzungsmittel richtig verwenden](https://www.verbraucherzentrale.de/wissen/lebensmittel/nahrungsergaenzungsmittel/nahrungsergaenzungsmittel-richtig-verwenden-27747)
- [Verbraucherzentrale – Whey-Protein: Was sollten Sie über Molkenprotein wissen?](https://www.verbraucherzentrale.de/wissen/lebensmittel/nahrungsergaenzungsmittel/wheyprotein-was-sollten-sie-ueber-molkenprotein-wissen-80650)
- [Verbraucherzentrale – Kreatin: Wirkung, Risiken und was beim Kauf wichtig ist](https://www.verbraucherzentrale.de/wissen/lebensmittel/nahrungsergaenzungsmittel/kreatin-wirkung-risiken-und-was-beim-kauf-wichtig-ist-8089)
- [Verbraucherzentrale – Melatonin zum Einschlafen](https://www.verbraucherzentrale.de/wissen/lebensmittel/melatonin-zum-einschlafen-wie-sinnvoll-sind-produkte-wie-sprays-118307)
- [APOTHEKE ADHOC – Kein Coenzym Q10 mit Marcumar](https://www.apotheke-adhoc.de/nachrichten/detail/pta-live/kein-coenzym-q10-mit-marcumar/)
- [Verbraucherzentrale – Kurkuma: Fakten und Mythen](https://www.verbraucherzentrale.de/wissen/lebensmittel/nahrungsergaenzungsmittel/kurkuma-fakten-und-mythen-13696)
- [Deutsches Apothekenportal – Beratungswissen Jod](https://www.deutschesapothekenportal.de/download/public/beratungsleitfaeden/dap_beratungswissen_jod.pdf)
- [Apotheken Umschau – Ibuprofen: Wie es wirkt, Wechselwirkungen, Tipps](https://www.apotheken-umschau.de/medikamente/wirkstoffe/ibuprofen-wie-es-wirkt-wechselwirkungen-tipps-718699.html)
- [PTAheute – ASS 100 mg und Ibuprofen: eine häufige Interaktion](https://www.ptaheute.de/serien/haeufige-interaktionen/ass-100-mg-und-ibuprofen-eine-haeufige-interaktion)
- [Apotheken Umschau – Metformin: Wirkung, Nebenwirkungen](https://www.apotheken-umschau.de/medikamente/wirkstoffe/metformin-wie-es-wirkt-was-sie-wissen-muessen-850953.html)
- [Apotheken Umschau – Simvastatin: Wirkung, Nebenwirkungen, Anwendungshinweise](https://www.apotheken-umschau.de/medikamente/wirkstoffe/simvastatin-wirkung-nebenwirkungen-anwendungshinweise-877911.html)

Die App gibt nur allgemeine Hinweise und ersetzt keine ärztliche oder pharmazeutische Beratung.

## Einsatz von KI

Bei der Entwicklung habe ich Claude (Anthropic) als Hilfsmittel benutzt:

- **Recherche:** Wirkstoffe, Einnahmeregeln und passende Quellen für `wirkstoffe.json` (jede Regel hat eine Quellenangabe).
- **Code:** Vorschläge für Backend und Frontend, die ich ausprobiert, angepasst und mir erklären lassen habe.
- **Erklärungen und Doku:** Hilfe beim Verstehen der Konzepte (REST, Zod, Deno KV, Vue) und beim Schreiben der Doku (`README.md`, `ARCHITEKTUR.md`).

Entscheidungen wie „keine Dosis-Empfehlung“, „kein Login“ und „Plan wird berechnet statt gespeichert“ habe ich bewusst getroffen (siehe ADRs in `ARCHITEKTUR.md`).
