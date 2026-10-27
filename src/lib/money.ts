const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatINR(paise: number): string {
  return inr.format(paise / 100);
}

/** Parses a rupee amount typed by a person ("149", "149.50", "1,299"). */
export function rupeesToPaise(input: string): number | null {
  const clean = input.replace(/[₹,\s]/g, "");
  if (clean === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return Number.NaN;
  return Math.round(Number(clean) * 100);
}

export function paiseToRupees(paise: number | null): string {
  if (paise === null) return "";
  return (paise / 100).toFixed(paise % 100 === 0 ? 0 : 2);
}

// Admin date fields are in India time whatever the browser's zone.
const IST_MS = 5.5 * 60 * 60 * 1000;

/** ISO time → "YYYY-MM-DDTHH:mm" in IST for a datetime-local input. */
export function isoToIstInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(Date.parse(iso) + IST_MS).toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" typed in IST → ISO time. Blank → null; not a date → undefined. */
export function istInputToIso(v: string): string | null | undefined {
  const s = v.trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return undefined;
  const t = Date.parse(`${s}:00+05:30`);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}
