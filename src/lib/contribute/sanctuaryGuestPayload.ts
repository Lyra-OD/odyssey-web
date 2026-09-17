export type SanctuaryGuestPack = {
  key: string;
  label: string;
  priceCents: number;
  secondary?: boolean;
  amountMinCents?: number | null;
  amountMaxCents?: number | null;
  amountSuggestedCents?: number | null;
};

export type SanctuaryGuestPayload = {
  tribute: {
    firstName: string | null;
    lastName: string | null;
    displayName?: string;
  };
  packs: SanctuaryGuestPack[];
  guestPhotoCount: number;
  guestPhotoMax: number;
};
