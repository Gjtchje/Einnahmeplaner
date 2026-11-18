// datenmodell und validierung (zod-prüfregeln)

import { z } from "zod";
import katalog from "./daten/wirkstoffe.json" with { type: "json" };

// katalog aus wirkstoffe.json, wird nur gelesen

export interface Wirkstoff {
  id: string;
  name: string;
  kategorie: string;
  slots: string[];
  hinweise: string[];
}

export interface Regel {
  a: string;
  b: string;
  typ: string;
  stunden?: number;
  grund: string;
}

export const KATALOG = katalog as {
  slots: { id: string; name: string; standardZeit: string }[];
  wirkstoffe: Wirkstoff[];
  regeln: Regel[];
  quellen: { id: string; titel: string; url: string }[];
};

export const SLOT_IDS = KATALOG.slots.map((s) => s.id);

// regeln für ein präparat

export const praeparatSchema = z.object({
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben"), // mindestens 2 zeichen, sonst 400
  wirkstoffId: z.string().refine(
    (id) => KATALOG.wirkstoffe.some((w) => w.id === id),
    "Bitte einen Wirkstoff auswählen",
  ),
  dosis: z.string().trim().min(1, "Bitte eine Dosis angeben, z. B. 1 Tablette"),
  staerke: z.string().trim().max(30, "Stärke höchstens 30 Zeichen").default(""),
  proTag: z.number().int().min(1, "Mindestens 1-mal").max(3, "Höchstens 3-mal"),
  vorrat: z.number().int().min(0, "Vorrat darf nicht negativ sein").nullable(), // null heißt: vorrat wird nicht gezählt
  // 0 = sonntag, 6 = samstag
  tage: z.array(z.number().int().min(0).max(6)).min(1, "Bitte mindestens einen Wochentag wählen"),
});

export type Praeparat = z.infer<typeof praeparatSchema> & { id: string };

// eine uhrzeit pro zeitfenster

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

// einnahme = ein haken

export const einnahmeSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  praeparatId: z.string(),
  slot: z.string().refine((s) => SLOT_IDS.includes(s)),
});

export type Einnahme = z.infer<typeof einnahmeSchema>;
