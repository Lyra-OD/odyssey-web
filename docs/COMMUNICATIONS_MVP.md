# Odyssey — Communications MVP

**Type :** canon · **Vérité pour :** copy FR/EN du pilote (courriels + texte directeur).  
**Dernière MAJ :** 17 août 2026 · **Carte :** [`README.md`](README.md)

**Changelog** (max 5)
- 17 août 2026 — toutes les pièces MVP rédigées FR + EN (gant blanc).
- 17 août 2026 — inventaire MVP figé (relance, Stripe, Auth, lead `/partners`, texte directeur, checklist Resend).

Complète [`HQ_ODYSSEY.md`](HQ_ODYSSEY.md) · [`B2B2C_COMMERCE.md`](B2B2C_COMMERCE.md) · [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md).

**Ton :** gant blanc. Le **salon** signe. Odyssey reste discret.  
**Interdit partout (FR et EN) :** prix, `$`, forfait, « offert », « upgrade », « last chance », « relance », urgence, promo.

Chaque pièce famille a **les deux langues**. Le code relance lit `metadata.locale` (`fr` | `en`). Hors-code : le directeur choisit la langue de la famille.

**Hors MVP :** e-mail à la création d’invitation · drip · Co-Créateur · Sanctuaire · « film prêt » · bienvenue post-accept · avis de versement. Lien copié, pas Odyssey.

`{salon}` `{lien}` `{organization}` = variables. Ne pas les laisser dans un envoi réel.

---

## 1. Relance manuelle (Resend)

| | |
|--|--|
| **Déclencheur** | Directeur — **Envoyer le rappel** |
| **Quand** | `pending` ≥ 3 j et pas encore `follow_up_sent_at` |
| **Max** | Un envoi. Pas de cron. |
| **Code** | `src/lib/email/partnerFollowUpCopy.ts` |

### Français

```
Objet : {salon} vous a préparé un espace privé

Bonjour,

Il n’y a rien à précipiter. {salon} a ouvert pour vous un lieu discret,
pour raconter une histoire quand vous serez prêts.

Ce lien est personnel. Il demeure ouvert 14 jours.

{lien}

Avec soin,
{salon}
```

### English

```
Subject: {salon} prepared a private space for your family

Hello,

There is no hurry. {salon} opened a quiet place for you —
to tell a story when you are ready.

This link is personal. It remains open for 14 days.

{lien}

With care,
{salon}
```

Tests : `tests/business/partner-follow-up-email.test.ts` — pas de `$` / 179 / last chance.

---

## 2. Reçu d’achat (Stripe)

Odyssey **ne rédige pas** le corps du reçu. Stripe le génère. Config dashboard : Branding + Customer emails (Receipts ON, Successful payments ON, **pas** de promo).

Si un pied de page libre existe :

| FR | EN |
|----|-----|
| Merci. Votre espace reste privé. | Thank you. Your space remains private. |

Pas de pitch Sanctuaire, pas de forfait.

---

## 3. Gabarits Supabase Auth

Dashboard → Authentication → Email Templates. Les trois portes (Studio / Salon / HQ) partagent Auth : copy **neutre**.

`{{ .ConfirmationURL }}` / `{{ .Token }}` = variables Supabase. Ne pas les traduire.

### 3.1 Confirmer l’inscription — famille

**Français**

```
Objet : Confirmez votre accès Odyssey

Bonjour,

Une dernière étape pour ouvrir votre espace.
Ce lien est personnel.

{{ .ConfirmationURL }}

Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.
```

**English**

```
Subject: Confirm your Odyssey access

Hello,

One last step to open your space.
This link is personal.

{{ .ConfirmationURL }}

If you did not ask for this, you can ignore this message.
```

### 3.2 Magic link

**Français**

```
Objet : Votre lien de connexion Odyssey

Bonjour,

Voici votre lien pour entrer dans votre espace.
Il expire bientôt. Il est personnel.

{{ .ConfirmationURL }}

Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.
```

**English**

```
Subject: Your Odyssey sign-in link

Hello,

Here is your link to enter your space.
It expires soon. It is personal.

{{ .ConfirmationURL }}

If you did not ask for this, you can ignore this message.
```

### 3.3 Réinitialiser le mot de passe

**Français**

```
Objet : Réinitialiser votre mot de passe Odyssey

Bonjour,

Vous avez demandé à choisir un nouveau mot de passe.
Ce lien est personnel.

{{ .ConfirmationURL }}

Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.
Votre mot de passe actuel reste inchangé.
```

**English**

```
Subject: Reset your Odyssey password

Hello,

You asked to choose a new password.
This link is personal.

{{ .ConfirmationURL }}

If you did not ask for this, you can ignore this message.
Your current password stays the same.
```

### 3.4 Inviter un compte Salon (provision manuelle)

URL **`/salon/connexion`**, jamais `/studio`.

**Français**

```
Objet : Votre accès à l’espace partenaires Odyssey

Bonjour,

Votre espace salon est prêt.
Connectez-vous ici — sans inscription publique.

{{ .ConfirmationURL }}

Si ce message ne vous était pas destiné, prévenez-nous simplement.
```

**English**

```
Subject: Your Odyssey partner space

Hello,

Your salon workspace is ready.
Sign in here — there is no public registration.

{{ .ConfirmationURL }}

If this was not meant for you, just let us know.
```

---

## 4. Lead `/partners` → HQ (interne)

Formulaire aujourd’hui mort. Slice D. Pas un mail famille. Accusé auto vers le salon : **hors MVP**.

### Français

```
Objet : Lead salon — {organization}

Un salon a écrit depuis le formulaire partenaires.

Organisation : {organization}
Contact : {contactName}
E-mail : {email}
Téléphone : {phone}
Région : {region}
Contexte : {context}

Message :
{message}
```

### English

```
Subject: Salon lead — {organization}

A salon wrote in from the partners form.

Organization: {organization}
Contact: {contactName}
Email: {email}
Phone: {phone}
Region: {region}
Context: {context}

Message:
{message}
```

---

## 5. Texte du directeur (hors-code)

Odyssey n’envoie **pas** l’invitation initiale. Le directeur colle ceci **avec** le lien copié dans Salon.

### Français

```
Bonjour,

Nous avons ouvert pour vous un espace privé, pour raconter l’histoire
quand vous serez prêts. Rien n’est public. Rien n’est urgent.

Voici le lien, personnel, valable 14 jours :

{lien}

Si quelque chose bloque, appelez-nous au salon — nous sommes là.
```

### English

```
Hello,

We opened a private space for your family, to tell the story
when you are ready. Nothing is public. Nothing is urgent.

This link is personal. It is valid for 14 days:

{lien}

If anything feels unclear, call us at the salon — we are here.
```

Le **salon** signe. Pas de logo Odyssey en héros.

---

## 6. Hors MVP

| Pièce | Pourquoi on attend |
|-------|-------------------|
| E-mail invitation initiale | Le directeur tend le lien (texte §5). |
| Relance n°2 / drip | Une relance humaine, pas une machine. |
| Co-Créateur / Sanctuaire par mail | Lien copié dans le wizard. |
| « Votre film est prêt » | Statut wizard ; export encore 🟡. |
| Bienvenue post-accept | Redirect `/tribute/welcome`. |
| Avis de versement salon | Payout HQ d’abord. |
| Onboarding Salon | Provision + gabarit §3.4. |

---

## 7. Checklist d’envoi (production)

Sans Resend, **Envoyer le rappel** → 503 `email_not_configured`.

| Étape | Où |
|-------|-----|
| Compte Resend | resend.com |
| Domaine vérifié | DNS SPF + DKIM |
| `RESEND_API_KEY` | `.env.local` **et** Vercel (serveur) |
| `RESEND_FROM_EMAIL` | `Nom <bonjour@domaine-vérifié>` — pas `@gmail` |
| Redeploy | Après les env |
| Test sans domaine | Resend → seulement l’e-mail du compte Resend |
| Invitation test | `pending` + créée il y a ≥ 4 jours |
| Clic | `/salon/mes-performances` → inbox FR **et** EN (selon `locale`) |
| Lien | `/invite/accept?token=` |
| Stripe | Branding + receipts ON |
| Supabase | Coller §3 FR ou EN selon le projet (ou deux templates si un jour i18n Auth) |

Hub env : [`TECHNICAL_ONBOARDING_V1.md`](TECHNICAL_ONBOARDING_V1.md).

---

## 8. Où ça vit

| Pièce | FR + EN figés ici | Code / outil |
|-------|-------------------|--------------|
| Relance §1 | Oui | `partnerFollowUpCopy.ts` — **même texte** |
| Reçu §2 | Pied de page seulement | Stripe Dashboard |
| Auth §3 | Oui | Supabase Email Templates |
| Lead §4 | Oui | Slice D |
| Directeur §5 | Oui | Copier-coller (légende UI plus tard, optionnel) |
