import { Image } from "expo-image";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { shopLink } from "@/lib/api";
import { MAIN_SITE } from "@/lib/config";
import { dmLink } from "@/lib/instagram";
import { formatINR } from "@/lib/money";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Divider, Row, Screen, SectionHead, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

const STATUS_LABEL: Record<string, string> = { new: "Placed", confirmed: "Confirmed", paid: "Paid", shipped: "On its way", done: "Delivered", cancelled: "Cancelled" };

export default function Me() {
  const me = useMe();
  const { catalog } = useShop();
  const college = catalog?.colleges.find((c) => c.id === me.taste.collegeId);
  const handle = catalog?.settings.instagramHandle ?? "stixnvibes";
  const hello = me.details.name.trim().split(/\s+/)[0];

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Txt variant="display" style={{ fontSize: 34 }}>
          {hello ? `Hey ${hello}` : "You"}
        </Txt>
        <Txt variant="small">Saved on this phone only. No account needed.</Txt>
      </View>

      <View style={{ gap: space.sm }}>
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
      </View>

      <View>
        <Row icon="heart" title="Wishlist" sub={`${me.taste.wishlist.length} saved`} onPress={() => router.push("/wishlist")} />
        <Divider />
        <Row icon="pin" title="College & vibes" sub={college ? college.name : me.taste.vibes.length ? `${me.taste.vibes.length} vibes picked` : "Pick yours for better picks"} onPress={() => router.push("/taste")} />
        <Divider />
        <Row icon="user" title="Your details" sub={me.details.name ? "Saved for checkout" : "Fill once, check out in a tap"} onPress={() => router.push("/details")} />
      </View>

      <View>
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
      </View>

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
  order: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.card },
  thumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  orderNo: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.paper, letterSpacing: 0.4 },
  status: { backgroundColor: colors.lemonSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: colors.lemon, fontFamily: fonts.medium, fontSize: 12.5 },
});
