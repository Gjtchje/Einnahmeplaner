// Einnahmeplaner – Typen im Frontend
// Diese Typen spiegeln, was das Backend schickt (siehe backend/modell.ts,
// backend/katalog.ts und backend/planer.ts). Sie sind der "Vertrag" zwischen
// Frontend und Backend: Ändert sich dort etwas, muss es hier nachgezogen werden.

export type SlotId = 'nuechtern' | 'fruehstueck' | 'vormittag' | 'mittag' | 'abendessen' | 'schlafen'

export const EINHEITEN = ['Tablette', 'Kapsel', 'Tropfen', 'Messlöffel', 'Beutel', 'ml'] as const
export type Einheit = typeof EINHEITEN[number]

// ---- Katalog (fest, kommt aus backend/daten/wirkstoffe.json) ----

export interface Slot {
  id: SlotId
  name: string
  standardZeit: string
  mahlzeit: boolean
}

export interface Wirkstoff {
  id: string
  name: string
  kategorie: 'nem' | 'medikament'
  slots: SlotId[]
  hinweise: string[]
  quellen: string[]
}

export interface Quelle {
  id: string
  titel: string
  url: string
}

export interface Regel {
  a: string
  b: string
  typ: 'abstand' | 'zusammen' | 'warnung'
  stunden?: number
  grund: string
  quelle: string
}

export interface Katalog {
  stand: string
  hinweis: string
  slots: Slot[]
  wirkstoffe: Wirkstoff[]
  regeln: Regel[]
  quellen: Quelle[]
}

export interface WirkstoffDetail extends Omit<Wirkstoff, 'quellen'> {
  quellen: Quelle[]
  regeln: (Omit<Regel, 'quelle'> & { mitId: string, mitName: string, quelle: Quelle })[]
}

// ---- Präparate (vom Nutzer angelegt) ----

export interface PraeparatEingabe {
  name: string
  wirkstoffId: string
  staerke: string
  menge: number
  einheit: Einheit
  proTag: number
  vorrat: number | null
  notiz: string
}

export interface Praeparat extends PraeparatEingabe {
  id: string
  erstelltAm: string
  geaendertAm: string
  // vom Server berechnet:
  wirkstoffName: string
  kategorie: 'nem' | 'medikament'
  reichweiteTage: number | null
  nachkaufen: boolean
}

// ---- Tagesablauf ----

export type Tagesablauf = Record<SlotId, string>

// ---- Plan ----

export interface PlanEintrag {
  praeparatId: string
  name: string
  wirkstoffId: string
  wirkstoffName: string
  dosis: string
  hinweise: string[]
}

export interface PlanSlot {
  slot: SlotId
  name: string
  zeit: string
  eintraege: PlanEintrag[]
}

export interface Meldung {
  art: 'konflikt' | 'ausweichen' | 'warnung' | 'tipp'
  text: string
  quelle?: Quelle
}

export interface Plan {
  slots: PlanSlot[]
  meldungen: Meldung[]
}

// ---- Einnahmen (Abhaken) ----

export interface EinnahmeEingabe {
  datum: string
  praeparatId: string
  slot: SlotId
}

export interface Einnahme extends EinnahmeEingabe {
  zeitpunkt: string
}
