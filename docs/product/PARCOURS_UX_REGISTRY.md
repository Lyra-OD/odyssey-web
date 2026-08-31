# Parcours UX — Registre des beats

**Type :** canon · **Vérité pour :** IDs beats Traversée · lien craft lab · durée · placeholder · statut implémentation.  
**Dernière MAJ :** 31 août 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 31 août 2026 — +7 beats pédagogiques · lien [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md).
- 31 août 2026 — Registre initial Chemin 1 · 10 beats · stubs explicites.

**Liens :**
- Spec Traversée : [`PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](PARCOURS_UX_CHEMIN_1_TRAVERSEE.md)
- Audit trous : [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md)
- Craft constellation : [`../ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md)

---

## Convention

| Colonne | Signification |
|---------|---------------|
| **ID** | `chapter.action` — stable pour code, analytics, craft |
| **Surface** | `backdrop-2d` · `webgl-ritual` · `panel-glass` · `hub` · `drawer` |
| **Craft** | Lab ou doc craft source |
| **Durée cible** | Ordre de grandeur produit (pas lab obligatoire) |
| **Stub** | Comportement acceptable si animation non prête |
| **Statut** | `ready` · `stub` · `todo` · `blocked-craft` |

**Règle :** importer un beat en prod = appeler l'ID + durée + stub — jamais monter le lab entier derrière un input.

---

## Chemin 1 — Beats

| ID | Surface | Craft / source | Durée cible | Stub | Statut | Wizard |
|----|---------|----------------|-------------|------|--------|--------|
| `prologue.arrival` | webgl-ritual → backdrop-2d | [`ODYSSEY_ECLIPSE_CRAFT.md`](../ODYSSEY_ECLIPSE_CRAFT.md) · wormhole | 20–30 s | Skip → `hub.idle` · fade noir → PNG ciel | blocked-craft | — |
| `hub.heroPulse` | backdrop-2d | Hero 2D sprite · CSS | loop | `animation: pulse` 2s ease | stub | — |
| `anchor.form` | panel-glass + backdrop-2d | Aucun WebGL | — | PNG ciel full bleed | todo | step 1 |
| `anchor.reveal` | webgl-ritual | [`ODYSSEY_LUEUR_CRAFT.md`](../ODYSSEY_LUEUR_CRAFT.md) · `DEFAULT_CONSTELLATION_REVEAL_MS` | 8–14 s + dwell 3–4 s | Crossfade 400 ms avant mount | ready-craft | step 1 Continuer |
| `hub.postReveal` | hub + backdrop-2d ou webgl idle | Carte Inviter / Continuer + chaînons | 2–4 s dwell | UI statique · pas filaments animés | todo | J3 |
| **`hub.skyVsVault`** | hub | Copy pédagogique | 5–8 s lecture | Carte texte | todo | J3 |
| **`hub.noRush`** | hub · panel footer | Copy permission | — | Ligne sous CTAs | todo | J3 |
| `circle.invite` | panel-glass + hub | Invite step · filaments (backlog) | — | Copy + ghosts · compteur invites | stub | step 2 |
| **`circle.guestJourney`** | hub · toast/card | Post-invite | 5–8 s | Carte après step 2 | todo | step 2 |
| `vault.filmBridge` | drawer | Coffre chrome | 10–20 s | Slide panel + 2 CTAs | todo | avant step 3 |
| `panel.media` | panel-glass | MediaDropzoneAdapter · Plus tard | — | Existant wizard | ready | step 3 |
| **`media.firstDeposit`** | webgl-ritual (court) | Slot wake · D3 | 2–4 s | Skip si Plus tard | stub | step 3 |
| **`studio.filmBridge`** | editorial | Bandeau step 4 | — | Une ligne | todo | step 4 |
| `studio.montage` | editorial | [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](../STORYBOARD_STEP5_LIVRE_OUVERT.md) | — | Pas de Canvas | ready | steps 5–6 |
| `checkout.farewell` | panel / checkout | Copy poétique | 3–5 s | Ligne sous total | todo | step 7 |
| **`panel.closeHint`** | panel chrome | tooltip / aria | — | Micro-copy | todo | tous panels |
| **`channel.souvenirGift`** | checkout / dossier | Canal B2B2C | — | Chemin 1b | todo | Salon |

---

## Transitions nommées (shareables)

| ID transition | De → Vers | Priorité shareable | Stub |
|---------------|-----------|-------------------|------|
| `transition.prologueToHub` | éclipse → image ciel | #2 (quand prologue prêt) | Fade |
| `transition.backdropToWebGL` | PNG → Canvas même cadrage | **#1** | Crossfade |
| `transition.panelOpen` | hub → panneau verre | UX core | CSS slide 300–500 ms |
| `transition.panelClose` | panneau → hub | UX core | CSS slide |
| `transition.checkoutFarewell` | checkout → message ciel | #3 | Copy seule |

---

## Mapping code (cible — pas encore implémenté)

| Concept prod | Fichier / zone cible |
|--------------|---------------------|
| Machine états parcours | `src/hooks/useParcoursUx.ts` (à créer) |
| Backdrop 2D | `src/components/contribute/SkyBackdrop.tsx` (à créer) |
| Panneau verre | `TributeWizard.tsx` + chrome Sanctuaire |
| Rituel reveal | `useWizardStep1Reveal.ts` · `SanctuaryWizardStep1Sky.tsx` |
| Hub J3 | `SanctuaryHubPostReveal.tsx` (à créer) |
| Beat Coffre → film | `VaultFilmBridgeBeat.tsx` (à créer) |
| Flag prologue | `wizard_state.parcours` ou colonne projet |

---

## Chemins futurs (hors Chemin 1)

| Chemin | Description | Statut |
|--------|-------------|--------|
| **Chemin 1** | Traversée organisateur première visite | **actif** — spec [`PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](PARCOURS_UX_CHEMIN_1_TRAVERSEE.md) |
| Chemin 2+ | Retour hub · co-org · invité seul · Salon B2B2C | ⏳ non spec |

Ne pas implémenter de moteur de quêtes avant validation Chemin 1 en prod.
