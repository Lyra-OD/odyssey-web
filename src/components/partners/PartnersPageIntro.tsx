import {
  editorialAccentRule,
  editorialColumn,
} from "@/src/lib/editorialSkin";

export type PartnersGrowthItem = {
  title: string;
  body: string;
};

export type PartnersPageIntroCopy = {
  title: string;
  subtitle: string;
  growthEngineTitle: string;
  growthEngineItems: PartnersGrowthItem[];
  formSectionTitle: string;
};

export function PartnersPageIntro({ copy }: { copy: PartnersPageIntroCopy }) {
  return (
    <div className={`${editorialColumn} md:max-w-[76rem] lg:max-w-[92rem] ${editorialAccentRule}`}>
      <h1 className="font-editorial text-4xl tracking-tight text-zinc-50 md:text-5xl lg:text-6xl">
        {copy.title}
      </h1>
      <p className="font-label mt-8 max-w-3xl text-sm leading-relaxed text-zinc-400 md:text-base md:leading-relaxed">
        {copy.subtitle}
      </p>

      <div className="mt-14 md:mt-16">
        <h2 className="font-label text-[11px] font-bold uppercase tracking-[0.46em] text-zinc-300">
          {copy.growthEngineTitle}
        </h2>
        <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          {copy.growthEngineItems.map((item) => (
            <li
              key={item.title}
              className="rounded-sm border border-white/10 bg-white/[0.02] p-6 md:p-7"
            >
              <h3 className="font-editorial text-xl tracking-tight text-white md:text-2xl">
                {item.title}
              </h3>
              <p className="font-label mt-3 text-sm leading-relaxed text-zinc-400">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <h2
        id="partners-form"
        className="font-label mt-16 scroll-mt-28 text-[11px] font-bold uppercase tracking-[0.46em] text-zinc-300 md:mt-20"
      >
        {copy.formSectionTitle}
      </h2>
    </div>
  );
}
