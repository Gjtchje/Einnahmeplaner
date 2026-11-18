<!-- uhrzeiten für die zeitfenster einstellen -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../api'

const slots = ref<api.Katalog['slots']>([])
const zeiten = ref<api.Tagesablauf>({})
const meldung = ref('')
                                            //daten der seite, vue aktualisiert automatisch
onMounted(async () => {
  slots.value = (await api.ladeKatalog()).slots
  zeiten.value = await api.ladeTagesablauf()
})                                          //Beim Öffnen der seite: Zeitfenster und Uhrzeiten vom Backend laden

async function speichern() {
  try {
    await api.speichereTagesablauf(zeiten.value)
    meldung.value = 'Gespeichert – dein Plan ist aktualisiert.'
  } catch (err) {
    meldung.value = (err as Error).message
  }
}                                             //Uhrzeiten ans Backend schicken, Erfolg oder Fehler in Meldung anzeigen
</script>

<template>
  <main>
    <h1>Tagesablauf</h1>
    <p class="unterzeile">Wann isst du, wann gehst du schlafen? Daraus berechnet der Plan die Abstände.</p>

    <form class="karte" @submit.prevent="speichern"> <!--verhindert das neuladen der seite, stattdessen schickt speichern die daten per fetch ans backend  -->
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
</template>     <!-- Formular speichert die uhrzeiten, eine zeile pro zeitfenster, felder sind mit zeiten verbunden-->

<style scoped>
.uhrzeit-zeile {
  display: grid;
  grid-template-columns: 1fr 8.5rem; /* damit alles untereinander steht */
  align-items: center;
  gap: var(--abstand);
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--rand);
  font-size: 1rem;
  color: var(--text);
}
.knoepfe { margin-top: var(--abstand); }
</style>
