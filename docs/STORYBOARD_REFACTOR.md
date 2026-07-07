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

### Décision — inversion de l'ordre des étapes (Étape 4 ↔ Étape 5)

Livrée avec `S4`/`S6`. Le Wizard affichait historiquement le Montage (assignation média) avant le Choix Musique — un ordre intenable dès lors que la capacité recommandée d'un chapitre dépend de `durationSec` (connue seulement après le choix de la chanson). Décision validée :

- **Étape 4 — « Vos chapitres musicaux »** (`StoryboardChaptersStep.tsx`) : choix des chansons, un chapitre par chanson, capacité/pacing visibles immédiatement.
- **Étape 5 — Montage** (à venir, `S5`) : assignation des médias dans les bacs déjà dimensionnés par l'Étape 4.

Le nombre de chapitres est désormais pré-généré à l'ouverture de l'Étape 4 selon `minSongsRequired` (dérivé du nombre de médias déjà uploadés / `maxMediaItemsPerSong`), extensible jusqu'à `maxSongs` du forfait — le client voit l'ossature complète de son montage dès l'arrivée sur l'étape.

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

### Ticket S4 - Introduire le pacing temporel ✅ livré
**But**
Remplacer progressivement `maxMediaItemsPerSong` par `targetSecondsPerMedia`.

**Fichiers cibles**
- `src/lib/wizard/wizardDeliverables.ts`
- `src/lib/wizard/storyboardPacing.ts` (nouveau)
- `src/lib/wizard/storyboardHelpers.ts` (nouveau)

**Travail réalisé**
- `targetSecondsPerMedia = 7s` pour tous les forfaits dans `PACKAGE_MANIFEST` ; `maxSongs` relevé pour donner de l'air au rythme strict (Héritage 5, Éternité 7, Légendaire 10).
- Marges chapitre fixes non disponibles pour les médias : `CHAPTER_INTRO_MARGIN_SEC` (5s) + `CHAPTER_OUTRO_MARGIN_SEC` (5s) = `CHAPTER_MARGIN_SEC` (10s) — `available_time_for_media = durationSec - 10s`.
- Coût vidéo fixe : `VIDEO_TRIM_DURATION_SEC` (10s) — toute vidéo est comptée sur sa durée de rognage cible, jamais sur sa durée source. Le rognage réel (`trim_start`) est stocké par média dans `WizardStoryboardState.videoTrims` (même forme que `focalPoints`).
- `mood?: WizardStoryboardChapterMood` ajouté au chapitre (`'Contemplatif' | 'Rythmé' | …`) — prévu pour moduler `targetSecondsPerMedia` dynamiquement (non branché en Phase 1, le rythme reste fixe à 7s).
- `estimateStoryboardTotalDurationSec()` — estime la durée totale du montage (chanson réelle si connue, sinon moyenne 3,5 min) pour le résumé narratif de l'en-tête.
- Note dans le moteur de pacing : le pipeline de rendu final (Creatomate) devra appliquer une LUT « Odyssey » unifiée à tous les médias, indépendamment du pacing.
- Schéma Zod autosave étendu (`app/api/projects/[id]/autosave/route.ts`) pour `mood` et `videoTrims`.

**Critère d'acceptation**
- ✅ Le moteur de pacing fonctionne avec la durée réelle d'une chanson.
- ✅ Les calculs restent déterministes sans dépendre de l'UI (`storyboardPacing.ts` est pur, testable indépendamment).

## Phase 3 - Refonte UI Storyboard

### Ticket S5 - Refondre l'étape Montage en `StoryboardMontageStep` (Étape 5) 🟡 placeholder livré — dnd-kit à venir
**But**
Remplacer les 3 colonnes fixes par des chapitres dynamiques — devient **l'Étape 5** suite à l'inversion de l'ordre des étapes (voir décision ci-dessus).

**État actuel (post-Clean Slate)**
- `StoryboardMontageStep.tsx` affiche un **placeholder honnête** : message UX indiquant que les médias seront répartis automatiquement en attendant la table de montage interactive.
- `SoundSignatureStep.tsx` **supprimé** — l'ancien écran inerte (saisies silencieusement ignorées par `coerceWizardState()`) ne peut plus tromper l'utilisateur.
- Fondations prêtes pour `dnd-kit` : `useWizardStoryboard`, `montage/MontageMediaCard`, `MontageDirectorModal`, `MontageFocalReticle` retypés chapitres ; logique 3-actes purgée (`MontageStep`, colonnes acte, barre de sélection supprimés).

**Fichiers cibles (reste à faire)**
- `src/components/tribute/StoryboardMontageStep.tsx` (remplacer le placeholder)
- `src/components/tribute/storyboard/*` (colonnes chapitre, bac non assignés)
- `src/components/tribute/TributeWizard.tsx`

**Travail restant**
- Générer 1..N colonnes selon les chapitres déjà créés à l'Étape 4 (chansons + capacité déjà connues).
- Conserver :
  - `unassignedIds`
  - `excludedIds`
  - `focalPoints`
  - `videoTrims` (rognage vidéo 10s, icône ciseaux sur `MontageMediaCard`)
- Permettre :
  - réordonnancement de chapitre
  - déplacement média -> chapitre (`dnd-kit`)

**Critère d'acceptation**
- Plus aucune hypothèse codée en dur sur `spark/epic/legacy`.
- Drag & drop fonctionnel desktop + proposition UX mobile validée.

### Ticket S6 - Refondre l'étape Musique en chapitres dynamiques (devient l'Étape 4) ✅ livré
**But**
Abandonner complètement `acte1/acte2/acte3`.

**Fichiers cibles**
- `src/components/tribute/StoryboardChaptersStep.tsx` (remplace `SoundSignatureStep.tsx` comme étape active)
- `src/components/tribute/storyboard/ChapterMusicPanel.tsx`, `StoryboardCapacityBadge.tsx`, `StoryboardChapterStats.tsx` (nouveaux)
- `src/lib/wizard/stingrayCatalog.ts`
- `src/components/tribute/TributeWizard.tsx`

**Travail réalisé**
- Une carte musique par chapitre (`ChapterMusicPanel`), nombre de chapitres pré-généré selon `minSongsRequired`, extensible jusqu'à `maxSongs` (bouton « + Ajouter un chapitre » désactivé au plafond).
- Choix Stingray ; source MP3 personnel toujours hors périmètre (inchangé).
- `durationSec` sauvegardée avec la chanson sélectionnée (`WizardChapterSong`).
- Bandeau éducatif (recommandation piste ≥ 3-4 min) + retour visuel ambre si un chapitre est surchargé (non bloquant).
- Détection des doublons de chanson entre chapitres : avertissement + case d'acquittement obligatoire (état local au composant, jamais persisté dans `wizardState`) avant de pouvoir avancer.
- Validation structurelle bloquante à la sortie de l'étape (`validateStoryboardPackageStructure()`) : nombre de chapitres avec chanson doit respecter `[minSongsRequired, maxSongs]`.
- `StoryboardChapterStats` affiche, pour l'étape : médias inclus / max, chansons recommandées / max (le forfait complet et son upsell ont été remontés dans l'en-tête global — voir S6bis).

**Critère d'acceptation**
- ✅ Un package à 5/7/10 chansons n'est plus bloqué par l'UI.

### Ticket S6bis - Refonte de l'en-tête global du Wizard (« Le Dossier ») ✅ livré
**But**
Sortir le sélecteur de forfait et le stepper linéaire de l'Étape 4 pour les rendre globaux, accessibles depuis n'importe quelle étape, dans une esthétique « Quiet Luxury » (pas de `<select>`/dropdown e-commerce).

**Fichiers cibles**
- `src/components/tribute/PackageDossierPanel.tsx` (nouveau — remplace `StoryboardPackageSwitcher.tsx`, supprimé)
- `src/components/tribute/WizardPhaseProgress.tsx` (nouveau — remplace `WizardStepper.tsx`, supprimé)
- `src/lib/wizard/packageDossier.ts` (nouveau)
- `src/lib/wizard/pricingConfig.ts` (`DEFAULT_B2C_BASE_PACKAGE`)
- `src/components/tribute/TributeWizard.tsx`

**Travail réalisé**
- **Le Dossier** : panneau off-canvas (glissé depuis la droite, `backdrop-blur`, easing `EASE_OUT_LUXE`), déclenché par une typographie éditoriale dans l'en-tête (« VOTRE FORFAIT / Éternité ↗ »), visible dès l'Étape 1 (avant même que l'identité du défunt soit connue).
- Liste exhaustive des inclusions générée depuis `PACKAGE_MANIFEST` (jamais de texte marketing figé) : médias, chansons, résolution d'export, priorité de rendu, diffusion salon, clip social, coffre numérique, retouche IA, compagnon scanner, numérisation Gants Blancs.
- Comparaison d'un autre forfait par cross-fade in-place (pastilles horizontales), avec garde-fou de downgrade inline (message ambre + CTA de confirmation) si le changement ferait perdre des chansons déjà assignées (`countSongsLostIfCappedTo`).
- Badge d'économie « Économisez 67 $ » affiché sur le forfait Éternité (prix, pastille de comparaison, vue détaillée) via `calculateBundleSavings()` — déjà existant côté pricing, désormais exposé dans le Dossier.
- `WizardBasePackagePicker` supprimé des Étapes 1 et 2 (fichier supprimé du repo) — le Dossier est l'unique point de sélection/consultation du forfait.
- **Stepper** : `WizardPhaseProgress` remplace les 8 cercles par 3 macro-phases (« Déposer » 1-3, « Composer » 4-6, « Recevoir » 7-8), liseré de progression 1px + libellé d'étape discret.
- **Ancrage produit** : `DEFAULT_B2C_BASE_PACKAGE = "heritage"` (Éternité, 299 $) — milieu de gamme réel des 3 forfaits B2C directs et meilleur rapport qualité-prix ; nouveau projet B2C y est ancré par défaut, nommé et documenté (plus un fallback implicite).
- Lexique : toutes les occurrences de « photos » dans les badges de capacité remplacées par « médias ».

**Critère d'acceptation**
- ✅ Le forfait est consultable/modifiable depuis n'importe quelle étape sans dropdown natif.
- ✅ Aucune perte silencieuse de chanson lors d'un downgrade.

### Ticket Clean Slate — Neutralisation Étape 5 + extraction domaine storyboard ✅ livré (juillet 2026)
**But**
Préparer le terrain pour `S5` (dnd-kit) en éliminant les bugs silencieux et le code mort 3-actes, sans casser Preview/Checkout.

**Pourquoi**
- `SoundSignatureStep` affichait une UI fonctionnelle mais dont les saisies étaient **silencieusement ignorées** côté serveur — expérience utilisateur trompeuse, pas une simple dette technique.
- `TributeWizard.tsx` (~1866 lignes) était un god component ; intégrer `dnd-kit` sans extraction aurait aggravé la dette.
- `montage/*` mélangeait logique 3-actes et composants UI réutilisables — triage nécessaire avant retypage chapitres.

**Fichiers touchés**
- `src/hooks/useWizardStoryboard.ts` (nouveau) — resync chapitres, doublons, validation, estimation durée ; **pur** (pas d'autosave, reste dans `TributeWizard` via `persistStoryboardRef`)
- `src/components/tribute/StoryboardMontageStep.tsx` (nouveau) — placeholder honnête Étape 5
- `src/components/tribute/storyboard/ChapterMusicPanel.tsx` (extrait de `StoryboardChaptersStep`)
- `src/lib/wizard/chapterTheme.ts` (nouveau) — palette dynamique par chapitre
- `src/components/tribute/montage/MontageDirectorModal.tsx`, `MontageMediaCard.tsx`, `MontageFocalReticle.tsx` — retypés chapitres
- **Supprimés** : `SoundSignatureStep.tsx`, `MontageStep.tsx`, `MontageActColumn.tsx`, `MontageUnassignedColumn.tsx`, `MontageSelectionBar.tsx`, `MontageInsertionIndicator.tsx`
- **Conservé en lecture seule** : `actTracks` dans `TributeWizard.tsx` pour Preview/Checkout (`S8`/`S9`)

**Environnement dev**
- Bug **EMFILE** (`Watchpack Error: too many open files`) identifié comme cause des 404 en dev.
- Fix : tuer process zombie sur `:3000`, relancer avec `ulimit -n 65536` dans le terminal actif.

**Critère d'acceptation**
- ✅ Plus d'écran inerte à l'Étape 5 (placeholder explicite).
- ✅ `useWizardStoryboard` extrait, `TributeWizard` allégé (~1780 lignes).
- ✅ `tsc --noEmit` et `next build` OK.

### Ticket S7 - Validation Wizard orientée storyboard 🟡 partiel
**But**
Remplacer les validations centrées sur `countIncludedMedia` et `hasAnyActTrack`.

**Fichiers cibles**
- `src/components/tribute/TributeWizard.tsx`
- `src/lib/wizard/wizardState.ts`
- `src/lib/wizard/storyboardHelpers.ts`

**Déjà livré (avec S6)**
- Validation structurelle chansons : nombre de chapitres avec chanson doit respecter `[minSongsRequired, maxSongs]` (`validateStoryboardPackageStructure()`), bloquant à la sortie de l'Étape 4.
- Quota médias global : déjà appliqué à l'Étape 3 (`S3`, garde-fou UI + trigger Postgres).
- Acquittement obligatoire des doublons de chanson avant `goNext` (état local, non persisté).

**Restant à faire (avec S5)**
- Validation éditoriale par chapitre (warnings pacing média/chapitre) : le moteur existe (`storyboardPacing.ts`) mais l'UI de saisie média (Étape 5) n'existe pas encore pour l'exposer.
- Pas de blocage dur sur pacing au premier passage ; warning visible d'abord — règle toujours valide, à appliquer dans `StoryboardMontageStep`.

**Critère d'acceptation**
- ✅ La navigation Wizard ne dépend plus du legacy `hasAnyActTrack` à l'Étape 4.
- ⏳ Idem à l'Étape 5, une fois `S5` livré.

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
4. `S4` Moteur pacing temporel ✅
5. `S6` UI musique dynamique (devient Étape 4) ✅
6. `S6bis` Refonte en-tête global / Dossier de forfait ✅
7. `Clean Slate` Neutralisation Étape 5 + hook storyboard + triage montage/* ✅
8. `S5` UI storyboard dynamique (Montage, devient Étape 5) 🟡 **prochain — placeholder livré, dnd-kit à implémenter**
9. `S7` Validation wizard storyboard 🟡 partiel (chansons ✅, médias ⏳ avec S5)
10. `S8` Preview / teaser
11. `S9` Checkout / metadata
12. `S10` Nettoyage legacy

**Note d'ordonnancement :** `S6` a été livré avant `S5` du fait de l'inversion de l'ordre des étapes (la capacité média d'un chapitre dépend de la chanson choisie, donc le choix musical doit précéder l'assignation média dans le Wizard).

## Garde-fous de mise en oeuvre
- Toujours garder une lecture legacy tant que `S9` n'est pas stabilisé.
- Ne jamais recoder la logique commerciale partner / freemium dans la refonte storyboard.
- Valider `tsc --noEmit` à chaque ticket.
- Tester au minimum :
  - package `essential` freemium
  - package `signature` legacy partner
  - package `heritage` B2C
  - package `legendary` B2C
