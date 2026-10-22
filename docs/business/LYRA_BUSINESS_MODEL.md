# Odyssey — Modèle d’affaires Lyra (Phase 2)

**Type :** business · **Vérité pour :** qui paie Lyra, combien, quand, et ce qui reste à valider.  
**Dernière MAJ :** 22 oct 2026 · **Carte :** [`../README.md`](../README.md) · dossier [`README.md`](README.md)

**Changelog** (max 5)
- 22 oct 2026 : **Décision CEO** : pas de 2e commission salon sur la part de Concierge payée en crédit Fonds (n’est plus bloquant pour les projections).
- 22 oct 2026 : Concierge = organise / prépare (pas d’exécution ni d’avis juridique) · crédit Fonds : pas de 2e commission (reco) · coût copilote interne.
- 22 oct 2026 : Création. Décision CEO : découpage **par moment**, pas par canal. Copilote directeur inclus · Lyra Concierge 99 $ famille · Sanctuaire 49 $/an (cibles).

**Liens :**
- Vision produit Lyra (graphe, orchestrateur, garde-fous) : [`../VISION_PHASE_2.md`](../VISION_PHASE_2.md) §3 Pilier 3
- Copy pitch (slides 11A produit · 11B modèle d’affaires) : [`../PITCH/INVESTOR_DECK_WEB_ILP11.md`](../PITCH/INVESTOR_DECK_WEB_ILP11.md) § 11A · 11B
- Cascade commission (10 % plateforme, 30 % du net) : [`../PARTNER_REVSHARE.md`](../PARTNER_REVSHARE.md)
- Fonds Commémoratif (crédit, règles) : [`../IMPLEMENTATION_CASCADE_VFINAL.md`](../IMPLEMENTATION_CASCADE_VFINAL.md) · [`VIRAL_EXPLAINED_SIMPLY.md`](VIRAL_EXPLAINED_SIMPLY.md)
- Grille Phase 1 live (179 / 349 / 499) : [`../FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md) §2 (ne pas recopier ici)

> **Statut :** modèle **cible** Phase 2. Rien de Lyra n’est en vente aujourd’hui. Les prix ci-dessous sont des **hypothèses à tester**, pas des tarifs officiels ni des revenus validés.

---

## 1. La décision en une phrase

**Lyra est gratuite pour le salon et payante pour la famille, et la frontière est le moment du parcours, pas le canal d’arrivée.**

| Moment | Qui utilise Lyra | Qui paie | Pourquoi |
|---|---|---|---|
| **Avant et pendant les funérailles** | Le directeur (copilote) | **Personne** : inclus dans le partenariat | Même logique que l’entrée à 0 $ de la Phase 1. Le salon gagne du temps, l’outil verrouille le canal. |
| **Après la cérémonie, à la maison** | La famille (Concierge) | **La famille** | Succession, résiliations, démarches : ce n’est plus le travail du directeur. Besoin distinct, service distinct. |

### Pourquoi pas « B2C seulement » ?

Option écartée : les familles venues du salon ne paient jamais Lyra.

- Le salon est le **plus gros canal**. Lyra a un coût réel par dossier (IA, stockage, support).
- Si ce coût n’est jamais facturé là où passe le volume, seules les familles B2C directes le couvrent. Elles seront peu nombreuses au départ.
- Le découpage par moment règle le conflit : la famille ne paie pas ce que le directeur fait avec Lyra, mais l’après-cérémonie est un vrai service à part.

---

## 2. Les offres

| Offre | Pour qui | Prix cible | Contenu |
|---|---|---|---|
| **Copilote professionnel** | Directeurs des salons partenaires | **0 $** (inclus) | Préparation des dossiers, recherche d’information, workflows, rappels. Usage inclus raisonnable par dossier (voir §6). |
| **Lyra essentiel** | Toutes les familles | **0 $** | Orientation de base : ce qui presse, ce qui peut attendre. Une famille ne paie jamais pour une information urgente. |
| **Lyra Concierge** | Familles, après la cérémonie (salon ou B2C direct) | **99 $** par dossier, paiement unique | Listes de vérification liées à la succession, préparation des fermetures de comptes, organisation des documents, prochaines étapes personnalisées, rappels. Lyra **organise, guide et prépare** : elle ne ferme pas les comptes elle-même, ne règle pas la succession et ne donne pas d’avis juridique. Validation humaine pour les actes sensibles. |
| **Sanctuaire numérique** | Familles, après la 1re année gratuite | **49 $/an** | Hébergement, accès invités, capsule anniversaire. Déjà dans [`../VISION_PHASE_2.md`](../VISION_PHASE_2.md) Pilier 2. |

**Nom retenu :** « Lyra Concierge » (pas « Lyra Plus ») : on vend un accompagnement, pas une version premium d’un logiciel.

**À définir avant lancement Concierge :** durée d’accès, limites d’usage IA, archivage inclus, frontière exacte avec le copilote du directeur.

---

## 3. Qui touche quoi

### Concierge, famille venue d’un salon partenaire

Même cascade que la Phase 1 ([`../PARTNER_REVSHARE.md`](../PARTNER_REVSHARE.md)) :

| Étape | Montant |
|---|---|
| Prix payé par la famille | 99,00 $ |
| Frais plateforme 10 % | 9,90 $ |
| Net distribuable | 89,10 $ |
| **Part du salon (30 % du net)** | **26,73 $** |
| Part Odyssey (70 % du net) | 62,37 $ |
| Total Odyssey (70 % du net + frais plateforme), avant coûts IA, stockage, support, Stripe | 72,27 $ |

Ce calcul vaut pour une famille qui **paie en argent**. Paiement en crédit Fonds : voir §4.

Le salon a donc une raison concrète de **recommander** Concierge à ses familles.

### Concierge, famille B2C directe

99 $, **sans commission** salon.

### Sanctuaire 49 $/an

Partage salon : **à décider** (non tranché). Par défaut, aligner sur la même cascade si la famille vient d’un salon partenaire.

### Règle anti double facturation

Ne jamais faire payer le salon **et** la famille pour la même valeur. Le copilote est gratuit pour le salon ; Concierge couvre un besoin famille distinct (après-cérémonie).

---

## 4. Fonds Commémoratif : payer Lyra avec le crédit

**Idée :** les contributions des proches au Sanctuaire génèrent un crédit. La famille peut l’utiliser pour Concierge ou pour renouveler son Sanctuaire. Si le solde ne suffit pas, elle paie la différence ou garde son crédit pour un autre produit admissible.

**Proposition de valeur :** les proches peuvent financer l’accompagnement administratif de la famille.

**Ce qui existe déjà :**
- Le Fonds est **codé et livré**, mais **désactivé par défaut** (`viral_loop_enabled` = `false`, pilote seulement). D’où « may be funded » dans le pitch.
- Le surplus du Fonds sert à acheter du **produit**, jamais à retirer du cash.
- Le crédit est porté par la **marge Odyssey**, jamais par la commission du salon.

**Question :** quand Concierge est payé en crédit Fonds, le salon touche-t-il ses 26,73 $ ?

**Décision CEO (22 oct 2026) : non, pas de deuxième commission sur la part payée en crédit.**
- Le salon a **déjà touché 30 % du net** sur les contributions des invités qui ont créé ce crédit (`guest_commission_accrual`).
- Lui verser encore 30 % quand la famille dépense ce crédit reviendrait à **payer deux fois sur le même argent**, entièrement absorbé par la marge Odyssey.
- Si la famille complète en argent (solde insuffisant), la commission s’applique sur la **partie payée en argent** seulement.

**Reste à faire :** écrire la règle dans l’entente partenaire et dans les règles comptables avant le pilote.

**Effet sur les projections :** les 72 $ Odyssey par Concierge (calcul §3, paiement en argent) sont l’hypothèse **prudente** ; la part payée en crédit ne verse pas de commission au salon.

**À vérifier avant d’en faire une promesse commerciale :**
1. **Comptabilité :** crédit distinct d’un revenu encaissé et d’une commission payable.
2. **Règles d’usage :** les conditions du Fonds permettent-elles un service numérique et un abonnement annuel ?
3. **Liberté de choix :** ne jamais pousser une famille à acheter un produit inutile pour « utiliser son solde ».

Formulation pitch : le Fonds **pourrait réduire sensiblement la friction au paiement** (hypothèse forte à tester). Pas « fera exploser l’adoption ».

---

## 5. Revenus plus tard (pas des piliers aujourd’hui)

| Piste | Statut | Condition |
|---|---|---|
| **Mises en relation consenties** (préarrangements, services partenaires) | Option future | Définition vérifiable d’un lead qualifié, valeur démontrée pour le salon, consentement **séparé** (Loi 25). CPL historique : [`../VISION_PHASE_2.md`](../VISION_PHASE_2.md) Pilier 1. |
| **Place de marché Phase 3** | Vision | Commission sur transactions acceptées par la famille. Recommandations jamais biaisées vers qui paie le plus. |
| **Lyra Pro / Enterprise** (≈ 199 $/mois ou 15–30 $/dossier, groupes sur devis) | Option future | Seulement si un salon veut plus que le copilote inclus (multi-sites, rapports, intégrations). Pas dans le pitch actuel. |
| **Capsule anniversaire payante** (ex. 19 $ / 149 $) | Piste | Mesurer l’engagement réel avant toute projection. |
| **Extension animaux / autres événements de vie** | Piste | Pas un coût marginal nul : règles métier, qualité, confidentialité, acquisition à adapter. |

---

## 6. Coûts et garde-fous

- **Le copilote gratuit coûte quand même** : IA, hébergement, support, intégrations éventuelles. « Aucuns frais fixes » pour le salon ≠ produit sans coût pour Odyssey. En interne : **limite d’usage raisonnable par dossier** + **suivi du coût par dossier**, surtout avant un déploiement à grande échelle. Pas sur la slide.
- **Acquisition :** distribution par les salons = coûts d’acquisition incrémentaux **réduits**, pas nuls (activation, intégration, support restent).
- **Marge :** ne pas annoncer « 80 %+ » tant qu’on n’a pas un modèle de coûts réel par dossier.
- **Consentement :** contribuer à un Sanctuaire ≠ accepter de la sollicitation commerciale. Autorisations séparées.
- **Légal :** Lyra organise et explique. Elle ne remplace pas un notaire, un avocat ou une autorité. Validation humaine sur les actes sensibles.
- **Données :** informations confirmées distinctes des inférences IA. Liens sensibles ou incertains validés par une personne.
- **Transparence des prix :** présentée comme aide à la décision (options, inclus, coûts), jamais comme une attaque des salons.

---

## 7. Ce qu’il faut mesurer pour valider

1. **Adoption famille** : % des familles qui prennent Concierge (salon vs B2C).
2. **Coût réel par dossier** : IA + stockage + support, copilote inclus.
3. **Valeur salon** : temps gagné par dossier, satisfaction directeurs, taux de recommandation de Concierge.
4. **Rétention Sanctuaire** : renouvellement à 49 $ après la 1re année.
5. **Effet indirect** : les directeurs qui utilisent Lyra récoltent-ils plus de médias, et les upgrades film 179 / 349 montent-ils ?

Tant que ces cinq mesures ne sont pas faites, tous les prix de ce document restent des **hypothèses**.

---

## 8. Ce que dit le pitch (slides 11A · 11B)

**11A (produit) :** problème humain · 4 capacités · boucle · gouvernance · aucun prix.  
**11B (modèle) à l’écran :** parcours dans le temps (copilote inclus · Concierge 99 $ cible · Sanctuaire 49 $/an cible · plus tard Phase 3) · bloc coûts qualitatif · mention « prix cibles, à valider ».

**Pas à l’écran :** SaaS 199 $/mois, prix par lead, capsules payantes, 80 %+, CAC à 0 $.

**Phrase investisseur :** l’outil pro est gratuit, et c’est lui qui verrouille le canal. On monétise le côté famille, puis le flux de services. Même mécanique que la Phase 1, poussée plus loin.
