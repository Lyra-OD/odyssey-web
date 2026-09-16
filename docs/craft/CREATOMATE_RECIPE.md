# Creatomate — Recette atomes (plan demain)

**Type :** craft · **Vérité pour :** ADN Creatomate figé en atomes UI → assembleur Odyssey.  
**Dernière MAJ :** 16 sept 2026 · **Carte :** [`../README.md`](../README.md) · **Atomes :** [`atoms/`](atoms/)

**Changelog** (max 5)
- 16 sept 2026 — **Étape 2** : intro atome branchée dans `payloadBuilder` (`assembleIntroAtom`) · médias/outro encore TS.
- 16 sept 2026 — **Étape 1** : `birthYear` / `deathYear` / `portraitUrl` signé (essentials).
- 16 sept 2026 — intro **35 s** magazine figée UI.
- 15 sept 2026 — pivot **atomes** ; labs curl v1.x = archive d’échec DA.

## Objectif

Film Quiet Luxury : intro portrait+nom+années → N photos/vidéos → outro **carte mémoire** (pas de logo Odyssey). Médias dynamiques ; look sculpté dans l’éditeur Creatomate.

## État (16 sept)

| Atome | Fichier | Statut |
|-------|---------|--------|
| Intro | [`atoms/intro.json`](atoms/intro.json) | **Branché** runtime via [`atomsAssembler.ts`](../../src/lib/creatomate/atomsAssembler.ts) |
| Média photo | [`atoms/media-photo.json`](atoms/media-photo.json) | Figé — assembleur **étape 3** |
| Média vidéo | [`atoms/media-video.json`](atoms/media-video.json) | Figé — assembleur **étape 3** |
| Outro | [`atoms/outro.json`](atoms/outro.json) | Figé — assembleur **étape 3** (encore wordmark TS) |

Binding intro (ne pas inverser) : **Text-CFQ** = nom · **Text-F5F** = années · **Image-VZZ** = photo de profil.

## Reste (étape 3)

1. Clips photo/vidéo atomes + fade overlap.
2. Outro carte mémoire (retirer wordmark Odyssey TS).
3. Test drain sandbox 2 photos + 1 vidéo + bed.
4. Doc STATUS quand film complet.

## Décisions produit figées

- Transition MVP = **fondu** unique (photo↔photo, vidéo↔vidéo, mixte).
- Vidéo = fenêtre **10 s** (`VIDEO_TRIM_DURATION_SEC`) — pas le fichier entier.
- Outro = hommage payé → **pas** de wordmark Odyssey.
- VFX AE (light leaks) = plus tard, pas bloquant demain.

## Interdit

- Clé API / secrets dans les atomes ou le chat.
- Preview Stingray comme master export.
- Re-sculpter toute la timeline dans l’UI (seulement atomes).
