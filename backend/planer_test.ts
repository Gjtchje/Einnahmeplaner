// planer_test.ts – Tests für den Planer. Starten mit: test-backend.bat
//
// Jeder Test legt ein paar Präparate an, lässt planeTag() rechnen
// und prüft, in welchem Zeitfenster sie gelandet sind.

import { deepStrictEqual as gleich, ok as stimmt } from "node:assert/strict";
import { type Plan, planeTag, praeparateAm } from "./planer.ts";
import type { Praeparat } from "./modell.ts";

// Standard-Tagesablauf
const ZEITEN = {
  nuechtern: "07:00",
  fruehstueck: "07:30",
  vormittag: "10:00",
  mittag: "12:30",
  abendessen: "18:30",
  schlafen: "22:00",
};

// Hilfsfunktion: ein Präparat zum Testen erzeugen
function praeparat(wirkstoffId: string, proTag = 1): Praeparat {
  return {
    id: wirkstoffId,
    name: wirkstoffId,
    wirkstoffId,
    dosis: "1 Tablette",
    staerke: "",
    proTag,
    vorrat: null,
    tage: [0, 1, 2, 3, 4, 5, 6],
  };
}

// Hilfsfunktion: In welchen Zeitfenstern liegt ein Präparat?
function slotsVon(plan: Plan, name: string): string[] {
  return plan.eintraege.filter((e) => e.praeparat.name === name).map((e) => e.slot);
}

Deno.test("Ein Mittel landet in seinem besten Zeitfenster", () => {
  const plan = planeTag([praeparat("vitamin-d")], ZEITEN);
  gleich(slotsVon(plan, "vitamin-d"), ["fruehstueck"]);
});

Deno.test("Eisen und Calcium werden getrennt", () => {
  const plan = planeTag([praeparat("eisen"), praeparat("calcium")], ZEITEN);
  gleich(slotsVon(plan, "eisen"), ["nuechtern"]);
  gleich(slotsVon(plan, "calcium"), ["mittag"]);
});

Deno.test("Medikament zuerst: L-Thyroxin bleibt morgens, Eisen weicht aus", () => {
  const plan = planeTag([praeparat("eisen"), praeparat("l-thyroxin")], ZEITEN);
  gleich(slotsVon(plan, "l-thyroxin"), ["nuechtern"]);
  gleich(slotsVon(plan, "eisen"), ["vormittag"]);
});

Deno.test("3-mal täglich: drei verschiedene Zeitfenster", () => {
  const plan = planeTag([praeparat("vitamin-c", 3)], ZEITEN);
  gleich(slotsVon(plan, "vitamin-c"), ["fruehstueck", "mittag", "abendessen"]);
});

Deno.test("Kein Platz: Mittel wird trotzdem eingeplant, aber mit Konflikt-Hinweis", () => {
  // Alle Zeitfenster innerhalb von 75 Minuten – zu eng für 2 Stunden Abstand
  const eng = {
    nuechtern: "07:00",
    fruehstueck: "07:15",
    vormittag: "07:30",
    mittag: "07:45",
    abendessen: "08:00",
    schlafen: "08:15",
  };
  const plan = planeTag([praeparat("eisen"), praeparat("calcium")], eng);
  gleich(slotsVon(plan, "calcium").length, 1);
  stimmt(plan.hinweise.some((h) => h.startsWith("Konflikt")));
});

Deno.test("Warnung bei Vitamin K2 und Marcumar", () => {
  const plan = planeTag([praeparat("vitamin-k2"), praeparat("phenprocoumon")], ZEITEN);
  stimmt(plan.hinweise.some((h) => h.startsWith("Warnung")));
});

Deno.test("Wochentage: Zink nur montags – am Montag dabei, am Dienstag nicht", () => {
  const zink = { ...praeparat("zink"), tage: [1] }; // 1 = Montag
  gleich(praeparateAm([zink], "2026-11-09").length, 1); // 09.11.2026 ist ein Montag
  gleich(praeparateAm([zink], "2026-11-10").length, 0); // Dienstag
});

Deno.test("ASS 100 und Ibuprofen werden 2 Stunden getrennt, ASS zuerst", () => {
  const plan = planeTag([praeparat("ibuprofen"), praeparat("ass-100")], ZEITEN);
  gleich(slotsVon(plan, "ass-100"), ["fruehstueck"]);
  gleich(slotsVon(plan, "ibuprofen"), ["mittag"]);
});

