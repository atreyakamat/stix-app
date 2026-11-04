import { Redirect } from "expo-router";

// The app QR opens https://shop.stixnvibes.com/app?code=... . LinkCapture has
// already stored the code and source, so just go home.
export default function AppLink() {
  return <Redirect href="/" />;
}
