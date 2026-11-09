// router.ts – Welche Adresse zeigt welche Seite?
import { createRouter, createWebHistory } from 'vue-router'
import HeuteView from './views/HeuteView.vue'
import PraeparateView from './views/PraeparateView.vue'
import TagesablaufView from './views/TagesablaufView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HeuteView },
    { path: '/praeparate', component: PraeparateView },
    { path: '/tagesablauf', component: TagesablaufView },
  ],
})
