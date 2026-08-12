# Odyssey Wormhole — Craft (tunnel volumétrique)

**Statut :** lab ouvert (12 août 2026) · **pas branché** au play éclipse  
**URL :** `/fr/contribute/test-wormhole` (dev only)  
**Shader :** [`WormholeCraftShader.tsx`](../src/components/contribute/constellation/WormholeCraftShader.tsx)  
**UI :** [`WormholeCraftLab.tsx`](../src/components/contribute/WormholeCraftLab.tsx)  
**Finale play :** [`ODYSSEY_ECLIPSE_PLAY_FINALE.md`](ODYSSEY_ECLIPSE_PLAY_FINALE.md) § C  
**Palette :** [`skyTheme.ts`](../src/components/contribute/constellation/skyTheme.ts) uniquement (`gasTeal`, `zodiacal`, `cosmicDust`, `aurora.edge`, `starsField.tint`, `scene.background`)

> **Règle :** craft ici → valider → seulement ensuite brancher après le blanc B.  
> **REJECT :** mush couleur plein cadre · warp blanc/argent aveuglant · fluo / comic CGI · couleurs hors skyTheme.

---

## 1. Intention

Après le flash blanc (seuil), **plongée dans un tube de nébuleuse Sanctuaire** : gaz teal / deep / poussière ambrée qui fonce vers la caméra, puis **alpha → 0** pour révéler le ciel.

| KEEP | REJECT |
|------|--------|
| UV cylindrique **sans seam** (cos/sin) | `atan` brut → couture |
| **3 couches** FBM parallax | Une seule plaque FBM |
| Ridges / filaments clairsemés | Mush softstep global |
| Soft core ambré destination | Flash blanc / trou noir |
| Rush stars (`starsField.tint`) | Aucune particule |
| Alpha → ciel | Hold opaque infini |

---

## 2. Math (1 plane)

```glsl
vec2 cylUV(ang, depth, rScale) = vec2(cos(ang), sin(ang)) * rScale + depth;
// 3× gasLayer (speedMul 0.55 / 1.0 / 1.65) → ridge4 filaments
// + soft core + rushStars hash cellulaire
```

---

## 3. Knobs lab

| Knob | Rôle |
|------|------|
| Velocity | Vitesse du vol dans le tube |
| Density | Épaisseur / contraste du gaz |
| Alpha | Opacité globale (sortie vers ciel) |
| Core soft | Noyau ambré central |

**Demo** : `Décel → ciel` — velocity ↓ + alpha ↓ (~4,8 s).

---

## 4. Suite

| Étape | Action |
|-------|--------|
| **Maintenant** | Valider ressenti volumétrique œil |
| **Puis** | KEEP knobs → brancher après B sur play |
| **Ensuite** | D ciel · E titre |

*Dernière révision : 12 août 2026 — plan volumétrique (seam / parallax / ridges / core / stars).*
