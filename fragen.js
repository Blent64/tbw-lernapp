// Alle Lernfragen der App.
// typ: 'karte' = Karteikarte (Frage/Antwort), 'mc' = Quiz mit Antwortmöglichkeiten
// richtig = Position der richtigen Antwort in "optionen" (0 = erste)
// art: 'rechnen' = Rechenaufgabe (ohne Angabe: Theorie)
// quelle: 'beispiel' = von Claude erstellte Beispielfrage, bitte inhaltlich prüfen
// quelle: 'claude' = Übungsaufgabe von Claude (nicht aus dem Skript)
const FRAGEN = [
  // Volkswirtschaftslehre: siehe fragen-vwl.js (aus den Lehrgangsskripten)

  // Rechnungswesen: siehe fragen-rewe.js (aus den Lehrgangsskripten)

  // Finanzierung und Investition: siehe fragen-fi.js (aus den Lehrgangsskripten)
  { id: 'fi-004', fach: 'fi', thema: 'Finanzierungsarten', typ: 'mc', quelle: 'claude',
    frage: 'Wie lässt sich die Selbstfinanzierung (Einbehalten von Gewinnen) einordnen?',
    optionen: ['Innenfinanzierung mit Eigenkapital', 'Außenfinanzierung mit Eigenkapital', 'Außenfinanzierung mit Fremdkapital', 'Innenfinanzierung mit Fremdkapital'],
    richtig: 0,
    erklaerung: 'Das Geld kommt aus dem Unternehmen selbst (innen) und bleibt Eigenkapital. Innenfinanzierung mit Fremdkapital wäre z. B. die Bildung von Rückstellungen.' },

  // ---------- Material-, Produktions- und Absatzwirtschaft ----------
  { id: 'mpa-001', fach: 'mpa', thema: 'Materialwirtschaft', typ: 'karte', quelle: 'beispiel',
    frage: 'Was ist eine ABC-Analyse?',
    antwort: 'Einteilung von Materialien nach ihrem Wertanteil:\nA-Güter: kleiner Mengenanteil (ca. 10–20 %), großer Wertanteil (ca. 70–80 %), werden besonders genau geplant\nB-Güter: Mittelfeld\nC-Güter: großer Mengenanteil, kleiner Wertanteil, vereinfachte Disposition' },
  { id: 'mpa-002', fach: 'mpa', thema: 'Materialwirtschaft', typ: 'mc', quelle: 'beispiel',
    frage: 'Was berechnet man mit der Andler-Formel?',
    optionen: ['Die optimale Bestellmenge', 'Den Meldebestand', 'Den Sicherheitsbestand', 'Die Kapazitätsauslastung'],
    richtig: 0,
    erklaerung: 'Die Andler-Formel sucht die Bestellmenge, bei der die Summe aus Bestellkosten und Lagerhaltungskosten am niedrigsten ist.' },
  { id: 'mpa-003', fach: 'mpa', thema: 'Materialwirtschaft', typ: 'karte', quelle: 'beispiel',
    frage: 'Wie berechnet man den Meldebestand?',
    antwort: 'Meldebestand = Tagesverbrauch × Wiederbeschaffungszeit + Sicherheitsbestand' },
  { id: 'mpa-004', fach: 'mpa', thema: 'Absatzwirtschaft', typ: 'mc', quelle: 'beispiel',
    frage: 'Was gehört NICHT zu den klassischen 4 P des Marketing-Mix?',
    optionen: ['Prognose', 'Product (Produktpolitik)', 'Price (Preispolitik)', 'Promotion (Kommunikationspolitik)'],
    richtig: 0,
    erklaerung: 'Die 4 P: Product, Price, Place (Distributionspolitik) und Promotion.' },
  { id: 'mpa-005', fach: 'mpa', thema: 'Produktionswirtschaft', typ: 'karte', quelle: 'beispiel',
    frage: 'Was bedeutet Just-in-time, und was ist dafür nötig?',
    antwort: 'Material wird genau dann angeliefert, wenn es in der Produktion gebraucht wird. So gibt es kaum Lagerbestände.\nVoraussetzungen: zuverlässige Lieferanten, genaue Planung, enger Datenaustausch, stabile Transportwege.' },
];
