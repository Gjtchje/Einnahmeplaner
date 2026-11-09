<!-- ZeitfensterKarte.vue – Ein Kasten auf der Heute-Seite, z. B. "07:30 Frühstück".
     Bekommt seine Daten von außen (props) und meldet Klicks nach außen (emit).
     Die Komponente selbst spricht nicht mit dem Backend – das macht die Seite. -->
<script setup lang="ts">
import type { Plan } from '../api'

// props = Daten, die die Seite an die Komponente gibt
defineProps<{
  name: string // z. B. "Frühstück"
  zeit: string // z. B. "07:30"
  eintraege: Plan['eintraege'] // die Präparate in diesem Zeitfenster
  abgehakt: string[] // IDs der Präparate, die hier schon abgehakt sind
}>()

// emit = Nachricht an die Seite: "Präparat mit dieser ID wurde angeklickt"
const emit = defineEmits<{ haken: [praeparatId: string] }>()
</script>

<template>
  <section class="karte zeitfenster">
    <div class="zeit">
      <strong>{{ zeit }}</strong>
      <span class="klein">{{ name }}</span>
    </div>
    <div>
      <label v-for="e in eintraege" :key="e.praeparat.id" class="eintrag">
        <input
          type="checkbox"
          :checked="abgehakt.includes(e.praeparat.id)"
          @change="emit('haken', e.praeparat.id)"
        >
        <span>
          <span :class="{ durch: abgehakt.includes(e.praeparat.id) }">{{ e.praeparat.name }}</span>
          <span class="klein"> · {{ e.praeparat.dosis }}</span><br>
          <span class="tipp">{{ e.wirkstoff.hinweise[0] }}</span>
        </span>
      </label>
    </div>
  </section>
</template>

<style scoped>
.zeitfenster { display: grid; grid-template-columns: 7rem 1fr; gap: 1rem; }
.zeit { display: grid; align-content: start; }
.zeit strong { font-family: 'Fraunces', Georgia, serif; font-size: 1.5rem; }

.eintrag { display: flex; gap: 0.6rem; align-items: flex-start; color: var(--text); font-size: 1rem; cursor: pointer; }
.eintrag input { width: 1.2rem; height: 1.2rem; accent-color: var(--gruen); }
.durch { text-decoration: line-through; color: var(--leise); }
.tipp { font-size: 0.8rem; color: var(--gruen); }

@media (max-width: 520px) {
  .zeitfenster { grid-template-columns: 1fr; gap: 0.5rem; }
}
</style>
