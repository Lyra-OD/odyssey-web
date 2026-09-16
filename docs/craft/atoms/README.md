# Atomes Creatomate (ADN figé UI → assembleur)

**Type :** craft · **Vérité pour :** JSON sculptés dans l’éditeur Creatomate, clonés par le backend.  
**Dernière MAJ :** 16 sept 2026

## Inventaire

| Fichier | Statut | Slots dynamiques |
|---------|--------|------------------|
| [`intro.json`](intro.json) | Figé UI · **35 s** | `{{displayName}}` · `{{birthYear}} - {{deathYear}}` · `{{portraitUrl}}` |
| [`media-photo.json`](media-photo.json) | Figé UI | `{{mediaUrl}}` |
| [`media-video.json`](media-video.json) | Dérivé photo | `{{mediaUrl}}` · `{{trimStartSec}}` |
| [`outro.json`](outro.json) | Carte mémoire | `{{displayName}}` · `{{birthYear}}` · `{{deathYear}}` |

## Binding intro (ne pas inverser)

- **Text-CFQ** (Playfair 600) → prénom + nom `displayName`  
  Auto-size : max **11 vmin** / tracking **160 %** (noms courts = gros comme avant).  
  Noms longs (ex. Jean-Paul…) → Creatomate réduit tout seul dans le cadre 92 %.
- **Text-F5F** (tracking 500 %) → années seules `"YYYY - YYYY"`
- **Image-VZZ** → photo de profil (N&B magazine : grayscale + contrast composition + smart_crop + Ken Burns).  
  Source figée = URL démo `woman.jpg` pour l’éditeur Creatomate.  
  **Assembleur** remplace `source` par l’URL réelle du portrait.

Intro actuelle : portrait dès **0 s** (~15 s) → noir → nom+années (dates Composition-2BS à **y 44 %**, plus près du nom) → noir. Pas de bloc noir d’ouverture.

## Outro — pas de wordmark Odyssey

Carte mémoire ~6 s : eyebrow « À la mémoire de » + nom Playfair 500 + années (même style secondaire que l’intro).  
**Interdit** : logo / ODYSSEY en fin de film payant.

## Média photo vs vidéo

Même composition (noir + contrast 1.2 + overlay ambre).

| | Photo | Vidéo |
|--|-------|-------|
| Type | `image` | `video` |
| Motion | Ken Burns 101→107 % | **Pas** de scale Ken Burns |
| Durée atome | ~6.98 s | **10 s** |
| Trim | — | `trim_start` |
| Transition | fade 1 s | fade 1 s |

## Assembleur (suivant)

1. Intro (nom + années).  
2. Clips photo/vidéo (URL + trim).  
3. Outro carte mémoire.  
4. Bed musique global (stems).
