<template>
  <main class="seite nicht-gefunden">
    <h1>404</h1>
    <p>Diese Seite gibt es nicht.</p>
    <RouterLink to="/" class="knopf primaer">Zum Plan für heute</RouterLink>
  </main>
</template>

<style scoped>
.nicht-gefunden { min-height: 60vh; display: grid; place-content: center; justify-items: center; gap: 1rem; text-align: center; }
h1 { font-size: 5rem; }
p { margin: 0; color: var(--text-leise); }
</style>
