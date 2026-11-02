// Einnahmeplaner – Backend
// Startpunkt des Servers: Datenbank öffnen, beim ersten Start Beispieldaten
// anlegen, dann den HTTP-Server auf Port 8000 starten.
import { app } from "./app.ts";
import { BEISPIELDATEN } from "./beispieldaten.ts";
import { beispieldatenAngelegt, merkeBeispieldaten, oeffneSpeicher, praeparatSpeichern } from "./speicher.ts";

await oeffneSpeicher("./data/einnahmeplaner.db");

// Beispieldaten nur beim allerersten Start – wer sie danach löscht,
// bekommt sie nicht wieder.
if (!(await beispieldatenAngelegt())) {
  const jetzt = new Date().toISOString();
  for (const eingabe of BEISPIELDATEN) {
    await praeparatSpeichern({ ...eingabe, id: crypto.randomUUID(), erstelltAm: jetzt, geaendertAm: jetzt });
  }
  await merkeBeispieldaten();
  console.log(`${BEISPIELDATEN.length} Beispiel-Präparate angelegt.`);
}

Deno.serve({ port: 8000 }, app.fetch);
