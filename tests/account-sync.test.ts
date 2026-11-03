import { describe, expect, it } from "vitest";
import { mergeAccount, needsHydrating, placeholderOrder, savedOrderFields, toAccountBody, type Synced } from "@/lib/account-sync";
import { EMPTY_ACCOUNT_DATA, type Account } from "@/lib/types";

const local = (over: Partial<Synced> = {}): Synced => ({
  details: { name: "", phone: "", instagram: "", fulfilment: "delivery", address: { line: "", city: "", state: "Goa", pincode: "" } },
  taste: { collegeId: null, vibes: [], wishlist: [], recent: ["r1"] },
  orders: [],
  ...over,
});
const account = (data: Partial<Account["data"]> = {}): Account => ({ email: "a@b.com", name: "Riya", createdAt: "", updatedAt: "", data: { ...EMPTY_ACCOUNT_DATA, ...data } });
const order = (number: string) => ({ number, key: "k".repeat(22), totalPaise: 8000, createdAt: "2026-11-01T00:00:00Z", itemCount: 1, image: null, status: "paid" });

describe("account sync", () => {
  it("fills a new phone from the account", () => {
    const acc = account({
      details: { name: "Riya K", phone: "9876543210", instagram: "riya", fulfilment: "pickup", address: { line: "1 Main", city: "Panaji", state: "Goa", pincode: "403001" } },
      taste: { collegeId: "xavier", vibes: ["lofi"], wishlist: ["p1"], recent: [] },
      orders: [{ number: "SNV-AAAAAA", key: "k".repeat(22) }],
    });
    const m = mergeAccount(local(), acc);
    expect(m.details.name).toBe("Riya K");
    expect(m.details.fulfilment).toBe("pickup");
    expect(m.taste).toMatchObject({ collegeId: "xavier", vibes: ["lofi"], wishlist: ["p1"], recent: ["r1"] });
    expect(m.orders.map((o) => o.number)).toEqual(["SNV-AAAAAA"]);
    expect(needsHydrating(m.orders[0]!)).toBe(true);
  });

  it("keeps what the phone has that the account lacks, and joins lists", () => {
    const l = local({
      details: { ...local().details, name: "Local Name", phone: "9000000000" },
      taste: { collegeId: "goa-uni", vibes: ["anime"], wishlist: ["p2", "p1"], recent: [] },
      orders: [order("SNV-BBBBBB")],
    });
    const m = mergeAccount(l, account({ taste: { collegeId: null, vibes: [], wishlist: ["p1", "p3"], recent: [] }, orders: [{ number: "SNV-BBBBBB", key: "x".repeat(22) }, { number: "SNV-CCCCCC", key: "y".repeat(22) }] }));
    expect(m.details).toMatchObject({ name: "Local Name", phone: "9000000000" });
    expect(m.taste).toMatchObject({ collegeId: "goa-uni", vibes: ["anime"], wishlist: ["p2", "p1", "p3"] });
    // The order the phone already knows keeps its details; only the new one is a placeholder.
    expect(m.orders.map((o) => [o.number, needsHydrating(o)])).toEqual([["SNV-BBBBBB", false], ["SNV-CCCCCC", true]]);
  });

  it("lets the account's saved details win when both have them", () => {
    const l = local({ details: { ...local().details, name: "Old" } });
    expect(mergeAccount(l, account({ details: { ...EMPTY_ACCOUNT_DATA.details, name: "New" } })).details.name).toBe("New");
  });

  it("sends details, taste and order links, without recently viewed or order extras", () => {
    const body = toAccountBody(local({ orders: [order("SNV-AAAAAA")] }), "Riya");
    expect(body.name).toBe("Riya");
    expect(body.data.orders).toEqual([{ number: "SNV-AAAAAA", key: "k".repeat(22) }]);
    expect(body.data.taste.recent).toEqual([]);
  });

  it("fills an order's list entry from what the shop returns", () => {
    expect(savedOrderFields({ totalPaise: 9000, createdAt: "2026-11-02T00:00:00Z", status: "shipped", lines: [{ qty: 2, image: "i.png" }, { qty: 1, image: null }] } as never)).toEqual({
      totalPaise: 9000,
      createdAt: "2026-11-02T00:00:00Z",
      status: "shipped",
      itemCount: 3,
      image: "i.png",
    });
    expect(placeholderOrder({ number: "SNV-AAAAAA", key: "k" }).createdAt).toBe("");
  });
});
