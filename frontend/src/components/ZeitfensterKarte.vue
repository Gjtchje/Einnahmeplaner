<!-- kasten für ein zeitfenster auf der heute-seite -->
<script setup lang="ts">
import type { Plan } from '../api'

// props: kommen von der seite
defineProps<{
  name: string
  zeit: string
  eintraege: Plan['eintraege']
  abgehakt: string[]
}>()

// emit: sagt der seite, welcher haken geklickt wurde
const emit = defineEmits<{ haken: [praeparatId: string] }>()
</script>

<template>
  <section class="karte zeitfenster">
    <div class="zeit">
      <strong>{{ zeit }}</strong>
      <span class="klein">{{ name }}</span>
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
.zeit strong { font-size: 1.4rem; line-height: 1.1; }

.eintraege { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
.eintrag { display: grid; grid-template-columns: auto 1fr; gap: 0.7rem; align-items: start; color: var(--text); font-size: 1rem; cursor: pointer; }
.eintrag input { margin-top: 0.15rem; }
.name { font-weight: 500; }
.durch { text-decoration: line-through; color: var(--leise); }
.tipp { display: block; margin-top: 0.15rem; font-size: 0.8rem; color: var(--lila); }

@media (max-width: 600px) {
  .zeitfenster { grid-template-columns: 1fr; gap: 0.75rem; }
  .zeit { display: flex; align-items: baseline; gap: 0.6rem; }
}
</style>
