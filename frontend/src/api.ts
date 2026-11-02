// Einnahmeplaner – API-Schicht
// Alle HTTP-Aufrufe an das Backend liegen hier. Komponenten rufen nur diese
// Funktionen auf und wissen nichts von URLs, Methoden oder Statuscodes.
import type {
  Einnahme, EinnahmeEingabe, Katalog, Plan, Praeparat, PraeparatEingabe, Tagesablauf, WirkstoffDetail,
} from './types'

export interface FeldFehler {
  feld: string
  meldung: string
}

// Fehler vom Server in einer einheitlichen Form.
// "details" enthält bei 400 die Feldfehler aus der Zod-Validierung.
export class ApiFehler extends Error {
  status: number
  details: FeldFehler[]

  constructor(status: number, nachricht: string, details: FeldFehler[] = []) {
    super(nachricht)
    this.status = status
    this.details = details
  }
}

// Gemeinsamer Kern für alle Anfragen: JSON senden, Antwort prüfen, JSON lesen.
async function anfrage<T>(url: string, optionen: RequestInit = {}): Promise<T> {
  let antwort: Response
  try {
    antwort = await fetch(url, {
      ...optionen,
      headers: { 'Content-Type': 'application/json', ...optionen.headers },
    })
  } catch {
    // fetch selbst schlägt nur fehl, wenn der Server gar nicht erreichbar ist
    throw new ApiFehler(0, 'Server nicht erreichbar. Läuft das Backend?')
  }

  if (!antwort.ok) {
    const koerper = await antwort.json().catch(() => ({}))
    throw new ApiFehler(antwort.status, koerper.fehler ?? `Fehler ${antwort.status}`, koerper.details)
  }

  // 204 No Content (z. B. nach DELETE) hat keinen Body
  if (antwort.status === 204) return undefined as T
  return antwort.json() as Promise<T>
}

// ---- Katalog ----

export function ladeKatalog(): Promise<Katalog> {
  return anfrage('/api/katalog')
}

export function ladeWirkstoff(id: string): Promise<WirkstoffDetail> {
  return anfrage(`/api/wirkstoffe/${encodeURIComponent(id)}`)
}

// ---- Präparate ----

export function ladePraeparate(): Promise<Praeparat[]> {
  return anfrage('/api/praeparate')
}

export function erstellePraeparat(daten: PraeparatEingabe): Promise<Praeparat> {
  return anfrage('/api/praeparate', { method: 'POST', body: JSON.stringify(daten) })
}

export function aenderePraeparat(id: string, daten: PraeparatEingabe): Promise<Praeparat> {
  return anfrage(`/api/praeparate/${id}`, { method: 'PUT', body: JSON.stringify(daten) })
}

export function loeschePraeparat(id: string): Promise<void> {
  return anfrage(`/api/praeparate/${id}`, { method: 'DELETE' })
}

// ---- Tagesablauf ----

export function ladeTagesablauf(): Promise<Tagesablauf> {
  return anfrage('/api/tagesablauf')
}

export function speichereTagesablauf(daten: Tagesablauf): Promise<Tagesablauf> {
  return anfrage('/api/tagesablauf', { method: 'PUT', body: JSON.stringify(daten) })
}

// ---- Plan und Einnahmen ----

export function ladePlan(): Promise<Plan> {
  return anfrage('/api/plan')
}

export function ladeEinnahmen(datum: string): Promise<Einnahme[]> {
  return anfrage(`/api/einnahmen?datum=${datum}`)
}

export function hakeAb(einnahme: EinnahmeEingabe): Promise<void> {
  return anfrage('/api/einnahmen', { method: 'POST', body: JSON.stringify(einnahme) })
}

export function nimmZurueck(einnahme: EinnahmeEingabe): Promise<void> {
  return anfrage('/api/einnahmen', { method: 'DELETE', body: JSON.stringify(einnahme) })
}
