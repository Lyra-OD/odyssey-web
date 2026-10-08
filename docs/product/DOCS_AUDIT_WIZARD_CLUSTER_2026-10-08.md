# Audit docs — cluster Wizard / Coffre / Livre

**Type :** living · **Vérité pour :** quels docs du cluster sont à jour, partiels, ou en retard (snapshot **8 oct 2026**).  
**Dernière MAJ :** 8 oct 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 8 oct 2026 — Premier passage post-deck ILP 11 · chantier packages Coffre/Livre.

Plan actif : [`WIZARD_COFFRE_LIVRE_PACKAGES.md`](WIZARD_COFFRE_LIVRE_PACKAGES.md).  
Méthode : en-tête doc vs réalité code (`TributeWizard` ~3462 L, pas de `src/surfaces/`, pas de tiroir Coffre global, ingest S5–S7 non livrés).

---

## Légende

| Tag | Signifie |
|-----|----------|
| **OK** | Aligné code + décisions actuelles |
| **PARTIEL** | Vrai sur le fond, détails / statut / Next périmés |
| **RETARD** | Affirme un état ou une priorité qui ne tient plus |
| **FIGÉ OK** | Snapshot / démo passée — garder, ne plus exécuter comme plan actif |

---

## Tableau

| Doc | Dernière MAJ | Tag | Écart vs réalité (8 oct) |
|-----|--------------|-----|---------------------------|
| [`WIZARD_COFFRE_LIVRE_PACKAGES.md`](WIZARD_COFFRE_LIVRE_PACKAGES.md) | 8 oct 2026 | **OK** | Plan chantier actif |
| [`../WIZARD_ARCHITECTURE.md`](../WIZARD_ARCHITECTURE.md) | 29 sept 2026 | **PARTIEL** | 7 étapes / étape 6 immersif OK. Compte « ~3030 L » + hooks storyboard **sous-estime** (~3462 L). Pas de mention packages Coffre/Livre ni tiroir global. |
| [`COFFRE_MONTAGE_MEDIA_INGEST.md`](COFFRE_MONTAGE_MEDIA_INGEST.md) | 16 sept 2026 | **PARTIEL** | Décision ingest (trim 10 s, 1 objet) **toujours canon**. Cadre « démo 18 sept » / Jeudi P0 **périmé** (S1–S3 faits). S5–S7 **toujours à faire** — renvoyer vers le plan packages. |
| [`../STORYBOARD_STEP5_LIVRE_OUVERT.md`](../STORYBOARD_STEP5_LIVRE_OUVERT.md) | 22 sept 2026 | **PARTIEL** | Canon étape 5 encore utile. S5-L / J/K et polish Livre à re-cadrer avec le plan Phase 3 (pas inventer la liste ici). |
| [`../STORYBOARD_REFACTOR.md`](../STORYBOARD_REFACTOR.md) | (ancien) | **PARTIEL** | Histoire S1–S4 livrée. Ne pas y chercher le tiroir / ingest 2026-10. |
| [`SANCTUARY_USER_JOURNEY.md`](SANCTUARY_USER_JOURNEY.md) | 5 sept 2026 | **PARTIEL** | Vision J5 tiroir Coffre **toujours voulue** et **non shippée**. Ne pas traiter comme STATUS d’impl. |
| [`PARCOURS_UX_REGISTRY.md`](PARCOURS_UX_REGISTRY.md) | 31 août 2026 | **RETARD** | Beaucoup de beats encore `todo` / stub ; `vault.filmBridge` non créé. Statuts d’impl à resync après Traversée réelle. |
| [`PARCOURS_UX_GAPS.md`](PARCOURS_UX_GAPS.md) | 5 sept 2026 | **RETARD** | Inventaire pre-T1 ; portions probablement livrées ou contournées. À rafraîchir ou marquer « audit historique ». |
| [`PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](PARCOURS_UX_CHEMIN_1_TRAVERSEE.md) | (canon) | **PARTIEL** | Spec encore référence UX ; écart code (tiroir, film bridge) non mis à jour dans un seul endroit. |
| [`PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md`](PARCOURS_UX_PLAN_TECHNIQUE_DEMO_10_SEPT.md) | démo 10 sept | **FIGÉ OK** | Plan démo passé → ne plus piloter le sprint. Candidat `TEMP/` / bandeau « historique ». |
| [`PARCOURS_UX_STORYBOARD_VOULU.md`](PARCOURS_UX_STORYBOARD_VOULU.md) | — | **FIGÉ OK** | Storyboard voulu (intention) — pas vérité impl. |
| [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md) | 30 sept 2026 | **RETARD** | §10 **P0 démo 18 sept** encore listé comme priorité. Médias marqués 🟢 sans ingest allégé. CI marqué 🟢 alors que `npm test` rouge sur `quiet-luxury-player` (0.8 vs 1.5). Pas de ligne chantier Coffre packages. |
| [`../QA_S5_MONTAGE_STEP.md`](../QA_S5_MONTAGE_STEP.md) | — | **PARTIEL** | Checklist encore utile pour Livre ; pas liée au package ni tiroir. |
| [`../MOBILE_WIZARD_STRATEGY.md`](../MOBILE_WIZARD_STRATEGY.md) | 17 août 2026 | **RETARD** | Rails M0–M6 ; Coffre mobile / Capture / Scanner à recouper avec tiroir + ingest. |
| [`../SCANNER_COMPANION.md`](../SCANNER_COMPANION.md) | — | **OK / PARTIEL** | Phase A+B dans Coffre étape 3 = OK. Hors scope encode vidéo ; rester branché sur surface Coffre. |

---

## Code vs docs (faits durs)

| Fait | Docs qui mentent ou omettent |
|------|------------------------------|
| `TributeWizard.tsx` ≈ **3462** lignes | Architecture parle encore ~3030 |
| Pas de `src/surfaces/coffre` ni tiroir chrome | Journey / Registry décrivent J5 / `vault.filmBridge` comme chemin — **pas livré** |
| `videoTrims` jamais écrit par l’UI | Ingest le dit bien ; STATUS ne le porte pas en Next |
| Thumb WebP + **original** gardé | Ingest veut 1 objet allégé — **écart produit ouvert** |
| CI `npm test` fail (constante noir pré-mémoire 0.8 ≠ 1.5) | STATUS « Tests & CI 🟢 » |
| Démo 18 sept **passée** | STATUS §10 + bandeau ingest « démo vendredi » |

---

## Actions doc recommandées (sans big-bang)

1. **STATUS** — remplacer P0 démo 18 sept par pointeur [`WIZARD_COFFRE_LIVRE_PACKAGES.md`](WIZARD_COFFRE_LIVRE_PACKAGES.md) ; noter CI player rouge ; Médias 🟡 tant que S5–S7 ouverts.  
2. **Ingest** — changelog : démo passée · S5–S7 = Phase 2 du plan packages.  
3. **Architecture** — une ligne orchestrateur ~3462 L + lien plan packages.  
4. **Registry / Gaps** — bandeau « audit août–sept ; resync après chantier Coffre » ou passe de resync dédiée (pas bloquant pour commencer le code Coffre).  
5. **Plan démo 10 sept** — bandeau historique si pas déjà clair.

*(Les items 1–3 sont faits dans le même commit que ce fichier.)*

---

## Hors cluster (rapide)

| Doc | Note |
|-----|------|
| [`../PITCH/INVESTOR_DECK_WEB_ILP11.md`](../PITCH/INVESTOR_DECK_WEB_ILP11.md) | **OK** — deck ILP 11 shippé oct 2026 |
| [`../FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md) | Canon prix — hors scope ce chantier |
| [`../CONVENTIONS.md`](../CONVENTIONS.md) | MAJ août — encore valide pour où naissent les docs |
