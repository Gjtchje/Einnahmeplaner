// Tests für die Planungslogik
// Ausführen mit: deno task test  (oder test-backend.bat)
// Jeder Test baut sich ein paar Präparate, lässt planeTag() rechnen und
// prüft, wo die Mittel gelandet sind.
// Node-Assert ist in Deno eingebaut – keine zusätzliche Abhängigkeit nötig.
import { deepStrictEqual as assertEquals, ok as assert } from "node:assert/strict";
import { KATALOG, type SlotId } from "./katalog.ts";
import type { Praeparat, Tagesablauf } from "./modell.ts";
import { type Plan, planeTag } from "./planer.ts";

// Standard-Tagesablauf aus dem Katalog (07:00, 07:30, 10:00, 12:30, 18:30, 22:00)
const STANDARD = Object.fromEntries(
  KATALOG.slots.map((s) => [s.id, s.standardZeit]),
) as Tagesablauf;

// Kleine Hilfe: ein Präparat mit sinnvollen Standardwerten erzeugen
let zaehler = 0;
function praeparat(wirkstoffId: string, proTag = 1, name = wirkstoffId): Praeparat {
  zaehler++;
  return {
    id: `test-${zaehler}`,
    name,
    wirkstoffId,
    staerke: "",
    menge: 1,
    einheit: "Tablette",
    proTag,
    vorrat: null,
    notiz: "",
    erstelltAm: "",
    geaendertAm: "",
  };
}

// In welchen Zeitfenstern liegt ein Präparat?
function slotsVon(plan: Plan, name: string): SlotId[] {
  return plan.slots
    .filter((s) => s.eintraege.some((e) => e.name === name))
    .map((s) => s.slot);
}

Deno.test("Ein einzelnes Mittel landet in seinem besten Zeitfenster", () => {
  const plan = planeTag([praeparat("vitamin-d")], STANDARD);
  assertEquals(slotsVon(plan, "vitamin-d"), ["fruehstueck"]);
  assertEquals(plan.meldungen, []);
});

Deno.test("Leere Liste ergibt sechs leere Zeitfenster", () => {
  const plan = planeTag([], STANDARD);
  assertEquals(plan.slots.length, 6);
  assert(plan.slots.every((s) => s.eintraege.length === 0));
});

Deno.test("Eisen und Calcium werden getrennt (2 Stunden Abstand)", () => {
  const plan = planeTag([praeparat("eisen"), praeparat("calcium")], STANDARD);
  assertEquals(slotsVon(plan, "eisen"), ["nuechtern"]);
  // Calcium wollte zum Mittagessen – 12:30 ist weit genug weg von 07:00
  assertEquals(slotsVon(plan, "calcium"), ["mittag"]);
  assertEquals(plan.meldungen.filter((m) => m.art === "konflikt"), []);
});

Deno.test("Medikament hat Vorrang: L-Thyroxin bleibt morgens, Eisen weicht aus", () => {
  const plan = planeTag([praeparat("eisen"), praeparat("l-thyroxin")], STANDARD);
  assertEquals(slotsVon(plan, "l-thyroxin"), ["nuechtern"]);
  // nüchtern ist belegt und zu nah -> nächstes erlaubtes Zeitfenster
  assertEquals(slotsVon(plan, "eisen"), ["vormittag"]);
});

Deno.test("Calcium 3-mal täglich: Frühstück ist zu nah an L-Thyroxin -> Ausweichen", () => {
  // Calcium empfiehlt Mittag, Abendessen, Frühstück. Frühstück (07:30) liegt
  // nur 30 Minuten nach L-Thyroxin (07:00) – zu nah, Regel verlangt 2 Stunden.
  // Also weicht die 3. Einnahme auf ein anderes Zeitfenster aus.
  const plan = planeTag([praeparat("l-thyroxin"), praeparat("calcium", 3)], STANDARD);
  const calcium = slotsVon(plan, "calcium");
  assertEquals(calcium.length, 3);
  assert(!calcium.includes("fruehstueck"), "Calcium darf nicht zum Frühstück liegen");
  assert(!calcium.includes("nuechtern"), "Calcium darf nicht nüchtern liegen");
  assertEquals(plan.meldungen.filter((m) => m.art === "ausweichen").length, 1);
  assertEquals(plan.meldungen.filter((m) => m.art === "konflikt").length, 0);
});

Deno.test("Mehrmals täglich: jede Einnahme bekommt ein eigenes Zeitfenster", () => {
  const plan = planeTag([praeparat("vitamin-c", 3)], STANDARD);
  assertEquals(slotsVon(plan, "vitamin-c"), ["fruehstueck", "mittag", "abendessen"]);
});

Deno.test("Mehr Einnahmen als empfohlene Zeitfenster -> Ausweichen mit Hinweis", () => {
  // Magnesium hat nur zwei empfohlene Zeitfenster (Schlafen, Abendessen)
  const plan = planeTag([praeparat("magnesium", 3)], STANDARD);
  assertEquals(slotsVon(plan, "magnesium").length, 3);
  assertEquals(plan.meldungen.filter((m) => m.art === "ausweichen").length, 1);
});

Deno.test("Unlösbarer Konflikt wird gemeldet statt verschwiegen", () => {
  // Ein extrem gedrängter Tag: alle Zeitfenster innerhalb von 2,5 Stunden.
  // Eisen und Calcium brauchen 2 Stunden Abstand – das klappt nur noch knapp
  // oder gar nicht, sobald drei Mineralstoffe dabei sind.
  const gedraengt: Tagesablauf = {
    nuechtern: "07:00",
    fruehstueck: "07:30",
    vormittag: "08:00",
    mittag: "08:30",
    abendessen: "09:00",
    schlafen: "09:30",
  };
  const plan = planeTag([praeparat("eisen"), praeparat("calcium"), praeparat("zink")], gedraengt);
  const konflikte = plan.meldungen.filter((m) => m.art === "konflikt");
  assert(konflikte.length > 0, "Es muss mindestens ein Konflikt gemeldet werden");
  assert(konflikte.every((k) => k.quelle !== undefined), "Jeder Konflikt nennt seine Quelle");
  // Alle drei werden trotzdem eingeplant – der Nutzer soll nichts "verlieren"
  assertEquals(slotsVon(plan, "eisen").length, 1);
  assertEquals(slotsVon(plan, "calcium").length, 1);
  assertEquals(slotsVon(plan, "zink").length, 1);
});

Deno.test("Abstand hängt vom Tagesablauf ab", () => {
  // Wer spät frühstückt, hat mehr Abstand zwischen nüchtern und Frühstück.
  const spaet: Tagesablauf = { ...STANDARD, nuechtern: "06:00", fruehstueck: "09:00" };
  const plan = planeTag([praeparat("eisen"), praeparat("zink", 1)], spaet);
  assertEquals(slotsVon(plan, "eisen"), ["nuechtern"]);
  // Zink bevorzugt Abendessen – liegt dort ohne Konflikt
  assertEquals(slotsVon(plan, "zink"), ["abendessen"]);
});

Deno.test("Gute Paare erzeugen einen Tipp", () => {
  const plan = planeTag([praeparat("vitamin-d"), praeparat("vitamin-k2")], STANDARD);
  const tipps = plan.meldungen.filter((m) => m.art === "tipp");
  assertEquals(tipps.length, 1);
  assert(tipps[0].text.includes("selben Zeitfenster"));
});

Deno.test("Warnregel wird angezeigt (Vitamin K2 + Marcumar)", () => {
  const plan = planeTag([praeparat("vitamin-k2"), praeparat("phenprocoumon")], STANDARD);
  const warnungen = plan.meldungen.filter((m) => m.art === "warnung");
  assertEquals(warnungen.length, 1);
  assert(warnungen[0].quelle !== undefined, "Warnung muss eine Quelle haben");
});

Deno.test("Gleiche Eingabe ergibt immer den gleichen Plan", () => {
  const liste = [praeparat("zink"), praeparat("eisen"), praeparat("calcium"), praeparat("magnesium")];
  const plan1 = planeTag(liste, STANDARD);
  const plan2 = planeTag([...liste].reverse(), STANDARD);
  assertEquals(plan1, plan2);
});

Deno.test("Katalog ist in sich stimmig (alle Verweise existieren)", () => {
  const wirkstoffIds = new Set(KATALOG.wirkstoffe.map((w) => w.id));
  const slotIds = new Set(KATALOG.slots.map((s) => s.id));
  const quellenIds = new Set(KATALOG.quellen.map((q) => q.id));
  for (const w of KATALOG.wirkstoffe) {
    assert(w.slots.length > 0, `${w.id} braucht mindestens ein Zeitfenster`);
    for (const s of w.slots) assert(slotIds.has(s), `${w.id}: unbekanntes Zeitfenster ${s}`);
    for (const q of w.quellen) assert(quellenIds.has(q), `${w.id}: unbekannte Quelle ${q}`);
  }
  for (const r of KATALOG.regeln) {
    assert(wirkstoffIds.has(r.a) && wirkstoffIds.has(r.b), `Regel ${r.a}/${r.b}: unbekannter Wirkstoff`);
    assert(quellenIds.has(r.quelle), `Regel ${r.a}/${r.b}: unbekannte Quelle`);
    if (r.typ === "abstand") assert((r.stunden ?? 0) > 0, `Regel ${r.a}/${r.b}: Stunden fehlen`);
  }
});
