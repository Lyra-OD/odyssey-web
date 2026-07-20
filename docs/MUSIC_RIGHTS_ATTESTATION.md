# Attestation droits musique (soupape MP3/WAV)

**Dernière révision : juillet 2026 · Statut : spec produit — textes légaux ToS à finaliser avec conseil**

Parent : [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · Technique Stingray : [`STINGRAY_MUSIC_INTEGRATION.md`](STINGRAY_MUSIC_INTEGRATION.md).

---

## Principe

| Voie | Licence | Responsabilité |
|------|---------|----------------|
| **Catalogue Stingray officiel** | Plateforme Odyssey | Odyssey / Athos (contrat Stingray) |
| **Fichier personnel** (MP3/WAV) | Usage attesté par la famille | **Famille** (ToS) — y compris publication réseaux sociaux |

Odyssey / Creatomate **mixent** la piste uploadée pour l’export familial. Odyssey **ne négocie pas** de licence sync tierce pour les fichiers user.

---

## Gates techniques

1. Avant le premier upload audio perso : modale ToS (FR/EN) — case à cocher obligatoire.
2. Persistance : `musicRightsAttestation: { acceptedAt, tosVersion }` dans `wizard_state` (ou colonne projet).
3. `POST /api/checkout` et worker Creatomate : si un chapitre a `source=upload` **sans** attestation → **422** / refus job.
4. Metadata chapitre : `license_path: "platform" | "user_attested"`.

---

## Disponibilité UI

- **Souvenir** : bouton import **masqué** (Quiet Luxury).
- **Héritage / Éternité** (ou après Soft Cap) : Catalogue Stingray (défaut) + **Importer ma chanson**.

---

## Copy ToS (brouillon produit — à valider juridique)

> En important ce fichier, je certifie disposer des droits nécessaires pour un usage personnel dans le cadre de cet hommage. Je comprends qu’Odyssey n’accorde aucune licence sur ce contenu, et que toute publication sur les réseaux sociaux relève de ma seule responsabilité.

EN équivalent à fournir dans `dictionaries/` au moment de l’implémentation.

---

## Hors scope V1

Textes ToS finaux signés avocat · Content-ID monitoring · DMCA automated takedown.
