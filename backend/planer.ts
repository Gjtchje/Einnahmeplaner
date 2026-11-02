// Einnahmeplaner – die Planungslogik (das Herzstück)
//
// Aufgabe: Alle Präparate des Nutzers so auf die sechs Zeitfenster des Tages
// verteilen, dass die Abstandsregeln aus dem Katalog eingehalten werden.
//
// Ablauf in drei Schritten:
//   1. Reihenfolge festlegen: Medikamente zuerst, dann wer die wenigsten
//      erlaubten Zeitfenster hat ("wer weniger Auswahl hat, darf zuerst").
//   2. Für jede Einnahme ein Zeitfenster suchen – in drei Stufen:
//      a) das erste EMPFOHLENE Zeitfenster ohne Konflikt
//      b) sonst irgendein ANDERES freies Zeitfenster ohne Konflikt
//         (der Plan bekommt einen Hinweis "ausgewichen")
//      c) sonst das beste empfohlene Zeitfenster trotz Konflikt
//         (der Plan bekommt eine Konflikt-Meldung – nichts wird verschwiegen)
//   3. Tipps ("zusammen"-Regeln) und Warnungen ("warnung"-Regeln) sammeln.
//
// Die Funktion ist "rein": Sie liest nichts aus der Datenbank und verändert
// nichts – gleiche Eingabe ergibt immer den gleichen Plan. Dadurch lässt sie
// sich gut testen (siehe planer_test.ts).
import {
  findeQuelle,
  findeSlot,
  findeWirkstoff,
  type Quelle,
  type Regel,
  regelnZwischen,
  SLOT_IDS,
  type SlotId,
  type Wirkstoff,
} from "./katalog.ts";
import { inMinuten, type Praeparat, type Tagesablauf } from "./modell.ts";

export interface PlanEintrag {
  praeparatId: string;
  name: string;
  wirkstoffId: string;
  wirkstoffName: string;
  dosis: string; // z. B. "1 Tablette (1000 IE)"
  hinweise: string[];
}

export interface PlanSlot {
  slot: SlotId;
  name: string;
  zeit: string;
  eintraege: PlanEintrag[];
}

export interface Meldung {
  art: "konflikt" | "ausweichen" | "warnung" | "tipp";
  text: string;
  quelle?: Quelle;
}

export interface Plan {
  slots: PlanSlot[];
  meldungen: Meldung[];
}

// Eine einzelne verplante Einnahme (intern während der Planung)
interface Platzierung {
  praeparat: Praeparat;
  wirkstoff: Wirkstoff;
  slot: SlotId;
}

// Ein Konflikt: Diese Abstandsregel wäre mit dieser Platzierung verletzt.
interface Konflikt {
  regel: Regel;
  mit: Platzierung;
}

export function planeTag(praeparate: Praeparat[], zeiten: Tagesablauf): Plan {
  const platziert: Platzierung[] = [];
  const meldungen: Meldung[] = [];

  // ---- Schritt 1: Reihenfolge -------------------------------------------
  const reihenfolge = [...praeparate].sort((p1, p2) => {
    const w1 = wirkstoffVon(p1);
    const w2 = wirkstoffVon(p2);
    // Medikamente zuerst – ihr Zeitpunkt ist wichtiger als der von NEM
    if (w1.kategorie !== w2.kategorie) return w1.kategorie === "medikament" ? -1 : 1;
    // Weniger erlaubte Zeitfenster zuerst
    if (w1.slots.length !== w2.slots.length) return w1.slots.length - w2.slots.length;
    // Sonst alphabetisch, damit das Ergebnis immer gleich ist
    return p1.name.localeCompare(p2.name, "de");
  });

  // ---- Schritt 2: Zeitfenster vergeben ----------------------------------
  for (const praeparat of reihenfolge) {
    const wirkstoff = wirkstoffVon(praeparat);

    // Ein Präparat, das 2-mal täglich genommen wird, braucht 2 Zeitfenster.
    for (let nr = 1; nr <= praeparat.proTag; nr++) {
      // Zeitfenster, in denen dieses Präparat heute schon liegt, fallen weg.
      const schonBelegt = platziert
        .filter((p) => p.praeparat.id === praeparat.id)
        .map((p) => p.slot);
      const freiFuerMich = (s: SlotId) => !schonBelegt.includes(s);

      const ohneKonflikt = (s: SlotId) => findeKonflikte(wirkstoff, s, platziert, zeiten).length === 0;

      // Die empfohlenen Zeitfenster des Wirkstoffs (beste zuerst) und alle übrigen
      const empfohlen = wirkstoff.slots.filter(freiFuerMich);
      const andere = SLOT_IDS.filter((s) => !wirkstoff.slots.includes(s) && freiFuerMich(s));

      // Stufe a: empfohlen und ohne Konflikt
      let gewaehlt = empfohlen.find(ohneKonflikt);

      // Stufe b: ein anderes Zeitfenster ohne Konflikt
      if (!gewaehlt) {
        gewaehlt = andere.find(ohneKonflikt);
        if (gewaehlt) {
          meldungen.push({
            art: "ausweichen",
            text: `${praeparat.name} (${nr}. Einnahme): In den empfohlenen Zeitfenstern ` +
              `war kein Platz – eingeplant: ${findeSlot(gewaehlt).name}.`,
          });
        }
      }

      // Stufe c: kein konfliktfreies Zeitfenster – bestes nehmen und Konflikt melden
      if (!gewaehlt) {
        gewaehlt = empfohlen[0] ?? andere[0];
        if (!gewaehlt) break; // kann bei höchstens 3-mal täglich nicht passieren
        for (const k of findeKonflikte(wirkstoff, gewaehlt, platziert, zeiten)) {
          meldungen.push({
            art: "konflikt",
            text: `${praeparat.name} und ${k.mit.praeparat.name} brauchen ` +
              `${k.regel.stunden} Stunden Abstand, das ist mit deinem Tagesablauf ` +
              `nicht möglich. ${k.regel.grund}`,
            quelle: findeQuelle(k.regel.quelle),
          });
        }
      }

      platziert.push({ praeparat, wirkstoff, slot: gewaehlt });
    }
  }

  // ---- Schritt 3: Tipps und Warnungen -----------------------------------
  meldungen.push(...sammleTippsUndWarnungen(platziert));

  return { slots: baueSlots(platziert, zeiten), meldungen };
}

// Prüft, ob ein Wirkstoff in einem Zeitfenster mit einem bereits verplanten
// Mittel kollidiert. Kollision = Es gibt eine Abstandsregel zwischen beiden
// und die Zeitfenster liegen näher beieinander als die Regel verlangt.
export function findeKonflikte(
  wirkstoff: Wirkstoff,
  slot: SlotId,
  platziert: Platzierung[],
  zeiten: Tagesablauf,
): Konflikt[] {
  const konflikte: Konflikt[] = [];
  for (const anderer of platziert) {
    for (const regel of regelnZwischen(wirkstoff.id, anderer.wirkstoff.id)) {
      if (regel.typ !== "abstand") continue;
      const abstandMinuten = Math.abs(inMinuten(zeiten[slot]) - inMinuten(zeiten[anderer.slot]));
      if (abstandMinuten < regel.stunden! * 60) {
        konflikte.push({ regel, mit: anderer });
      }
    }
  }
  return konflikte;
}

function sammleTippsUndWarnungen(platziert: Platzierung[]): Meldung[] {
  const meldungen: Meldung[] = [];
  // Jedes Paar unterschiedlicher Wirkstoffe nur einmal anschauen
  const wirkstoffe = [...new Map(platziert.map((p) => [p.wirkstoff.id, p.wirkstoff])).values()];

  for (let i = 0; i < wirkstoffe.length; i++) {
    for (let j = i + 1; j < wirkstoffe.length; j++) {
      const w1 = wirkstoffe[i];
      const w2 = wirkstoffe[j];
      for (const regel of regelnZwischen(w1.id, w2.id)) {
        if (regel.typ === "warnung") {
          meldungen.push({
            art: "warnung",
            text: `${w1.name} + ${w2.name}: ${regel.grund}`,
            quelle: findeQuelle(regel.quelle),
          });
        }
        if (regel.typ === "zusammen") {
          const slots1 = platziert.filter((p) => p.wirkstoff.id === w1.id).map((p) => p.slot);
          const slots2 = platziert.filter((p) => p.wirkstoff.id === w2.id).map((p) => p.slot);
          const gemeinsam = slots1.some((s) => slots2.includes(s));
          meldungen.push({
            art: "tipp",
            text: gemeinsam
              ? `${w1.name} und ${w2.name} liegen im selben Zeitfenster – gut so. ${regel.grund}`
              : `Tipp: ${w1.name} und ${w2.name} möglichst zusammen einnehmen. ${regel.grund}`,
            quelle: findeQuelle(regel.quelle),
          });
        }
      }
    }
  }
  return meldungen;
}

// Baut die Ausgabe: alle sechs Zeitfenster in Tagesreihenfolge mit ihren Einträgen.
function baueSlots(platziert: Platzierung[], zeiten: Tagesablauf): PlanSlot[] {
  return SLOT_IDS.map((slot) => ({
    slot,
    name: findeSlot(slot).name,
    zeit: zeiten[slot],
    eintraege: platziert
      .filter((p) => p.slot === slot)
      .map((p) => ({
        praeparatId: p.praeparat.id,
        name: p.praeparat.name,
        wirkstoffId: p.wirkstoff.id,
        wirkstoffName: p.wirkstoff.name,
        dosis: dosisText(p.praeparat),
        hinweise: p.wirkstoff.hinweise,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "de")),
  }));
}

export function dosisText(p: Praeparat): string {
  const menge = String(p.menge).replace(".", ",");
  return p.staerke ? `${menge} ${p.einheit} (${p.staerke})` : `${menge} ${p.einheit}`;
}

function wirkstoffVon(p: Praeparat): Wirkstoff {
  const w = findeWirkstoff(p.wirkstoffId);
  // Kann eigentlich nicht passieren, weil Zod unbekannte Wirkstoffe ablehnt.
  if (!w) throw new Error(`Unbekannter Wirkstoff: ${p.wirkstoffId}`);
  return w;
}
