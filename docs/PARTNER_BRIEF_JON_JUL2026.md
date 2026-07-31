# Odyssey — Partner Brief for Jon (July 2026)

**Confidential partner deep dive · Snapshot 31 July 2026**  
**Audience:** Jon · **Author:** Erik  
**Complements:** [`BUSINESS_CASE_V2.md`](BUSINESS_CASE_V2.md) · [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) · [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md) · [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md) · [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md)

> **Note on numbers:** Family AOV and partner commission figures are **modeled hypotheses** from Business Case V2 (24 July snapshot), not booked revenue. The viral loop flag is still **OFF in production** until the pilot.

---

## 1. Thesis — monetize attachment, not the door

**Old reflex:** pay to start → low starts → empty drafts.  
**Odyssey Freemium V1:** free start → emotional masterpiece → pay to keep / export.

Four engines:

1. **Family packages** — $0 / $179 / $349 / $499 + Quiet Luxury add-ons  
2. **Guest Sanctuary imprints** — when viral is ON → Memorial Fund credit for the family + partner commission on Net  
3. **Partner RevShare** — 30% of Net after 10% platform fee (B2B2C)  
4. **Channel mix** — salons (B2B2C) + open/direct families (B2C)

Partner one-liner:  
*“It costs nothing to start. Guests can help fund the tribute. You earn on Net — including guest spend.”*

---

## 2. Two go-to-market paths (same product spine)

`ChannelProfile` decides how a project starts. **Same Studio / Sanctuary / Soft Cap psychology** — different money rules.

| Path | Who brings the family | Free start | When they pay | Partner RevShare | Top anchor |
|------|------------------------|------------|---------------|------------------|------------|
| **B2B2C (salon)** | Director / partner invite | **Souvenir $0** gift | Soft Cap + checkout (Héritage+) | **Yes** (packages + guest imprints) | Héritage / Éternité |
| **B2C direct** | Family finds Odyssey (web, viral, diaspora) | **Free draft** | **Hard paywall at export** — min **Héritage $179** | No (unless under a tenant deal) | **Légendaire $499** |

**Why both:**

- **B2B2C** = distribution, trust at the funeral home, volume.  
- **B2C** = brand, margin, Légendaire Quiet Luxury anchor, families outside salon networks (including after a Sanctuary link spreads).

We did **not** build two apps — we built one engine with channel-aware billing.

### B2C emotional journey (same Studio, different money moment)

1. Start drafting for free — vault, chapters, Open Book, Sanctuary invites still work.  
2. Fall in love with the film (attachment identical to B2B2C).  
3. Guests can still leave imprints → **Memorial Fund credit** can help cover Héritage (including paths toward a **$0 Rider** when the fund covers the bill).  
4. At **export**, paywall is strict: floor is Héritage **$179**, upsell Éternité **$349** / Légendaire **$499** (Scanner before/after AI is a strong B2C conversion lever toward Éternité+).

---

## 3. Price grid (locked)

### Family packages

| Package | Price | Media | Export | Music |
|---------|------:|------:|--------|--------|
| **Souvenir** | **$0** | 50 | 1080p | Stingray **preview only** (not exported) + personal MP3 (ToS) |
| **Héritage** | **$179** | 125 | **1080p** | Official Stingray catalog **included** |
| **Éternité** | **$349** | 175 | **4K** | Same + full AI + 50-year vault |
| **Légendaire** | **$499** | — | B2C Quiet Luxury anchor | Top of pyramid |

### Family add-ons (examples)

| Add-on | Price |
|--------|------:|
| Stingray music license (stay on Souvenir) | **$39** |
| Story Voice (AI narration) | **$39** |
| Sanctuary NFC/QR token | **$79** |
| AI retouch (à la carte) | **$49** |
| Digital vault 50y (à la carte) | **$99** |
| Memory Book (POD) | **$149** |

### Guest Sanctuary imprints

Tunnel: **free deposit first** → then paid imprint.

| Imprint | Price | Role |
|---------|------:|------|
| **Lueur** (presence) | **$19** | Secondary — never primary CTA |
| **Voice in the film** | **$69** | Core emotional + commercial anchor |
| **Live video testimony** | **$119** | In-app camera (not gallery dump) |
| **Co-production** | **$129** | Higher commitment |
| **Patron (Mécène)** | **$150–1000** (suggest **$250**) | Asymmetry / big heart |

**Waterfall (freemium tenant):** 10% platform fee → partner **30% of Net** → **100% of Net** also becomes **Memorial Fund product credit** for the family (Odyssey carries that credit on margin).

Example **$69** voice: Net $62.10 → partner ~$18.63 · family credit $62.10.

Guest media sit **outside** Soft Cap 50 (they don’t burn the family quota).

Unit partner take on packages (B2B2C runtime): Héritage **~$48.33** · Éternité **~$94.23** per paid checkout.

---

## 4. Freemium emotional journey (Step 1 → checkout)

Seven beats — not a pricing page.

### Beat A — Entry (zero friction)

- Partner invites **without burning tokens** (token system purged).  
- B2B2C starts as **Souvenir gift**; B2C starts as **free draft**.  
- Branding: Sanctuary / Quiet Luxury — not “video editor signup.”

### Beat B — Deposit memories (Step 3 Vault)

- Upload, social sources, (next) **Scanner Companion** for paper albums.  
- Attachment begins: “Mom’s photos live in one sacred place.”

### Beat C — Structure the story (Step 4)

- Chapters + music (Stingray + personal MP3).  
- On Souvenir, picking a **licensed** track opens a **dual Soft Cap**:  
  - **$39 license** (stay free tier), or  
  - **Upgrade Héritage $179** (catalog included + more media).

### Beat D — Open Book montage (Step 5)

- **All chapters visible** (no single-tab blindness).  
- Magic Composition can place media.  
- Soft Cap **main moment** after Magic Composition: “N memories woven…” → Héritage feels like protecting the work, not buying a feature.

### Beat E — Invite the circle

- Family shares Sanctuary link / QR.  
- Guests leave a free memory, then may buy an imprint.  
- **Co-Creator** lets trusted people help fill the vault → more completion → more Soft Cap → better Héritage+ conversion (no extra SKU).

### Beat F — Intended package vs paid entitlements

- `grantedPackage` = what was gifted (often $0).  
- `intendedPackage` = what they’re building toward (can rise before card).  
- Paid **entitlements** only after Stripe webhook — never trust the browser for 4K / master music / full AI.

### Beat G — Checkout / export

- Extensions at checkout (cleaner wizard).  
- Memorial Fund can offset Héritage (including **$0 Rider** when fund covers it).  
- **B2C:** hard **export paywall** (min Héritage $179).  
- **B2B2C:** Soft Cap + checkout inside the partner story.  
- Creatomate export spiked; production hardening ongoing.

**Why better than June:** we sell a film they already feel — then ask them to keep it. Guests become a second wallet that *helps* the family.

---

## 5. Basket / AOV — modeled numbers

**Volume frame (partner ask):** 1 salon · **3,000 families / year** · **250 / month** · 100% B2B2C mix in this model · partner ≈ **27% of GMV** (= 30% of Net after 10% fee).

### Paying-family AOV

`AOV ≈ (share_H × $179) + (share_E × $349) + avg_addons`

| Scenario | Paid conversion | H / E mix | Avg add-ons | **AOV paying family** |
|----------|----------------:|-----------|------------:|----------------------:|
| Conservative | 35% | 75/25 | $12 | **≈ $234** |
| **Base** | **50%** | **60/40** | **$28** | **≈ $275** |
| Optimistic | 65% | 45/55 | $45 | **≈ $318** |

Design target: **~$275 Base AOV** — Quiet Luxury, not race-to-bottom.

### Guest layer (viral ON only)

| Scenario | Viral share of projects | Guest ARPU / viral project |
|----------|------------------------:|---------------------------:|
| Conservative | OFF | $0 |
| Base | 30% | **≈ $96** |
| Optimistic | 80% | **≈ $238** |

### Monthly / annual (1 salon, 3,000 families) — hypotheses

| Metric | Conservative | Base | Optimistic |
|--------|-------------:|-----:|-----------:|
| Family GMV / mo | ~$20.4k | ~$32.4k | ~$39.1k |
| Guest GMV / mo | $0 | ~$7.2k | ~$47.5k |
| **Total GMV / mo** | **~$20.4k** | **~$39.6k** | **~$86.6k** |
| **Partner commission / mo** | **~$5.5k** | **~$10.7k** | **~$23.4k** |
| Partner commission / yr | ~$66k | ~$128k | ~$280k |
| Total GMV / yr | ~$245k | ~$475k | ~$1.04M |

**How to read it:**

- Without viral: Soft Cap → Héritage is the safe lever.  
- With viral pilot: guest imprints can roughly **double** Base GMV and drive Optimistic upside — while funding family credit.  
- B2C direct sits **beside** this salon model as a second acquisition + margin rail (Légendaire, export paywall, Scanner upsell to Éternité+).

Full tables: [`BUSINESS_CASE_V2.md`](BUSINESS_CASE_V2.md).

---

## 6. Sanctuary → Sky (differentiation that protects AOV)

Commerce needs an experience people **forward**.

**Locked vision** ([`SANCTUARY_SKY.md`](SANCTUARY_SKY.md)):

- Free deposit stays simple (“Add a memory”).  
- **One star = one memory**; **pure Lueur at the center**; memories as satellites.  
- Guests don’t edit film acts in space.  
- Family bridge (plain English): **Put in the film** / **Keep only here** / **Remove from the sky**.  
- Rule: *sky keeps everything; film chooses* (memory stays in the sky when welcomed into the film).

WebGL galaxy base secured (`test-ciel`, commit `6ded642`). Next: polish milky way → sky as Sanctuary background + “See the sky” → tap reveals photo → family review inbox.

**Commercial effect:** more shares → more guest visits → more imprint attach → Memorial Fund + partner guest commission — without turning Studio into chaos.

---

## 7. Mobile — what we’re optimizing

We are **not** building a second mobile app or `/wizard-mobile` (double debt, broken autosave).

**One Next.js wizard · three postures:**

| Posture | Device | Job |
|---------|--------|-----|
| **Capture** | Phone | Drop memories — Step 3 + Scanner |
| **Light composition** | Phone | Tap / Magic — Step 5 lite |
| **Full composition** | Desktop ≥1024 | Open Book + DnD |
| Forms / checkout | All | Steps 1–2, 4, 6–7 |

**Rule:** phone captures; desktop composes & pays. Same `project_id` + autosave.

**Honest July audit:** Steps 1–2 / 6–7 mostly fine; Step 3 Scanner not fully live; **Step 5 Open Book is weak on phone** (bank scroll, desktop DnD, hover-only).

**Roadmap (M0–M6):** thumb-zone CTAs, Step 5 dock, tap-first actions, diaspora-friendly phone help without breaking the desktop masterpiece — [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md).

---

## 8. Scanner Companion — killer capture (web PWA, not App Store)

**Problem:** paper albums don’t belong in a desktop dropzone.  
**Solution:** phone scans via QR → web PWA camera → crop → lands in the tribute grid live → **AI before/after** preview → emotional proof → upsell **Éternité $349** / **Légendaire $499**.

| Tier | Scanner | Full AI restore |
|------|---------|-----------------|
| Souvenir / Héritage | Limited demo | No (upsell hook) |
| Éternité / Légendaire | Full | Yes |

**Status:** honest “Coming soon” placeholder in Step 3 (no fake live session). Full QR + async guest/diaspora scanning is the next major ingestion build — [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md).

This is how we beat legacy “scanner-only” tools: **capture + film + Sanctuary money loop** in one system.

---

## 9. What’s better since late June (compressed)

| Then | Now |
|------|-----|
| Partner token friction | Freemium invite + RevShare-only partner economics |
| Pay-first mental model | Attachment → Soft Cap → Héritage / export paywall |
| B2B2C-only story | **B2B2C + B2C direct** on one spine |
| Tab / timeline montage | Open Book + Magic Composition |
| No guest commerce surface | Sanctuary + imprints + Memorial Fund wiring |
| Candle / orb experiments | Canon sky: stars-as-memories + Lueur core |
| Mobile = shrunk desktop | Explicit 3-posture plan + Scanner as killer capture |

**Still ahead:** viral pilot ON, Scanner live, mobile Step 5 lite, sky dual-mode + star reveal + family “Put in the film” inbox, Creatomate production hardening.

---

## 10. Platform leverage — same backend, other fronts

The **backend is vertical-agnostic by design** (tenants, media, storyboard, checkout saga, RevShare ledgers, guest tokens, entitlements). We deliberately **do not hardcode “funeral only”** into the commerce core — see [`VISION_PHASE_2.md`](VISION_PHASE_2.md) and [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) (backend agnosticism).

That means we can:

1. Keep deepening the **funeral Sanctuary** front (sky, Quiet Luxury, imprints, paper Scanner).  
2. **Reuse the same backend** and re-skin the **frontend emotional journey** for other high-emotion markets, e.g.:
   - **Pets / animal memorials**
   - **Weddings** (circle contributes + film + paid keepsakes)
   - **Events / celebrations** beyond traditional funeral

What changes per vertical is mostly **language, packaging, and SKU storytelling** — not a second Stripe / media / storyboard stack.

**Why it matters:** every dollar spent hardening Freemium, Sanctuary, Soft Cap, mobile capture, and export **compounds across verticals**. Funeral is the beachhead; **the platform is the asset**.

---

## 11. One slide for the conversation

1. **Free start** → emotional masterpiece (B2B2C Soft Cap *or* B2C export paywall).  
2. **~$275 Base AOV** paying family (modeled) + guest ARPU when viral is on.  
3. **~$11k / mo partner commission Base** at 3,000 families/year (hyp.) — **~$23k** optimistic with viral.  
4. **Phone captures** (gallery + Scanner); **desktop composes**; Sanctuary turns guests into helpers + revenue.  
5. Sky makes it unforgettable without breaking film craft.  
6. **Same backend → new fronts** (pets, weddings, events) without rebuilding the money/media machine.

---

## Related docs

| Topic | Doc |
|-------|-----|
| Business case / AOV scenarios | [`BUSINESS_CASE_V2.md`](BUSINESS_CASE_V2.md) |
| Freemium canon | [`FREEMIUM_V1_PIVOT.md`](FREEMIUM_V1_PIVOT.md) |
| Sanctuary monetization | [`SANCTUARY_STRATEGY.md`](SANCTUARY_STRATEGY.md) |
| Sky / stars-as-memories | [`SANCTUARY_SKY.md`](SANCTUARY_SKY.md) |
| Mobile postures | [`MOBILE_WIZARD_STRATEGY.md`](MOBILE_WIZARD_STRATEGY.md) |
| Scanner Companion | [`SCANNER_COMPANION.md`](SCANNER_COMPANION.md) |
| Partner report (July) | [`PARTNER_REPORT_JUL2026.md`](PARTNER_REPORT_JUL2026.md) |
