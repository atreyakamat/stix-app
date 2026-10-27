import * as IntentLauncher from "expo-intent-launcher";
import { Linking, Platform } from "react-native";
import { parseUpiResponse, type UpiOutcome } from "./upi";

/**
 * Opens a UPI app with the payment filled in. With a package name it goes
 * straight to that app; without one Android asks which app to use.
 * Returns "missing" when the chosen app isn't installed.
 */
export async function openUpi(link: string, pkg?: string): Promise<UpiOutcome | "missing"> {
  if (Platform.OS !== "android") {
    await Linking.openURL(link);
    return "unknown";
  }
  try {
    const r = await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: link, ...(pkg ? { packageName: pkg } : {}) });
    if (r.resultCode === IntentLauncher.ResultCode.Canceled && !r.extra) return "cancelled";
    const extra = (r.extra ?? {}) as Record<string, unknown>;
    return parseUpiResponse(extra.response ?? extra.Status ?? r.data);
  } catch {
    if (pkg) return "missing";
    // No UPI app answered the intent at all; let the system try the plain link.
    try {
      await Linking.openURL(link);
      return "unknown";
    } catch {
      return "missing";
    }
  }
}
