'use strict';

// Neue Versionen erkennen und Zum-Aktualisieren-Ziehen (Pull-to-Refresh)
const Update = (() => {
  const meta = document.querySelector('meta[name="app-version"]');
  const aktuell = meta ? meta.content : '';
  const hinweis = document.getElementById('ziehen');
  const SCHWELLE = 80;

  async function neueVersion() {
    try {
      const r = await fetch(location.pathname + '?check=' + Date.now(), { cache: 'no-store' });
      const m = (await r.text()).match(/name="app-version" content="([^"]+)"/);
      return m && m[1] !== aktuell ? m[1] : null;
    } catch (e) { return null; } // offline
  }

  // Neue URL erzwingt frische Dateien (Browser-Cache wird umgangen)
  function lade(version) { location.replace(location.pathname + '?v=' + encodeURIComponent(version)); }

  // Automatisch: nur neu laden, wenn gerade keine Lernrunde läuft
  async function pruefe() {
    if (sitzung) return;
    const v = await neueVersion();
    if (v && !sitzung) lade(v);
  }

  function zeigeHinweis(hoehe, text) {
    hinweis.style.height = hoehe + 'px';
    if (text) hinweis.textContent = text;
  }

  async function aktualisieren() {
    zeigeHinweis(44, '↻ Aktualisiere …');
    const v = sitzung ? null : await neueVersion();
    if (v) return lade(v);
    await Sync.abgleichen();
    aktualisiereAnsicht();
    zeigeHinweis(44, Sync.nutzer ? '✓ Alles aktuell und synchronisiert' : '✓ App ist aktuell');
    setTimeout(() => zeigeHinweis(0), 1200);
  }

  let startY = null;
  let abstand = 0;
  window.addEventListener('touchstart', e => {
    startY = (window.scrollY <= 0 && e.touches.length === 1) ? e.touches[0].clientY : null;
    abstand = 0;
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (startY === null) return;
    abstand = e.touches[0].clientY - startY;
    if (abstand <= 0) return zeigeHinweis(0);
    const h = Math.min(abstand, 140) * 0.5;
    zeigeHinweis(h, abstand > SCHWELLE ? '↻ Loslassen zum Aktualisieren' : '↓ Zum Aktualisieren ziehen');
  }, { passive: true });
  window.addEventListener('touchend', () => {
    if (startY === null) return;
    startY = null;
    if (abstand > SCHWELLE) aktualisieren(); else zeigeHinweis(0);
    abstand = 0;
  });

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pruefe(); });

  return { pruefe, aktualisieren, version: aktuell };
})();

Update.pruefe();
