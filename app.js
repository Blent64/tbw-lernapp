'use strict';

// ---- Einstellungen ----------------------------------------------------
const PRUEFUNGEN = [
  { name: 'Teil 1', datum: '2027-02-24', faecher: ['vwl', 'rewe', 'fi', 'mpa'] },
  { name: 'Teil 2', datum: '2027-03-03', faecher: ['pm', 'uf', 'iuk'] },
];
const FAECHER = {
  vwl: 'Volkswirtschaftslehre',
  rewe: 'Rechnungswesen',
  fi: 'Finanzierung und Investition',
  mpa: 'Material-, Produktions- und Absatzwirtschaft',
  pm: 'Personalmanagement',
  uf: 'Unternehmensführung',
  iuk: 'Informations- und Kommunikationstechniken',
};
// Wiederholungsabstand in Tagen je Lernstufe (Karteikasten-Prinzip)
const INTERVALLE = [0, 1, 2, 4, 8, 16];
const SPEICHER_KEY = 'tbw-fortschritt-v2';

const app = document.getElementById('app');

// ---- Speichern & Datum ------------------------------------------------
// Aufbau: { karten: { [frageId]: { box, faellig, t } }, reset: Zeitstempel }
function ladeFortschritt() {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER_KEY));
    if (d && d.karten) return d;
  } catch (e) { /* kaputte Daten ignorieren */ }
  return { karten: {}, reset: 0 };
}
function speichereFortschritt() {
  try { localStorage.setItem(SPEICHER_KEY, JSON.stringify(fortschritt)); } catch (e) { /* z. B. privater Modus */ }
  Sync.planeUpload();
}
let fortschritt = ladeFortschritt();

// Aktuelle Ansicht neu zeichnen, z. B. wenn neue Daten vom Server kommen
let ansicht = null;
function aktualisiereAnsicht() { if (!sitzung && ansicht) ansicht(); }

function heute() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function isoLokal(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function plusTage(n) { const d = heute(); d.setDate(d.getDate() + n); return d; }
function ausIso(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function tageBis(iso) { return Math.round((ausIso(iso) - heute()) / 86400000); }
function formatDatum(iso) {
  return ausIso(iso).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ---- Hilfsfunktionen --------------------------------------------------
function esc(s) {
  return String(s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    .replace(/\n/g, '<br>');
}
function mische(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function box(f) { const p = fortschritt.karten[f.id]; return p ? p.box : -1; }
function istFaellig(f) { const p = fortschritt.karten[f.id]; return !p || p.faellig <= isoLokal(heute()); }
function fragenVon(fach) { return FRAGEN.filter(f => f.fach === fach); }
function statistik(liste) {
  const sicher = liste.filter(f => box(f) >= 3).length;
  return {
    gesamt: liste.length,
    faellig: liste.filter(istFaellig).length,
    prozent: liste.length ? Math.round(sicher / liste.length * 100) : 0,
  };
}
function bewerte(id, gewusst) {
  const alt = fortschritt.karten[id] ? fortschritt.karten[id].box : -1;
  const neu = gewusst ? Math.min(Math.max(alt, 0) + 1, INTERVALLE.length - 1) : 0;
  fortschritt.karten[id] = { box: neu, faellig: isoLokal(plusTage(gewusst ? INTERVALLE[neu] : 0)), t: Date.now() };
  speichereFortschritt();
}
function zeige(html) { app.innerHTML = html; window.scrollTo(0, 0); }

// ---- Ansichten --------------------------------------------------------
function zeigeStart() {
  ansicht = zeigeStart;
  let html = '';
  for (const p of PRUEFUNGEN) {
    const t = tageBis(p.datum);
    const s = statistik(FRAGEN.filter(f => p.faecher.includes(f.fach)));
    html += `<section class="pruefung">
      <div class="countdown">
        <span class="zahl">${Math.max(t, 0)}</span>
        <span class="was">${t === 1 ? 'Tag' : 'Tage'} bis ${p.name}</span>
        <small>${formatDatum(p.datum)}</small>
      </div>
      <div class="fachliste">${p.faecher.map(fachKachel).join('')}</div>
      ${s.faellig ? `<button class="primaer breit" data-aktion="lerne-pruefung" data-pruefung="${p.name}">Alle fälligen aus ${p.name} lernen (${s.faellig})</button>` : ''}
    </section>`;
  }
  const speicherText = Sync.nutzer
    ? 'Dein Lernfortschritt wird mit deinem Konto auf allen Geräten synchronisiert.'
    : 'Dein Lernfortschritt wird nur auf diesem Gerät gespeichert.'
      + (Sync.aktiv ? ' <button class="link-neutral" data-aktion="konto">Anmelden zum Synchronisieren</button>' : '');
  html += `<footer class="fuss">
    <p>${speicherText}</p>
    <button class="link" data-aktion="reset">Fortschritt zurücksetzen</button>
  </footer>`;
  zeige(html);
}

function fachKachel(fach) {
  const s = statistik(fragenVon(fach));
  return `<button class="kachel" data-aktion="fach" data-fach="${fach}">
    <span class="kachel-titel">${esc(FAECHER[fach])}</span>
    <span class="kachel-info">${s.gesamt ? `${s.gesamt} Fragen · ${s.faellig} fällig · ${s.prozent}% sicher` : 'Noch keine Fragen'}</span>
    <span class="balken"><span style="width:${s.prozent}%"></span></span>
  </button>`;
}

function zeigeFach(fach) {
  ansicht = () => zeigeFach(fach);
  const liste = fragenVon(fach);
  const s = statistik(liste);
  const anzahlQuiz = liste.filter(f => f.typ === 'mc').length;
  zeige(`<button class="zurueck" data-aktion="start">← Übersicht</button>
    <h1>${esc(FAECHER[fach])}</h1>
    <p class="stats">${s.gesamt} Fragen · ${s.faellig} fällig · ${s.prozent}% sicher</p>
    ${s.gesamt ? `<div class="knoepfe">
      <button class="primaer" data-aktion="lerne" data-fach="${fach}" data-modus="faellig" ${s.faellig ? '' : 'disabled'}>Fällige lernen (${s.faellig})</button>
      <button data-aktion="lerne" data-fach="${fach}" data-modus="alle">Alle üben (${s.gesamt})</button>
      <button data-aktion="lerne" data-fach="${fach}" data-modus="quiz" ${anzahlQuiz ? '' : 'disabled'}>Nur Quizfragen (${anzahlQuiz})</button>
    </div>` : `<p class="leer">Für dieses Fach gibt es noch keine Fragen.</p>`}`);
}

// ---- Lernsitzung ------------------------------------------------------
let sitzung = null;

function starteSitzung(liste, zurueck) {
  if (!liste.length) return;
  sitzung = {
    zurueck, warteschlange: mische(liste.map(f => f.id)), pos: 0,
    richtig: 0, falsch: 0, nochmal: new Set(),
    aufgedeckt: false, gewaehlt: null, optionen: null,
  };
  zeigeKarte();
}

function zeigeKarte() {
  const s = sitzung;
  if (s.pos >= s.warteschlange.length) return zeigeEnde();
  const f = FRAGEN.find(x => x.id === s.warteschlange[s.pos]);
  let inhalt;
  if (f.typ === 'mc') {
    if (!s.optionen) s.optionen = mische(f.optionen.map((text, i) => ({ text, richtig: i === f.richtig })));
    const beantwortet = s.gewaehlt !== null;
    inhalt = `<div class="optionen">${s.optionen.map((o, i) => {
      let kl = '';
      if (beantwortet) kl = o.richtig ? 'richtig' : (i === s.gewaehlt ? 'falsch' : '');
      return `<button class="option ${kl}" data-aktion="waehle" data-i="${i}" ${beantwortet ? 'disabled' : ''}>${esc(o.text)}</button>`;
    }).join('')}</div>
    ${beantwortet ? `${f.erklaerung ? `<div class="antwort">${esc(f.erklaerung)}</div>` : ''}
      <button class="primaer breit" data-aktion="weiter">Weiter</button>` : ''}`;
  } else {
    inhalt = s.aufgedeckt
      ? `<div class="antwort">${esc(f.antwort)}</div>
         <div class="bewertung">
           <button class="nein" data-aktion="bewerte" data-gewusst="0">Nicht gewusst</button>
           <button class="ja" data-aktion="bewerte" data-gewusst="1">Gewusst</button>
         </div>`
      : `<button class="primaer breit" data-aktion="aufdecken">Antwort zeigen</button>`;
  }
  zeige(`<div class="sitzung-kopf">
      <button class="zurueck" data-aktion="abbrechen">← Beenden</button>
      <span>${s.pos + 1} / ${s.warteschlange.length}</span>
    </div>
    <div class="balken gross"><span style="width:${Math.round(s.pos / s.warteschlange.length * 100)}%"></span></div>
    <article class="karte">
      <div class="karte-meta">${esc(FAECHER[f.fach])}${f.thema ? ' · ' + esc(f.thema) : ''}${f.quelle === 'beispiel' ? '<span class="badge">Beispiel – bitte prüfen</span>' : ''}</div>
      <h2 class="frage">${esc(f.frage)}</h2>
      ${inhalt}
    </article>`);
}

function naechste(gewusst) {
  const s = sitzung;
  const id = s.warteschlange[s.pos];
  bewerte(id, gewusst);
  if (gewusst) s.richtig++;
  else {
    s.falsch++;
    // Falsch beantwortete Fragen kommen am Ende der Sitzung einmal wieder
    if (!s.nochmal.has(id)) { s.nochmal.add(id); s.warteschlange.push(id); }
  }
  s.pos++; s.aufgedeckt = false; s.gewaehlt = null; s.optionen = null;
  zeigeKarte();
}

function zeigeEnde() {
  const s = sitzung;
  zeige(`<article class="karte ende">
    <h1>Geschafft! 🎉</h1>
    <p><span class="zahl">${s.richtig}</span> richtig · <span class="zahl">${s.falsch}</span> falsch</p>
    <p class="leer">Nicht gewusste Fragen kommen bald wieder dran, sichere erst in ein paar Tagen.</p>
    <button class="primaer breit" data-aktion="abbrechen">Zurück</button>
  </article>`);
}

// ---- Konto & Synchronisierung -----------------------------------------
let kontoModus = 'anmelden'; // oder 'neu'

function zeigeKonto(meldung) {
  ansicht = () => zeigeKonto();
  let inhalt;
  if (!Sync.aktiv) {
    inhalt = `<p class="leer">Die Synchronisierung ist noch nicht eingerichtet (oder du bist gerade offline).</p>`;
  } else if (Sync.nutzer) {
    inhalt = `<p>Angemeldet als <strong>${esc(Sync.nutzer.email)}</strong></p>
      <p class="stats">${esc(Sync.status)}</p>
      <div class="knoepfe">
        <button data-aktion="sync-jetzt">Jetzt synchronisieren</button>
        <button data-aktion="abmelden">Abmelden</button>
      </div>`;
  } else {
    const neu = kontoModus === 'neu';
    inhalt = `<p>${neu
        ? 'Leg dir einmalig ein Konto an. Danach meldest du dich auf jedem Gerät mit denselben Daten an.'
        : 'Melde dich an, dann ist dein Lernfortschritt auf PC, iPad und Handy gleich.'}</p>
      <form data-form="${neu ? 'registrieren' : 'anmelden'}" class="formular">
        <input name="email" type="email" autocomplete="email" placeholder="E-Mail-Adresse" required>
        <input name="passwort" type="password" autocomplete="${neu ? 'new-password' : 'current-password'}" placeholder="Passwort${neu ? ' (mind. 6 Zeichen)' : ''}" minlength="6" required>
        <button class="primaer breit">${neu ? 'Konto erstellen' : 'Anmelden'}</button>
      </form>
      <p><button class="link-neutral" data-aktion="konto-modus">${neu ? 'Ich habe schon ein Konto' : 'Noch kein Konto? Hier erstellen'}</button></p>`;
  }
  zeige(`<button class="zurueck" data-aktion="start">← Übersicht</button>
    <h1>Konto &amp; Synchronisierung</h1>
    ${meldung ? `<p class="meldung">${esc(meldung)}</p>` : ''}
    ${inhalt}`);
}

document.addEventListener('submit', async e => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  form.querySelector('button').disabled = true;
  const email = form.email.value.trim();
  const passwort = form.passwort.value;
  const fehler = form.dataset.form === 'registrieren'
    ? await Sync.registrieren(email, passwort)
    : await Sync.anmelden(email, passwort);
  if (fehler) {
    const text = /invalid login credentials/i.test(fehler.message)
      ? 'E-Mail-Adresse oder Passwort stimmt nicht.'
      : /already registered/i.test(fehler.message)
        ? 'Für diese E-Mail-Adresse gibt es schon ein Konto. Melde dich einfach an.'
        : 'Das hat nicht geklappt: ' + fehler.message;
    return zeigeKonto(text);
  }
  zeigeKonto();
});

// ---- Klicks -----------------------------------------------------------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-aktion]');
  if (!b || b.disabled) return;
  const d = b.dataset;
  switch (d.aktion) {
    case 'start': sitzung = null; zeigeStart(); break;
    case 'fach': zeigeFach(d.fach); break;
    case 'lerne': {
      let liste = fragenVon(d.fach);
      if (d.modus === 'faellig') liste = liste.filter(istFaellig);
      if (d.modus === 'quiz') liste = liste.filter(f => f.typ === 'mc');
      starteSitzung(liste, () => zeigeFach(d.fach));
      break;
    }
    case 'lerne-pruefung': {
      const p = PRUEFUNGEN.find(x => x.name === d.pruefung);
      starteSitzung(FRAGEN.filter(f => p.faecher.includes(f.fach) && istFaellig(f)), zeigeStart);
      break;
    }
    case 'aufdecken': sitzung.aufgedeckt = true; zeigeKarte(); break;
    case 'bewerte': naechste(d.gewusst === '1'); break;
    case 'waehle':
      sitzung.gewaehlt = Number(d.i);
      sitzung.letzteRichtig = sitzung.optionen[sitzung.gewaehlt].richtig;
      zeigeKarte();
      break;
    case 'weiter': naechste(sitzung.letzteRichtig); break;
    case 'abbrechen': { const z = sitzung.zurueck; sitzung = null; z(); break; }
    case 'konto': sitzung = null; zeigeKonto(); break;
    case 'konto-modus': kontoModus = kontoModus === 'neu' ? 'anmelden' : 'neu'; zeigeKonto(); break;
    case 'sync-jetzt': Sync.abgleichen().then(() => zeigeKonto()); break;
    case 'abmelden': Sync.abmelden(); break;
    case 'reset': {
      const wo = Sync.nutzer ? 'auf allen deinen Geräten' : 'auf diesem Gerät';
      if (confirm(`Wirklich den gesamten Lernfortschritt ${wo} löschen?`)) {
        fortschritt = { karten: {}, reset: Date.now() }; speichereFortschritt(); zeigeStart();
      }
      break;
    }
  }
});

zeigeStart();
Sync.start();
