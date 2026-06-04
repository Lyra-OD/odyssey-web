/** Configuration serveur Stingray Music API (MAPI). */

export type StingrayMode = "mock" | "live";

export type StingrayConfig = {
  baseUrl: string;
  clientId: string;
  bearerToken?: string;
  deviceId: string;
  language: string;
  mode: StingrayMode;
  /** @deprecated Préférer `mode === "mock"` */
  useMock: boolean;
};

function resolveStingrayMode(clientId: string): StingrayMode {
  const explicit = process.env.STINGRAY_MODE?.trim().toLowerCase();
  if (explicit === "mock" || explicit === "live") return explicit;
  if (process.env.STINGRAY_USE_MOCK === "true") return "mock";
  if (!clientId) return "mock";
  return "live";
}

export function getStingrayConfig(): StingrayConfig {
  const clientId = process.env.STINGRAY_CLIENT_ID?.trim() ?? "";
  const bearerToken =
    process.env.STINGRAY_BEARER_TOKEN?.trim() ||
    process.env.STINGRAY_API_TOKEN?.trim() ||
    undefined;
  const mode = resolveStingrayMode(clientId);
  const useMock = mode === "mock";

  if (useMock && !clientId && process.env.STINGRAY_USE_MOCK !== "true") {
    console.info(
      "[Stingray] STINGRAY_CLIENT_ID absent — mode mock actif (équivalent STINGRAY_USE_MOCK=true).",
    );
  }

  return {
    baseUrl:
      process.env.STINGRAY_API_BASE_URL?.trim() ||
      "https://music-service.stingray.com",
    clientId,
    bearerToken,
    deviceId:
      process.env.STINGRAY_DEVICE_ID?.trim() || "odyssey-wizard",
    language: process.env.STINGRAY_LANGUAGE?.trim() || "fr",
    mode,
    useMock,
  };
}

export function isStingrayMockMode(config = getStingrayConfig()): boolean {
  return config.mode === "mock";
}

export function hasStingrayCredentials(config = getStingrayConfig()): boolean {
  return Boolean(config.clientId || config.bearerToken);
}

/** Mock catalogue : mode explicite OU credentials absents. */
export function shouldUseStingrayMock(config = getStingrayConfig()): boolean {
  return isStingrayMockMode(config) || !hasStingrayCredentials(config);
}

export function isStingrayConfigured(config = getStingrayConfig()): boolean {
  if (shouldUseStingrayMock(config)) return false;
  return hasStingrayCredentials(config);
}
