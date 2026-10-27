import { formatINR } from "./money";
import { formatPhone } from "./phone";
import type { Address, AppliedOffer, Fulfilment, OrderLine } from "./types";

export const DEFAULT_INSTAGRAM = "stixnvibes";

/** Instagram usernames: letters, numbers, dots and underscores, up to 30. */
export const INSTAGRAM_HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;

/** "@stixnvibes", "instagram.com/stixnvibes/" or "stixnvibes" -> "stixnvibes". */
export function cleanHandle(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.)?(instagram\.com|ig\.me\/m)\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

/**
 * Opens a DM with the shop. Instagram can't prefill a message, so the
 * text is copied to the clipboard first (see CopyAndDm).
 */
export function dmLink(handle?: string | null) {
  const h = cleanHandle(handle ?? "");
  return `https://ig.me/m/${INSTAGRAM_HANDLE_RE.test(h) ? h : DEFAULT_INSTAGRAM}`;
}

export type MessageInput = {
  number?: string | null;
  lines: Pick<OrderLine, "name" | "options" | "custom" | "qty" | "unitPricePaise" | "lineTotalPaise">[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  offers: Pick<AppliedOffer, "name" | "discountPaise">[];
  customerName?: string;
  customerPhone?: string;
  fulfilment?: Fulfilment;
  address?: Address;
  customerNote?: string;
  /** null = no free shipping threshold, so no shipping line. */
  freeShippingAbovePaise?: number | null;
  /** The customer's order page. */
  link?: string;
};

export const addressText = (a: Address) => [a.line, a.city, [a.state, a.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", ");

/** The order as a message the customer sends to the shop on Instagram. */
export function orderMessage(o: MessageInput): string {
  const out: string[] = ["Hi Stix N Vibes! I'd like to order:", ""];
  o.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.name} × ${l.qty} = ${formatINR(l.lineTotalPaise)}`);
    for (const opt of l.options) out.push(`   ${opt}`);
    for (const c of l.custom) out.push(`   ${c.label}: ${c.value}`);
  });
  out.push("");
  if (o.discountPaise > 0) {
    out.push(`Subtotal: ${formatINR(o.subtotalPaise)}`);
    for (const a of o.offers) out.push(`${a.name}: −${formatINR(a.discountPaise)}`);
  }
  out.push(`Total: ${formatINR(o.totalPaise)}`);
  const pickup = o.fulfilment === "pickup";
  if (o.freeShippingAbovePaise != null && !pickup) {
    out.push(o.totalPaise >= o.freeShippingAbovePaise ? "Shipping: free" : "Shipping: please share the charge for my area");
  }
  if (o.customerName || o.customerPhone) out.push("");
  if (o.customerName) out.push(`Name: ${o.customerName}`);
  if (o.customerPhone) out.push(`Phone: ${formatPhone(o.customerPhone)}`);
  if (pickup) out.push("Pickup: at your next stall");
  else if (o.address && addressText(o.address)) out.push(`Deliver to: ${addressText(o.address)}`);
  if (o.customerNote) out.push(`Note: ${o.customerNote}`);
  if (o.number) out.push("", `Order ref: ${o.number}`);
  if (o.link) out.push(`Order page: ${o.link}`);
  return out.join("\n");
}

/** A question about one product that has no online price, or is upcoming. */
export function askMessage(name: string, url: string) {
  return `Hi Stix N Vibes! I'm interested in "${name}". ${url}`;
}
