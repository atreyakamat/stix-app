import { Image } from "expo-image";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { deleteAccount, shopLink } from "@/lib/api";
import { MAIN_SITE } from "@/lib/config";
import { dmLink } from "@/lib/instagram";
import { formatINR } from "@/lib/money";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Button, Divider, Row, Screen, SectionHead, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

const STATUS_LABEL: Record<string, string> = { new: "Placed", confirmed: "Confirmed", paid: "Paid", shipped: "On its way", done: "Delivered", cancelled: "Cancelled" };

/** Staggered entrance for the sections, so the tab settles in rather than appears. */
const enter = (i: number) => FadeInDown.delay(i * 70).springify().damping(18);

function AccountCard() {
  const me = useMe();
  const { catalog } = useShop();
  const acc = me.account;

  function confirmDelete() {
    Alert.alert("Delete your account?", "Your saved details and order list are removed from the shop's account. Orders we've already received stay with us, and this phone keeps its own copy.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteAccount()
            .then(me.signOut)
            .catch((err: Error) => Alert.alert("Couldn't delete", err.message)),
      },
    ]);
  }

  if (acc)
    return (
      <View style={{ gap: space.sm }}>
        <View style={s.account}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(acc.name || acc.email).charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.accountName} numberOfLines={1}>
              {acc.name || "Signed in"}
            </Text>
            <Txt variant="small" numberOfLines={1}>
              {acc.email} · synced
            </Txt>
          </View>
          <Button
            small
            kind="quiet"
            title="Sign out"
            onPress={() =>
              Alert.alert("Sign out?", "Your details and orders stay on this phone. Sign in again any time to sync.", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign out", onPress: me.signOut },
              ])
            }
          />
        </View>
        <Pressable onPress={confirmDelete} style={{ alignSelf: "flex-start", paddingVertical: 2 }}>
          <Text style={{ color: colors.mute, fontFamily: fonts.body, fontSize: 13, textDecorationLine: "underline" }}>Delete my account</Text>
        </Pressable>
      </View>
    );

  if (catalog?.accounts !== true) return null;
  return (
    <View style={s.cta}>
      <Txt variant="title">Make a free account</Txt>
      <Txt style={{ color: colors.paperDim }}>Your details, wishlist and orders follow you to any phone. No password, just an emailed code. Totally optional.</Txt>
      <Button title="Sign in or sign up" icon="user" onPress={() => router.push("/signin")} />
    </View>
  );
}

export default function Me() {
  const me = useMe();
  const { catalog } = useShop();
  const college = catalog?.colleges.find((c) => c.id === me.taste.collegeId);
  const handle = catalog?.settings.instagramHandle ?? "stixnvibes";
  const hello = me.details.name.trim().split(/\s+/)[0];

  return (
    <Screen>
      <Animated.View entering={enter(0)} style={{ gap: 4 }}>
        <Txt variant="display" style={{ fontSize: 34 }}>
          {hello ? `Hey ${hello}` : "You"}
        </Txt>
        <Txt variant="small">{me.account ? "Saved on this phone and your account." : "Saved on this phone. An account is optional."}</Txt>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <AccountCard />
      </Animated.View>

      <Animated.View entering={enter(2)} style={{ gap: space.sm }}>
        <SectionHead title="My orders" />
        {me.orders.length ? (
          me.orders.slice(0, 20).map((o) => (
            <Pressable key={o.number} onPress={() => router.push({ pathname: "/order/[number]", params: { number: o.number, k: o.key } })} style={({ pressed }) => [s.order, pressed && { opacity: 0.8 }]}>
              <View style={s.thumb}>{o.image ? <Image source={o.image} style={{ width: "86%", height: "86%" }} contentFit="contain" /> : null}</View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.orderNo}>{o.number}</Text>
                <Txt variant="small">
                  {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {formatINR(o.totalPaise)}
                </Txt>
              </View>
              <View style={[s.status, o.status === "cancelled" && { backgroundColor: colors.raised }]}>
                <Text style={[s.statusText, o.status === "cancelled" && { color: colors.mute }]}>{STATUS_LABEL[o.status] ?? o.status}</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Txt variant="small">Orders you place in the app show up here, with live status.</Txt>
        )}
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <Row icon="heart" title="Wishlist" sub={`${me.taste.wishlist.length} saved`} onPress={() => router.push("/wishlist")} />
        <Divider />
        <Row icon="pin" title="College & vibes" sub={college ? college.name : me.taste.vibes.length ? `${me.taste.vibes.length} vibes picked` : "Pick yours for better picks"} onPress={() => router.push("/taste")} />
        <Divider />
        <Row icon="user" title="Your details" sub={me.details.name ? "Saved for checkout" : "Fill once, check out in a tap"} onPress={() => router.push("/details")} />
      </Animated.View>

      <Animated.View entering={enter(4)}>
        <Txt variant="label">More</Txt>
        <Row icon="pin" title="Colleges" onPress={() => router.push("/c")} />
        <Divider />
        <Row icon="image" title="Library" sub="Stalls, events and work we've done" onPress={() => router.push("/gallery")} />
        <Divider />
        <Row icon="receipt" title="Blog" onPress={() => router.push("/blog")} />
        <Divider />
        <Row icon="grid" title="Collections" onPress={() => router.push("/collections")} />
        <Divider />
        <Row icon="instagram" title="Message us on Instagram" sub={`@${handle}`} onPress={() => void Linking.openURL(dmLink(handle))} />
        <Divider />
        <Row icon="receipt" title="How ordering works" onPress={() => void WebBrowser.openBrowserAsync(shopLink("/policies/ordering"))} />
        <Divider />
        <Row icon="receipt" title="Privacy policy" onPress={() => void WebBrowser.openBrowserAsync(shopLink("/policies/privacy"))} />
        <Divider />
        <Row icon="receipt" title="Terms" onPress={() => void WebBrowser.openBrowserAsync(shopLink("/policies/terms"))} />
        <Divider />
        <Row icon="home" title="stixnvibes.com" onPress={() => void WebBrowser.openBrowserAsync(MAIN_SITE)} />
      </Animated.View>

      <Pressable
        onPress={() =>
          Alert.alert("Clear this phone's data?", "Your saved details, wishlist, vibes and order list are removed from this phone. Your orders stay with the shop.", [
            { text: "Cancel", style: "cancel" },
            { text: "Clear", style: "destructive", onPress: me.reset },
          ])
        }
        style={{ alignSelf: "center", padding: space.sm }}
      >
        <Text style={{ color: colors.mute, fontFamily: fonts.body, textDecorationLine: "underline" }}>Clear my data on this phone</Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  account: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.lemonSoft, borderWidth: 1, borderColor: "rgba(215,255,63,0.25)" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lemon, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  accountName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.paper },
  cta: { gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.lemonSoft, borderWidth: 1, borderColor: "rgba(215,255,63,0.25)" },
  order: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.card },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  orderNo: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.paper, letterSpacing: 0.4 },
  status: { backgroundColor: colors.lemonSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: colors.lemon, fontFamily: fonts.medium, fontSize: 12.5 },
});
