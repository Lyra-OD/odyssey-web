# Creatomate — Recette atomes (assembleur)

**Type :** craft · **Vérité pour :** ADN Creatomate figé en atomes UI → assembleur Odyssey.  
**Dernière MAJ :** 21 sept 2026 · **Carte :** [`../README.md`](../README.md) · **Atomes :** [`atoms/`](atoms/)

**Changelog** (max 5)
- 21 sept 2026 — **C0** : bed borné à `filmDuration` · fade out fin ≥1.8 s · outro **11.5 s** + `Shape-EndBlack` (≥1.5 s fade).
- 21 sept 2026 — Outro v2 : document 10 s · nom+années sans eyebrow · scale Quiet Luxury 104 % · bind `Text-499` / `Text-BZ4`.
- 16 sept 2026 — **Étape 3** : `assembleAtomFilm` — intro + N photo/vidéo + outro carte mémoire · plus de wordmark Odyssey TS.
- 16 sept 2026 — **Étape 2** : intro atome branchée · intro resserrée **27 s** (portrait 10 s, noir pont 2 s).
- 16 sept 2026 — **Étape 1** : `birthYear` / `deathYear` / `portraitUrl` signé.

## Objectif

Film Quiet Luxury : intro portrait+nom+années → N photos/vidéos → outro **carte mémoire** (pas de logo Odyssey).

## État

| Atome | Fichier | Runtime |
|-------|---------|---------|
| Intro | [`atoms/intro.json`](atoms/intro.json) | `assembleAtomFilm` |
| Média photo | [`atoms/media-photo.json`](atoms/media-photo.json) | idem · `Image-FQ3` |
| Média vidéo | [`atoms/media-video.json`](atoms/media-video.json) | idem · `Video-Clip` + `trim_start` |
| Outro | [`atoms/outro.json`](atoms/outro.json) | document **11.5 s** · fade noir fin · pas ODYSSEY · pas eyebrow |

Code : [`src/lib/creatomate/atomsAssembler.ts`](../../src/lib/creatomate/atomsAssembler.ts) · branché dans [`payloadBuilder.ts`](../../src/lib/creatomate/payloadBuilder.ts).

Overlap fade : `cinematicTheme.media.transitionFadeSec` (0.9 s). Bed : borné à `filmDuration` + `filmEndFadeOutSec` (C0).

## Test manuel

Export drain sandbox : avatar + 2 photos + 1 vidéo trim + bed MP3.
