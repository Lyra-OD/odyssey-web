# Creatomate — Recette DA (craft)

**Type :** craft · **Vérité pour :** itérer un rendu Quiet Luxury convaincant.  
**Dernière MAJ :** 15 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 15 sept 2026 — smoke réel ✅ · Ken Burns photos · craft bed `CREATOMATE_CRAFT_BED_URL` · mix assoupli.

## Objectif

Un MP4 où l’on **ose** envoyer le lien à une tante : souffle d’intro, photos qui respirent, lit musical discret, outro Odyssey.

## Boucle locale

1. Tunnel + `CREATOMATE_*` / `EXPORT_DRAIN_SECRET` (voir [`../ROUTES_AND_AUTH.md`](../ROUTES_AND_AUTH.md)).
2. Entitlements payés sur le projet (SQL staging ou checkout test).
3. Médias **image/vidéo** dans le storyboard (pas de `.txt`).
4. Musique — **une** des options :
   - **Upload famille** MP3 (Étape musique + ToS) → bed `upload` (priorité One Bed Law) ;
   - **Stingray master** via `STINGRAY_MASTER_URL_TEMPLATE` (prod) ;
   - **Craft** : `CREATOMATE_CRAFT_BED_URL=https://…mp3` si aucun bed (staging only).
5. `POST /export` → `POST /drain` → ouvrir `output_url`.

## Levier DA (code)

| Param | Fichier | Effet |
|-------|---------|--------|
| Ken Burns | `cinematicTheme.media.kenBurns` | Zoom lent photos |
| Durée photo / fade | `media.photoDurationSec` · `transitionFadeSec` | Respiration |
| Volume / duck | `music.*` | Lit sous les clips |
| Intro / outro | `intro` · `outro` | Signature Odyssey |

Canon moteur Phase 2 : [`../ROADMAP_PHASE2.md`](../ROADMAP_PHASE2.md).

## Interdit craft

- Utiliser l’URL **preview** Stingray comme master export.
- Committer une clé Creatomate ou un secret webhook.
- Laisser `CREATOMATE_CRAFT_BED_URL` en prod sans décision ops.
