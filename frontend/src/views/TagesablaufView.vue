<!-- TagesablaufView.vue – Uhrzeiten der sechs Zeitfenster einstellen. -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../api'

const slots = ref<api.Katalog['slots']>([])
const zeiten = ref<api.Tagesablauf>({})
const meldung = ref('')

onMounted(async () => {
  slots.value = (await api.ladeKatalog()).slots
  zeiten.value = await api.ladeTagesablauf()
})

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

    <form class="karte" @submit.prevent="speichern">
      <!-- Jede Zeile: Name links, Uhrzeit rechts – alle Uhrzeit-Felder gleich breit -->
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
  grid-template-columns: 1fr 8.5rem; /* rechts immer dieselbe Breite -> alles steht untereinander */
  align-items: center;
  gap: var(--abstand);
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--rand);
  font-size: 1rem;
  color: var(--text);
}
.knoepfe { margin-top: var(--abstand); }
</style>
