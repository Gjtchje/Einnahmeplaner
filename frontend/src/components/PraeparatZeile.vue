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

// Knapp = reicht weniger als 7 Tage. Dann wird der Text orange (Klasse "knapp").
function istKnapp(): boolean {
  const p = props.praeparat
  return p.vorrat !== null && p.vorrat < 7 * p.proTag
}
</script>

<template>
  <div class="karte zeile">
    <div>
      <strong>{{ praeparat.name }}</strong>
      <p class="klein">
        {{ wirkstoffName }} · {{ praeparat.dosis }}{{ praeparat.staerke ? ` à ${praeparat.staerke}` : '' }}
        · {{ praeparat.proTag }}-mal am Tag · {{ tageText() }}
      </p>
      <p class="klein" :class="{ knapp: istKnapp() }">
        {{ praeparat.vorrat === null ? 'Vorrat wird nicht gezählt' : `Vorrat: noch ${praeparat.vorrat} Stück` }}
      </p>
    </div>
    <div class="knoepfe">
      <button class="klein-knopf" @click="emit('aendern')">Ändern</button>
      <button class="klein-knopf" @click="emit('loeschen')">Löschen</button>
    </div>
  </div>
</template>

<style scoped>
.knapp { color: #b26b00; font-weight: 600; } /* Vorrat reicht weniger als 7 Tage */
</style>
