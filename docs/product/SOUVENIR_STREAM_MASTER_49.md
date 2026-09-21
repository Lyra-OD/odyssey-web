# Souvenir — Stream 0 $ · Master cinéma 49 $ · Moteur cercle

**Type :** canon produit · **Vérité pour :** offre B2B2C Souvenir + player Quiet Luxury + **monétisation / viralité du cercle** (50–200 proches).  
**Statut :** décision CEO 21 sept 2026 · amendé partenaire + encore mieux + **couche croissance** · **C0–C1 livrés** · suite **C2→C14**.  
**Dernière MAJ :** 21 sept 2026 · **Carte :** [`../README.md`](../README.md)

**Changelog** (max 5)
- 21 sept 2026 — **C1** livré : SKU `cinemaMaster` 49 $ · panier · strip Héritage+.
- 21 sept 2026 — **C0** livré : clamp bed + fade audio fin + fade black outro (`payloadBuilder` · `outro.json`).
- 21 sept 2026 — Blindage : double mécène → crédit Fonds ; merci mécène **hors** MP4 (pas de 2ᵉ render) ; lander QR `/stream/[token]` lecture seule + hub.
- 21 sept 2026 — Couche **croissance / cercle** : mécénat, copie post-unlock, Social Cut, QR, notifs ; C11–C14 ; **1** Creatomate.
- 21 sept 2026 — Amendement technique : précalcul ML, MP3 clock, Mode Célébration, pastille salon, 2.5D héros, sync C10.

**Liés :** [`../FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md) · [`../B2B2C_COMMERCE.md`](../B2B2C_COMMERCE.md) · [`../PARTNER_REVSHARE.md`](../PARTNER_REVSHARE.md) · [`../craft/CREATOMATE_RECIPE.md`](../craft/CREATOMATE_RECIPE.md) · [`../SANCTUARY_SKY.md`](../SANCTUARY_SKY.md) · [`../NARRATIVE_SOFT_CAP.md`](../NARRATIVE_SOFT_CAP.md)

---

## Ambition

- **Mondiale** : même offre partout ; Athos = preuve.
- **Quiet Luxury** à l’écran famille — zéro pop-up mid-film opportuniste.
- **Moteur de revenu** : le stream gratuit est le **diffuseur** ; l’argent entre via Master / mécénat / copies / Social Cut / Soft Cap / Héritage / lueurs — **RevShare salon** sur les cash-ins B2B2C.
- Une famille ≠ 1 user : **cercle 50–200**. Le stream qui se ferme sans hub de sortie = valeur perdue.

---

## Décisions figées (produit + cash)

| | |
|--|--|
| Cadeau salon | Stream only ≤50 médias, 2 chapitres, MP3 perso |
| Pastille | *« Séance offerte par [Salon] »* (stream only) |
| Player | MP3 **master clock** · dual `<video>` muted · ML **précalcul upload** · 2.5D **héros** desktop |
| Master famille | SKU **`cinemaMaster` = 49 $** ; Héritage+ inclus |
| Free Creatomate | **Interdit** |
| Comparatif | **Séance live** vs **Archive patrimoniale** |
| **Mécénat** | CTA *« Offrir le Master… · 49 $ »* · unlock + email · RevShare · **race :** 2ᵉ payeur → crédit **Fonds** (pas refund) |
| **Copie invité** | **`guestMasterCopy` 15–19 $** — **seulement si** `cinema_master_unlocked` ; même signed URL ; **0** re-render |
| **Social Cut** | **`socialCut` 19 $** — 9:16 ~30–45 s ; **après** Master ; Quiet Luxury |
| **COGS** | **Un seul** compile Creatomate / projet ; CDN signed URL pour tous ensuite |
| **Merci mécène** | Visible sur **hub + page stream** — **pas** re-render MP4 (carton master intemporel) |
| Sortie hub | Revoir · Lueur · Garder / Offrir Master · Héritage · pay-it-forward · (post-unlock) copie / Social Cut |
| Viralité | QR → `/stream/[projectToken]` lecture seule · notif contributeurs · Mode Célébration · sync C10 |

```mermaid
flowchart TB
  subgraph acquisition [Acquisition cercle]
    qr[QR ceremonie]
    invite[Invitations Coffre]
    notif[Notif seance prete]
  end

  subgraph free [Gratuit]
    stream[Stream Quiet Luxury]
    exit[Hub sortie]
  end

  subgraph cash [Cash-ins]
    gift[Mecenat Master 49]
    family[Famille Master 49]
    copy[Copie invite 15-19]
    social[Social Cut 19]
    heritage[Heritage Soft Cap]
    lueur[Lueurs Fonds]
  end

  subgraph render [COGS]
    once[Un seul Creatomate master]
  end

  qr --> stream
  invite --> notif --> stream
  stream --> exit
  exit --> gift --> once
  exit --> family --> once
  once --> copy
  once --> social
  exit --> heritage
  exit --> lueur
  gift --> revshare[RevShare salon]
  family --> revshare
  copy --> revshare
  social --> revshare
```

---

## Couche croissance — monétisation (ordre business)

### 1. Prioritaire — Offrir le Master à la famille (49 $)
- Bouton élégant sous lecteur / hub / comparatif.
- Checkout invité `cinemaMasterGift` (metadata donateur).
- Effets : email famille « Marc D. a offert… » · `cinema_master_unlocked = true` · RevShare.
- Psychologie : cadeau précis > cagnotte / fleurs.
- **Race double mécène** : voir § Blindage ci-dessous.

### 2. Ensuite — Copie personnelle invité (15–19 $)
- Visible **uniquement si** `cinema_master_unlocked`.
- Download **même** asset via signed URL CDN — marge ~99 % COGS calcul, **0** 2ᵉ render.
- Avant unlock : CTA mécénat seulement (primauté famille / cercle digne).

### 3. Ensuite — Social Cut 9:16 (19 $)
- Pastille 30–45 s ; Quiet Luxury ; après Master.
- Render court ou dérivé ; panneau organique Stories.

### Option digne
Mécénat 49 $ peut inclure **1 copie perso** pour le donateur — toujours **1** compile.

---

## Blindage exécution (verrouillé)

### 1. Double mécène (race 49 $)
- Flag atomique `cinema_master_unlocked` dès paiement réussi #1.
- Paiement #2 dans la même fenêtre : **ni rejet ni refund Stripe** → absorbé en **crédit Fonds** famille (priorité Livre Mémoire 149 $ / Jeton NFC / add-ons), message immédiat :  
  *« Le Master a déjà été offert avec amour par [Prénom]. Votre geste a été crédité au Fonds commémoratif pour offrir [Livre / Jeton / …] à la famille. »*
- Support zéro ; panier moyen ↑ ; éthique intacte.

### 2. « Merci [Prénom] » sans 2ᵉ Creatomate
- **Oui** sur hub de sortie + page stream : *« Cette séance et son archive ont été offertes avec respect par [Prénom]. »*
- **Non** dans le MP4 déjà compilé (éviter invalidation cache / 2ᵉ COGS).
- Carton fin Creatomate **intemporel** : *« Préservé pour les générations futures par le cercle des proches. »* (ou équivalent dictionnaire).

### 3. QR → lander lecture seule
- URL publique `/stream/[projectToken]` (ou équivalent token-safe).
- **Pas** d’inscription, **pas** Wizard Studio.
- Plein écran séance → carton / fade → hub sobre : Revoir · Déposer une pensée / Lueur · (si unlocked) Conserver sa copie · Offrir / Garder Master si pas encore unlocked.

---

## Couche croissance — viralité (rituel, pas spam)

### 1. QR physique cérémonie
- Verso signet / programme : *« Pour revivre la séance et partager vos souvenirs »*.
- Scan → **`/stream/[projectToken]`** lecture seule (voir § Blindage 3).
- Branche Mode Célébration / première sync.

### 2. Notif contributeurs
- Email contributeurs Coffre/Sanctuaire à l’enregistrement : « On vous prévient quand la séance est prête ».
- Envoi sobre quand montage prêt : « L’hommage à [Prénom] prend vie ».
- (Taux d’ouverture « 85 % » = ambition, pas KPI contractuel.)

### 3. Pay-it-forward (hub sortie)
- Une ligne : *« Créé avec respect par Odyssey. Célébrer une vie ou un moment pour vos proches. »*
- Lien B2C soft — **100 % Odyssey** si hors invitation salon.

### Interdits viralité
- Pop-ups mid-séance, countdown, « 3 autres ont acheté », stickers, voix IA gratuites.

---

## Feedback technique partenaire (rappel)

1. ML à l’**upload**, pas au play.  
2. MP3 master clock + dual video Safari.  
3. Copy desktop = **prestige**, pas pénalité mobile.

---

## Wow stream (rappel)

Core + grade + faces métadonnées + souffle MP3 + 2.5D héros + letterbox + pastille salon.  
Détail commits C4–C7 ci-dessous.

---

## Ordre stratégique

1. **C0–C2** — Master digne + cash path 49 $ (plus de free Creatomate).  
2. **C3–C8** — Séance + hub sortie (conversion + lueur + Célébration).  
3. **C9** — QA.  
4. **C10** — Première sync.  
5. **C11–C14** — **Machine cercle** (mécénat → copie → social → QR/notif).  
6. Polish DA Creatomate intro — plus tard.

---

## Commits chirurgicaux

### C0 — Creatomate gate
`fix(creatomate): clamp bed + fade fin film + fade black outro`  
**Done :** ✅ smoke audio + noir fin (21 sept 2026).

### C1 — SKU cinemaMaster 49 $
`feat(pricing): add-on cinemaMaster 49$` + docs grille.  
**Done :** ✅ panier ; skip Héritage+ (21 sept 2026).

### C2 — Gate export
`fix(export): require cinemaMaster or Heritage+`  
**Done :** free Creatomate refusé.

### C3 — Comparatif Séance vs Archive
`feat(wizard): Séance live vs Archive patrimoniale`  
+ prestige ordi + amorce CTA mécénat (copy).  
**Done :** FR/EN ; CTA 49 $.

### C4 — Player core
`feat(wizard): stream core — MP3 clock + dual video + pastille salon`  
**Done :** 2 actes + vidéo ; Safari-smoke audio.

### C5 — Ingest ML
`feat(media): precompute focal and depth on upload`  
**Done :** focale sur asset test.

### C6 — Grade + Ken Burns + souffle
`feat(wizard): grade LUT + metadata Ken Burns + audio fades`  
**Done :** look unifié.

### C7 — 2.5D héros
`feat(wizard): hero 2.5D desktop-only + letterbox`  
**Done :** desktop héros ; mobile plat.

### C8 — Hub sortie + Mode Célébration + pay-it-forward
`feat(wizard): exit hub + Mode Célébration + pay-it-forward`  
- Revoir · Lueur · Garder Master · **Offrir Master** · Héritage · ligne Odyssey B2C.  
- Célébration HDMI.  
**Done :** tunnel + HDMI smoke.

### C9 — QA core path
`test(export): Souvenir stream to cinemaMaster`  
**Done :** checklist § QA core.

### C10 — Première sync
`feat(wizard): shared premiere playhead`  
(+ QR rejoindre lecture seule — stretch).  
**Done :** host + 1 follower sync.

### C11 — Mécénat Master (priorité cash cercle)
`feat(checkout): gift cinemaMaster + double-donor Fonds credit`  
- CTA · Stripe · email · unlock · RevShare.  
- Race : 2ᵉ payeur → crédit Fonds + message (pas refund).  
- Merci mécène sur hub/stream only.  
- Option : 1 copie perso donateur.  
**Done :** 2 checkouts parallèles → 1 unlock + 1 crédit Fonds.

### C12 — Copie perso invité
`feat(export): guestMasterCopy license same asset 15-19$`  
- Gate : `cinema_master_unlocked` ; signed URL ; **pas** de 2ᵉ Creatomate.  
**Done :** refus avant unlock ; OK après ; 1 render log.

### C13 — Social Cut 9:16
`feat(export): socialCut 19$ vertical 30-45s`  
**Done :** MP4 9:16 + checkout post-master.

### C14 — QR lander + notif contributeurs
`feat(growth): /stream/[token] read-only lander + session-ready email`  
**Done :** lander sans wizard ; email contributeur test.

### Plus tard — Creatomate DA intro
Hors chemin critique.

---

## QA checklist

### Core (C9)
- [ ] Stream 2 actes, MP3 clock, pastille salon  
- [ ] Mobile prestige / desktop héros 2.5D  
- [ ] Pas de free Creatomate ; 49 $ → MP4 fade OK  
- [ ] Hub : lueur + Master + Héritage + pay-it-forward  
- [ ] Mode Célébration  

### Cercle (C11–C14)
- [ ] Mécénat → unlock + email + RevShare  
- [ ] Double mécène → crédit Fonds, pas refund  
- [ ] Merci mécène sur hub, **pas** de 2ᵉ render MP4  
- [ ] Copie invité refusée avant unlock ; OK après ; **1** render  
- [ ] Social Cut 19 $ post-master  
- [ ] `/stream/[token]` sans wizard  
- [ ] Notif « séance prête »  
- [ ] Aucun CTA cash mid-séance  

---

## SKUs (grille à brancher C1 / C11–C13)

| ID | Prix | Qui | Creatomate |
|----|------|-----|------------|
| `cinemaMaster` | 49 $ | Famille | 1× render |
| `cinemaMasterGift` | 49 $ | Invité → famille | même 1× (si pas encore) |
| `guestMasterCopy` | 15–19 $ | Invité | 0 (licence) |
| `socialCut` | 19 $ | Famille / invité post-master | render court ou dérivé |

Mettre à jour [`../FREEMIUM_V1_PIVOT.md`](../FREEMIUM_V1_PIVOT.md) § add-ons **au commit C1** (cinemaMaster) puis C11–C13.

---

## Fichiers clés

| Zone | Chemins |
|------|---------|
| Pricing / Stripe | `pricingConfig.ts`, `wizardPricing.ts`, checkout guest |
| Export | `exportGate.ts`, `processExportJob.ts`, entitlements |
| Player / hub | `CinematicTeaser`, `PreviewStep`, exit hub |
| Croissance | lander QR, emails contributeurs, gift checkout |
| Copy | `dictionaries/fr.json`, `en.json` |
| RevShare | webhook amount_total > 0 |
