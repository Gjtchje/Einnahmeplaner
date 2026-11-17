// main.ts: der server mit allen api-adressen
// jede route: daten lesen -> mit zod prüfen (sonst 400) -> datenbank -> antwort als json

import { Hono } from "hono"; // server-framework
import { serveStatic } from "hono/deno"; // liefert die fertige vue-app aus
import { einnahmeSchema, KATALOG, praeparatSchema, tagesablaufSchema } from "./modell.ts"; // katalog und zod-prüfregeln
import { planeTag, praeparateAm } from "./planer.ts"; // berechnet den plan
import * as db from "./datenbank.ts"; // speichert und lädt daten
import { BEISPIELDATEN } from "./beispieldaten.ts"; // startdaten beim ersten start

const app = new Hono(); // erstellt den server

// ---- katalog ----

// schickt den katalog ans frontend (zeitfenster, wirkstoffe, regeln, quellen)
app.get("/api/katalog", (c) => {
  return c.json(KATALOG);
});

// ---- präparate ----

// holt alle präparate, sortiert alphabetisch, schickt sie ans frontend
app.get("/api/praeparate", async (c) => {
  const liste = await db.allePraeparate(); // await = warten bis die db fertig ist
  liste.sort((a, b) => a.name.localeCompare(b.name));
  return c.json(liste);
});

// neues präparat: prüfen, id geben, speichern, 201 = angelegt
app.post("/api/praeparate", async (c) => {
  const pruefung = praeparatSchema.safeParse(await c.req.json()); // safeParse = zod prüft die daten vom browser (success true/false)
  if (!pruefung.success) {
    return c.json({ fehler: pruefung.error.issues[0].message }, 400);
  }
  const praeparat = { ...pruefung.data, id: crypto.randomUUID() };
  await db.speicherePraeparat(praeparat);
  return c.json(praeparat, 201);
});

// präparat ändern: gibt es das überhaupt? (sonst 404), dann prüfen und speichern
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

// präparat löschen, 204 = erledigt ohne inhalt
app.delete("/api/praeparate/:id", async (c) => {
  await db.loeschePraeparat(c.req.param("id"));
  return c.body(null, 204);
});

// ---- tagesablauf ----

// holt den tagesablauf aus der db und schickt ihn ans frontend
app.get("/api/tagesablauf", async (c) => {
  return c.json(await db.holeTagesablauf());
});

// tagesablauf ändern: prüfen, speichern
app.put("/api/tagesablauf", async (c) => {
  const pruefung = tagesablaufSchema.safeParse(await c.req.json());
  if (!pruefung.success) {
    return c.json({ fehler: pruefung.error.issues[0].message }, 400);
  }
  await db.speichereTagesablauf(pruefung.data);
  return c.json(pruefung.data);
});

// ---- plan ----

// prüft datum, holt präparate und tagesablauf, berechnet plan, schickt ihn ans frontend (wird nicht gespeichert)
app.get("/api/plan", async (c) => {
  const datum = c.req.query("datum") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return c.json({ fehler: "Datum fehlt" }, 400);

  const praeparate = praeparateAm(await db.allePraeparate(), datum);
  const plan = planeTag(praeparate, await db.holeTagesablauf());
  return c.json(plan);
});

// ---- einnahmen (abhaken) ----

// holt alle haken von diesem tag und schickt sie ans frontend
app.get("/api/einnahmen", async (c) => {
  const datum = c.req.query("datum") ?? "";
  return c.json(await db.einnahmenAm(datum));
});

// haken an/aus: prüfen, präparat holen, haken setzen oder entfernen, vorrat anpassen
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

// ---- fehler ----

// unbekannte api-adresse -> 404
app.all("/api/*", (c) => c.json({ fehler: "Diese Adresse gibt es nicht" }, 404));

// fängt fehler ab: kaputtes json -> 400, unerwarteter fehler im server -> 500
app.onError((fehler, c) => {
  if (fehler instanceof SyntaxError) return c.json({ fehler: "Ungültiges JSON" }, 400);
  console.error(fehler);
  return c.json({ fehler: "Interner Serverfehler" }, 500);
});

// ---- frontend ----

// liefert die vue-app aus, wenn keine api-adresse getroffen wurde
app.use("/*", serveStatic({ root: "../frontend/dist" }));
app.get("/*", serveStatic({ path: "../frontend/dist/index.html" }));

// ---- start ----

// erster start: beispieldaten anlegen
if (await db.ersterStart()) {
  for (const beispiel of BEISPIELDATEN) {
    await db.speicherePraeparat({ ...beispiel, id: crypto.randomUUID() });
  }
  console.log("Beispieldaten angelegt.");
}

Deno.serve({ port: 8000 }, app.fetch); // server starten auf port 8000
