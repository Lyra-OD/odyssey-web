# F2 — Rythme du reveal ciel post-formulaire (cible WOW ~20 s)

**Type :** TEMP — session 5 sept 2026, en pause volontaire (voir note ci-dessous).
**Statut :** ⏸️ **audit fait, code pas encore lancé** — reprendre ce fichier avant de continuer le plan démo 10 sept (F2 sur le calendrier [`../product/PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md`](../product/PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md)).

---

## Chronologie actuelle (calculée depuis les constantes réelles)

| t (depuis clic Continuer) | Ce qui se passe | Constante en cause |
|---|---|---|
| 0,0 s | Brume du nom démarre | — |
| 0 → 4,4 s | Nom sort de la brume → lisible | `WIZARD_NAME_MIST_MS = 4400` |
| ~5,4 s | Naissance de l'étoile Hero commence (grain/voile) | dérivé de `WIZARD_LEGACY_LINEAR_MS` |
| ~7,4 s | Flash/larme (C4), la taille « clique » | idem |
| ~7,8 s | Étoile Hero « KEEP », traits (constellation) commencent à se dessiner | `SEG.C_END = 0.72` |
| **~10,0 s** | **Constellation entièrement dessinée** | fin de `WIZARD_REWARD_REVEAL_MS ≈ 10 013 ms` |
| **~10,0 s** | **`useParcoursUx` bascule sur `hub.postReveal` → la carte J3 apparaît (fade 400 ms + 500 ms)** | `useParcoursUx.ts` L199-202, réagit à `revealPhase === "done"` |
| 10,0 → 13,5 s | Rien de visible ne se passe — un minuteur tourne en coulisses | `WIZARD_REWARD_DWELL_MS = 3500` |

**Constat clé (le vrai trou du rythme) :** `WIZARD_REWARD_DWELL_MS` (3,5 s) est commenté *« Pause admiration après constellation complète, avant étape 2 »* — mais il ne bloque plus rien de visible. Il ne fait que retarder la résolution de la `Promise` de `playReward()` (`useWizardStep1Reveal.ts` L69-73), alors que `useParcoursUx` réagit **instantanément** au passage `phase === "done"` (L199) pour afficher la carte J3 — **avant** que ce minuteur ne s'écoule. Résultat : la carte CTA interrompt l'admiration au bout de **~10 s**, pas 20.

## Variables à ajuster (existantes, aucune nouvelle mécanique)

| Fichier | Variable | Valeur actuelle | Effet si on l'augmente |
|---|---|---|---|
| `src/lib/contribute/wizardBirthReveal.ts` | `WIZARD_NAME_MIST_MS` | 4400 ms | Étire la brume → nom lisible |
| `src/lib/contribute/wizardBirthReveal.ts` | `WIZARD_LEGACY_LINEAR_MS` | 8000 ms | Étire *proportionnellement* toute la naissance Hero (grain, voile, core, teal, spikes, flash) **et** le dessin des traits — seul cadran qui pilote toutes les particules (`birth.ts` est 100 % dérivé de `revealT`, aucun timer indépendant par particule). Le fichier dit lui-même que le wizard est *« découplé du craft lab (14 s) »* — s'en rapprocher est cohérent avec le craft d'origine. |
| `src/lib/contribute/wizardBirthReveal.ts` | `WIZARD_REWARD_DWELL_MS` | 3500 ms | Actuellement mort visuellement. Le vrai levier n'est pas sa valeur mais son câblage (voir plan). |
| `src/components/tribute/SanctuaryHubPostReveal.tsx` | `DWELL_MS` (carte J3) | 400 ms | Retarde l'apparition de la carte une fois `hub.postReveal` atteint — actuellement le seul répit réel après la constellation. |

**Caméra (`HubSkyCamera.tsx`) :** vérifié — aucune caméra ne bouge pendant ce play. Le dolly (`HUB_APPROACH_MS = 2800`) ne joue qu'à la toute première arrivée sur le hub (avant d'ouvrir le panneau) ; une fois « settled », le code dit explicitement *« Pause — ne pas rembobiner le dolly »*. Pas de levier caméra ici sans changer la logique (rejouer le dolly = nouvelle mécanique, hors périmètre F2).

## Plan pour atteindre ~20 s

1. **Câbler le dwell pour qu'il retienne vraiment la carte J3** — faire dépendre `showEditEssentials`/`hub.postReveal` de la fin du délai `WIZARD_REWARD_DWELL_MS`, pas de l'instant `phase === "done"`. Restitue à lui seul 3,5 s d'admiration silencieuse déjà prévue mais jamais exploitée. (Le minuteur existe déjà — on le branche sur ce qu'il était censé retarder, pas une nouvelle mécanique.)
2. **Étirer `WIZARD_LEGACY_LINEAR_MS`** de 8000 → ~13000-14000 ms (retour vers le rythme 14 s du craft lab). Porte la naissance Hero + dessin des traits de ~5,6 s à ~9,5-10 s.
3. **Garder `WIZARD_NAME_MIST_MS`** à 4400 ms (déjà un bon rythme) — ou +300-500 ms si on veut plus de suspens à l'ouverture.
4. **Optionnel — `DWELL_MS` de la carte J3** : 400 → 700-800 ms pour une entrée plus douce une fois le CTA autorisé à apparaître.

**Arithmétique visée :** 4,4 s (brume) + ~9,5 s (naissance + traits, valeur point 2) + 3,5 s (dwell, réellement bloquant, point 1) + ~0,8 s (entrée carte) **≈ 18,2 s**, réglable à 20 s pile en montant `WIZARD_LEGACY_LINEAR_MS` à ~14 500 ms.

---

## Reprise

Pas de code lancé sur ce plan — **GO en attente**. Reprendre ce fichier dès que la tâche en cours (posée par l'utilisateur le 5 sept, hors-scope de ce doc) est réglée.
