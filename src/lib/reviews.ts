import type { Catalog, PublicReview } from "./api";

/** Published reviews of one product, newest first. */
export function reviewsFor(catalog: Pick<Catalog, "reviews">, productId: string): PublicReview[] {
  return (catalog.reviews ?? []).filter((r) => r.productId === productId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Average rating to one decimal and how many reviews, or null when there are none. */
export function ratingSummary(reviews: Pick<PublicReview, "rating">[]): { average: number; count: number } | null {
  if (!reviews.length) return null;
  const average = Math.round((reviews.reduce((n, r) => n + r.rating, 0) / reviews.length) * 10) / 10;
  return { average, count: reviews.length };
}

/** Every product's summary at once, for product cards. */
export function ratingsByProduct(catalog: Pick<Catalog, "reviews">): Map<string, { average: number; count: number }> {
  const groups = new Map<string, PublicReview[]>();
  for (const r of catalog.reviews ?? []) groups.set(r.productId, [...(groups.get(r.productId) ?? []), r]);
  return new Map([...groups].map(([id, rs]) => [id, ratingSummary(rs)!]));
}

/** Order statuses where the customer has the item, so a review makes sense. */
export const REVIEWABLE = ["paid", "shipped", "done"] as const;
