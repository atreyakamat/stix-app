import { SHOP_URL } from "./config";
import type { BlogPost, College, Collection, Coupon, CustomKind, EventType, GalleryItem, Offer, Order, Product, Settings, Stall } from "./types";

// The shop's public API. Shapes match src/lib/app-api.ts in stixnvibes-nv;
// bump CATALOG_VERSION there and here together.

export const CATALOG_VERSION = 1;

export type AppProduct = Omit<Product, "costPaise" | "lowStockAt" | "createdAt" | "updatedAt">;
export type AppSettings = Pick<
  Settings,
  "storeOpen" | "announcement" | "instagramHandle" | "orderNote" | "deliveryNote" | "bulkNote" | "freeShippingAbovePaise" | "mrpMarkupPercent"
>;
export type PublicStall = Pick<Stall, "id" | "name" | "date" | "venue" | "collegeId">;

export type Catalog = {
  version: number;
  updatedAt: string;
  shopUrl: string;
  products: AppProduct[];
  collections: Collection[];
  offers: Offer[];
  settings: AppSettings;
  colleges: College[];
  stalls: PublicStall[];
  posts: BlogPost[];
  gallery: GalleryItem[];
};

export type PayInfo = {
  amount: string;
  amountFixed: boolean;
  upiLink: string | null;
  upiId: string;
  online: boolean;
  whatsapp: string | null;
};

export type AppOrder = Omit<Order, "id" | "viewKey" | "adminNote" | "stockTaken"> & {
  pay: PayInfo | null;
  receiptUrl: string;
  orderUrl: string;
};

export type CartCoupon = Pick<Coupon, "code" | "percent" | "amountPaise" | "minOrderPaise" | "endsAt" | "description">;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public problems: { productId: string; reason: string }[] = [],
  ) {
    super(message);
  }
}

const OFFLINE = "No connection. Check your internet and try again.";

async function call<T>(path: string, init?: RequestInit, timeoutMs = 15_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${SHOP_URL}${path}`, { ...init, signal: ctrl.signal, headers: { Accept: "application/json", ...init?.headers } });
  } catch {
    throw new ApiError(OFFLINE, 0);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as T & { error?: string; problems?: { productId: string; reason: string }[] };
  if (!res.ok) throw new ApiError(body.error ?? "Something went wrong on our side. Try again.", res.status, body.problems ?? []);
  return body;
}

const postJSON = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const getCatalog = () => call<Catalog>("/api/app/shop");

export async function getOrder(number: string, key: string): Promise<AppOrder> {
  return (await call<{ order: AppOrder }>(`/api/app/order/${encodeURIComponent(number)}?k=${encodeURIComponent(key)}`)).order;
}

export type OrderBody = {
  lines: { productId: string; qty: number; selections: Record<string, string>; custom: Record<string, string> }[];
  customerName: string;
  customerPhone: string;
  fulfilment: "delivery" | "pickup";
  address: { line: string; city: string; state: string; pincode: string };
  customerNote: string;
  instagram: string;
  couponCode: string;
  source: string;
};

export const placeOrder = (body: OrderBody) => call<{ number: string; totalPaise: number; orderPath: string }>("/api/order", postJSON(body));

/** "/order/SNV-ABC123?k=xyz" -> { number, key }. */
export function parseOrderPath(path: string): { number: string; key: string } | null {
  const m = path.match(/\/order\/(SNV-[A-Z0-9]{6})\?(?:.*&)?k=([^&#]+)/);
  return m ? { number: m[1], key: decodeURIComponent(m[2]) } : null;
}

export async function checkCoupon(code: string): Promise<CartCoupon> {
  return (await call<{ coupon: CartCoupon }>(`/api/coupon?code=${encodeURIComponent(code)}`)).coupon;
}

/** Sends a photo from the phone. Returns the upload id the order keeps. */
export async function uploadPhoto(photo: { uri: string; mimeType: string; fileName: string }): Promise<string> {
  const form = new FormData();
  // React Native's FormData takes a file as { uri, name, type }.
  form.append("file", { uri: photo.uri, name: photo.fileName, type: photo.mimeType } as unknown as Blob);
  return (await call<{ id: string }>("/api/upload", { method: "POST", body: form }, 60_000)).id;
}

/** Starts an online payment. Gives the gateway link, or null to pay by UPI app instead. */
export type IdeaKind = "sticker" | "poster";
export type Idea = { idea: string; kind: IdeaKind; seed: number; url: string };

/** An AI picture link for a customer's idea (Pollinations, via the shop). */
export const drawIdea = (idea: string, kind: IdeaKind, seed?: number) => call<Idea>("/api/app/idea", postJSON({ idea, kind, seed }));

/** Keeps a drawn idea on the shop as an upload, for a custom request. */
export async function keepIdea(idea: Idea): Promise<string> {
  return (await call<{ id: string }>("/api/app/idea/keep", postJSON({ idea: idea.idea, kind: idea.kind, seed: idea.seed }), 30_000)).id;
}

export async function startPayment(number: string, key: string): Promise<string | null> {
  try {
    const r = await call<{ url?: string; fallback?: boolean }>("/api/pay", postJSON({ number, key }), 8_000);
    return r.url ?? null;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 503 || err.status === 429 || err.status === 0)) return null;
    throw err;
  }
}

export type CustomBody = {
  customerName: string;
  customerPhone: string;
  instagram: string;
  kind: CustomKind;
  size: string;
  qty: number;
  note: string;
  files: string[];
  source: string;
};

export const sendCustomRequest = (body: CustomBody) => call<{ number: string }>("/api/custom", postJSON(body));

/** Anonymous counts for the shop dashboard. Never throws. */
export async function track(events: { type: EventType; productId?: string | null; path?: string; source: string }[]) {
  try {
    await call("/api/events", postJSON(events.map((e) => ({ productId: null, path: "", ...e }))), 5_000);
  } catch {
    // Analytics are best effort.
  }
}

export const shopLink = (path: string) => `${SHOP_URL}${path}`;

/** A shop link for sharing, tagged so admin analytics counts visits from app shares. */
export const shareLink = (path: string) => `${SHOP_URL}${path}${path.includes("?") ? "&" : "?"}src=app-share`;
