// server / api / rest: hier stehen alle routen
// ablauf ist fast immer gleich: daten lesen, mit zod prüfen, in die db, json zurück

import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { einnahmeSchema, KATALOG, praeparatSchema, tagesablaufSchema } from "./modell.ts";
import { planeTag, praeparateAm } from "./planer.ts";
import * as db from "./datenbank.ts";
import { BEISPIELDATEN } from "./beispieldaten.ts";

const app = new Hono();
// login / session gibt es nicht (entscheidung: app läuft lokal für eine person). wäre eine route wie /api/login

// katalog: zeitfenster, wirkstoffe, regeln (entscheidung: eigener katalog statt externer api)
app.get("/api/katalog", (c) => {
  return c.json(KATALOG);
});

// crud read (get): alle präparate, nach namen sortiert
app.get("/api/praeparate", async (c) => {
  const liste = await db.allePraeparate(); // await: wartet auf die db
  liste.sort((a, b) => a.name.localeCompare(b.name));
  return c.json(liste);
});

// crud create (post): neues präparat anlegen, antwort 201
app.post("/api/praeparate", async (c) => {
  const pruefung = praeparatSchema.safeParse(await c.req.json()); // validierung mit zod (entscheidung: im backend prüfen), fehler = 400
  if (!pruefung.success) {
    return c.json({ fehler: pruefung.error.issues[0].message }, 400);
  }
  const praeparat = { ...pruefung.data, id: crypto.randomUUID() };
  await db.speicherePraeparat(praeparat);
  return c.json(praeparat, 201);
});

// crud update (put): präparat ändern, gibt es das nicht kommt 404
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

// crud delete: präparat löschen, statuscode 204
app.delete("/api/praeparate/:id", async (c) => {
  await db.loeschePraeparat(c.req.param("id"));
  return c.body(null, 204);
});

// uhrzeiten holen
app.get("/api/tagesablauf", async (c) => {
  return c.json(await db.holeTagesablauf());
});

// uhrzeiten speichern
app.put("/api/tagesablauf", async (c) => {
  const pruefung = tagesablaufSchema.safeParse(await c.req.json());
  if (!pruefung.success) {
    return c.json({ fehler: pruefung.error.issues[0].message }, 400);
  }
  await db.speichereTagesablauf(pruefung.data);
  return c.json(pruefung.data);
});

// geschäftslogik / planer aufrufen: plan wird jedes mal neu berechnet (entscheidung: nicht speichern)
app.get("/api/plan", async (c) => {
  const datum = c.req.query("datum") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return c.json({ fehler: "Datum fehlt" }, 400);

  const praeparate = praeparateAm(await db.allePraeparate(), datum);
  const plan = planeTag(praeparate, await db.holeTagesablauf());
  return c.json(plan);
});

// was an dem tag schon abgehakt ist
app.get("/api/einnahmen", async (c) => {
  const datum = c.req.query("datum") ?? "";
  return c.json(await db.einnahmenAm(datum));
});

// abhaken: haken setzen oder wegnehmen, vorrat wird mit angepasst
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

// statuscode 404: adresse gibt es nicht
app.all("/api/*", (c) => c.json({ fehler: "Diese Adresse gibt es nicht" }, 404));

// fehlerbehandlung: kaputtes json gibt 400, alles andere 500
app.onError((fehler, c) => {
  if (fehler instanceof SyntaxError) return c.json({ fehler: "Ungültiges JSON" }, 400);
  console.error(fehler);
  return c.json({ fehler: "Interner Serverfehler" }, 500);
});

// frontend ausliefern (ein-klick-start), deshalb kein cors nötig
app.use("/*", serveStatic({ root: "../frontend/dist" }));
app.get("/*", serveStatic({ path: "../frontend/dist/index.html" }));

// beim ersten start ein paar beispieldaten anlegen
if (await db.ersterStart()) {
  for (const beispiel of BEISPIELDATEN) {
    await db.speicherePraeparat({ ...beispiel, id: crypto.randomUUID() });
  }
  console.log("Beispieldaten angelegt.");
}

Deno.serve({ port: 8000 }, app.fetch); // server start, port 8000
