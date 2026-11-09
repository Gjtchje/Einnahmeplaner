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

export interface Katalog {
  slots: { id: string, name: string, standardZeit: string }[]
  wirkstoffe: Wirkstoff[]
  quellen: { id: string, titel: string, url: string }[]
}

export interface Praeparat {
  id: string
  name: string
  wirkstoffId: string
  dosis: string
  proTag: number
  vorrat: number | null
}

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

export const ladePlan = (): Promise<Plan> => anfrage('/api/plan')
export const ladeEinnahmen = (datum: string): Promise<Einnahme[]> => anfrage(`/api/einnahmen?datum=${datum}`)
export const umschalten = (e: Einnahme) => anfrage('/api/einnahmen/umschalten', 'POST', e)
