// datenbank.ts – Alle Zugriffe auf die Datenbank (Deno KV).
//
// Deno KV speichert Werte unter einem Schlüssel. Ein Schlüssel ist ein Array:
//   ["praeparate", id]                    -> ein Präparat
//   ["tagesablauf"]                       -> die Uhrzeiten
//   ["einnahmen", datum, praeparatId, slot] -> ein Haken auf der Heute-Seite

import { type Einnahme, KATALOG, type Praeparat, type Tagesablauf } from "./modell.ts";

await Deno.mkdir("./data", { recursive: true });
// "v2", weil die vereinfachte Version andere Felder hat als die erste.
const kv = await Deno.openKv("./data/einnahmeplaner-v2.db");

// ---- Präparate ----

export async function allePraeparate(): Promise<Praeparat[]> {
  const liste: Praeparat[] = [];
  for await (const eintrag of kv.list<Praeparat>({ prefix: ["praeparate"] })) {
    liste.push(eintrag.value);
  }
  return liste;
}

export async function holePraeparat(id: string): Promise<Praeparat | null> {
  const eintrag = await kv.get<Praeparat>(["praeparate", id]);
  return eintrag.value;
}

export async function speicherePraeparat(p: Praeparat) {
  await kv.set(["praeparate", p.id], p);
}

export async function loeschePraeparat(id: string) {
  await kv.delete(["praeparate", id]);
}

// ---- Tagesablauf ----

export async function holeTagesablauf(): Promise<Tagesablauf> {
  const eintrag = await kv.get<Tagesablauf>(["tagesablauf"]);
  if (eintrag.value) return eintrag.value;
  // Noch nichts gespeichert: Standardzeiten aus dem Katalog
  return Object.fromEntries(KATALOG.slots.map((s) => [s.id, s.standardZeit]));
}

export async function speichereTagesablauf(t: Tagesablauf) {
  await kv.set(["tagesablauf"], t);
}

// ---- Einnahmen (Abhaken) ----

export async function einnahmenAm(datum: string): Promise<Einnahme[]> {
  const liste: Einnahme[] = [];
  for await (const eintrag of kv.list<Einnahme>({ prefix: ["einnahmen", datum] })) {
    liste.push(eintrag.value);
  }
  return liste;
}

// Abhaken: Haken speichern UND Vorrat um 1 verringern.
// kv.atomic() sorgt dafür, dass beides zusammen gespeichert wird – oder gar nichts.
export async function hakeAb(e: Einnahme, p: Praeparat) {
  const neuerVorrat = p.vorrat === null ? null : Math.max(0, p.vorrat - 1);
  await kv.atomic()
    .set(["einnahmen", e.datum, e.praeparatId, e.slot], e)
    .set(["praeparate", p.id], { ...p, vorrat: neuerVorrat })
    .commit();
}

// Haken entfernen: Haken löschen UND Vorrat wieder um 1 erhöhen.
export async function nimmZurueck(e: Einnahme, p: Praeparat) {
  const neuerVorrat = p.vorrat === null ? null : p.vorrat + 1;
  await kv.atomic()
    .delete(["einnahmen", e.datum, e.praeparatId, e.slot])
    .set(["praeparate", p.id], { ...p, vorrat: neuerVorrat })
    .commit();
}

export async function istAbgehakt(e: Einnahme): Promise<boolean> {
  const eintrag = await kv.get(["einnahmen", e.datum, e.praeparatId, e.slot]);
  return eintrag.value !== null;
}

// ---- Beispieldaten nur beim allerersten Start ----

export async function ersterStart(): Promise<boolean> {
  const eintrag = await kv.get(["schonGestartet"]);
  await kv.set(["schonGestartet"], true);
  return eintrag.value === null;
}
