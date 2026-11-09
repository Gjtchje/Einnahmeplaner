// beispieldaten.ts – Werden beim allerersten Start angelegt, damit man sofort
// einen Plan sieht. Die Auswahl zeigt typische Konflikte:
// L-Thyroxin, Eisen und Calcium wollen alle morgens, brauchen aber Abstand.
// Zink gibt es nur montags, mittwochs und freitags.

const TAEGLICH = [0, 1, 2, 3, 4, 5, 6]; // So, Mo, Di, Mi, Do, Fr, Sa

export const BEISPIELDATEN = [
  { name: "L-Thyroxin 50", wirkstoffId: "l-thyroxin", dosis: "1 Tablette", proTag: 1, vorrat: 84, tage: TAEGLICH },
  { name: "Eisen + Vitamin C", wirkstoffId: "eisen", dosis: "1 Kapsel", proTag: 1, vorrat: 5, tage: TAEGLICH },
  { name: "Vitamin D3 Tropfen", wirkstoffId: "vitamin-d", dosis: "2 Tropfen", proTag: 1, vorrat: null, tage: TAEGLICH },
  { name: "Vitamin K2", wirkstoffId: "vitamin-k2", dosis: "1 Tablette", proTag: 1, vorrat: 60, tage: TAEGLICH },
  { name: "Calcium 500", wirkstoffId: "calcium", dosis: "1 Tablette", proTag: 1, vorrat: 40, tage: TAEGLICH },
  { name: "Magnesium Citrat", wirkstoffId: "magnesium", dosis: "1 Kapsel", proTag: 1, vorrat: 90, tage: TAEGLICH },
  { name: "Zink", wirkstoffId: "zink", dosis: "1 Tablette", proTag: 1, vorrat: 30, tage: [1, 3, 5] },
];
