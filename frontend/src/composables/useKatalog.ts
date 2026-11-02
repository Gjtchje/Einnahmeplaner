// Composable: der Wirkstoff-Katalog
// Der Katalog ändert sich nie, solange die App läuft. Deshalb wird er nur
// EINMAL vom Server geladen und dann von allen Seiten gemeinsam benutzt
// (der ref liegt außerhalb der Funktion und existiert nur einmal).
import { computed, ref } from 'vue'
import { ApiFehler, ladeKatalog } from '@/api'
import type { Katalog } from '@/types'

const katalog = ref<Katalog | null>(null)
const fehler = ref('')
let ladevorgang: Promise<void> | null = null

export function useKatalog() {
  if (!ladevorgang) {
    ladevorgang = ladeKatalog()
      .then((k) => { katalog.value = k })
      .catch((e) => {
        fehler.value = e instanceof ApiFehler ? e.message : 'Katalog konnte nicht geladen werden'
        ladevorgang = null // beim nächsten Aufruf erneut versuchen
      })
  }

  const wirkstoffe = computed(() => katalog.value?.wirkstoffe ?? [])
  const nem = computed(() => wirkstoffe.value.filter((w) => w.kategorie === 'nem'))
  const medikamente = computed(() => wirkstoffe.value.filter((w) => w.kategorie === 'medikament'))
  const findeWirkstoff = (id: string) => wirkstoffe.value.find((w) => w.id === id)

  return { katalog, fehler, wirkstoffe, nem, medikamente, findeWirkstoff }
}
