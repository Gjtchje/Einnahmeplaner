// modell.ts – Wie sehen unsere Daten aus?
//
// 1. Der Katalog: Wirkstoffe, Zeitfenster und Regeln aus daten/wirkstoffe.json
// 2. Die Zod-Schemas: Damit prüft der Server alles, was der Browser schickt.

import { z } from "zod";
import katalog from "./daten/wirkstoffe.json" with { type: "json" };

// ---------------------------------------------------------------------------
// 1. Katalog (fest, wird nie vom Nutzer geändert)
// ---------------------------------------------------------------------------

export interface Wirkstoff {
  id: string; // z. B. "eisen"
  name: string; // z. B. "Eisen"
  kategorie: string; // "nem" oder "medikament"
  slots: string[]; // empfohlene Zeitfenster, das beste zuerst
  hinweise: string[];
}

export interface Regel {
  a: string; // Wirkstoff-ID
  b: string; // Wirkstoff-ID
  typ: string; // "abstand", "zusammen" oder "warnung"
  stunden?: number; // nur bei "abstand"
  grund: string;
}

export const KATALOG = katalog as {
  slots: { id: string; name: string; standardZeit: string }[];
  wirkstoffe: Wirkstoff[];
  regeln: Regel[];
  quellen: { id: string; titel: string; url: string }[];
};

// Die sechs Zeitfenster in der Reihenfolge des Tages
export const SLOT_IDS = KATALOG.slots.map((s) => s.id);

// ---------------------------------------------------------------------------
// 2. Präparat = ein Mittel, das der Nutzer einnimmt
// ---------------------------------------------------------------------------

export const praeparatSchema = z.object({
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben"),
  wirkstoffId: z.string().refine(
    (id) => KATALOG.wirkstoffe.some((w) => w.id === id),
    "Bitte einen Wirkstoff auswählen",
  ),
  dosis: z.string().trim().min(1, "Bitte eine Dosis angeben, z. B. 1 Tablette"),
  staerke: z.string().trim().max(30, "Stärke höchstens 30 Zeichen").default(""), // z. B. "500 mg" (optional)
  proTag: z.number().int().min(1, "Mindestens 1-mal").max(3, "Höchstens 3-mal"),
  vorrat: z.number().int().min(0, "Vorrat darf nicht negativ sein").nullable(), // null = nicht zählen
  // An welchen Wochentagen? Wie in JavaScript: 0 = Sonntag, 1 = Montag, ... 6 = Samstag
  tage: z.array(z.number().int().min(0).max(6)).min(1, "Bitte mindestens einen Wochentag wählen"),
});

// Aus dem Schema macht TypeScript automatisch einen Typ. Der Server ergänzt die id.
export type Praeparat = z.infer<typeof praeparatSchema> & { id: string };

// ---------------------------------------------------------------------------
// 3. Tagesablauf = Uhrzeit für jedes Zeitfenster, z. B. { fruehstueck: "07:30", ... }
// ---------------------------------------------------------------------------

const uhrzeit = z.string().regex(/^\d\d:\d\d$/, "Uhrzeit im Format HH:MM");

export const tagesablaufSchema = z.object({
  nuechtern: uhrzeit,
  fruehstueck: uhrzeit,
  vormittag: uhrzeit,
  mittag: uhrzeit,
  abendessen: uhrzeit,
  schlafen: uhrzeit,
});

export type Tagesablauf = Record<string, string>;

// ---------------------------------------------------------------------------
// 4. Einnahme = "Präparat X wurde am Tag Y im Zeitfenster Z abgehakt"
// ---------------------------------------------------------------------------

export const einnahmeSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  praeparatId: z.string(),
  slot: z.string().refine((s) => SLOT_IDS.includes(s)),
});

export type Einnahme = z.infer<typeof einnahmeSchema>;
