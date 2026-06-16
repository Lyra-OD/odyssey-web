import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";
import { AuthConnexionPage } from "@/src/components/auth/AuthConnexionPage";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function StudioConnexionPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);

  return (
    <AuthConnexionPage
      lang={lang}
      copy={dictionary.auth}
      audience="studio"
    />
  );
}
