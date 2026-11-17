<!-- uhrzeiten der 6 zeitfenster einstellen -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../api'

// daten der seite, vue aktualisiert die anzeige automatisch
const slots = ref<api.Katalog['slots']>([])
const zeiten = ref<api.Tagesablauf>({})
const meldung = ref('')

// beim öffnen: zeitfenster und uhrzeiten laden
onMounted(async () => {
  slots.value = (await api.ladeKatalog()).slots
  zeiten.value = await api.ladeTagesablauf()
})

// uhrzeiten ans backend schicken, erfolg oder fehler anzeigen
async function speichern() {
  try {
    await api.speichereTagesablauf(zeiten.value)
    meldung.value = 'Gespeichert – dein Plan ist aktualisiert.'
  } catch (err) {
    meldung.value = (err as Error).message
  }
}
</script>

<template>
  <main>
    <h1>Tagesablauf</h1>
    <p class="unterzeile">Wann isst du, wann gehst du schlafen? Daraus berechnet der Plan die Abstände.</p>

    <!-- @submit.prevent: seite nicht neu laden, sondern speichern() aufrufen -->
    <form class="karte" @submit.prevent="speichern">
      <!-- eine zeile pro zeitfenster, v-model verbindet feld mit zeiten -->
      <label v-for="s in slots" :key="s.id" class="uhrzeit-zeile">
        <span>{{ s.name }}</span>
        <input v-model="zeiten[s.id]" type="time">
      </label>
      <div class="knoepfe">
        <button type="submit" class="haupt">Speichern</button>
        <span class="klein">{{ meldung }}</span>
      </div>
    </form>
  </main>
</template>

<style scoped>
.uhrzeit-zeile {
  display: grid;
  grid-template-columns: 1fr 8.5rem; /* rechts immer gleich breit */
  align-items: center;
  gap: var(--abstand);
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--rand);
  font-size: 1rem;
  color: var(--text);
}
.knoepfe { margin-top: var(--abstand); }
</style>
