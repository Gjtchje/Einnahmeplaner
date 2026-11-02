// Tests für die REST-API
// Die App wird direkt mit app.request() aufgerufen – ohne echten Server.
// Die Datenbank liegt nur im Arbeitsspeicher (":memory:") und ist nach den
// Tests wieder weg.
// Node-Assert ist in Deno eingebaut – keine zusätzliche Abhängigkeit nötig.
import { deepStrictEqual as assertEquals, ok as assert } from "node:assert/strict";
import { app } from "./app.ts";
import { oeffneSpeicher } from "./speicher.ts";

await oeffneSpeicher(":memory:");

const VITAMIN_D = {
  name: "Vitamin D3",
  wirkstoffId: "vitamin-d",
  staerke: "1000 IE",
  menge: 1,
  einheit: "Tablette",
  proTag: 1,
  vorrat: 10,
};

function sende(methode: string, url: string, body?: unknown) {
  return app.request(url, {
    method: methode,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

Deno.test("API: Präparat anlegen, lesen, ändern, löschen", async () => {
  const angelegt = await sende("POST", "/api/praeparate", VITAMIN_D);
  assertEquals(angelegt.status, 201);
  const p = await angelegt.json();
  assert(p.id, "Server vergibt eine ID");
  assertEquals(p.wirkstoffName, "Vitamin D");
  assertEquals(p.reichweiteTage, 10);

  const geaendert = await sende("PUT", `/api/praeparate/${p.id}`, { ...VITAMIN_D, vorrat: 3 });
  assertEquals(geaendert.status, 200);
  assertEquals((await geaendert.json()).nachkaufen, true);

  assertEquals((await sende("DELETE", `/api/praeparate/${p.id}`)).status, 204);
  assertEquals((await sende("GET", `/api/praeparate/${p.id}`)).status, 404);
});

Deno.test("API: Ungültige Eingaben werden mit 400 und Feldfehlern abgelehnt", async () => {
  const antwort = await sende("POST", "/api/praeparate", {
    ...VITAMIN_D,
    name: "X",
    wirkstoffId: "zauberpulver",
    proTag: 5,
  });
  assertEquals(antwort.status, 400);
  const { details } = await antwort.json();
  const felder = details.map((d: { feld: string }) => d.feld);
  assert(felder.includes("name"));
  assert(felder.includes("wirkstoffId"));
  assert(felder.includes("proTag"));
});

Deno.test("API: Tagesablauf muss in zeitlicher Reihenfolge sein", async () => {
  const falsch = await sende("PUT", "/api/tagesablauf", {
    nuechtern: "07:00",
    fruehstueck: "06:00", // vor nüchtern -> ungültig
    vormittag: "10:00",
    mittag: "12:30",
    abendessen: "18:30",
    schlafen: "22:00",
  });
  assertEquals(falsch.status, 400);
});

Deno.test("API: Abhaken verringert den Vorrat, Zurücknehmen erhöht ihn wieder", async () => {
  const p = await (await sende("POST", "/api/praeparate", VITAMIN_D)).json();
  const einnahme = { datum: "2026-11-02", praeparatId: p.id, slot: "fruehstueck" };

  assertEquals((await sende("POST", "/api/einnahmen", einnahme)).status, 201);
  assertEquals((await (await sende("GET", `/api/praeparate/${p.id}`)).json()).vorrat, 9);

  // Doppelt abhaken geht nicht
  assertEquals((await sende("POST", "/api/einnahmen", einnahme)).status, 409);

  const liste = await (await sende("GET", "/api/einnahmen?datum=2026-11-02")).json();
  assertEquals(liste.length, 1);

  assertEquals((await sende("DELETE", "/api/einnahmen", einnahme)).status, 204);
  assertEquals((await (await sende("GET", `/api/praeparate/${p.id}`)).json()).vorrat, 10);

  await sende("DELETE", `/api/praeparate/${p.id}`);
});

Deno.test("API: Plan enthält das angelegte Präparat", async () => {
  const p = await (await sende("POST", "/api/praeparate", VITAMIN_D)).json();
  const plan = await (await sende("GET", "/api/plan")).json();
  const fruehstueck = plan.slots.find((s: { slot: string }) => s.slot === "fruehstueck");
  assertEquals(fruehstueck.eintraege[0].praeparatId, p.id);
  await sende("DELETE", `/api/praeparate/${p.id}`);
});

Deno.test("API: Unbekannte Route gibt 404 als JSON", async () => {
  const antwort = await sende("GET", "/api/gibtsnicht");
  assertEquals(antwort.status, 404);
  assertEquals((await antwort.json()).fehler, "Nicht gefunden");
});
