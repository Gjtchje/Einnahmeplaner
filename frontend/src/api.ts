// api.ts – Alle Anfragen an das Backend.
// Die Seiten (Views) rufen nur diese Funktionen auf und müssen nichts über
// URLs oder HTTP wissen.

// ---- Typen: so sehen die Daten aus, die das Backend schickt ----

export interface Wirkstoff {
  id: string
  name: string
  kategorie: string // "nem" oder "medikament"
  slots: string[]
  hinweise: string[]
}

export interface Regel {
  a: string
  b: string
  typ: string // "abstand", "zusammen" oder "warnung"
  stunden?: number
  grund: string
  quelle: string
}

export interface Katalog {
  slots: { id: string, name: string, standardZeit: string }[]
  wirkstoffe: Wirkstoff[]
  regeln: Regel[]
  quellen: { id: string, titel: string, url: string }[]
}

export interface Statistik {
  soll: number // so viele Einnahmen waren geplant
  ist: number // so viele wurden abgehakt
  prozent: number
}

export interface Praeparat {
  id: string
  name: string
  wirkstoffId: string
  dosis: string
  proTag: number
  vorrat: number | null
  tage: number[] // Wochentage: 0 = Sonntag, 1 = Montag, ... 6 = Samstag
}

// Wochentage in der Reihenfolge Montag bis Sonntag (für Anzeige und Formular)
export const WOCHENTAGE = [
  { nr: 1, kurz: 'Mo', lang: 'Montag' },
  { nr: 2, kurz: 'Di', lang: 'Dienstag' },
  { nr: 3, kurz: 'Mi', lang: 'Mittwoch' },
  { nr: 4, kurz: 'Do', lang: 'Donnerstag' },
  { nr: 5, kurz: 'Fr', lang: 'Freitag' },
  { nr: 6, kurz: 'Sa', lang: 'Samstag' },
  { nr: 0, kurz: 'So', lang: 'Sonntag' },
]

// Beim Anlegen gibt es noch keine id – die vergibt der Server
export type NeuesPraeparat = Omit<Praeparat, 'id'>

export type Tagesablauf = Record<string, string> // z. B. { fruehstueck: "07:30" }

export interface Plan {
  eintraege: { praeparat: Praeparat, wirkstoff: Wirkstoff, slot: string }[]
  hinweise: string[]
}

export interface Einnahme {
  datum: string
  praeparatId: string
  slot: string
}

// ---- Gemeinsame Hilfsfunktion für alle Anfragen ----

async function anfrage(url: string, methode = 'GET', daten?: unknown) {
  let antwort: Response
  try {
    antwort = await fetch(url, {
      method: methode,
      headers: { 'Content-Type': 'application/json' },
      body: daten ? JSON.stringify(daten) : undefined,
    })
  } catch {
    throw new Error('Server nicht erreichbar – läuft das Backend?')
  }
  // 204 = "erfolgreich, aber ohne Inhalt" (z. B. nach dem Löschen)
  const ergebnis = antwort.status === 204 ? null : await antwort.json()
  if (!antwort.ok) {
    throw new Error(ergebnis?.fehler ?? `Fehler ${antwort.status}`)
  }
  return ergebnis
}

// ---- Die einzelnen Anfragen ----

export const ladeKatalog = (): Promise<Katalog> => anfrage('/api/katalog')

export const ladePraeparate = (): Promise<Praeparat[]> => anfrage('/api/praeparate')
export const erstellePraeparat = (p: NeuesPraeparat) => anfrage('/api/praeparate', 'POST', p)
export const aenderePraeparat = (id: string, p: NeuesPraeparat) => anfrage(`/api/praeparate/${id}`, 'PUT', p)
export const loeschePraeparat = (id: string) => anfrage(`/api/praeparate/${id}`, 'DELETE')

export const ladeTagesablauf = (): Promise<Tagesablauf> => anfrage('/api/tagesablauf')
export const speichereTagesablauf = (t: Tagesablauf) => anfrage('/api/tagesablauf', 'PUT', t)

export const ladePlan = (datum: string): Promise<Plan> => anfrage(`/api/plan?datum=${datum}`)
export const ladeEinnahmen = (datum: string): Promise<Einnahme[]> => anfrage(`/api/einnahmen?datum=${datum}`)
export const umschalten = (e: Einnahme) => anfrage('/api/einnahmen/umschalten', 'POST', e)
export const ladeStatistik = (von: string, bis: string): Promise<Statistik> =>
  anfrage(`/api/statistik?von=${von}&bis=${bis}`)
