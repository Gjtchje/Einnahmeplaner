// datenbank: alles speichern und laden mit deno kv
// schlüssel sind listen: ["praeparate", id], ["tagesablauf"], ["einnahmen", datum, id, slot]

import { type Einnahme, KATALOG, type Praeparat, type Tagesablauf } from "./modell.ts";

await Deno.mkdir("./data", { recursive: true });
// datenbank-datei öffnen
const kv = await Deno.openKv("./data/einnahmeplaner-v2.db");

// präparate

export async function allePraeparate(): Promise<Praeparat[]> {
  const liste: Praeparat[] = [];
  for await (const eintrag of kv.list<Praeparat>({ prefix: ["praeparate"] })) { // list = alle einträge, die so anfangen
    liste.push(eintrag.value);
  }
  return liste;
}

export async function holePraeparat(id: string): Promise<Praeparat | null> {
  const eintrag = await kv.get<Praeparat>(["praeparate", id]); // get = einen eintrag holen
  return eintrag.value;
}

export async function speicherePraeparat(p: Praeparat) {
  await kv.set(["praeparate", p.id], p); // set = speichern
}

export async function loeschePraeparat(id: string) {
  await kv.delete(["praeparate", id]); // delete = löschen
}

// tagesablauf

export async function holeTagesablauf(): Promise<Tagesablauf> {
  const eintrag = await kv.get<Tagesablauf>(["tagesablauf"]);
  if (eintrag.value) return eintrag.value;
  // noch nichts gespeichert -> standardzeiten
  return Object.fromEntries(KATALOG.slots.map((s) => [s.id, s.standardZeit]));
}

export async function speichereTagesablauf(t: Tagesablauf) {
  await kv.set(["tagesablauf"], t);
}

// einnahmen (haken)

export async function einnahmenAm(datum: string): Promise<Einnahme[]> {
  const liste: Einnahme[] = [];
  for await (const eintrag of kv.list<Einnahme>({ prefix: ["einnahmen", datum] })) {
    liste.push(eintrag.value);
  }
  return liste;
}

// haken setzen + vorrat -1, atomic = beides oder nichts
export async function hakeAb(e: Einnahme, p: Praeparat) {
  const neuerVorrat = p.vorrat === null ? null : Math.max(0, p.vorrat - 1);
  await kv.atomic()
    .set(["einnahmen", e.datum, e.praeparatId, e.slot], e)
    .set(["praeparate", p.id], { ...p, vorrat: neuerVorrat })
    .commit(); // erst hier wird alles zusammen gespeichert
}

// haken weg + vorrat +1
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

// true beim allerersten start (für die beispieldaten)

export async function ersterStart(): Promise<boolean> {
  const eintrag = await kv.get(["schonGestartet"]);
  await kv.set(["schonGestartet"], true);
  return eintrag.value === null;
}
