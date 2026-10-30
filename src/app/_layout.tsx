// Only the weights the app uses; the package index would bundle every one.
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque/800ExtraBold";
import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { DarkTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { track } from "@/lib/api";
import { CartProvider } from "@/state/cart";
import { MeProvider, useMe } from "@/state/me";
import { ShopProvider } from "@/state/shop";
import { colors, fonts } from "@/ui/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.ink, card: colors.ink, text: colors.paper, border: colors.line, primary: colors.lemon },
};

const clean = (v: string) =>
  v.trim().toLowerCase().replace(/[^a-z0-9-_.]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

/**
 * Stall QR codes and Instagram links carry ?src= and ?code= (same as the
 * website). Remember them so the order is credited and the code applied.
 */
function LinkCapture() {
  const url = Linking.useLinkingURL();
  const { setLinkSource, setPendingCode, ready, sourceTag } = useMe();
  const counted = useRef(false);

  useEffect(() => {
    if (!url) return;
    const { queryParams } = Linking.parse(url);
    const q = (k: string) => (typeof queryParams?.[k] === "string" ? (queryParams[k] as string) : "");
    const src = clean(q("src") || q("utm_source"));
    const campaign = clean(q("utm_campaign"));
    if (src) setLinkSource(clean(campaign ? `${src}-${campaign}` : src));
    const code = q("code").trim().toUpperCase();
    if (/^[A-Z0-9-]{3,20}$/.test(code)) setPendingCode(code);
  }, [url, setLinkSource, setPendingCode]);

  // One visit per app open, for the shop's dashboard.
  useEffect(() => {
    if (!ready || counted.current) return;
    counted.current = true;
    void track([{ type: "visit", path: "/app", source: sourceTag }]);
  }, [ready, sourceTag]);

  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, Geist_400Regular, Geist_500Medium, Geist_600SemiBold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ink }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <MeProvider>
            <ShopProvider>
              <CartProvider>
                <LinkCapture />
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerStyle: { backgroundColor: colors.ink },
                    headerTintColor: colors.paper,
                    headerTitleStyle: { fontFamily: fonts.displayBold, fontSize: 19 },
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: colors.ink },
                    animation: "slide_from_right",
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="welcome" options={{ headerShown: false, animation: "fade", gestureEnabled: false }} />
                  <Stack.Screen name="shop/[slug]" options={{ title: "" }} />
                  <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
                  <Stack.Screen name="order/[number]" options={{ title: "Your order" }} />
                  <Stack.Screen name="collections/index" options={{ title: "Collections" }} />
                  <Stack.Screen name="collections/[slug]" options={{ title: "" }} />
                  <Stack.Screen name="c/index" options={{ title: "Colleges" }} />
                  <Stack.Screen name="c/[slug]" options={{ title: "" }} />
                  <Stack.Screen name="bundle" options={{ title: "Build a pack" }} />
                  <Stack.Screen name="custom" options={{ title: "Your own design" }} />
                  <Stack.Screen name="idea" options={{ title: "Dream up a sticker" }} />
                  <Stack.Screen name="review" options={{ title: "Write a review" }} />
                  <Stack.Screen name="blog/index" options={{ title: "Blog" }} />
                  <Stack.Screen name="blog/[slug]" options={{ title: "" }} />
                  <Stack.Screen name="gallery" options={{ title: "Library" }} />
                  <Stack.Screen name="wishlist" options={{ title: "Wishlist" }} />
                  <Stack.Screen name="details" options={{ title: "Your details" }} />
                  <Stack.Screen name="taste" options={{ title: "Your college & vibes" }} />
                </Stack>
              </CartProvider>
            </ShopProvider>
          </MeProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
