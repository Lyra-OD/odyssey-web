import { redirect } from "next/navigation";

import { InviteAcceptError } from "@/app/[lang]/invite/accept/InviteAcceptError";
import type { Locale } from "@/i18n.config";
import {
  redeemInvitationErrorMessage,
  redeemPartnerInvitation,
} from "@/src/lib/partner/redeemPartnerInvitation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

function pickToken(raw: string | string[] | undefined): string | null {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  if (Array.isArray(raw)) {
    const first = raw.find((v) => typeof v === "string" && v.trim().length > 0);
    return first?.trim() ?? null;
  }
  return null;
}

export default async function InviteAcceptPage({
  params,
  searchParams,
}: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const sp = await searchParams;
  const token = pickToken(sp.token);

  const errorTitle =
    lang === "en" ? "Invitation unavailable" : "Invitation indisponible";

  if (!token) {
    return (
      <InviteAcceptError
        lang={lang}
        title={errorTitle}
        message={redeemInvitationErrorMessage("invalid_token", lang)}
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = `/${lang}/invite/accept?token=${encodeURIComponent(token)}`;
    redirect(`/${lang}/login?next=${encodeURIComponent(returnPath)}`);
  }

  const result = await redeemPartnerInvitation({
    token,
    userId: user.id,
    userEmail: user.email ?? "",
    locale: lang,
  });

  if (result.ok) {
    redirect(
      `/${lang}/tribute/welcome?projectId=${encodeURIComponent(result.projectId)}`,
    );
  }

  return (
    <InviteAcceptError
      lang={lang}
      title={errorTitle}
      message={result.message}
    />
  );
}
