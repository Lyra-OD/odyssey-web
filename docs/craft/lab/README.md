# Lab Creatomate — itération visuelle

**Hors produit.** Boucle : éditer JSON → curl → juger MP4.  
Canon figé plus tard dans [`../CREATOMATE_RECIPE.md`](../CREATOMATE_RECIPE.md).

## Lab v1.3 (actuel) — baseline sans voile/vignette

Fichier : [`v1.3-baseline.json`](v1.3-baseline.json)

Changement de stratégie après v1.1/v1.2 jugés « très loin » :

| Avant | v1.3 |
|-------|------|
| Nom long flou + scale | Prénom seul « Éléonore », blanc pur, fade long, **fonts WOFF déclarés** |
| Aileron (souvent absent Creatomate) | **Montserrat** Light pour dates/wordmark (lab) |
| Photo plein cadre croppée + voile + vignette | Photo **`fit: contain`** 72×88 %, mat noir, **sans** voile ni vignette |
| 15–20 s trop compressé | **22 s** · void ~2 s · intro jusqu’à ~10 s · photo 8 s |

### Lancer

```bash
export CREATOMATE_API_KEY="$(grep '^CREATOMATE_API_KEY=' .env.local | cut -d= -f2-)"

curl -sS -X POST 'https://api.creatomate.com/v1/renders' \
  -H "Authorization: Bearer ${CREATOMATE_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d @"docs/craft/lab/v1.3-baseline.json" | python3 -m json.tool
```

### Ton MP3

`master-audio` → `source` = URL HTTPS.

### Archive

- `v1.1-lab-a.json` — trop vite / typo / crop  
- `v1.2-lab.json` — encore flou + muddy (voile+vignette)
