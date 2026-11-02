// Einnahmeplaner – Beispieldaten
// Werden beim allerersten Start angelegt, damit man die App direkt
// ausprobieren kann. Die Auswahl zeigt bewusst typische Konflikte:
//   - L-Thyroxin, Eisen und Calcium wollen alle morgens, brauchen aber Abstand
//   - Eisen, Zink, Calcium und Magnesium stören sich gegenseitig
//   - Eisen + Vitamin C und Vitamin D + K2 sind "gute Paare"
import type { PraeparatEingabe } from "./modell.ts";

export const BEISPIELDATEN: PraeparatEingabe[] = [
  {
    name: "L-Thyroxin 50",
    wirkstoffId: "l-thyroxin",
    staerke: "50 µg",
    menge: 1,
    einheit: "Tablette",
    proTag: 1,
    vorrat: 84,
    notiz: "Vom Hausarzt verschrieben",
  },
  {
    name: "Eisen + Vitamin C Kapseln",
    wirkstoffId: "eisen",
    staerke: "20 mg",
    menge: 1,
    einheit: "Kapsel",
    proTag: 1,
    vorrat: 5,
    notiz: "",
  },
  {
    name: "Vitamin D3 Tropfen",
    wirkstoffId: "vitamin-d",
    staerke: "1000 IE",
    menge: 2,
    einheit: "Tropfen",
    proTag: 1,
    vorrat: null,
    notiz: "",
  },
  {
    name: "Vitamin K2",
    wirkstoffId: "vitamin-k2",
    staerke: "100 µg",
    menge: 1,
    einheit: "Tablette",
    proTag: 1,
    vorrat: 60,
    notiz: "",
  },
  {
    name: "Calcium 500",
    wirkstoffId: "calcium",
    staerke: "500 mg",
    menge: 1,
    einheit: "Tablette",
    proTag: 1,
    vorrat: 40,
    notiz: "",
  },
  {
    name: "Magnesium Citrat",
    wirkstoffId: "magnesium",
    staerke: "150 mg",
    menge: 1,
    einheit: "Kapsel",
    proTag: 1,
    vorrat: 90,
    notiz: "",
  },
  {
    name: "Zink Lutschtabletten",
    wirkstoffId: "zink",
    staerke: "10 mg",
    menge: 1,
    einheit: "Tablette",
    proTag: 1,
    vorrat: 30,
    notiz: "",
  },
];
