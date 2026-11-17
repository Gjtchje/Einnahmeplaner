// modell: wie die daten aussehen + zod-prüfregeln

import { z } from "zod";
import katalog from "./daten/wirkstoffe.json" with { type: "json" };

// katalog (fest, aus wirkstoffe.json)

export interface Wirkstoff {
  id: string; // z. b. "eisen"
  name: string;
  kategorie: string; // "nem" oder "medikament"
  slots: string[]; // empfohlene zeitfenster, bestes zuerst
  hinweise: string[];
}

export interface Regel {
  a: string; // wirkstoff-ids
  b: string;
  typ: string; // "abstand", "zusammen" oder "warnung"
  stunden?: number; // nur bei abstand
  grund: string;
}

export const KATALOG = katalog as {
  slots: { id: string; name: string; standardZeit: string }[];
  wirkstoffe: Wirkstoff[];
  regeln: Regel[];
  quellen: { id: string; titel: string; url: string }[];
};

// die 6 zeitfenster in tagesreihenfolge
export const SLOT_IDS = KATALOG.slots.map((s) => s.id);

// präparat: zod prüft alles, was der browser schickt

export const praeparatSchema = z.object({
  name: z.string().trim().min(2, "Name muss mindestens 2 Zeichen haben"),
  wirkstoffId: z.string().refine(
    (id) => KATALOG.wirkstoffe.some((w) => w.id === id),
    "Bitte einen Wirkstoff auswählen",
  ),
  dosis: z.string().trim().min(1, "Bitte eine Dosis angeben, z. B. 1 Tablette"),
  staerke: z.string().trim().max(30, "Stärke höchstens 30 Zeichen").default(""), // optional, z. b. "500 mg"
  proTag: z.number().int().min(1, "Mindestens 1-mal").max(3, "Höchstens 3-mal"),
  vorrat: z.number().int().min(0, "Vorrat darf nicht negativ sein").nullable(), // null = vorrat nicht zählen
  // wochentage: 0 = sonntag ... 6 = samstag
  tage: z.array(z.number().int().min(0).max(6)).min(1, "Bitte mindestens einen Wochentag wählen"),
});

// typ aus dem schema, die id kommt vom server
export type Praeparat = z.infer<typeof praeparatSchema> & { id: string };

// tagesablauf: uhrzeit pro zeitfenster

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

// einnahme = ein haken (datum, präparat, zeitfenster)

export const einnahmeSchema = z.object({
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  praeparatId: z.string(),
  slot: z.string().refine((s) => SLOT_IDS.includes(s)),
});

export type Einnahme = z.infer<typeof einnahmeSchema>;
