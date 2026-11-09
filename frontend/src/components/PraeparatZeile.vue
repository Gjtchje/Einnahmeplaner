<!-- PraeparatZeile.vue – Eine Zeile in der Präparate-Liste mit "Ändern" und "Löschen".
     Bekommt das Präparat von außen (props) und meldet Klicks nach außen (emit). -->
<script setup lang="ts">
import { type Praeparat, WOCHENTAGE } from '../api'

const props = defineProps<{
  praeparat: Praeparat
  wirkstoffName: string
}>()

const emit = defineEmits<{ aendern: [], loeschen: [] }>()

// "täglich" oder z. B. "Mo, Mi, Fr" (ältere Präparate ohne Wochentage gelten als täglich)
function tageText(): string {
  const tage = props.praeparat.tage ?? []
  if (tage.length === 0 || tage.length === 7) return 'täglich'
  return WOCHENTAGE.filter((t) => tage.includes(t.nr)).map((t) => t.kurz).join(', ')
}
</script>

<template>
  <div class="karte zeile">
    <div>
      <strong>{{ praeparat.name }}</strong><br>
      <span class="klein">
        {{ wirkstoffName }} · {{ praeparat.dosis }}{{ praeparat.staerke ? ` à ${praeparat.staerke}` : '' }}, {{ praeparat.proTag }}-mal am Tag, {{ tageText() }}
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
