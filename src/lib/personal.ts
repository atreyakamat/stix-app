import type { AppProduct, Catalog } from "./api";
import { canOrder, isSoldOut } from "./pricing";

// "For you" on the home screen. Everything it uses stays on the phone: the
// college and vibes picked on first open, hearts, and recently viewed.

export type Taste = {
  collegeId: string | null;
  /** Picked vibes: collection ids or tags. */
  vibes: string[];
  wishlist: string[];
  /** Product ids, newest first. */
  recent: string[];
};

/** Vibes to offer on first open: active collections, then the most used tags. */
export function vibeChoices(catalog: Pick<Catalog, "collections" | "products">, max = 12): { id: string; label: string }[] {
  const fromCollections = catalog.collections.map((c) => ({ id: `c:${c.id}`, label: c.name }));
  const counts = new Map<string, number>();
  for (const p of catalog.products) for (const t of p.tags) counts.set(t.toLowerCase(), (counts.get(t.toLowerCase()) ?? 0) + 1);
  const taken = new Set(fromCollections.map((c) => c.label.toLowerCase()));
  const fromTags = [...counts.entries()]
    .filter(([t, n]) => n >= 2 && !taken.has(t))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => ({ id: `t:${t}`, label: t.charAt(0).toUpperCase() + t.slice(1) }));
  return [...fromCollections, ...fromTags].slice(0, max);
}

/** How well a product fits the customer's taste. Higher is better. */
export function score(p: AppProduct, taste: Taste, collegeProductIds: Set<string>, recentTypes: Set<string>): number {
  let s = 0;
  for (const v of taste.vibes) {
    if (v.startsWith("c:") && p.collectionIds.includes(v.slice(2))) s += 3;
    if (v.startsWith("t:") && p.tags.some((t) => t.toLowerCase() === v.slice(2))) s += 2;
  }
  if (collegeProductIds.has(p.id)) s += 3;
  if (taste.wishlist.includes(p.id)) s += 1;
  // More of the kind they've been looking at, but not the exact items again.
  if (recentTypes.has(p.type)) s += 1;
  if (taste.recent.slice(0, 6).includes(p.id)) s -= 2;
  if (p.featured) s += 1;
  return s;
}

/** Orderable products ranked for this customer; ties keep the shop's own order. */
export function forYou(catalog: Pick<Catalog, "products" | "colleges">, taste: Taste, limit = 10): AppProduct[] {
  const college = catalog.colleges.find((c) => c.id === taste.collegeId);
  const collegeIds = new Set(college?.productIds ?? []);
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const recentTypes = new Set(taste.recent.slice(0, 6).flatMap((id) => byId.get(id)?.type ?? []));
  return catalog.products
    .filter((p) => canOrder(p) && !isSoldOut(p))
    .map((p, i) => ({ p, i, s: score(p, taste, collegeIds, recentTypes) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.p);
}

/** Moves an id to the front of a most-recent-first list. */
export function pushRecent(list: string[], id: string, max = 20): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}
