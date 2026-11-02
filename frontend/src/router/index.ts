// Einnahmeplaner – Router
// Bildet Adressen auf Seiten (Views) ab:
//   /              Heute: Tagesplan zum Abhaken (Startseite)
//   /praeparate    Präparate anlegen, ändern, löschen
//   /tagesablauf   Uhrzeiten der Zeitfenster einstellen
//   /wirkstoffe    Info: alle Wirkstoffe mit Regeln und Quellen
//   alles andere   404-Seite
import { createRouter, createWebHistory } from 'vue-router'
import HeuteView from '../views/HeuteView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'heute', component: HeuteView, meta: { titel: 'Heute' } },
    // Lazy Loading: Diese Seiten werden erst geladen, wenn man sie besucht.
    { path: '/praeparate', name: 'praeparate', component: () => import('../views/PraeparateView.vue'), meta: { titel: 'Präparate' } },
    { path: '/tagesablauf', name: 'tagesablauf', component: () => import('../views/TagesablaufView.vue'), meta: { titel: 'Tagesablauf' } },
    { path: '/wirkstoffe', name: 'wirkstoffe', component: () => import('../views/WirkstoffeView.vue'), meta: { titel: 'Wirkstoffe' } },
    { path: '/:pfad(.*)*', name: 'nicht-gefunden', component: () => import('../views/NichtGefundenView.vue'), meta: { titel: 'Nicht gefunden' } },
  ],
  scrollBehavior(_to, _from, gespeichert) {
    return gespeichert ?? { top: 0 }
  },
})

// Tab-Titel passend zur Seite, z. B. "Präparate · Einnahmeplaner"
router.afterEach((to) => {
  document.title = `${to.meta.titel ?? ''} · Einnahmeplaner`
})

export default router
