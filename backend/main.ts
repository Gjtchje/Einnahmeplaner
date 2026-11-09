// main.ts – Der Server: alle Adressen (Routen) der REST-API.
//
// Jede Route funktioniert nach dem gleichen Muster:
//   1. Daten vom Browser lesen
//   2. mit Zod prüfen – bei Fehlern Status 400 zurück
//   3. Datenbank lesen oder schreiben
//   4. Antwort als JSON zurückschicken

import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { einnahmeSchema, KATALOG, laborwertSchema, praeparatSchema, tagesablaufSchema } from "./modell.ts";
import { planeTag, praeparateAm } from "./planer.ts";
import * as db from "./datenbank.ts";
import { BEISPIELDATEN } from "./beispieldaten.ts";

const app = new Hono();

// ---- Katalog: alle Wirkstoffe, Zeitfenster, Regeln, Quellen ----

app.get("/api/katalog", (c) => {
  return c.json(KATALOG);
});

// ---- Präparate ----

app.get("/api/praeparate", async (c) => {
  const liste = await db.allePraeparate();
  liste.sort((a, b) => a.name.localeCompare(b.name)); // alphabetisch
  return c.json(liste);
});

app.post("/api/praeparate", async (c) => {
  const pruefung = praeparatSchema.safeParse(await c.req.json());
  if (!pruefung.success) {
    return c.json({ fehler: pruefung.error.issues[0].message }, 400);
  }
  const praeparat = { ...pruefung.data, id: crypto.randomUUID() };
  await db.speicherePraeparat(praeparat);
  return c.json(praeparat, 201);
});

app.put("/api/praeparate/:id", async (c) => {
  const id = c.req.param("id");
  if (!(await db.holePraeparat(id))) return c.json({ fehler: "Nicht gefunden" }, 404);

  const pruefung = praeparatSchema.safeParse(await c.req.json());
  if (!pruefung.success) {
    return c.json({ fehler: pruefung.error.issues[0].message }, 400);
  }
  const praeparat = { ...pruefung.data, id };
  await db.speicherePraeparat(praeparat);
  return c.json(praeparat);
});

app.delete("/api/praeparate/:id", async (c) => {
  await db.loeschePraeparat(c.req.param("id"));
  return c.body(null, 204);
});

// ---- Tagesablauf ----

app.get("/api/tagesablauf", async (c) => {
  return c.json(await db.holeTagesablauf());
});

app.put("/api/tagesablauf", async (c) => {
  const pruefung = tagesablaufSchema.safeParse(await c.req.json());
  if (!pruefung.success) {
    return c.json({ fehler: pruefung.error.issues[0].message }, 400);
  }
  await db.speichereTagesablauf(pruefung.data);
  return c.json(pruefung.data);
});

// ---- Plan für einen Tag: wird jedes Mal neu berechnet ----
// z. B. /api/plan?datum=2026-11-09 – nur Präparate, die an diesem Wochentag dran sind

app.get("/api/plan", async (c) => {
  const datum = c.req.query("datum") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return c.json({ fehler: "Datum fehlt" }, 400);

  const praeparate = praeparateAm(await db.allePraeparate(), datum);
  const plan = planeTag(praeparate, await db.holeTagesablauf());
  return c.json(plan);
});

// ---- Statistik: Wie viel wurde diese Woche schon genommen? ----
// z. B. /api/statistik?von=2026-11-09&bis=2026-11-11
// Für jeden Tag von "von" bis "bis": geplante Einnahmen zählen (soll)
// und abgehakte Einnahmen zählen (ist).

app.get("/api/statistik", async (c) => {
  const von = c.req.query("von") ?? "";
  const bis = c.req.query("bis") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(von) || !/^\d{4}-\d{2}-\d{2}$/.test(bis)) {
    return c.json({ fehler: "von und bis müssen ein Datum sein" }, 400);
  }

  const alle = await db.allePraeparate();
  const zeiten = await db.holeTagesablauf();
  let soll = 0;
  let ist = 0;
  for (let datum = von; datum <= bis; datum = naechsterTag(datum)) {
    soll += planeTag(praeparateAm(alle, datum), zeiten).eintraege.length;
    ist += (await db.einnahmenAm(datum)).length;
  }
  // höchstens 100 % (z. B. falls ein Präparat inzwischen gelöscht wurde)
  const prozent = soll === 0 ? 0 : Math.min(100, Math.round((ist / soll) * 100));
  return c.json({ soll, ist, prozent });
});

// "2026-11-09" -> "2026-11-10"
function naechsterTag(datum: string): string {
  const d = new Date(datum + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ---- Einnahmen: Abhaken auf der Heute-Seite ----

// Welche Haken sind an einem Tag gesetzt? z. B. /api/einnahmen?datum=2026-11-07
app.get("/api/einnahmen", async (c) => {
  const datum = c.req.query("datum") ?? "";
  return c.json(await db.einnahmenAm(datum));
});

// Haken setzen (wenn noch keiner da ist) oder entfernen (wenn schon einer da ist)
app.post("/api/einnahmen/umschalten", async (c) => {
  const pruefung = einnahmeSchema.safeParse(await c.req.json());
  if (!pruefung.success) return c.json({ fehler: "Ungültige Einnahme" }, 400);

  const einnahme = pruefung.data;
  const praeparat = await db.holePraeparat(einnahme.praeparatId);
  if (!praeparat) return c.json({ fehler: "Präparat nicht gefunden" }, 404);

  if (await db.istAbgehakt(einnahme)) {
    await db.nimmZurueck(einnahme, praeparat);
    return c.json({ abgehakt: false });
  } else {
    await db.hakeAb(einnahme, praeparat);
    return c.json({ abgehakt: true });
  }
});

// ---- Laborwerte-Tagebuch: nur speichern und anzeigen, keine Bewertung ----

app.get("/api/laborwerte", async (c) => {
  const liste = await db.alleLaborwerte();
  // sortiert nach Name, innerhalb eines Namens nach Datum (alt -> neu)
  liste.sort((a, b) => a.name.localeCompare(b.name) || a.datum.localeCompare(b.datum));
  return c.json(liste);
});

app.post("/api/laborwerte", async (c) => {
  const pruefung = laborwertSchema.safeParse(await c.req.json());
  if (!pruefung.success) {
    return c.json({ fehler: pruefung.error.issues[0].message }, 400);
  }
  const laborwert = { ...pruefung.data, id: crypto.randomUUID() };
  await db.speichereLaborwert(laborwert);
  return c.json(laborwert, 201);
});

app.delete("/api/laborwerte/:id", async (c) => {
  await db.loescheLaborwert(c.req.param("id"));
  return c.body(null, 204);
});

// ---- Fehlerbehandlung ----

// Unbekannte API-Adresse, z. B. /api/gibtsnicht -> 404 als JSON
app.all("/api/*", (c) => c.json({ fehler: "Diese Adresse gibt es nicht" }, 404));

// Unerwarteter Fehler irgendwo im Server -> nicht abstürzen, sondern antworten.
// Kaputtes JSON vom Browser ist ein Fehler des Browsers (400), alles andere ein
// Fehler des Servers (500). Details nur ins Server-Fenster, nicht an den Browser.
app.onError((fehler, c) => {
  if (fehler instanceof SyntaxError) return c.json({ fehler: "Ungültiges JSON" }, 400);
  console.error(fehler);
  return c.json({ fehler: "Interner Serverfehler" }, 500);
});

// ---- Frontend ausliefern (für den Ein-Klick-Start) ----
// Alles, was keine /api-Adresse ist, kommt aus dem fertig gebauten Frontend
// (Ordner frontend/dist). Unbekannte Adressen bekommen die index.html,
// damit der Vue-Router z. B. /praeparate selbst anzeigen kann.
app.use("/*", serveStatic({ root: "../frontend/dist" }));
app.get("/*", serveStatic({ path: "../frontend/dist/index.html" }));

// ---- Start ----

if (await db.ersterStart()) {
  for (const beispiel of BEISPIELDATEN) {
    await db.speicherePraeparat({ ...beispiel, id: crypto.randomUUID() });
  }
  console.log("Beispieldaten angelegt.");
}

Deno.serve({ port: 8000 }, app.fetch);
