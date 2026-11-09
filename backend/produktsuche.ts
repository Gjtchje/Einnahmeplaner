// produktsuche.ts – Produkte über Open Food Facts finden (kostenlose, offene Produktdatenbank).
//
// - Nur Ziffern (8–14 Stellen)? Dann ist es eine Barcode-Nummer -> genau ein Produkt nachschlagen.
// - Sonst: nach dem Namen suchen -> bis zu 5 Treffer.
// Für jeden Treffer raten wir anhand des Namens den passenden Wirkstoff (rateWirkstoff).
// Das Backend fragt Open Food Facts – nicht der Browser. So bleibt der fremde Dienst
// hinter unserer eigenen API versteckt und könnte später ausgetauscht werden.

// So sieht ein Produkt in der Antwort von Open Food Facts aus (nur die Felder, die wir brauchen)
interface OffProdukt {
  code?: string;
  product_name?: string;
  brands?: string;
}

export interface Treffer {
  name: string;
  marke: string;
  code: string; // Barcode-Nummer
  wirkstoffId: string | null; // geraten, z. B. "magnesium" – oder null, wenn unklar
}

const BASIS = "https://world.openfoodfacts.org";
// Open Food Facts bittet darum, dass sich jede App mit Namen meldet
const KOPFZEILEN = { "User-Agent": "Einnahmeplaner/1.0 (Studienprojekt DHBW)" };

export async function sucheProdukt(suche: string): Promise<Treffer[]> {
  if (/^\d{8,14}$/.test(suche)) {
    const antwort = await fetch(`${BASIS}/api/v2/product/${suche}.json?fields=code,product_name,brands`, {
      headers: KOPFZEILEN,
      signal: AbortSignal.timeout(8000), // nach 8 Sekunden aufgeben
    });
    const daten = await antwort.json();
    if (daten.status !== 1) return []; // Barcode nicht gefunden
    return [alsTreffer(daten.product, suche)];
  }

  const url = `${BASIS}/cgi/search.pl?search_terms=${encodeURIComponent(suche)}` +
    `&search_simple=1&json=1&page_size=5&fields=code,product_name,brands`;
  const antwort = await fetch(url, { headers: KOPFZEILEN, signal: AbortSignal.timeout(8000) });
  const daten = await antwort.json();
  const produkte: OffProdukt[] = daten.products ?? [];
  return produkte
    .filter((p) => p.product_name) // Produkte ohne Namen weglassen
    .map((p) => alsTreffer(p, p.code ?? ""));
}

function alsTreffer(p: OffProdukt, code: string): Treffer {
  const name = p.product_name ?? "";
  const marke = (p.brands ?? "").split(",")[0].trim(); // nur die erste Marke
  return { name, marke, code, wirkstoffId: rateWirkstoff(`${marke} ${name}`) };
}

// Suchwörter -> Wirkstoff-ID. Die genaueren Wörter stehen oben (z. B. "b12" vor "b-komplex").
const SUCHWOERTER: [string, string][] = [
  ["b12", "vitamin-b12"],
  ["b-komplex", "vitamin-b-komplex"],
  ["vitamin b", "vitamin-b-komplex"],
  ["k2", "vitamin-k2"],
  ["d3", "vitamin-d"],
  ["vitamin d", "vitamin-d"],
  ["vitamin c", "vitamin-c"],
  ["folsäure", "folsaeure"],
  ["eisen", "eisen"],
  ["calcium", "calcium"],
  ["kalzium", "calcium"],
  ["magnesium", "magnesium"],
  ["zink", "zink"],
  ["omega", "omega-3"],
  ["fischöl", "omega-3"],
  ["probiot", "probiotika"],
  ["biotin", "biotin"],
  ["whey", "protein"],
  ["protein", "protein"],
  ["eiweiß", "protein"],
  ["kreatin", "kreatin"],
  ["creatin", "kreatin"],
  ["melatonin", "melatonin"],
  ["q10", "coenzym-q10"],
  ["kurkuma", "kurkuma"],
  ["curcumin", "kurkuma"],
  ["selen", "selen"],
  ["jod", "jod"],
];

export function rateWirkstoff(text: string): string | null {
  const klein = text.toLowerCase();
  for (const [wort, wirkstoffId] of SUCHWOERTER) {
    if (klein.includes(wort)) return wirkstoffId;
  }
  return null;
}
