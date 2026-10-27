import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { collectionCover } from "@/lib/shop-helpers";
import { useShop } from "@/state/shop";
import { Empty, Loading, Screen } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

export default function Collections() {
  const { catalog } = useShop();
  const { width } = useWindowDimensions();
  if (!catalog) return <Loading />;
  const w = (width - space.lg * 2 - space.md) / 2;
  return (
    <Screen padTop={false}>
      {catalog.collections.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
          {catalog.collections.map((c) => {
            const cover = collectionCover(c, catalog.products);
            const n = catalog.products.filter((p) => p.collectionIds.includes(c.id)).length;
            return (
              <Pressable key={c.id} onPress={() => router.push({ pathname: "/collections/[slug]", params: { slug: c.slug } })} style={({ pressed }) => [{ width: w, gap: 6 }, pressed && { opacity: 0.85 }]}>
                <View style={{ height: w, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
                  {cover ? <Image source={cover} style={{ width: "80%", height: "80%" }} contentFit="contain" /> : null}
                </View>
                <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.paper }}>{c.name}</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.mute }}>{n} designs</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Empty title="No collections yet" />
      )}
    </Screen>
  );
}
