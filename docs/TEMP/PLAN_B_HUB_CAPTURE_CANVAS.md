# Plan B — Capture canvas hub au clic (gel pixel-perfect)

**Type :** TEMP · rush · **Date :** 1 sept 2026 (demain)  
**Prérequis livré ce soir :** `12f1c34` — thaw D fluide, canvas chaud sous panneau, dolly préservé.  
**Canon :** [`../product/PARCOURS_UX_CHEMIN_1_TRAVERSEE.md`](../product/PARCOURS_UX_CHEMIN_1_TRAVERSEE.md) §2b · [`hubFreezeTimeline.ts`](../../src/lib/parcours/hubFreezeTimeline.ts)

---

## Objectif (1 phrase)

Au clic Hero, **capturer le dernier frame WebGL** (même caméra, même zoom) et l’utiliser comme gel 2D pendant la saisie — **zéro saut** PNG statique vs hub.

---

## Non-objectifs (demain)

- Pas de C2 (WebGL loop sous formulaire)
- Pas de polish panneau / copy (→ `NOTES_COPY_WIZARD_HUB.md`)
- Pas de reveal constellation (Continuer)
- Pas de refonte timeline A/D — **brancher B dans les beats existants**

---

## Diagnostic actuel

| Symptôme | Cause |
|----------|--------|
| « Cadre » / bandes noires | PNG `hub-freeze-v1` ≠ viewport canvas |
| Zoom différent à la fermeture | partiellement fixé (`HubSkyCamera` settled) — B aligne aussi l’**aller** |
| Magie clic insuffisante | crossfade vers asset approximatif, pas le frame vécu |

---

## Architecture cible

```
hub.idle (WebGL live)
    ↓ clic — fin HUB_FREEZE_HOLD_MS (200 ms)
captureCanvas() → blob/data URL
    ↓ HUB_FREEZE_FADE_MS (560 ms)
panel.essentials : backdrop = capture dynamique (fallback hub-freeze-v1.jpg)
    ↓ WebGL unmount / opacity 0 · loop off
saisie fluide
    ↓ fermer — thaw D (inchangé)
hub.idle
```

**Une seule vérité image gelée :** `hubFreezeCaptureRef.url` (session) · fallback fichier statique si capture échoue.

---

## Fichiers à toucher (seulement)

| Fichier | Action |
|---------|--------|
| `src/lib/parcours/hubFreezeCapture.ts` | **NEW** — ref capture, `captureHubFrame(gl)`, revoke URL |
| `src/lib/parcours/hubFreezeTimeline.ts` | Hook `onCaptureReady` beat · export `HUB_CAPTURE_AT_MS = HUB_FREEZE_HOLD_MS` |
| `src/components/contribute/SanctuaryUniverse.tsx` | `preserveDrawingBuffer: true` **hub-lite only** via `createRenderer` param |
| `src/components/tribute/SanctuaryWizardStep1Sky.tsx` | Passer ref GL / callback capture au parcours |
| `src/hooks/useParcoursUx.ts` | Schedule capture @ hold end · `backdropSrc` dynamique |
| `src/components/contribute/SkyBackdrop.tsx` | Prop `src?: string` (override `SKY_BACKDROP_IMAGE_SRC`) |
| `src/components/tribute/TributeWizard.tsx` | Câbler `backdropSrc` depuis hook |

**Ne pas toucher :** `HubSkyCamera` (settled OK), panneau overlay, dictionaries.

---

## Implémentation — 5 étapes chirurgicales

### Étape 1 — Buffer (30 min)

- `createRenderer(canvas, { preserveDrawingBuffer?: boolean })`
- Activer **uniquement** quand `hubSkyCamera && mode === background'`
- Vérifier : pas de régression perf hub idle (acceptable — hub = rite court)

### Étape 2 — Module capture (45 min)

```ts
// hubFreezeCapture.ts — sketch
export const hubFreezeCaptureRef = { url: null as string | null };

export function captureHubCanvas(canvas: HTMLCanvasElement): string | null {
  try {
    revokeHubFreezeCapture();
    const url = canvas.toDataURL("image/png");
    hubFreezeCaptureRef.url = url;
    return url;
  } catch {
    return null;
  }
}

export function revokeHubFreezeCapture() { /* revokeObjectURL if blob */ }
```

- Appeler **après** `softenHubFreezeFx` (flash fini, frame stable)
- **Avant** `setFreezeHolding(false)` (WebGL encore opacity 1)

### Étape 3 — Wiring timeline (45 min)

Dans `openPanel` schedule @ `HUB_FREEZE_HOLD_MS` :

1. `captureHubCanvas(canvas)` via ref exposée par `SanctuaryWizardStep1Sky`
2. `setCaptureUrl(url ?? null)` state dans hook ou ref
3. Puis enchaîner fade existant

`SkyBackdrop` reçoit `src={captureUrl ?? SKY_BACKDROP_IMAGE_SRC}`.

### Étape 4 — Fallback + cleanup (30 min)

- Capture fail → log dev · fallback `hub-freeze-v1.jpg`
- `revokeHubFreezeCapture()` on : close panel, unmount step 1, openPanel again
- Pas de fuite mémoire data URL (réutiliser ou revoke)

### Étape 5 — QA gate (30 min)

Checklist manuelle :

- [ ] Clic → pas de saut zoom vs hub idle
- [ ] PNG gel = plein viewport (pas de letterbox)
- [ ] Saisie clavier fluide (loop off)
- [ ] Esc → thaw D fluide (commit ce soir)
- [ ] Safari macOS + Chrome
- [ ] Resize fenêtre entre hub et clic (recapture au clic — OK)

---

## Timing dans `hubFreezeTimeline`

| Beat | ms | B |
|------|-----|---|
| hold | 0–200 | flash · breath hold |
| **capture** | **200** | **`captureHubCanvas()`** |
| fade | 200–760 | WebGL 1→0 · capture PNG 0→1 |
| panel | ~340 | verre slide |

---

## Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| `toDataURL` bloque ~16–50 ms | OK pendant hold 200 ms |
| Safari taint / CORS | canvas same-origin WebGL — tester tôt |
| `preserveDrawingBuffer` + perf | hub-lite only · pas ritual |
| Gros data URL mémoire | revoke on close · max 1 capture session |
| Retina / dpr | capturer canvas backing store (naturel) |

---

## Done when

1. Fondu clic → panneau **sans** décalage visible caméra/zoom  
2. Fallback statique si capture fail (pas de crash)  
3. Doc canon §2b : « capture canvas B livré » + changelog Traversée  
4. **Un commit** : `feat(parcours): B — capture canvas gel hub au clic`

Estimation totale : **~3–4 h focus** (pas une journée si scope respecté).

---

## Après B (plus tard)

- Continuer → `transition.backdropToWebGL` (reveal constellation)
- Copy hub (session séparée)
- Démo Patrice 10 sept — B = wow clic, pas blocant si fallback PNG OK
