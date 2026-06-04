import { redirect } from "next/navigation";

import { InviteAcceptError } from "@/app/[lang]/invite/accept/InviteAcceptError";
import { DashboardSignOut } from "@/src/components/dashboard/DashboardSignOut";
import { TributeWizard } from "@/src/components/tribute/TributeWizard";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const HALO_PRIMARY =
  "radial-gradient(ellipse 106% 74% at 50% 42%, rgba(139, 92, 246, 0.2) 0%, rgba(91, 33, 182, 0.09) 44%, transparent 72%)";
const HALO_SECONDARY =
  "radial-gradient(ellipse 112% 78% at 50% 48%, rgba(103, 232, 249, 0.08) 0%, transparent 62%)";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ projectId?: string | string[] }>;
};

function pickProjectId(raw: string | string[] | undefined): string | null {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  if (Array.isArray(raw)) {
    const first = raw.find((v) => typeof v === "string" && v.trim().length > 0);
    return first?.trim() ?? null;
  }
  return null;
}

export default async function TributeWelcomePage({
  params,
  searchParams,
}: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const projectId = pickProjectId((await searchParams).projectId);

  if (!projectId) {
    redirect(`/${lang}/dashboard`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = `/${lang}/tribute/welcome?projectId=${encodeURIComponent(projectId)}`;
    redirect(`/${lang}/login?next=${encodeURIComponent(returnPath)}`);
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, user_id, tenant_id, wizard_state, wizard_step, last_saved_at, status, invitation_id",
    )
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !project) {
    const errorTitle =
      lang === "en" ? "Tribute not found" : "Hommage introuvable";
    const message =
      lang === "en"
        ? "This project does not exist or is not linked to your account."
        : "Ce projet n'existe pas ou n'est pas associé à votre compte.";
    return (
      <InviteAcceptError lang={lang} title={errorTitle} message={message} />
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

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020202] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[38%] z-0 h-[min(72vh,720px)] w-[min(155vw,72rem)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.55] blur-[180px]"
          style={{ backgroundImage: HALO_PRIMARY }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(95vh,940px)] w-[min(185vw,84rem)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.35] blur-[220px]"
          style={{ backgroundImage: HALO_SECONDARY }}
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
          <DashboardSignOut
            lang={lang}
            label={dictionary.dashboard.signOut}
            className="shrink-0 sm:mt-1"
          />
        </header>

        <TributeWizard
          copy={dictionary.tributeWizard}
          initialDraft={project}
          locale={lang}
          isPartner={false}
        />
      </div>
    </main>
  );
}
