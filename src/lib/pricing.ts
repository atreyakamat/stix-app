import { formatINR } from "./money";
import type { AppliedOffer, Coupon, Offer, Product, ProductType } from "./types";

// Pricing rules shared by the browser (cart totals) and the server (the
// order record). Pure functions, no I/O.

/** Picked option value per option group: { [groupId]: valueId }. */
export type Selections = Record<string, string>;

export function defaultSelections(product: Pick<Product, "options">): Selections {
  const out: Selections = {};
  for (const g of product.options) if (g.values[0]) out[g.id] = g.values[0].id;
  return out;
}

/**
 * Resolves picked options to labels and the price change they add. Groups
 * the customer didn't touch fall back to their first value. Returns null
 * when a picked value doesn't exist (the product changed under the cart).
 */
export function resolveOptions(product: Pick<Product, "options">, selections: Selections) {
  const labels: string[] = [];
  const resolved: Selections = {};
  let deltaPaise = 0;
  for (const g of product.options) {
    if (!g.values.length) continue;
    const id = selections[g.id] ?? g.values[0].id;
    const v = g.values.find((x) => x.id === id);
    if (!v) return null;
    resolved[g.id] = v.id;
    labels.push(`${g.name}: ${v.label}`);
    deltaPaise += v.priceDeltaPaise;
  }
  return { labels, deltaPaise, selections: resolved };
}

export function unitPrice(product: Pick<Product, "options" | "pricePaise">, selections: Selections): number | null {
  if (product.pricePaise === null) return null;
  const r = resolveOptions(product, selections);
  return r ? Math.max(0, product.pricePaise + r.deltaPaise) : null;
}

/** Lowest price a customer can pay for this product, for "From ₹x" labels. */
export function fromPrice(product: Pick<Product, "options" | "pricePaise">): number | null {
  if (product.pricePaise === null) return null;
  let p = product.pricePaise;
  for (const g of product.options) if (g.values.length) p += Math.min(...g.values.map((v) => v.priceDeltaPaise));
  return Math.max(0, p);
}

export function hasPriceRange(product: Pick<Product, "options">): boolean {
  return product.options.some((g) => new Set(g.values.map((v) => v.priceDeltaPaise)).size > 1);
}

/** Marked sold out, or a stock count that has run out. */
export const isSoldOut = (product: Pick<Product, "soldOut" | "stock">) => product.soldOut || product.stock === 0;

export function canOrder(product: Pick<Product, "status" | "soldOut" | "stock" | "pricePaise">): boolean {
  return product.status === "live" && !isSoldOut(product) && product.pricePaise !== null;
}

export type PricedLine = { type: ProductType; unitPricePaise: number; qty: number };

const validOffer = (o: Offer) =>
  o.active &&
  (o.kind === "percent"
    ? o.percent !== null && o.percent > 0 && o.percent <= 90
    : o.buy > 0 && (o.kind === "volume" ? o.pricePaise !== null && o.pricePaise >= 0 : o.free > 0));

/** Offers switched on and inside their date window at `now`. */
export function liveOffers(offers: Offer[], now: Date = new Date()): Offer[] {
  const t = now.getTime();
  return offers.filter(
    (o) => o.active && (!o.startsAt || Date.parse(o.startsAt) <= t) && (!o.endsAt || Date.parse(o.endsAt) > t),
  );
}

/** The banner of the first running campaign that has one. */
export function campaignBanner(offers: Offer[], now: Date = new Date()): string {
  return liveOffers(offers, now).find((o) => o.kind === "percent" && o.banner.trim())?.banner.trim() ?? "";
}

/**
 * The struck-through MRP for a price: the product's own "was" price, or the
 * price plus the shop's markup rounded up to a whole rupee (₹10 at 20% → ₹12).
 * null when there's nothing higher to show.
 */
export function mrpFor(pricePaise: number | null, compareAtPaise: number | null, markupPercent: number | null): number | null {
  if (pricePaise === null || pricePaise <= 0) return null;
  if (compareAtPaise !== null && compareAtPaise > pricePaise) return compareAtPaise;
  if (!markupPercent || markupPercent <= 0) return null;
  return Math.ceil((pricePaise * (100 + markupPercent)) / 100 / 100) * 100;
}
const matches = (o: Offer, type: ProductType) => o.productType === null || o.productType === type;

/** The volume tier that applies to `n` items, if any: the lowest price reached. */
function volumeTier(offers: Offer[], n: number) {
  return offers.filter((o) => o.buy <= n).sort((a, b) => a.pricePaise! - b.pricePaise!)[0] ?? null;
}

/**
 * Applies offers in three passes.
 *
 * 1. Volume pricing: for each product type with volume tiers, once the cart
 *    holds `buy` or more of that type, every unit costs the tier price
 *    (6+ wall cards at ₹25, 11+ at ₹20).
 * 2. Buy-X-get-Y: per offer, the eligible units are sorted from most to
 *    least expensive and cut into groups of (buy + free); in every full
 *    group the cheapest `free` units cost nothing. A unit counts toward one
 *    offer only, and offers apply in their sort order.
 * 3. Campaigns (percent): each remaining unit gets the biggest % off that
 *    covers its type, on its price after passes 1 and 2. Rounded down to
 *    the paisa per unit, so the shop never gives away more than it says.
 */
export function applyOffers(lines: PricedLine[], offers: Offer[]) {
  const active = offers.filter(validOffer).sort((a, b) => a.sortOrder - b.sortOrder);
  const applied: AppliedOffer[] = [];
  const prices = lines.map((l) => l.unitPricePaise);

  const volume = active.filter((o) => o.kind === "volume");
  for (const scope of new Set(volume.map((o) => o.productType))) {
    const tiers = volume.filter((o) => o.productType === scope);
    const idx = lines.map((l, i) => (scope === null || l.type === scope ? i : -1)).filter((i) => i >= 0);
    const tier = volumeTier(tiers, idx.reduce((n, i) => n + lines[i].qty, 0));
    if (!tier) continue;
    let discount = 0;
    for (const i of idx) {
      const cut = Math.max(0, prices[i] - tier.pricePaise!);
      discount += cut * lines[i].qty;
      prices[i] -= cut;
    }
    if (discount > 0) applied.push({ offerId: tier.id, name: tier.name, freeUnits: 0, discountPaise: discount });
  }

  const units = lines.flatMap((l, li) => Array.from({ length: l.qty }, () => ({ type: l.type, price: prices[li], taken: false })));
  for (const offer of active.filter((o) => o.kind === "bxgy")) {
    const size = offer.buy + offer.free;
    const eligible = units.filter((u) => !u.taken && matches(offer, u.type)).sort((a, b) => b.price - a.price);
    const groups = Math.floor(eligible.length / size);
    if (!groups) continue;
    let discount = 0;
    for (let g = 0; g < groups; g++) {
      const chunk = eligible.slice(g * size, (g + 1) * size);
      chunk.forEach((u) => (u.taken = true));
      for (const u of chunk.slice(offer.buy)) {
        discount += u.price;
        u.price = 0;
      }
    }
    applied.push({ offerId: offer.id, name: offer.name, freeUnits: groups * offer.free, discountPaise: discount });
  }

  const percent = active.filter((o) => o.kind === "percent");
  if (percent.length) {
    const byOffer = new Map<string, number>();
    for (const u of units) {
      if (u.price <= 0) continue;
      const best = percent.filter((o) => matches(o, u.type)).sort((a, b) => b.percent! - a.percent! || a.sortOrder - b.sortOrder)[0];
      if (!best) continue;
      byOffer.set(best.id, (byOffer.get(best.id) ?? 0) + Math.floor((u.price * best.percent!) / 100));
    }
    for (const o of percent) {
      const d = byOffer.get(o.id) ?? 0;
      if (d > 0) applied.push({ offerId: o.id, name: o.name, freeUnits: 0, discountPaise: d });
    }
  }
  const discountPaise = applied.reduce((n, a) => n + a.discountPaise, 0);
  return { applied, discountPaise };
}

/** Coupon codes are typed in any case, stored uppercase. */
export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");
export const COUPON_CODE_RE = /^[A-Z0-9-]{3,20}$/;

/**
 * Why a coupon can't be used right now, or null when it can. `uses` is the
 * count of orders already placed with it (server only; the browser passes 0).
 */
export function couponProblem(c: Coupon, totalPaise: number, uses = 0, now: Date = new Date()): string | null {
  const t = now.getTime();
  if (!c.active || (c.startsAt && Date.parse(c.startsAt) > t) || (c.endsAt && Date.parse(c.endsAt) <= t)) return `The code ${c.code} isn't running right now.`;
  if (c.maxUses !== null && uses >= c.maxUses) return `The code ${c.code} has been used up.`;
  if (totalPaise < c.minOrderPaise) return `${c.code} works on orders of ${formatINR(c.minOrderPaise)} or more.`;
  return null;
}

/** The coupon's discount on what's left after offers. Never more than the total. */
export function couponDiscount(c: Pick<Coupon, "percent" | "amountPaise">, totalPaise: number): number {
  const d = c.percent !== null ? Math.floor((totalPaise * c.percent) / 100) : (c.amountPaise ?? 0);
  return Math.max(0, Math.min(totalPaise, d));
}

/**
 * Cart totals: offers first, then the coupon (if it applies) on what's
 * left. The coupon shows in `applied` as offerId "coupon:<CODE>".
 */
export function totals(lines: PricedLine[], offers: Offer[], coupon?: Coupon | null, uses = 0) {
  const subtotalPaise = lines.reduce((n, l) => n + l.unitPricePaise * l.qty, 0);
  const { applied, discountPaise } = applyOffers(lines, offers);
  let total = subtotalPaise - discountPaise;
  let couponProblemText: string | null = null;
  let couponCode = "";
  if (coupon) {
    couponProblemText = couponProblem(coupon, total, uses);
    const d = couponProblemText ? 0 : couponDiscount(coupon, total);
    if (d > 0) {
      applied.push({ offerId: `coupon:${coupon.code}`, name: `Code ${coupon.code}`, freeUnits: 0, discountPaise: d });
      total -= d;
      couponCode = coupon.code;
    }
  }
  return { subtotalPaise, discountPaise: subtotalPaise - total, totalPaise: total, applied, couponCode, couponProblem: couponProblemText };
}

/** "Add 1 more sticker and it's free" nudges for the cart. */
export function offerHints(lines: PricedLine[], offers: Offer[], label: (type: ProductType | null, n: number) => string): string[] {
  const hints: string[] = [];
  const active = offers.filter(validOffer).sort((a, b) => a.sortOrder - b.sortOrder);
  const count = (o: Offer) => lines.filter((l) => matches(o, l.type)).reduce((s, l) => s + l.qty, 0);

  const volume = active.filter((o) => o.kind === "volume");
  for (const scope of new Set(volume.map((o) => o.productType))) {
    const tiers = volume.filter((o) => o.productType === scope).sort((a, b) => a.buy - b.buy);
    const n = count(tiers[0]);
    const current = volumeTier(tiers, n);
    const next = tiers.find((t) => t.buy > n && (!current || t.pricePaise! < current.pricePaise!));
    if (n === 0 || !next) continue;
    const need = next.buy - n;
    hints.push(`Add ${need} more ${label(scope, need)} to pay ${formatINR(next.pricePaise!)} each.`);
  }

  for (const o of active.filter((x) => x.kind === "bxgy")) {
    const n = count(o);
    if (n === 0) continue;
    const size = o.buy + o.free;
    const inGroup = n % size;
    if (inGroup === 0) continue;
    const need = size - inGroup;
    hints.push(
      need <= o.free
        ? `Add ${need} more ${label(o.productType, need)} and ${need === 1 ? "it's" : "they're"} free (${o.name}).`
        : `Add ${need - o.free} more ${label(o.productType, need - o.free)} to unlock ${o.name}.`,
    );
  }
  return hints;
}

/** Products whose minimum order isn't met yet, e.g. music cards (min 5). */
export function minQtyShortfalls(lines: { productId: string; qty: number }[], products: { id: string; name: string; minQty: number }[]) {
  const qty = new Map<string, number>();
  for (const l of lines) qty.set(l.productId, (qty.get(l.productId) ?? 0) + l.qty);
  return products
    .filter((p) => qty.has(p.id) && qty.get(p.id)! < p.minQty)
    .map((p) => ({ productId: p.id, name: p.name, minQty: p.minQty, need: p.minQty - qty.get(p.id)! }));
}

/** Lines asking for more than a counted stock holds (summed per product). */
export function stockShortfalls(lines: { productId: string; qty: number }[], products: { id: string; name: string; stock: number | null }[]) {
  const qty = new Map<string, number>();
  for (const l of lines) qty.set(l.productId, (qty.get(l.productId) ?? 0) + l.qty);
  return products
    .filter((p) => p.stock !== null && qty.has(p.id) && qty.get(p.id)! > p.stock)
    .map((p) => ({ productId: p.id, name: p.name, stock: p.stock! }));
}

/** Free shipping nudge; null when there's no threshold. */
export function shippingStatus(totalPaise: number, freeAbovePaise: number | null) {
  if (freeAbovePaise === null) return null;
  return totalPaise >= freeAbovePaise ? { free: true, needPaise: 0 } : { free: false, needPaise: freeAbovePaise - totalPaise };
}
