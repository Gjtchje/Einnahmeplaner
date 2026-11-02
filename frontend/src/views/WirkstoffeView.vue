<script setup lang="ts">
// Seite "Wirkstoffe": Nachschlagen, welche Regeln für welchen Wirkstoff
// gelten – mit Quellen. Die Details eines Wirkstoffs (Regeln mit Namen der
// Partner) werden erst beim Aufklappen vom Server geladen.
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ApiFehler, ladeWirkstoff } from '@/api'
import type { Quelle, WirkstoffDetail } from '@/types'
import { useKatalog } from '@/composables/useKatalog'

const { katalog, wirkstoffe, fehler: katalogFehler } = useKatalog()
const route = useRoute()

type Filter = 'alle' | 'nem' | 'medikament'
const filter = ref<Filter>('alle')
const offen = ref<string | null>(null)
const details = ref<Record<string, WirkstoffDetail>>({})
const fehler = ref('')

const sichtbar = computed(() =>
  wirkstoffe.value.filter((w) => filter.value === 'alle' || w.kategorie === filter.value),
)

const slotName = (id: string) => katalog.value?.slots.find((s) => s.id === id)?.name ?? id

const regelText: Record<string, string> = {
  abstand: 'Abstand',
  zusammen: 'Gut zusammen',
  warnung: 'Warnung',
}

// Alle Quellen eines Wirkstoffs: seine eigenen plus die seiner Regeln, ohne Doppelte
function alleQuellen(d: WirkstoffDetail): Quelle[] {
  const nachId = new Map<string, Quelle>()
  for (const q of [...d.quellen, ...d.regeln.map((r) => r.quelle)]) nachId.set(q.id, q)
  return [...nachId.values()]
}

async function umschalten(id: string) {
  if (offen.value === id) {
    offen.value = null
    return
  }
  offen.value = id
  if (!details.value[id]) {
    try {
      details.value[id] = await ladeWirkstoff(id)
    } catch (e) {
      fehler.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler'
    }
  }
}

// Kommt man über einen Link wie /wirkstoffe#eisen, wird Eisen direkt aufgeklappt.
onMounted(async () => {
  const id = route.hash.slice(1)
  if (id) {
    await umschalten(id)
    await nextTick()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})
</script>

<template>
  <main class="seite">
    <header>
      <h1>Wirkstoffe</h1>
      <p>Welche Regeln der Planer kennt – und woher sie stammen.</p>
    </header>

    <div class="filter" role="group" aria-label="Filter">
      <button class="knopf" :class="{ primaer: filter === 'alle' }" :aria-pressed="filter === 'alle'" @click="filter = 'alle'">Alle</button>
      <button class="knopf" :class="{ primaer: filter === 'nem' }" :aria-pressed="filter === 'nem'" @click="filter = 'nem'">Nahrungsergänzung</button>
      <button class="knopf" :class="{ primaer: filter === 'medikament' }" :aria-pressed="filter === 'medikament'" @click="filter = 'medikament'">Medikamente</button>
    </div>

    <p v-if="katalogFehler" class="zustand fehler" role="alert">{{ katalogFehler }}</p>
    <p v-else-if="!katalog" class="zustand">Lade …</p>

    <ul v-else class="liste">
      <li v-for="w in sichtbar" :id="w.id" :key="w.id" class="karte">
        <button class="kopf" :aria-expanded="offen === w.id" @click="umschalten(w.id)">
          <span class="titel">
            <h2>{{ w.name }}</h2>
            <span v-if="w.kategorie === 'medikament'" class="etikett medikament">Medikament</span>
          </span>
          <span class="klein">Am besten: {{ w.slots.map(slotName).join(' / ') }}</span>
          <span class="pfeil" aria-hidden="true">{{ offen === w.id ? '–' : '+' }}</span>
        </button>

        <div v-if="offen === w.id" class="inhalt">
          <ul class="hinweise">
            <li v-for="h in w.hinweise" :key="h">{{ h }}</li>
          </ul>

          <template v-if="details[w.id]">
            <h3 v-if="details[w.id]!.regeln.length">Regeln</h3>
            <ul class="regeln">
              <li v-for="(r, i) in details[w.id]!.regeln" :key="i">
                <span class="etikett" :class="{ warnung: r.typ === 'abstand', fehler: r.typ === 'warnung' }">
                  {{ regelText[r.typ] }}{{ r.stunden ? ` · ${r.stunden} h` : '' }}
                </span>
                <span><strong>{{ r.mitName }}</strong> – {{ r.grund }}</span>
              </li>
            </ul>
            <h3>Quellen</h3>
            <ul class="quellen">
              <li v-for="q in alleQuellen(details[w.id]!)" :key="q.id">
                <a :href="q.url" target="_blank" rel="noopener">{{ q.titel }}</a>
              </li>
            </ul>
          </template>
          <p v-else-if="fehler" class="fehlertext">{{ fehler }}</p>
          <p v-else class="klein">Lade Regeln …</p>
        </div>
      </li>
    </ul>

    <p v-if="katalog" class="klein stand">Datenstand: {{ katalog.stand }}. {{ katalog.hinweis }}</p>
  </main>
</template>

<style scoped>
.filter { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem; }

.liste { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
.liste > li { padding: 0; scroll-margin-top: 5rem; }

.kopf {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.2rem 1rem;
  padding: 0.9rem 1.1rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}
.titel { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.titel h2 { font-size: 1.1rem; }
.kopf .klein { grid-column: 1; }
.pfeil { grid-column: 2; grid-row: 1 / 3; align-self: center; font-size: 1.4rem; color: var(--akzent); }

.inhalt { padding: 0 1.1rem 1rem; display: grid; gap: 0.5rem; }
.inhalt h3 { font-family: var(--schrift-text); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-leise); margin-top: 0.5rem; }
.hinweise { margin: 0; padding-left: 1.1rem; }
.regeln, .quellen { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; font-size: 0.9rem; }
.regeln li { display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
.quellen a { font-size: 0.85rem; }
.fehlertext { color: var(--fehler); }
.stand { margin-top: 1.5rem; }
</style>
