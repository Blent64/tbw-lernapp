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
const FILTER_KEY = 'tbw-filter-v1';

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

// Auswahl: Lernform (Karteikarten / Multiple Choice) und Inhalt (Theorie / Rechnen)
let filter = { form: 'alle', art: 'alle', eingabe: 'an', erklaer: 'fach' };
try { filter = Object.assign(filter, JSON.parse(localStorage.getItem(FILTER_KEY)) || {}); } catch (e) { /* egal */ }
function speichereFilter() { try { localStorage.setItem(FILTER_KEY, JSON.stringify(filter)); } catch (e) { /* egal */ } }

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
// Für Textfelder: escapen ohne Zeilenumbrüche in <br> zu verwandeln
function escText(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- Eigene Antwort prüfen (Schlüsselbegriffe) ------------------------
const STOPPWOERTER = new Set(('aber alle allem allen aller alles also andere anderen anderer anderes auch auf aus bei beim bzw dabei damit dann darf dass dadurch daher dem den denen der des dessen die dies diese diesem diesen dieser dieses doch durch eine einem einen einer eines etwa gegen hier ihre ihren immer jede jedem jeden jeder jedes kann keine keinen mehr muss nach nicht noch nur oder ohne sehr sich sind sobald soll sowie ueber unter usw viel vom von vor wenn werden wird weil welche welcher welches wie zum zur zwischen haben hat ist sein seine seiner bleibt gibt beispiel beispiele also etwa wieder werden wurde jeweils sowie insbesondere ebenso z.b entsteht entstehen wenig weniger selbst schafft schaffen ueberlassen bleiben sollen sollte laesst lassen machen macht liegt liegen kommt kommen gehen geht stehen steht werden zuerst danach dafuer davon darf duerfen koennen moeglich moeglichst gleich gleiche ganze ganzen einzelne einzelnen bestimmte bestimmten genau grossen kleine kleinen hohe hoher hohen').split(' '));
function normal(s) {
  return s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}
function zerlege(s) {
  return s.split(/[^A-Za-zÄÖÜäöüß0-9.,]+/)
    .map(w => w.replace(/^[.,]+|[.,]+$/g, ''))
    .filter(Boolean)
    .map(w => /^\d/.test(w) ? { roh: w, n: w.replace(/\.(?=\d{3}\b)/g, '') } : { roh: w, n: normal(w) });
}
// Nur die wichtigsten Begriffe: Fachwörter (Großschreibung, lang) und Zahlen, höchstens 8
const MAX_BEGRIFFE = 8;
function schluesselbegriffe(antwort) {
  const gesehen = new Map();
  zerlege(antwort).forEach(({ roh, n }, pos) => {
    const zahl = /^\d/.test(n);
    if (zahl ? n.replace(/\D/g, '').length < 2 : (n.length < 5 || STOPPWOERTER.has(n))) return;
    const stamm = zahl ? n : n.slice(0, 6);
    if (gesehen.has(stamm)) { gesehen.get(stamm).anzahl++; return; }
    const gewicht = (zahl ? 6 : 0) + (/^[A-ZÄÖÜ]/.test(roh) ? 4 : 0) + Math.min(roh.length, 14) / 2;
    gesehen.set(stamm, { stamm, wort: roh, n, pos, gewicht, anzahl: 1 });
  });
  return [...gesehen.values()]
    .sort((a, b) => (b.gewicht + b.anzahl * 2) - (a.gewicht + a.anzahl * 2))
    .slice(0, MAX_BEGRIFFE)
    .sort((a, b) => a.pos - b.pos);
}
function pruefeAntwort(eingabe, antwort) {
  const begriffe = schluesselbegriffe(antwort);
  const meine = zerlege(eingabe).map(w => w.n);
  const treffer = begriffe.map(b => Object.assign({}, b, {
    ok: /^\d/.test(b.stamm)
      ? meine.includes(b.n)
      : meine.some(w => w.startsWith(b.stamm) || (w.length >= 5 && b.n.includes(w))),
  }));
  const gefunden = treffer.filter(t => t.ok).length;
  const prozent = treffer.length ? Math.round(gefunden / treffer.length * 100) : 0;
  const stufe = prozent >= 50 ? 'gut' : prozent >= 25 ? 'mittel' : 'schwach';
  const titel = { gut: '👍 Sieht gut aus', mittel: '🤏 Teilweise richtig', schwach: '✗ Da fehlt noch viel' }[stufe];
  return { treffer, gefunden, gesamt: treffer.length, prozent, stufe, titel, vorschlag: stufe === 'gut' };
}

// ---- Spracheingabe (falls der Browser sie unterstützt) ----------------
const Sprache = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  function stopp() { if (rec) rec.stop(); }
  function umschalten(feld, knopf) {
    if (rec) return stopp();
    rec = new SR();
    rec.lang = 'de-DE'; rec.continuous = true; rec.interimResults = true;
    const basis = feld.value.trim();
    rec.onresult = e => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + ' ';
      feld.value = (basis ? basis + ' ' : '') + t.trim();
      if (sitzung) sitzung.eingabe = feld.value;
    };
    rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') alert('Bitte erlaube der Seite den Zugriff aufs Mikrofon – oder nutze das 🎤 auf deiner Tastatur.'); };
    rec.onend = () => { rec = null; knopf.textContent = '🎤 Sprechen'; knopf.classList.remove('aktiv'); };
    try { rec.start(); knopf.textContent = '⏹ Stopp'; knopf.classList.add('aktiv'); }
    catch (e) { rec = null; }
  }
  return { verfuegbar: !!SR, umschalten, stopp };
})();

// ---- Vorlesen (Sprachausgabe des Browsers, kostenlos) -----------------
const Vorlesen = (() => {
  const syn = window.speechSynthesis;
  const verfuegbar = !!syn && 'SpeechSynthesisUtterance' in window;
  let aktiv = null;
  function stimme() {
    const de = syn.getVoices().filter(v => /^de/i.test(v.lang));
    return de.find(v => /google|premium|enhanced|natural|online/i.test(v.name)) || de[0] || null;
  }
  // Zeichen und Abkürzungen so umschreiben, dass sie gut vorgelesen werden
  function aufbereiten(t) {
    return t
      .replace(/z\.\s?B\./g, 'zum Beispiel').replace(/bzw\./g, 'beziehungsweise').replace(/ggf\./g, 'gegebenenfalls')
      .replace(/d\.\s?h\./g, 'das heißt').replace(/u\.\s?a\./g, 'unter anderem').replace(/usw\./g, 'und so weiter')
      .replace(/inkl\./g, 'inklusive').replace(/max\./g, 'maximal').replace(/mind\./g, 'mindestens').replace(/ca\./g, 'circa')
      .replace(/÷/g, ' geteilt durch ').replace(/×/g, ' mal ').replace(/ − /g, ' minus ').replace(/ \+ /g, ' plus ')
      .replace(/ = /g, ' gleich ').replace(/→/g, ', also ').replace(/≥/g, ' mindestens ').replace(/≤/g, ' höchstens ')
      .replace(/(\d)\s?%/g, '$1 Prozent').replace(/€/g, ' Euro').replace(/\^/g, ' hoch ');
  }
  // In kurze Stücke teilen: manche Browser brechen lange Texte sonst ab
  function stuecke(t) {
    return aufbereiten(t).split(/\n+/).flatMap(z => z.match(/[^.!?;:]+[.!?;:]*/g) || []).map(s => s.trim()).filter(Boolean);
  }
  function knoepfe() {
    document.querySelectorAll('[data-aktion="vorlesen"]').forEach(b => {
      const an = b.dataset.ziel === aktiv;
      b.textContent = an ? '⏹ Stopp' : '🔊 Vorlesen';
      b.classList.toggle('aktiv', an);
    });
  }
  function stopp() { if (!verfuegbar) return; aktiv = null; syn.cancel(); knoepfe(); }
  function sprich(ziel, text) {
    if (!verfuegbar) return;
    if (aktiv === ziel) return stopp();
    syn.cancel();
    aktiv = ziel;
    const teile = stuecke(text), v = stimme();
    teile.forEach((teil, i) => {
      const u = new SpeechSynthesisUtterance(teil);
      u.lang = 'de-DE'; if (v) u.voice = v;
      if (i === teile.length - 1) u.onend = () => { if (aktiv === ziel) { aktiv = null; knoepfe(); } };
      u.onerror = () => { if (aktiv === ziel) { aktiv = null; knoepfe(); } };
      syn.speak(u);
    });
    knoepfe();
  }
  function knopf(ziel) {
    if (!verfuegbar) return '';
    const an = aktiv === ziel;
    return `<button class="vorlesen ${an ? 'aktiv' : ''}" data-aktion="vorlesen" data-ziel="${ziel}">${an ? '⏹ Stopp' : '🔊 Vorlesen'}</button>`;
  }
  if (verfuegbar) syn.getVoices();
  return { verfuegbar, sprich, stopp, knopf };
})();

// ---- Einfach erklärt (KI schreibt die Lösung in einfacher Sprache) ----
const EINFACH_KEY = 'tbw-einfach-v1';
let einfachSpeicher = {};
try { einfachSpeicher = JSON.parse(localStorage.getItem(EINFACH_KEY)) || {}; } catch (e) { /* egal */ }
const einfachLaeuft = new Set();
const einfachFehler = {};
function kurzHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function musterVon(f) {
  return f.typ === 'mc' ? 'Richtige Antwort: ' + f.optionen[f.richtig] + (f.erklaerung ? '\nErklärung: ' + f.erklaerung : '') : f.antwort;
}
function frageVon(f) { return f.typ === 'begriff' ? `Erkläre den Fachbegriff „${f.frage}“ in eigenen Worten.` : f.frage; }
function einfachText(f) {
  const e = einfachSpeicher[f.id];
  return e && e.h === kurzHash(musterVon(f)) ? e.text : null;
}
function holeEinfach(f) {
  if (einfachText(f) || einfachLaeuft.has(f.id) || einfachFehler[f.id] || !Sync.nutzer) return;
  einfachLaeuft.add(f.id);
  Sync.kiErklaeren(frageVon(f), musterVon(f)).then(r => {
    einfachLaeuft.delete(f.id);
    if (typeof r === 'string') {
      einfachSpeicher[f.id] = { h: kurzHash(musterVon(f)), text: r };
      try { localStorage.setItem(EINFACH_KEY, JSON.stringify(einfachSpeicher)); } catch (e) { /* egal */ }
    } else einfachFehler[f.id] = r.fehler;
    if (sitzung && sitzung.warteschlange[sitzung.pos] === f.id) { const y = window.scrollY; zeigeKarte(); window.scrollTo(0, y); }
  });
}
function einfachBlock(f) {
  if (filter.erklaer !== 'einfach') return '';
  const t = einfachText(f);
  if (t) return `<div class="antwort einfach">${Vorlesen.knopf('einfach-' + f.id)}<strong>🧸 Einfach erklärt</strong><br>${esc(t)}</div>`;
  if (!Sync.nutzer) return `<p class="stats klein">🧸 Für einfache Erklärungen bitte zuerst anmelden (oben rechts).</p>`;
  const fe = einfachFehler[f.id];
  if (fe === 'veraltet') return `<p class="meldung">🧸 „Einfach erklärt“ ist noch nicht fertig eingerichtet: Die KI-Funktion bei Supabase muss noch aktualisiert werden.</p>`;
  if (fe) return `<p class="stats klein">🧸 Die einfache Erklärung hat gerade nicht geklappt. <button class="link-neutral" data-aktion="einfach-nochmal">Nochmal versuchen</button></p>`;
  return `<div class="pruefergebnis">🧸 Die KI schreibt eine einfache Erklärung …</div>`;
}
// Fachliche Lösung: im Einfach-Modus eingeklappt, sobald die einfache Erklärung da ist
function fachlich(f, html) {
  return filter.erklaer === 'einfach' && einfachText(f)
    ? `<details class="fachlich"><summary>🎓 Fachliche Lösung anzeigen</summary>${html}</details>` : html;
}

function vorleseText(f) {
  if (f.typ === 'mc') return 'Richtige Antwort: ' + f.optionen[f.richtig] + '.\n' + (f.erklaerung || '');
  return f.antwort;
}

function mische(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function box(f) { const p = fortschritt.karten[f.id]; return p ? p.box : -1; }
function istFaellig(f) { const p = fortschritt.karten[f.id]; return !p || p.faellig <= isoLokal(heute()); }
// Zuletzt falsch beantwortet = schon gelernt, aber zurück auf Stufe 0
function istFehler(f) { const p = fortschritt.karten[f.id]; return !!p && p.box === 0; }
function artVon(f) { return f.art === 'rechnen' ? 'rechnen' : 'theorie'; }
function passtFilter(f) {
  return (filter.form === 'alle' || f.typ === filter.form) && (filter.art === 'alle' || artVon(f) === filter.art);
}
function fragenVon(fach) { return FRAGEN.filter(f => f.fach === fach); }
function statistik(liste) {
  const sicher = liste.filter(f => box(f) >= 3).length;
  return {
    gesamt: liste.length,
    faellig: liste.filter(istFaellig).length,
    fehler: liste.filter(istFehler).length,
    prozent: liste.length ? Math.round(sicher / liste.length * 100) : 0,
  };
}
// Werte für die Rangliste (über alle Fächer)
function ranglistenWerte() {
  const sicher = FRAGEN.filter(f => box(f) >= 3).length;
  const gelernt = FRAGEN.filter(f => fortschritt.karten[f.id]).length;
  return { sicher, gelernt, prozent: FRAGEN.length ? Math.round(sicher / FRAGEN.length * 100) : 0 };
}
function bewerte(id, gewusst) {
  const alt = fortschritt.karten[id] ? fortschritt.karten[id].box : -1;
  const neu = gewusst ? Math.min(Math.max(alt, 0) + 1, INTERVALLE.length - 1) : 0;
  fortschritt.karten[id] = { box: neu, faellig: isoLokal(plusTage(gewusst ? INTERVALLE[neu] : 0)), t: Date.now() };
  speichereFortschritt();
}
function zeige(html) { app.innerHTML = html; window.scrollTo(0, 0); }

// ---- Ansichten --------------------------------------------------------
function filterLeiste() {
  const seg = (gruppe, wert, text) =>
    `<button class="seg ${filter[gruppe] === wert ? 'aktiv' : ''}" data-aktion="filter" data-gruppe="${gruppe}" data-wert="${wert}" aria-pressed="${filter[gruppe] === wert}">${text}</button>`;
  return `<div class="filter">
    <div class="segmente vier" role="group" aria-label="Lernform">
      ${seg('form', 'karte', '🗂 Karteikarten')}${seg('form', 'mc', '✅ Multiple Choice')}${seg('form', 'begriff', '🔤 Fachbegriffe')}${seg('form', 'alle', 'Alles')}
    </div>
    <div class="segmente" role="group" aria-label="Inhalt">
      ${seg('art', 'theorie', '📖 Theorie')}${seg('art', 'rechnen', '🧮 Rechnen')}${seg('art', 'alle', 'Beides')}
    </div>
    <div class="segmente zwei" role="group" aria-label="Karteikarten selbst beantworten">
      ${seg('eingabe', 'an', '✍️ Erst selbst antworten')}${seg('eingabe', 'aus', '👀 Nur aufdecken')}
    </div>
    <div class="segmente zwei" role="group" aria-label="Erklärungen">
      ${seg('erklaer', 'fach', '🎓 Fachlich erklärt')}${seg('erklaer', 'einfach', '🧸 Einfach erklärt')}
    </div>
    ${filter.erklaer === 'einfach' ? '<p class="stats klein">🧸 Die KI erklärt jede Lösung zusätzlich in ganz einfachen Worten (braucht Anmeldung und Internet).</p>' : ''}
  </div>`;
}

function lernKnoepfe(liste, daten) {
  const s = statistik(liste);
  if (!s.gesamt) return `<p class="leer">Für diese Auswahl gibt es hier noch keine Fragen.</p>`;
  return `<div class="knoepfe">
    <button class="primaer" data-aktion="lerne" data-modus="faellig" ${daten} ${s.faellig ? '' : 'disabled'}>Fällige lernen (${s.faellig})</button>
    <button data-aktion="lerne" data-modus="fehler" ${daten} ${s.fehler ? '' : 'disabled'}>🔁 Fehler wiederholen (${s.fehler})</button>
    <button data-aktion="lerne" data-modus="alle" ${daten}>Alle üben (${s.gesamt})</button>
  </div>`;
}

function zeigeStart() {
  ansicht = zeigeStart;
  let html = `<section class="pruefung">
    <h2 class="abschnitt">Was möchtest du lernen?</h2>
    ${filterLeiste()}
  </section>`;
  for (const p of PRUEFUNGEN) {
    const t = tageBis(p.datum);
    const liste = FRAGEN.filter(f => p.faecher.includes(f.fach) && passtFilter(f));
    const s = statistik(liste);
    html += `<section class="pruefung">
      <div class="countdown">
        <span class="zahl">${Math.max(t, 0)}</span>
        <span class="was">${t === 1 ? 'Tag' : 'Tage'} bis ${p.name}</span>
        <small>${formatDatum(p.datum)}</small>
      </div>
      <div class="fachliste">${p.faecher.map(fachKachel).join('')}</div>
      ${s.faellig || s.fehler ? `<div class="knoepfe oben">
        ${s.faellig ? `<button class="primaer" data-aktion="lerne" data-modus="faellig" data-pruefung="${p.name}">Alle fälligen aus ${p.name} (${s.faellig})</button>` : ''}
        ${s.fehler ? `<button data-aktion="lerne" data-modus="fehler" data-pruefung="${p.name}">🔁 Fehler aus ${p.name} wiederholen (${s.fehler})</button>` : ''}
      </div>` : ''}
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
  const alle = fragenVon(fach);
  const s = statistik(alle);
  const gefiltert = alle.filter(passtFilter);
  const sf = statistik(gefiltert);
  const info = !s.gesamt ? 'Noch keine Fragen'
    : (filter.form === 'alle' && filter.art === 'alle')
      ? `${s.gesamt} Fragen · ${s.faellig} fällig · ${s.prozent}% sicher`
      : `${sf.gesamt} passend · ${sf.faellig} fällig · ${s.prozent}% sicher`;
  return `<button class="kachel" data-aktion="fach" data-fach="${fach}">
    <span class="kachel-titel">${esc(FAECHER[fach])}</span>
    <span class="kachel-info">${info}</span>
    <span class="balken"><span style="width:${s.prozent}%"></span></span>
  </button>`;
}

function zeigeFach(fach) {
  ansicht = () => zeigeFach(fach);
  const alle = fragenVon(fach);
  const s = statistik(alle);
  const n = (bed) => alle.filter(bed).length;
  zeige(`<button class="zurueck" data-aktion="start">← Übersicht</button>
    <h1>${esc(FAECHER[fach])}</h1>
    <p class="stats">${s.gesamt} Fragen · ${s.faellig} fällig · ${s.prozent}% sicher</p>
    ${s.gesamt ? `<p class="stats klein">🗂 ${n(f => f.typ === 'karte')} Karteikarten · ✅ ${n(f => f.typ === 'mc')} Multiple Choice · 🔤 ${n(f => f.typ === 'begriff')} Fachbegriffe ·📖 ${n(f => artVon(f) === 'theorie')} Theorie · 🧮 ${n(f => artVon(f) === 'rechnen')} Rechnen</p>
      ${filterLeiste()}
      ${lernKnoepfe(alle.filter(passtFilter), `data-fach="${fach}"`)}`
    : `<p class="leer">Für dieses Fach gibt es noch keine Fragen.</p>`}`);
}

// ---- Rangliste --------------------------------------------------------
async function zeigeRangliste(meldung) {
  const meine = ansicht = () => zeigeRangliste();
  const kopf = `<button class="zurueck" data-aktion="start">← Übersicht</button><h1>🏆 Rangliste</h1>`;
  if (!Sync.nutzer) {
    return zeige(`${kopf}<p>Melde dich an, um die Rangliste zu sehen und mitzumachen.</p>
      <button class="primaer breit" data-aktion="konto">Anmelden</button>`);
  }
  zeige(`${kopf}<p class="leer">Lade …</p>`);
  const [{ data, error }] = await Promise.all([Sync.ranglisteLaden(), Sync.ladeEintrag()]);
  if (ansicht !== meine) return; // inzwischen woanders hingeklickt
  if (error) {
    return zeige(`${kopf}<p class="meldung">Die Rangliste ist noch nicht eingerichtet oder gerade nicht erreichbar.</p>`);
  }
  const ich = Sync.nutzer.id;
  const zeilen = (data || []).map((r, i) => `<tr class="${r.user_id === ich ? 'ich' : ''}">
      <td>${i + 1}.</td><td>${esc(r.name)}</td><td>${r.sicher}</td><td>${r.prozent}%</td><td>${r.gelernt}</td>
    </tr>`).join('');
  const eintrag = Sync.ranglisteEintrag;
  const teilnahme = eintrag
    ? `<p>Du bist dabei als <strong>${esc(eintrag.name)}</strong>.</p>
       <form data-form="rangliste" class="formular">
         <input name="name" maxlength="20" minlength="2" required value="${esc(eintrag.name)}" aria-label="Spitzname">
         <button>Spitznamen ändern</button>
       </form>
       <p><button class="link" data-aktion="rangliste-verlassen">Aus der Rangliste austreten</button></p>`
    : `<p>Mach mit, dann sehen die anderen deinen Spitznamen und wie viele Fragen du schon sicher kannst.</p>
       <form data-form="rangliste" class="formular">
         <input name="name" maxlength="20" minlength="2" required placeholder="Dein Spitzname (2–20 Zeichen)" aria-label="Spitzname">
         <button class="primaer breit">Mitmachen</button>
       </form>`;
  zeige(`${kopf}
    ${meldung ? `<p class="meldung">${esc(meldung)}</p>` : ''}
    ${zeilen ? `<div class="tabelle-rahmen"><table class="rangliste">
      <thead><tr><th>#</th><th>Name</th><th>Sicher</th><th>%</th><th>Gelernt</th></tr></thead>
      <tbody>${zeilen}</tbody></table></div>
      <p class="stats klein">Sicher = mindestens dreimal hintereinander richtig. Gelernt = schon einmal beantwortet. % bezieht sich auf alle ${FRAGEN.length} Fragen der App.</p>`
    : '<p class="leer">Noch niemand in der Rangliste. Sei die erste Person!</p>'}
    <section class="pruefung">${teilnahme}
      <p class="stats klein">Sichtbar für alle angemeldeten Nutzer: nur Spitzname und die Zahlen oben. Keine E-Mail, keine einzelnen Antworten.</p>
    </section>`);
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
  if (filter.erklaer === 'einfach') holeEinfach(f); // schon vorab laden, damit sie beim Aufdecken bereit ist
  let inhalt;
  if (f.typ === 'mc') {
    if (!s.optionen) s.optionen = mische(f.optionen.map((text, i) => ({ text, richtig: i === f.richtig })));
    const beantwortet = s.gewaehlt !== null;
    inhalt = `<div class="optionen">${s.optionen.map((o, i) => {
      let kl = '';
      if (beantwortet) kl = o.richtig ? 'richtig' : (i === s.gewaehlt ? 'falsch' : '');
      return `<button class="option ${kl}" data-aktion="waehle" data-i="${i}" ${beantwortet ? 'disabled' : ''}>${esc(o.text)}</button>`;
    }).join('')}</div>
    ${beantwortet ? `${einfachBlock(f)}${f.erklaerung ? fachlich(f, `<div class="antwort">${Vorlesen.knopf(f.id)}${esc(f.erklaerung)}</div>`) : ''}
      <button class="primaer breit" data-aktion="weiter">Weiter</button>` : ''}`;
  } else if (s.aufgedeckt) {
    const p = s.pruefung;
    const k = s.ki;
    const liste = (titel, a) => a && a.length ? `<p class="ki-liste"><strong>${titel}</strong><br>${a.map(x => '• ' + escText(x)).join('<br>')}</p>` : '';
    const ergebnis = s.kiLaeuft ? `<div class="pruefergebnis">🤖 Die KI prüft deine Antwort …</div>`
      : k ? `<div class="pruefergebnis ${k.urteil === 'richtig' ? 'gut' : k.urteil === 'teilweise' ? 'mittel' : 'schwach'}">
        <strong>🤖 ${k.urteil === 'richtig' ? '👍 Richtig' : k.urteil === 'teilweise' ? '🤏 Teilweise richtig' : '✗ Noch nicht richtig'}</strong> – ${k.punkte} von 100 Punkten
        <p>${escText(k.feedback)}</p>
        ${liste('Es fehlt:', k.fehlt)}${liste('Nicht korrekt:', k.falsch)}
        <details><summary>Deine Antwort</summary><p>${esc(s.eingabe)}</p></details>
      </div>`
      : p ? `<div class="pruefergebnis ${p.stufe}">
        <strong>${p.titel}</strong> – ${p.gefunden} von ${p.gesamt} Schlüsselbegriffen (${p.prozent} %)
        <div class="chips">${p.treffer.map(t => `<span class="chip ${t.ok ? 'ok' : 'fehlt'}">${t.ok ? '✓' : '✗'} ${escText(t.wort)}</span>`).join('')}</div>
        <details><summary>Deine Antwort</summary><p>${esc(s.eingabe)}</p></details>
      </div>` : '';
    const gut = k ? k.urteil === 'richtig' : p && p.vorschlag;
    const vorschlagJa = (k || p) && gut, vorschlagNein = (k || p) && !gut;
    inhalt = `${ergebnis}
      ${einfachBlock(f)}
      ${fachlich(f, `<div class="antwort">${Vorlesen.knopf(f.id)}<strong>Musterlösung</strong><br>${esc(f.antwort)}</div>`)}
      ${k ? '<p class="stats klein">Bewertet von KI (Google Gemini) – sie kann sich irren. Entscheide am Ende selbst.</p>'
        : p ? '<p class="stats klein">Die Prüfung vergleicht nur Schlüsselbegriffe – entscheide am Ende selbst ehrlich.</p>' : ''}
      <div class="bewertung">
        <button class="nein ${vorschlagNein ? 'vorschlag' : ''}" data-aktion="bewerte" data-gewusst="0">Nicht gewusst</button>
        <button class="ja ${vorschlagJa ? 'vorschlag' : ''}" data-aktion="bewerte" data-gewusst="1">Gewusst</button>
      </div>`;
  } else if (filter.eingabe === 'an') {
    inhalt = `<textarea id="eingabe" class="eingabe" rows="5" placeholder="${f.typ === 'begriff' ? 'Erkläre den Begriff in eigenen Worten' : 'Deine Antwort'} … (tippen${Sprache.verfuegbar ? ' oder 🎤 sprechen' : ''})">${escText(s.eingabe || '')}</textarea>
      <div class="eingabe-knoepfe">
        ${Sprache.verfuegbar ? '<button data-aktion="sprechen" id="mic">🎤 Sprechen</button>' : ''}
        <button class="primaer" data-aktion="pruefen">Antwort prüfen</button>
      </div>
      ${Sprache.verfuegbar ? '' : '<p class="stats klein">Tipp: Zum Sprechen das 🎤 auf deiner Tastatur antippen.</p>'}
      <p><button class="link-neutral" data-aktion="aufdecken">Weiß ich nicht – Lösung zeigen</button></p>`;
  } else {
    inhalt = `<button class="primaer breit" data-aktion="aufdecken">${artVon(f) === 'rechnen' ? 'Lösungsweg zeigen' : f.typ === 'begriff' ? 'Erklärung zeigen' : 'Antwort zeigen'}</button>`;
  }
  const marken = [
    f.typ === 'begriff' ? '<span class="badge">🔤 Fachbegriff</span>' : '',
    artVon(f) === 'rechnen' ? '<span class="badge rechnen">🧮 Rechnen</span>' : '',
    f.quelle === 'beispiel' ? '<span class="badge">Beispiel – bitte prüfen</span>' : '',
    f.quelle === 'claude' ? '<span class="badge">Übung von Claude</span>' : '',
    s.nochmal.has(f.id) ? '<span class="badge">🔁 Nochmal</span>' : '',
  ].join('');
  zeige(`<div class="sitzung-kopf">
      <button class="zurueck" data-aktion="abbrechen">← Beenden</button>
      <span>${s.pos + 1} / ${s.warteschlange.length}</span>
    </div>
    <div class="balken gross"><span style="width:${Math.round(s.pos / s.warteschlange.length * 100)}%"></span></div>
    <article class="karte">
      <div class="karte-meta">${esc(FAECHER[f.fach])}${f.thema ? ' · ' + esc(f.thema) : ''}${marken}</div>
      ${f.typ === 'begriff' ? '<p class="begriff-hinweis">Erkläre in eigenen Worten:</p>' : ''}
      <h2 class="frage ${f.typ === 'begriff' ? 'begriff' : ''}">${esc(f.frage)}</h2>
      ${inhalt}
    </article>`);
}

function naechste(gewusst) {
  const s = sitzung;
  const id = s.warteschlange[s.pos];
  Vorlesen.stopp();
  bewerte(id, gewusst);
  if (gewusst) s.richtig++;
  else {
    s.falsch++;
    // Falsch beantwortete Fragen kommen in dieser Runde einmal wieder, an zufälliger Stelle (frühestens 2 Fragen später)
    if (!s.nochmal.has(id)) {
      s.nochmal.add(id);
      const frueh = Math.min(s.pos + 3, s.warteschlange.length);
      const stelle = frueh + Math.floor(Math.random() * (s.warteschlange.length - frueh + 1));
      s.warteschlange.splice(stelle, 0, id);
    }
  }
  s.pos++; s.aufgedeckt = false; s.gewaehlt = null; s.optionen = null; s.eingabe = ''; s.pruefung = null; s.ki = null; s.kiLaeuft = false;
  zeigeKarte();
}

function zeigeEnde() {
  const s = sitzung;
  zeige(`<article class="karte ende">
    <h1>Geschafft! 🎉</h1>
    <p><span class="zahl">${s.richtig}</span> richtig · <span class="zahl">${s.falsch}</span> falsch</p>
    <p class="leer">Nicht gewusste Fragen findest du unter „Fehler wiederholen“. Sichere kommen erst in ein paar Tagen wieder.</p>
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
        <button data-aktion="rangliste">🏆 Zur Rangliste</button>
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
  if (form.dataset.form === 'rangliste') {
    const fehler = await Sync.ranglisteSpeichern(form.name.value.trim());
    return zeigeRangliste(fehler ? 'Das hat nicht geklappt: ' + fehler.message : '');
  }
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

document.addEventListener('input', e => {
  if (e.target.id === 'eingabe' && sitzung) sitzung.eingabe = e.target.value;
});

// ---- Klicks -----------------------------------------------------------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-aktion]');
  if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.aktion !== 'vorlesen') Vorlesen.stopp();
  switch (d.aktion) {
    case 'vorlesen': {
      const einfach = d.ziel.startsWith('einfach-');
      const f = FRAGEN.find(x => x.id === d.ziel.replace(/^einfach-/, ''));
      const text = f && (einfach ? einfachText(f) : vorleseText(f));
      if (text) Vorlesen.sprich(d.ziel, text);
      break;
    }
    case 'einfach-nochmal': {
      const f = FRAGEN.find(x => x.id === sitzung.warteschlange[sitzung.pos]);
      delete einfachFehler[f.id];
      zeigeKarte();
      break;
    }
    case 'start': sitzung = null; zeigeStart(); break;
    case 'fach': zeigeFach(d.fach); break;
    case 'filter':
      filter[d.gruppe] = d.wert; speichereFilter();
      if (ansicht) ansicht();
      break;
    case 'lerne': {
      // Grundmenge: ein Fach oder alle Fächer einer Prüfung, jeweils passend zur Auswahl
      const p = d.pruefung ? PRUEFUNGEN.find(x => x.name === d.pruefung) : null;
      let liste = (p ? FRAGEN.filter(f => p.faecher.includes(f.fach)) : fragenVon(d.fach)).filter(passtFilter);
      if (d.modus === 'faellig') liste = liste.filter(istFaellig);
      if (d.modus === 'fehler') liste = liste.filter(istFehler);
      starteSitzung(liste, p ? zeigeStart : () => zeigeFach(d.fach));
      break;
    }
    case 'aufdecken': Sprache.stopp(); sitzung.pruefung = null; sitzung.aufgedeckt = true; zeigeKarte(); break;
    case 'sprechen': Sprache.umschalten(document.getElementById('eingabe'), b); break;
    case 'pruefen': {
      Sprache.stopp();
      const feld = document.getElementById('eingabe');
      const text = (feld ? feld.value : '').trim();
      if (!text) { if (feld) { feld.focus(); feld.placeholder = 'Schreib oder sprich zuerst deine Antwort …'; } break; }
      const s = sitzung;
      const id = s.warteschlange[s.pos];
      const f = FRAGEN.find(x => x.id === id);
      s.eingabe = text;
      s.pruefung = pruefeAntwort(text, f.antwort);
      s.ki = null;
      s.aufgedeckt = true;
      s.kiLaeuft = !!Sync.nutzer;
      zeigeKarte();
      if (s.kiLaeuft) {
        Sync.kiBewerten(frageVon(f), f.antwort, text, filter.erklaer === 'einfach').then(ergebnis => {
          // Nur anzeigen, wenn noch dieselbe Karte offen ist
          if (sitzung !== s || s.warteschlange[s.pos] !== id || !s.aufgedeckt) return;
          s.kiLaeuft = false; s.ki = ergebnis;
          const y = window.scrollY; zeigeKarte(); window.scrollTo(0, y);
        });
      }
      break;
    }
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
    case 'rangliste': sitzung = null; zeigeRangliste(); break;
    case 'rangliste-verlassen':
      if (confirm('Wirklich aus der Rangliste austreten? Dein Eintrag wird gelöscht, dein Lernfortschritt bleibt.')) {
        Sync.ranglisteVerlassen().then(fehler => zeigeRangliste(fehler ? 'Das hat nicht geklappt: ' + fehler.message : ''));
      }
      break;
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
