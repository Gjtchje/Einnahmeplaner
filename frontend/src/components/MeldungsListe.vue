<script setup lang="ts">
// Zeigt die Meldungen des Planers an: Konflikte, Ausweichen, Warnungen, Tipps.
// Jede Meldung hat ein Symbol, eine Farbe und – wenn vorhanden – ihre Quelle.
import type { Meldung } from '@/types'

defineProps<{ meldungen: Meldung[] }>()

const darstellung: Record<Meldung['art'], { symbol: string, titel: string }> = {
  konflikt: { symbol: '!', titel: 'Konflikt' },
  warnung: { symbol: '⚠', titel: 'Warnung' },
  ausweichen: { symbol: '↷', titel: 'Ausgewichen' },
  tipp: { symbol: '✓', titel: 'Tipp' },
}
</script>

<template>
  <ul class="meldungen">
    <li v-for="(m, i) in meldungen" :key="i" :class="m.art">
      <span class="symbol" aria-hidden="true">{{ darstellung[m.art].symbol }}</span>
      <div>
        <strong>{{ darstellung[m.art].titel }}:</strong> {{ m.text }}
        <a v-if="m.quelle" :href="m.quelle.url" target="_blank" rel="noopener" class="quelle">
          Quelle: {{ m.quelle.titel }}
        </a>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.meldungen { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }

li {
  display: grid;
  grid-template-columns: 1.6rem 1fr;
  gap: 0.6rem;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  font-size: 0.9rem;
  background: var(--akzent-hell);
}

.symbol {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  font-weight: 700;
  background: var(--akzent);
  color: #fff;
}

.konflikt { background: var(--fehler-hell); }
.konflikt .symbol { background: var(--fehler); }
.warnung, .ausweichen { background: var(--warnung-hell); }
.warnung .symbol, .ausweichen .symbol { background: var(--warnung); }

.quelle { display: block; margin-top: 0.2rem; font-size: 0.8rem; }
</style>
