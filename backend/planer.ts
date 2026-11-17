// planer: verteilt die präparate auf die zeitfenster
// 1. sortieren: medikamente und unflexible mittel zuerst
// 2. jedes mittel ins erste zeitfenster ohne konflikt (z. b. eisen + calcium 2 std abstand)
// 3. hinweise sammeln (tipps + warnungen aus dem katalog)
// keine datenbank -> gleiche eingabe = gleicher plan, gut testbar

import { KATALOG, type Praeparat, SLOT_IDS, type Tagesablauf, type Wirkstoff } from "./modell.ts";

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

  // schritt 1: sortieren
  const sortiert = [...praeparate].sort((p1, p2) => {
    const w1 = findeWirkstoff(p1.wirkstoffId);
    const w2 = findeWirkstoff(p2.wirkstoffId);
    if (w1.kategorie !== w2.kategorie) {
      return w1.kategorie === "medikament" ? -1 : 1;
    }
    return w1.slots.length - w2.slots.length || p1.name.localeCompare(p2.name);
  });

  // schritt 2: zeitfenster vergeben
  for (const praeparat of sortiert) {
    const wirkstoff = findeWirkstoff(praeparat.wirkstoffId);

    // so oft wie pro tag genommen (2-mal = 2 zeitfenster)
    for (let i = 0; i < praeparat.proTag; i++) {
      // empfohlene zeitfenster, wo es noch nicht liegt (sonst alle anderen)
      const schonBelegt = eintraege.filter((e) => e.praeparat.id === praeparat.id).map((e) => e.slot);
      let moeglich = wirkstoff.slots.filter((s) => !schonBelegt.includes(s));
      if (moeglich.length === 0) {
        moeglich = SLOT_IDS.filter((s) => !schonBelegt.includes(s));
      }

      // erstes zeitfenster ohne konflikt
      let slot = moeglich.find((s) => findeKonflikt(wirkstoff, s, eintraege, zeiten) === null);

      // keins frei -> bestes nehmen + konflikt-hinweis
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

  // schritt 3: tipps und warnungen sammeln
  const vorhandeneIds = eintraege.map((e) => e.wirkstoff.id);
  for (const regel of KATALOG.regeln) {
    const beideDa = vorhandeneIds.includes(regel.a) && vorhandeneIds.includes(regel.b);
    if (!beideDa) continue; // regel betrifft heute nicht

    const namen = `${findeWirkstoff(regel.a).name} + ${findeWirkstoff(regel.b).name}`;
    if (regel.typ === "zusammen") hinweise.push(`Tipp (${namen}): ${regel.grund}`);
    if (regel.typ === "warnung") hinweise.push(`Warnung (${namen}): ${regel.grund}`);
  }

  return { eintraege, hinweise };
}

// zu wenig abstand zu einem schon verplanten mittel? -> konflikt, sonst null
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

// nur präparate, die an diesem wochentag dran sind
export function praeparateAm(praeparate: Praeparat[], datum: string): Praeparat[] {
  const wochentag = new Date(datum + "T12:00:00").getDay();
  return praeparate.filter((p) => (p.tage ?? [0, 1, 2, 3, 4, 5, 6]).includes(wochentag));
}

export function findeWirkstoff(id: string): Wirkstoff {
  return KATALOG.wirkstoffe.find((w) => w.id === id)!;
}

function inMinuten(zeit: string): number {
  const [stunden, minuten] = zeit.split(":").map(Number);
  return stunden * 60 + minuten;
}
