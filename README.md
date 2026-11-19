# Morgen-Briefing

Ein tägliches Nachrichten-Briefing auf Deutsch als installierbare Web-App (PWA) für das iPhone.
Jeden Morgen erstellt eine Claude-Routine das Briefing und veröffentlicht es über GitHub Pages.
Um 7 Uhr kommt eine Push-Benachrichtigung aufs Handy.

**Live:** https://richter-jonathan.github.io/daily-news-briefing/

---

## Inhalt

- [So funktioniert es](#so-funktioniert-es)
- [Dateien im Repo](#dateien-im-repo)
- [Das Briefing-Datenformat](#das-briefing-datenformat)
- [Die Claude-Routine](#die-claude-routine)
- [Push-Benachrichtigungen](#push-benachrichtigungen)
- [GitHub Secrets](#github-secrets)
- [Einrichtung von Null](#einrichtung-von-null)
- [Testen](#testen)
- [Fehlersuche](#fehlersuche)
- [Sicherheit](#sicherheit)

---

## So funktioniert es

```
 06:45  Claude-Routine "Morgen-Briefing (GitHub)"
        │  recherchiert Nachrichten (Inland, Welt, Wirtschaft, Tech)
        │  ersetzt NUR den Datenblock in index.html
        ▼
        git push auf main
        │
        ▼
 ~06:50 GitHub Pages veröffentlicht die neue Seite
        │
 07:00  GitHub Action "Push-Benachrichtigung"
        │  Ist das "date" im Briefing == heute (Berlin)?
        │    nein → nichts tun
        │    ja   → Web-Push an das iPhone senden
        ▼
        Benachrichtigung "Dein Morgen-Briefing ist da" + Top-Schlagzeile
        Ein Tipp darauf öffnet die App
```

Es gibt keinen eigenen Server. Alles läuft über diese drei Dienste:

| Baustein | Dienst | Aufgabe |
|---|---|---|
| Inhalt erstellen | Claude Code Routine (Cloud) | Recherche, Text, Commit und Push |
| Hosting | GitHub Pages | Liefert die statische Seite aus |
| Benachrichtigung | GitHub Actions + Web Push (VAPID) | Sendet um 7 Uhr den Push |

---

## Dateien im Repo

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette App: Design (CSS), Darstellung (JS) und die Briefing-Daten im Block `BRIEFING-DATA`. |
| `push.js` | Registriert den Service Worker, zeigt den Button „🔔 Benachrichtigungen aktivieren“ und den Abo-Code zum Kopieren. Sie enthält den **öffentlichen** VAPID-Schlüssel. |
| `sw.js` | Service Worker: empfängt den Push, zeigt die Benachrichtigung und öffnet beim Antippen die App. |
| `manifest.json` | PWA-Manifest mit Name, Farben und Icons, damit die Seite als App auf den Home-Bildschirm kann. |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | App-Icons |
| `.github/workflows/push-notification.yml` | GitHub Action: Zeitplan um 7 Uhr und manueller Testlauf. |
| `.github/scripts/send-push.mjs` | Prüft Uhrzeit und Datum und sendet den Web-Push über die Bibliothek `web-push`. |

---

## Das Briefing-Datenformat

In `index.html` liegt zwischen diesen Markern ein JSON-Block:

```html
<!-- BRIEFING-DATA:START -->
<script id="briefing-data" type="application/json">
{ ... }
</script>
<!-- BRIEFING-DATA:END -->
```

**Nur dieser Block wird täglich ersetzt.** Alles andere in `index.html` bleibt unverändert.

```jsonc
{
  "date": "2026-11-20",                 // YYYY-MM-DD – entscheidet, ob der Push gesendet wird
  "dateLabel": "Freitag, 20. November",
  "top": { "title": "…", "text": "…", "motif": "bank", "sources": [["Name", "https://…"]] },
  "sections": [
    { "id": "de",  "title": "Deutsche Politik",       "tab": "Inland",     "items": [ /* 3 Meldungen */ ] },
    { "id": "int", "title": "Internationale Politik", "tab": "Welt",       "items": [ … ] },
    { "id": "wi",  "title": "Wirtschaft",             "tab": "Wirtschaft", "items": [ … ] },
    { "id": "it",  "title": "Informatik & Tech",      "tab": "Tech",       "items": [ … ] }
  ],
  "extra": { "title": "…", "text": "…", "motif": "game", "sources": [ … ] },   // optional
  "updated": "20.11.2026, 06:52 Uhr"
}
```

Jede Meldung (`items[]`) hat die Felder `title`, `text`, `motif` und `sources`.

**Erlaubte `motif`-Werte** (gezeichnete Illustrationen statt Fotos):
`bank`, `stars`, `telecom`, `agreement`, `summit`, `ship`, `server`, `chart-up`, `chart-down`, `bell`, `acquisition`, `code`, `chip`, `shield`, `game`, `globe`, `parliament`.

---

## Die Claude-Routine

| | |
|---|---|
| Name | **Morgen-Briefing (GitHub)** |
| Zeitplan | täglich um 6:45 Uhr Europe/Berlin (`CRON_TZ=Europe/Berlin 45 6 * * *`) |
| Modell | Claude Opus 5.5 |
| Repo | `J0nathan27/daily-news-briefing` (Branch `main`) |
| Verwalten | https://claude.ai/code/routines/trig_015VVFahn1r8CuESoxAABw4F |

Was die Routine macht:

1. Sie ermittelt das heutige Datum in Berliner Zeit.
2. Sie sucht Nachrichten der letzten ~24 Stunden zu vier Themen und bevorzugt seriöse Quellen.
3. Sie schreibt ein Top-Thema, je 3 Meldungen pro Rubrik und optional ein „Extra“, alles in eigenen Worten.
4. Sie ersetzt **nur** den `BRIEFING-DATA`-Block in `index.html`.
5. Sie prüft mit Python: gültiges JSON, `date` ist heute, 4×3 Meldungen, erlaubte Motive, nur `index.html` geändert.
6. Sie committet `Briefing YYYY-MM-DD` und pusht auf `main`.

**Voraussetzung:** Claude braucht Schreibzugriff auf das Repo. Dafür muss GitHub unter
https://claude.ai/customize/connectors verbunden und die
[Claude GitHub App](https://github.com/apps/claude/installations/select_target) für dieses Repo installiert sein.

> Die frühere Routine „Morgen-Briefing“ hat ein claude.ai-Artifact aktualisiert statt dieses Repo. Sie ist **deaktiviert**, aber nicht gelöscht.

---

## Push-Benachrichtigungen

Die Benachrichtigungen verwenden den Standard **Web Push** mit **VAPID**-Schlüsseln. Es braucht keinen Drittanbieter und keine zusätzliche App.

**Ablauf:**

1. **Einmalig auf dem Handy:** Du öffnest die App und tippst auf „🔔 Benachrichtigungen aktivieren“. Der Browser legt ein *Push-Abo* an, das ist eine Adresse beim Push-Dienst von Apple mit eigenen Schlüsseln. `push.js` zeigt dieses Abo als JSON-Code zum Kopieren an.
2. **Einmalig auf GitHub:** Du speicherst den Abo-Code und die VAPID-Schlüssel als Secrets.
3. **Täglich:** Die Action liest die Secrets, verschlüsselt die Nachricht und schickt sie an das Abo.

**Zeitplan der Action:** `cron: '0 5,6 * * *'` (UTC). GitHub kennt nur UTC. Deshalb läuft die Action um 5 und um 6 Uhr UTC, und das Skript sendet nur in dem Lauf, der in Berlin auf 7 Uhr fällt. So stimmt die Uhrzeit im Sommer und im Winter. GitHub startet geplante Läufe oft 5–20 Minuten verspätet.

**Bedingungen für den Versand:**
- Die Berliner Uhrzeit ist 7 Uhr.
- `date` im Briefing entspricht dem heutigen Datum. Ohne neues Briefing gibt es keine Benachrichtigung.

**iPhone-Hinweise:**
- Du brauchst **iOS 16.4 oder neuer**.
- Im normalen Safari-Tab funktioniert Web-Push nicht. Füge die Seite über **Safari → Teilen → „Zum Home-Bildschirm“** hinzu und öffne sie von dort.
- Jedes Abo gehört zu genau einer Installation. Wenn du die App neu installierst, brauchst du ein neues Abo und musst das Secret `PUSH_SUBSCRIPTION` aktualisieren.

---

## GitHub Secrets

Die Action braucht **drei Repository-Secrets**. Du legst sie hier an:

**Repo → Settings → Secrets and variables → Actions → Reiter „Secrets“ → „New repository secret“**
(direkt: https://github.com/richter-jonathan/daily-news-briefing/settings/secrets/actions)

| Name (genau so schreiben) | Inhalt | Woher |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Öffentlicher VAPID-Schlüssel, ca. 87 Zeichen, beginnt mit `B` | Steht in `push.js` als `VAPID_PUBLIC_KEY` und muss **identisch** sein. |
| `VAPID_PRIVATE_KEY` | Privater VAPID-Schlüssel, ca. 43 Zeichen | Wurde zusammen mit dem öffentlichen erzeugt. **Steht nirgends im Repo.** |
| `PUSH_SUBSCRIPTION` | Abo-Code als JSON: `{"endpoint":"https://web.push.apple.com/…","keys":{"p256dh":"…","auth":"…"}}` | In der App ganz unten: „Push-Abo-Code anzeigen“ → „Code kopieren“ |

**Wichtig:**
- Die Secrets gehören unter **„Repository secrets“**. Unter „Environment secrets“, im Reiter „Variables“ oder unter Codespaces bzw. Dependabot findet der Workflow sie nicht.
- Nach dem Speichern zeigt GitHub den Wert **nie wieder an**, auch nicht beim Bearbeiten. Das ist normal. Ob die Werte stimmen, zeigt nur ein Testlauf.
- Ein Secret lässt sich nicht umbenennen. Bei einem falschen Namen löschst du es und legst es neu an.
- Leerzeichen, Zeilenumbrüche und Anführungszeichen am Rand entfernt das Skript automatisch.

### Neue VAPID-Schlüssel erzeugen

Das ist nur nötig, wenn der private Schlüssel verloren geht oder öffentlich geworden ist:

```bash
npx web-push@3.6.7 generate-vapid-keys
```

Danach musst du:
1. Den neuen **Public Key** in `push.js` (`VAPID_PUBLIC_KEY`) eintragen, committen und pushen.
2. Beide Secrets `VAPID_PUBLIC_KEY` und `VAPID_PRIVATE_KEY` auf GitHub ersetzen.
3. In der App **neu abonnieren**. Dafür die App vom Home-Bildschirm entfernen, neu hinzufügen und den Button tippen. Danach `PUSH_SUBSCRIPTION` ersetzen. Alte Abos funktionieren mit neuen Schlüsseln nicht.

---

## Einrichtung von Null

1. **GitHub Pages aktivieren:** Settings → Pages → Source „Deploy from a branch“, Branch `main`, Ordner `/ (root)`.
2. **VAPID-Schlüssel erzeugen** (siehe oben) und den Public Key in `push.js` eintragen.
3. **App installieren:** Auf dem iPhone in Safari die Live-URL öffnen, dann Teilen → „Zum Home-Bildschirm“.
4. **Abonnieren:** Die App vom Home-Bildschirm öffnen, ganz nach unten scrollen, „🔔 Benachrichtigungen aktivieren“ tippen, erlauben und den Code kopieren.
5. **Drei Secrets anlegen** (siehe [GitHub Secrets](#github-secrets)).
6. **Actions erlauben:** Settings → Actions → General → „Allow all actions and reusable workflows“.
7. **Claude mit GitHub verbinden** und die Routine anlegen (siehe [Die Claude-Routine](#die-claude-routine)).
8. **Testen** (siehe unten).

---

## Testen

**Push-Benachrichtigung sofort senden:**
GitHub → **Actions** → links **„Push-Benachrichtigung“** → rechts **„Run workflow“** → Haken „Sofort senden“ setzen → **Run workflow**.
Der Test ignoriert Uhrzeit und Datum. Nach etwa 15 Sekunden sollte die Benachrichtigung auf dem Handy sein.
Der Button „Run workflow“ wird auf der mobilen GitHub-Seite oft nicht angezeigt. Nimm dafür den PC.

**Briefing sofort neu erstellen:**
Öffne https://claude.ai/code/routines/trig_015VVFahn1r8CuESoxAABw4F und klicke auf „Run now“. Die Routine committet ein neues Briefing auf `main`.

**Lokal ansehen:**

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

---

## Fehlersuche

| Symptom | Ursache / Lösung |
|---|---|
| Action rot: **„Secret … fehlt“** | Das Secret fehlt oder hat einen falschen Namen bzw. liegt an der falschen Stelle. Siehe [GitHub Secrets](#github-secrets). |
| Action rot: **„VAPID-Schlüssel ungültig“** | Der Schlüssel wurde unvollständig oder falsch kopiert. Speichere das Secret neu. |
| Action rot: **„kein gültiger Abo-Code“** | `PUSH_SUBSCRIPTION` ist unvollständig. Er muss mit `{"endpoint":` beginnen und mit `}}` enden. |
| Action rot: **„Push-Abo ist abgelaufen“** (HTTP 404/410) | Tippe in der App erneut auf den Button und ersetze `PUSH_SUBSCRIPTION`. |
| Action rot: **HTTP 401/403** | Die VAPID-Schlüssel passen nicht zueinander oder nicht zum Abo. Notfalls neu erzeugen (siehe oben). |
| Action grün, Log sagt **„Briefing ist vom …“** | Die Routine hat heute kein neues Briefing gepusht. Prüfe die Läufe der Routine. |
| Action grün, aber **keine Benachrichtigung** | iPhone: Einstellungen → Mitteilungen → App erlauben. Prüfe auch, ob ein Fokus-Modus aktiv ist. |
| Routine-Lauf: **403 „Claude doesn't have GitHub access“** | Verbinde GitHub in claude.ai neu und installiere die Claude GitHub App für das Repo. |
| **Button fehlt** in der App | Der Cache ist veraltet. Schließe die App ganz oder entferne sie und füge sie über Safari neu hinzu. Unten steht immer eine Diagnosezeile mit iOS-Version und Push-Unterstützung. |
| App zeigt **altes Briefing** | GitHub Pages speichert Seiten bis zu 10 Minuten im Cache. Warte kurz und öffne die App neu. |

Fehlermeldungen der Action stehen direkt in der Lauf-Übersicht unter **„Annotations“**.

---

## Sicherheit

Das Repo ist **öffentlich**. Das ist so in Ordnung:

- **Der öffentliche VAPID-Schlüssel** steht in `push.js`. Er ist dafür gedacht, öffentlich zu sein.
- **Der private VAPID-Schlüssel und das Push-Abo** liegen nur in den GitHub Secrets. Die sind verschlüsselt, für Besucher und Forks unsichtbar und werden in Logs automatisch geschwärzt.
- **Ohne den privaten Schlüssel kann niemand Pushes an das Abo senden.** Die Inhalte sind zusätzlich Ende-zu-Ende verschlüsselt.
- **Das Sende-Skript gibt in Fehlermeldungen bewusst keine Teile der Secrets aus.** Die Action-Logs sind öffentlich einsehbar.
- **Der Workflow hat nur Leserechte** (`permissions: contents: read`).
- **Committe niemals** den privaten Schlüssel oder den Abo-Code. Falls das doch passiert, erzeuge neue Schlüssel (siehe oben).
