# Creatomate — Recette atomes (plan demain)

**Type :** craft · **Vérité pour :** ADN Creatomate figé en atomes UI → assembleur Odyssey.  
**Dernière MAJ :** 16 sept 2026 · **Carte :** [`../README.md`](../README.md) · **Atomes :** [`atoms/`](atoms/)

**Changelog** (max 5)
- 16 sept 2026 — intro **35 s** magazine : portrait N&B `{{portraitUrl}}` · bindings Text-CFQ / Text-F5F / Image-VZZ · pas d’audio dans l’atome.
- 15 sept 2026 — pivot **atomes** (intro / photo / vidéo / outro) ; labs curl v1.x = archive d’échec DA ; assembleur = todo demain.

## Objectif

Film Quiet Luxury : intro portrait+nom+années → N photos/vidéos → outro **carte mémoire** (pas de logo Odyssey). Médias dynamiques ; look sculpté dans l’éditeur Creatomate.

## État (16 sept)

| Atome | Fichier | Statut |
|-------|---------|--------|
| Intro | [`atoms/intro.json`](atoms/intro.json) | Figé **35 s** — `{{displayName}}` · `{{birthYear}} - {{deathYear}}` · `{{portraitUrl}}` |
| Média photo | [`atoms/media-photo.json`](atoms/media-photo.json) | Figé — `{{mediaUrl}}` · smart_crop · Ken Burns 101→107 |
| Média vidéo | [`atoms/media-video.json`](atoms/media-video.json) | Figé dérivé — trim 10 s · pas de Ken Burns agressif |
| Outro | [`atoms/outro.json`](atoms/outro.json) | Figé — carte mémoire · typo = intro · **pas** ODYSSEY |

Binding intro (ne pas inverser) : **Text-CFQ** = nom · **Text-F5F** = années · **Image-VZZ** = photo de profil (grayscale + contrast composition).

Labs curl (`lab/v1.1`–`v1.3`) = référence d’échec (typo floue, muddy) — ne plus itérer ainsi.

## À terminer demain

1. **Assembleur** dans [`src/lib/creatomate/payloadBuilder.ts`](../../src/lib/creatomate/payloadBuilder.ts) (ou module `atoms/` dédié) :
   - Charger / cloner les JSON atomes.
   - Intro une fois (slots nom + années + **portraitUrl** depuis photo de profil wizard).
   - Pour chaque clip storyboard : photo **ou** vidéo → URL signée (+ `trim_start` si vidéo) → décaler `time` + fade overlap ~1 s.
   - Outro carte mémoire (mêmes slots nom/années).
   - Bed musique global (stems existants) — hors atomes UI.
2. **Années** : helper qui extrait `YYYY` depuis dates wizard (pas jour/mois).
3. **Test** : export drain sandbox Creatomate (Default Project / free trial) avec 2–3 photos + 1 vidéo trim + MP3 upload.
4. Doc : une puce Changelog [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) quand l’assembleur est branché.

## Décisions produit figées

- Transition MVP = **fondu** unique (photo↔photo, vidéo↔vidéo, mixte).
- Vidéo = fenêtre **10 s** (`VIDEO_TRIM_DURATION_SEC`) — pas le fichier entier.
- Outro = hommage payé → **pas** de wordmark Odyssey.
- VFX AE (light leaks) = plus tard, pas bloquant demain.

## Interdit

- Clé API / secrets dans les atomes ou le chat.
- Preview Stingray comme master export.
- Re-sculpter toute la timeline dans l’UI (seulement atomes).
