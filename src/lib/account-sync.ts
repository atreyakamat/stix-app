import type { AppOrder } from "./api";
import type { Account, AccountData } from "./types";
import type { Details, SavedOrder } from "@/state/me";
import type { Taste } from "./personal";

// Optional accounts: what the phone shares with the shop's account, and how
// the two are merged. Pure functions, so the rules are tested.

/** Who is signed in on this phone. The token proves it to the shop; it lasts 90 days. */
export type AccountSession = { email: string; name: string; token: string; expiresAt: string };

/** The parts of the phone's memory that follow an account. */
export type Synced = { details: Details; taste: Taste; orders: SavedOrder[] };

/** What the phone sends the shop. Recently viewed stays on the phone. */
export function toAccountBody(s: Synced, name: string): { name: string; data: AccountData } {
  return {
    name,
    data: {
      details: s.details,
      taste: { collegeId: s.taste.collegeId, vibes: s.taste.vibes, wishlist: s.taste.wishlist, recent: [] },
      orders: s.orders.slice(0, 200).map((o) => ({ number: o.number, key: o.key })),
    },
  };
}

const pick = (server: string, local: string) => (server.trim() ? server : local);
const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

/** An order known only by number and key, until the shop tells us the rest. */
export const placeholderOrder = (ref: { number: string; key: string }): SavedOrder => ({ number: ref.number, key: ref.key, totalPaise: 0, createdAt: "", itemCount: 0, image: null, status: "new" });
export const needsHydrating = (o: SavedOrder) => o.createdAt === "";

export function savedOrderFields(order: Pick<AppOrder, "totalPaise" | "createdAt" | "status" | "lines">): Partial<SavedOrder> {
  return { totalPaise: order.totalPaise, createdAt: order.createdAt, status: order.status, itemCount: order.lines.reduce((n, l) => n + l.qty, 0), image: order.lines[0]?.image ?? null };
}

/**
 * Signing in (or opening the app signed in): the account fills what it has,
 * the phone keeps what the account lacks. Orders and wishlist are joined,
 * never dropped.
 */
export function mergeAccount(local: Synced, acc: Account): Synced {
  const d = acc.data.details;
  const t = acc.data.taste;
  const known = new Set(local.orders.map((o) => o.number));
  return {
    details: {
      name: pick(d.name, local.details.name),
      phone: pick(d.phone, local.details.phone),
      instagram: pick(d.instagram, local.details.instagram),
      fulfilment: d.name || d.phone ? d.fulfilment : local.details.fulfilment,
      address: {
        line: pick(d.address.line, local.details.address.line),
        city: pick(d.address.city, local.details.address.city),
        state: pick(d.address.state, local.details.address.state),
        pincode: pick(d.address.pincode, local.details.address.pincode),
      },
    },
    taste: {
      collegeId: t.collegeId ?? local.taste.collegeId,
      vibes: t.vibes.length ? t.vibes : local.taste.vibes,
      wishlist: union(local.taste.wishlist, t.wishlist),
      recent: local.taste.recent,
    },
    orders: [...local.orders, ...acc.data.orders.filter((r) => !known.has(r.number)).map(placeholderOrder)].slice(0, 100),
  };
}
