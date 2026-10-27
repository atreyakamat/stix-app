// Shared domain types. Money is always integer paise (₹1 = 100 paise) so
// totals never pick up floating point drift.

export const PRODUCT_TYPES = [
  { id: "sticker", label: "Stickers", one: "Sticker", blurb: "Single stickers in paper vinyl or waterproof. Mix any designs." },
  { id: "sheet", label: "Sticker sheets", one: "Sticker sheet", blurb: "Super sheets packed with stickers. The bulk deal." },
  { id: "poster", label: "Posters", one: "Poster", blurb: "A4 or A3, sticker or normal print, framed or not. Your call." },
  { id: "music-card", label: "Music cards", one: "Music card", blurb: "A Spotify code with your photo or the album cover. Dedicate a song." },
  { id: "wall-card", label: "Wall cards", one: "Wall card", blurb: "10 × 10 cm cards for corners, desks and wall grids." },
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number]["id"];
export const PRODUCT_TYPE_IDS = PRODUCT_TYPES.map((t) => t.id) as [ProductType, ...ProductType[]];
export const typeLabel = (id: string) => PRODUCT_TYPES.find((t) => t.id === id)?.label ?? id;

/** live: orderable. upcoming: shown as "coming soon". hidden: admin only. */
export const PRODUCT_STATUSES = ["live", "upcoming", "hidden"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type OptionValue = {
  id: string;
  label: string;
  /** Added to the base price when picked. Can be 0. */
  priceDeltaPaise: number;
};

/** A choice the customer makes, e.g. Size: A4 / A3. First value is the default. */
export type OptionGroup = {
  id: string;
  name: string;
  values: OptionValue[];
};

export const CUSTOM_FIELD_KINDS = ["text", "textarea", "link", "image"] as const;
export type CustomFieldKind = (typeof CUSTOM_FIELD_KINDS)[number];

/** Something the customer fills in, e.g. a Spotify link or a photo. */
export type CustomField = {
  id: string;
  label: string;
  kind: CustomFieldKind;
  required: boolean;
  help: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  collectionIds: string[];
  description: string;
  /** Material, size and care notes shown on the product page. */
  details: string;
  images: string[];
  tags: string[];
  status: ProductStatus;
  featured: boolean;
  soldOut: boolean;
  /** Short label on the card, e.g. "New" or "Bestseller". */
  badge: string;
  sortOrder: number;
  /** null = no price online; customers ask on Instagram. */
  pricePaise: number | null;
  /** Optional "was" price shown struck through. */
  compareAtPaise: number | null;
  /** Fewest a customer can order (across all lines of this product). */
  minQty: number;
  options: OptionGroup[];
  customFields: CustomField[];
  /** Units in hand. null = not counted (made to order); 0 = sold out. */
  stock: number | null;
  /** Admin warning when stock drops to this or below. */
  lowStockAt: number;
  /** What one unit costs to make. null = the default for its type in Settings. */
  costPaise: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Cover image; falls back to the first product's image. */
  image: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  createdAt: string;
};

export const OFFER_KINDS = ["bxgy", "volume", "percent"] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

/**
 * bxgy: buy `buy`, get `free` free.
 * volume: once `buy` or more of the type are in the cart, each costs `pricePaise`.
 * percent: `percent`% off (a campaign), on what's left after the other offers.
 * Each applies to one product type, or to every type when productType is null,
 * and only between startsAt and endsAt when those are set.
 */
export type Offer = {
  id: string;
  kind: OfferKind;
  name: string;
  description: string;
  productType: ProductType | null;
  buy: number;
  free: number;
  /** volume only: the unit price once the minimum is reached. */
  pricePaise: number | null;
  /** percent only: how much off, 1–90. */
  percent: number | null;
  /** ISO times; null = no limit on that side. */
  startsAt: string | null;
  endsAt: string | null;
  /** Shown across the top of the shop while the offer runs. */
  banner: string;
  active: boolean;
  sortOrder: number;
};

export const ORDER_STATUSES = ["new", "confirmed", "paid", "shipped", "done", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderLine = {
  productId: string;
  slug: string;
  name: string;
  type: ProductType;
  image: string | null;
  /** "Size: A3" style labels for the picked options. */
  options: string[];
  /** Filled-in custom fields. Image fields hold an upload link. */
  custom: { label: string; value: string; kind: CustomFieldKind }[];
  unitPricePaise: number;
  qty: number;
  lineTotalPaise: number;
};

/** freeUnits is 0 for volume pricing. */
export type AppliedOffer = { offerId: string; name: string; freeUnits: number; discountPaise: number };

export const FULFILMENTS = ["delivery", "pickup"] as const;
export type Fulfilment = (typeof FULFILMENTS)[number];

export type Address = { line: string; city: string; state: string; pincode: string };

/** An order placed on the shop. Payment and delivery are sorted in the Instagram chat. */
export type Order = {
  id: string;
  number: string;
  /** Secret in the customer's order page link. */
  viewKey: string;
  status: OrderStatus;
  customerName: string;
  /** 10 digits, no country code. */
  customerPhone: string;
  fulfilment: Fulfilment;
  /** Empty fields for pickup orders. */
  address: Address;
  customerNote: string;
  lines: OrderLine[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  offers: AppliedOffer[];
  adminNote: string;
  /** Uppercase coupon code used, or "". Its discount is in `offers`. */
  couponCode: string;
  /** Where the customer came from, e.g. "stall-wordsup". "" = direct. */
  source: string;
  /** Customer's Instagram username without the @, or "". */
  instagram: string;
  /** True once this order's items were taken off stock. */
  stockTaken: boolean;
  /** India Post consignment number, e.g. EE123456789IN. "" until shipped. */
  trackingNumber: string;
  createdAt: string;
  updatedAt: string;
};

/** A code customers type at checkout: % off or a flat amount off. */
export type Coupon = {
  code: string;
  description: string;
  percent: number | null;
  amountPaise: number | null;
  minOrderPaise: number;
  /** null = unlimited; counts orders that weren't cancelled. */
  maxUses: number | null;
  startsAt: string | null;
  endsAt: string | null;
  /** Where it's handed out, e.g. "WordsUp stall". */
  source: string;
  active: boolean;
  createdAt: string;
};

export const CUSTOM_STATUSES = ["new", "quoted", "won", "lost"] as const;
export type CustomStatus = (typeof CUSTOM_STATUSES)[number];
export const CUSTOM_KINDS = ["sticker", "sheet", "poster", "music-card", "wall-card", "other"] as const;
export type CustomKind = (typeof CUSTOM_KINDS)[number];

/** A customer's own design sent from /custom for a quote. */
export type CustomRequest = {
  id: string;
  number: string;
  status: CustomStatus;
  customerName: string;
  customerPhone: string;
  instagram: string;
  kind: CustomKind;
  size: string;
  qty: number;
  note: string;
  /** Upload ids of the design files. */
  files: string[];
  source: string;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
};

export const EVENT_TYPES = ["view", "add_to_cart", "order_click", "ask_click", "visit", "checkout"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type Upload = { id: string; path: string; contentType: string };

export type Settings = {
  /** When off, the cart is replaced by "message us" buttons. */
  storeOpen: boolean;
  announcement: string;
  /** Instagram username customers DM, without the @, e.g. stixnvibes. */
  instagramHandle: string;
  /** Shown in the cart and on the order page, e.g. how payment works. */
  orderNote: string;
  deliveryNote: string;
  bulkNote: string;
  /** null = no free shipping threshold. */
  freeShippingAbovePaise: number | null;
  /** UPI ID for payments on the order page, e.g. name@okicici. Empty hides it. */
  upiId: string;
  /** Name shown in the customer's UPI app. */
  upiName: string;
  /** 10-digit WhatsApp number customers send payment screenshots to. Empty hides the button. */
  whatsappNumber: string;
  /** MRP shown struck through = price + this %, rounded up to the rupee. null = off. */
  mrpMarkupPercent: number | null;
  /**
   * Unit cost in paise by product type ("poster") or type and option choice
   * ("poster:a3"). A product's own cost beats both. See lib/costs.ts.
   */
  unitCosts: Record<string, number>;
  /** Profit goal in paise, counted from goalStart (YYYY-MM-DD) to goalBy. */
  goalPaise: number | null;
  goalStart: string;
  goalBy: string;
};

// Stalls ---------------------------------------------------------------------

/** A pop-up stall: where, when and what it cost to be there. */
export type Stall = {
  id: string;
  name: string;
  /** YYYY-MM-DD, India time. */
  date: string;
  venue: string;
  collegeId: string | null;
  feePaise: number;
  otherCostsPaise: number;
  notes: string;
  /** Listed on college pages as an upcoming stall. */
  public: boolean;
  createdAt: string;
};

export const PAYMENTS = ["cash", "upi"] as const;
export type Payment = (typeof PAYMENTS)[number];

/** A line of a stall sale. productId is "" for a one-off item typed in. */
export type StallSaleLine = {
  productId: string;
  name: string;
  type: ProductType | "other";
  options: string[];
  qty: number;
  unitPricePaise: number;
  lineTotalPaise: number;
};

/** A sale rung up in stall mode. The id is made on the phone. */
export type StallSale = {
  id: string;
  stallId: string | null;
  lines: StallSaleLine[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  payment: Payment;
  note: string;
  soldAt: string;
  createdAt: string;
};

// Content ----------------------------------------------------------------------

export const POST_STATUSES = ["draft", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown, rendered by lib/markdown.ts. */
  body: string;
  cover: string;
  tags: string[];
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A photo in the library: stalls, events, work we've done. */
export type GalleryItem = {
  id: string;
  image: string;
  caption: string;
  stallId: string | null;
  collegeId: string | null;
  tags: string[];
  /** YYYY-MM-DD or null. */
  takenOn: string | null;
  visible: boolean;
  sortOrder: number;
  createdAt: string;
};

/** A college with its own page at /c/<slug>. */
export type College = {
  id: string;
  slug: string;
  name: string;
  area: string;
  description: string;
  image: string;
  couponCode: string;
  productIds: string[];
  active: boolean;
  sortOrder: number;
  createdAt: string;
};

export type Stats = {
  /** Browser sessions that opened the shop. */
  visits: number;
  views: number;
  addToCart: number;
  /** Times the checkout page was opened. */
  checkouts: number;
  orderClicks: number;
  askClicks: number;
  /** Orders placed, excluding cancelled. */
  orders: number;
  orderValuePaise: number;
  /** Orders confirmed or further along: real sales. */
  sales: number;
  salesPaise: number;
  paid: number;
  topViewed: { productId: string; count: number }[];
  topOrdered: { productId: string; qty: number }[];
  byType: { type: string; qty: number; paise: number }[];
  bySource: { source: string; visits: number | null; orders: number | null; sales: number | null; salesPaise: number | null }[];
  byCoupon: { code: string; orders: number; sales: number; salesPaise: number; discountPaise: number }[];
  daily: { day: string; views: number; visits: number; orders: number; salesPaise: number }[];
};
