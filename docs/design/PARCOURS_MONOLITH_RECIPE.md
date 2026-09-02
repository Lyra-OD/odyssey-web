# Parcours Traversée — Recette Monolithe (verre · halo · CTA)

**Type :** design · **Vérité pour :** peau UI étape 1 panneau essentials · base réutilisable wizard Chemin 1.  
**Dernière MAJ :** 1 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 2 sept 2026 — **T-open-5** : stagger titre→champs→CTA (80/160/240 ms) pendant émanation.
- 2 sept 2026 — **T-open-4** : souffle CSS bloom + filante étoile→verre pendant émanation.
- 2 sept 2026 — **T-open-3** : panneau @ `HUB_FREEZE_PANEL_AT_MS` = hold+fade (760) · ciel 2D figé avant expand.
- 2 sept 2026 — **T-open-2** : émanation `.parcours-monolith-expand` (scale+opacity · 440 ms) · plus de slide Y.
- 2 sept 2026 — **T-open-1** : pivot expand `--parcours-expand-origin` = ancre Hero au montage panneau.

**Liens :**
- Spec Traversée : [`../product/PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](../product/PARCOURS_UX_CHEMIN_1_TRAVERSEE.md) §2b
- Plan B capture gel : [`../TEMP/PLAN_B_HUB_CAPTURE_CANVAS.md`](../TEMP/PLAN_B_HUB_CAPTURE_CANVAS.md)
- Timeline freeze : [`../../src/lib/parcours/hubFreezeTimeline.ts`](../../src/lib/parcours/hubFreezeTimeline.ts)
- CSS source : [`../../app/globals.css`](../../app/globals.css) (`.parcours-monolith-*`)
- Bouton login : [`../../src/components/salon/SalonCyanGlowText.tsx`](../../src/components/salon/SalonCyanGlowText.tsx) · `connexionSubmitButtonClass`

---

## 1. Intention (une phrase)

**Stèle de verre indigo** flottant sur le ciel gelé — **halo `--salon-cyan` qui respire doucement** — **Continuer** en ADN login, plus vif — formulaire **sans WebGL** sous le verre (perf clavier).

---

## 2. Stack visuelle (3 couches)

| Couche | Classe / token | Rôle | Breath |
|--------|----------------|------|--------|
| **Atmosphère** | `.parcours-monolith-atmosphere` + `.parcours-monolith-aura-cyan` | Halo cyan **hors** verre (sur les étoiles) | 5,8 s · opacity 0,52→0,72 · scale 1→1,024 |
| **Verre** | `.parcours-monolith-glass` | Surface indigo semi-opaque · blur 4px · bordure cyan | `parcours-monolith-edge-glow` 5,8 s (box-shadow) |
| **CTA** | `connexionSubmitButtonClass` + `.parcours-monolith-continue` | Seuil action · `--salon-cyan` `#00e8f0` | 3,6 s · **toujours actif** (même `disabled`) |

**Règle couleur :** une seule teinte accent halo + bordure = **`rgba(0, 232, 240, …)`** (`--salon-cyan`). Pas de teal Hero ni UV violet dans l’aura externe (virait le halo vers le vert).

**Hiérarchie breath :** bouton > verre ≈ aura (bouton = phare · halo = enveloppe calme).

---

## 3. DOM cible (étape 1 aujourd’hui)

```
.parcours-monolith-shell          fixed inset-0 z-30 · centre optique
  .parcours-monolith-frame        expand · parcours-monolith-expand
    .parcours-monolith-atmosphere  aria-hidden · z-0
      .parcours-monolith-aura-cyan
    .parcours-monolith-scroll.parcours-monolith-glass   z-1 · max 90dvh scroll
      … formulaire …
      button.parcours-monolith-continue + connexionSubmitButtonClass
```

**Fichiers code :** `TributeWizard.tsx` (overlay étape 1) · `app/globals.css` (recette CSS).

---

## 4. Tokens CSS (référence rapide)

### Verre
- Fond : gradient 165deg indigo `rgba(30,27,75,0.88)` → `rgba(8,6,28,0.9)`
- `backdrop-filter: blur(4px)` max (perf)
- `::before` : radial cyan interne très léger (5 % centre) — **pas** le halo principal

### Halo externe
- `inset: -3.25rem -3rem` sur `.parcours-monolith-atmosphere`
- Aura : `140% × 106%` du frame · `blur(64px)`
- Gradient : uniquement `rgba(0, 232, 240, …)`

### CTA
- Import : `connexionSubmitButtonClass` depuis `SalonCyanGlowText`
- Override disabled : `.parcours-monolith-continue` — garde animation · opacity 0,58
- Copy : `copy.parcoursMonolithContinue` (FR « Continuer » / EN « Continue »)

### Entrée panneau (actuel — polish prévu)
- `.parcours-monolith-expand` : **440 ms** · scale 0.04→1 + opacity · `transform-origin` étoile · ease-out `(0.16, 1, 0.3, 1)`
- Déclenché @ `HUB_FREEZE_PANEL_AT_MS` (**760 ms** = hold 200 + fade 560) via `useParcoursUx` — ciel 2D figé avant émanation.

---

## 5. Perf moteur (obligatoire avec ce rendu)

| Beat | WebGL | `hubSkyLive` | Notes |
|------|-------|--------------|-------|
| `hub.idle` | monté | on | |
| `hubFreezeTo2D` | monté → fade | hold puis off | |
| `panel.essentials` | **unmount total** | off | pas C2 sous verre |
| `panelCloseToHub` | remount @ thaw | @ `thawReveal` (post-rituel 600 ms + D1) | Fix A+B · T2–T3 |

| React | Règle |
|-------|--------|
| `craftReveal` hub-lite | deps **sans** `firstName` / `revealT` |
| `useWizardStep1Reveal` | `muteFirstNameSnap: step1Sky` |
| Barre z-40 | masquée si `step1Sky && phase === "typing"` |

---

## 6. Généralisation wizard (Chemin 1 · décision 1 sept)

**Oui** — même ADN (verre violet · halo cyan · CTA cyan) sur étapes 2–7 Traversée.  
**Non** — copier l’overlay fixed fullscreen + rite freeze de l’étape 1.

| Étape | Layout monolithe | Halo |
|-------|------------------|------|
| 1 Essentials | overlay fixed · max-w-xl | fort (recette actuelle) |
| 2 Invite | in-flow · max-w-xl | fort |
| 3 Coffre | large · scroll | moyen |
| 4–5 Studio | max-w-3xl | **allégé** (DnD dense) |
| 6–7 Preview / checkout | max-w-xl–3xl | calme |

**Prochaine factorisation :** composant `WizardMonolithShell` (frame + atmosphere + glass + slot footer CTA) · ciel persistant T2 en fond.

**Hors scope :** mode éditeur co-org · retour draft avancé sans Traversée.

---

## 7. Travail ouvert (ordre recommandé)

### P0 — Plan B (gel pixel-perfect) ✅
→ [`PLAN_B_HUB_CAPTURE_CANVAS.md`](../TEMP/PLAN_B_HUB_CAPTURE_CANVAS.md) — **livré 1 sept 2026**

### P0b — Fermeture tranche 1 (D1 + pre-warm) ✅
→ Thaw @ `onHubCanvasReady` + panneau sorti · loop pre-warm · voile off close · **livré 1 sept 2026**

### P0c — Fermeture tranches 2–3 (inspire + collapse) ✅
→ **220 ms** inspire + flash étoile · **520 ms** collapse · thaw KEEP **pendant** collapse (@ 140 ms) · voile inspire · **livré 1 sept 2026**

**CSS :** `.parcours-backdrop-ritual-inspire` · `.parcours-monolith-collapse` · `.parcours-monolith-inspire` (halo)  
**Timeline :** `HUB_CLOSE_INSPIRE_MS` · `HUB_CLOSE_COLLAPSE_MS` · `HUB_CLOSE_HOLD_MS` · `HUB_CLOSE_RITUAL_MS`

### P0d — Fermeture magique (étapes chirurgicales · ordre fixe)

| Étape | Contenu | Statut |
|-------|---------|--------|
| **T-close-1** | Ancre étoile vivante (rAF) + centre optique Hero | ✅ |
| **T-close-2** | Voiles inspire suivent `--parcours-star-x/y` | ✅ |
| **T-close-2b** | Pivot figé @ collapse · vars figées · thaw @ hold · ancre conservée | ✅ |
| **T-close-3** | Halo tracteur fixed (viewport) · verre fade | ✅ |
| **T-close-4** | Timeline unifiée `u` 0→1 + thaw overlap fluide | ✅ |
| **T-open-mirror** | Ouverture miroir depuis l’étoile | ✅ T-open-1–3 |
| **T-open-1** | Pivot expand figé sur ancre Hero (`--parcours-expand-origin`) | ✅ |
| **T-open-2** | Émanation scale+opacity 440 ms (pas reverse close) | ✅ |
| **T-open-3** | Départ panneau @ hold+fade (ciel 2D figé) · expand seulement pendant `hubFreezeTo2D` | ✅ |
| **T-open-4** | Souffle CSS bloom + filante étoile→verre (pas canvas) | ✅ |
| **T-open-5** | Stagger titre → champs → CTA (80 / 160 / 240 ms) | ✅ |

**T-close-1 :** `hubStarVisualViewportPx` · offset hitbox Hero · rAF pendant `panelCloseToHub` · pas de setState 60 fps.

**T-close-2 :** `--parcours-star-x/y` sur `:root` (rAF) · gradients voile inspire + flash backdrop sur l’étoile (plus `50% 45%` fixe).

**T-close-2b :** inspire = rAF vars seulement · collapse = snapshot `transform-origin` + vars (pas rect shrink) · `hubStarLastKnownAnchorRef` · thaw @ `hold` seulement.

**T-close-3 :** `ParcoursCloseStreak` @ collapse · verre aspire · impact **78 %** · thaw **88 %** · `pulseHubCloseStarKiss`.

**T-close-4 :** une horloge rAF · `hubCloseRitualU` 0→1 · opacités backdrop/WebGL continues · beats impact/thaw @ `HUB_CLOSE_*_RITUAL_U` · `skyFadeMs=0` pendant rituel.

**T-close-5a :** horloge rAF **sans** `setState` 60 fps — `closeRitualU` en ref · opacités JPEG/WebGL via CSS vars (`--parcours-close-*-opacity`) · `skyFadeMs=180` pendant rituel · React ne re-render que aux frontières de phase.

**T-close-5a-b :** canvas hub **monté** en saisie (opacité 0 · loop off) + prefetch chunk @ step 1 — plus de remontage WebGL @ Esc/X.

**T-close-5b :** panneau démonté @ fin collapse (`hold`) — filante / ciel visibles pendant le beat final · plus de formulaire opaque par-dessus.

**T-close-5c :** thaw KEEP **@ hold** seulement (plus @ 88 % collapse) · backdrop pont @ 0.35 pendant le beat hold.

**T-close-5e :** revert 5d · `skyFadeMs=0` pendant rituel (vars rAF) · thaw 2× rAF @ hold · handoff sans flash.

**T-close-6a :** filante verrouillée sur `hubStarWorldRef` (StarScreenReporter) · départ verre au Z Hero · tête @ pic = centre 3D.

**T-close-6a′ :** kiss CSS + collapse pivot + tracteur → `hubStarProjectedViewport*` (ancre 3D) · plus `hubStarVisualViewport*` (+22 % invite) pour le rituel fermeture.

**T-close-6b :** filante arm @ `useFrame` · cible `hubStarWorldRef` live · départ haut verre (`--parcours-glass-launch-*`) · gel `IdleCameraDrift` · absorption @ impact (plus traverse).

**T-close-6c :** ~~calque WebGL z-42~~ · **supersédé T-close-7** (saccades GPU).

**T-close-7 (60 FPS close) :** sérialisation stricte @ Esc — `:root.parcours-close-gpu-strict` gèle `backdrop-filter` + box-shadow animés · collapse **transform + opacity only** · tracteur CSS `.parcours-close-tracteur` · `hubSkyLive=false` jusqu'au thaw · `pulseHubCloseAbsorb` + KEEP **@ hold seulement** (plus canvas z-42 ni filante WebGL).

### P1 — Entrée formulaire (magie panneau) — ✅ T-open-1–5

Émanation depuis l’étoile · souffle CSS · stagger contenu. Close inchangé (T-close-7).

### P2 — Factorisation shell wizard 2–7
Après B + entrée panneau validés en démo.

---

## 8. QA rapide (checklist)

- [ ] Clic étoile → pas de barre « Étape suivante » avant le verre
- [ ] Frappe prénom fluide (pas de saccades)
- [ ] Halo cyan visible **autour** du cadre (pas seulement au centre)
- [ ] Continuer pulse toujours · désactivé si champs incomplets
- [ ] Esc → thaw hub fluide (remount WebGL)
- [ ] `prefers-reduced-motion` : halo statique · pas d’animation breath

---

## 9. Commits de référence (main)

| Commit | Contenu |
|--------|---------|
| `070cce3` | Monolithe perf (unmount · silence React · verre 90dvh) |
| `fcfd6db` | z-40 typing · Continuer login · halo initial |
| `f65b3f4` | Aura externe cyan pur |
| `44a7fd0` | Balance halo / breath (état actuel DA) |
