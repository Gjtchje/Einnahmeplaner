// startdaten beim ersten start, mit typischen konflikten (l-thyroxin, eisen, calcium)
// zink nur mo, mi, fr

const TAEGLICH = [0, 1, 2, 3, 4, 5, 6];

export const BEISPIELDATEN = [
  { name: "L-Thyroxin 50", wirkstoffId: "l-thyroxin", dosis: "1 Tablette", staerke: "50 µg", proTag: 1, vorrat: 84, tage: TAEGLICH },
  { name: "Eisen + Vitamin C", wirkstoffId: "eisen", dosis: "1 Kapsel", staerke: "20 mg", proTag: 1, vorrat: 5, tage: TAEGLICH },
  { name: "Vitamin D3 Tropfen", wirkstoffId: "vitamin-d", dosis: "2 Tropfen", staerke: "1000 IE", proTag: 1, vorrat: null, tage: TAEGLICH },
  { name: "Vitamin K2", wirkstoffId: "vitamin-k2", dosis: "1 Tablette", staerke: "100 µg", proTag: 1, vorrat: 60, tage: TAEGLICH },
  { name: "Calcium 500", wirkstoffId: "calcium", dosis: "1 Tablette", staerke: "500 mg", proTag: 1, vorrat: 40, tage: TAEGLICH },
  { name: "Magnesium Citrat", wirkstoffId: "magnesium", dosis: "1 Kapsel", staerke: "150 mg", proTag: 1, vorrat: 90, tage: TAEGLICH },
  { name: "Zink", wirkstoffId: "zink", dosis: "1 Tablette", staerke: "10 mg", proTag: 1, vorrat: 30, tage: [1, 3, 5] },
];
