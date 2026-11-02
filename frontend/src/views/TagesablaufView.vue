<script setup lang="ts">
// Seite "Tagesablauf": Uhrzeiten der sechs Zeitfenster einstellen.
// Der Planer rechnet mit diesen Uhrzeiten die Abstände aus – wer z. B. spät
// frühstückt, hat mehr Abstand zwischen "nüchtern" und "Frühstück".
import { onMounted, ref } from 'vue'
import { ApiFehler, ladeTagesablauf, speichereTagesablauf } from '@/api'
import type { SlotId, Tagesablauf } from '@/types'
import FormFeld from '@/components/FormFeld.vue'
import { useKatalog } from '@/composables/useKatalog'

const { katalog } = useKatalog()

const zeiten = ref<Tagesablauf | null>(null)
const laedt = ref(true)
const speichert = ref(false)
const fehler = ref('')
const feldFehler = ref<Partial<Record<SlotId, string>>>({})
const gespeichert = ref(false)

const erklaerung: Record<SlotId, string> = {
  nuechtern: 'Direkt nach dem Aufstehen, vor dem Essen',
  fruehstueck: 'Deine erste Mahlzeit',
  vormittag: 'Zwischen Frühstück und Mittagessen, ohne Essen',
  mittag: 'Mittagessen',
  abendessen: 'Abendessen',
  schlafen: 'Kurz bevor du ins Bett gehst',
}

async function laden() {
  try {
    zeiten.value = await ladeTagesablauf()
  } catch (e) {
    fehler.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler'
  } finally {
    laedt.value = false
  }
}

async function speichern() {
  if (!zeiten.value) return
  speichert.value = true
  fehler.value = ''
  feldFehler.value = {}
  gespeichert.value = false
  try {
    zeiten.value = await speichereTagesablauf(zeiten.value)
    gespeichert.value = true
  } catch (e) {
    if (e instanceof ApiFehler && e.details.length) {
      for (const d of e.details) {
        // Fehler der Reihenfolge-Regel haben kein bestimmtes Feld
        if (d.feld) feldFehler.value[d.feld as SlotId] = d.meldung
        else fehler.value = d.meldung
      }
    } else {
      fehler.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler'
    }
  } finally {
    speichert.value = false
  }
}

// Standardzeiten aus dem Katalog übernehmen (noch nicht gespeichert)
function standard() {
  if (!katalog.value) return
  zeiten.value = Object.fromEntries(katalog.value.slots.map((s) => [s.id, s.standardZeit])) as Tagesablauf
  gespeichert.value = false
}

onMounted(laden)
</script>

<template>
  <main class="seite">
    <header>
      <h1>Tagesablauf</h1>
      <p>Wann isst du, wann gehst du schlafen? Der Plan berechnet die Abstände zwischen den Mitteln aus diesen Uhrzeiten.</p>
    </header>

    <p v-if="laedt" class="zustand">Lade …</p>

    <form v-else-if="zeiten && katalog" class="karte formular" novalidate @submit.prevent="speichern">
      <div v-for="s in katalog.slots" :key="s.id" class="zeile">
        <div>
          <strong>{{ s.name }}</strong>
          <p class="klein">{{ erklaerung[s.id] }}</p>
        </div>
        <FormFeld v-model="zeiten[s.id]" :label="`Uhrzeit ${s.name}`" typ="time" :fehler="feldFehler[s.id]" class="zeitfeld" />
      </div>

      <p v-if="fehler" class="fehlertext" role="alert">{{ fehler }}</p>
      <p v-if="gespeichert" class="erfolg" role="status">Gespeichert – dein Plan ist aktualisiert.</p>

      <div class="aktionen">
        <button type="submit" class="knopf primaer" :disabled="speichert">
          {{ speichert ? 'Speichert …' : 'Speichern' }}
        </button>
        <button type="button" class="knopf" @click="standard">Standardzeiten</button>
      </div>
    </form>

    <p v-else class="zustand fehler" role="alert">{{ fehler || 'Konnte nicht geladen werden.' }}</p>
  </main>
</template>

<style scoped>
.formular { display: grid; gap: 0.25rem; }

.zeile {
  display: grid;
  grid-template-columns: 1fr 9rem;
  gap: 1rem;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--rand);
}
.zeile p { margin: 0.1rem 0 0; }

/* Die Beschriftung steht schon links – im Feld nur für Screenreader */
.zeitfeld :deep(label) {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.fehlertext { color: var(--fehler); margin: 0.75rem 0 0; }
.erfolg { color: var(--akzent); font-weight: 500; margin: 0.75rem 0 0; }
.aktionen { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
</style>
