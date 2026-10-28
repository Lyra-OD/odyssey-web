# Carte modules Odyssey (oct 2026)

**Type :** temp · **Vérité pour :** ce qu’on pourrait réutiliser en interne ou vendre, pas un npm public.  
**Dernière MAJ :** 28 oct 2026 · **Carte :** [`../README.md`](../README.md)

**Public :** non. Pas d’open-source, pas de registry externe pour l’instant.  
**Cibles :** verticales Odyssey (animaux, mariage, autres rites) · éventuelle licence / OEM à un partenaire.  
**Hors backlog immédiat :** Livre Phase 3a reste prioritaire. Cette carte n’ouvre pas de chantier npm.

---

## Intention

Deux usages légitimes :

1. **Autre app Odyssey** — même DNA, autre vocabulaire (animal, couple, etc.). Le host change ; les modules restent.
2. **Vendre / OEM** — un funérarium, un réseau, ou une marque blanche paie pour le Coffre, le pipeline média ou le player, sans reprendre tout le Studio.

Ce n’est **pas** « mettre sur npm pour le web ». C’est **isoler le contrat** pour pouvoir brancher un second host sans tout recopier.

---

## Carte (maturité)

| Module | Rôle | Animaux / mariage | Vendre OEM | Maturité |
|--------|------|-------------------|------------|----------|
| **Coffre** (`surfaces/coffre`) | Banque de souvenirs + tiroir + ingest | Oui : mêmes médias, copy injectée | Oui : « coffre photo/vidéo famille » | Surface host ✅ |
| **Pipeline média** (`lib/media` + upload chain) | Trim, encode, resize, poster, SHA-256, annulation | Oui : même téléphone, mêmes limites | Oui : le plus vendable techniquement | Lib forte ✅ |
| **Livre** (à extraire `surfaces/livre`) | Montage chapitres + DnD | Oui : actes / chapitres adaptés | Oui : « éditeur de film souvenir » | Après Phase 3a |
| **Player Quiet Luxury** | Lecture digne, One Bed, breath | Oui : le film final | Oui : player white-label | Fort, encore Odyssey-couplé |
| **Ciel / Sanctuaire** | Constellation, cercle, dépôts invités | Partiel : émotion différente par verticale | Possible plus tard | Marque ; cher |
| **Checkout Soft Cap / RevShare** | Commerce B2B2C | Oui si même modèle salon | Possible | Métier Odyssey ; pas un widget |
| **Scanner compagnon** | QR → photos papier | Oui | Oui | Moyen |

---

## Ce qu’on isole vraiment (contrat host)

Comme le Coffre aujourd’hui, et le Livre demain :

- le **host** injecte : `projectId`, locale, **blob copy** FR/EN, quotas, callbacks ;
- le **module** ne lit pas le dictionnaire global ni le wizard entier ;
- un second host (app Animaux, microsite Mariage, OEM) branche la même surface.

Vendre = vendre ce **contrat + build**, pas un repo public.

---

## Ce qu’on ne découpe pas tout de suite

- `TributeWizard` monolithique (orchestrateur) ;
- HQ / Salon / pitch ;
- Craft labs (éclipse, wormhole) ;
- npm public ou monorepo externe avant d’avoir Livre extrait.

---

## Ordre si un jour on industrialise

1. Finir **Livre Phase 3a** (même pattern host que Coffre).
2. Documenter le contrat host Coffre + Livre (une page product, pas TEMP).
3. Option **interne** : dossier `packages/` ou `surfaces/*` stables pour verticale Animaux.
4. Option **vente** : licence OEM du pipeline média + Coffre (le plus clair à tarifer).
5. Player / Sanctuaire seulement si le partenaire veut l’expérience émotionnelle, pas juste l’upload.

---

## Lien craft

Les principes « son avant image · un geste = une matière · éditorial » : [`MOOD_CRAFT_SITES_2026-10.md`](MOOD_CRAFT_SITES_2026-10.md). Ils s’appliquent à chaque verticale, pas seulement au Studio humains.
