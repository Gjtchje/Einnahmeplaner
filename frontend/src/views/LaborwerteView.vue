<!-- LaborwerteView.vue – Laborwerte-Tagebuch: Werte vom Laborbericht eintragen und den Verlauf sehen.
     Die App bewertet die Werte bewusst NICHT und gibt keine Empfehlung (siehe ARCHITEKTUR.md, ADR-008). -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import * as api from '../api'

const laborwerte = ref<api.Laborwert[]>([])
const fehler = ref('')

// Heutiges Datum für das Formular, z. B. "2026-11-09"
const heute = new Date().toISOString().slice(0, 10)
const leer = { name: '', wert: 0, einheit: '', datum: heute, referenz: '' }
const formular = ref({ ...leer })

// Vorschläge für das Namensfeld (man kann aber auch etwas anderes eintippen)
const vorschlaege = ['Vitamin D (25-OH)', 'Ferritin', 'Vitamin B12', 'Folsäure', 'Magnesium', 'Zink', 'TSH']

async function laden() {
  try {
    laborwerte.value = await api.ladeLaborwerte()
  } catch (err) {
    fehler.value = (err as Error).message
  }
}

async function speichern() {
  fehler.value = ''
  try {
    await api.erstelleLaborwert(formular.value)
    // Name und Einheit stehen lassen – praktisch, wenn man mehrere Werte nacheinander einträgt
    formular.value = { ...leer, name: formular.value.name, einheit: formular.value.einheit }
    await laden()
  } catch (err) {
    fehler.value = (err as Error).message
  }
}

async function loeschen(id: string) {
  await api.loescheLaborwert(id)
  await laden()
}

// Werte nach Name gruppieren: { "Vitamin D (25-OH)": [Wert 1, Wert 2, ...], ... }
const gruppen = computed(() => {
  const ergebnis: Record<string, api.Laborwert[]> = {}
  for (const l of laborwerte.value) {
    ergebnis[l.name] = [...(ergebnis[l.name] ?? []), l]
  }
  return ergebnis
})

// "18 → 25 → 32 ng/ml" – der Verlauf in einer Zeile
function verlauf(werte: api.Laborwert[]): string {
  return werte.map((w) => String(w.wert).replace('.', ',')).join(' → ') + ' ' + (werte[0]?.einheit ?? '')
}

function datumDeutsch(datum: string): string {
  const [jahr, monat, tag] = datum.split('-')
  return `${tag}.${monat}.${jahr}`
}

onMounted(laden)
</script>

<template>
  <main>
    <h1>Laborwerte</h1>
    <p class="unterzeile">Ein Tagebuch für deine Blutwerte – damit du den Verlauf siehst.</p>

    <p class="karte hinweis warnung">
      Die App <strong>bewertet die Werte nicht</strong> und sagt nicht, was du nehmen solltest.
      Besprich deine Werte bitte mit deiner Ärztin oder deinem Arzt.
    </p>

    <form class="karte" @submit.prevent="speichern">
      <h2>Neuer Wert</h2>
      <div class="felder breit">
        <label>Was wurde gemessen?
          <input v-model="formular.name" list="vorschlaege" placeholder="z. B. Vitamin D (25-OH)">
          <!-- <datalist> zeigt Vorschläge beim Tippen an -->
          <datalist id="vorschlaege">
            <option v-for="v in vorschlaege" :key="v" :value="v" />
          </datalist>
        </label>
      </div>
      <div class="felder">
        <label>Wert
          <input v-model.number="formular.wert" type="number" step="any">
        </label>
        <label>Einheit
          <input v-model="formular.einheit" placeholder="z. B. ng/ml">
        </label>
        <label>Datum
          <input v-model="formular.datum" type="date">
        </label>
        <label>Referenz (optional)
          <input v-model="formular.referenz" placeholder="z. B. 30–100">
        </label>
      </div>
      <p v-if="fehler" class="fehler">{{ fehler }}</p>
      <div class="knoepfe">
        <button type="submit" class="haupt">Speichern</button>
      </div>
    </form>

    <h2 v-if="Object.keys(gruppen).length > 0">Dein Verlauf</h2>
    <!-- Eine Karte pro gemessenem Wert, darin der Verlauf -->
    <section v-for="(werte, name) in gruppen" :key="name" class="karte">
      <h2>{{ name }}</h2>
      <p class="verlauf">{{ verlauf(werte) }}</p>
      <!-- Eine Zeile pro Messung: Datum und Wert links, Löschen rechts -->
      <div v-for="w in werte" :key="w.id" class="zeile fest messung">
        <div>
          <strong>{{ String(w.wert).replace('.', ',') }} {{ w.einheit }}</strong>
          <span class="klein"> · {{ datumDeutsch(w.datum) }}</span>
          <p v-if="w.referenz" class="klein">Referenz laut Labor: {{ w.referenz }}</p>
        </div>
        <button class="klein-knopf" @click="loeschen(w.id)">Löschen</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.verlauf { font-family: 'Fraunces', Georgia, serif; font-size: 1.3rem; margin: 0 0 0.5rem; }
.messung { padding: 0.6rem 0; border-top: 1px solid var(--rand); }
</style>
