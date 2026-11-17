// api: alle anfragen ans backend, die seiten rufen nur diese funktionen auf

// typen: so sehen die daten vom backend aus

export interface Wirkstoff {
  id: string
  name: string
  kategorie: string // "nem" oder "medikament"
  slots: string[]
  hinweise: string[]
}

export interface Katalog {
  slots: { id: string, name: string, standardZeit: string }[]
  wirkstoffe: Wirkstoff[]
  quellen: { id: string, titel: string, url: string }[]
}

export interface Praeparat {
  id: string
  name: string
  wirkstoffId: string
  dosis: string // z. b. "1 tablette"
  staerke: string // z. b. "500 mg", darf leer sein
  proTag: number
  vorrat: number | null
  tage: number[] // 0 = sonntag ... 6 = samstag
}

// wochentage für die knöpfe mo bis so
export const WOCHENTAGE = [
  { nr: 1, kurz: 'Mo', lang: 'Montag' },
  { nr: 2, kurz: 'Di', lang: 'Dienstag' },
  { nr: 3, kurz: 'Mi', lang: 'Mittwoch' },
  { nr: 4, kurz: 'Do', lang: 'Donnerstag' },
  { nr: 5, kurz: 'Fr', lang: 'Freitag' },
  { nr: 6, kurz: 'Sa', lang: 'Samstag' },
  { nr: 0, kurz: 'So', lang: 'Sonntag' },
]

// präparat ohne id, die vergibt der server
export type NeuesPraeparat = Omit<Praeparat, 'id'>

export type Tagesablauf = Record<string, string> // z. b. { fruehstueck: "07:30" }

// plan vom server: einträge + hinweise
export interface Plan {
  eintraege: { praeparat: Praeparat, wirkstoff: Wirkstoff, slot: string }[]
  hinweise: string[]
}

// ein haken: datum, präparat, zeitfenster
export interface Einnahme {
  datum: string
  praeparatId: string
  slot: string
}

// schickt anfrage ans backend, prüft antwort, wirft fehler oder gibt json zurück

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
  // 204 = ok, aber ohne inhalt (z. b. nach dem löschen)
  const ergebnis = antwort.status === 204 ? null : await antwort.json()
  if (!antwort.ok) {
    throw new Error(ergebnis?.fehler ?? `Fehler ${antwort.status}`)
  }
  return ergebnis
}

// eine funktion pro api-adresse

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
