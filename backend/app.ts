// Einnahmeplaner – REST-API
// Hier sind alle Routen definiert. Hono übernimmt das Routing, Zod (über den
// zValidator) prüft jede Eingabe, bevor sie in der Route ankommt.
// Der Server selbst wird in main.ts gestartet – so können die Tests die App
// direkt aufrufen, ohne einen echten Server zu starten.
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import type { ZodType } from "zod";
import { findeQuelle, findeWirkstoff, KATALOG, regelnFuer } from "./katalog.ts";
import {
  datumQuerySchema,
  einnahmeSchema,
  idSchema,
  type Praeparat,
  type PraeparatEingabe,
  praeparatEingabeSchema,
  tagesablaufSchema,
  wirkstoffIdSchema,
} from "./modell.ts";
import { planeTag } from "./planer.ts";
import {
  allePraeparate,
  einnahmeAbhaken,
  einnahmenAm,
  einnahmeZuruecknehmen,
  praeparatHolen,
  praeparatLoeschen,
  praeparatSpeichern,
  tagesablaufHolen,
  tagesablaufSpeichern,
} from "./speicher.ts";

export const app = new Hono();

// Ab wie vielen verbleibenden Tagen die App zum Nachkaufen rät
export const NACHKAUFEN_AB_TAGEN = 7;

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

// Einheitliche Validierung: Bei ungültigen Daten antwortet der Server immer
// mit 400 und einer Liste "welches Feld – welches Problem". Das Frontend
// zeigt diese Meldungen direkt neben den Eingabefeldern an.
function pruefe<T extends ZodType>(ziel: "json" | "param" | "query", schema: T) {
  return zValidator(ziel, schema, (ergebnis, c) => {
    if (!ergebnis.success) {
      return c.json({
        fehler: "Ungültige Eingabe",
        details: ergebnis.error.issues.map((i) => ({
          feld: i.path.join("."),
          meldung: i.message,
        })),
      }, 400);
    }
  });
}

// Baut aus einer Eingabe ein vollständiges Präparat (id + Zeitstempel).
function bauePraeparat(eingabe: PraeparatEingabe, vorher?: Praeparat): Praeparat {
  const jetzt = new Date().toISOString();
  return {
    ...eingabe,
    id: vorher?.id ?? crypto.randomUUID(),
    erstelltAm: vorher?.erstelltAm ?? jetzt,
    geaendertAm: jetzt,
  };
}

// Ergänzt ein Präparat um berechnete Felder für die Anzeige.
// Reichweite = wie viele Tage der Vorrat noch reicht (abgerundet).
function mitInfo(p: Praeparat) {
  const wirkstoff = findeWirkstoff(p.wirkstoffId)!;
  const proTagVerbrauch = p.menge * p.proTag;
  const reichweiteTage = p.vorrat === null ? null : Math.floor(p.vorrat / proTagVerbrauch);
  return {
    ...p,
    wirkstoffName: wirkstoff.name,
    kategorie: wirkstoff.kategorie,
    reichweiteTage,
    nachkaufen: reichweiteTage !== null && reichweiteTage < NACHKAUFEN_AB_TAGEN,
  };
}

// ---------------------------------------------------------------------------
// Routen: Allgemein und Katalog
// ---------------------------------------------------------------------------

app.get("/api/health", (c) => c.json({ status: "ok", zeit: new Date().toISOString() }));

// Der ganze Katalog: Zeitfenster, Wirkstoffe, Regeln, Quellen
app.get("/api/katalog", (c) => c.json(KATALOG));

// Ein Wirkstoff mit allen Regeln, die ihn betreffen (inkl. Quellen)
app.get("/api/wirkstoffe/:id", pruefe("param", wirkstoffIdSchema), (c) => {
  const { id } = c.req.valid("param");
  const wirkstoff = findeWirkstoff(id);
  if (!wirkstoff) return c.json({ fehler: "Wirkstoff nicht gefunden" }, 404);
  const regeln = regelnFuer(id).map((r) => {
    const anderer = findeWirkstoff(r.a === id ? r.b : r.a)!;
    return { ...r, mitId: anderer.id, mitName: anderer.name, quelle: findeQuelle(r.quelle) };
  });
  return c.json({ ...wirkstoff, quellen: wirkstoff.quellen.map(findeQuelle), regeln });
});

// ---------------------------------------------------------------------------
// Routen: Präparate (CRUD)
// ---------------------------------------------------------------------------

app.get("/api/praeparate", async (c) => {
  const liste = (await allePraeparate()).map(mitInfo);
  liste.sort((a, b) => a.name.localeCompare(b.name, "de"));
  return c.json(liste);
});

app.get("/api/praeparate/:id", pruefe("param", idSchema), async (c) => {
  const p = await praeparatHolen(c.req.valid("param").id);
  if (!p) return c.json({ fehler: "Präparat nicht gefunden" }, 404);
  return c.json(mitInfo(p));
});

app.post("/api/praeparate", pruefe("json", praeparatEingabeSchema), async (c) => {
  const p = bauePraeparat(c.req.valid("json"));
  await praeparatSpeichern(p);
  return c.json(mitInfo(p), 201);
});

app.put(
  "/api/praeparate/:id",
  pruefe("param", idSchema),
  pruefe("json", praeparatEingabeSchema),
  async (c) => {
    const vorher = await praeparatHolen(c.req.valid("param").id);
    if (!vorher) return c.json({ fehler: "Präparat nicht gefunden" }, 404);
    const p = bauePraeparat(c.req.valid("json"), vorher);
    await praeparatSpeichern(p);
    return c.json(mitInfo(p));
  },
);

app.delete("/api/praeparate/:id", pruefe("param", idSchema), async (c) => {
  const geloescht = await praeparatLoeschen(c.req.valid("param").id);
  if (!geloescht) return c.json({ fehler: "Präparat nicht gefunden" }, 404);
  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// Routen: Tagesablauf
// ---------------------------------------------------------------------------

app.get("/api/tagesablauf", async (c) => c.json(await tagesablaufHolen()));

app.put("/api/tagesablauf", pruefe("json", tagesablaufSchema), async (c) => {
  const t = c.req.valid("json");
  await tagesablaufSpeichern(t);
  return c.json(t);
});

// ---------------------------------------------------------------------------
// Routen: Plan und Einnahmen
// ---------------------------------------------------------------------------

// Der berechnete Tagesplan. Wird bei jedem Aufruf neu berechnet – so ist er
// nach jeder Änderung an Präparaten oder Tagesablauf automatisch aktuell.
app.get("/api/plan", async (c) => {
  const plan = planeTag(await allePraeparate(), await tagesablaufHolen());
  return c.json(plan);
});

// Welche Einnahmen sind an einem Tag schon abgehakt? /api/einnahmen?datum=2026-11-02
app.get("/api/einnahmen", pruefe("query", datumQuerySchema), async (c) => {
  return c.json(await einnahmenAm(c.req.valid("query").datum));
});

// Abhaken (POST) und Haken entfernen (DELETE) – gleicher Body
app.post("/api/einnahmen", pruefe("json", einnahmeSchema), async (c) => {
  const ergebnis = await einnahmeAbhaken(c.req.valid("json"));
  if (ergebnis === "praeparat-fehlt") return c.json({ fehler: "Präparat nicht gefunden" }, 404);
  if (ergebnis === "schon-erledigt") return c.json({ fehler: "Schon abgehakt" }, 409);
  if (ergebnis === "konflikt") {
    return c.json({ fehler: "Gleichzeitige Änderung – bitte erneut versuchen" }, 409);
  }
  return c.json({ ok: true }, 201);
});

app.delete("/api/einnahmen", pruefe("json", einnahmeSchema), async (c) => {
  const ergebnis = await einnahmeZuruecknehmen(c.req.valid("json"));
  if (ergebnis === "nicht-erledigt") return c.json({ fehler: "War nicht abgehakt" }, 404);
  if (ergebnis === "konflikt") {
    return c.json({ fehler: "Gleichzeitige Änderung – bitte erneut versuchen" }, 409);
  }
  return c.body(null, 204);
});

// ---------------------------------------------------------------------------
// Fehlerbehandlung
// ---------------------------------------------------------------------------

// Alles, was keine Route trifft, bekommt ein sauberes 404 als JSON.
app.notFound((c) => c.json({ fehler: "Nicht gefunden" }, 404));

// Fehler, die Hono selbst erkennt (z. B. kaputtes JSON), haben schon einen
// passenden Statuscode – den geben wir weiter. Alles andere ist ein
// unerwarteter Fehler: Details ins Server-Log, an den Client nur eine neutrale
// Meldung (keine internen Details nach außen geben).
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ fehler: "Ungültige Anfrage: " + err.message }, err.status);
  }
  console.error(err);
  return c.json({ fehler: "Interner Serverfehler" }, 500);
});
