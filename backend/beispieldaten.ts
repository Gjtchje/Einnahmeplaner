// beispieldaten.ts – Werden beim allerersten Start angelegt, damit man sofort
// einen Plan sieht. Die Auswahl zeigt typische Konflikte:
// L-Thyroxin, Eisen und Calcium wollen alle morgens, brauchen aber Abstand.

export const BEISPIELDATEN = [
  { name: "L-Thyroxin 50", wirkstoffId: "l-thyroxin", dosis: "1 Tablette", proTag: 1, vorrat: 84 },
  { name: "Eisen + Vitamin C", wirkstoffId: "eisen", dosis: "1 Kapsel", proTag: 1, vorrat: 5 },
  { name: "Vitamin D3 Tropfen", wirkstoffId: "vitamin-d", dosis: "2 Tropfen", proTag: 1, vorrat: null },
  { name: "Vitamin K2", wirkstoffId: "vitamin-k2", dosis: "1 Tablette", proTag: 1, vorrat: 60 },
  { name: "Calcium 500", wirkstoffId: "calcium", dosis: "1 Tablette", proTag: 1, vorrat: 40 },
  { name: "Magnesium Citrat", wirkstoffId: "magnesium", dosis: "1 Kapsel", proTag: 1, vorrat: 90 },
  { name: "Zink", wirkstoffId: "zink", dosis: "1 Tablette", proTag: 1, vorrat: 30 },
];
