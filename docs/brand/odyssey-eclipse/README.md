# Odyssey Eclipse — exports DA

Deux familles d’assets (ne pas écraser l’une avec l’autre) :

| Famille | Contenu | Préfixe fichiers |
|---------|---------|------------------|
| **Disc** | Matière seule (trou noir + corona + diamond) — validée 10 août | `odyssey-eclipse-logo.*` |
| **Lockup** | Matière + **die-cut ODYSSEY** — 11 août | `odyssey-eclipse-lockup.*` |

## Disc (sans nom)

| Fichier | Usage |
|---------|--------|
| `odyssey-eclipse-logo.gif` | GIF animé (512², ~3.3 s loop) |
| `odyssey-eclipse-logo.apng.png` | PNG animé (APNG) |
| `odyssey-eclipse-logo-still.png` | PNG statique |
| `odyssey-eclipse-logo.mp4` | Boucle H.264 |

## Lockup (avec ODYSSEY)

| Fichier | Usage |
|---------|--------|
| `odyssey-eclipse-lockup.gif` | GIF animé |
| `odyssey-eclipse-lockup.apng.png` | PNG animé (APNG) |
| `odyssey-eclipse-lockup-still.png` | PNG statique |
| `odyssey-eclipse-lockup.mp4` | Boucle H.264 |

**Source de vérité produit :** `OdysseyEclipseMark` (`showWordmark` défaut = true) + [`ODYSSEY_ECLIPSE_LOGO.md`](../../ODYSSEY_ECLIPSE_LOGO.md).

**Régénérer** (dev server `:3000` + playwright + ffmpeg) :

```bash
# Lockup (avec nom) — défaut
node scripts/capture-eclipse-logo.mjs

# Disc (sans nom) — écrase odyssey-eclipse-logo.*
node scripts/capture-eclipse-logo.mjs --variant=disc
```

Pages export :  
`/fr/contribute/test-eclipse-mark-export?variant=lockup`  
`/fr/contribute/test-eclipse-mark-export?variant=disc`

Le dossier `frames/` et `palette.png` sont des intermediaires locaux (gitignorés).
