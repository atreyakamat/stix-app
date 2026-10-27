import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, checkCoupon, type CartCoupon } from "@/lib/api";
import { minQtyShortfalls, normalizeCode, offerHints, shippingStatus, stockShortfalls, totals } from "@/lib/pricing";
import { readJSON, writeJSON } from "@/lib/storage";
import { PRODUCT_TYPES, type AppliedOffer, type Coupon, type CustomFieldKind, type ProductType } from "@/lib/types";
import { useMe } from "./me";
import { useShop } from "./shop";

// Same cart as the website (components/cart/cart-context.tsx): prices here
// are for display, and the server prices every line again on order.

export const MAX_QTY_PER_LINE = 99;

export type CartItem = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  type: ProductType;
  image: string | null;
  unitPricePaise: number;
  minQty: number;
  stock?: number | null;
  qty: number;
  selections: Record<string, string>;
  optionLabels: string[];
  /** Custom field values by field id (upload ids for photos). */
  custom: Record<string, string>;
  customDisplay: { label: string; value: string; kind: CustomFieldKind }[];
};

export type NewCartItem = Omit<CartItem, "qty" | "key">;

type Shortfall = { productId: string; name: string; minQty: number; need: number; stock?: number };

type CartValue = {
  items: CartItem[];
  count: number;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  applied: AppliedOffer[];
  hints: string[];
  shortfalls: Shortfall[];
  shipping: { free: boolean; needPaise: number } | null;
  coupon: CartCoupon | null;
  couponCode: string;
  couponProblem: string | null;
  applyCode: (code: string) => Promise<string | null>;
  removeCode: () => void;
  add: (item: NewCartItem, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const KEY = "snv-cart-v1";
const CartContext = createContext<CartValue | null>(null);

export const lineKey = (i: Pick<CartItem, "productId" | "selections" | "custom">) =>
  `${i.productId}|${JSON.stringify(Object.entries(i.selections).sort())}|${JSON.stringify(Object.entries(i.custom).sort())}`;

const typeWord = (type: ProductType | null, n: number) => {
  const t = PRODUCT_TYPES.find((x) => x.id === type);
  if (!t) return n === 1 ? "item" : "items";
  return (n === 1 ? t.one : t.label).toLowerCase();
};

const asCoupon = (c: CartCoupon): Coupon => ({ ...c, maxUses: null, startsAt: null, source: "", active: true, createdAt: "" });

export function CartProvider({ children }: { children: ReactNode }) {
  const { catalog } = useShop();
  const me = useMe();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [coupon, setCoupon] = useState<CartCoupon | null>(null);

  useEffect(() => {
    void readJSON<CartItem[]>(KEY, []).then((saved) => {
      setItems((now) => (now.length ? now : Array.isArray(saved) ? saved.filter((i) => i && typeof i.key === "string" && i.qty > 0) : []));
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) void writeJSON(KEY, items);
  }, [items, ready]);

  // A code from a stall QR link is applied quietly; a bad one is dropped.
  const { pendingCode, setPendingCode } = me;
  useEffect(() => {
    if (!pendingCode || coupon?.code === pendingCode) return;
    checkCoupon(pendingCode)
      .then(setCoupon)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 404 || err.status === 410)) setPendingCode("");
      });
  }, [pendingCode, coupon?.code, setPendingCode]);

  const applyCode = useCallback(
    async (raw: string) => {
      const code = normalizeCode(raw);
      if (!code) return "Type a code.";
      try {
        const c = await checkCoupon(code);
        setCoupon(c);
        setPendingCode(c.code);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "That code doesn't work.";
      }
    },
    [setPendingCode],
  );

  const removeCode = useCallback(() => {
    setCoupon(null);
    setPendingCode("");
  }, [setPendingCode]);

  const add = useCallback((item: NewCartItem, qty = 1) => {
    const key = lineKey(item);
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => (i.key === key ? { ...i, ...item, qty: Math.min(MAX_QTY_PER_LINE, i.qty + qty) } : i));
      return [...prev, { ...item, key, qty: Math.min(MAX_QTY_PER_LINE, qty) }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setItems((prev) => (qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty: Math.min(MAX_QTY_PER_LINE, qty) } : i))));
  }, []);

  const remove = useCallback((key: string) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartValue>(() => {
    const offers = catalog?.offers ?? [];
    // Prices and stock follow the latest catalogue, so a saved cart doesn't
    // show yesterday's price.
    const live = new Map((catalog?.products ?? []).map((p) => [p.id, p]));
    const priced = items.map((i) => {
      const p = live.get(i.productId);
      return p ? { ...i, minQty: p.minQty, stock: p.stock } : i;
    });
    const t = totals(priced, offers, coupon ? asCoupon(coupon) : null);
    const products = [...new Map(priced.map((i) => [i.productId, { id: i.productId, name: i.name, minQty: i.minQty ?? 1, stock: i.stock ?? null }])).values()];
    return {
      items: priced,
      count: priced.reduce((n, i) => n + i.qty, 0),
      ...t,
      hints: offerHints(priced, offers, typeWord),
      shortfalls: [
        ...minQtyShortfalls(priced, products),
        ...stockShortfalls(priced, products).map((s) => ({ productId: s.productId, name: s.name, minQty: 0, need: 0, stock: s.stock })),
      ],
      shipping: shippingStatus(t.totalPaise, catalog?.settings.freeShippingAbovePaise ?? null),
      coupon,
      applyCode,
      removeCode,
      add,
      setQty,
      remove,
      clear,
    };
  }, [items, catalog, coupon, applyCode, removeCode, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
