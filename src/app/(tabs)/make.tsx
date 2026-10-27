import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProductGrid } from "@/components/product-card";
import { canOrder } from "@/lib/pricing";
import { isPersonalised } from "@/lib/shop-helpers";
import { useShop } from "@/state/shop";
import { Icon, type IconName } from "@/ui/icon";
import { Loading, Screen, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

function Tile({ icon, title, body, onPress, accent }: { icon: IconName; title: string; body: string; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tile, accent && s.accent, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]} accessibilityRole="button">
      <View style={[s.icon, accent && { backgroundColor: colors.ink }]}>
        <Icon name={icon} size={22} color={colors.lemon} filled={icon === "sparkle"} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[s.title, accent && { color: colors.ink }]}>{title}</Text>
        <Text style={[s.body, accent && { color: "rgba(7,7,7,0.72)" }]}>{body}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={accent ? colors.ink : colors.mute} />
    </Pressable>
  );
}

export default function Make() {
  const { catalog } = useShop();
  if (!catalog) return <Loading />;
  const personal = catalog.products.filter((p) => isPersonalised(p) && canOrder(p));

  return (
    <Screen>
      <View style={{ gap: space.sm }}>
        <Txt variant="label">Personalise</Txt>
        <Txt variant="display" style={{ fontSize: 36 }}>
          Make it <Text style={{ color: colors.lemon }}>yours</Text>
        </Txt>
        <Txt style={{ color: colors.paperDim }}>Your name, your song, your photo, your own art. We print it and cut it.</Txt>
      </View>

      <View style={{ gap: space.md }}>
        <Tile accent icon="sparkle" title="Build a sticker pack" body="Pick any stickers you like. Buy 4, get the 5th free." onPress={() => router.push("/bundle")} />
        <Tile icon="image" title="Print your own design" body="Send us your art or photos for stickers, posters or cards. We quote on Instagram." onPress={() => router.push("/custom")} />
      </View>

      {personal.length ? (
        <View style={{ gap: space.md }}>
          <Txt variant="title">Personalise these</Txt>
          <Txt variant="small">Add a name, a Spotify link or a photo on the product page.</Txt>
          <ProductGrid products={personal} />
        </View>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  tile: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  accent: { backgroundColor: colors.lemon, borderColor: colors.lemon },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.raised, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.paper },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, color: colors.paperDim },
});
