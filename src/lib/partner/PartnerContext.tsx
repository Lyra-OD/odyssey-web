"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PartnerCapabilities } from "@/src/lib/partner/partnerTenantTypes";
import { PartnerTenantsResponseSchema } from "@/src/lib/partner/partnerTenantTypes";
import { PartnerWalletResponseSchema } from "@/src/lib/partner/partnerWalletTypes";
import type { PartnerApiErrorCode } from "@/src/lib/partner/partnerApiErrors";
import type { PartnerMemberRole } from "@/src/lib/partner/partnerRoles";
import type { PartnerTenant } from "@/src/lib/partner/partnerTenantTypes";

const ACTIVE_TENANT_STORAGE_KEY = "odyssey_partner_active_tenant_id";

export type PartnerContextValue = {
  activeTenantId: string | null;
  /** Role on the active tenant (`partner` = Director, `partner_admin` = Admin). */
  activeTenantRole: PartnerMemberRole | null;
  /** RBAC capabilities for the active tenant — derived from API, not hard-coded in UI. */
  capabilities: PartnerCapabilities | null;
  availableTenants: PartnerTenant[];
  isLoading: boolean;
  /** Real wallet balance for admin (`null` until loaded or if unavailable). */
  walletBalance: number | null;
  walletCreditLimitTokens: number | null;
  isWalletLoading: boolean;
  walletErrorCode: PartnerApiErrorCode | null;
  setActiveTenantId: (id: string) => void;
};

const PartnerContext = createContext<PartnerContextValue | null>(null);

function readStoredTenantId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredTenantId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

function pickInitialTenantId(tenants: PartnerTenant[]): string | null {
  if (tenants.length === 0) return null;
  const stored = readStoredTenantId();
  if (stored && tenants.some((t) => t.id === stored)) {
    return stored;
  }
  return tenants[0]?.id ?? null;
}

export function PartnerProvider({ children }: { children: ReactNode }) {
  const [availableTenants, setAvailableTenants] = useState<PartnerTenant[]>([]);
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletCreditLimitTokens, setWalletCreditLimitTokens] = useState<
    number | null
  >(null);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [walletErrorCode, setWalletErrorCode] = useState<PartnerApiErrorCode | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/partner/tenants", {
          method: "GET",
          credentials: "same-origin",
        });

        if (!response.ok) {
          if (!cancelled) {
            setAvailableTenants([]);
            setActiveTenantIdState(null);
          }
          return;
        }

        const payload: unknown = await response.json();
        const parsed = PartnerTenantsResponseSchema.safeParse(payload);

        if (!parsed.success || cancelled) {
          if (!cancelled) {
            setAvailableTenants([]);
            setActiveTenantIdState(null);
          }
          return;
        }

        const tenants = parsed.data.tenants;
        setAvailableTenants(tenants);
        setActiveTenantIdState(pickInitialTenantId(tenants));
      } catch {
        if (!cancelled) {
          setAvailableTenants([]);
          setActiveTenantIdState(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveTenantId = useCallback(
    (id: string) => {
      if (!availableTenants.some((t) => t.id === id)) return;
      setActiveTenantIdState(id);
      writeStoredTenantId(id);
    },
    [availableTenants],
  );

  const activeTenant = useMemo(
    () => availableTenants.find((t) => t.id === activeTenantId) ?? null,
    [availableTenants, activeTenantId],
  );

  const activeTenantRole = activeTenant?.role ?? null;
  const capabilities = activeTenant?.capabilities ?? null;

  useEffect(() => {
    if (isLoading || !activeTenantId || !capabilities?.canViewBalance) {
      setWalletBalance(null);
      setWalletCreditLimitTokens(null);
      setWalletErrorCode(null);
      setIsWalletLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsWalletLoading(true);
      setWalletErrorCode(null);

      try {
        const response = await fetch(
          `/api/partner/wallet?tenantId=${encodeURIComponent(activeTenantId)}`,
          { method: "GET", credentials: "same-origin" },
        );

        const payload: unknown = await response.json().catch(() => null);

        if (cancelled) return;

        if (!response.ok) {
          const code =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof (payload as { error: unknown }).error === "string"
              ? ((payload as { error: string }).error as PartnerApiErrorCode)
              : null;
          setWalletBalance(null);
          setWalletCreditLimitTokens(null);
          setWalletErrorCode(code);
          return;
        }

        const parsed = PartnerWalletResponseSchema.safeParse(payload);
        if (!parsed.success) {
          setWalletBalance(null);
          setWalletCreditLimitTokens(null);
          setWalletErrorCode(null);
          return;
        }

        setWalletBalance(parsed.data.balance);
        setWalletCreditLimitTokens(parsed.data.creditLimitTokens);
        setWalletErrorCode(null);
      } catch {
        if (!cancelled) {
          setWalletBalance(null);
          setWalletCreditLimitTokens(null);
          setWalletErrorCode(null);
        }
      } finally {
        if (!cancelled) setIsWalletLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTenantId, capabilities?.canViewBalance, isLoading]);

  const value = useMemo<PartnerContextValue>(
    () => ({
      activeTenantId,
      activeTenantRole,
      capabilities,
      availableTenants,
      isLoading,
      walletBalance,
      walletCreditLimitTokens,
      isWalletLoading,
      walletErrorCode,
      setActiveTenantId,
    }),
    [
      activeTenantId,
      activeTenantRole,
      capabilities,
      availableTenants,
      isLoading,
      walletBalance,
      walletCreditLimitTokens,
      isWalletLoading,
      walletErrorCode,
      setActiveTenantId,
    ],
  );

  return (
    <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>
  );
}

export function usePartner(): PartnerContextValue {
  const context = useContext(PartnerContext);
  if (!context) {
    throw new Error("usePartner must be used within a PartnerProvider");
  }
  return context;
}
