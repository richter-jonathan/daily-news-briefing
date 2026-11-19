// Schickt die Push-Benachrichtigung, wenn index.html das Briefing von heute enthält.
// Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SUBSCRIPTION (Secrets), FORCE=true zum Testen.
import { readFileSync } from 'node:fs';
import webpush from 'web-push';

const TZ = 'Europe/Berlin';
const now = new Date();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now); // YYYY-MM-DD
const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(now));
const force = process.env.FORCE === 'true';

// Der Zeitplan läuft um 5 und 6 Uhr UTC; nur der Lauf, der in Berlin auf 7 Uhr fällt, sendet (Sommer- und Winterzeit).
if (!force && hour !== 7) { console.log(`Berlin ${hour} Uhr – nicht 7 Uhr, nichts zu tun.`); process.exit(0); }

const html = readFileSync('index.html', 'utf8');
const m = html.match(/<script id="briefing-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!m) { console.error('Briefing-Daten in index.html nicht gefunden.'); process.exit(1); }
const data = JSON.parse(m[1]);

if (!force && data.date !== today) { console.log(`Briefing ist vom ${data.date}, heute ist ${today} – keine Benachrichtigung.`); process.exit(0); }

for (const k of ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'PUSH_SUBSCRIPTION']) {
  if (!process.env[k]) { console.error(`Secret ${k} fehlt.`); process.exit(1); }
}
webpush.setVapidDetails('https://j0nathan27.github.io/daily-news-briefing/', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

const payload = JSON.stringify({
  title: 'Dein Morgen-Briefing ist da',
  body: data.top?.title || data.dateLabel || 'Neue Meldungen für heute.',
  url: './'
});

try {
  const res = await webpush.sendNotification(JSON.parse(process.env.PUSH_SUBSCRIPTION), payload, { TTL: 6 * 3600, urgency: 'normal' });
  console.log(`Benachrichtigung gesendet (HTTP ${res.statusCode}).`);
} catch (err) {
  if (err.statusCode === 404 || err.statusCode === 410) {
    console.error('Das Push-Abo ist abgelaufen. In der App erneut „Benachrichtigungen aktivieren“ tippen und das Secret PUSH_SUBSCRIPTION aktualisieren.');
  } else {
    console.error(`Senden fehlgeschlagen (HTTP ${err.statusCode ?? '?'}): ${err.body || err.message}`);
  }
  process.exit(1);
}
