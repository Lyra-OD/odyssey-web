# Étape 6 — Bandeau Soft Cap « pourquoi » (à planifier)

**Type :** canon · **Vérité pour :** copy du bandeau jaune aperçu (pas la logique granted/intended).  
**Dernière MAJ :** 17 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 17 sept 2026 — Décision : le bandeau doit dire **les faits** (photos, licence, Héritage déjà ouvert). Pas maintenant — plan dédié ensuite.

**Soft Cap logique :** [`../NARRATIVE_SOFT_CAP.md`](../NARRATIVE_SOFT_CAP.md) (inchangée). **Aperçu mix BA :** [`WIZARD_PREVIEW_BA.md`](WIZARD_PREVIEW_BA.md).

---

## Pourquoi

Aujourd’hui `previewSoftCapNote` est **générique** : « Votre histoire dépasse déjà le Souvenir offert… Héritage… 125… musique… 179 $ ».

Le bandeau s’allume si **l’une** de ces causes est vraie (famille cadeau Souvenir, hors éditeur) :

1. `intendedPackage` ≥ Héritage
2. plus de 50 souvenirs vs plafond cadeau
3. licence musique (`extensions.musicLicense`)

La retouche IA **n’allume pas** le bandeau (elle est seulement dans la phrase grise de durée).

Résultat : on vend toujours Héritage 125 / 179 $ même si la seule cause est une licence 39 $, ou un Héritage déjà accepté sans dépassement.

---

## Décision (verrouillée, non codée)

**A + B** — reçu en faits, puis conséquence **seulement si elle correspond**.

1. **Assembler les causes réelles** (copy dynamique) :
   - « Vous avez **{n} souvenirs** (Souvenir en accueille 50). »
   - « Vous avez gardé une **piste du catalogue officiel**. »
   - « Vous avez ouvert **Héritage** pour ne laisser aucun moment de côté. »
2. **Une ligne de conséquence** collée au vrai panier :
   - Héritage engagé → « C’est pourquoi le film sort en Héritage. 179 $, réglé seulement à l’export. »
   - Licence seule, encore Souvenir → licence 39 $, **pas** 125 souvenirs / 179 $.
3. Ton : miroir Quiet Luxury, pas alerte reproche. Si Héritage est déjà `intended`, plutôt rappel factuel que warning jaune.

**Quand :** plan d’implémentation **plus tard** (après S3–S6). Ne pas recoder le filet Soft Cap.

---

## Aujourd’hui (runtime)

`TributeWizard` → `PreviewStep` `softCapActive` + clé `tributeWizard.previewSoftCapNote`. Logique granted / intended / amputation **inchangée**.

---

## Suite

Un plan chirurgical (clés FR/EN, assemblage des causes, pas de 179 $ si licence seule) quand le CEO dit **go bandeau 6**.
