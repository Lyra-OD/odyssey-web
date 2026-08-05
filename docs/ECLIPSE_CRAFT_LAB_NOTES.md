# Eclipse Craft Lab — notes de session (5 août 2026)

**Statut :** journal de craft · à reprendre demain  
**Preview :** `/fr/contribute/test-eclipse`  
**Fichiers actifs :**
- [`EclipseDisc.tsx`](../src/components/contribute/constellation/EclipseDisc.tsx) — shader craft
- [`eclipseCraftTimeline.ts`](../src/components/contribute/constellation/eclipseCraftTimeline.ts) — chrono ~5.2 s
- [`EclipseCraftLab.tsx`](../src/components/contribute/EclipseCraftLab.tsx) — UI Look / Lecture chrono

**Complète :** [`SANCTUARY_SKY_CRAFT.md`](SANCTUARY_SKY_CRAFT.md) (bible ciel) · intro sanctuary encore **OFF** jusqu’à validation look.

---

## 1. Où on s’arrête ce soir

**Paradigme actuel (à garder comme base demain) :**

| Élément | Comportement |
|---------|----------------|
| Trou noir / lune | **Fixe** au centre, disque opaque |
| Soleil | **Glisse** droite → gauche **derrière** le trou noir |
| Phase slider / chrono | `uAlignment` 0 → 0.5 (totalité) → 1 (sortie + ciel) |
| Corona | Soie FBM blanche Odyssey, chevauche le limbe (pas de couture noire) |
| Diamond | Contacts C2/C3 doux, côté = direction vers le soleil |
| Bloom | Sélectif, pas un flash violent |

**Non retenu ce soir :** resize dynamique du soleil + corona/rayons qui changent avec la proximité (essayé, **rejeté** — revenir en arrière demandé).

---

## 2. Pistes essayées aujourd’hui (réutilisable)

Légende : **KEEP** = utile · **REJECT** = ne pas refaire tel quel · **PARTIAL** = idée bonne, exécution à revoir.

### A. Look / matière (avant le transit)

| # | Piste | Verdict | Notes pour réutiliser |
|---|--------|---------|------------------------|
| A1 | Disque noir + corona soie FBM (step 2) | **KEEP** | Base soie : `dir` seamless, pas d’`atan` seam, blanc Odyssey |
| A2 | Streamers agressifs / soleil « trop hot » | **REJECT** | Trop comic ; revenir à la soie |
| A3 | Flash aveuglant (diamond / bloom max) | **REJECT** | Instant reject utilisateur |
| A4 | Burn-away / ash dissolve (FBM + cell4) | **REJECT** (pour l’anim principale) | Belle idée cendres, mais `cell4` → **damier** ; warp UV fort → **starburst** |
| A5 | Asymétrie Ouest (burn est d’abord) | **PARTIAL** | OK pour spectacle, pas le moteur d’occultation |
| A6 | Paradigme trou noir + lentille gravitationnelle | **PARTIAL** | Look « black hole » OK en image fixe ; warp `pull` élevé casse le réalisme en motion |
| A7 | Plane plein écran + `uAspect` (cercle rond) | **KEEP** | `viewport.getCurrentViewport` ; `scaleMul` = taille singularité, pas taille du plane |
| A8 | Photon ring aniso + chroma + dual FBM + bloom sélectif | **PARTIAL** | Polish limbe utile ; attention **2 ronds** (photon + halo accrétion/bloom) |
| A9 | Fix « 2 ronds » en tuant l’accrétion | **REJECT** | Tue le soleil ; mauvais trade-off |
| A10 | Accrétion monotone + assombrir sous photon | **PARTIAL** | Évite le 2e limbe ; ne pas écraser `nearHalo` |
| A11 | Resserrement photon « collé au noir » | **REJECT** (essai) | Utilisateur : revenir |
| A12 | Accrétion plus courte « derrière le noir » | **REJECT** (essai) | Idem, revenir |
| A13 | Gros trou noir (`R` 0.28 → 0.33 → 0.37) | **KEEP** (base taille) | Slider `Taille disques` reste le contrôle fin |

### B. Chrono / animation

| # | Piste | Verdict | Notes |
|---|--------|---------|--------|
| B1 | Timeline alignment + diamond + bodyFade + sky (commit `aea7809`) | **KEEP** (structure) | `coronaMul` 0.2→1 faisait le morphing visible |
| B2 | `progress: 0` en mode chrono (bug) | **REJECT** | Burn/lens ne jouaient jamais ; toujours brancher `chrono.progress` / phase |
| B3 | Chrono avec `coronaMul` ≈ 0.75–1 | **REJECT** | « Animation morte » — pas assez de dynamique |
| B4 | Offsets `uOffset` non branchés | **FIXÉ** | Brancher ou ne pas promettre de slide |
| B5 | Lentille UV forte pendant burn | **REJECT** | Damier / starburst (voir capture session) |
| B6 | Couper warp + cell4 (FBM only burn) | **PARTIAL** | Stabilise, mais le burn n’est plus le bon récit |
| B7 | Occultation « lune glisse, soleil fixe » | **REJECT** | Utilisateur : **inverse** |
| B8 | Occultation « trou noir fixe, soleil derrière » | **KEEP** | Paradigme validé |
| B9 | Transit complet phase 0→1 (droite→gauche) | **KEEP** | Base motion actuelle |
| B10 | Diamond flash + bloom empilés | **REJECT** (intensité) | Garder diamond **doux** + bloom bas |
| B11 | Fin = fade sur totalité figée | **REJECT** | Sensation « ça s’éteint » ; préférer ressortie puis ciel |
| B12 | Fin = soleil ressort puis ciel | **KEEP** (direction) | Timeline actuelle ~5.2 s |
| B13 | `coronaGate` ≈ 0.06 hors totalité | **REJECT** | Soleil = pièce de monnaie plate |
| B14 | Couture photosphère / corona (rond noir si corona ↓) | **FIXÉ** | Chevaucher nearHalo + limbe soft |
| B15 | Soleil qui grossit/rétrécit + rayons selon `prox` | **REJECT** | Essayé en fin de session ; **revenir** demandé — ne pas re-ship sans nouveau brief |

---

## 3. Recettes réutilisables (snippets d’intention)

### Soie corona (look Odyssey)
- FBM sur `dir` (pas d’angle `atan`)
- `nearHalo` / `midVeil` / `farVeil` + `spokes` légers
- Blanc pur ; pas d’ambre
- Toujours un peu de corona même hors totalité (sinon plus un soleil)

### Anti-patterns WebGL (ne pas rejouer)
1. `cell4` dominant dans un masque de dissolve → **damier**
2. `pull = warpStr / rSafe` avec plafond haut (~0.88) → **kaleidoscope**
3. Bloom bas seuil + photosphère HDR + diamond fort → **flash**
4. Photon ring + nearHalo peaking au même rayon → **2 cercles**
5. Gap entre `sunMask` et corona → **anneau noir** (fond qui passe)

### Contrôles lab utiles
- **Phase** = trajet unique (Look et Chrono alignés)
- **Corona** = intensité soie (ne doit pas révéler un disque mort)
- **Taille disques** = échelle commune

---

## 4. À reprendre demain (ordre suggéré)

1. **Valider le look départ** (phase 0) : soleil diffus + rayons **sans** changer la taille en course (ou avec un knob dédié, pas un hack `prox`).
2. **Totality** : un vrai instant où la photosphère disparaît, corona autour du trou noir (déjà partiel).
3. **Contacts** C2/C3 : diamond encore plus discret si besoin.
4. **Fin** : ressenti « ressortie » vs révélation ciel Sanctuaire (`skyIntroRef`).
5. Quand le look est bon → rebrancher intro `SkyIntroEclipse` (1×/session).

---

## 5. Commits de référence (historique craft)

| Commit | Sujet |
|--------|--------|
| `aea7809` | Craft black-hole look + fullscreen plane (base avant session polish) |
| `4efc50d` | Remove white rim stroke |
| `3b63de4` | Remove atan seam |
| `83dce55` | Soft white corona step 2 |
| `7cec9e8` | Reset step 1 black disc |

---

## 6. Décisions produit figées ce soir

- Récit = **vraie occultation** (soleil derrière trou noir fixe), pas burn-away comme moteur.
- Blanc Odyssey, plane + GLSL, mobile-friendly (pas de raymarch lourd).
- Documenter les essais **avant** de recommencer à tâtonner demain.

*Dernière mise à jour : 5 août 2026 (fin de session craft).*
