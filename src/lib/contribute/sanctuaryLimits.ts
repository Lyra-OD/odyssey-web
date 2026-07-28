/**
 * Plafonds dépôt Sanctuaire (canon produit — juil. 2026).
 * Source : docs/IMPLEMENTATION_CASCADE_VFINAL.md · FREEMIUM_V1_PIVOT.md
 *
 * Quiet Luxury : 1er geste rapide (photo|mot) ; aide famille plafonnée ;
 * témoignage live ≠ mini-clip fichier.
 */

/** Dépôt gratuit rituel : exactement une empreinte gratuite (photo OU mot). */
export const SANCTUARY_FREE_DEPOSIT_SLOTS = 1;

/**
 * Photos max par invité (lien public), hors Soft Cap famille.
 * Inclut la photo du dépôt gratuit si choisie.
 */
export const SANCTUARY_GUEST_PHOTO_MAX = 5;

/**
 * Messages texte max par token contribute (anti-spam storage).
 * Distinct du plafond photos.
 */
export const SANCTUARY_GUEST_MESSAGE_MAX = 10;

/**
 * Sessions Stripe checkout `pending` max simultanées par token contribute.
 * Limite le spam de sessions / coût API Stripe.
 */
export const SANCTUARY_GUEST_PENDING_CHECKOUT_MAX = 5;

/** Mini-clip fichier (souvenir) — durée max secondes. */
export const SANCTUARY_MINI_CLIP_MAX_SECONDS = 30;

/** Mini-clip fichier — max par invité (Phase 3b). */
export const SANCTUARY_MINI_CLIP_MAX_PER_GUEST = 1;

/**
 * Empreinte `guest_video` (119 $) = témoignage **live** (caméra téléphone / webcam),
 * pas un upload de clip galerie. Capture = Phase 3b+.
 */
export const SANCTUARY_VIDEO_TESTIMONY_IS_LIVE_CAPTURE = true;
