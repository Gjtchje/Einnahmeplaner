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
      <label v-for="s in slots" :key="s.id" class="zeile">
        <span>{{ s.name }}</span>
        <input v-model="zeiten[s.id]" type="time">
      </label>
      <button type="submit" class="haupt">Speichern</button>
      <span class="klein"> {{ meldung }}</span>
    </form>
  </main>
</template>

<style scoped>
.zeile {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rand);
  font-size: 1rem;
  color: var(--text);
}
</style>
