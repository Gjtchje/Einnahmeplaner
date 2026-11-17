<!-- rahmen um alle seiten: navigation oben, seite darunter -->
<template>
  <header class="kopf">
    <span class="marke"><img src="/favicon.svg" alt="" width="26" height="26"> Einnahmeplaner</span>
    <nav class="menue">
      <RouterLink to="/">Heute</RouterLink>
      <RouterLink to="/praeparate">Präparate</RouterLink>
      <RouterLink to="/tagesablauf">Tagesablauf</RouterLink>
    </nav>
  </header>

  <!-- hier kommt die aktuelle seite rein -->
  <RouterView />

  <footer class="fuss">
    Allgemeine Informationen aus frei zugänglichen Quellen – ersetzt keine ärztliche oder
    pharmazeutische Beratung. Die Dosis gibst du selbst ein (Packungsbeilage / Arzt).
  </footer>
</template>
