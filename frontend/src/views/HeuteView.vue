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

// Heutiges Datum als Text, z. B. "2026-11-07" (im Browser bestimmt = richtige Zeitzone)
function heute(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Alles vom Backend laden – gleichzeitig, damit es schneller geht
async function laden() {
  try {
    const [k, t, p, e] = await Promise.all([
      api.ladeKatalog(), api.ladeTagesablauf(), api.ladePlan(), api.ladeEinnahmen(heute()),
    ])
    katalog.value = k
    zeiten.value = t
    plan.value = p
    abgehakt.value = e.map((einnahme) => `${einnahme.praeparatId}|${einnahme.slot}`)
  } catch (err) {
    fehler.value = (err as Error).message
  }
}

// Haken setzen oder entfernen, danach neu laden (der Vorrat hat sich geändert)
async function haken(praeparatId: string, slot: string) {
  await api.umschalten({ datum: heute(), praeparatId, slot })
  await laden()
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
// Solange diese Seite offen ist, wird jede Minute geprüft, ob ein Zeitfenster dran ist.
const erinnerungAn = ref(typeof Notification !== 'undefined' && Notification.permission === 'granted')

async function erinnerungEinschalten() {
  erinnerungAn.value = (await Notification.requestPermission()) === 'granted'
}

function erinnerungPruefen() {
  if (!erinnerungAn.value) return
  const jetzt = new Date().toTimeString().slice(0, 5) // "07:30"
  for (const fenster of zeitfenster.value) {
    const offen = fenster.eintraege.filter((e) => !istAbgehakt(e.praeparat.id, fenster.id))
    if (fenster.zeit === jetzt && offen.length > 0) {
      new Notification(`${fenster.name}: Zeit für deine Mittel`, {
        body: offen.map((e) => e.praeparat.name).join(', '),
      })
    }
  }
}

let timer: number
onMounted(() => {
  laden()
  timer = setInterval(erinnerungPruefen, 60_000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <main>
    <h1>Dein Plan für heute</h1>
    <p class="unterzeile">{{ erledigt }} von {{ anzahl }} erledigt</p>

    <p v-if="fehler" class="fehler">{{ fehler }}</p>

    <p v-if="plan && anzahl === 0" class="karte">
      Noch keine Präparate. Lege unter <RouterLink to="/praeparate">Präparate</RouterLink> welche an.
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

    <button v-if="!erinnerungAn" @click="erinnerungEinschalten">🔔 Erinnerungen einschalten</button>
    <p v-else class="klein">🔔 Erinnerungen sind an (solange diese Seite offen ist).</p>
  </main>
</template>

<style scoped>
h2 { font-size: 1.2rem; margin: 1.5rem 0 0.5rem; }
.hinweis { background: var(--gruen-hell); }
.hinweis.warnung { background: var(--orange-hell); }
</style>
