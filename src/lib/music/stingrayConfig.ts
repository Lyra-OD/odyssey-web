/** Configuration serveur Stingray Music API (MAPI). */

export type StingrayConfig = {
  baseUrl: string;
  clientId: string;
  bearerToken?: string;
  deviceId: string;
  language: string;
  useMock: boolean;
};

export function getStingrayConfig(): StingrayConfig {
  const clientId = process.env.STINGRAY_CLIENT_ID?.trim() ?? "";
  const bearerToken =
    process.env.STINGRAY_BEARER_TOKEN?.trim() ||
    process.env.STINGRAY_API_TOKEN?.trim() ||
    undefined;

  return {
    baseUrl:
      process.env.STINGRAY_API_BASE_URL?.trim() ||
      "https://music-service.stingray.com",
    clientId,
    bearerToken,
    deviceId:
      process.env.STINGRAY_DEVICE_ID?.trim() || "odyssey-wizard",
    language: process.env.STINGRAY_LANGUAGE?.trim() || "fr",
    useMock: process.env.STINGRAY_USE_MOCK === "true",
  };
}

export function isStingrayConfigured(config = getStingrayConfig()): boolean {
  return Boolean(config.clientId || config.bearerToken);
}
