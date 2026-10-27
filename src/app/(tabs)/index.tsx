import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProductGrid, ProductRail, RailScroll } from "@/components/product-card";
import { forYou } from "@/lib/personal";
import { campaignBanner } from "@/lib/pricing";
import { collectionCover, formatStallDate, isPersonalised, upcomingStalls } from "@/lib/shop-helpers";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Icon } from "@/ui/icon";
import { Button, Empty, Loading, Note, SectionHead, Screen, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

export default function Home() {
  const { catalog, status, refreshing, refresh } = useShop();
  const { taste } = useMe();

  if (!catalog) {
    if (status === "loading") return <Loading />;
    return (
      <Screen>
        <Empty icon="wifi-off" title="Can't reach the shop" body="Check your internet and try again." action="Try again" onAction={() => void refresh()} />
      </Screen>
    );
  }

  const { products, collections, offers, settings, colleges } = catalog;
  const college = colleges.find((c) => c.id === taste.collegeId) ?? null;
  const picks = forYou(catalog, taste, 10);
  const personalised = taste.vibes.length > 0 || !!college;
  const featured = products.filter((p) => p.featured && p.status !== "hidden").slice(0, 6);
  const recent = taste.recent.map((id) => products.find((p) => p.id === id)).filter((p) => p !== undefined).slice(0, 8);
  const stalls = upcomingStalls(catalog).slice(0, 3);
  const banner = campaignBanner(offers);
  const custom = products.filter(isPersonalised).length;

  return (
    <Screen onRefresh={() => void refresh()} refreshing={refreshing}>
      <View style={{ gap: space.sm }}>
        <Txt variant="label">Stix N Vibes · Goa</Txt>
        <Txt variant="display">
          Your stickers.{"\n"}
          <Text style={{ color: colors.lemon }}>Your vibe.</Text>
        </Txt>
      </View>

      {status === "offline" ? <Note tone="mute">You're offline. Showing the shop as it was last time; prices are checked again when you order.</Note> : null}
      {banner ? <Note>{banner}</Note> : null}
      {settings.announcement ? <Note tone="mute">{settings.announcement}</Note> : null}
      {!settings.storeOpen ? <Note tone="danger">Online orders are paused right now. Message us on Instagram and we'll sort it out.</Note> : null}

      {college ? (
        <Pressable onPress={() => router.push({ pathname: "/c/[slug]", params: { slug: college.slug } })} style={({ pressed }) => [s.college, pressed && { opacity: 0.85 }]}>
          {college.image ? <Image source={college.image} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(7,7,7,0.55)" }]} />
          <Txt variant="label" style={{ color: colors.lemon }}>
            Your college
          </Txt>
          <Txt variant="title">{college.name}</Txt>
          <Txt variant="small" style={{ color: colors.paperDim }}>
            {college.couponCode ? `Code ${college.couponCode} · ` : ""}Picks and stalls at {college.area || "your campus"}
          </Txt>
        </Pressable>
      ) : null}

      {picks.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHead title={personalised ? "Picked for you" : "Start here"} action={personalised ? "Change vibes" : "Pick your vibes"} onAction={() => router.push("/taste")} />
          <ProductRail products={picks} />
        </View>
      ) : null}

      {offers.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {offers.map((o) => (
            <View key={o.id} style={s.offer}>
              <Text style={s.offerText}>{o.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable onPress={() => router.push("/make")} style={({ pressed }) => [s.make, pressed && { opacity: 0.9 }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.makeTitle}>Make it yours</Text>
          <Text style={s.makeBody}>
            {custom > 0 ? `${custom} things you can personalise, ` : ""}build your own sticker pack, or send us your design.
          </Text>
        </View>
        <Icon name="sparkle" size={30} color={colors.ink} filled />
      </Pressable>

      {collections.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHead title="Collections" action="See all" onAction={() => router.push("/collections")} />
          <View style={{ marginHorizontal: -space.lg }}>
            <RailScroll>
              {collections.map((c) => {
                const cover = collectionCover(c, products);
                return (
                  <Pressable key={c.id} onPress={() => router.push({ pathname: "/collections/[slug]", params: { slug: c.slug } })} style={s.collection}>
                    {cover ? <Image source={cover} style={{ width: "80%", height: 110 }} contentFit="contain" /> : null}
                    <Text style={s.collectionName} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </RailScroll>
          </View>
        </View>
      ) : null}

      {featured.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHead title="Bestsellers" action="Shop all" onAction={() => router.push("/shop")} />
          <ProductGrid products={featured} />
        </View>
      ) : null}

      {stalls.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHead title="Catch us at a stall" />
          {stalls.map((st) => (
            <View key={st.id} style={s.stall}>
              <Icon name="calendar" size={20} color={colors.lemon} />
              <View style={{ flex: 1 }}>
                <Txt variant="strong">{st.name}</Txt>
                <Txt variant="small">
                  {formatStallDate(st.date)}
                  {st.venue ? ` · ${st.venue}` : ""}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {recent.length > 0 ? (
        <View style={{ gap: space.md }}>
          <SectionHead title="You looked at" />
          <ProductRail products={recent} />
        </View>
      ) : null}

      <Button title="Browse everything" kind="ghost" icon="grid" onPress={() => router.push("/shop")} />
    </Screen>
  );
}

const s = StyleSheet.create({
  college: { borderRadius: radius.lg, overflow: "hidden", padding: space.lg, gap: 4, minHeight: 120, justifyContent: "flex-end", borderWidth: 1, borderColor: colors.line },
  offer: { backgroundColor: colors.lemonSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  offerText: { color: colors.lemon, fontFamily: fonts.medium, fontSize: 13.5 },
  make: { backgroundColor: colors.lemon, borderRadius: radius.lg, padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.md },
  makeTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  makeBody: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 20, color: "rgba(7,7,7,0.75)" },
  collection: { width: 140, height: 160, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", gap: 8, padding: 8 },
  collectionName: { fontFamily: fonts.medium, fontSize: 14, color: colors.paper },
  stall: { flexDirection: "row", gap: space.md, alignItems: "center", padding: space.md, borderRadius: radius.md, backgroundColor: colors.card },
});
