import type { AppProduct, Catalog } from "./api";
import type { Collection } from "./types";

/** Collection cover: its own image, or the first product photo in it. */
export function collectionCover(c: Collection, products: AppProduct[]): string | null {
  return c.image || products.find((p) => p.collectionIds.includes(c.id) && p.images[0])?.images[0] || null;
}

const stallDay = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
/** "Sun, 2 Nov" for a YYYY-MM-DD stall date. */
export const formatStallDate = (d: string) => stallDay.format(new Date(d));

/** Today in India as YYYY-MM-DD. */
export const istToday = (now = new Date()) => new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

export function upcomingStalls(catalog: Pick<Catalog, "stalls">, collegeId?: string | null, now = new Date()) {
  const today = istToday(now);
  return catalog.stalls.filter((s) => s.date >= today && (!collegeId || s.collegeId === collegeId)).sort((a, b) => a.date.localeCompare(b.date));
}

/** Products that ask the customer for something: a name, a song, a photo. */
export const isPersonalised = (p: AppProduct) => p.customFields.length > 0;

export function searchProducts(products: AppProduct[], query: string): AppProduct[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return products;
  return products.filter((p) => {
    const hay = `${p.name} ${p.type} ${p.tags.join(" ")} ${p.description}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
