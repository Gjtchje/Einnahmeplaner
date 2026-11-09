// main.ts – Startpunkt des Frontends: Vue-App erzeugen, Router einbauen, anzeigen.
import './style.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
