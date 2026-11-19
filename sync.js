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
    if (!b) return;
    b.hidden = !aktiv;
    b.textContent = nutzer ? '☁ Angemeldet' : 'Anmelden';
    b.title = status;
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

  if (aktiv) {
    client.auth.onAuthStateChange((event, session) => {
      const vorher = nutzer;
      nutzer = session ? session.user : null;
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
    start, planeUpload, abgleichen, anmelden, registrieren, abmelden, aktualisiereKopf,
  };
})();
