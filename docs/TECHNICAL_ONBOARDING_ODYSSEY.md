# Odyssey Frontend - Onboarding Technique

Ce document permet a n'importe quel developpeur (frontend, backend, DevOps, QA) d'arriver sur le projet et de comprendre rapidement:
- ce qui est deja implemente,
- comment l'architecture fonctionne,
- comment lancer/tester localement,
- et quelles sont les prochaines etapes.

---

## 1) Contexte du projet

Odyssey est une application Next.js 14 (App Router) avec:
- une experience "Studio" (dashboard + wizard de creation de tribute),
- une ingestion media massive (photos/videos) vers Supabase Storage,
- une base de paiement Stripe "Stripe-First",
- un webhook Stripe robuste avec idempotence forte (pattern lock token).

La logique metier vise un modele hybride:
- B2C (famille paie directement),
- B2B2C (partenaire pre-paie la base, famille paie les upsells).

---

## 2) Stack technique

- **Framework web**: Next.js 14 (App Router), React 18, TypeScript
- **UI**: Tailwind CSS, lucide-react, framer-motion
- **Auth/Data/Storage**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Paiement**: Stripe (`stripe` SDK serveur)
- **Upload client**: react-dropzone (via adaptateur headless)
- **i18n**: dictionnaires JSON `dictionaries/fr.json` et `dictionaries/en.json`

---

## 3) Structure utile du repo (partie active)

- `app/`: routes Next.js App Router (pages + API routes)
- `app/api/stripe/webhook/route.ts`: webhook Stripe central
- `app/auth/callback/route.ts`: callback auth Supabase
- `src/components/tribute/TributeWizard.tsx`: wizard principal (4 etapes)
- `src/components/media/MediaDropzoneAdapter.tsx`: adaptateur headless dropzone
- `src/hooks/useMassMediaUpload.ts`: orchestration state upload
- `src/lib/uploads/mediaUploadService.ts`: service upload concurrent + persistence
- `lib/stripe.ts`: client Stripe singleton
- `scripts/`: scripts de diagnostic/test Stripe & webhook
- `dictionaries/`: traduction FR/EN des labels UX

---

## 4) Fonctions deja implementees

### 4.1 Auth + session
- Login avec metadata utilisateur (nom, telephone, consentement marketing).
- Callback auth robuste vers dashboard.
- Dashboard protege et coherent avec l'experience Studio.

### 4.2 Tribute Wizard (UX + logique)
- Wizard en **4 etapes**:
  1. Essentials
  2. Social Sources
  3. Local Media
  4. Musical Ambiance
- Integration de l'etape upload avec composants headless.
- Etat de progression et validation metier dans le flux.

### 4.3 Upload massif media (robuste)
- Upload direct navigateur -> Supabase Storage (`user-assets` bucket).
- Worker pool concurrent (uploads paralleles), retries, gestion erreurs.
- Insertion DB idempotente avec `upsert` + `onConflict` pour eviter doublons.
- Hook React dedie pour exposer:
  - queue d'uploads,
  - progression globale,
  - actions `start`, `retryFailed`, `cancel`, `clear*`.

### 4.4 Stripe webhook (production-grade)
- Verification de signature Stripe.
- Pattern **Atomic Lock Token & Process** sur `webhook_events`.
- Re-check strict, TTL configurable, protection anti double-traitement.
- Transitions d'etat conditionnelles avec verification `rows_affected === 1`.
- Ecriture DB via client Supabase admin (service role) uniquement.
- Sync `billing_catalog` depuis `product.*` et `price.*`.
- Logs structures + helper de serialisation erreur (`serializeError`).

---

## 5) Modeles de donnees (vision appliquee)

Tables principales impliquees:
- `projects`: statut projet + contexte acquisition/partenaire + capacites
- `orders`: details paiement base/upsells + snapshot pricing + session Stripe
- `billing_catalog`: cache local des produits/prix Stripe (source de verite Stripe)
- `webhook_events`: idempotence, lock token, statut de traitement, erreurs
- `media_assets` (utilisee par ingestion): assets lies au projet

Points importants:
- Gestion des statuts projets et extension propre des ENUMs.
- Contraintes d'unicite sur ids Stripe critiques (ex: checkout session).
- Modele compatible B2C et B2B2C sans casser le schema principal.

---

## 6) Variables d'environnement critiques

Variables necessaires cote serveur:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (front)

Bonnes pratiques:
- Ne jamais commiter de secret.
- Eviter espaces/quotes parasites dans `.env.local`.
- Repliquer les memes variables dans Vercel (les env locales ne montent pas automatiquement).

---

## 7) Scripts disponibles (diagnostic et tests)

Dans `scripts/`:
- `check-stripe-auth.ts`: test rapide auth Stripe (sanity check)
- `test-odyssey-sync.ts`: creation de donnees Stripe de test + signature valide
- `stress-test-webhook.ts`: simulation de concurrence webhook

Objectif:
- valider les credentials,
- valider le parsing/signature,
- valider l'idempotence sous charge parallele.

---

## 8) Lancer le projet localement

### 8.1 Installation
```bash
npm install
```

### 8.2 Developpement
```bash
npm run dev
```

### 8.3 Build de verification (comme Vercel)
```bash
npm run build
```

Le build local doit passer avant tout push de release.

---

## 9) Deploiement Vercel - check rapide

Pour que les pushes GitHub declenchent un deploy:
1. Projet Vercel connecte au bon repo (`Lyra-OD/odyssey-web`)
2. Branche de production = `main`
3. App GitHub Vercel autorisee sur le repo/organisation
4. Variables d'environnement configurees dans Vercel

Si "No git repositories found": c'est en general un probleme de permissions GitHub App (pas de code).

---

## 10) Etat actuel et prochaines etapes

### Fait
- Auth + callback + dashboard en place.
- Wizard 4 etapes + etape media integree.
- Pipeline upload massif headless implemente.
- Webhook Stripe robuste (lock token, TTL, idempotence, logs).
- Scripts de verification disponibles.

### A terminer / consolider
- Route checkout Stripe complete (creation session base + upsells).
- Enqueue rendu video (Creatomate/worker) apres paiement confirme.
- Suite de tests automatique (unit + integration webhook/checkout).
- Monitoring centralise (traces/alerting) et tableaux de bord d'exploitation.
- Documentation SQL "source de verite" versionnee (migrations finalisees).

### A developper - Upsells dans le wizard (parcours produit)

Objectif: enrichir le Tribute Wizard avec des options payantes coherentes avec le modele **Stripe-First** et le mix **base + upsells** (B2C / B2B2C).

**Exemples d'upsells a concevoir dans l'UX et brancher au catalogue Stripe:**

| Upsell (concept) | Role UX | Notes techniques / conformite |
|------------------|---------|--------------------------------|
| **Retouche photo / video assistee par IA** | Etape dediee ou bloc optionnel apres selection des medias (qualite, stabilisation, restauration legere, etc.) | Prix Stripe par niveau ou par lot; flags projet (`ai_enhancement_*`); job async post-upload si besoin. |
| **Musique premium / bande son etendue** | Etendre l'etape "Musical Ambiance" avec tires payants | Alignement `billing_catalog` + metadata `odyssey_code`; respect du modele hybride (base prepayee partenaire vs upsell famille). |
| **Frais droits d'auteur / licence musicale** | Ligne claire au checkout ou sous-etape "Licence" lors du choix musique tierce | Snapshot pricing dans `orders` / metadata legale; pas de melange avec des prix "creatifs" sans licence. |
| **Sources tierces (YouTube, reseaux, Google Photos)** | Si l'utilisateur importe depuis YouTube ou URLs: **signature de responsabilite / declaration** | Checkbox obligatoire + horodatage + stockage sur `projects` (metadata ou colonnes dediees); copy i18n FR/EN; bloquer le passage suivant sans acceptation. |
| **Autres upsells** | Packaging HD, duree video etendue, rush delivery, copies supplementaires, cartes imprimees, etc. | Meme principe: ligne Stripe identifiable, trace dans `orders.upsell_breakdown`, pas de logique en dur hors catalogue. |

**Principes d'implementation:**
- Chaque upsell vendable = **Price Stripe** reference dans `billing_catalog` avec metadata stable (`odyssey_code`, `item_type`).
- Le wizard affiche et valide les options; le serveur reconstruit la session Checkout a partir du catalogue (pas de prix client-only).
- Les acceptations legales (YouTube, droits image, musique) restent **persistees** et liees au `project_id`.

Detail complet des autres chantiers: voir aussi **A terminer / consolider** ci-dessus.

### A developper - Securite et resilience (objectif maximal, pas de promesse absolue)

**Portee:** ce bloc documente **uniquement** la roadmap et l'ordre de priorite — **aucune implementation n'est engagee ni commencee par ce document.**

**Constat honnete:** aucun systeme connecte n'est mathematiquement **impénétrable**. L'objectif produit est une posture **defense en profondeur**: reduire la surface d'attaque, limiter l'impact d'un incident, detecter et reagir vite.

**Principe directeur:** les attaquants ciblent surtout **sessions**, **donnees d'autres utilisateurs**, **paiements**, **uploads**, **webhooks**, **secrets**. La defense repose sur **couches cumulees**: auth + RLS + autorisation serveur + validation + limitation d'abus + secrets + observabilite.

#### Ordre de priorite — P0 (essentiel / bloquant pour une prod serieuse)

Ces points sont les **fondations**; sans eux, le risque jurisprudentiel et technique reste eleve.

1. **RLS Supabase** sur toutes les tables exposees aux utilisateurs (`projects`, `media_assets`, `orders`, etc.) avec policies basees sur **`auth.uid()`** et **propriete du projet** (pas seulement "utilisateur connecte").
2. **Autorisation serveur** sur chaque Route Handler / Server Action: le serveur verifie que le `project_id` (et tenant si applicable) **appartient** a l'utilisateur ou au partenaire autorise — le front ne fait pas foi.
3. **Paiements Stripe**: webhook **uniquement** avec signature verifiee; **aucun** montant ou ligne de panier entierement forge cote client sans reconciliation avec **`billing_catalog`** / Stripe.
4. **Secrets**: cle **service role** Supabase et **Stripe secret** uniquement cote serveur et dans les env deploy (Vercel); jamais dans le bundle client ni dans Git.
5. **Stockage medias**: politiques Storage alignees sur **projet / utilisateur / tenant**; eviter un bucket trop ouvert en lecture publique pour du contenu sensible.

#### Ordre de priorite — P1 (fort gain / effort raisonnable, apres P0)

6. **Validation des entrees** sur toutes les APIs (schemas type Zod): IDs, URLs tierces (YouTube), metadonnees wizard.
7. **Rate limiting** sur endpoints sensibles (login, sessions, uploads massifs, checkout, endpoints de test hors prod).
8. **Headers HTTP** (`Strict-Transport-Security`, `Content-Security-Policy` progressive, anti-clickjacking) via `next.config` / middleware — en evitant de casser Supabase/Stripe en prod.
9. **Journalisation** structuree des evenements sensibles (echecs auth, refus d'acces, erreurs webhook) **sans** corps de fichiers ni secrets dans les logs.
10. **Dependances**: `npm audit`, Dependabot ou equivalent, politique de patchs critiques pour Next/React et libs auth.

#### Ordre de priorite — P2 (durcissement continu / maturite)

11. **MFA** pour comptes admin / studio internes (roadmap; pas forcement tous les clients au jour 1).
12. **Pentest** ponctuel ou **bug bounty** cible avant forte exposition commerciale ou volume.
13. **Plan d'incident**: rotation des cles, revocation tokens, communication interne, procedure de gel tenant/partenaire.

#### Reference transversale par domaine (meme contenu, vue thematique)

| Domaine | Lien prioritaire |
|---------|------------------|
| Identite et session | P0 (RLS + auth serveur); P2 MFA |
| Base et acces donnees | P0 RLS + service role isole webhooks/jobs |
| Stockage medias | P0 Storage policies |
| API Next.js | P0 autorisation; P1 validation |
| Limitation d'abus | P1 rate limiting |
| Paiements Stripe | P0 webhook + catalogue |
| Navigateur et transport | P1 headers |
| Secrets et configuration | P0 secrets |
| Dependances | P1 supply chain |
| Observabilite et reponse | P1 logs; P2 playbook |
| Verification externe | P2 pentest / OWASP ASVS cible |

---

## 11) Vision produit extensible (multi-skins, moteur unique)

La direction produit inclut explicitement une strategie de reutilisation:
- conserver **un moteur metier unique** (auth, ingestion media, paiement, orchestration rendu),
- exposer **plusieurs experiences visuelles (skins)** selon la cible,
- adapter le wording, le branding, et certains parcours sans dupliquer la logique coeur.

Exemple cible de diversification:
- segment "hommages pour animaux" avec UX, ton editorial et assets dedies,
- tout en re-utilisant le pipeline technique existant (wizard, uploads, Stripe, webhook, rendu).

Implications techniques:
- separer strictement la couche "theme/branding/copy" de la couche "business logic",
- parametrer les variantes par configuration (dictionnaires, flags, catalog produit, templates),
- eviter le fork de code pour garder vitesse de delivery et maintenance faible.

---

## 12) Isolation des medias entre cibles (point critique)

Objectif:
- garantir qu'un media importe pour une cible (ex: animaux) ne puisse jamais etre melange avec une autre (ex: famille, mariage, fete).

Etat actuel:
- l'isolation est forte par `project_id` (storage path `projects/<project_id>/...` + colonne `project_id` en DB),
- `tenant_id` est supporte dans le pipeline upload, mais reste optionnel selon l'appel.

Regles a respecter pour la suite multi-cibles:
1. Rendre le contexte cible explicite a chaque upload (au minimum `project_id`, idealement `tenant_id` + `target_vertical`).
2. Etendre le chemin storage pour inclure la cible/tenant quand la verticale sera active (ex: `targets/<vertical>/tenants/<tenant_id>/projects/<project_id>/...`).
3. Ajouter des contraintes DB/uniques et policies RLS coherentes avec cette segmentation.
4. Interdire les lectures cross-cibles au niveau API et policy, meme en cas d'erreur de front.
5. Ajouter des tests d'integration "anti-mixage" (imports paralleles sur cibles differentes).

---

## 13) Regles d'equipe recommandees

- Toujours valider `npm run build` avant merge.
- Toute ecriture webhook doit rester idempotente et conditionnelle.
- Toute operation sensible DB cote serveur doit utiliser le client admin approprie.
- Ne pas modifier la logique lock/TTL sans revue architecture.
- Conserver la separation:
  - UI (presentation),
  - headless adapters/hooks (orchestration),
  - services (I/O reseau/DB).

---

## 14) Notes importantes

- Le `README.md` racine donne le quickstart et resume la vision; le detail architecture et roadmap est dans ce document (`docs/TECHNICAL_ONBOARDING_ODYSSEY.md`).

