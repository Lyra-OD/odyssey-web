/**
 * Souvenir invité : photos ET/OU mot (pas XOR).
 * Plafond photos = ailleurs (`SANCTUARY_GUEST_PHOTO_MAX`).
 */

export function guestDepositHasSouvenir(input: {
  photoCount: number;
  messageText: string;
}): boolean {
  const photos = Number.isFinite(input.photoCount)
    ? Math.max(0, input.photoCount)
    : 0;
  return photos > 0 || input.messageText.trim().length > 0;
}
