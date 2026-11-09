<!-- App.vue – Der Rahmen um alle Seiten: oben die Navigation, darunter die aktuelle Seite. -->
<template>
  <header class="kopf">
    <span class="marke"><img src="/favicon.svg" alt="" width="26" height="26"> Einnahmeplaner</span>
    <nav class="menue">
      <RouterLink to="/">Heute</RouterLink>
      <RouterLink to="/praeparate">Präparate</RouterLink>
      <RouterLink to="/tagesablauf">Tagesablauf</RouterLink>
      <RouterLink to="/wirkstoffe">Wirkstoffe</RouterLink>
      <RouterLink to="/laborwerte">Laborwerte</RouterLink>
    </nav>
  </header>

  <!-- Hier setzt der Router die passende Seite ein -->
  <RouterView />

  <footer class="fuss">
    Allgemeine Informationen aus frei zugänglichen Quellen – ersetzt keine ärztliche oder
    pharmazeutische Beratung. Die Dosis gibst du selbst ein (Packungsbeilage / Arzt).
  </footer>
</template>
