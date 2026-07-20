# Attestation droits musique (soupape MP3/WAV)

**Dernière révision : juillet 2026 · Statut : implémenté Phase 5 (UI + gates checkout/export) — textes légaux ToS à finaliser avec conseil**

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

- **Souvenir** : bouton import MP3 **masqué**. Catalogue officiel Stingray accessible via Soft Cap dual-choice ([`NARRATIVE_SOFT_CAP.md`](NARRATIVE_SOFT_CAP.md)) — Licence `musicLicense` 39 $ **ou** upgrade Héritage.
- **Héritage / Éternité** : Catalogue Stingray officiel **inclus** + **Importer ma chanson** (ToS).

## Add-on `musicLicense` (hors ToS upload)

La Licence Premium Stingray (39 $) est un **droit plateforme** (SKU panier), pas une attestation user. Elle ne remplace pas le ToS MP3. Voir [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) §4.

---

## Copy ToS (brouillon produit — à valider juridique)

> En important ce fichier, je certifie disposer des droits nécessaires pour un usage personnel dans le cadre de cet hommage. Je comprends qu’Odyssey n’accorde aucune licence sur ce contenu, et que toute publication sur les réseaux sociaux relève de ma seule responsabilité.

EN équivalent à fournir dans `dictionaries/` au moment de l’implémentation.

---

## Hors scope V1

Textes ToS finaux signés avocat · Content-ID monitoring · DMCA automated takedown.
