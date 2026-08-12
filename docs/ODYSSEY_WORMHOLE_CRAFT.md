# Odyssey Wormhole — Craft (Quiet Luxury)

**Statut :** lab ouvert (12 août 2026) · **pas branché** au play éclipse  
**URL :** `/fr/contribute/test-wormhole` (dev only)  
**Shader :** [`WormholeCraftShader.tsx`](../src/components/contribute/constellation/WormholeCraftShader.tsx)  
**UI :** [`WormholeCraftLab.tsx`](../src/components/contribute/WormholeCraftLab.tsx)  
**Finale play :** [`ODYSSEY_ECLIPSE_PLAY_FINALE.md`](ODYSSEY_ECLIPSE_PLAY_FINALE.md) § C

> **Règle :** craft ici → valider → seulement ensuite brancher après le blanc B du play.  
> Ne pas rejouer le mush couleur / nuages soft plein cadre (REJECT août 2026).

---

## 1. Intention

Après le flash blanc (seuil), **warp Quiet Luxury** : lignes de lumière blanc / argent qui foncent vers la caméra, puis **décélèrent** pour redevenir des points et laisser le ciel.

| KEEP | REJECT |
|------|--------|
| Blanc / argent / transparent | Fluo, néon, violet stock |
| Stretch radial ∝ velocity | Tunnel CGI comic / starburst |
| 1 plane GPU (pas de particules CPU) | Mush couleur plein cadre |
| Décel → points → alpha 0 → ciel | Hold warp infini |

---

## 2. Logique shader (validée)

1. **Polar** — UV → `(angle, radius)`  
2. **Bruit angulaire** — hash par secteur → étoiles sur 360°  
3. **Travel** — `fract` radial animé par `uVelocity`  
4. **Stretch** — `pow(uVelocity, stretchPow)` allonge le bruit → streaks  
5. **Décel** — velocity ↓ → streaks → points ; opacity ↓ → ciel derrière  
6. **HDR head** — pic court pour bloom ; queue soft  

Astuce soyeuse : `stretchPow ≈ 1.6–2.0`.

---

## 3. Knobs lab

| Knob | Rôle |
|------|------|
| Velocity | 0 = points · ~2 = warp |
| Stretch pow | Courbe d’étirement |
| Density | Secteurs angulaires |
| Opacity | Voile global |
| Head HDR | Pic tête (bloom) |
| Tail | Longueur queue |
| Core soft | Anti-singularité centre |

**Demo** : `Décel → ciel` anime velocity 2→0 + opacity→0 (~4,2 s).

---

## 4. Suite (plan)

| Étape | Action |
|-------|--------|
| **Maintenant** | Dialer knobs + demo `Décel → ciel` jusqu’à KEEP |
| **Puis** | Brancher après B sur play (`wash` ↓, warp ↑) |
| **Ensuite** | D ciel de loin · E titre ([`ODYSSEY_ECLIPSE_PLAY_FINALE.md`](ODYSSEY_ECLIPSE_PLAY_FINALE.md)) |

Parallax / knobs nuages-étoiles en plus : seulement si le warp QL seul ne suffit pas — **ne pas** revenir au mush couleur.

*Dernière révision : 12 août 2026 — lab créé ; play C débranché ; docs alignées.*
