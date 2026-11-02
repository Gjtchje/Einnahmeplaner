<script setup lang="ts">
// Wiederverwendbares Eingabefeld mit Beschriftung und Fehlermeldung.
// defineModel() macht die Komponente v-model-fähig: Von außen benutzt man sie
// genau wie ein normales <input>, z. B. <FormFeld v-model="form.name" label="Name" />
const wert = defineModel<string | number | null>({ required: true })

withDefaults(defineProps<{
  label: string
  typ?: 'text' | 'number' | 'time' | 'textarea'
  fehler?: string
  hinweis?: string
  pflicht?: boolean
  schritt?: string
  platzhalter?: string
}>(), { typ: 'text', fehler: '', hinweis: '', pflicht: false, schritt: 'any', platzhalter: '' })

// Eindeutige ID, damit <label for="..."> zum richtigen Feld gehört
const id = `feld-${Math.random().toString(36).slice(2, 8)}`

// Leeres Zahlenfeld -> null (statt "" oder 0)
function zahlSetzen(ereignis: Event) {
  const text = (ereignis.target as HTMLInputElement).value
  wert.value = text === '' ? null : Number(text)
}
</script>

<template>
  <div class="feld" :class="{ hat_fehler: fehler }">
    <label :for="id">{{ label }}<span v-if="pflicht" aria-hidden="true"> *</span></label>
    <textarea
      v-if="typ === 'textarea'"
      :id="id"
      v-model.trim="wert"
      rows="2"
      :placeholder="platzhalter"
      :aria-invalid="!!fehler"
      :aria-describedby="fehler || hinweis ? `${id}-meldung` : undefined"
    />
    <input
      v-else-if="typ === 'number'"
      :id="id"
      :value="wert ?? ''"
      type="number"
      inputmode="decimal"
      :step="schritt"
      min="0"
      :placeholder="platzhalter"
      :required="pflicht"
      :aria-invalid="!!fehler"
      :aria-describedby="fehler || hinweis ? `${id}-meldung` : undefined"
      @input="zahlSetzen"
    >
    <input
      v-else
      :id="id"
      v-model.trim="wert"
      :type="typ"
      :placeholder="platzhalter"
      :required="pflicht"
      :aria-invalid="!!fehler"
      :aria-describedby="fehler || hinweis ? `${id}-meldung` : undefined"
    >
    <p v-if="fehler" :id="`${id}-meldung`" class="meldung fehler">{{ fehler }}</p>
    <p v-else-if="hinweis" :id="`${id}-meldung`" class="meldung">{{ hinweis }}</p>
  </div>
</template>

<style scoped>
.feld { display: grid; gap: 0.3rem; }

label { font-size: 0.85rem; font-weight: 500; color: var(--text-leise); }

input,
textarea {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--rand);
  border-radius: 10px;
  background: #fff;
}

input:focus,
textarea:focus { outline: none; border-color: var(--akzent); box-shadow: 0 0 0 3px var(--akzent-hell); }

.hat_fehler input,
.hat_fehler textarea { border-color: var(--fehler); }

.meldung { margin: 0; font-size: 0.8rem; color: var(--text-leise); }
.meldung.fehler { color: var(--fehler); }
</style>
