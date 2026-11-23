'use strict';

// Synchronisiert den Lernfortschritt über Supabase zwischen allen Geräten eines Nutzers.
// Ohne Zugangsdaten in config.js (oder offline) bleibt alles lokal.
const Sync = (() => {
  const cfg = window.SYNC_CONFIG || {};
  const aktiv = !!(cfg.url && cfg.key && window.supabase);
  const client = aktiv ? window.supabase.createClient(cfg.url, cfg.key) : null;
  let nutzer = null;
  let status = aktiv ? 'Nicht angemeldet' : 'Synchronisierung nicht eingerichtet';
  let timer = null;
  let laeuft = false;
  let bereit = false;
  let eintrag; // Rangliste: undefined = unbekannt, null = nicht dabei, { name } = dabei

  // Wird am Ende von app.js aufgerufen, wenn Fortschritt und Ansichten existieren
  function start() {
    bereit = true;
    aktualisiereKopf();
    if (nutzer) { abgleichen(); aktualisiereAnsicht(); }
  }

  // Pro Karte gewinnt der neuere Eintrag; alles vor einem Zurücksetzen fällt weg.
  function zusammenfuehren(a, b) {
    a = a || {}; b = b || {};
    const reset = Math.max(a.reset || 0, b.reset || 0);
    const karten = {};
    for (const quelle of [a.karten || {}, b.karten || {}]) {
      for (const [id, e] of Object.entries(quelle)) {
        if ((e.t || 0) < reset) continue;
        if (!karten[id] || (e.t || 0) > (karten[id].t || 0)) karten[id] = e;
      }
    }
    return { karten, reset };
  }

  function setzeStatus(s) { status = s; aktualisiereKopf(); }

  function aktualisiereKopf() {
    const b = document.getElementById('konto-btn');
    const r = document.getElementById('rangliste-btn');
    if (r) r.hidden = !aktiv;
    if (!b) return;
    b.hidden = !aktiv;
    b.textContent = nutzer ? '☁ Konto' : 'Anmelden';
    b.title = status;
  }

  // ---- Rangliste (freiwillig) ----
  async function ladeEintrag() {
    if (!nutzer) { eintrag = undefined; return; }
    const { data, error } = await client.from('rangliste').select('name').eq('user_id', nutzer.id).maybeSingle();
    eintrag = error ? undefined : data;
  }
  function ranglistenDaten() {
    return Object.assign({ aktualisiert: new Date().toISOString() }, ranglistenWerte());
  }
  async function ranglisteSpeichern(name) {
    if (!name || name.length < 2) return { message: 'Der Spitzname braucht mindestens 2 Zeichen.' };
    const { error } = await client.from('rangliste')
      .upsert(Object.assign({ user_id: nutzer.id, name: name.slice(0, 20) }, ranglistenDaten()));
    if (!error) eintrag = { name: name.slice(0, 20) };
    return error;
  }
  async function ranglisteVerlassen() {
    const { error } = await client.from('rangliste').delete().eq('user_id', nutzer.id);
    if (!error) eintrag = null;
    return error;
  }
  async function ranglisteLaden() {
    return client.from('rangliste').select('user_id,name,sicher,gelernt,prozent')
      .order('gelernt', { ascending: false }).order('sicher', { ascending: false });
  }

  async function abgleichen() {
    if (!bereit || !nutzer || laeuft) return;
    laeuft = true;
    try {
      setzeStatus('Synchronisiere …');
      const { data, error } = await client.from('fortschritt').select('daten').eq('user_id', nutzer.id).maybeSingle();
      if (error) { setzeStatus('Fehler beim Laden: ' + error.message); return; }
      const vorher = JSON.stringify(fortschritt);
      fortschritt = zusammenfuehren(fortschritt, data && data.daten);
      try { localStorage.setItem(SPEICHER_KEY, JSON.stringify(fortschritt)); } catch (e) { /* egal */ }
      if (JSON.stringify(fortschritt) !== vorher) aktualisiereAnsicht();
      const { error: fehler } = await client.from('fortschritt')
        .upsert({ user_id: nutzer.id, daten: fortschritt, aktualisiert: new Date().toISOString() });
      setzeStatus(fehler
        ? 'Fehler beim Speichern: ' + fehler.message
        : 'Zuletzt synchronisiert um ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr');
      // Wer in der Rangliste ist, bekommt dort seine aktuellen Zahlen
      if (eintrag === undefined) await ladeEintrag();
      if (eintrag) await client.from('rangliste').update(ranglistenDaten()).eq('user_id', nutzer.id);
    } catch (e) {
      setzeStatus('Offline – wird später synchronisiert');
    } finally {
      laeuft = false;
    }
  }

  function planeUpload() {
    if (!nutzer) return;
    clearTimeout(timer);
    timer = setTimeout(abgleichen, 1500);
  }

  async function anmelden(email, passwort) {
    const { error } = await client.auth.signInWithPassword({ email, password: passwort });
    return error;
  }
  async function registrieren(email, passwort) {
    const { data, error } = await client.auth.signUp({ email, password: passwort });
    if (error) return error;
    // Falls in Supabase "E-Mail bestätigen" noch aktiv ist, gibt es noch keine Sitzung
    if (!data.session) return { message: 'Bitte bestätige zuerst den Link in der E-Mail von Supabase und melde dich dann an.' };
    return null;
  }
  async function abmelden() { await client.auth.signOut(); }

  // KI-Bewertung über die Edge Function "bewerten" (Gemini). null = nicht verfügbar → Begriffsprüfung
  let kiAus = false;
  // Einfache Erklärung der Musterlösung. Ergebnis: Text, oder { fehler: '…' }
  async function kiErklaeren(frage, musterloesung) {
    if (!aktiv || !nutzer) return { fehler: 'anmelden' };
    try {
      const ablauf = new Promise(r => setTimeout(() => r({ error: { message: 'Zeitüberschreitung' } }), 30000));
      const { data, error } = await Promise.race([
        client.functions.invoke(cfg.kiFunktion || 'bewerten', { body: { modus: 'erklaeren', frage, musterloesung } }),
        ablauf,
      ]);
      if (error) {
        const status = error.context && error.context.status;
        let info = status ? 'Code ' + status : error.message || '';
        try { const d = await error.context.json(); info += ': ' + (d.fehler || '') + (d.details ? ' – ' + d.details : ''); } catch (e) { /* kein JSON */ }
        return { fehler: status === 400 ? 'veraltet' : 'fehler', info: info.slice(0, 300) };
      }
      return data && data.erklaerung ? data.erklaerung : { fehler: 'fehler', info: 'leere Antwort' };
    } catch (e) { return { fehler: 'fehler', info: String(e && e.message || e).slice(0, 300) }; }
  }

  async function kiBewerten(frage, musterloesung, antwort, einfach) {
    if (!aktiv || !nutzer || kiAus) return null;
    try {
      const ablauf = new Promise(r => setTimeout(() => r({ error: { message: 'Zeitüberschreitung' } }), 20000));
      const { data, error } = await Promise.race([
        client.functions.invoke(cfg.kiFunktion || 'bewerten', { body: { frage, musterloesung, antwort, einfach: !!einfach } }),
        ablauf,
      ]);
      if (error) {
        const status = error.context && error.context.status;
        if (status === 404 || status === 500) kiAus = true; // nicht eingerichtet → in dieser Sitzung nicht mehr versuchen
        return null;
      }
      return data && typeof data.punkte === 'number' ? data : null;
    } catch (e) { return null; }
  }

  if (aktiv) {
    client.auth.onAuthStateChange((event, session) => {
      const vorher = nutzer;
      nutzer = session ? session.user : null;
      if (!nutzer || (vorher && vorher.id !== nutzer.id)) eintrag = undefined;
      if (!nutzer) setzeStatus('Nicht angemeldet');
      aktualisiereKopf();
      // Bis app.js geladen ist (Sync.start), nur den Nutzer merken
      if (!bereit) return;
      // setTimeout: Supabase-Aufrufe nicht direkt im Callback ausführen
      if (nutzer && (!vorher || vorher.id !== nutzer.id)) setTimeout(abgleichen, 0);
      if (!!vorher !== !!nutzer) setTimeout(aktualisiereAnsicht, 0);
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') abgleichen(); });
    window.addEventListener('online', abgleichen);
  }

  return {
    aktiv,
    get nutzer() { return nutzer; },
    get status() { return status; },
    get ranglisteEintrag() { return eintrag; },
    start, planeUpload, abgleichen, anmelden, registrieren, abmelden, aktualisiereKopf, kiBewerten, kiErklaeren,
    ladeEintrag, ranglisteSpeichern, ranglisteVerlassen, ranglisteLaden,
  };
})();
