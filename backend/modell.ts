// Einnahmeplaner – Datenmodell
// Die Zod-Schemas beschreiben, wie gültige Daten aussehen.
// Aus den Schemas leiten wir die TypeScript-Typen ab (z.infer). Dadurch gibt
// es nur EINE Stelle, an der das Modell definiert ist.
import { z } from "zod";
import { SLOT_IDS, WIRKSTOFF_IDS } from "./katalog.ts";

export const EINHEITEN = [
  "Tablette",
  "Kapsel",
  "Tropfen",
  "Messlöffel",
  "Beutel",
  "ml",
] as const;

// ---------------------------------------------------------------------------
// Präparat: ein Mittel, das der Nutzer einnimmt (z. B. "Vitamin D3 von dm")
// ---------------------------------------------------------------------------

// Was der Client beim Anlegen/Ändern schicken darf.
// Bewusst NICHT enthalten: id, erstelltAm, geaendertAm – die setzt der Server.
export const praeparatEingabeSchema = z.object({
  name: z.string("Name fehlt").trim()
    .min(2, "Name muss mindestens 2 Zeichen haben")
    .max(80, "Name darf höchstens 80 Zeichen haben"),
  wirkstoffId: z.string("Wirkstoff fehlt")
    .min(1, "Bitte einen Wirkstoff wählen")
    .refine((id) => WIRKSTOFF_IDS.includes(id), "Unbekannter Wirkstoff"),
  staerke: z.string().trim()
    .max(40, "Stärke darf höchstens 40 Zeichen haben")
    .optional().default(""),
  menge: z.number("Menge muss eine Zahl sein")
    .positive("Menge muss größer als 0 sein")
    .max(50, "Menge ist unrealistisch hoch"),
  einheit: z.enum(EINHEITEN, "Unbekannte Einheit"),
  proTag: z.number("Anzahl pro Tag muss eine Zahl sein")
    .int("Anzahl pro Tag muss eine ganze Zahl sein")
    .min(1, "Mindestens 1-mal pro Tag")
    .max(3, "Höchstens 3-mal pro Tag"),
  // null = Vorrat wird nicht gezählt
  vorrat: z.number("Vorrat muss eine Zahl sein")
    .min(0, "Vorrat darf nicht negativ sein")
    .max(10000, "Vorrat ist unrealistisch hoch")
    .nullable().optional().default(null),
  notiz: z.string().trim()
    .max(300, "Notiz darf höchstens 300 Zeichen haben")
    .optional().default(""),
});

export type PraeparatEingabe = z.infer<typeof praeparatEingabeSchema>;

// So sieht ein gespeichertes Präparat aus: Eingabe + Felder vom Server.
export type Praeparat = PraeparatEingabe & {
  id: string;
  erstelltAm: string;
  geaendertAm: string;
};

// ---------------------------------------------------------------------------
// Tagesablauf: Uhrzeit für jedes der sechs Zeitfenster
// ---------------------------------------------------------------------------

const zeitSchema = z.string("Uhrzeit fehlt")
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit muss im Format HH:MM sein");

export function inMinuten(zeit: string): number {
  const [stunden, minuten] = zeit.split(":").map(Number);
  return stunden * 60 + minuten;
}

export const tagesablaufSchema = z.object({
  nuechtern: zeitSchema,
  fruehstueck: zeitSchema,
  vormittag: zeitSchema,
  mittag: zeitSchema,
  abendessen: zeitSchema,
  schlafen: zeitSchema,
}).refine(
  // Geschäftsregel: Die Zeitfenster müssen in der Reihenfolge des Tages liegen,
  // sonst wären die Abstandsberechnungen des Planers sinnlos.
  (t) => SLOT_IDS.every((id, i) => i === 0 || inMinuten(t[SLOT_IDS[i - 1]]) < inMinuten(t[id])),
  "Die Uhrzeiten müssen in der Reihenfolge des Tages liegen (nüchtern → … → Schlafen)",
);

export type Tagesablauf = z.infer<typeof tagesablaufSchema>;

// ---------------------------------------------------------------------------
// Einnahme: "Präparat X wurde am Tag Y im Zeitfenster Z genommen" (Abhaken)
// ---------------------------------------------------------------------------

const datumSchema = z.string("Datum fehlt")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss im Format JJJJ-MM-TT sein");

export const einnahmeSchema = z.object({
  datum: datumSchema,
  praeparatId: z.uuid("Ungültige Präparat-ID"),
  slot: z.enum(SLOT_IDS, "Unbekanntes Zeitfenster"),
});

export type EinnahmeEingabe = z.infer<typeof einnahmeSchema>;

export type Einnahme = EinnahmeEingabe & {
  zeitpunkt: string; // wann genau abgehakt wurde (ISO-Zeitstempel)
};

// Pfad-Parameter und Query-Parameter
export const idSchema = z.object({ id: z.uuid("Ungültige ID") });
export const wirkstoffIdSchema = z.object({ id: z.string() });
export const datumQuerySchema = z.object({ datum: datumSchema });
