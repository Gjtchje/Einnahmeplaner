<!-- startseite: plan für einen tag zum abhaken -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import * as api from '../api'
import ZeitfensterKarte from '../components/ZeitfensterKarte.vue'

// daten der seite (ref = vue aktualisiert die anzeige automatisch)
const katalog = ref<api.Katalog | null>(null)
const zeiten = ref<api.Tagesablauf>({})
const plan = ref<api.Plan | null>(null)
const abgehakt = ref<string[]>([]) // z. b. "id|fruehstueck"
const fehler = ref('')

// datum als text, z. b. "2026-11-17"
function alsText(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const heute = alsText(new Date())

// welcher tag gerade angezeigt wird (am anfang heute)
const gewaehlt = ref(heute)

// die 7 tage dieser woche für die knöpfe mo bis so
const woche = computed(() => {
  const montag = new Date()
  montag.setDate(montag.getDate() - ((montag.getDay() + 6) % 7)) // zurück bis montag
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

// alles vom backend laden (gleichzeitig = schneller)
async function laden() {
  fehler.value = ''
  try {
    const [k, t, p, e] = await Promise.all([ // promise.all = alles gleichzeitig laden
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

// anderen tag anzeigen
function zeigeTag(datum: string) {
  gewaehlt.value = datum
  laden()
}

// haken an/aus, danach neu laden (vorrat hat sich geändert)
async function haken(praeparatId: string, slot: string) {
  await api.umschalten({ datum: gewaehlt.value, praeparatId, slot })
  await laden()
}

function istAbgehakt(praeparatId: string, slot: string): boolean {
  return abgehakt.value.includes(`${praeparatId}|${slot}`)
}

// ids, die in diesem zeitfenster schon abgehakt sind
function abgehaktIn(slot: string): string[] {
  return abgehakt.value.filter((k) => k.endsWith(`|${slot}`)).map((k) => k.split('|')[0]!)
}

// computed = rechnet sich automatisch neu

// zeitfenster mit uhrzeit und präparaten, leere weg
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

// vorrat reicht keine 7 tage mehr
const nachkaufen = computed(() => {
  const alle = plan.value?.eintraege.map((e) => e.praeparat) ?? []
  const einzeln = alle.filter((p, i) => alle.findIndex((x) => x.id === p.id) === i) // ohne doppelte
  return einzeln.filter((p) => p.vorrat !== null && p.vorrat < 7 * p.proTag)
})

// erinnerungen: alle 30 sek prüfen, ob ein zeitfenster dran ist (nur wenn die app offen ist)
const unterstuetzt = typeof Notification !== 'undefined'
const erlaubnis = ref(unterstuetzt ? Notification.permission : 'denied') // "default", "granted" oder "denied"
const gemeldet: string[] = [] // schon gemeldete zeitfenster

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
  // immer heute prüfen, egal welcher tag angezeigt wird
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
// beim öffnen laden, dann alle 30 sek erinnerung prüfen
onMounted(async () => {
  await laden()
  erinnerungPruefen()
  timer = setInterval(erinnerungPruefen, 30_000) // alle 30 sek ausführen
})
onUnmounted(() => clearInterval(timer)) // beim verlassen der seite timer stoppen
</script>

<template>
  <main>
    <h1>{{ ueberschrift }}</h1>
    <p class="unterzeile">{{ erledigt }} von {{ anzahl }} erledigt</p>

    <!-- knöpfe mo bis so, :class = farbe für heute/ausgewählt, @click = tag zeigen -->
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

    <!-- ein kasten pro zeitfenster: :name usw. = props rein, @haken = emit raus -->
    <ZeitfensterKarte
      v-for="fenster in zeitfenster"
      :key="fenster.id"
      :name="fenster.name"
      :zeit="fenster.zeit"
      :eintraege="fenster.eintraege"
      :abgehakt="abgehaktIn(fenster.id)"
      @haken="(praeparatId) => haken(praeparatId, fenster.id)"
    />

    <!-- hinweise vom planer -->
    <section v-if="plan && plan.hinweise.length > 0">
      <h2>Hinweise</h2>
      <p v-for="h in plan.hinweise" :key="h" class="karte hinweis" :class="{ warnung: !h.startsWith('Tipp') }">
        {{ h }}
      </p>
    </section>

    <!-- vorrat (v-if = nur anzeigen, wenn was knapp ist) -->
    <section v-if="nachkaufen.length > 0">
      <h2>Bald nachkaufen</h2>
      <div v-for="p in nachkaufen" :key="p.id" class="karte zeile fest">
        <span>{{ p.name }}</span>
        <span class="etikett">noch {{ p.vorrat }} Stück</span>
      </div>
    </section>

    <!-- erinnerungen -->
    <h2>Erinnerungen</h2>
    <section class="karte erinnerung">
      <span v-if="!unterstuetzt">Dieser Browser kann keine Benachrichtigungen anzeigen.</span>
      <template v-else-if="erlaubnis === 'granted'">
        <span>🔔 Erinnerungen sind an – solange die App geöffnet ist.</span>
        <button class="klein-knopf" @click="testBenachrichtigung">Test-Benachrichtigung</button>
      </template>
      <template v-else-if="erlaubnis === 'denied'">
        <span>🔕 Benachrichtigungen sind blockiert. In Edge: Menü „…“ → Einstellungen → Cookies und Websiteberechtigungen
        → Benachrichtigungen → localhost erlauben. Außerdem in Windows: Einstellungen → System → Benachrichtigungen → Microsoft Edge an.</span>
      </template>
      <button v-else class="haupt" @click="erinnerungEinschalten">🔔 Erinnerungen einschalten</button>
    </section>
  </main>
</template>

<style scoped>
.woche { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.35rem; margin-bottom: var(--abstand); }
.woche button { border-radius: 12px; padding: 0.45rem 0; line-height: 1.3; }
.woche button.heute { border-color: var(--orange); }
.woche button.aktiv { background: var(--gruen); border-color: var(--gruen); color: white; }

.erinnerung { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; font-size: 0.9rem; }
</style>
