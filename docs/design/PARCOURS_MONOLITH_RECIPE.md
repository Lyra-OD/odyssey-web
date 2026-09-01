# Parcours Traversée — Recette Monolithe (verre · halo · CTA)

**Type :** design · **Vérité pour :** peau UI étape 1 panneau essentials · base réutilisable wizard Chemin 1.  
**Dernière MAJ :** 1 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 1 sept 2026 — Recette initiale post-T1b monolithe (perf · DA · rollout wizard).

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
  .parcours-monolith-frame        slide-in · parcours-panel-in
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
- `.parcours-panel-in` : 520 ms · `translateY(1rem)` → 0 · `cubic-bezier(0.22, 1, 0.36, 1)`
- Déclenché @ `HUB_FREEZE_PANEL_AT_MS` (340 ms) via `useParcoursUx`

---

## 5. Perf moteur (obligatoire avec ce rendu)

| Beat | WebGL | `hubSkyLive` | Notes |
|------|-------|--------------|-------|
| `hub.idle` | monté | on | |
| `hubFreezeTo2D` | monté → fade | hold puis off | |
| `panel.essentials` | **unmount total** | off | pas C2 sous verre |
| `panelCloseToHub` | remount @ thaw | @ `thawReveal` (+120 ms) | Fix A+B |

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

### P1 — Entrée formulaire (magie panneau) — **next**
Beat actuel trop « slide générique » vs souffle freeze.

**Pistes (sans changer le métier) :**
1. Entrée **scale 0.96 → 1** + **blur 6px → 0** synchronisée fin fade ciel
2. **Stagger** contenu : titre (+80 ms) → champs (+160 ms) → Continuer (+240 ms)
3. Courbe entrée alignée `HUB_THAW_APPEAR_EASE_CSS` (famille organique)
4. Option : retarder `parcours-panel-in` de ~80 ms après @340 ms si le ciel n’a pas fini de « se figer »

**Fichiers :** `globals.css` (`parcours-panel-in` ou variante `parcours-monolith-in`) · évent. `hubFreezeTimeline.ts` si beat décalé.

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
