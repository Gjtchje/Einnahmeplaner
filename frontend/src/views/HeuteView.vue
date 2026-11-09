<!-- HeuteView.vue – Startseite: der Plan für heute zum Abhaken. -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import * as api from '../api'
import ZeitfensterKarte from '../components/ZeitfensterKarte.vue'

// ---- Daten (ref = Vue zeigt Änderungen automatisch an) ----
const katalog = ref<api.Katalog | null>(null)
const zeiten = ref<api.Tagesablauf>({})
const plan = ref<api.Plan | null>(null)
const abgehakt = ref<string[]>([]) // z. B. ["<praeparatId>|fruehstueck", ...]
const fehler = ref('')

// Datum als Text, z. B. "2026-11-09" (im Browser bestimmt = richtige Zeitzone)
function alsText(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const heute = alsText(new Date())

// Welcher Tag wird gerade angezeigt? Am Anfang: heute
const gewaehlt = ref(heute)

// Die 7 Tage dieser Woche, Montag bis Sonntag – für die Tages-Knöpfe oben
const woche = computed(() => {
  const montag = new Date()
  montag.setDate(montag.getDate() - ((montag.getDay() + 6) % 7)) // zurück bis Montag
  return api.WOCHENTAGE.map((tag, i) => {
    const d = new Date(montag)
    d.setDate(montag.getDate() + i)
    return { datum: alsText(d), kurz: tag.kurz, lang: tag.lang, nummer: d.getDate() }
  })
})

const ueberschrift = computed(() => {
  if (gewaehlt.value === heute) return 'Dein Plan für heute'
  const tag = woche.value.find((t) => t.datum === gewaehlt.value)
  return `Dein Plan für ${tag?.lang ?? gewaehlt.value}`
})

// Alles vom Backend laden – gleichzeitig, damit es schneller geht
async function laden() {
  fehler.value = ''
  try {
    const [k, t, p, e] = await Promise.all([
      api.ladeKatalog(), api.ladeTagesablauf(), api.ladePlan(gewaehlt.value), api.ladeEinnahmen(gewaehlt.value),
    ])
    katalog.value = k
    zeiten.value = t
    plan.value = p
    abgehakt.value = e.map((einnahme) => `${einnahme.praeparatId}|${einnahme.slot}`)
  } catch (err) {
    fehler.value = (err as Error).message
  }
}

// ---- Wochenstatistik: von Montag bis heute ----
const statistik = ref<api.Statistik | null>(null)

async function ladeStatistik() {
  statistik.value = await api.ladeStatistik(woche.value[0]!.datum, heute)
}

// Anderen Tag anzeigen
function zeigeTag(datum: string) {
  gewaehlt.value = datum
  laden()
}

// Haken setzen oder entfernen, danach neu laden (der Vorrat hat sich geändert)
async function haken(praeparatId: string, slot: string) {
  await api.umschalten({ datum: gewaehlt.value, praeparatId, slot })
  await laden()
  await ladeStatistik()
}

// "Alle abhaken": jedes noch offene Präparat in diesem Zeitfenster einmal umschalten
async function alleAbhaken(slot: string) {
  for (const id of offeneIn(slot)) {
    await api.umschalten({ datum: gewaehlt.value, praeparatId: id, slot })
  }
  await laden()
  await ladeStatistik()
}

function offeneIn(slot: string): string[] {
  return plan.value!.eintraege
    .filter((e) => e.slot === slot && !istAbgehakt(e.praeparat.id, slot))
    .map((e) => e.praeparat.id)
}

function istAbgehakt(praeparatId: string, slot: string): boolean {
  return abgehakt.value.includes(`${praeparatId}|${slot}`)
}

// IDs der Präparate, die in einem Zeitfenster schon abgehakt sind
function abgehaktIn(slot: string): string[] {
  return abgehakt.value.filter((k) => k.endsWith(`|${slot}`)).map((k) => k.split('|')[0]!)
}

// ---- Berechnete Werte (computed = wird automatisch neu berechnet) ----

// Die Zeitfenster mit Uhrzeit und den Präparaten darin – leere weglassen
const zeitfenster = computed(() => {
  if (!katalog.value || !plan.value) return []
  return katalog.value.slots
    .map((s) => ({
      id: s.id,
      name: s.name,
      zeit: zeiten.value[s.id] ?? '',
      eintraege: plan.value!.eintraege.filter((e) => e.slot === s.id),
    }))
    .filter((s) => s.eintraege.length > 0)
})

const anzahl = computed(() => plan.value?.eintraege.length ?? 0)
const erledigt = computed(() =>
  plan.value?.eintraege.filter((e) => istAbgehakt(e.praeparat.id, e.slot)).length ?? 0,
)

// Präparate, deren Vorrat weniger als 7 Tage reicht
const nachkaufen = computed(() => {
  const alle = plan.value?.eintraege.map((e) => e.praeparat) ?? []
  const einzeln = alle.filter((p, i) => alle.findIndex((x) => x.id === p.id) === i) // ohne Doppelte
  return einzeln.filter((p) => p.vorrat !== null && p.vorrat < 7 * p.proTag)
})

// ---- Erinnerungen per Browser-Benachrichtigung ----
// Solange die App offen ist, wird alle 30 Sekunden geprüft: Ist heute ein
// Zeitfenster dran (Uhrzeit erreicht, höchstens 30 Minuten her) und ist darin
// noch etwas offen? Dann kommt eine Benachrichtigung – pro Zeitfenster nur einmal.
const unterstuetzt = typeof Notification !== 'undefined'
const erlaubnis = ref(unterstuetzt ? Notification.permission : 'denied') // "default", "granted" oder "denied"
const gemeldet: string[] = [] // z. B. ["2026-11-09|fruehstueck"]

async function erinnerungEinschalten() {
  erlaubnis.value = await Notification.requestPermission()
}

function testBenachrichtigung() {
  new Notification('Einnahmeplaner', { body: 'So sieht eine Erinnerung aus.', icon: '/favicon.svg' })
}

function inMinuten(zeit: string): number {
  const [stunden, minuten] = zeit.split(':').map(Number)
  return stunden! * 60 + minuten!
}

async function erinnerungPruefen() {
  if (erlaubnis.value !== 'granted') return
  const jetzt = new Date()
  const minutenJetzt = jetzt.getHours() * 60 + jetzt.getMinutes()
  // Immer den Plan von HEUTE prüfen – egal, welcher Tag gerade angezeigt wird
  const [planHeute, einnahmen] = await Promise.all([api.ladePlan(heute), api.ladeEinnahmen(heute)])
  const abgehaktHeute = einnahmen.map((e) => `${e.praeparatId}|${e.slot}`)

  for (const [slot, zeit] of Object.entries(zeiten.value)) {
    const offen = planHeute.eintraege.filter((e) => e.slot === slot && !abgehaktHeute.includes(`${e.praeparat.id}|${slot}`))
    const seitMinuten = minutenJetzt - inMinuten(zeit)
    const schluessel = `${heute}|${slot}`
    if (offen.length > 0 && seitMinuten >= 0 && seitMinuten <= 30 && !gemeldet.includes(schluessel)) {
      gemeldet.push(schluessel)
      new Notification(`${zeit} Uhr: Zeit für deine Mittel`, {
        body: offen.map((e) => e.praeparat.name).join(', '),
        icon: '/favicon.svg',
      })
    }
  }
}

let timer: number
onMounted(async () => {
  await laden()
  await ladeStatistik()
  erinnerungPruefen()
  timer = setInterval(erinnerungPruefen, 30_000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <main>
    <h1>{{ ueberschrift }}</h1>
    <p class="unterzeile">
      {{ erledigt }} von {{ anzahl }} erledigt
      <span v-if="statistik && statistik.soll > 0">
        · diese Woche bisher {{ statistik.prozent }} % ({{ statistik.ist }} von {{ statistik.soll }})
      </span>
    </p>

    <!-- Tages-Knöpfe: Montag bis Sonntag dieser Woche -->
    <nav class="woche" aria-label="Tag auswählen">
      <button
        v-for="tag in woche"
        :key="tag.datum"
        :class="{ aktiv: tag.datum === gewaehlt, heute: tag.datum === heute }"
        @click="zeigeTag(tag.datum)"
      >
        {{ tag.kurz }}<br><strong>{{ tag.nummer }}</strong>
      </button>
    </nav>

    <p v-if="fehler" class="fehler">{{ fehler }}</p>

    <p v-if="plan && anzahl === 0" class="karte">
      An diesem Tag ist nichts geplant. Präparate legst du unter
      <RouterLink to="/praeparate">Präparate</RouterLink> an.
    </p>

    <!-- Ein Kasten pro Zeitfenster (eigene Komponente, siehe components/ZeitfensterKarte.vue) -->
    <ZeitfensterKarte
      v-for="fenster in zeitfenster"
      :key="fenster.id"
      :name="fenster.name"
      :zeit="fenster.zeit"
      :eintraege="fenster.eintraege"
      :abgehakt="abgehaktIn(fenster.id)"
      @haken="(praeparatId) => haken(praeparatId, fenster.id)"
      @alle-abhaken="alleAbhaken(fenster.id)"
    />

    <!-- Hinweise des Planers -->
    <section v-if="plan && plan.hinweise.length > 0">
      <h2>Hinweise</h2>
      <p v-for="h in plan.hinweise" :key="h" class="karte hinweis" :class="{ warnung: !h.startsWith('Tipp') }">
        {{ h }}
      </p>
    </section>

    <!-- Vorrat -->
    <section v-if="nachkaufen.length > 0">
      <h2>Bald nachkaufen</h2>
      <p v-for="p in nachkaufen" :key="p.id" class="karte">
        {{ p.name }} <span class="etikett">noch {{ p.vorrat }} Stück</span>
      </p>
    </section>

    <!-- Erinnerungen -->
    <section class="karte erinnerung">
      <template v-if="!unterstuetzt">Dieser Browser kann keine Benachrichtigungen anzeigen.</template>
      <template v-else-if="erlaubnis === 'granted'">
        🔔 Erinnerungen sind an – solange die App geöffnet ist.
        <button @click="testBenachrichtigung">Test-Benachrichtigung</button>
      </template>
      <template v-else-if="erlaubnis === 'denied'">
        🔕 Benachrichtigungen sind blockiert. In Edge: Menü „…“ → Einstellungen → Cookies und Websiteberechtigungen
        → Benachrichtigungen → localhost erlauben. Außerdem in Windows: Einstellungen → System → Benachrichtigungen → Microsoft Edge an.
      </template>
      <button v-else class="haupt" @click="erinnerungEinschalten">🔔 Erinnerungen einschalten</button>
    </section>
  </main>
</template>

<style scoped>
h2 { font-size: 1.2rem; margin: 1.5rem 0 0.5rem; }
.hinweis { background: var(--gruen-hell); }
.hinweis.warnung { background: var(--orange-hell); }

.woche { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.3rem; margin-bottom: 1rem; }
.woche button { border-radius: 12px; padding: 0.4rem 0; line-height: 1.3; }
.woche button.heute { border-color: var(--orange); }
.woche button.aktiv { background: var(--gruen); border-color: var(--gruen); color: white; }

.erinnerung { margin-top: 1.5rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.9rem; }
</style>
