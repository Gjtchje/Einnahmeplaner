<script setup lang="ts">
// Startseite "Heute": der berechnete Tagesplan zum Abhaken.
// Lädt drei Dinge parallel: den Plan, die heute schon abgehakten Einnahmen
// und die Präparate (für den Hinweis "Nachkaufen").
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiFehler, hakeAb, ladeEinnahmen, ladePlan, ladePraeparate, nimmZurueck } from '@/api'
import type { Plan, PlanEintrag, PlanSlot, Praeparat } from '@/types'
import MeldungsListe from '@/components/MeldungsListe.vue'
import { datumLang, heuteAlsText, inMinuten, jetztInMinuten } from '@/composables/useDatum'
import { useErinnerungen } from '@/composables/useErinnerungen'

const plan = ref<Plan | null>(null)
const praeparate = ref<Praeparat[]>([])
const erledigt = ref(new Set<string>()) // Schlüssel: "praeparatId|slot"
const datum = ref(heuteAlsText())
const laedt = ref(true)
const fehler = ref('')
const jetzt = ref(jetztInMinuten())

const schluessel = (praeparatId: string, slot: string) => `${praeparatId}|${slot}`

async function laden() {
  fehler.value = ''
  datum.value = heuteAlsText()
  try {
    const [p, einnahmen, liste] = await Promise.all([ladePlan(), ladeEinnahmen(datum.value), ladePraeparate()])
    plan.value = p
    praeparate.value = liste
    erledigt.value = new Set(einnahmen.map((e) => schluessel(e.praeparatId, e.slot)))
  } catch (e) {
    fehler.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler'
  } finally {
    laedt.value = false
  }
}

// Haken setzen oder entfernen. Danach die Präparate neu laden, weil sich
// der Vorrat geändert hat (das berechnet der Server).
async function umschalten(slot: PlanSlot, eintrag: PlanEintrag) {
  const einnahme = { datum: datum.value, praeparatId: eintrag.praeparatId, slot: slot.slot }
  const k = schluessel(eintrag.praeparatId, slot.slot)
  const warErledigt = erledigt.value.has(k)
  try {
    if (warErledigt) {
      await nimmZurueck(einnahme)
      erledigt.value.delete(k)
    } else {
      await hakeAb(einnahme)
      erledigt.value.add(k)
    }
    praeparate.value = await ladePraeparate()
  } catch (e) {
    fehler.value = e instanceof ApiFehler ? e.message : 'Unbekannter Fehler'
  }
}

// Nur Zeitfenster mit mindestens einem Präparat anzeigen
const belegteSlots = computed(() => plan.value?.slots.filter((s) => s.eintraege.length > 0) ?? [])

const anzahlGesamt = computed(() => belegteSlots.value.reduce((summe, s) => summe + s.eintraege.length, 0))
// Nur Haken zählen, die zu Einträgen im aktuellen Plan gehören
const anzahlErledigt = computed(() =>
  belegteSlots.value.reduce(
    (summe, s) => summe + s.eintraege.filter((e) => erledigt.value.has(schluessel(e.praeparatId, s.slot))).length,
    0,
  ),
)

// Das nächste Zeitfenster mit offenen Einnahmen (bis 30 Minuten nach der Uhrzeit)
const naechsterSlot = computed(() =>
  belegteSlots.value.find((s) =>
    inMinuten(s.zeit) >= jetzt.value - 30 &&
    s.eintraege.some((e) => !erledigt.value.has(schluessel(e.praeparatId, s.slot))),
  )?.slot,
)

const nachkaufen = computed(() => praeparate.value.filter((p) => p.nachkaufen))

// Erinnerungen: Das Composable fragt über diese Funktion, was gerade offen ist.
const erinnerungen = useErinnerungen(() =>
  belegteSlots.value.map((s) => ({
    slot: s.slot,
    name: s.name,
    zeit: s.zeit,
    offen: s.eintraege.filter((e) => !erledigt.value.has(schluessel(e.praeparatId, s.slot))).map((e) => e.name),
  })),
)

// Jede Minute: Uhrzeit aktualisieren und nach Mitternacht neu laden
let uhr: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  laden()
  uhr = setInterval(() => {
    jetzt.value = jetztInMinuten()
    if (heuteAlsText() !== datum.value) laden()
  }, 60_000)
})
onUnmounted(() => clearInterval(uhr))
</script>

<template>
  <main class="seite">
    <header>
      <p class="datum">{{ datumLang() }}</p>
      <h1>Dein Plan für heute</h1>
    </header>

    <p v-if="laedt" class="zustand">Lade Plan …</p>
    <p v-else-if="fehler" class="zustand fehler" role="alert">{{ fehler }}</p>

    <template v-else-if="plan">
      <div v-if="anzahlGesamt === 0" class="karte leer">
        <h2>Noch nichts geplant</h2>
        <p>Lege zuerst deine Präparate an – der Plan entsteht dann automatisch.</p>
        <RouterLink to="/praeparate" class="knopf primaer">Präparat hinzufügen</RouterLink>
      </div>

      <template v-else>
        <!-- Fortschritt -->
        <div class="fortschritt karte">
          <div>
            <strong>{{ anzahlErledigt }} von {{ anzahlGesamt }}</strong> erledigt
            <div class="balken" role="progressbar" :aria-valuenow="anzahlErledigt" aria-valuemin="0" :aria-valuemax="anzahlGesamt">
              <span :style="{ width: `${(anzahlErledigt / anzahlGesamt) * 100}%` }" />
            </div>
          </div>
          <div class="erinnerung">
            <button v-if="!erinnerungen.unterstuetzt" class="knopf" disabled>Keine Benachrichtigungen</button>
            <button v-else-if="erinnerungen.aktiv.value" class="knopf" @click="erinnerungen.ausschalten">
              🔔 Erinnerungen an
            </button>
            <button v-else class="knopf" @click="erinnerungen.einschalten">🔕 Erinnerungen einschalten</button>
            <p v-if="erinnerungen.erlaubnis.value === 'denied'" class="klein">
              Im Browser blockiert – bitte in den Seiteneinstellungen erlauben.
            </p>
          </div>
        </div>

        <!-- Zeitfenster -->
        <ol class="zeitstrahl">
          <li
            v-for="s in belegteSlots"
            :key="s.slot"
            class="fenster"
            :class="{ jetzt: s.slot === naechsterSlot }"
          >
            <div class="zeit">
              <span class="uhr">{{ s.zeit }}</span>
              <span class="klein">{{ s.name }}</span>
              <span v-if="s.slot === naechsterSlot" class="etikett jetzt-etikett">Als Nächstes</span>
            </div>
            <ul class="eintraege">
              <li v-for="e in s.eintraege" :key="e.praeparatId">
                <label class="eintrag" :class="{ erledigt: erledigt.has(schluessel(e.praeparatId, s.slot)) }">
                  <input
                    type="checkbox"
                    :checked="erledigt.has(schluessel(e.praeparatId, s.slot))"
                    @change="umschalten(s, e)"
                  >
                  <span class="text">
                    <span class="name">{{ e.name }}</span>
                    <span class="klein">{{ e.dosis }} · {{ e.wirkstoffName }}</span>
                    <span v-if="e.hinweise[0]" class="tipp">{{ e.hinweise[0] }}</span>
                  </span>
                </label>
              </li>
            </ul>
          </li>
        </ol>

        <!-- Meldungen des Planers -->
        <section v-if="plan.meldungen.length" class="abschnitt">
          <h2>Hinweise zu deinem Plan</h2>
          <MeldungsListe :meldungen="plan.meldungen" />
        </section>
      </template>

      <!-- Vorrat -->
      <section v-if="nachkaufen.length" class="abschnitt">
        <h2>Bald nachkaufen</h2>
        <ul class="vorrat">
          <li v-for="p in nachkaufen" :key="p.id" class="karte">
            <span>{{ p.name }}</span>
            <span class="etikett warnung">
              {{ p.reichweiteTage === 0 ? 'aufgebraucht' : `reicht noch ${p.reichweiteTage} ${p.reichweiteTage === 1 ? 'Tag' : 'Tage'}` }}
            </span>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
.datum { margin: 0 0 0.2rem !important; font-weight: 500; color: var(--akzent) !important; }

.leer { text-align: center; padding: 2rem 1rem; display: grid; gap: 0.75rem; justify-items: center; }
.leer p { margin: 0; color: var(--text-leise); }

.fortschritt {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.fortschritt > div:first-child { flex: 1 1 200px; }
.balken { height: 8px; margin-top: 0.4rem; border-radius: 999px; background: var(--akzent-hell); overflow: hidden; }
.balken span { display: block; height: 100%; background: var(--akzent); border-radius: inherit; transition: width 0.3s; }
.erinnerung { display: grid; gap: 0.25rem; justify-items: end; }
.erinnerung .klein { margin: 0; }

/* Zeitstrahl: links die Uhrzeit, rechts die Präparate */
.zeitstrahl { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }

.fenster {
  display: grid;
  grid-template-columns: 7.5rem 1fr;
  gap: 1rem;
  padding: 1rem;
  background: var(--flaeche);
  border: 1px solid var(--rand);
  border-radius: var(--radius);
  box-shadow: var(--schatten);
}
.fenster.jetzt { border-color: var(--warm); background: linear-gradient(var(--warm-hell), var(--flaeche) 70%); }

.zeit { display: grid; align-content: start; gap: 0.15rem; }
.uhr { font-family: var(--schrift-titel); font-size: 1.6rem; font-weight: 600; line-height: 1; }
.jetzt-etikett { justify-self: start; margin-top: 0.3rem; background: var(--warm); color: #3d2a08; }

.eintraege { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }

.eintrag {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.55rem 0.6rem;
  border-radius: 10px;
  cursor: pointer;
}
.eintrag:hover { background: var(--hintergrund); }
.eintrag input { width: 1.3rem; height: 1.3rem; margin-top: 0.1rem; accent-color: var(--akzent); flex-shrink: 0; cursor: pointer; }
.text { display: grid; gap: 0.1rem; }
.name { font-weight: 600; }
.tipp { font-size: 0.8rem; color: var(--akzent); }
.erledigt .name { text-decoration: line-through; color: var(--text-leise); }
.erledigt .tipp { display: none; }

.abschnitt { margin-top: 2rem; display: grid; gap: 0.75rem; }
.abschnitt h2 { font-size: 1.25rem; }

.vorrat { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
.vorrat li { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.7rem 1rem; }

@media (max-width: 520px) {
  .fenster { grid-template-columns: 1fr; gap: 0.5rem; }
  .zeit { grid-template-columns: auto 1fr auto; align-items: baseline; gap: 0.5rem; }
  .jetzt-etikett { margin-top: 0; }
  .erinnerung { justify-items: start; }
}
</style>
