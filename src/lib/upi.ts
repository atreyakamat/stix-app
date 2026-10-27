// Paying with a UPI app on the phone. The shop's upi://pay link (amount and
// order ref filled in) is handed to GPay, PhonePe, Paytm or BHIM directly.
// What the app reports back is only a hint: the order counts as paid once
// the shop sees the money (YouPI or the owner marks it).

export const UPI_APPS = [
  { id: "gpay", name: "Google Pay", pkg: "com.google.android.apps.nbu.paisa.user" },
  { id: "phonepe", name: "PhonePe", pkg: "com.phonepe.app" },
  { id: "paytm", name: "Paytm", pkg: "net.one97.paytm" },
  { id: "bhim", name: "BHIM", pkg: "in.org.npci.upiapp" },
] as const;

export type UpiOutcome = "success" | "submitted" | "failure" | "cancelled" | "unknown";

/**
 * Reads the reply a UPI app sends back, e.g.
 * "txnId=AX12&responseCode=00&Status=SUCCESS&txnRef=SNV-ABC123".
 */
export function parseUpiResponse(response: unknown): UpiOutcome {
  if (typeof response !== "string" || !response.trim()) return "unknown";
  const params = new Map<string, string>();
  for (const part of response.split("&")) {
    const [k, ...v] = part.split("=");
    if (k) params.set(k.trim().toLowerCase(), decodeURIComponent(v.join("=").trim()).toLowerCase());
  }
  // Some apps send only the status word.
  const status = response.includes("=") ? (params.get("status") ?? "") : response.trim().toLowerCase();
  if (status === "success") return "success";
  if (status === "submitted" || status === "pending") return "submitted";
  if (status === "failure" || status === "failed") return "failure";
  return "unknown";
}

/** Adds the order ref UPI apps echo back (tr) to a upi://pay link that lacks one. */
export function withTxnRef(link: string, ref: string): string {
  if (!link.startsWith("upi://pay?") || /[?&]tr=/.test(link)) return link;
  return `${link}&tr=${encodeURIComponent(ref)}`;
}
