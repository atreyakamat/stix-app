import * as Clipboard from "expo-clipboard";
import { Linking } from "react-native";
import { dmLink } from "./instagram";

/**
 * Instagram can't prefill a DM, so the message goes on the clipboard and
 * the chat opens; the customer pastes it. Same as the website's CopyAndDm.
 */
export async function copyAndDm(handle: string, message: string) {
  await Clipboard.setStringAsync(message).catch(() => {});
  await Linking.openURL(dmLink(handle)).catch(() => {});
}
