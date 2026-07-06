# STORYBOARD_REFACTOR

## Objectif
Remplacer le modèle legacy `3 actes + 3 pistes` par un modèle unifié orienté `chapitres/chansons`, afin de :

- supprimer le deadlock actuel entre `maxSongs` et une UI limitée à 3 actes ;
- faire du pacing une règle pilotée par la durée réelle des chansons ;
- unifier `montage` et `musicalAmbiance` sous une seule source de vérité ;
- préserver le tunnel checkout B2B2C v2 sans régression pendant la transition.

## Décisions validées
- La nouvelle source de vérité du Wizard devient un `storyboard`.
- Un `storyboard` contient une liste ordonnée de `chapters`.
- Un chapitre contient :
  - une liste ordonnée de `mediaIds`
  - une chanson associée optionnelle
  - sa durée réelle `durationSec`
- Les quotas package restent globaux :
  - `maxMediaItems`
  - `maxSongs`
- Le pacing devient une règle temporelle :
  - `targetSecondsPerMedia`
  - capacité recommandée d'un chapitre = `floor(durationSec / targetSecondsPerMedia)`
- Les warnings de pacing sont locaux au chapitre ; les quotas package sont globaux au projet.

## Hors périmètre
- Aucun changement du modèle Stripe / jetons dans cette refonte.
- Aucun changement Scanner, Family Tribute Fund ou LYRA.
- Aucun hard-block pacing au premier ticket UI tant que la migration complète n'est pas terminée.

## Phase 0
Déjà livrée.

- `feat(b2b2c): propagate freemium status to partner invitation UI`
- Propagation `isFreemium` : backend partenaire -> `PartnerContext` -> `InvitationComposer`

## Phase 1 - Fondations data

### Ticket S1 - Introduire le nouveau modèle `storyboard`
**But**
Créer le nouveau contrat de state sans casser la lecture des drafts existants.

**Fichiers cibles**
- `src/lib/wizard/wizardState.ts`
- `src/lib/wizard/stingrayCatalog.ts`

**Travail**
- Ajouter :
  - `WizardStoryboardState`
  - `WizardStoryboardChapter`
  - `WizardChapterSong`
- Conserver `montage` et `musicalAmbiance` en lecture legacy uniquement.
- Ajouter une migration à la volée :
  - `spark + acte1 -> chapter-1`
  - `epic + acte2 -> chapter-2`
  - `legacy + acte3 -> chapter-3`
- Prévoir `durationSec?: number | null` sur la chanson.

**Critère d'acceptation**
- Un draft legacy est rehydraté sans perte.
- Le nouveau state peut représenter 1 à `maxSongs` chapitres.

### Ticket S2 - Migrer l'autosave vers `storyboard`
**But**
Faire de `storyboard` la structure persistée de référence.

**Fichiers cibles**
- `app/api/projects/[id]/autosave/route.ts`
- `src/hooks/useWizardAutosave.ts`
- `src/lib/wizard/wizardState.ts`

**Travail**
- Ajouter un schéma Zod `storyboard`.
- Accepter encore le legacy en entrée pendant la transition.
- Persister `storyboard` côté write path.
- Garder la stratégie actuelle de merge top-level.

**Critère d'acceptation**
- Autosave OK sur draft neuf et draft legacy.
- Aucun rejet de payload valide en cours de migration.

## Phase 2 - Moteur quotas et pacing

### Ticket S3 - Rendre les quotas upload pilotés par package ✅ livré
**But**
Brancher enfin `maxMediaItems` sur l'étape Upload.

**Fichiers cibles**
- `src/components/tribute/TributeWizard.tsx`
- `src/components/media/MediaDropzoneAdapter.tsx`
- `src/lib/wizard/wizardDeliverables.ts`
- `src/lib/uploads/mediaUploadService.ts`
- `src/components/media/MediaQueueGrid.tsx`
- `dictionaries/fr.json` / `dictionaries/en.json`
- `docs/sql/odyssey_p7_media_quota_guard.sql` (nouveau)

**Travail réalisé**
- Remplacé le `maxFiles={150}` en dur par `packageMaxMediaItems(manifestPackageFromWizardBasePackage(basePackage))`, recalculé via `useMemo` à chaque changement de forfait.
- Compteur UI mis à jour (`{count} / {max} médias inclus dans votre forfait`) + bandeau d'avertissement dédié quand `remainingSlots === 0`.
- Message de rejet `too-many-files-cumulative` externalisé en copy localisée (FR/EN) plutôt que hardcodé en anglais dans `MediaDropzoneAdapter.tsx`.
- **Garde-fou serveur (le vrai enjeu du ticket)** : l'upload écrit directement du navigateur vers Supabase Storage + `media_assets` — il n'existe aucune route `POST /api/projects/[id]/media` à sécuriser côté Next.js. Le rempart infalsifiable est donc un **trigger Postgres `BEFORE INSERT`** (`enforce_media_asset_quota()` dans `odyssey_p7_media_quota_guard.sql`) qui verrouille le projet (`pg_advisory_xact_lock`), compte les médias existants et lève `media_quota_exceeded` au-delà du plafond du `basePackage`.
- `mediaUploadService.ts` détecte ce code d'erreur SQL stable (`MEDIA_QUOTA_EXCEEDED_ERROR`), n'insiste pas en retry (rejet déterministe, pas transitoire), et `MediaQueueGrid` l'affiche traduit plutôt que le message Postgres brut.

**Limite connue / dette assumée**
- Les plafonds sont dupliqués dans le trigger SQL (copie manuelle de `PACKAGE_MANIFEST.*.limits.maxMediaItems`) — pas de pont automatique TS → SQL. Même risque de dérive que celui déjà accepté côté prix (`assertManifestPricingAlignedWithLegacyConfig()`).
- Comportement volontairement non-destructif : une rétrogradation de forfait après dépassement ne supprime jamais de médias existants, seuls les nouveaux INSERT sont bloqués.

**Critère d'acceptation**
- ✅ Les packages 50 / 125 / 175 / 250 respectent leurs plafonds réels côté UI et côté DB.

### Ticket S4 - Introduire le pacing temporel
**But**
Remplacer progressivement `maxMediaItemsPerSong` par `targetSecondsPerMedia`.

**Fichiers cibles**
- `src/lib/wizard/wizardDeliverables.ts`
- futur helper dédié pacing

**Travail**
- Ajouter `targetSecondsPerMedia` au manifeste.
- Calculer :
  - capacité recommandée du chapitre
  - surcharge du chapitre
  - besoin global minimal de chansons si nécessaire
- Prévoir fallback legacy si `durationSec` est inconnue.

**Critère d'acceptation**
- Le moteur de pacing fonctionne avec la durée réelle d'une chanson.
- Les calculs restent déterministes sans dépendre de l'UI.

## Phase 3 - Refonte UI Storyboard

### Ticket S5 - Refondre l'étape Montage en `StoryboardStep`
**But**
Remplacer les 3 colonnes fixes par des chapitres dynamiques.

**Fichiers cibles**
- `src/components/tribute/MontageStep.tsx`
- `src/components/tribute/montage/*`
- `src/components/tribute/TributeWizard.tsx`

**Travail**
- Générer 1..N colonnes selon le nombre de chapitres actifs.
- Conserver :
  - `unassignedIds`
  - `excludedIds`
  - `focalPoints`
- Permettre :
  - ajout de chapitre
  - suppression de chapitre vide
  - réordonnancement de chapitre
  - déplacement média -> chapitre

**Critère d'acceptation**
- Plus aucune hypothèse codée en dur sur `spark/epic/legacy`.

### Ticket S6 - Refondre l'étape Musique en chapitres dynamiques
**But**
Abandonner complètement `acte1/acte2/acte3`.

**Fichiers cibles**
- `src/components/tribute/SoundSignatureStep.tsx`
- `src/lib/wizard/stingrayCatalog.ts`
- `src/components/tribute/TributeWizard.tsx`

**Travail**
- Une carte musique par chapitre.
- Choix Stingray ou source future MP3 personnel selon package.
- Sauvegarder `durationSec` avec la chanson sélectionnée.
- Afficher, pour chaque chapitre :
  - médias assignés
  - capacité recommandée
  - warning de surcharge

**Critère d'acceptation**
- Un package à 4/5/7 chansons n'est plus bloqué par l'UI.

### Ticket S7 - Validation Wizard orientée storyboard
**But**
Remplacer les validations centrées sur `countIncludedMedia` et `hasAnyActTrack`.

**Fichiers cibles**
- `src/components/tribute/TributeWizard.tsx`
- `src/lib/wizard/wizardState.ts`
- helpers validation storyboard

**Travail**
- Validation minimale :
  - au moins 1 média inclus
  - nombre total de médias <= quota package
  - nombre de chapitres avec chanson <= `maxSongs`
- Validation éditoriale :
  - warnings pacing par chapitre
- Pas de blocage dur sur pacing au premier passage ; warning visible d'abord.

**Critère d'acceptation**
- La navigation Wizard ne dépend plus du legacy `hasAnyActTrack`.

## Phase 4 - Preview, checkout et nettoyage

### Ticket S8 - Refaire le teaser et la preview sur le storyboard
**But**
Aligner la preview sur les chapitres dynamiques.

**Fichiers cibles**
- `src/lib/wizard/teaserHelpers.ts`
- `src/components/tribute/PreviewStep.tsx`
- `src/components/tribute/CinematicTeaser.tsx`

**Travail**
- Regrouper les slides par chapitre, plus par acte.
- Utiliser les chansons du storyboard.
- Revoir l'estimation de durée pour qu'elle tienne compte du pacing réel.

**Critère d'acceptation**
- La preview fonctionne avec N chapitres.

### Ticket S9 - Adapter le checkout et les métadonnées
**But**
Transporter le nouveau modèle jusqu'au tunnel final sans casser le backend existant.

**Fichiers cibles**
- `app/api/checkout/route.ts`
- `src/lib/wizard/wizardState.ts`

**Travail**
- Remplacer l'usage direct de `act_tracks` par un payload `storyboard`.
- Pendant la transition, conserver éventuellement :
  - `storyboard` comme source principale
  - `act_tracks` comme champ compat temporaire si nécessaire

**Critère d'acceptation**
- Checkout B2C, legacy partner et freemium restent fonctionnels.

### Ticket S10 - Nettoyage final legacy
**But**
Retirer le code mort une fois la migration stabilisée.

**Fichiers cibles**
- `src/lib/wizard/wizardState.ts`
- `src/lib/wizard/stingrayCatalog.ts`
- `src/lib/wizard/teaserHelpers.ts`
- `app/api/projects/[id]/autosave/route.ts`
- composants Wizard encore liés aux actes

**Travail**
- Supprimer :
  - `WizardActTrackKey`
  - `WizardActTracks`
  - `spark/epic/legacy` comme modèle métier central
  - compat autosave devenue inutile

**Critère d'acceptation**
- Le repo ne dépend plus architecturalement du concept `3 actes`.

## Ordre d'exécution obligatoire
1. `S1` Nouveau state `storyboard` ✅
2. `S2` Autosave compatible ✅
3. `S3` Quotas upload package-aware ✅
4. `S4` Moteur pacing temporel
5. `S5` UI storyboard dynamique
6. `S6` UI musique dynamique
7. `S7` Validation wizard storyboard
8. `S8` Preview / teaser
9. `S9` Checkout / metadata
10. `S10` Nettoyage legacy

## Garde-fous de mise en oeuvre
- Toujours garder une lecture legacy tant que `S9` n'est pas stabilisé.
- Ne jamais recoder la logique commerciale partner / freemium dans la refonte storyboard.
- Valider `tsc --noEmit` à chaque ticket.
- Tester au minimum :
  - package `essential` freemium
  - package `signature` legacy partner
  - package `heritage` B2C
  - package `legendary` B2C
