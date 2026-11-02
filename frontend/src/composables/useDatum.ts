// Kleine Helfer rund um Datum und Uhrzeit.
// Wichtig: Das Datum wird im Browser bestimmt (lokale Zeitzone des Nutzers),
// nicht auf dem Server – sonst wäre "heute" kurz nach Mitternacht falsch.

// "2026-11-02" für den heutigen Tag
export function heuteAlsText(): string {
  const d = new Date()
  const monat = String(d.getMonth() + 1).padStart(2, '0')
  const tag = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${monat}-${tag}`
}

// "07:30" -> 450 (Minuten seit Mitternacht)
export function inMinuten(zeit: string): number {
  const [stunden = 0, minuten = 0] = zeit.split(':').map(Number)
  return stunden * 60 + minuten
}

// Aktuelle Uhrzeit in Minuten seit Mitternacht
export function jetztInMinuten(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

// "Montag, 2. November"
export function datumLang(): string {
  return new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}
