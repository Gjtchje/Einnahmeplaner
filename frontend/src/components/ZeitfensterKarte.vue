<!-- ZeitfensterKarte.vue – Ein Kasten auf der Heute-Seite, z. B. "07:30 Frühstück".
     Bekommt seine Daten von außen (props) und meldet Klicks nach außen (emit).
     Die Komponente selbst spricht nicht mit dem Backend – das macht die Seite. -->
<script setup lang="ts">
import type { Plan } from '../api'

// props = Daten, die die Seite an die Komponente gibt
const props = defineProps<{
  name: string // z. B. "Frühstück"
  zeit: string // z. B. "07:30"
  eintraege: Plan['eintraege'] // die Präparate in diesem Zeitfenster
  abgehakt: string[] // IDs der Präparate, die hier schon abgehakt sind
}>()

// emit = Nachricht an die Seite: "Präparat mit dieser ID wurde angeklickt"
const emit = defineEmits<{ haken: [praeparatId: string], alleAbhaken: [] }>()

// Ist in diesem Zeitfenster noch etwas offen? Nur dann den Knopf "Alle abhaken" zeigen.
function nochOffen(): boolean {
  return props.eintraege.some((e) => !props.abgehakt.includes(e.praeparat.id))
}
</script>

<template>
  <section class="karte zeitfenster">
    <div class="zeit">
      <strong>{{ zeit }}</strong>
      <span class="klein">{{ name }}</span>
      <button v-if="nochOffen() && eintraege.length > 1" class="klein-knopf alle" @click="emit('alleAbhaken')">
        Alle abhaken
      </button>
    </div>
    <ul class="eintraege">
      <li v-for="e in eintraege" :key="e.praeparat.id">
        <label class="eintrag">
          <input
            type="checkbox"
            :checked="abgehakt.includes(e.praeparat.id)"
            @change="emit('haken', e.praeparat.id)"
          >
          <span>
            <span class="name" :class="{ durch: abgehakt.includes(e.praeparat.id) }">{{ e.praeparat.name }}</span>
            <span class="klein"> · {{ e.praeparat.dosis }}{{ e.praeparat.staerke ? ` à ${e.praeparat.staerke}` : '' }}</span>
            <span class="tipp">{{ e.wirkstoff.hinweise[0] }}</span>
          </span>
        </label>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.zeitfenster { display: grid; grid-template-columns: 6.5rem 1fr; gap: var(--abstand); }
.zeit { display: grid; align-content: start; gap: 0.1rem; }
.zeit strong { font-family: 'Fraunces', Georgia, serif; font-size: 1.5rem; line-height: 1.1; }
.alle { justify-self: start; margin-top: 0.4rem; }

.eintraege { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
.eintrag { display: grid; grid-template-columns: auto 1fr; gap: 0.7rem; align-items: start; color: var(--text); font-size: 1rem; cursor: pointer; }
.eintrag input { margin-top: 0.15rem; }
.name { font-weight: 500; }
.durch { text-decoration: line-through; color: var(--leise); }
.tipp { display: block; margin-top: 0.15rem; font-size: 0.8rem; color: var(--gruen); }

/* Handy: Uhrzeit und Name nebeneinander als Kopfzeile */
@media (max-width: 600px) {
  .zeitfenster { grid-template-columns: 1fr; gap: 0.75rem; }
  .zeit { display: flex; align-items: baseline; gap: 0.6rem; }
  .alle { margin: 0 0 0 auto; } /* auf dem Handy rechts in der Kopfzeile */
}
</style>
