<!-- PraeparatZeile.vue – Eine Zeile in der Präparate-Liste mit "Ändern" und "Löschen".
     Bekommt das Präparat von außen (props) und meldet Klicks nach außen (emit). -->
<script setup lang="ts">
import type { Praeparat } from '../api'

defineProps<{
  praeparat: Praeparat
  wirkstoffName: string
}>()

const emit = defineEmits<{ aendern: [], loeschen: [] }>()
</script>

<template>
  <div class="karte zeile">
    <div>
      <strong>{{ praeparat.name }}</strong><br>
      <span class="klein">
        {{ wirkstoffName }} · {{ praeparat.dosis }}, {{ praeparat.proTag }}-mal täglich
        · {{ praeparat.vorrat === null ? 'Vorrat wird nicht gezählt' : `noch ${praeparat.vorrat} Stück` }}
      </span>
    </div>
    <div class="knoepfe">
      <button @click="emit('aendern')">Ändern</button>
      <button @click="emit('loeschen')">Löschen</button>
    </div>
  </div>
</template>

<style scoped>
.zeile { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
.knoepfe { display: flex; gap: 0.5rem; }
</style>
