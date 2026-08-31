# Notes — Copy wizard hub (étape 1 Traversée)

**Type :** TEMP · session copy · **Date :** 31 août 2026  
**Canon copy :** [`../COPY.md`](../COPY.md) · clés `dictionaries/fr.json` + `en.json`  
**Voix :** famille — souvenirs, film, chapitre, Coffre. Pas timeline / acte / banque / dropzone.

---

## Clés hub actuelles (écran)

| Clé | FR actuel | Surface |
|-----|-----------|---------|
| `parcoursHeroPrompt` | Une présence. Pose son nom. | Html 3D sur étoile |
| `parcoursHeroTapHint` | Toucher l’étoile pour commencer | sous le prompt |
| `parcoursHeroOpenLabel` | Ouvrir l’essentiel — prénom et identité de l’hommage | a11y hit target |
| `parcoursPanelCloseHint` | Fermer · le ciel vous attend | bouton X panneau |
| `step1ConstellationReward` | Sa constellation prend forme… | bouton Continuer (reward) |

**Fichiers UI :** `SanctuaryWizardStep1Sky` · `SanctuaryHubHero` · `TributeWizard` step 1 overlay.

---

## Ressenti produit (à trancher en session)

| Moment | Question copy |
|--------|----------------|
| **Hub idle** | « Une présence » — assez chaleureux ? Trop abstrait ? |
| **Tap hint** | « Toucher l’étoile » — OK mobile · desktop = « Cliquer » ? |
| **Panneau titre** | `stepEssentialTitle` / description — ton verre vs hub poétique |
| **Fermer** | « le ciel vous attend » — garder ? |
| **Post-reveal** | `step1ConstellationReward` — aligné rite constellation |

---

## Pistes (brouillon — pas canon)

### Hub invite (sur étoile)

- FR A : « Une présence. Pose son nom. » *(actuel)*
- FR B : « Ici, une étoile attend son nom. »
- FR C : « Donnez un visage à cet hommage. »

### Tap hint

- FR : « Effleurer l’étoile » / « Toucher l’étoile pour commencer »
- EN : « Touch the star to begin » *(garder parité)*

### Fermer panneau

- FR : « Revenir au ciel » / « Le ciel vous attend » *(actuel)*

---

## Contraintes techniques copy

- **Html 3D Hero** : texte court (~2 lignes max) — taille craft ~9.5px / hint ~6px
- **Pas de string en dur** dans `.tsx` — dictionaries only
- Après modif : `node scripts/export-copy-catalog.mjs`
- Même commit : FR + EN + catalog

---

## Checklist session copy (≈1 h)

1. Relire hub idle + panneau + fermeture **à voix haute** (famille, pas tech)
2. Trancher FR · miroir EN
3. Valider longueur sur étoile (capture écran)
4. Mettre à jour `fr.json` / `en.json`
5. Régénérer catalog
6. Si beat renommé côté produit → 1 ligne changelog Traversée

---

## Hors scope session copy

- Étapes 2–7 wizard
- Forfait / Cercle (chrome masqué étape 1)
- Prologue éclipse (skip)

---

## Liens

- Parcours UX : [`../product/PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](../product/PARCOURS_UX_CHEMIN_1_TRAVERSEE.md)
- Plan B capture : [`PLAN_B_HUB_CAPTURE_CANVAS.md`](PLAN_B_HUB_CAPTURE_CANVAS.md)
