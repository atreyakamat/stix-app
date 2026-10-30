import type { AppProduct, Catalog } from "./api";
import { formatINR } from "./money";
import { canOrder, fromPrice } from "./pricing";
import type { Collection, Offer } from "./types";

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

/** The running buy-X-get-Y sticker offer set in admin, if any. */
export function stickerPackOffer(catalog: Pick<Catalog, "offers">): Offer | null {
  return catalog.offers.filter((o) => o.kind === "bxgy" && (o.productType === "sticker" || o.productType === null)).sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;
}

/** "Stickers from ₹10. Buy 4, get 1 free." from live prices and offers, never hardcoded. */
export function stickerPitch(catalog: Pick<Catalog, "products" | "offers">): string {
  const prices = catalog.products.filter((p) => p.type === "sticker" && canOrder(p)).map(fromPrice).filter((n): n is number => n !== null);
  const offer = stickerPackOffer(catalog);
  return [prices.length ? `Stickers from ${formatINR(Math.min(...prices))}.` : "", offer ? `${offer.name.replace(/\.$/, "")}.` : ""].filter(Boolean).join(" ");
}
