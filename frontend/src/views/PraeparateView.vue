<script setup lang="ts">
// Seite "Präparate": Liste aller Präparate plus Formular zum Anlegen/Ändern.
// Die Prüfung der Eingaben macht der Server (Zod). Seine Feldfehler werden
// direkt unter den passenden Feldern angezeigt.
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { aenderePraeparat, ApiFehler, erstellePraeparat, ladePraeparate, loeschePraeparat } from '@/api'
import { EINHEITEN, type Praeparat, type PraeparatEingabe } from '@/types'
import FormFeld from '@/components/FormFeld.vue'
import { useKatalog } from '@/composables/useKatalog'

const { nem, medikamente, findeWirkstoff, fehler: katalogFehler } = useKatalog()

const liste = ref<Praeparat[]>([])
const laedt = ref(true)
const ladeFehler = ref('')

// ---- Formular ----

function leeresFormular(): PraeparatEingabe {
  return { name: '', wirkstoffId: '', staerke: '', menge: 1, einheit: 'Tablette', proTag: 1, vorrat: null, notiz: '' }
}

const form = reactive<PraeparatEingabe>(leeresFormular())
const bearbeitetId = ref<string | null>(null) // null = neues Präparat
const formularOffen = ref(false)
const speichert = ref(false)
const feldFehler = ref<Record<string, string>>({})
const allgemeinerFehler = ref('')
const loeschenBestaetigen = ref<string | null>(null)

// Hinweise zum gewählten Wirkstoff live unter dem Auswahlfeld zeigen
const gewaehlterWirkstoff = computed(() => findeWirkstoff(form.wirkstoffId))

function neu() {
  Object.assign(form, leeresFormular())
  bearbeitetId.value = null
  feldFehler.value = {}
  allgemeinerFehler.value = ''
  formularOffen.value = true
}

function bearbeiten(p: Praeparat) {
  const { name, wirkstoffId, staerke, menge, einheit, proTag, vorrat, notiz } = p
  Object.assign(form, { name, wirkstoffId, staerke, menge, einheit, proTag, vorrat, notiz })
  bearbeitetId.value = p.id
  feldFehler.value = {}
  allgemeinerFehler.value = ''
  formularOffen.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function abbrechen() {
  formularOffen.value = false
}

async function speichern() {
  speichert.value = true
  feldFehler.value = {}
  allgemeinerFehler.value = ''
  try {
    if (bearbeitetId.value) {
      await aenderePraeparat(bearbeitetId.value, { ...form })
    } else {
      await erstellePraeparat({ ...form })
    }
    formularOffen.value = false
    await laden()
  } catch (e) {
    if (e instanceof ApiFehler && e.details.length) {
      // Feldfehler vom Server: { feld: "name", meldung: "..." } -> feldFehler.name
      for (const d of e.details) feldFehler.value[d.feld || 'allgemein'] = d.meldung
      allgemeinerFehler.value = 'Bitte prüfe die markierten Felder.'
    } else {
      allgemeinerFehler.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler'
    }
  } finally {
    speichert.value = false
  }
}

// Löschen in zwei Schritten: erster Klick fragt nach, zweiter löscht.
async function loeschen(p: Praeparat) {
  if (loeschenBestaetigen.value !== p.id) {
    loeschenBestaetigen.value = p.id
    return
  }
  try {
    await loeschePraeparat(p.id)
    loeschenBestaetigen.value = null
    await laden()
  } catch (e) {
    ladeFehler.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler'
  }
}

// ---- Liste ----

async function laden() {
  ladeFehler.value = ''
  try {
    liste.value = await ladePraeparate()
  } catch (e) {
    ladeFehler.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler'
  } finally {
    laedt.value = false
  }
}

function vorratText(p: Praeparat): string {
  if (p.vorrat === null) return 'Vorrat wird nicht gezählt'
  const menge = String(p.vorrat).replace('.', ',')
  return `Vorrat: ${menge} ${p.einheit} · reicht ${p.reichweiteTage} ${p.reichweiteTage === 1 ? 'Tag' : 'Tage'}`
}

onMounted(laden)
</script>

<template>
  <main class="seite">
    <header class="kopfzeile">
      <div>
        <h1>Präparate</h1>
        <p>Alles, was du regelmäßig einnimmst. Der Plan richtet sich automatisch danach.</p>
      </div>
      <button v-if="!formularOffen" class="knopf primaer" @click="neu">+ Hinzufügen</button>
    </header>

    <!-- Formular -->
    <form v-if="formularOffen" class="karte formular" novalidate @submit.prevent="speichern">
      <h2>{{ bearbeitetId ? 'Präparat bearbeiten' : 'Neues Präparat' }}</h2>

      <FormFeld v-model="form.name" label="Name" pflicht platzhalter="z. B. Vitamin D3 Tropfen von dm" :fehler="feldFehler.name" />

      <div class="feld" :class="{ hat_fehler: feldFehler.wirkstoffId }">
        <label for="wirkstoff">Wirkstoff <span aria-hidden="true">*</span></label>
        <select id="wirkstoff" v-model="form.wirkstoffId" required :aria-invalid="!!feldFehler.wirkstoffId">
          <option value="" disabled>Bitte wählen …</option>
          <optgroup label="Nahrungsergänzungsmittel">
            <option v-for="w in nem" :key="w.id" :value="w.id">{{ w.name }}</option>
          </optgroup>
          <optgroup label="Medikamente">
            <option v-for="w in medikamente" :key="w.id" :value="w.id">{{ w.name }}</option>
          </optgroup>
        </select>
        <p v-if="feldFehler.wirkstoffId" class="meldung fehler">{{ feldFehler.wirkstoffId }}</p>
        <p v-if="katalogFehler" class="meldung fehler">{{ katalogFehler }}</p>
        <div v-if="gewaehlterWirkstoff" class="wirkstoff-info">
          <ul>
            <li v-for="h in gewaehlterWirkstoff.hinweise" :key="h">{{ h }}</li>
          </ul>
          <RouterLink :to="{ path: '/wirkstoffe', hash: `#${gewaehlterWirkstoff.id}` }">Regeln und Quellen ansehen</RouterLink>
        </div>
      </div>

      <div class="reihe">
        <FormFeld v-model="form.menge" label="Menge pro Einnahme" typ="number" pflicht :fehler="feldFehler.menge" />
        <div class="feld">
          <label for="einheit">Einheit</label>
          <select id="einheit" v-model="form.einheit">
            <option v-for="e in EINHEITEN" :key="e" :value="e">{{ e }}</option>
          </select>
        </div>
        <div class="feld" :class="{ hat_fehler: feldFehler.proTag }">
          <label for="protag">Wie oft am Tag?</label>
          <select id="protag" v-model.number="form.proTag">
            <option :value="1">1-mal</option>
            <option :value="2">2-mal</option>
            <option :value="3">3-mal</option>
          </select>
          <p v-if="feldFehler.proTag" class="meldung fehler">{{ feldFehler.proTag }}</p>
        </div>
      </div>

      <div class="reihe zwei">
        <FormFeld v-model="form.staerke" label="Stärke (optional)" platzhalter="z. B. 1000 IE" :fehler="feldFehler.staerke" />
        <FormFeld
          v-model="form.vorrat"
          label="Vorrat (optional)"
          typ="number"
          platzhalter="leer = nicht zählen"
          hinweis="In der gewählten Einheit, z. B. 60 Tabletten"
          :fehler="feldFehler.vorrat"
        />
      </div>

      <FormFeld v-model="form.notiz" label="Notiz (optional)" typ="textarea" :fehler="feldFehler.notiz" />

      <p class="klein">Menge und Häufigkeit bitte aus der Packungsbeilage oder nach ärztlicher Vorgabe übernehmen.</p>

      <p v-if="allgemeinerFehler" class="meldung fehler" role="alert">
        {{ allgemeinerFehler }} {{ feldFehler.allgemein }}
      </p>

      <div class="aktionen">
        <button type="submit" class="knopf primaer" :disabled="speichert">
          {{ speichert ? 'Speichert …' : 'Speichern' }}
        </button>
        <button type="button" class="knopf" @click="abbrechen">Abbrechen</button>
      </div>
    </form>

    <!-- Liste -->
    <p v-if="laedt" class="zustand">Lade Präparate …</p>
    <p v-else-if="ladeFehler" class="zustand fehler" role="alert">{{ ladeFehler }}</p>
    <p v-else-if="liste.length === 0 && !formularOffen" class="zustand">
      Noch keine Präparate. Leg mit „Hinzufügen“ dein erstes an.
    </p>

    <ul v-else class="liste">
      <li v-for="p in liste" :key="p.id" class="karte praeparat">
        <div class="info">
          <div class="titel">
            <h3>{{ p.name }}</h3>
            <span v-if="p.kategorie === 'medikament'" class="etikett medikament">Medikament</span>
            <span v-if="p.nachkaufen" class="etikett warnung">Nachkaufen</span>
          </div>
          <p class="klein">
            {{ p.wirkstoffName }}{{ p.staerke ? ` · ${p.staerke}` : '' }} ·
            {{ String(p.menge).replace('.', ',') }} {{ p.einheit }}, {{ p.proTag }}-mal täglich
          </p>
          <p class="klein">{{ vorratText(p) }}</p>
          <p v-if="p.notiz" class="notiz">{{ p.notiz }}</p>
        </div>
        <div class="knoepfe">
          <button class="knopf" @click="bearbeiten(p)">Bearbeiten</button>
          <button
            class="knopf gefahr"
            :class="{ bestaetigen: loeschenBestaetigen === p.id }"
            @click="loeschen(p)"
            @blur="loeschenBestaetigen = null"
          >
            {{ loeschenBestaetigen === p.id ? 'Wirklich löschen?' : 'Löschen' }}
          </button>
        </div>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.kopfzeile { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }

.formular { display: grid; gap: 1rem; margin-bottom: 2rem; }
.formular h2 { font-size: 1.3rem; }

.reihe { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
.reihe.zwei { grid-template-columns: repeat(2, 1fr); }

/* Auswahlfelder sehen aus wie die Eingabefelder in FormFeld.vue */
.feld { display: grid; gap: 0.3rem; align-content: start; }
.feld label { font-size: 0.85rem; font-weight: 500; color: var(--text-leise); }
select {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--rand);
  border-radius: 10px;
  background: #fff;
}
select:focus { outline: none; border-color: var(--akzent); box-shadow: 0 0 0 3px var(--akzent-hell); }
.hat_fehler select { border-color: var(--fehler); }
.meldung { margin: 0; font-size: 0.8rem; }
.meldung.fehler { color: var(--fehler); }

.wirkstoff-info {
  margin-top: 0.3rem;
  padding: 0.7rem 0.9rem;
  border-radius: 10px;
  background: var(--akzent-hell);
  font-size: 0.85rem;
}
.wirkstoff-info ul { margin: 0 0 0.3rem; padding-left: 1.1rem; }

.aktionen { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.liste { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
.praeparat { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.info { display: grid; gap: 0.15rem; flex: 1 1 260px; }
.info p { margin: 0; }
.titel { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.titel h3 { font-size: 1.1rem; }
.notiz { font-size: 0.85rem; font-style: italic; }
.knoepfe { display: flex; gap: 0.5rem; align-items: flex-start; }

@media (max-width: 560px) {
  .reihe, .reihe.zwei { grid-template-columns: 1fr; }
}
</style>
