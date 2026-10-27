import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useEffect } from "react";
import type { ColorValue } from "react-native";
import { useCart } from "@/state/cart";
import { useMe } from "@/state/me";
import { Icon, type IconName } from "@/ui/icon";
import { colors, fonts } from "@/ui/theme";

const icon = (name: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={name} color={String(color)} size={23} filled={focused && (name === "sparkle" || name === "heart")} />;
  };

export default function TabsLayout() {
  const { count } = useCart();
  const { ready, onboarded } = useMe();

  // First open: pick a college and vibes so home can be about them.
  useEffect(() => {
    if (ready && !onboarded) router.push("/welcome");
  }, [ready, onboarded]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lemon,
        tabBarInactiveTintColor: colors.mute,
        tabBarStyle: { backgroundColor: colors.ink, borderTopColor: colors.line, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11.5, marginBottom: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home") }} />
      <Tabs.Screen name="shop" options={{ title: "Shop", tabBarIcon: icon("grid") }} />
      <Tabs.Screen name="make" options={{ title: "Make", tabBarIcon: icon("sparkle") }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: icon("bag"),
          tabBarBadge: count > 0 ? (count > 99 ? "99+" : count) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.lemon, color: colors.ink, fontFamily: fonts.semibold, fontSize: 11 },
        }}
      />
      <Tabs.Screen name="me" options={{ title: "You", tabBarIcon: icon("user") }} />
    </Tabs>
  );
}
