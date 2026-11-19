// Alle Lernfragen der App.
// typ: 'karte' = Karteikarte (Frage/Antwort), 'mc' = Quiz mit Antwortmöglichkeiten
// richtig = Position der richtigen Antwort in "optionen" (0 = erste)
// art: 'rechnen' = Rechenaufgabe (ohne Angabe: Theorie)
// quelle: 'beispiel' = von Claude erstellte Beispielfrage, bitte inhaltlich prüfen
// quelle: 'claude' = Übungsaufgabe von Claude (nicht aus dem Skript)
const FRAGEN = [
  // Volkswirtschaftslehre: siehe fragen-vwl.js (aus den Lehrgangsskripten)

  // ---------- Rechnungswesen ----------
  { id: 'rewe-001', fach: 'rewe', thema: 'Kostenrechnung', typ: 'karte', quelle: 'beispiel',
    frage: 'Welche Fragen beantworten Kostenarten-, Kostenstellen- und Kostenträgerrechnung?',
    antwort: 'Kostenartenrechnung: Welche Kosten sind entstanden?\nKostenstellenrechnung: Wo sind sie entstanden?\nKostenträgerrechnung: Wofür (für welches Produkt) sind sie entstanden?' },
  { id: 'rewe-002', fach: 'rewe', thema: 'Teilkostenrechnung', typ: 'mc', quelle: 'beispiel',
    frage: 'Wie berechnet man den Deckungsbeitrag pro Stück?',
    optionen: ['Verkaufspreis − variable Stückkosten', 'Verkaufspreis − Fixkosten', 'Umsatz − Gesamtkosten', 'Variable Kosten + Fixkosten'],
    richtig: 0,
    erklaerung: 'Der Stückdeckungsbeitrag zeigt, wie viel jedes verkaufte Stück zur Deckung der Fixkosten beiträgt.' },
  { id: 'rewe-003', fach: 'rewe', thema: 'Teilkostenrechnung', typ: 'karte', art: 'rechnen', quelle: 'beispiel',
    frage: 'Fixkosten 60.000 €, Verkaufspreis 50 €/Stück, variable Kosten 30 €/Stück. Wo liegt die Gewinnschwelle (Break-even)?',
    antwort: 'Break-even-Menge = Fixkosten ÷ Stückdeckungsbeitrag\nStückdeckungsbeitrag = 50 € − 30 € = 20 €\n60.000 € ÷ 20 € = 3.000 Stück' },
  { id: 'rewe-004', fach: 'rewe', thema: 'Abgrenzungsrechnung', typ: 'mc', quelle: 'beispiel',
    frage: 'Welcher Aufwand ist ein neutraler Aufwand (also keine Kosten)?',
    optionen: ['Eine Spende an einen Sportverein', 'Löhne in der Fertigung', 'Verbrauch von Rohstoffen', 'Stromkosten der Produktionshalle'],
    richtig: 0,
    erklaerung: 'Neutraler Aufwand ist betriebsfremd, periodenfremd oder außerordentlich. Eine Spende hat nichts mit dem eigentlichen Betriebszweck zu tun.' },
  { id: 'rewe-005', fach: 'rewe', thema: 'Kostenrechnungssysteme', typ: 'karte', quelle: 'beispiel',
    frage: 'Was ist der Unterschied zwischen Voll- und Teilkostenrechnung?',
    antwort: 'Vollkostenrechnung: Alle Kosten (fix und variabel) werden auf die Produkte verteilt.\nTeilkostenrechnung: Nur die variablen Kosten werden den Produkten zugerechnet; die Fixkosten werden als Block über den Deckungsbeitrag gedeckt.' },

  // ---------- Finanzierung und Investition ----------
  { id: 'fi-001', fach: 'fi', thema: 'Finanzierung', typ: 'karte', quelle: 'beispiel',
    frage: 'Was besagt der Leverage-Effekt?',
    antwort: 'Mit mehr Fremdkapital steigt die Eigenkapitalrentabilität, solange die Gesamtkapitalrentabilität höher ist als der Fremdkapitalzins. Ist der Zins höher, kehrt sich der Effekt um (Leverage-Risiko).' },
  { id: 'fi-002', fach: 'fi', thema: 'Investitionsrechnung', typ: 'mc', quelle: 'beispiel',
    frage: 'Welches Verfahren ist eine statische Investitionsrechnung?',
    optionen: ['Amortisationsrechnung', 'Kapitalwertmethode', 'Interne-Zinsfuß-Methode', 'Annuitätenmethode'],
    richtig: 0,
    erklaerung: 'Statisch: Kosten-, Gewinn-, Rentabilitäts- und Amortisationsvergleich. Kapitalwert, interner Zinsfuß und Annuität sind dynamische Verfahren, weil sie den Zeitpunkt der Zahlungen berücksichtigen.' },
  { id: 'fi-003', fach: 'fi', thema: 'Investitionsrechnung', typ: 'karte', quelle: 'beispiel',
    frage: 'Was bedeutet ein positiver Kapitalwert?',
    antwort: 'Die Investition bringt mehr als den Kalkulationszinssatz ein. Sie ist vorteilhaft: Das eingesetzte Kapital wird zurückgewonnen, verzinst sich, und es bleibt ein Überschuss.' },
  { id: 'fi-004', fach: 'fi', thema: 'Finanzierungsarten', typ: 'mc', quelle: 'beispiel',
    frage: 'Wie lässt sich die Selbstfinanzierung (Einbehalten von Gewinnen) einordnen?',
    optionen: ['Innenfinanzierung mit Eigenkapital', 'Außenfinanzierung mit Eigenkapital', 'Außenfinanzierung mit Fremdkapital', 'Innenfinanzierung mit Fremdkapital'],
    richtig: 0,
    erklaerung: 'Das Geld kommt aus dem Unternehmen selbst (innen) und bleibt Eigenkapital. Innenfinanzierung mit Fremdkapital wäre z. B. die Bildung von Rückstellungen.' },
  { id: 'fi-005', fach: 'fi', thema: 'Finanzierungsregeln', typ: 'karte', quelle: 'beispiel',
    frage: 'Was besagt die goldene Bilanzregel?',
    antwort: 'Langfristig gebundenes Vermögen (Anlagevermögen) soll mit langfristigem Kapital (Eigenkapital + langfristiges Fremdkapital) finanziert werden. Grundsatz der Fristenkongruenz.' },

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
