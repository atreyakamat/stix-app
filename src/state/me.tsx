import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mergeAccount, type AccountSession } from "@/lib/account-sync";
import { APP_SOURCE } from "@/lib/config";
import { pushRecent, type Taste } from "@/lib/personal";
import { readJSON, writeJSON } from "@/lib/storage";
import type { Account, Address, Fulfilment } from "@/lib/types";

// Everything the app remembers about the customer. By default it stays on
// this phone and nothing is sent anywhere until they place an order. If they
// sign in (optional), details, vibes, wishlist and order links are also kept
// on their account; see AccountSync.

export type Details = { name: string; phone: string; instagram: string; fulfilment: Fulfilment; address: Address };

export const EMPTY_DETAILS: Details = { name: "", phone: "", instagram: "", fulfilment: "delivery", address: { line: "", city: "", state: "Goa", pincode: "" } };

/** An order placed from this phone, enough to list it and open it again. */
export type SavedOrder = {
  number: string;
  key: string;
  totalPaise: number;
  createdAt: string;
  itemCount: number;
  image: string | null;
  /** Last status seen; refreshed when the order is opened. */
  status: string;
};

type MeState = {
  onboarded: boolean;
  taste: Taste;
  details: Details;
  orders: SavedOrder[];
  /** From a stall QR or Instagram link: ?src= and ?code=. */
  source: { s: string; at: number } | null;
  pendingCode: string;
  /** Set while signed in to an account. */
  account: AccountSession | null;
};

const KEY = "snv-me-v1";
const SOURCE_DAYS = 30;

const INITIAL: MeState = {
  onboarded: false,
  taste: { collegeId: null, vibes: [], wishlist: [], recent: [] },
  details: EMPTY_DETAILS,
  orders: [],
  source: null,
  pendingCode: "",
  account: null,
};

type MeValue = MeState & {
  ready: boolean;
  /** Source for orders and events: the link that brought them, else "app". */
  sourceTag: string;
  setTaste: (patch: Partial<Pick<Taste, "collegeId" | "vibes">>) => void;
  finishOnboarding: () => void;
  toggleWish: (productId: string) => void;
  viewed: (productId: string) => void;
  saveDetails: (d: Details) => void;
  addOrder: (o: SavedOrder) => void;
  updateOrder: (number: string, patch: Partial<SavedOrder>) => void;
  forgetOrder: (number: string) => void;
  setLinkSource: (src: string) => void;
  setPendingCode: (code: string) => void;
  /** Signs in: keeps the session and merges what the account already has. */
  signIn: (session: AccountSession, account: Account) => void;
  /** Brings in changes made on another device. */
  mergeFromAccount: (account: Account) => void;
  signOut: () => void;
  /** Clears everything the app remembers. */
  reset: () => void;
};

const MeContext = createContext<MeValue | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MeState>(INITIAL);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void readJSON<Partial<MeState>>(KEY, {}).then((saved) => {
      setState((s) => ({
        ...s,
        ...saved,
        taste: { ...INITIAL.taste, ...saved.taste },
        details: { ...EMPTY_DETAILS, ...saved.details, address: { ...EMPTY_DETAILS.address, ...saved.details?.address } },
        // A link opened before storage loaded wins over the saved one.
        source: s.source ?? saved.source ?? null,
        pendingCode: s.pendingCode || saved.pendingCode || "",
      }));
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) void writeJSON(KEY, state);
  }, [state, ready]);

  // Actions never change identity, so screens can use them in effect deps.
  const actions = useMemo(() => {
    const patch = (fn: (s: MeState) => MeState) => setState(fn);
    return {
      setTaste: (t: Partial<Pick<Taste, "collegeId" | "vibes">>) => patch((s) => ({ ...s, taste: { ...s.taste, ...t } })),
      finishOnboarding: () => patch((s) => ({ ...s, onboarded: true })),
      toggleWish: (id: string) =>
        patch((s) => ({
          ...s,
          taste: { ...s.taste, wishlist: s.taste.wishlist.includes(id) ? s.taste.wishlist.filter((x) => x !== id) : [id, ...s.taste.wishlist] },
        })),
      viewed: (id: string) => patch((s) => (s.taste.recent[0] === id ? s : { ...s, taste: { ...s.taste, recent: pushRecent(s.taste.recent, id) } })),
      saveDetails: (d: Details) => patch((s) => ({ ...s, details: d })),
      addOrder: (o: SavedOrder) => patch((s) => ({ ...s, orders: [o, ...s.orders.filter((x) => x.number !== o.number)].slice(0, 100) })),
      updateOrder: (number: string, p: Partial<SavedOrder>) =>
        patch((s) => {
          const at = s.orders.findIndex((o) => o.number === number);
          if (at < 0 || Object.entries(p).every(([k, v]) => s.orders[at][k as keyof SavedOrder] === v)) return s;
          return { ...s, orders: s.orders.map((o, i) => (i === at ? { ...o, ...p } : o)) };
        }),
      forgetOrder: (number: string) => patch((s) => ({ ...s, orders: s.orders.filter((o) => o.number !== number) })),
      setLinkSource: (src: string) => patch((s) => ({ ...s, source: { s: src, at: Date.now() } })),
      setPendingCode: (code: string) => patch((s) => (s.pendingCode === code ? s : { ...s, pendingCode: code })),
      signIn: (session: AccountSession, account: Account) =>
        patch((s) => ({ ...s, ...mergeAccount(s, account), account: session })),
      mergeFromAccount: (account: Account) => patch((s) => ({ ...s, ...mergeAccount(s, account) })),
      signOut: () => patch((s) => ({ ...s, account: null })),
      reset: () => patch(() => ({ ...INITIAL, onboarded: true })),
    };
  }, []);

  const value = useMemo<MeValue>(() => {
    const fresh = state.source && Date.now() - state.source.at < SOURCE_DAYS * 86_400_000;
    return { ...state, ...actions, ready, sourceTag: fresh ? state.source!.s : APP_SOURCE };
  }, [state, ready, actions]);

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used inside MeProvider");
  return ctx;
}
