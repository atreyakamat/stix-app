import type { AppOrder, AppProduct } from "./api";
import { canOrder, resolveOptions } from "./pricing";
import type { NewCartItem } from "@/state/cart";

// "Order again": turns a past order's lines back into cart items at today's
// prices. Orders keep option labels ("Size: A3"), so they are matched back to
// the product's current options by name. Personalised lines (a name, a song,
// a photo) and anything no longer sold are left out and reported, so the
// customer can redo them on the product page.

export type Reorder = { items: { item: NewCartItem; qty: number }[]; skipped: { name: string; slug: string; why: "gone" | "personal" | "options" }[] };

export function reorderLines(order: Pick<AppOrder, "lines">, products: AppProduct[]): Reorder {
  const out: Reorder = { items: [], skipped: [] };
  for (const line of order.lines) {
    const p = products.find((x) => x.id === line.productId);
    if (!p || !canOrder(p)) {
      out.skipped.push({ name: line.name, slug: line.slug, why: "gone" });
      continue;
    }
    if (line.custom.length || p.customFields.some((f) => f.required)) {
      out.skipped.push({ name: line.name, slug: p.slug, why: "personal" });
      continue;
    }
    const picked: Record<string, string> = {};
    let ok = true;
    for (const label of line.options) {
      const at = label.indexOf(": ");
      const g = p.options.find((x) => x.name === label.slice(0, at));
      const v = g?.values.find((x) => x.label === label.slice(at + 2));
      if (!g || !v) ok = false;
      else picked[g.id] = v.id;
    }
    const r = ok ? resolveOptions(p, picked) : null;
    if (!r || p.pricePaise === null) {
      out.skipped.push({ name: line.name, slug: p.slug, why: "options" });
      continue;
    }
    out.items.push({
      qty: Math.max(line.qty, p.minQty),
      item: {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        type: p.type,
        image: p.images[0] ?? null,
        unitPricePaise: Math.max(0, p.pricePaise + r.deltaPaise),
        minQty: p.minQty,
        stock: p.stock,
        selections: r.selections,
        optionLabels: r.labels,
        custom: {},
        customDisplay: [],
      },
    });
  }
  return out;
}
