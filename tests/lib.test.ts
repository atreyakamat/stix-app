import { describe, expect, it } from "vitest";
import type { AppProduct } from "@/lib/api";
import { parseOrderPath } from "@/lib/api";
import { forYou, pushRecent, vibeChoices, type Taste } from "@/lib/personal";
import { offerHints, totals } from "@/lib/pricing";
import { istToday, searchProducts, stickerPitch, upcomingStalls } from "@/lib/shop-helpers";
import type { Offer } from "@/lib/types";
import { ratingSummary, reviewsFor } from "@/lib/reviews";
import { parseUpiResponse, withTxnRef } from "@/lib/upi";

const product = (over: Partial<AppProduct>): AppProduct => ({
  id: "p",
  slug: "p",
  name: "P",
  type: "sticker",
  collectionIds: [],
  description: "",
  details: "",
  images: [],
  tags: [],
  status: "live",
  featured: false,
  soldOut: false,
  badge: "",
  sortOrder: 0,
  pricePaise: 1000,
  compareAtPaise: null,
  minQty: 1,
  options: [],
  customFields: [],
  stock: null,
  ...over,
});

const buy4get1: Offer = { id: "o", kind: "bxgy", name: "Buy 4 stickers, get 1 free", description: "", productType: "sticker", buy: 4, free: 1, pricePaise: null, percent: null, startsAt: null, endsAt: null, banner: "", active: true, sortOrder: 0 };

describe("cart pricing (same code as the shop)", () => {
  it("prices 5 stickers at ₹40 with buy 4 get 1, as the shop server did", () => {
    const t = totals([{ type: "sticker", unitPricePaise: 1000, qty: 5 }], [buy4get1]);
    expect(t).toMatchObject({ subtotalPaise: 5000, discountPaise: 1000, totalPaise: 4000 });
  });
  it("nudges toward the free sticker", () => {
    expect(offerHints([{ type: "sticker", unitPricePaise: 1000, qty: 3 }], [buy4get1], (_t, n) => (n === 1 ? "sticker" : "stickers"))[0]).toMatch(/Add 1 more sticker to unlock/);
  });
});

describe("order links", () => {
  it("reads the number and key from the shop's order path", () => {
    expect(parseOrderPath("/order/SNV-ABC234?k=Qw2r-hP_o")).toEqual({ number: "SNV-ABC234", key: "Qw2r-hP_o" });
    expect(parseOrderPath("/order/SNV-ABC234?new=1&k=a%2Bb")).toEqual({ number: "SNV-ABC234", key: "a+b" });
    expect(parseOrderPath("/order/nope")).toBeNull();
  });
});

describe("UPI app replies", () => {
  it("reads success, failure and pending from the response string", () => {
    expect(parseUpiResponse("txnId=AX1&responseCode=00&Status=SUCCESS&txnRef=SNV-ABC234")).toBe("success");
    expect(parseUpiResponse("Status=FAILURE&responseCode=ZD")).toBe("failure");
    expect(parseUpiResponse("status=submitted")).toBe("submitted");
    expect(parseUpiResponse("SUCCESS")).toBe("success");
    expect(parseUpiResponse(undefined)).toBe("unknown");
    expect(parseUpiResponse("")).toBe("unknown");
  });
  it("adds the order ref once", () => {
    const link = "upi://pay?pa=stix%40okicici&pn=Stix&cu=INR&am=40.00";
    expect(withTxnRef(link, "SNV-ABC234")).toBe(`${link}&tr=SNV-ABC234`);
    expect(withTxnRef(`${link}&tr=X`, "SNV-ABC234")).toBe(`${link}&tr=X`);
    expect(withTxnRef("https://evil.example", "SNV-ABC234")).toBe("https://evil.example");
  });
});

describe("for you", () => {
  const anime = product({ id: "a", collectionIds: ["c-anime"], sortOrder: 2 });
  const cars = product({ id: "b", tags: ["Cars"], sortOrder: 1 });
  const plain = product({ id: "c", sortOrder: 0, featured: true });
  const gone = product({ id: "d", collectionIds: ["c-anime"], soldOut: true });
  const catalog = { products: [plain, cars, anime, gone], colleges: [], collections: [{ id: "c-anime", slug: "anime", name: "Anime", description: "", image: "", active: true, featured: false, sortOrder: 0, createdAt: "" }] };
  const taste: Taste = { collegeId: null, vibes: [], wishlist: [], recent: [] };

  it("keeps the shop's order with no taste, and leaves out sold out items", () => {
    expect(forYou(catalog, taste).map((p) => p.id)).toEqual(["c", "b", "a"]);
  });
  it("leads with the picked vibes", () => {
    expect(forYou(catalog, { ...taste, vibes: ["c:c-anime"] })[0].id).toBe("a");
    expect(forYou(catalog, { ...taste, vibes: ["t:cars"] })[0].id).toBe("b");
  });
  it("offers collections and repeated tags as vibes", () => {
    const v = vibeChoices({ ...catalog, products: [...catalog.products, product({ id: "e", tags: ["cars"] })] });
    expect(v.map((x) => x.id)).toEqual(["c:c-anime", "t:cars"]);
  });
  it("keeps recently viewed unique and newest first", () => {
    expect(pushRecent(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
  });
});

describe("shop helpers", () => {
  it("searches name, type and tags with every word", () => {
    const list = [product({ id: "1", name: "Lo-fi 01", tags: ["lofi"] }), product({ id: "2", name: "Car poster", type: "poster" })];
    expect(searchProducts(list, "car poster").map((p) => p.id)).toEqual(["2"]);
    expect(searchProducts(list, "  ").length).toBe(2);
  });
  it("lists stalls from today in India, soonest first", () => {
    const now = new Date("2026-10-26T20:00:00Z"); // 27 Oct, 1:30 am in India
    expect(istToday(now)).toBe("2026-10-27");
    const stalls = [
      { id: "1", name: "A", date: "2026-11-02", venue: "", collegeId: null },
      { id: "2", name: "B", date: "2026-10-26", venue: "", collegeId: null },
      { id: "3", name: "C", date: "2026-10-27", venue: "", collegeId: "x" },
    ];
    expect(upcomingStalls({ stalls }, null, now).map((s) => s.id)).toEqual(["3", "1"]);
    expect(upcomingStalls({ stalls }, "x", now).map((s) => s.id)).toEqual(["3"]);
  });
});

describe("admin-driven copy", () => {
  it("builds the sticker pitch from live prices and the admin offer", () => {
    const products = [product({ id: "a", type: "sticker", pricePaise: 1500 }), product({ id: "b", type: "sticker", pricePaise: 1200 }), product({ id: "c", type: "poster", pricePaise: 500 })];
    expect(stickerPitch({ products, offers: [buy4get1] })).toBe("Stickers from ₹12. Buy 4 stickers, get 1 free.");
    expect(stickerPitch({ products, offers: [] })).toBe("Stickers from ₹12.");
    expect(stickerPitch({ products: [], offers: [] })).toBe("");
  });
});

describe("reviews", () => {
  const r = (productId: string, rating: number, createdAt: string) => ({ id: `${productId}${rating}${createdAt}`, productId, name: "A", rating, text: "", photos: [], verified: false, reply: "", repliedAt: null, createdAt });
  it("lists a product's reviews newest first and averages them", () => {
    const catalog = { reviews: [r("a", 5, "2026-10-01"), r("b", 1, "2026-10-02"), r("a", 4, "2026-10-03")] };
    expect(reviewsFor(catalog, "a").map((x) => x.rating)).toEqual([4, 5]);
    expect(ratingSummary(reviewsFor(catalog, "a"))).toEqual({ average: 4.5, count: 2 });
    expect(ratingSummary([])).toBeNull();
    expect(reviewsFor({}, "a")).toEqual([]);
  });
});
