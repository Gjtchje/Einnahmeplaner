# Einnahmeplaner – einfach erklärt

Diese Erklärung ist zum Lernen fürs Prüfungsgespräch. Lies sie am besten mit dem Code daneben.

---

## 1. Was macht die App?

Du trägst ein, welche Nahrungsergänzungsmittel oder Medikamente du nimmst.
Die App verteilt sie auf sechs feste **Zeitfenster** am Tag:

> nüchtern · Frühstück · Vormittag · Mittagessen · Abendessen · vor dem Schlafen

Dabei achtet sie darauf, dass Mittel, die sich gegenseitig stören (z. B. Eisen und Calcium), **genug Abstand** haben.
Auf der Seite „Heute“ hakst du ab, was du genommen hast. Der Vorrat zählt dabei runter.

Die App rechnet **keine Dosis** aus. Die Dosis trägst du selbst ein (Packungsbeilage oder Arzt).

---

## 2. Die zwei Teile: Frontend und Backend

```
  Browser                                   Server (Deno)
┌─────────────────┐   fragt z. B.      ┌──────────────────────────┐
│  Frontend (Vue) │   GET /api/plan    │  Backend                 │
│  zeigt an       │ ─────────────────► │  prüft, rechnet,         │
│  und nimmt      │ ◄───────────────── │  speichert               │
│  Klicks an      │   Antwort: JSON    │                          │
└─────────────────┘                    └──────────────────────────┘
```

- **Frontend** (Ordner `frontend`): Das sieht man im Browser. Es zeigt Daten an und schickt Klicks weiter. Es rechnet selbst nichts Wichtiges aus.
- **Backend** (Ordner `backend`): Das „Gehirn“. Es prüft Eingaben, berechnet den Plan und speichert alles in der Datenbank.
- Beide reden nur über **Adressen** wie `/api/plan` miteinander (das ist die **REST-API**). Die Daten werden als **JSON** verschickt.

**Warum getrennt?** Jeder Teil hat eine klare Aufgabe. Man könnte das Frontend austauschen (z. B. gegen eine Handy-App), ohne das Backend zu ändern. Das nennt man **entkoppelt**.

---

## 3. Die Dateien – was steht wo?

### Backend (`backend/`)

| Datei | Was drin ist |
|---|---|
| `main.ts` | Der Server. Alle Adressen (Routen) der API. Startet auf Port 8000. |
| `planer.ts` | ★ Das Herzstück: verteilt die Mittel auf die Zeitfenster. |
| `modell.ts` | Wie die Daten aussehen + Prüfregeln (Zod). Lädt den Katalog. |
| `datenbank.ts` | Speichern und Laden mit Deno KV. |
| `beispieldaten.ts` | 7 Präparate für den ersten Start. |
| `planer_test.ts` | 8 Tests für den Planer. |
| `daten/wirkstoffe.json` | Der **Katalog**: 30 Wirkstoffe (inkl. Protein), ihre besten Zeitfenster, 36 Regeln, 20 Quellen. |

### Frontend (`frontend/src/`)

| Datei | Was drin ist |
|---|---|
| `main.ts` | Startet die Vue-App. |
| `App.vue` | Der Rahmen: Navigation oben, Seite in der Mitte, Hinweis unten. |
| `router.ts` | Welche Adresse zeigt welche Seite (`/`, `/praeparate`, `/tagesablauf`). |
| `api.ts` | Alle Anfragen ans Backend + die Typen der Daten. |
| `views/HeuteView.vue` | Startseite: Plan zum Abhaken, Tages-Knöpfe Mo–So, Hinweise, Nachkaufen, Erinnerungen. |
| `views/PraeparateView.vue` | Präparate anlegen, ändern, löschen. |
| `views/TagesablaufView.vue` | Uhrzeiten der Zeitfenster einstellen. |
| `components/ZeitfensterKarte.vue` | Ein Kasten auf „Heute“, z. B. „07:30 Frühstück“ mit Checkboxen. |
| `components/PraeparatZeile.vue` | Eine Zeile in der Präparate-Liste mit „Ändern“ und „Löschen“. |
| `style.css` | Aussehen der ganzen App. |

---

## 3b. Die Daten (Datenmodell)

| Was | Bedeutung | Wo gespeichert | Wer ändert es? |
|---|---|---|---|
| **Wirkstoff** | z. B. Eisen: beste Zeitfenster + Hinweise | `wirkstoffe.json` (fest) | niemand – nur ich als Entwickler |
| **Regel** | Beziehung zwischen zwei Wirkstoffen: `abstand`, `zusammen` oder `warnung` | `wirkstoffe.json` (fest) | niemand |
| **Präparat** | ein Mittel des Nutzers: Name, Wirkstoff, Dosis, Stärke (z. B. 500 mg, optional), wie oft am Tag, Wochentage, Vorrat | Deno KV `["praeparate", id]` | Nutzer (Seite „Präparate“) |
| **Tagesablauf** | Uhrzeit für jedes der 6 Zeitfenster | Deno KV `["tagesablauf"]` | Nutzer (Seite „Tagesablauf“) |
| **Einnahme** | ein Haken: „Präparat X am Tag Y im Zeitfenster Z genommen“ | Deno KV `["einnahmen", datum, praeparatId, slot]` | Nutzer (Checkbox auf „Heute“) |

- Jedes Präparat gehört zu **genau einem** Wirkstoff. Ein Wirkstoff kann zu **vielen** Präparaten gehören (1 : N).
- Ein Präparat hat **viele** Einnahmen, eine pro Tag und Zeitfenster (1 : N).
- Der **Plan** wird nicht gespeichert, sondern jedes Mal aus Präparaten + Tagesablauf + Regeln berechnet.
- **Vorrat** zählt Einnahmen: Jeder Haken zieht 1 ab, Haken entfernen gibt 1 zurück. „Bald nachkaufen“ erscheint, wenn der Vorrat für weniger als 7 Tage reicht.
- Der Schlüssel `["einnahmen", datum, …]` ist absichtlich so gebaut: Mit `kv.list({ prefix: ["einnahmen", "2026-11-09"] })` bekommt man alle Haken eines Tages auf einmal.

---

## 4. Der Planer (`backend/planer.ts`) – Schritt für Schritt

Im Katalog steht für jeden Wirkstoff, welche Zeitfenster am besten sind (das beste zuerst):
- Eisen: nüchtern, Vormittag
- Calcium: Mittagessen, Abendessen, Frühstück
- L-Thyroxin: nüchtern, vor dem Schlafen

Und es gibt **Abstandsregeln**, z. B.: *Eisen und L-Thyroxin brauchen 2 Stunden Abstand.*

Der Planer macht drei Schritte:

**Schritt 1 – Sortieren:**
Medikamente kommen zuerst, weil ihr Zeitpunkt wichtiger ist.
Danach kommt dran, wer die **wenigsten** Zeitfenster zur Auswahl hat. Wer weniger Möglichkeiten hat, darf zuerst wählen.

**Schritt 2 – Zeitfenster vergeben:**
Für jedes Präparat: Geh die empfohlenen Zeitfenster der Reihe nach durch und nimm das **erste ohne Konflikt**.
Ein *Konflikt* heißt: Es liegt schon ein Mittel in der Nähe, und die Abstandsregel wäre verletzt (Funktion `findeKonflikt`).
Gibt es kein Zeitfenster ohne Konflikt, kommt das Mittel trotzdem ins beste Zeitfenster, und der Plan zeigt eine **Konflikt-Warnung**. Es wird nichts verschwiegen.

**Schritt 3 – Hinweise sammeln:**
Gute Paare (z. B. Vitamin D + K2) ergeben einen **Tipp**. Gefährliche Paare (z. B. Vitamin K2 + Marcumar) ergeben eine **Warnung**.

### Beispiel mit den Beispieldaten

Uhrzeiten: nüchtern 07:00 · Frühstück 07:30 · Vormittag 10:00 · Mittag 12:30 · Abendessen 18:30 · Schlafen 22:00

| Mittel | Was der Planer probiert | Ergebnis |
|---|---|---|
| L-Thyroxin (Medikament, also zuerst) | nüchtern – noch nichts da | **07:00 nüchtern** |
| Eisen | nüchtern? 0 Std. Abstand zu Thyroxin ✗ → Vormittag? 3 Std. ✓ | **10:00 Vormittag** |
| Magnesium | vor dem Schlafen – weit weg von allem ✓ | **22:00** |
| Vitamin D | Frühstück – keine Regel ✓ | **07:30** |
| Vitamin K2 | Frühstück ✓ | **07:30** |
| Zink | Abendessen – 3,5 Std. bis Magnesium ✓ | **18:30** |
| Calcium | Mittagessen – 2,5 Std. nach Eisen ✓ | **12:30** |

**Zum Vorführen:** Unter „Tagesablauf“ den Vormittag auf 08:00 stellen. Dann liegt Eisen nur 1 Stunde nach Thyroxin, und auf „Heute“ erscheint ein Konflikt.

---

## 4b. Wochenplan und Erinnerungen

**Wochentage:** Jedes Präparat hat eine Liste `tage`, z. B. `[1, 3, 5]` = Montag, Mittwoch, Freitag (wie in JavaScript: 0 = Sonntag, 1 = Montag … 6 = Samstag).
Oben auf „Heute“ gibt es Knöpfe für Montag bis Sonntag. Klickt man einen Tag an, fragt das Frontend `GET /api/plan?datum=2026-11-11`.
Das Backend nimmt dann nur die Präparate, die an diesem Wochentag dran sind (Funktion `praeparateAm` in `planer.ts`), und gibt sie an den Planer.
Der Planer selbst musste dafür nicht geändert werden.

**Erinnerungen:** Alle 30 Sekunden prüft die Heute-Seite: Ist die Uhrzeit eines Zeitfensters erreicht (höchstens 30 Minuten her) und ist darin noch etwas offen? Dann zeigt der Browser eine Benachrichtigung (`new Notification(...)`), pro Zeitfenster nur einmal.
Mit „Test-Benachrichtigung“ kann man ausprobieren, ob Benachrichtigungen überhaupt ankommen. Falls nicht, sind sie im Browser oder in Windows ausgeschaltet.

---

## 5. Was passiert, wenn ich etwas anklicke?

### Beispiel: Präparat speichern

1. Du füllst auf der Seite „Präparate“ das Formular aus und klickst **Speichern**.
2. `PraeparateView.vue` ruft `api.erstellePraeparat(...)` auf.
3. `api.ts` schickt die Daten mit `fetch` an `POST /api/praeparate`.
4. `main.ts` nimmt die Anfrage an und prüft sie mit **Zod** (`praeparatSchema` aus `modell.ts`).
   - Falsch (z. B. Name zu kurz)? → Antwort **400** mit Fehlermeldung → steht rot unter dem Formular.
5. Richtig? → Der Server gibt dem Präparat eine **id** und speichert es (`datenbank.ts`).
6. Antwort **201** („angelegt“). Das Frontend lädt die Liste neu.

### Beispiel: Abhaken

1. Du klickst auf „Heute“ eine Checkbox.
2. Das Frontend schickt `POST /api/einnahmen/umschalten` mit Datum, Präparat und Zeitfenster.
3. Der Server schaut: Ist schon ein Haken da?
   - Nein → Haken speichern **und** Vorrat −1
   - Ja → Haken löschen **und** Vorrat +1
4. Beides passiert mit `kv.atomic()`, also **zusammen oder gar nicht**. So können Haken und Vorrat nie auseinanderlaufen.

---

## 6. Wichtige Begriffe

| Begriff | Einfach erklärt | Wo im Code |
|---|---|---|
| **REST-API** | Feste Adressen, über die Frontend und Backend reden | `main.ts` |
| **GET / POST / PUT / DELETE** | Lesen / Anlegen / Ändern / Löschen | `main.ts`, `api.ts` |
| **JSON** | Textformat für Daten, z. B. `{ "name": "Zink" }` | überall |
| **Statuscode** | Zahl in der Antwort: 200 ok, 201 angelegt, 204 gelöscht, 400 falsche Eingabe, 404 nicht gefunden, 500 Fehler im Server | `main.ts` |
| **Fehlerbehandlung** | Unbekannte Adresse → 404, kaputtes JSON → 400, unerwarteter Fehler → 500 (statt Absturz) | `main.ts`, Abschnitt „Fehlerbehandlung“ |
| **Zod** | Prüft, ob Daten richtig sind, bevor sie gespeichert werden | `modell.ts` |
| **Deno KV** | Einfache Datenbank: Wert unter einem Schlüssel speichern | `datenbank.ts` |
| **Hono** | Kleines Framework für die Routen des Servers | `main.ts` |
| **`ref()`** | Ein Wert in Vue. Ändert er sich, ändert sich die Anzeige automatisch | Views |
| **`computed()`** | Ein Wert, der aus anderen berechnet wird, z. B. „3 von 7 erledigt“ | `HeuteView.vue` |
| **`v-model`** | Verbindet ein Eingabefeld mit einer Variablen | `PraeparateView.vue` |
| **`v-for` / `v-if`** | Liste anzeigen / nur anzeigen, wenn … | Views |
| **`onMounted`** | Code, der läuft, sobald die Seite angezeigt wird (Daten laden) | Views |
| **Router** | Zeigt je nach Adresse eine andere Seite | `router.ts` |
| **Komponente** | Ein wiederverwendbarer Baustein der Oberfläche (eine `.vue`-Datei) | `components/` |
| **props** | Daten, die eine Seite an eine Komponente gibt | `ZeitfensterKarte.vue` |
| **emit** | Nachricht von der Komponente an die Seite, z. B. „wurde angeklickt“ | `PraeparatZeile.vue` |
| **Vite-Proxy** | Leitet im Entwicklungsmodus `/api/...` vom Frontend (Port 5173) an das Backend (Port 8000) weiter | `vite.config.ts` |

---

## 7. Warum habe ich es so gemacht? (Entscheidungen)

- **Eigener Katalog statt fremder API:** Es gibt keine kostenlose API für Wechselwirkungen (die US-API RxNav wurde 2024 abgeschaltet, gute deutsche Datenbanken kosten Geld). Deshalb steht alles in `wirkstoffe.json`, **mit Quelle zu jeder Regel**.
- **Feste Zeitfenster statt freier Uhrzeiten:** einfacher zu rechnen, zu testen und zu erklären. Menschen denken eh in „zum Frühstück“.
- **Plan wird immer neu berechnet, nicht gespeichert:** Er ist dadurch nie veraltet.
- **Logik im Backend:** Der Planer steht an einer Stelle und kann ohne Browser getestet werden.
- **Keine Dosis-Berechnung:** Das ist Aufgabe von Arzt und Packungsbeilage.
- **Kein Login:** Die App ist für eine Person auf dem eigenen Rechner. So bleibt das Projekt klein.

---

Die ausführliche Fassung dieser Entscheidungen steht in **`ARCHITEKTUR.md`** – im Format, das Dr. Mester im Begleitdokument vorschlägt (Architektur-Steckbrief + ADRs).
Dort steht auch, warum die App bewusst **keine Dosis aus Körpergewicht oder Laborwerten** empfiehlt (ADR-008).

---

## 8. Grenzen und was man noch machen könnte

- Erinnerungen kommen nur, solange die App offen ist. → Ausbau zur **PWA** (Service Worker + Push-Nachrichten)
- Kein Login → für mehrere Personen bräuchte man Benutzerkonten
- Bei einer echten Veröffentlichung: Eine App, die über Medikamente entscheidet, kann als **Medizinprodukt** gelten (EU-MDR), und Gesundheitsdaten sind nach **DSGVO** besonders geschützt.

---

## 9. Typische Fragen im Prüfungsgespräch

**Warum Frontend und Backend getrennt?**
Klare Aufgaben: Das Frontend zeigt an, das Backend prüft, rechnet und speichert. Sie reden nur über die REST-API. Beide Teile sind dadurch austauschbar und einzeln testbar.

**Warum sind ZeitfensterKarte und PraeparatZeile eigene Komponenten?**
Sie kommen mehrfach vor (ein Kasten pro Zeitfenster, eine Zeile pro Präparat). Als eigene Komponente steht das Aussehen nur an einer Stelle, und die Seite bleibt übersichtlich. Die Komponente bekommt Daten über **props** und meldet Klicks über **emit**. Mit dem Backend redet nur die Seite.

**Was macht Zod?**
Zod prüft jede Eingabe, bevor sie gespeichert wird. Ist etwas falsch, schickt der Server Status 400 mit einer Fehlermeldung zurück. Aus dem Zod-Schema entsteht außerdem automatisch der TypeScript-Typ.

**Warum prüfst du nicht nur im Browser?**
Prüfungen im Browser kann man umgehen, z. B. indem man die API direkt aufruft. Verlassen kann man sich nur auf die Prüfung im Backend.

**Erklär den Planer!**
→ Abschnitt 4. Kurz: sortieren, dann jedem Mittel das erste empfohlene Zeitfenster ohne Konflikt geben, sonst Warnung. Am besten mit dem Beispiel aus der Tabelle.

**Was passiert, wenn es keine Lösung gibt?**
Das Mittel wird trotzdem eingeplant, und der Plan zeigt eine Konflikt-Warnung. Dafür gibt es auch einen Test.

**Wie testest du?**
`planeTag()` braucht keine Datenbank. Gleiche Eingabe ergibt immer den gleichen Plan. Die Tests geben ein paar Präparate hinein und prüfen, in welchem Zeitfenster sie landen. Starten mit `test-backend.bat`.

**Was ist `kv.atomic()`?**
Mehrere Speichervorgänge, die zusammen passieren oder gar nicht. Beim Abhaken: Haken speichern und Vorrat verringern.

**Woher kommen die Daten?**
Selbst recherchiert aus frei zugänglichen Quellen (Verbraucherzentrale, Apotheken Umschau, PTAheute, Apothekerkammer Nordrhein, Gelbe Liste …). Die Quellen stehen in `wirkstoffe.json`.

**Was würdest du als Nächstes einbauen?**
Eine PWA, damit Erinnerungen auch bei geschlossener App kommen, und danach Benutzerkonten.

**Welche Rolle hatte KI?**
Ehrlich sagen: Claude (Anthropic) wurde für Recherche, Code und Erklärungen genutzt (steht auch in der Themenwahl). Zeig, dass du es verstanden hast, z. B. indem du den Planer live mit einem geänderten Tagesablauf vorführst.

---

## 10. Wie funktioniert der Ein-Klick-Start?

Beim Entwickeln laufen zwei Programme: Vite zeigt das Frontend (Port 5173), Deno das Backend (Port 8000).
Für den normalen Gebrauch ist das unpraktisch. Deshalb macht `Einnahmeplaner.bat` Folgendes:

1. **Frontend bauen** (`npm run build-only`): Vite macht aus den `.vue`- und `.ts`-Dateien fertige HTML-, CSS- und JavaScript-Dateien im Ordner `frontend/dist`.
2. **Backend starten**: Das Backend liefert jetzt **auch** diese fertigen Dateien aus (die zwei Zeilen mit `serveStatic` unten in `main.ts`). Es läuft also nur noch **ein** Programm auf Port 8000.
3. **Warten**: Jede Sekunde fragt `curl` beim Server nach. Erst wenn er antwortet, geht es weiter (beim ersten Start braucht Deno etwas länger).
4. **App-Fenster öffnen**: Edge wird mit `--app=http://localhost:8000` gestartet. Das ist ein Browserfenster ohne Adressleiste und Tabs – es sieht aus wie ein eigenes Programm.

Technisch ist es weiterhin `localhost` (der eigene Rechner) – man sieht es nur nicht mehr.

**Warum `index.html` für unbekannte Adressen?** Die Adressen `/praeparate` oder `/tagesablauf` gibt es als Datei gar nicht. Der Server schickt dann die `index.html`, und der Vue-Router zeigt die richtige Seite an.

---

## 11. Checkliste: Vorgaben von Dr. Mester

Aus den Folien „Das Prüfungsprojekt“ und „Technische Mindestanforderungen“:

| Vorgabe | Erfüllt durch |
|---|---|
| Daten anzeigen | Seiten „Heute“ und „Präparate“ |
| Daten anlegen / verändern / löschen | Präparate: `POST`, `PUT`, `DELETE /api/praeparate` |
| Daten persistent speichern | Deno KV (`datenbank.ts`), Datei in `backend/data/` |
| REST-API verwenden | `api.ts` ↔ `main.ts` |
| Sinnvolle Benutzeroberfläche | 3 Seiten, Navigation, Fehlermeldungen, Handy-tauglich |
| **Frontend:** Vue.js mit SFC + Composition API | `.vue`-Dateien mit `<script setup>` |
| TypeScript | `lang="ts"` in allen Vue-Dateien, `.ts`-Dateien |
| Komponentenorientierte Struktur | `App.vue`, 3 Views, 2 Komponenten (`components/`) |
| REST-Kommunikation | `fetch` in `api.ts` |
| **Backend:** Deno + Hono | `main.ts` |
| REST-API, JSON | alle Routen in `main.ts` antworten mit `c.json(...)` |
| Validierung | Zod-Schemas in `modell.ts`, `safeParse` in `main.ts` |
| Geschäftslogik | `planer.ts` (+ Vorrat beim Abhaken in `datenbank.ts`) |
| Persistente Datenhaltung | Deno KV |
| Fehlerbehandlung | 400 / 404 / 500 in `main.ts`, Fehlermeldungen im Frontend |
| **Projekt:** Git | GitHub: Gjtchje/Einnahmeplaner |
| Vite für das Frontend | `frontend/vite.config.ts` |
| Tests (Entwicklungsweg: „… Test, Dokumentation“) | `planer_test.ts` (8 Tests) |
| Dokumentation + Begründungen | `README.md`, diese Datei, `ARCHITEKTUR.md` (Steckbrief + ADRs) |
| Klein. Vollständig. Entkoppelt. Begründbar. | 4 Datenarten, alle Funktionen fertig, Frontend und Backend nur über die API verbunden |

