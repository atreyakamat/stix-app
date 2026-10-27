import { Image } from "expo-image";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { AppProduct } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { canOrder, fromPrice, hasPriceRange, isSoldOut, mrpFor } from "@/lib/pricing";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Icon } from "@/ui/icon";
import { tap } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

export function priceLabel(p: AppProduct): string {
  if (p.status === "upcoming") return "Coming soon";
  const price = fromPrice(p);
  if (price === null) return "Ask on Instagram";
  return `${hasPriceRange(p) ? "From " : ""}${formatINR(price)}`;
}

export const openProduct = (p: Pick<AppProduct, "slug">) => router.push({ pathname: "/shop/[slug]", params: { slug: p.slug } });

export function ProductCard({ product, width }: { product: AppProduct; width: number }) {
  const { catalog } = useShop();
  const { taste, toggleWish } = useMe();
  const wished = taste.wishlist.includes(product.id);
  const orderable = canOrder(product);
  const price = fromPrice(product);
  const mrp = orderable && !hasPriceRange(product) ? mrpFor(price, product.compareAtPaise, catalog?.settings.mrpMarkupPercent ?? null) : null;
  const badge = isSoldOut(product) ? "Sold out" : product.status === "upcoming" ? "Soon" : product.badge;

  return (
    <Pressable onPress={() => openProduct(product)} style={({ pressed }) => [{ width }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]} accessibilityRole="button" accessibilityLabel={`${product.name}, ${priceLabel(product)}`}>
      <View style={[s.media, { height: width }]}>
        {product.images[0] ? <Image source={product.images[0]} style={s.img} contentFit="contain" transition={180} recyclingKey={product.id} /> : <Icon name="image" size={28} color={colors.mute} />}
        {badge ? (
          <View style={[s.badge, isSoldOut(product) && { backgroundColor: colors.raised }]}>
            <Text style={[s.badgeText, isSoldOut(product) && { color: colors.paperDim }]}>{badge}</Text>
          </View>
        ) : null}
        <Pressable
          hitSlop={8}
          onPress={() => {
            tap();
            toggleWish(product.id);
          }}
          style={s.heart}
          accessibilityRole="button"
          accessibilityLabel={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        >
          <Icon name="heart" size={18} color={wished ? colors.lemon : colors.paper} filled={wished} />
        </Pressable>
      </View>
      <Text style={s.name} numberOfLines={2}>
        {product.name}
      </Text>
      <View style={{ flexDirection: "row", gap: 6, alignItems: "baseline" }}>
        {mrp !== null ? <Text style={s.mrp}>{formatINR(mrp)}</Text> : null}
        <Text style={[s.price, !orderable && { color: colors.mute }]}>{priceLabel(product)}</Text>
      </View>
    </Pressable>
  );
}

/** Two-column grid that fills the screen width. */
export function ProductGrid({ products }: { products: AppProduct[] }) {
  const { width } = useWindowDimensions();
  const cols = width > 700 ? 3 : 2;
  const w = (width - space.lg * 2 - space.md * (cols - 1)) / cols;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md, rowGap: space.xl }}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} width={w} />
      ))}
    </View>
  );
}

/** A sideways row of cards. */
export function ProductRail({ products }: { products: AppProduct[] }) {
  return (
    <View style={{ marginHorizontal: -space.lg }}>
      <RailScroll>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} width={150} />
        ))}
      </RailScroll>
    </View>
  );
}

export function RailScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
      {children}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  media: { borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: "86%", height: "86%" },
  badge: { position: "absolute", top: 8, left: 8, backgroundColor: colors.lemon, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.ink },
  heart: { position: "absolute", top: 6, right: 6, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(7,7,7,0.55)", alignItems: "center", justifyContent: "center" },
  name: { marginTop: 8, fontFamily: fonts.medium, fontSize: 14.5, lineHeight: 19, color: colors.paper },
  mrp: { fontFamily: fonts.body, fontSize: 13, color: colors.mute, textDecorationLine: "line-through" },
  price: { fontFamily: fonts.semibold, fontSize: 14.5, color: colors.lemon, fontVariant: ["tabular-nums"] },
});
