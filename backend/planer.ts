//1sortieren medis und unflexible mittel zuerst
//2jedes mittel ins erste empfohlene zeitfenster ohne konflikt zb. eisen und calcium 2 stunden abstand
//3hinweise aus katalog: tipps oder warnung
import { KATALOG, type Praeparat, SLOT_IDS, type Tagesablauf, type Wirkstoff } from "./modell.ts";

export interface Eintrag {
  praeparat: Praeparat;
  wirkstoff: Wirkstoff;
  slot: string;
}                               //präparat in zeitfenster

export interface Plan {
  eintraege: Eintrag[];
  hinweise: string[];
}                         //fertiger plan mit einträgen und hinweisen

export function planeTag(praeparate: Praeparat[], zeiten: Tagesablauf): Plan {    //hauptfunktion: berechnet plan für einen tag, gibt einträge und hinweise zurück
  const eintraege: Eintrag[] = [];
  const hinweise: string[] = [];
                                              //leere listen
  // schritt 1
  const sortiert = [...praeparate].sort((p1, p2) => {
    const w1 = findeWirkstoff(p1.wirkstoffId);
    const w2 = findeWirkstoff(p2.wirkstoffId);
    if (w1.kategorie !== w2.kategorie) {
      return w1.kategorie === "medikament" ? -1 : 1;
    }
    return w1.slots.length - w2.slots.length || p1.name.localeCompare(p2.name);
  });                                                     // sortiert nach: Medikamente zuerst, dann wer die wenigsten Zeitfenster hat, dann alphabetisch

  // schritt 2
  for (const praeparat of sortiert) {
    const wirkstoff = findeWirkstoff(praeparat.wirkstoffId);

    // bei 2x am tag braucht es 2 zeitfenster
    for (let i = 0; i < praeparat.proTag; i++) {
      const schonBelegt = eintraege.filter((e) => e.praeparat.id === praeparat.id).map((e) => e.slot);
      let moeglich = wirkstoff.slots.filter((s) => !schonBelegt.includes(s));
      if (moeglich.length === 0) {
        moeglich = SLOT_IDS.filter((s) => !schonBelegt.includes(s));
      }

      let slot = moeglich.find((s) => findeKonflikt(wirkstoff, s, eintraege, zeiten) === null);

      // nix frei, dann trotzdem rein und warnung
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
  }                                     // alle Präparate verteilt, jetzt noch Hinweise sammeln

  // schritt 3
  const vorhandeneIds = eintraege.map((e) => e.wirkstoff.id);
  for (const regel of KATALOG.regeln) {
    const beideDa = vorhandeneIds.includes(regel.a) && vorhandeneIds.includes(regel.b);
    if (!beideDa) continue;

    const namen = `${findeWirkstoff(regel.a).name} + ${findeWirkstoff(regel.b).name}`;
    if (regel.typ === "zusammen") hinweise.push(`Tipp (${namen}): ${regel.grund}`);
    if (regel.typ === "warnung") hinweise.push(`Warnung (${namen}): ${regel.grund}`);
  }

  return { eintraege, hinweise };       //fertiger plan mit einträgen und hinweisen
}

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
}                             // Prüft, ob ein Präparat in einem Zeitfenster einen Konflikt mit einem schon verplanten Mittel hat. Gibt den Konflikt zurück oder null.

// nur präparate die an dem wochentag dran sind
export function praeparateAm(praeparate: Praeparat[], datum: string): Praeparat[] {
  const wochentag = new Date(datum + "T12:00:00").getDay(); // 0 = sonntag, 6 = samstag
  return praeparate.filter((p) => (p.tage ?? [0, 1, 2, 3, 4, 5, 6]).includes(wochentag));
}

export function findeWirkstoff(id: string): Wirkstoff {
  return KATALOG.wirkstoffe.find((w) => w.id === id)!;
}

// "07:30" wird zu 450 minuten
function inMinuten(zeit: string): number {
  const [stunden, minuten] = zeit.split(":").map(Number);
  return stunden * 60 + minuten;
}
