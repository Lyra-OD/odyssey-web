# Odyssey — Copy écran (i18n)

**Type :** canon · **Vérité pour :** tous les textes visibles famille / salon / HQ / auth.  
**Dernière MAJ :** 19 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 19 août 2026 — DA colle le catalogue dans Figma ; vérité = JSON ([`DA_SCREENS.md`](DA_SCREENS.md)).
- 19 août 2026 — source de vérité = `dictionaries/*.json` · catalogue généré · règle Cursor.

## Opinion (à garder)

**Ne pas recopier les phrases à la main dans un second markdown.** Deux listes = elles divergent en une semaine.

- **Source unique :** [`dictionaries/fr.json`](../dictionaries/fr.json) + [`dictionaries/en.json`](../dictionaries/en.json)
- **Vue lisible (FR | EN) :** [`COPY_CATALOG.md`](COPY_CATALOG.md) — **générée**, pas éditée à la main
- **Régénérer** après tout ajout / changement de copy :

```bash
node scripts/export-copy-catalog.mjs
```

Ajuster un texte = ouvrir le JSON (les deux langues), puis relancer le script. Même commit.

Figma Vague 1 : coller le FR du catalogue, noter la **clé** en commentaire de frame. Un écart copy = ticket JSON, pas une vérité calque. Inventaire : [`DA_SCREENS.md`](DA_SCREENS.md).

## Surfaces

| Namespace JSON | Où on le voit |
|----------------|---------------|
| `header` `hero` `pricing` `process` `manifesto` `contact` `partnersPage` | Site marketing |
| `auth` `login` | Connexions Studio / Salon |
| `tributeWizard` | Wizard famille 7 étapes |
| `scan` (si présent) · `scannerCapture` | Scanner Compagnon |
| `sanctuary` | Sanctuaire invité `/contribute/{token}` |
| `salon` `hq` | Espaces partenaire / Odyssey HQ |
| `common` `seo` | Chrome, balises |

Hors catalogue : logs serveur, SQL, messages d’erreur API non affichés, IDs techniques (`acte1`).

## Voix (S5-L+)

Famille = **souvenirs, film, chapitre, Coffre**. Pas *timeline, acte, banque, dropzone, checkout, jetons*.

## Règle Cursor

[`.cursor/rules/copy-on-screen.mdc`](../.cursor/rules/copy-on-screen.mdc) — tout copy à l’écran → JSON FR+EN + régénérer le catalogue, même commit.
