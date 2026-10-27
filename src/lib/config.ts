// Where the shop lives. Override with EXPO_PUBLIC_SHOP_URL to point a build
// at a Netlify preview or a local `next dev`.
export const SHOP_URL = (process.env.EXPO_PUBLIC_SHOP_URL ?? "https://shop.stixnvibes.com").replace(/\/+$/, "");

export const INSTAGRAM = "stixnvibes";
export const MAIN_SITE = "https://www.stixnvibes.com";

/** Orders and events from the app carry this source unless a link brought its own. */
export const APP_SOURCE = "app";
