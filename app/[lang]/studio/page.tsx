import { redirect } from "next/navigation";
import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import { LocaleSwitcher } from "@/src/components/i18n/LocaleSwitcher";
import { DashboardSignOut } from "@/src/components/dashboard/DashboardSignOut";
import { TributeWizard } from "@/src/components/tribute/TributeWizard";
import { appRoutes } from "@/src/lib/appRoutes";
import {
  SANCTUARY_HALO_TEAL,
  SANCTUARY_HALO_UV,
} from "@/src/lib/contribute/sanctuaryChrome";
import { readWizardEditorSession } from "@/src/lib/wizard/collabSessionCookie";
import type { WizardAccessRole } from "@/src/lib/wizard/collabCapabilities";
import type { WizardInitialDraft } from "@/src/lib/wizard/wizardState";
import { getDictionary } from "@/lib/dictionaries";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Locale } from "@/i18n.config";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ plan?: string }>;
};

const DRAFT_SELECT =
  "id, user_id, tenant_id, wizard_state, wizard_step, last_saved_at, status";

export default async function StudioPage({ params, searchParams }: PageProps) {
  const { lang: routeLang } = await params;
  const { plan: rawPlan } = await searchParams;
  // Dev-only : `?plan=essential` permet de tester le flux freemium Soft Cap
  // en local (grantedPackage = Souvenir 0 $) sans passer par une invitation
  // partenaire. Jamais honoré en production (faille de monétisation).
  const planOverride =
    process.env.NODE_ENV !== "production" ? rawPlan : undefined;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const editorSession = await readWizardEditorSession();

  let accessRole: WizardAccessRole = "owner";
  let draftProject: WizardInitialDraft | null = null;
  let isPartner = false;
  let displayName = dictionary.dashboard.guestName;

  // Co-Créateur (cookie) — prioritaire si le user connecté n'est PAS le
  // titulaire du projet collab (sinon owner gagne, même projet).
  if (editorSession) {
    let isOwnerOfCollabProject = false;
    if (user) {
      const { data: owned } = await supabase
        .from("projects")
        .select("id")
        .eq("id", editorSession.projectId)
        .eq("user_id", user.id)
        .maybeSingle();
      isOwnerOfCollabProject = Boolean(owned);
    }

    if (!isOwnerOfCollabProject) {
      const admin = getSupabaseAdminClient();
      const { data: collabDraft } = await admin
        .from("projects")
        .select(DRAFT_SELECT)
        .eq("id", editorSession.projectId)
        .maybeSingle();

      if (collabDraft) {
        accessRole = "editor";
        draftProject = collabDraft as WizardInitialDraft;
      }
    }
  }

  if (accessRole === "owner") {
    if (!user) {
      const returnPath = appRoutes.studio(lang);
      redirect(
        `${appRoutes.studioConnexion(lang)}?next=${encodeURIComponent(returnPath)}`,
      );
    }

    const rawName = user.user_metadata?.display_name;
    displayName =
      typeof rawName === "string" && rawName.trim().length > 0
        ? rawName.trim()
        : dictionary.dashboard.guestName;

    const { data: memberships } = await supabase
      .from("tenant_members")
      .select("role")
      .eq("user_id", user.id);

    isPartner = Boolean(
      memberships?.some(
        (row) =>
          row.role === "partner" ||
          row.role === "partner_admin" ||
          row.role === "admin",
      ),
    );

    const { data: ownDraft } = await supabase
      .from("projects")
      .select(DRAFT_SELECT)
      .eq("user_id", user.id)
      .eq("status", "draft")
      .order("last_saved_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    draftProject = (ownDraft as WizardInitialDraft | null) ?? null;
  }

  const brandWordmark = dictionary.tributeWizard.inviteBrandWordmark;
  const poweredBy = dictionary.tributeWizard.invitePoweredBy;
  const studioKicker =
    accessRole === "editor"
      ? dictionary.tributeWizard.editorModeBanner
      : dictionary.dashboard.studioKicker;
  const welcomeSrOnly =
    accessRole === "editor"
      ? dictionary.tributeWizard.editorModeBanner
      : dictionary.dashboard.welcomeStudio.replace("{name}", displayName);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020202] text-zinc-100">
      <div
        className="studio-shell-halo pointer-events-none absolute inset-0 z-0 overflow-hidden transition-opacity duration-500"
        aria-hidden
      >
        <div
          className="absolute left-1/2 top-[36%] h-[min(70vh,680px)] w-[min(150vw,68rem)] -translate-x-1/2 -translate-y-1/2 opacity-50 blur-[180px]"
          style={{ backgroundImage: SANCTUARY_HALO_UV }}
        />
        <div
          className="sanctuary-halo-breathe absolute left-1/2 top-[42%] h-[min(55vh,520px)] w-[min(120vw,52rem)] -translate-x-1/2 -translate-y-1/2 blur-[140px]"
          style={{ backgroundImage: SANCTUARY_HALO_TEAL }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/25 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-10 pt-12 md:px-10 md:pt-16">
        <header className="studio-shell-chrome relative mb-10 transition-opacity duration-500">
          <h1 className="sr-only">{welcomeSrOnly}</h1>

          <div className="absolute right-0 top-0 z-10 flex flex-col items-end gap-3">
            <LocaleSwitcher
              lang={lang}
              languageLabel={dictionary.header.languageLabel}
              langOptionFr={dictionary.header.langOptionFr}
              langOptionEn={dictionary.header.langOptionEn}
            />
            {accessRole === "owner" ? (
              <DashboardSignOut
                lang={lang}
                label={dictionary.dashboard.signOut}
              />
            ) : null}
          </div>

          <div className="mx-auto flex max-w-[16rem] origin-top scale-[0.82] justify-center sm:max-w-[18rem] sm:scale-[0.88]">
            <OdysseyConnexionMark
              wordmark={brandWordmark}
              animate
              className="mb-0"
            />
          </div>
          <p
            className={`mt-5 text-center text-[10px] font-medium uppercase tracking-[0.55em] ${
              accessRole === "editor" ? "text-teal-400/50" : "text-white/35"
            }`}
          >
            {studioKicker}
          </p>
        </header>

        <TributeWizard
          copy={dictionary.tributeWizard}
          initialDraft={draftProject}
          locale={lang}
          isPartner={isPartner}
          planOverride={accessRole === "owner" ? planOverride : undefined}
          accessRole={accessRole}
        />

        <footer className="studio-shell-chrome mt-auto mb-20 flex flex-col items-center gap-1 pb-2 pt-16 text-center transition-opacity duration-500">
          <p className="text-[8px] font-medium uppercase tracking-[0.44em] text-white/26">
            {poweredBy}
          </p>
          <p className="font-brand text-[10px] font-medium uppercase leading-none tracking-[0.28em] text-white/36 md:text-[11px]">
            {brandWordmark}
          </p>
        </footer>
      </div>
    </main>
  );
}
