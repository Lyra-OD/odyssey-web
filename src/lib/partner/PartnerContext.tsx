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

  const value = useMemo<PartnerContextValue>(
    () => ({
      activeTenantId,
      activeTenantRole,
      capabilities,
      availableTenants,
      isLoading,
      setActiveTenantId,
    }),
    [
      activeTenantId,
      activeTenantRole,
      capabilities,
      availableTenants,
      isLoading,
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
