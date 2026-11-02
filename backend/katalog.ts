// Einnahmeplaner – Wirkstoff-Katalog
// Der Katalog (Zeitfenster, Wirkstoffe, Regeln, Quellen) liegt als JSON-Datei
// in daten/wirkstoffe.json. Er ist fest im Programm und wird nicht von Nutzern
// verändert. Hier wird die Datei geladen und mit Typen versehen.
import katalogDaten from "./daten/wirkstoffe.json" with { type: "json" };

// Die sechs festen Zeitfenster des Tages – in zeitlicher Reihenfolge.
export const SLOT_IDS = [
  "nuechtern",
  "fruehstueck",
  "vormittag",
  "mittag",
  "abendessen",
  "schlafen",
] as const;
export type SlotId = typeof SLOT_IDS[number];

export interface Slot {
  id: SlotId;
  name: string;
  standardZeit: string; // "HH:MM"
  mahlzeit: boolean;
}

export interface Wirkstoff {
  id: string;
  name: string;
  kategorie: "nem" | "medikament";
  slots: SlotId[]; // erlaubte Zeitfenster, beste zuerst
  hinweise: string[];
  quellen: string[];
}

// Drei Arten von Regeln:
// - abstand:  a und b brauchen mindestens "stunden" Abstand
// - zusammen: a und b werden gern gemeinsam eingenommen (nur ein Tipp)
// - warnung:  a und b zusammen nur nach Rücksprache mit Arzt/Apotheke
export interface Regel {
  a: string;
  b: string;
  typ: "abstand" | "zusammen" | "warnung";
  stunden?: number;
  grund: string;
  quelle: string;
}

export interface Quelle {
  id: string;
  titel: string;
  url: string;
}

export interface Katalog {
  version: number;
  stand: string;
  hinweis: string;
  slots: Slot[];
  wirkstoffe: Wirkstoff[];
  regeln: Regel[];
  quellen: Quelle[];
}

export const KATALOG = katalogDaten as Katalog;

export const WIRKSTOFF_IDS = KATALOG.wirkstoffe.map((w) => w.id);

export function findeWirkstoff(id: string): Wirkstoff | undefined {
  return KATALOG.wirkstoffe.find((w) => w.id === id);
}

export function findeSlot(id: SlotId): Slot {
  return KATALOG.slots.find((s) => s.id === id)!;
}

export function findeQuelle(id: string): Quelle | undefined {
  return KATALOG.quellen.find((q) => q.id === id);
}

// Alle Regeln, die zwei bestimmte Wirkstoffe betreffen – egal in welcher
// Reihenfolge sie in der Datei stehen (a/b oder b/a).
export function regelnZwischen(id1: string, id2: string): Regel[] {
  return KATALOG.regeln.filter((r) => (r.a === id1 && r.b === id2) || (r.a === id2 && r.b === id1));
}

// Alle Regeln, an denen ein Wirkstoff beteiligt ist (für die Info-Seite).
export function regelnFuer(id: string): Regel[] {
  return KATALOG.regeln.filter((r) => r.a === id || r.b === id);
}
