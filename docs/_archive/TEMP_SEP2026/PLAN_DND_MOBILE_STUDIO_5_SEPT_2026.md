# Plan DnD mobile — Studio (Étape 5)

**Type :** temp · **Vérité pour :** passe mobile tactile du Livre Ouvert avant la démo de jeudi.  
**Dernière MAJ :** 5 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 5 sept 2026 — GO validé : correctif DnD mobile en 1 passe propre (capteur tactile, poignée, grilles, confort smartphone).

---

## Objectif

Rendre le Studio fiable sur smartphone **sans changer la mécanique produit** :

- banque de souvenirs inchangée
- chapitres inchangés
- drag-and-drop conservé
- tiroir `Gérer` conservé

Le travail vise uniquement le **confort tactile** et la **lisibilité mobile**.

## Protocole retenu

1. **`useMontageDnd.ts`**  
   Ajouter un `TouchSensor` avec appui long (`delay`) et tolérance courte (`tolerance`) pour distinguer tap, scroll et drag sur mobile.

2. **Cartes médias chapitre**  
   Garder le drag plein-cadre sur desktop, mais renforcer la poignée tactile mobile (zone plus large, plus lisible).

3. **Tuile banque**  
   Éviter le drag sur toute la surface en tactile ; réserver le drag à une poignée, pour préserver le tap d’ouverture et le scroll.

4. **`ChapterCanvasGrid.tsx`**  
   Desserrer la grille mobile des chapitres (`2 colonnes` au lieu de `3`) pour agrandir les cibles.

5. **`MediaBankColumn.tsx`**  
   Aérer légèrement la banque sur mobile pour réduire l’effet de densité.

6. **Contrôle d’intégration**  
   Vérifier que `StoryboardMontageStep.tsx` et `ChapterRefinementDrawer.tsx` bénéficient naturellement du nouveau confort tactile sans réécriture d’architecture.

## Critères de succès

- un scroll vertical ne déclenche plus de drag parasite
- un tap ouvre bien la carte
- le drag démarre après intention claire
- la poignée mobile est facile à attraper
- les zones chapitres sont plus confortables en 390 px
- aucune nouvelle mécanique n’est introduite

## Reprise

Ce plan est **à exécuter maintenant** dans la passe mobile DnD.  
S’il reste des irritants après tests, faire une **seconde micro-passe** uniquement sur les réglages (`delay`, `tolerance`, taille poignée, densité de grille), sans refonte produit.
