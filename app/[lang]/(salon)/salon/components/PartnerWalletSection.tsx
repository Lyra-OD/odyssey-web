import type { Locale } from "@/i18n.config";
import { editorialAccentRule, editorialColumn } from "@/src/lib/editorialSkin";

type PartnerWalletSectionProps = {
  lang: Locale;
  /** Solde affiché (mock jusqu’à branchement API). */
  balance?: number;
};

export function PartnerWalletSection({
  lang,
  balance = 42,
}: PartnerWalletSectionProps) {
  const copy =
    lang === "en"
      ? {
          kicker: "Available tokens",
          recharge: "Top up",
        }
      : {
          kicker: "Jetons disponibles",
          recharge: "Recharger",
        };

  return (
    <section aria-labelledby="partner-wallet-kicker">
      <div className={`${editorialColumn} md:max-w-[76rem] ${editorialAccentRule}`}>
        <p
          id="partner-wallet-kicker"
          className="font-label text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-500"
        >
          {copy.kicker}
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <p className="font-editorial text-5xl font-medium tabular-nums tracking-tight text-white md:text-6xl">
            {balance}
          </p>
          <button
            type="button"
            className="font-label text-[10px] font-bold uppercase tracking-[0.42em] text-violet-300/80 transition-colors hover:text-violet-200"
          >
            {copy.recharge}
          </button>
        </div>
      </div>
    </section>
  );
}
