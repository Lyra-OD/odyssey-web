# Odyssey Eclipse — exports DA

Fichiers générés depuis la marque vivante (`Vie = 1`, recette officielle).

| Fichier | Usage |
|---------|--------|
| `odyssey-eclipse-logo.gif` | GIF animé (512², ~3.3 s loop) — Slack / email / moodboard |
| `odyssey-eclipse-logo.apng.png` | **PNG animé** (APNG) — meilleure qualité que GIF |
| `odyssey-eclipse-logo-still.png` | PNG statique (une frame) |
| `odyssey-eclipse-logo.mp4` | Boucle H.264 légère (si le DA préfère vidéo) |

**Source de vérité produit :** composant `OdysseyEclipseMark` + [`ODYSSEY_ECLIPSE_LOGO.md`](../../ODYSSEY_ECLIPSE_LOGO.md).

**Regénérer :** page `/fr/contribute/test-eclipse-mark-export` + `node scripts/capture-eclipse-logo.mjs` (ou capture MCP) puis ffmpeg (voir script / notes craft).

Le dossier `frames/` est un intermediaire local — ne pas le versionner si trop lourd.
