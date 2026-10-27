// Copies the shop's shared pricing code into the app so cart totals match
// what the server charges. Usage: npm run sync-shop-lib -- ../stixnvibes-nv
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const shop = process.argv[2] ?? "../stixnvibes-nv";
const files = ["pricing.ts", "money.ts", "phone.ts", "instagram.ts", "markdown.ts", "types.ts"];
if (!existsSync(join(shop, "src/lib/pricing.ts"))) {
  console.error(`No shop checkout at ${shop}. Pass its path: npm run sync-shop-lib -- <path>`);
  process.exit(1);
}
for (const f of files) {
  copyFileSync(join(shop, "src/lib", f), join("src/lib", f));
  console.log(`copied ${f}`);
}
console.log("Now run: npm test");
