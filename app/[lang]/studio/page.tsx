import { redirect } from "next/navigation";
import { LocaleSwitcher } from "@/src/components/i18n/LocaleSwitcher";
import { DashboardSignOut } from "@/src/components/dashboard/DashboardSignOut";
import { TributeWizard } from "@/src/components/tribute/TributeWizard";
import { appRoutes } from "@/src/lib/appRoutes";
import { getDictionary } from "@/lib/dictionaries";
import { createClient } from "@/utils/supabase/server";
import type { Locale } from "@/i18n.config";

export const dynamic = "force-dynamic";

/** Halo léger violet — cohérent avec la page login (atmosphère Studio). */
const HALO_DASH_PRIMARY =
  "radial-gradient(ellipse 106% 74% at 50% 42%, rgba(139, 92, 246, 0.2) 0%, rgba(91, 33, 182, 0.09) 44%, transparent 72%)";
const HALO_DASH_SECONDARY =
  "radial-gradient(ellipse 112% 78% at 50% 48%, rgba(103, 232, 249, 0.08) 0%, transparent 62%)";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function StudioPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = appRoutes.studio(lang);
    redirect(
      `${appRoutes.studioConnexion(lang)}?next=${encodeURIComponent(returnPath)}`,
    );
  }

  const rawName = user.user_metadata?.display_name;
  const displayName =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim()
      : dictionary.dashboard.guestName;

  const welcomeLine = dictionary.dashboard.welcomeStudio.replace(
    "{name}",
    displayName,
  );

  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("user_id", user.id);

  const isPartner = Boolean(
    memberships?.some(
      (row) =>
        row.role === "partner" ||
        row.role === "partner_admin" ||
        row.role === "admin",
    ),
  );

  const { data: draftProject } = await supabase
    .from("projects")
    .select(
      "id, user_id, tenant_id, wizard_state, wizard_step, last_saved_at, status",
    )
    .eq("user_id", user.id)
    .eq("status", "draft")
    .order("last_saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020202] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[38%] z-0 h-[min(72vh,720px)] w-[min(155vw,72rem)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.55] blur-[180px]"
          style={{ backgroundImage: HALO_DASH_PRIMARY }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(95vh,940px)] w-[min(185vw,84rem)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.35] blur-[220px]"
          style={{ backgroundImage: HALO_DASH_SECONDARY }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-16 pt-10 md:px-10 md:pt-14">
        <header className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.55em] text-white/35">
              {dictionary.dashboard.title}
            </p>
            <h1 className="text-xl font-light leading-snug tracking-[0.02em] text-white md:text-2xl">
              {welcomeLine}
            </h1>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3 sm:mt-1">
            <LocaleSwitcher
              lang={lang}
              languageLabel={dictionary.header.languageLabel}
              langOptionFr={dictionary.header.langOptionFr}
              langOptionEn={dictionary.header.langOptionEn}
            />
            <DashboardSignOut
              lang={lang}
              label={dictionary.dashboard.signOut}
            />
          </div>
        </header>

        <TributeWizard
          copy={dictionary.tributeWizard}
          initialDraft={draftProject ?? null}
          locale={lang}
          isPartner={isPartner}
        />
      </div>
    </main>
  );
}
