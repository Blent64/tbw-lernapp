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

  // Material-, Produktions- und Absatzwirtschaft: siehe fragen-mpa.js (aus den Lehrgangsskripten)
];
