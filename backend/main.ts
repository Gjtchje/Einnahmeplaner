// main.ts – Der Server: alle Adressen (Routen) der REST-API.
//
// Jede Route funktioniert nach dem gleichen Muster:
//   1. Daten vom Browser lesen
//   2. mit Zod prüfen – bei Fehlern Status 400 zurück
//   3. Datenbank lesen oder schreiben
//   4. Antwort als JSON zurückschicken

import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { einnahmeSchema, KATALOG, praeparatSchema, tagesablaufSchema } from "./modell.ts";
import { planeTag } from "./planer.ts";
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

// ---- Plan: wird jedes Mal neu berechnet ----

app.get("/api/plan", async (c) => {
  const plan = planeTag(await db.allePraeparate(), await db.holeTagesablauf());
  return c.json(plan);
});

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
