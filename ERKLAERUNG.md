# Einnahmeplaner – Erklärung fürs Prüfungsgespräch

Dieses Dokument erklärt jeden Teil der App so, dass du ihn selbst wiedergeben kannst.
Tipp: Lies es mit dem Code daneben. Die Dateinamen stehen jeweils dabei.

---

## 1. Die App in drei Sätzen

1. Man trägt ein, welche Nahrungsergänzungsmittel und Medikamente man nimmt und wie oft.
2. Die App verteilt sie automatisch auf sechs Zeitfenster des Tages (nüchtern, Frühstück, Vormittag, Mittag, Abendessen, vor dem Schlafen), sodass Mittel, die sich gegenseitig stören, genug Abstand haben.
3. Auf der Seite „Heute“ hakt man die Einnahmen ab, der Vorrat zählt mit, und auf Wunsch erinnert der Browser zur richtigen Zeit.

**Was die App bewusst NICHT macht:** Sie berechnet keine Dosis. Menge und Häufigkeit gibt der Nutzer ein (Packungsbeilage/Arzt). Sie gibt nur allgemeine, belegte Einnahmehinweise.

---

## 2. Architektur: Client + Backend (entkoppelt)

```
 Browser (Vue-App)                      Deno-Server
┌──────────────────────┐   HTTP/JSON   ┌───────────────────────────┐
│ Views  (Seiten)      │  fetch('/api')│ app.ts     Routen (Hono)  │
│ api.ts (alle fetch)  │ ────────────► │ modell.ts  Prüfung (Zod)  │
│ composables          │ ◄──────────── │ planer.ts  Planungslogik  │
└──────────────────────┘               │ speicher.ts ─► Deno KV    │
        ▲                              │ katalog.ts ─► wirkstoffe. │
        │ Vite-Dev-Server (Port 5173)  │               json        │
        └── leitet /api an Port 8000   └───────────────────────────┘
```

- **Frontend** (Vue 3 + TypeScript): nur Anzeige und Bedienung. Es rechnet keinen Plan und prüft keine Regeln.
- **Backend** (Deno + Hono): die ganze Logik. Daten prüfen, speichern, Plan berechnen.
- Die beiden reden **nur über die REST-API** (JSON über HTTP). Man könnte das Frontend austauschen (z. B. eine native App), ohne das Backend zu ändern. Das heißt „entkoppelt“.
- **Vite-Proxy** (`frontend/vite.config.ts`): Im Entwicklungsmodus schickt das Frontend alles an `/api/...` an sich selbst, und Vite leitet es an `localhost:8000` weiter. Dadurch gibt es keine CORS-Probleme.

**Warum die Logik im Backend?** Regeln und Plan sollen an *einer* Stelle stehen. Würde der Browser rechnen, könnte jeder Client etwas anderes anzeigen, und die Tests müssten im Browser laufen.

### Schichten im Backend

| Datei | Aufgabe | kennt … |
|---|---|---|
| `main.ts` | Start: DB öffnen, Beispieldaten, Server auf Port 8000 | app, speicher |
| `app.ts` | HTTP: Routen, Statuscodes, Fehlerformat | modell, planer, speicher, katalog |
| `modell.ts` | Datenmodell + Validierung (Zod) | katalog |
| `planer.ts` | Fachlogik: Tagesplan berechnen | katalog, modell |
| `speicher.ts` | Datenbankzugriff (Deno KV) | modell |
| `katalog.ts` | Wirkstoffe/Regeln aus JSON laden | – |

Der Planer weiß nichts von HTTP oder Datenbank. Er bekommt Daten und gibt einen Plan zurück. Deshalb lässt er sich so leicht testen.

---

## 3. Datenmodell

| Entität | Bedeutung | Identität | Wo gespeichert |
|---|---|---|---|
| **Wirkstoff** | z. B. Eisen, mit erlaubten Zeitfenstern und Hinweisen | Text-ID (`"eisen"`) | fest in `daten/wirkstoffe.json` |
| **Regel** | Beziehung zwischen zwei Wirkstoffen: `abstand`, `zusammen`, `warnung` | Paar a/b | fest in `wirkstoffe.json` |
| **Quelle** | Beleg für Hinweise und Regeln | Text-ID | fest in `wirkstoffe.json` |
| **Präparat** | ein Mittel des Nutzers („Vitamin D3 Tropfen“) → gehört zu genau 1 Wirkstoff | UUID | Deno KV `["praeparate", id]` |
| **Tagesablauf** | Uhrzeit für jedes der 6 Zeitfenster | – (gibt es einmal) | Deno KV `["tagesablauf"]` |
| **Einnahme** | „Präparat X am Tag Y im Zeitfenster Z genommen“ | Datum + Präparat + Zeitfenster | Deno KV `["einnahmen", datum, id, slot]` |

Beziehungen: Wirkstoff 1 : N Präparat · Präparat 1 : N Einnahme · Regel verbindet 2 Wirkstoffe.

**Der Plan wird nicht gespeichert, sondern bei jedem `GET /api/plan` neu berechnet.** Dadurch ist er nie veraltet: Ändert man ein Präparat oder den Tagesablauf, stimmt der Plan sofort.

**Deno KV** ist ein Key-Value-Speicher: Man speichert unter einem Schlüssel (ein Array wie `["praeparate", "abc-123"]`) einen Wert. Mit `kv.list({ prefix: ["einnahmen", "2026-11-02"] })` bekommt man alle Einträge, deren Schlüssel so anfängt. Der Schlüssel `["einnahmen", datum, …]` ist also absichtlich so gebaut, dass man alle Einnahmen eines Tages schnell findet.

### Geschäftsregeln und Invarianten (was nie verletzt werden darf)

- Ein Präparat hat immer einen bekannten Wirkstoff (`modell.ts`, `refine`).
- 1–3 Einnahmen pro Tag, Menge > 0, Vorrat ≥ 0 oder `null` (= nicht zählen).
- Die Uhrzeiten im Tagesablauf liegen in der Reihenfolge des Tages (sonst wären Abstände sinnlos).
- Eine Einnahme kann pro Tag und Zeitfenster nur einmal abgehakt werden (→ 409).
- **Abhaken und Vorrat ändern passieren immer zusammen** (siehe Abschnitt 5).
- `id`, `erstelltAm`, `geaendertAm` setzt nur der Server. Das Eingabe-Schema lässt sie gar nicht zu.

---

## 4. Das Herzstück: der Planer (`backend/planer.ts`)

### Die Idee

Jeder Wirkstoff hat eine Liste **empfohlener Zeitfenster, die beste zuerst**, z. B.:
- Eisen: `nüchtern`, `vormittag`
- Calcium: `mittag`, `abendessen`, `frühstück`
- Magnesium: `schlafen`, `abendessen`

Dazu kommen **Abstandsregeln**, z. B. „Eisen ↔ Calcium: mindestens 2 Stunden“.

### Der Ablauf in drei Schritten

**Schritt 1: Reihenfolge festlegen** (`sort` am Anfang von `planeTag`)
1. Medikamente vor Nahrungsergänzung, weil ihr Zeitpunkt wichtiger ist.
2. Dann: wer **weniger** empfohlene Zeitfenster hat, kommt zuerst. Wer weniger Auswahl hat, darf zuerst wählen (wie beim Verteilen von Plätzen).
3. Bei Gleichstand alphabetisch, damit der Plan immer gleich aussieht.

**Schritt 2: Für jede Einnahme ein Zeitfenster suchen**, in drei Stufen:
- **a)** das erste *empfohlene* Zeitfenster **ohne Konflikt**
- **b)** sonst irgendein *anderes* freies Zeitfenster ohne Konflikt → Meldung „ausgewichen“
- **c)** sonst das beste empfohlene **trotz** Konflikt → Meldung „Konflikt“ (mit Quelle)

„Konflikt“ heißt (Funktion `findeKonflikte`): Es gibt eine Abstandsregel zwischen dem neuen Mittel und einem schon verplanten Mittel, und die Uhrzeiten der beiden Zeitfenster liegen näher beieinander als die Regel verlangt.
Die Uhrzeiten kommen aus dem Tagesablauf. Deshalb kann derselbe Plan bei jemandem, der spät frühstückt, anders aussehen.

Wird ein Präparat 2- oder 3-mal täglich genommen, läuft Schritt 2 entsprechend oft. Ein Zeitfenster, in dem dieses Präparat schon liegt, ist dabei tabu.

**Schritt 3: Tipps und Warnungen sammeln**
- `zusammen`-Regel (z. B. Vitamin D + K2): Liegen beide im selben Zeitfenster → „gut so“, sonst Tipp.
- `warnung`-Regel (z. B. Vitamin K2 + Marcumar): immer anzeigen. Das kann der Planer nicht lösen, hier muss ein Arzt entscheiden.

**Wichtig:** Der Planer verschweigt nie etwas. Wenn er keine gute Lösung findet, plant er das Mittel trotzdem ein und sagt deutlich, was nicht passt.

### Durchgerechnetes Beispiel (die Beispieldaten, Standard-Tagesablauf)

Uhrzeiten: nüchtern 07:00 · Frühstück 07:30 · Vormittag 10:00 · Mittag 12:30 · Abendessen 18:30 · Schlafen 22:00

Reihenfolge nach Schritt 1: L-Thyroxin (Medikament) → Eisen, Magnesium, Vitamin D, Vitamin K2, Zink (je 2 Zeitfenster, alphabetisch) → Calcium (3 Zeitfenster)

| Mittel | probiert | Ergebnis |
|---|---|---|
| L-Thyroxin | nüchtern 07:00, noch nichts verplant | **nüchtern** |
| Eisen | nüchtern 07:00 → 0 Min. Abstand zu Thyroxin, Regel will 2 h ✗ · Vormittag 10:00 → 3 h ✓ | **Vormittag** |
| Magnesium | Schlafen 22:00, weit weg von allem ✓ | **Schlafen** |
| Vitamin D | Frühstück, keine Regel betroffen ✓ | **Frühstück** |
| Vitamin K2 | Frühstück ✓ | **Frühstück** (+ Tipp „gut so“ mit Vitamin D) |
| Zink | Abendessen 18:30 → zu Magnesium 3,5 h, zu Eisen 8,5 h ✓ | **Abendessen** |
| Calcium | Mittag 12:30 → zu Eisen 2,5 h ✓, zu Thyroxin 5,5 h ✓, zu Zink 6 h ✓ | **Mittag** |

Das ist genau der Plan, den die App auf der Startseite zeigt.

**Zum Ausprobieren im Gespräch:** Unter „Tagesablauf“ den Vormittag auf 08:00 stellen → Eisen ist nur noch 1 h von Thyroxin weg → Konflikt-Meldung erscheint. Oder ein Calcium 3-mal täglich anlegen → die 3. Einnahme weicht aus, weil Frühstück zu nah am Thyroxin liegt.

### Warum feste Zeitfenster statt freier Uhrzeiten?

Mit freien Uhrzeiten wäre das ein echtes Optimierungsproblem (welche Uhrzeit für welches Mittel?). Mit sechs Zeitfenstern bleibt es eine einfache Schleife, die man nachvollziehen und testen kann. Und Menschen denken ohnehin in „zum Frühstück“ statt in „um 07:43“.

---

## 5. Datenfluss an zwei Beispielen

### a) Präparat speichern

1. `PraeparateView.vue`: Nutzer füllt das Formular aus und klickt „Speichern“ → `speichern()`
2. `api.ts`: `erstellePraeparat(form)` → `fetch('/api/praeparate', { method: 'POST', body: JSON })`
3. Vite-Proxy leitet an `localhost:8000` weiter
4. `app.ts`: Route `app.post("/api/praeparate", pruefe("json", praeparatEingabeSchema), …)`
5. **Zod prüft** die Daten (`modell.ts`). Fehler → **400** mit `details: [{ feld, meldung }]`
6. `bauePraeparat()` ergänzt `id` (UUID) und Zeitstempel → `praeparatSpeichern()` in `speicher.ts` → `kv.set(["praeparate", id], …)`
7. Antwort **201** mit dem Präparat plus berechneten Feldern (`reichweiteTage`, `nachkaufen`)
8. Frontend lädt die Liste neu. Bei 400 schreibt es jede Meldung unter das passende Feld (`feldFehler.name` usw.)

### b) Einnahme abhaken (mit Vorrat)

1. `HeuteView.vue`: Checkbox → `umschalten()` → `hakeAb({ datum, praeparatId, slot })`
2. `POST /api/einnahmen` → Zod prüft → `einnahmeAbhaken()` in `speicher.ts`
3. Dort passiert das Wichtige: **eine atomare Transaktion**

```ts
await kv.atomic()
  .check(einnahme, praeparat)     // hat sich seit dem Lesen etwas geändert?
  .set(einnahmeSchluessel, …)     // Haken speichern
  .set(praeparatSchluessel, …)    // Vorrat verringern
  .commit()                       // beides oder nichts
```

**Warum?** Es darf nie passieren, dass der Haken gespeichert ist, aber der Vorrat nicht gesunken ist (oder umgekehrt). Und wenn man in zwei Tabs gleichzeitig klickt, schlägt `check` beim zweiten fehl → **409** statt doppelt abgezogenem Vorrat.

4. Das **Datum bestimmt der Browser** (`useDatum.ts`), nicht der Server. „Heute“ hängt von der Zeitzone des Nutzers ab.

---

## 6. Validierung und Fehlerbehandlung

- **Zod** (`modell.ts`) beschreibt, wie gültige Daten aussehen. Aus dem Schema wird mit `z.infer` automatisch der TypeScript-Typ erzeugt, so gibt es nur *eine* Definition.
- `pruefe()` in `app.ts` ist eine kleine Hilfsfunktion: Sie wandelt Zod-Fehler in ein einheitliches Format um.
- Einheitliches Fehlerformat: `{ fehler: "…", details?: [...] }`
- Statuscodes: **200** ok · **201** angelegt · **204** gelöscht (kein Inhalt) · **400** ungültige Eingabe · **404** nicht gefunden · **409** Konflikt (schon abgehakt / gleichzeitige Änderung) · **500** unerwarteter Fehler
- `app.onError`: Unerwartete Fehler gehen ins Server-Log, der Client bekommt nur „Interner Serverfehler“. Interne Details gehören nicht nach außen (Security).
- Frontend: `api.ts` wirft bei Fehlern einen `ApiFehler` mit Status und Details. Ist der Server gar nicht erreichbar, kommt „Server nicht erreichbar. Läuft das Backend?“.

---

## 7. Frontend (Vue)

| Datei | Was sie zeigt/macht |
|---|---|
| `App.vue` | fester Rahmen: Navigation, `<RouterView />`, Hinweis unten |
| `router/index.ts` | Adressen → Seiten. „Heute“ sofort geladen, die anderen per **Lazy Loading** erst beim Besuch |
| `HeuteView.vue` | Plan, Abhaken, Fortschritt, Meldungen, Nachkaufen, Erinnerungen |
| `PraeparateView.vue` | Liste + Formular (Anlegen/Bearbeiten), Löschen mit Nachfrage |
| `TagesablaufView.vue` | sechs Uhrzeit-Felder |
| `WirkstoffeView.vue` | Nachschlagen: Regeln + Quellen, Details werden beim Aufklappen geladen |
| `components/FormFeld.vue` | Eingabefeld mit Label + Fehlermeldung, v-model-fähig über `defineModel()` |
| `components/MeldungsListe.vue` | Konflikte/Warnungen/Tipps mit Symbol und Quelle |
| `composables/useKatalog.ts` | lädt den Katalog **einmal** und teilt ihn mit allen Seiten |
| `composables/useErinnerungen.ts` | Benachrichtigungen (siehe unten) |
| `composables/useDatum.ts` | Datum/Uhrzeit-Helfer |

Vue-Begriffe, die du erklären können solltest:
- `ref()`: ein reaktiver Wert. Ändert er sich, aktualisiert Vue die Anzeige.
- `computed()`: ein abgeleiteter Wert, z. B. `anzahlErledigt`, wird automatisch neu berechnet.
- `reactive()`: reaktives Objekt (das Formular).
- `defineModel()`: macht eine eigene Komponente v-model-fähig.
- `onMounted` / `onUnmounted`: Code beim Anzeigen/Verlassen einer Seite (Daten laden, Timer starten/stoppen).
- **Composable**: eine Funktion `useXyz()`, die wiederverwendbare Logik samt Zustand bündelt.

**State – wo liegt was?**
- Server-State (Präparate, Plan, Einnahmen): im Backend. Das Frontend lädt ihn bei Bedarf neu.
- UI-/Formular-State: in der jeweiligen View (`ref`/`reactive`).
- URL-State: aktuelle Seite, `#eisen` auf der Wirkstoff-Seite.
- Lokal im Browser (`localStorage`): nur, ob Erinnerungen an sind.

---

## 8. Erinnerungen (`useErinnerungen.ts`)

1. Klick auf „Erinnerungen einschalten“ → `Notification.requestPermission()`, der Browser fragt den Nutzer.
2. Solange die Seite „Heute“ offen ist, prüft ein Timer alle 30 Sekunden: Ist die Uhrzeit eines Zeitfensters erreicht (bis 30 Min. danach) und ist dort noch etwas offen? → `new Notification(...)`.
3. Jedes Zeitfenster meldet sich pro Tag nur einmal.

**Grenze (ehrlich sagen!):** Bei geschlossenem Tab kommt keine Erinnerung. Dafür bräuchte man **Web Push** mit einem **Service Worker** und einem Push-Server. Das ist der geplante Ausbau zur PWA.

---

## 9. Tests (`test-backend.bat`)

19 Tests, alle mit `Deno.test`:
- `planer_test.ts` (13): einzelnes Mittel, Eisen/Calcium getrennt, Medikament hat Vorrang, 3× täglich, Ausweichen, unlösbarer Konflikt wird gemeldet, Abstand hängt vom Tagesablauf ab, Tipp, Warnung, gleiche Eingabe → gleicher Plan, **Katalog ist stimmig** (jede Regel zeigt auf existierende Wirkstoffe und Quellen).
- `app_test.ts` (6): CRUD, Validierung (400 mit Feldern), Tagesablauf-Reihenfolge, Abhaken mit Vorrat inkl. 409 bei doppeltem Abhaken, Plan, 404.

Die API-Tests rufen `app.request()` direkt auf, ohne echten Server, mit einer Datenbank nur im Arbeitsspeicher (`:memory:`). Deshalb ist der Server-Start (`main.ts`) von den Routen (`app.ts`) getrennt.

---

## 10. Entscheidungen (kurze ADRs)

| Entscheidung | Warum | Verworfen | Folge |
|---|---|---|---|
| **Eigener Regel-Datensatz** (JSON mit Quellen) | Es gibt keine freie Wechselwirkungs-API: RxNav wurde 2024 abgeschaltet, DrugBank/ABDA sind kommerziell | externe API | Daten müssen von Hand gepflegt werden; dafür ist jede Regel nachvollziehbar und belegt |
| **6 feste Zeitfenster** | einfach, erklärbar, testbar | freie Uhrzeiten mit Optimierung | weniger fein, aber verständlich |
| **Plan wird berechnet, nicht gespeichert** | nie veraltet | Plan speichern und bei Änderungen aktualisieren | etwas Rechenarbeit pro Aufruf (bei ≤ 20 Präparaten egal) |
| **Logik im Backend** | eine Wahrheit, testbar ohne Browser | Planer im Frontend | Frontend braucht das Backend |
| **Deno KV** | ohne extra Datenbank-Server, kennst du von ColorBlock, hat atomare Transaktionen | SQLite/PostgreSQL | einfache Abfragen genügen hier |
| **Kein Login** | Einzelnutzer-App auf dem eigenen Rechner, Umfang klein halten | Konten mit Passwort | nicht für mehrere Personen geeignet (Ausblick) |
| **Keine Dosisberechnung** | Verantwortung/Haftung; Dosis gehört zu Arzt/Packungsbeilage | Empfehlungen ausrechnen | App bleibt reines Planungswerkzeug |
| **Datum im Browser** | „heute“ hängt von der Zeitzone des Nutzers ab | Datum auf dem Server | Frontend schickt das Datum mit |

---

## 11. Grenzen und Ausblick

- Erinnerungen nur bei offenem Tab → **PWA mit Service Worker + Web Push**
- Kein Login, ein Nutzer → Konten, dann eigene Daten pro Nutzer (Ownership)
- Der Plan gilt für jeden Tag gleich → z. B. Wochentage oder „nur montags“ (Alendronsäure wird oft 1× pro Woche genommen)
- Regelwerk ist bewusst klein (19 Wirkstoffe, 29 Regeln) → erweiterbar, ohne Code zu ändern (nur JSON)
- Barcode-Scan über Open Food Facts zum schnellen Anlegen
- Löscht man ein Präparat, bleiben alte Einnahmen in der Datenbank (stören nicht, werden nur nicht mehr angezeigt)

---

## 12. Typische Prüfungsfragen – mit Antwort

**Warum sind Frontend und Backend getrennt?**
Klare Aufgabenteilung: Anzeige vs. Logik/Daten. Kommunikation nur über eine definierte REST-API. Das Backend ist unabhängig testbar, und das Frontend wäre austauschbar.

**Was macht Zod, und was passiert bei ungültigen Daten?**
Zod prüft jede Eingabe gegen ein Schema, bevor die Route sie sieht. Bei Fehlern antwortet der Server mit 400 und einer Liste „Feld – Meldung“, die das Frontend unter den Feldern anzeigt. Aus dem Schema kommt auch der TypeScript-Typ.

**Warum prüfst du nicht (nur) im Frontend?**
Frontend-Prüfungen kann man umgehen (z. B. mit einem direkten HTTP-Aufruf). Verlassen darf man sich nur auf die Prüfung im Backend.

**Erklär den Planer an einem Beispiel.**
→ Abschnitt 4, Tabelle. Kurzfassung: sortieren, dann für jedes Mittel das erste empfohlene Zeitfenster ohne Konflikt, sonst ausweichen, sonst Konflikt melden.

**Was ist, wenn es keine Lösung gibt?**
Das Mittel wird trotzdem eingeplant (im besten empfohlenen Zeitfenster), und der Plan zeigt eine Konflikt-Meldung mit Quelle. Nichts wird verschwiegen. Test: „Unlösbarer Konflikt wird gemeldet statt verschwiegen“.

**Wie testest du die Planungslogik?**
`planeTag` ist eine reine Funktion: gleiche Eingabe, gleiche Ausgabe, keine Datenbank. Die Tests bauen Präparate, rufen `planeTag` auf und prüfen, in welchem Zeitfenster sie landen.

**Was ist eine atomare Transaktion und wo nutzt du sie?**
Mehrere Schreibvorgänge, die entweder alle oder gar nicht passieren. Beim Abhaken: Haken speichern und Vorrat verringern. `check()` erkennt gleichzeitige Änderungen → 409.

**Warum Deno KV und keine relationale Datenbank?**
Kein extra Server nötig, einfache Schlüsselstruktur reicht, atomare Transaktionen sind eingebaut. Bei vielen Nutzern und komplexen Abfragen würde man auf PostgreSQL wechseln. Dafür müsste nur `speicher.ts` geändert werden.

**Woher kommen die Daten?**
Selbst recherchiert aus frei zugänglichen Quellen (Verbraucherzentrale, Apotheken Umschau, PTAheute, Apothekerkammer Nordrhein, Gelbe Liste …). Jede Regel nennt ihre Quelle, und ein Test prüft, dass alle Verweise stimmen.

**Was wäre bei einer Veröffentlichung zu beachten?**
Eine App, die *personalisiert* über Medikamenten-Einnahme entscheidet, könnte nach der EU-Medizinprodukte-Verordnung (MDR) als Medizinprodukt gelten (CE, Risikomanagement). Gesundheitsdaten sind nach DSGVO Art. 9 besonders geschützt (Einwilligung, am besten lokal speichern). Deshalb: keine Dosisberechnung, Hinweis „ersetzt keine Beratung“, Quellen zu jeder Regel.

**Was würdest du als Nächstes einbauen?**
PWA mit Service Worker für Erinnerungen bei geschlossener App, danach Login für mehrere Nutzer.

**Welche Rolle hatte KI?**
Ehrlich beantworten: Claude (Anthropic) wurde für Recherche, Code und Erklärungen genutzt (steht auch in der Themenwahl). Zeig, dass du jeden Teil verstanden hast, z. B. indem du den Planer live an einem geänderten Tagesablauf erklärst.
