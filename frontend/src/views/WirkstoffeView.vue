<!-- WirkstoffeView.vue – Nachschlagen: Welche Regeln kennt der Planer und woher kommen sie?
     Liest nur den Katalog (GET /api/katalog) und zeigt ihn an. -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../api'

const katalog = ref<api.Katalog | null>(null)

onMounted(async () => {
  katalog.value = await api.ladeKatalog()
})

// Hilfsfunktionen, um IDs in lesbare Namen zu übersetzen
function wirkstoffName(id: string): string {
  return katalog.value?.wirkstoffe.find((w) => w.id === id)?.name ?? id
}
function slotName(id: string): string {
  return katalog.value?.slots.find((s) => s.id === id)?.name ?? id
}
function quelle(id: string) {
  return katalog.value?.quellen.find((q) => q.id === id)
}

// Alle Regeln, an denen dieser Wirkstoff beteiligt ist
function regelnVon(id: string): api.Regel[] {
  return katalog.value?.regeln.filter((r) => r.a === id || r.b === id) ?? []
}

// Bei einer Regel "Eisen – Calcium" ist für Eisen der Partner Calcium und umgekehrt
function partner(regel: api.Regel, id: string): string {
  return wirkstoffName(regel.a === id ? regel.b : regel.a)
}
</script>

<template>
  <main>
    <h1>Wirkstoffe</h1>
    <p class="unterzeile">Welche Regeln der Planer kennt – und woher sie stammen.</p>

    <!-- <details> ist ein HTML-Element zum Auf- und Zuklappen, ganz ohne JavaScript -->
    <details v-for="w in katalog?.wirkstoffe" :key="w.id" class="karte">
      <summary>
        <strong>{{ w.name }}</strong>
        <span v-if="w.kategorie === 'medikament'" class="etikett">Medikament</span>
        <span class="klein"> · am besten: {{ w.slots.map(slotName).join(', ') }}</span>
      </summary>

      <ul>
        <li v-for="h in w.hinweise" :key="h">{{ h }}</li>
      </ul>

      <p v-for="r in regelnVon(w.id)" :key="r.a + r.b + r.typ" class="regel">
        <strong>{{ r.typ === 'abstand' ? `${r.stunden} Std. Abstand zu` : r.typ === 'zusammen' ? 'Gut zusammen mit' : 'Warnung bei' }}
          {{ partner(r, w.id) }}:</strong>
        {{ r.grund }}
        <a v-if="quelle(r.quelle)" :href="quelle(r.quelle)!.url" target="_blank">Quelle</a>
      </p>
    </details>
  </main>
</template>

<style scoped>
summary { cursor: pointer; }
ul { margin: 0.75rem 0; padding-left: 1.2rem; font-size: 0.9rem; }
.regel { margin: 0.4rem 0; font-size: 0.9rem; }
.regel a { font-size: 0.8rem; margin-left: 0.3rem; color: var(--gruen); }
</style>
