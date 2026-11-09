// produktsuche_test.ts – Tests für das Raten des Wirkstoffs aus dem Produktnamen.
// (Die echte Anfrage an Open Food Facts wird hier nicht getestet – die braucht Internet.)

import { deepStrictEqual as gleich } from "node:assert/strict";
import { rateWirkstoff } from "./produktsuche.ts";

Deno.test("Wirkstoff wird aus dem Produktnamen erkannt", () => {
  gleich(rateWirkstoff("Doppelherz Magnesium 400 Tabletten"), "magnesium");
  gleich(rateWirkstoff("Vitamin D3 1000 I.E. Tropfen"), "vitamin-d");
  gleich(rateWirkstoff("ESN Designer Whey Protein Vanilla"), "protein");
});

Deno.test("Genauere Wörter gewinnen: B12 ist nicht B-Komplex", () => {
  gleich(rateWirkstoff("Vitamin B12 Lutschtabletten"), "vitamin-b12");
});

Deno.test("Unbekanntes Produkt ergibt null", () => {
  gleich(rateWirkstoff("Haferflocken zart"), null);
});
