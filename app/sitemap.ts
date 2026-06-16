import type { MetadataRoute } from "next";
import { i18n } from "@/i18n.config";
import { getSiteUrl } from "@/lib/siteUrl";

const localizedRoutes = [
  "",
  "/studio/connexion",
  "/manifesto",
  "/process",
  "/contact",
  "/partners",
  "/partenaires",
  "/auth",
  "/studio",
  "/salon",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return i18n.locales.flatMap((lang) =>
    localizedRoutes.map((route) => ({
      url: `${siteUrl}/${lang}${route}`,
      lastModified,
      changeFrequency: route === "" ? "weekly" : "monthly",
      priority: route === "" ? 1 : 0.7,
    })),
  );
}
