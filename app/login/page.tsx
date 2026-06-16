import { redirect } from "next/navigation";

import { i18n } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";

/** Legacy `/login` → connexion studio (famille), locale par défaut. */
export default function LoginRootRedirectPage() {
  redirect(appRoutes.studioConnexion(i18n.defaultLocale));
}
