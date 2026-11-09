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

      <!-- v-model verbindet das Eingabefeld mit dem Formular-Objekt (in beide Richtungen) -->
      <div class="felder breit">
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
      </div>
      <ul v-if="gewaehlt" class="karte hinweis hinweise">
        <li v-for="h in gewaehlt.hinweise" :key="h">{{ h }}</li>
      </ul>

      <div class="felder">
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
          <input v-model.number="formular.vorrat" type="number" min="0" placeholder="z. B. 60">
        </label>
      </div>

      <!-- Wochentage: v-model mit einer Liste – angeklickte Tage landen in formular.tage -->
      <fieldset class="chips">
        <legend>An welchen Tagen?</legend>
        <label v-for="t in api.WOCHENTAGE" :key="t.nr" class="chip">
          <input v-model="formular.tage" type="checkbox" :value="t.nr">
          <span>{{ t.kurz }}</span>
        </label>
      </fieldset>

      <p v-if="fehler" class="fehler">{{ fehler }}</p>

      <div class="knoepfe">
        <button type="submit" class="haupt">Speichern</button>
        <button v-if="bearbeiteId" type="button" @click="abbrechen">Abbrechen</button>
      </div>
    </form>

    <h2>Deine Präparate</h2>
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
.hinweise { margin: calc(var(--abstand) * -0.25) 0 var(--abstand); padding-left: 2rem; font-size: 0.85rem; }
</style>
