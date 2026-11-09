// planer.ts – Das Herzstück: verteilt alle Präparate auf die Zeitfenster.
//
// So funktioniert es:
//   1. Sortieren: Medikamente zuerst, dann wer die wenigsten Zeitfenster hat.
//   2. Für jedes Präparat: Nimm das erste empfohlene Zeitfenster, in dem es
//      mit keinem schon verplanten Mittel einen Konflikt gibt.
//      Gibt es keins, nimm das beste und schreib eine Warnung dazu.
//   3. Hinweise sammeln (gute Paare und Warnungen aus dem Katalog).
//
// Die Funktion benutzt keine Datenbank. Gleiche Eingabe = gleicher Plan.
// Deshalb lässt sie sich einfach testen (siehe planer_test.ts).

import { KATALOG, type Praeparat, SLOT_IDS, type Tagesablauf, type Wirkstoff } from "./modell.ts";

// Eine verplante Einnahme: welches Präparat in welchem Zeitfenster
export interface Eintrag {
  praeparat: Praeparat;
  wirkstoff: Wirkstoff;
  slot: string;
}

export interface Plan {
  eintraege: Eintrag[];
  hinweise: string[];
}

export function planeTag(praeparate: Praeparat[], zeiten: Tagesablauf): Plan {
  const eintraege: Eintrag[] = [];
  const hinweise: string[] = [];

  // ---- Schritt 1: Sortieren ----
  const sortiert = [...praeparate].sort((p1, p2) => {
    const w1 = findeWirkstoff(p1.wirkstoffId);
    const w2 = findeWirkstoff(p2.wirkstoffId);
    if (w1.kategorie !== w2.kategorie) {
      return w1.kategorie === "medikament" ? -1 : 1; // Medikamente zuerst
    }
    return w1.slots.length - w2.slots.length || p1.name.localeCompare(p2.name);
  });

  // ---- Schritt 2: Zeitfenster vergeben ----
  for (const praeparat of sortiert) {
    const wirkstoff = findeWirkstoff(praeparat.wirkstoffId);

    // Ein Präparat "2-mal täglich" braucht zwei verschiedene Zeitfenster.
    for (let i = 0; i < praeparat.proTag; i++) {
      // Empfohlene Zeitfenster, in denen dieses Präparat noch nicht liegt.
      // Sind alle belegt (z. B. 3-mal täglich, aber nur 2 empfohlen),
      // kommen die übrigen Zeitfenster des Tages dazu.
      const schonBelegt = eintraege.filter((e) => e.praeparat.id === praeparat.id).map((e) => e.slot);
      let moeglich = wirkstoff.slots.filter((s) => !schonBelegt.includes(s));
      if (moeglich.length === 0) {
        moeglich = SLOT_IDS.filter((s) => !schonBelegt.includes(s));
      }

      // Das erste Zeitfenster ohne Konflikt gewinnt.
      let slot = moeglich.find((s) => findeKonflikt(wirkstoff, s, eintraege, zeiten) === null);

      // Kein konfliktfreies Zeitfenster? Dann das beste nehmen und warnen.
      if (slot === undefined) {
        slot = moeglich[0];
        const konflikt = findeKonflikt(wirkstoff, slot, eintraege, zeiten)!;
        hinweise.push(
          `Konflikt: ${praeparat.name} und ${konflikt.mit} brauchen ${konflikt.stunden} Stunden ` +
            `Abstand – das passt nicht in deinen Tagesablauf.`,
        );
      }

      eintraege.push({ praeparat, wirkstoff, slot });
    }
  }

  // ---- Schritt 3: Hinweise aus dem Katalog ("zusammen" und "warnung") ----
  const vorhandeneIds = eintraege.map((e) => e.wirkstoff.id);
  for (const regel of KATALOG.regeln) {
    const beideDa = vorhandeneIds.includes(regel.a) && vorhandeneIds.includes(regel.b);
    const namen = `${findeWirkstoff(regel.a).name} + ${findeWirkstoff(regel.b).name}`;
    if (beideDa && regel.typ === "zusammen") hinweise.push(`Tipp (${namen}): ${regel.grund}`);
    if (beideDa && regel.typ === "warnung") hinweise.push(`Warnung (${namen}): ${regel.grund}`);
  }

  return { eintraege, hinweise };
}

// Prüft: Gibt es eine Abstandsregel zu einem schon verplanten Mittel, die in
// diesem Zeitfenster verletzt wäre? Gibt den Konflikt zurück oder null.
export function findeKonflikt(wirkstoff: Wirkstoff, slot: string, eintraege: Eintrag[], zeiten: Tagesablauf) {
  for (const anderer of eintraege) {
    for (const regel of KATALOG.regeln) {
      const betrifftBeide = (regel.a === wirkstoff.id && regel.b === anderer.wirkstoff.id) ||
        (regel.b === wirkstoff.id && regel.a === anderer.wirkstoff.id);
      if (!betrifftBeide || regel.typ !== "abstand") continue;

      const abstand = Math.abs(inMinuten(zeiten[slot]) - inMinuten(zeiten[anderer.slot]));
      if (abstand < regel.stunden! * 60) {
        return { mit: anderer.praeparat.name, stunden: regel.stunden };
      }
    }
  }
  return null;
}

export function findeWirkstoff(id: string): Wirkstoff {
  return KATALOG.wirkstoffe.find((w) => w.id === id)!;
}

// "07:30" -> 450 Minuten seit Mitternacht
function inMinuten(zeit: string): number {
  const [stunden, minuten] = zeit.split(":").map(Number);
  return stunden * 60 + minuten;
}
