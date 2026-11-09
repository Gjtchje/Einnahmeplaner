<!-- PraeparateView.vue – Präparate anlegen, ändern und löschen. -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as api from '../api'
import PraeparatZeile from '../components/PraeparatZeile.vue'

const praeparate = ref<api.Praeparat[]>([])
const wirkstoffe = ref<api.Wirkstoff[]>([])
const fehler = ref('')

// Das Formular. bearbeiteId = null heißt: neues Präparat anlegen.
const leer: api.NeuesPraeparat = {
  name: '', wirkstoffId: '', dosis: '1 Tablette', staerke: '', proTag: 1, vorrat: null, tage: [0, 1, 2, 3, 4, 5, 6],
}
const formular = ref<api.NeuesPraeparat>({ ...leer, tage: [...leer.tage] }) // Kopie, damit leer unverändert bleibt
const bearbeiteId = ref<string | null>(null)

// Hinweise zum gewählten Wirkstoff, die unter dem Auswahlfeld erscheinen
const gewaehlt = computed(() => wirkstoffe.value.find((w) => w.id === formular.value.wirkstoffId))

async function laden() {
  try {
    praeparate.value = await api.ladePraeparate()
    wirkstoffe.value = (await api.ladeKatalog()).wirkstoffe
  } catch (err) {
    fehler.value = (err as Error).message
  }
}

async function speichern() {
  fehler.value = ''
  // Leeres Vorrat-Feld liefert "" – das bedeutet "Vorrat nicht zählen" = null
  if (String(formular.value.vorrat) === '') formular.value.vorrat = null
  try {
    if (bearbeiteId.value) {
      await api.aenderePraeparat(bearbeiteId.value, formular.value)
    } else {
      await api.erstellePraeparat(formular.value)
    }
    abbrechen() // Formular leeren
    await laden()
  } catch (err) {
    // Hier landen z. B. die Meldungen von Zod aus dem Backend
    fehler.value = (err as Error).message
  }
}

function bearbeiten(p: api.Praeparat) {
  bearbeiteId.value = p.id
  formular.value = {
    name: p.name, wirkstoffId: p.wirkstoffId, dosis: p.dosis, staerke: p.staerke ?? '', proTag: p.proTag, vorrat: p.vorrat,
    tage: p.tage ?? [0, 1, 2, 3, 4, 5, 6], // ältere Präparate ohne Wochentage = täglich
  }
  window.scrollTo({ top: 0 })
}

function abbrechen() {
  bearbeiteId.value = null
  formular.value = { ...leer, tage: [...leer.tage] }
  fehler.value = ''
}

async function loeschen(p: api.Praeparat) {
  if (confirm(`„${p.name}“ wirklich löschen?`)) {
    await api.loeschePraeparat(p.id)
    await laden()
  }
}

// ---- Produktsuche (Open Food Facts) ----
const suche = ref('')
const treffer = ref<api.Treffer[]>([])
const sucheMeldung = ref('')

async function suchen() {
  sucheMeldung.value = 'Suche …'
  treffer.value = []
  try {
    treffer.value = await api.sucheProdukt(suche.value)
    sucheMeldung.value = treffer.value.length === 0 ? 'Nichts gefunden – trag das Produkt einfach selbst ein.' : ''
  } catch (err) {
    sucheMeldung.value = (err as Error).message
  }
}

// Treffer ins Formular übernehmen: Name und – wenn erkannt – Wirkstoff
function uebernehmen(t: api.Treffer) {
  formular.value.name = `${t.marke} ${t.name}`.trim()
  if (t.wirkstoffId) formular.value.wirkstoffId = t.wirkstoffId
  treffer.value = []
  sucheMeldung.value = 'Übernommen – bitte Wirkstoff, Dosis und Stärke prüfen.'
}

function wirkstoffName(id: string): string {
  return wirkstoffe.value.find((w) => w.id === id)?.name ?? id
}

onMounted(laden)
</script>

<template>
  <main>
    <h1>Präparate</h1>
    <p class="unterzeile">Alles, was du regelmäßig nimmst. Der Plan richtet sich automatisch danach.</p>

    <!-- Formular: @submit.prevent = beim Absenden nicht neu laden, sondern speichern() aufrufen -->
    <form class="karte" @submit.prevent="speichern">
      <h2>{{ bearbeiteId ? 'Präparat ändern' : 'Neues Präparat' }}</h2>

      <!-- Produktsuche: Name oder Barcode-Nummer eintippen, Treffer übernehmen -->
      <div class="suche">
        <label>Produkt suchen (Name oder Barcode-Nummer)
          <input v-model="suche" placeholder="z. B. Magnesium 400 oder 4058172309563" @keydown.enter.prevent="suchen">
        </label>
        <button type="button" @click="suchen">Suchen</button>
      </div>
      <ul v-if="treffer.length > 0" class="treffer">
        <li v-for="t in treffer" :key="t.code">
          <span><strong>{{ t.marke }}</strong> {{ t.name }}
            <span v-if="t.wirkstoffId" class="klein">· erkannt: {{ wirkstoffName(t.wirkstoffId) }}</span>
          </span>
          <button type="button" @click="uebernehmen(t)">Übernehmen</button>
        </li>
      </ul>
      <p v-if="sucheMeldung" class="klein">{{ sucheMeldung }}</p>
      <p class="klein quelle">Produktdaten von Open Food Facts (offene Datenbank, kann unvollständig sein).</p>

      <!-- v-model verbindet das Eingabefeld mit dem Formular-Objekt (in beide Richtungen) -->
      <label>Name
        <input v-model="formular.name" placeholder="z. B. Vitamin D3 von dm">
      </label>

      <label>Wirkstoff
        <select v-model="formular.wirkstoffId">
          <option value="" disabled>Bitte wählen …</option>
          <option v-for="w in wirkstoffe" :key="w.id" :value="w.id">
            {{ w.name }}{{ w.kategorie === 'medikament' ? ' (Medikament)' : '' }}
          </option>
        </select>
      </label>
      <ul v-if="gewaehlt" class="hinweise">
        <li v-for="h in gewaehlt.hinweise" :key="h">{{ h }}</li>
      </ul>

      <div class="reihe">
        <label>Dosis
          <input v-model="formular.dosis" placeholder="z. B. 1 Tablette">
        </label>
        <label>Stärke (optional)
          <input v-model="formular.staerke" placeholder="z. B. 500 mg">
        </label>
        <label>Wie oft am Tag?
          <select v-model.number="formular.proTag">
            <option :value="1">1-mal</option>
            <option :value="2">2-mal</option>
            <option :value="3">3-mal</option>
          </select>
        </label>
        <label>Vorrat (Stück, optional)
          <input v-model.number="formular.vorrat" type="number" min="0" placeholder="leer = nicht zählen">
        </label>
      </div>

      <!-- Wochentage: v-model mit einer Liste – angehakte Tage landen in formular.tage -->
      <fieldset class="tage">
        <legend>An welchen Tagen?</legend>
        <label v-for="t in api.WOCHENTAGE" :key="t.nr">
          <input v-model="formular.tage" type="checkbox" :value="t.nr"> {{ t.kurz }}
        </label>
      </fieldset>

      <p v-if="fehler" class="fehler">{{ fehler }}</p>

      <button type="submit" class="haupt">Speichern</button>
      <button v-if="bearbeiteId" type="button" @click="abbrechen">Abbrechen</button>
    </form>

    <!-- Liste aller Präparate (eigene Komponente, siehe components/PraeparatZeile.vue) -->
    <PraeparatZeile
      v-for="p in praeparate"
      :key="p.id"
      :praeparat="p"
      :wirkstoff-name="wirkstoffName(p.wirkstoffId)"
      @aendern="bearbeiten(p)"
      @loeschen="loeschen(p)"
    />
  </main>
</template>

<style scoped>
h2 { font-size: 1.2rem; margin-bottom: 1rem; }
.reihe { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
.hinweise { margin: -0.25rem 0 1rem; padding: 0.6rem 0.6rem 0.6rem 1.6rem; border-radius: 10px; background: var(--gruen-hell); font-size: 0.85rem; }
form button { margin-right: 0.5rem; }
.suche { display: flex; gap: 0.5rem; align-items: flex-end; }
.suche label { flex: 1; }
.suche button { margin-bottom: 0.75rem; }
.treffer { list-style: none; padding: 0; margin: 0 0 0.5rem; }
.treffer li { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid var(--rand); font-size: 0.9rem; }
.quelle { margin: 0 0 1rem; font-size: 0.75rem; }
.tage { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; border: none; padding: 0; margin: 0 0 1rem; }
.tage legend { font-size: 0.85rem; color: var(--leise); margin-bottom: 0.25rem; }
.tage label { display: flex; align-items: center; gap: 0.3rem; margin: 0; font-size: 1rem; color: var(--text); }

@media (max-width: 520px) {
  .reihe { grid-template-columns: 1fr; gap: 0; }
}
</style>
