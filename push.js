/* Push-Benachrichtigungen: Service Worker registrieren, Abo anlegen, Abo-Code zum Kopieren anzeigen. */
(() => {
  const VAPID_PUBLIC_KEY = 'BMaiugLTxuhpZGZn2mbJvrPjcSidRvNCMkefkHwa6aGJwPgJC9jsSpYtmbGSQqvPtETUsiEsTl-m6vjrv4_sFn8';
  const box = document.getElementById('push');
  if (!box) return;

  const standalone = !!(matchMedia('(display-mode: standalone)').matches || navigator.standalone);
  const hasSW = 'serviceWorker' in navigator;
  const supported = hasSW && 'PushManager' in window && 'Notification' in window;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const iosVer = (navigator.userAgent.match(/OS (\d+)_(\d+)/) || []).slice(1).join('.');
  const inSafari = ios && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  const diag = `<small style="display:block;margin-top:6px;opacity:.7">Diagnose: ${ios ? 'iOS ' + (iosVer || '?') : 'kein iOS'}, ${standalone ? 'Home-Bildschirm-App' : 'Browser'}${ios ? (inSafari ? ' (Safari)' : ' (nicht Safari)') : ''}, Service Worker ${hasSW ? 'ja' : 'nein'}, Push ${supported ? 'ja' : 'nein'}</small>`;

  if (!supported) {
    let msg;
    if (ios && iosVer && parseFloat(iosVer) < 16.4) msg = 'Push-Benachrichtigungen brauchen iOS 16.4 oder neuer. Bitte aktualisiere dein iPhone.';
    else if (ios && !standalone) msg = 'Für Benachrichtigungen: Öffne diese Seite in <b>Safari</b>, tippe auf Teilen → „Zum Home-Bildschirm“ und öffne die App dann vom Home-Bildschirm.';
    else if (ios) msg = 'Diese App unterstützt hier keine Benachrichtigungen. Entferne sie vom Home-Bildschirm und füge sie über <b>Safari</b> (Teilen → „Zum Home-Bildschirm“) neu hinzu.';
    else msg = 'Dieser Browser unterstützt keine Push-Benachrichtigungen.';
    box.innerHTML = `<p>${msg}</p>${diag}`;
    return;
  }
  const keyBytes = b64 => {
    const s = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(s, c => c.charCodeAt(0));
  };

  const showCode = sub => {
    const code = JSON.stringify(sub);
    box.innerHTML = `<p>Benachrichtigungen sind aktiv. Kopiere diesen Abo-Code und speichere ihn auf GitHub als Secret <b>PUSH_SUBSCRIPTION</b>:</p>
      <textarea readonly rows="4"></textarea><button type="button">Code kopieren</button>`;
    const ta = box.querySelector('textarea'), btn = box.querySelector('button');
    ta.value = code;
    btn.onclick = async () => {
      try { await navigator.clipboard.writeText(code); btn.textContent = 'Kopiert ✓'; }
      catch { ta.select(); btn.textContent = 'Markiert – jetzt kopieren'; }
    };
  };

  const showButton = reg => {
    box.innerHTML = `<button type="button">🔔 Benachrichtigungen aktivieren</button>`;
    box.querySelector('button').onclick = async () => {
      try {
        if (await Notification.requestPermission() !== 'granted') { box.innerHTML = '<p>Benachrichtigungen wurden nicht erlaubt. Du kannst sie in den iPhone-Einstellungen unter „Briefing“ einschalten.</p>'; return; }
        showCode(await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
      } catch (err) { box.innerHTML = `<p>Das hat nicht geklappt: ${String(err.message || err).replace(/</g, '&lt;')}</p>`; }
    };
  };

  navigator.serviceWorker.register('sw.js').then(async reg => {
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return showButton(reg);
    /* Bereits abonniert: Code nur auf Wunsch anzeigen. */
    box.innerHTML = '<button type="button" class="quiet">Push-Abo-Code anzeigen</button>';
    box.querySelector('button').onclick = () => showCode(sub);
  }).catch(err => {
    box.innerHTML = `<p>Service Worker konnte nicht starten: ${String(err.message || err).replace(/</g, '&lt;')}</p>${diag}`;
  });
})();
