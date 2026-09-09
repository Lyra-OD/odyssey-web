import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DocumentLang } from "@/src/components/DocumentLang";
import { OdysseyHelpLifeline } from "@/src/components/OdysseyHelpLifeline";
import { UiLocaleProvider } from "@/src/components/i18n/UiLocaleContext";
import { i18n, type Locale } from "@/i18n.config";
import { getDictionary } from "@/lib/dictionaries";
import { getSiteUrl } from "@/lib/siteUrl";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020202",
};

export function generateStaticParams() {
  return i18n.locales.map((lang) => ({ lang }));
}

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: dictionary.seo.title,
    description: dictionary.seo.description,
    alternates: {
      canonical: `/${lang}`,
      languages: {
        fr: "/fr",
        en: "/en",
        "x-default": "/fr",
      },
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps) {
  const { lang: routeLang } = await params;
  const htmlLang: Locale = routeLang === "en" ? "en" : "fr";
  const [dictionary, dictionaryFr, dictionaryEn] = await Promise.all([
    getDictionary(htmlLang),
    getDictionary("fr"),
    getDictionary("en"),
  ]);
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Odyssey",
        url: `${siteUrl}/${htmlLang}`,
        description: dictionary.seo.description,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "Odyssey",
        url: `${siteUrl}/${htmlLang}`,
        inLanguage: htmlLang,
        description: dictionary.seo.description,
      },
    ],
  };

  return (
    <>
      <DocumentLang lang={htmlLang} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <UiLocaleProvider initialLocale={htmlLang}>
        {children}
        <OdysseyHelpLifeline
          locale={htmlLang}
          copyFr={dictionaryFr.helpLifeline}
          copyEn={dictionaryEn.helpLifeline}
        />
      </UiLocaleProvider>
    </>
  );
}
