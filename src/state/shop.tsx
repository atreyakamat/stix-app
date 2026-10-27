import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { getCatalog, type Catalog } from "@/lib/api";
import { liveOffers } from "@/lib/pricing";
import { readJSON, writeJSON } from "@/lib/storage";

// The catalogue, kept on the phone so the app opens instantly and still works
// at a stall with no signal. Refreshed on open and when the app comes back
// to the front (at most once a minute).

const KEY = "snv-catalog-v1";
const FRESH_MS = 60_000;

type ShopValue = {
  catalog: Catalog | null;
  /** loading: first open, nothing saved yet. offline: showing the saved copy. */
  status: "loading" | "ready" | "offline" | "error";
  refreshing: boolean;
  refresh: () => Promise<void>;
};

const ShopContext = createContext<ShopValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [status, setStatus] = useState<ShopValue["status"]>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const lastFetch = useRef(0);
  const hasCatalog = useRef(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await getCatalog();
      lastFetch.current = Date.now();
      hasCatalog.current = true;
      setCatalog(fresh);
      setStatus("ready");
      void writeJSON(KEY, fresh);
    } catch {
      setStatus(hasCatalog.current ? "offline" : "error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const saved = await readJSON<Catalog | null>(KEY, null);
      if (saved && !hasCatalog.current) {
        hasCatalog.current = true;
        setCatalog(saved);
        setStatus("offline");
      }
      await refresh();
    })();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active" && Date.now() - lastFetch.current > FRESH_MS) void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // A saved copy may hold offers that have since ended.
  const value = useMemo<ShopValue>(
    () => ({ catalog: catalog && { ...catalog, offers: liveOffers(catalog.offers) }, status, refreshing, refresh }),
    [catalog, status, refreshing, refresh],
  );
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}

/** The catalogue once loaded; screens render a loader until then. */
export function useCatalog(): Catalog | null {
  return useShop().catalog;
}
