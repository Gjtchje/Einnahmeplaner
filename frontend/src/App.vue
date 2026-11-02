<script setup lang="ts">
// App.vue ist der feste Rahmen um alle Seiten:
// - oben die Navigation
// - <RouterView /> setzt die aktuelle Seite ein
// - unten der Hinweis, dass die App keine Beratung ersetzt
import { RouterLink, RouterView } from 'vue-router'

const links = [
  { to: '/', text: 'Heute' },
  { to: '/praeparate', text: 'Präparate' },
  { to: '/tagesablauf', text: 'Tagesablauf' },
  { to: '/wirkstoffe', text: 'Wirkstoffe' },
]
</script>

<template>
  <header class="kopf">
    <RouterLink to="/" class="marke">
      <img src="/favicon.svg" alt="" width="28" height="28">
      <span>Einnahmeplaner</span>
    </RouterLink>
    <nav aria-label="Hauptnavigation">
      <RouterLink v-for="l in links" :key="l.to" :to="l.to" class="navlink">{{ l.text }}</RouterLink>
    </nav>
  </header>

  <RouterView />

  <footer class="fuss">
    Allgemeine Informationen aus frei zugänglichen Quellen – ersetzt keine ärztliche oder
    pharmazeutische Beratung. Dosis und Häufigkeit gibst du selbst ein (Packungsbeilage / Arzt).
  </footer>
</template>

<style scoped>
.kopf {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  padding: 0.75rem 1rem;
  background: rgb(246 243 236 / 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--rand);
}

.marke {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--schrift-titel);
  font-weight: 600;
  font-size: 1.15rem;
  color: var(--text);
  text-decoration: none;
}

nav { display: flex; gap: 0.25rem; overflow-x: auto; }

.navlink {
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  color: var(--text-leise);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  white-space: nowrap;
}
.navlink:hover { color: var(--text); }
/* RouterLink setzt diese Klasse automatisch auf den Link der aktuellen Seite */
.navlink.router-link-exact-active { background: var(--akzent); color: #fff; }

@media (max-width: 520px) {
  .kopf { padding: 0.6rem 0.75rem; }
  nav { width: 100%; justify-content: space-between; }
  .navlink { padding: 0.35rem 0.6rem; font-size: 0.88rem; }
}

.fuss {
  max-width: 760px;
  margin: 0 auto;
  padding: 1.5rem 1rem 2.5rem;
  border-top: 1px solid var(--rand);
  font-size: 0.8rem;
  color: var(--text-leise);
  text-align: center;
}
</style>
