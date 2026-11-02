// Einnahmeplaner – Persistenz mit Deno KV
// Alle Datenbankzugriffe liegen hier. Die Routen in app.ts kennen nur diese
// Funktionen – würden wir später z. B. auf PostgreSQL wechseln, müsste nur
// diese Datei angepasst werden.
//
// Schlüssel-Aufbau in Deno KV:
//   ["praeparate", <id>]                          -> Praeparat
//   ["tagesablauf"]                               -> Tagesablauf
//   ["einnahmen", <datum>, <praeparatId>, <slot>] -> Einnahme
//   ["meta", "beispieldaten"]                     -> true, wenn schon angelegt
import { KATALOG } from "./katalog.ts";
import type { Einnahme, EinnahmeEingabe, Praeparat, Tagesablauf } from "./modell.ts";

let kv: Deno.Kv;

// Wird einmal beim Start aufgerufen. Die Tests übergeben ":memory:",
// dann liegt die Datenbank nur im Arbeitsspeicher.
export async function oeffneSpeicher(pfad: string): Promise<void> {
  if (pfad !== ":memory:") {
    await Deno.mkdir("./data", { recursive: true });
  }
  kv = await Deno.openKv(pfad);
}

export function schliesseSpeicher(): void {
  kv?.close();
}

// ---------------------------------------------------------------------------
// Präparate
// ---------------------------------------------------------------------------

export async function allePraeparate(): Promise<Praeparat[]> {
  const ergebnis: Praeparat[] = [];
  for await (const eintrag of kv.list<Praeparat>({ prefix: ["praeparate"] })) {
    ergebnis.push(eintrag.value);
  }
  return ergebnis;
}

export async function praeparatHolen(id: string): Promise<Praeparat | null> {
  return (await kv.get<Praeparat>(["praeparate", id])).value;
}

export async function praeparatSpeichern(p: Praeparat): Promise<void> {
  await kv.set(["praeparate", p.id], p);
}

export async function praeparatLoeschen(id: string): Promise<boolean> {
  const vorhanden = await kv.get(["praeparate", id]);
  if (vorhanden.value === null) return false;
  await kv.delete(["praeparate", id]);
  return true;
}

// ---------------------------------------------------------------------------
// Tagesablauf
// ---------------------------------------------------------------------------

// Solange der Nutzer nichts eingestellt hat, gelten die Standardzeiten aus
// dem Katalog (z. B. Frühstück 07:30).
export async function tagesablaufHolen(): Promise<Tagesablauf> {
  const gespeichert = (await kv.get<Tagesablauf>(["tagesablauf"])).value;
  if (gespeichert) return gespeichert;
  return Object.fromEntries(
    KATALOG.slots.map((s) => [s.id, s.standardZeit]),
  ) as Tagesablauf;
}

export async function tagesablaufSpeichern(t: Tagesablauf): Promise<void> {
  await kv.set(["tagesablauf"], t);
}

// ---------------------------------------------------------------------------
// Einnahmen (Abhaken) – mit Vorrat
// ---------------------------------------------------------------------------

export async function einnahmenAm(datum: string): Promise<Einnahme[]> {
  const ergebnis: Einnahme[] = [];
  for await (const eintrag of kv.list<Einnahme>({ prefix: ["einnahmen", datum] })) {
    ergebnis.push(eintrag.value);
  }
  return ergebnis;
}

export type AbhakErgebnis = "ok" | "praeparat-fehlt" | "schon-erledigt" | "nicht-erledigt" | "konflikt";

// Abhaken und Vorrat verringern müssen ZUSAMMEN passieren: Es darf nie eine
// Einnahme gespeichert sein, ohne dass der Vorrat gesunken ist (und umgekehrt).
// Dafür nutzen wir eine atomare Transaktion von Deno KV:
//   check() prüft, dass sich beide Einträge seit dem Lesen nicht verändert
//   haben. Nur dann werden beide Änderungen gemeinsam geschrieben.
export async function einnahmeAbhaken(e: EinnahmeEingabe): Promise<AbhakErgebnis> {
  const schluessel = ["einnahmen", e.datum, e.praeparatId, e.slot];
  const [einnahme, praeparat] = await kv.getMany<[Einnahme, Praeparat]>([
    schluessel,
    ["praeparate", e.praeparatId],
  ]);
  if (praeparat.value === null) return "praeparat-fehlt";
  if (einnahme.value !== null) return "schon-erledigt";

  const p = praeparat.value;
  const neu: Praeparat = p.vorrat === null ? p : { ...p, vorrat: Math.max(0, p.vorrat - p.menge) };

  const ergebnis = await kv.atomic()
    .check(einnahme, praeparat)
    .set(schluessel, { ...e, zeitpunkt: new Date().toISOString() })
    .set(["praeparate", p.id], neu)
    .commit();
  return ergebnis.ok ? "ok" : "konflikt";
}

// Gegenstück: Haken wieder entfernen und Vorrat zurückbuchen.
export async function einnahmeZuruecknehmen(e: EinnahmeEingabe): Promise<AbhakErgebnis> {
  const schluessel = ["einnahmen", e.datum, e.praeparatId, e.slot];
  const [einnahme, praeparat] = await kv.getMany<[Einnahme, Praeparat]>([
    schluessel,
    ["praeparate", e.praeparatId],
  ]);
  if (einnahme.value === null) return "nicht-erledigt";

  let vorgang = kv.atomic().check(einnahme, praeparat).delete(schluessel);
  // Präparat könnte inzwischen gelöscht sein – dann nur den Haken entfernen.
  if (praeparat.value !== null && praeparat.value.vorrat !== null) {
    const p = praeparat.value;
    vorgang = vorgang.set(["praeparate", p.id], { ...p, vorrat: p.vorrat! + p.menge });
  }
  const ergebnis = await vorgang.commit();
  return ergebnis.ok ? "ok" : "konflikt";
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export async function beispieldatenAngelegt(): Promise<boolean> {
  return (await kv.get<boolean>(["meta", "beispieldaten"])).value === true;
}

export async function merkeBeispieldaten(): Promise<void> {
  await kv.set(["meta", "beispieldaten"], true);
}
