// Composable: Erinnerungen per Browser-Benachrichtigung (Notification API)
//
// So funktioniert es:
//   1. Der Nutzer schaltet Erinnerungen ein -> der Browser fragt um Erlaubnis.
//   2. Solange die Seite "Heute" geöffnet ist, prüft ein Timer alle 30 Sekunden:
//      Ist gerade die Uhrzeit eines Zeitfensters erreicht, in dem noch etwas
//      offen ist? Dann erscheint eine Benachrichtigung.
//   3. Jedes Zeitfenster meldet sich pro Tag höchstens einmal.
//
// Grenze dieser einfachen Variante: Ist der Tab geschlossen, kommt keine
// Erinnerung. Dafür bräuchte man Web Push mit einem Service Worker
// (Ausbau zur PWA – siehe Doku).
import { onUnmounted, ref } from 'vue'
import { heuteAlsText, jetztInMinuten, inMinuten } from './useDatum'

const SPEICHER_SCHLUESSEL = 'einnahmeplaner-erinnerungen'

export interface OffenesZeitfenster {
  slot: string
  name: string
  zeit: string
  offen: string[] // Namen der noch nicht abgehakten Präparate
}

export function useErinnerungen(holeOffene: () => OffenesZeitfenster[]) {
  const unterstuetzt = typeof window !== 'undefined' && 'Notification' in window
  const erlaubnis = ref<NotificationPermission | 'nicht-unterstuetzt'>(
    unterstuetzt ? Notification.permission : 'nicht-unterstuetzt',
  )
  const aktiv = ref(unterstuetzt && Notification.permission === 'granted' && leseEinstellung())

  // Schon gemeldete Zeitfenster, z. B. "2026-11-02|fruehstueck"
  const gemeldet = new Set<string>()

  async function einschalten() {
    if (!unterstuetzt) return
    erlaubnis.value = await Notification.requestPermission()
    aktiv.value = erlaubnis.value === 'granted'
    speichereEinstellung(aktiv.value)
    if (aktiv.value) pruefen()
  }

  function ausschalten() {
    aktiv.value = false
    speichereEinstellung(false)
  }

  function pruefen() {
    if (!aktiv.value) return
    const jetzt = jetztInMinuten()
    const datum = heuteAlsText()
    for (const fenster of holeOffene()) {
      const schluessel = `${datum}|${fenster.slot}`
      // Fällig = Uhrzeit erreicht, aber höchstens 30 Minuten her
      const minutenSeither = jetzt - inMinuten(fenster.zeit)
      const faellig = minutenSeither >= 0 && minutenSeither <= 30
      if (faellig && fenster.offen.length > 0 && !gemeldet.has(schluessel)) {
        gemeldet.add(schluessel)
        new Notification(`${fenster.name} (${fenster.zeit})`, {
          body: `Jetzt dran: ${fenster.offen.join(', ')}`,
          icon: '/favicon.svg',
          tag: schluessel, // verhindert doppelte Benachrichtigungen
        })
      }
    }
  }

  const timer = setInterval(pruefen, 30_000)
  onUnmounted(() => clearInterval(timer))

  return { unterstuetzt, erlaubnis, aktiv, einschalten, ausschalten, pruefen }
}

function leseEinstellung(): boolean {
  try {
    return localStorage.getItem(SPEICHER_SCHLUESSEL) === 'an'
  } catch {
    return false
  }
}

function speichereEinstellung(an: boolean) {
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL, an ? 'an' : 'aus')
  } catch {
    // z. B. privater Modus – dann gilt die Einstellung nur bis zum Neuladen
  }
}
