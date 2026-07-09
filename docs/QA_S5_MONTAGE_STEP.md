# QA — Étape 5 Table de Montage (Livre Ouvert)

**Dernière révision : juillet 2026 · post PR-3 (`41235e8`)**

Checklist manuelle de régression pour l'Étape 5. Référence technique : [`STORYBOARD_STEP5_LIVRE_OUVERT.md`](STORYBOARD_STEP5_LIVRE_OUVERT.md).

**Environnement recommandé :** localhost, projet avec ≥ 15 médias uploadés, ≥ 3 chapitres avec chansons (Étape 4 complétée).

---

## Prérequis

- [ ] Étape 4 validée (chansons assignées, pas de blocage structurel)
- [ ] Médias visibles dans la banque ou répartis selon le scénario
- [ ] Tester **desktop** (≥ 1280 px) et **mobile** (≤ 768 px) si possible
- [ ] Optionnel : activer `prefers-reduced-motion` dans les DevTools pour un passage dédié

---

## 1. Onboarding gate (storyboard vierge)

**Setup :** storyboard sans média assigné à un chapitre (tous en banque).

- [ ] À l'ouverture Étape 5, le gate plein écran s'affiche (magie / manuel)
- [ ] **Composition Magique** lance la séquence (voir §5)
- [ ] **Je compose moi-même** ferme le gate et affiche le Livre Ouvert vide
- [ ] Le gate ne réapparaît pas après un premier choix (même session)

---

## 2. Layout Livre Ouvert

- [ ] Desktop : colonne banque **~280px** à gauche, chapitres à droite
- [ ] `StoryboardFilmMap` sticky en haut de la zone chapitres
- [ ] Tous les chapitres visibles en scroll vertical (pas d'onglets)
- [ ] Mobile : banque au-dessus des chapitres (stack)
- [ ] Compteurs banque et chapitres cohérents avec les données réelles

---

## 3. StoryboardFilmMap

- [ ] Barres de remplissage reflètent `assigned / capacity` par chapitre
- [ ] Clic sur un segment → scroll vers le chapitre (`scroll-mt` / marge 132 px)
- [ ] Surplus au-delà de la capacité visible (overflow segment) si applicable

---

## 4. Drag & Drop — cas simples

- [ ] Glisser 1 média banque → chapitre N : atterrit dans **N** (pas un autre chapitre)
- [ ] Glisser 1 média chapitre → banque : retour banque
- [ ] Réordonner médias **dans** un chapitre (ordre persisté après refresh si autosave OK)
- [ ] Réordonner **chapitres** via poignée header

---

## 5. Drag & Drop — multi-select

- [ ] Sélection multiple banque (cercles + Shift+clic) → drop vers chapitre ciblé
- [ ] Chapitre survolé s'illumine (ring + glow thème chapitre)
- [ ] Overlay drag teinté selon chapitre cible
- [ ] Après drop, **aucune sélection fantôme** en banque — nouvelle sélection possible
- [ ] Multi-select intra-chapitre → drag vers autre chapitre ou banque

---

## 6. Actions chapitre

- [ ] **Remplissage automatique** — remplit jusqu'à capacité recommandée depuis la banque
- [ ] **Vider** — confirmation, tous les médias retournent en banque
- [ ] **Gérer** — tiroir surplus / réordonnancement fin fonctionne
- [ ] Édition titre chapitre inline (clic → input → autosave)

---

## 7. Composition Magique

**Setup :** storyboard vierge, ≥ 10 médias en banque, plusieurs chapitres avec capacité.

- [ ] Séquence démarre : scrim profondeur + capsule « Nous tissons votre histoire… »
- [ ] Scroll automatique chapitre par chapitre
- [ ] Photos apparaissent en cascade (stagger visible, pas de pop brutal)
- [ ] Durée totale raisonnable (~20 photos < 3 s de sensation)
- [ ] Capsule et scrim disparaissent proprement en fin (pas de micro-saccade visible)
- [ ] Banque vidée (médias assignés) ; FilmMap à jour
- [ ] Interaction bloquée pendant la séquence (`pointer-events-none`)
- [ ] Autosave reprend après la fin (indicateur sauvegarde)

---

## 8. Modale directeur & focal

- [ ] Clic vignette → `MontageDirectorModal` s'ouvre
- [ ] Navigation précédent/suivant OK
- [ ] Point focal persisté si applicable

---

## 9. Accessibilité & motion

- [ ] `prefers-reduced-motion` : animations magic désactivées, pas de blur scrim
- [ ] Overlay magic : `aria-live` / `aria-busy` cohérents pendant la séquence
- [ ] Focus clavier atteignable sur actions principales (gate, boutons chapitre)

---

## 10. Régression connue (historique PR-2)

Vérifier que ces bugs **ne reviennent pas** :

| Bug historique | Test |
|----------------|------|
| Drop multi → toujours Chapitre 2 | §4 + §5 |
| Sélection fantôme post-drag banque | §5 |
| FilmMap surplus incorrect | §3 |
| Pas de feedback couleur dragover | §5 |

---

## 11. Packages (smoke)

Tester au moins un passage rapide sur :

- [ ] `heritage` (B2C — cas nominal)
- [ ] `essential` (freemium — moins de chansons / médias)
- [ ] Projet avec chapitre en surcharge (au-delà capacité recommandée) — tiroir Gérer

---

## Sign-off

| Champ | Valeur |
|-------|--------|
| Date | |
| Testeur | |
| Commit / branche | |
| Navigateur | |
| Résultat global | ☐ Pass ☐ Fail |
| Notes | |

---

*Ajouter une ligne dans ce fichier pour tout nouveau bug découvert — avant correction code.*
