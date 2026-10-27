import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { ProductGrid } from "@/components/product-card";
import { searchProducts } from "@/lib/shop-helpers";
import { PRODUCT_TYPES } from "@/lib/types";
import { useShop } from "@/state/shop";
import { Icon } from "@/ui/icon";
import { Chip, Empty, Loading, Screen, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

export default function Shop() {
  const params = useLocalSearchParams<{ type?: string; collection?: string; q?: string }>();
  const { catalog, refresh, refreshing } = useShop();
  const [type, setType] = useState<string | null>(params.type ?? null);
  const [collection, setCollection] = useState<string | null>(params.collection ?? null);
  const [query, setQuery] = useState(params.q ?? "");

  const list = useMemo(() => {
    if (!catalog) return [];
    const col = catalog.collections.find((c) => c.slug === collection || c.id === collection);
    const filtered = catalog.products.filter((p) => (!type || p.type === type) && (!col || p.collectionIds.includes(col.id)));
    // Live first, then coming soon; the shop's own order inside each.
    return searchProducts(filtered, query).sort((a, b) => Number(a.status !== "live") - Number(b.status !== "live") || a.sortOrder - b.sortOrder);
  }, [catalog, type, collection, query]);

  if (!catalog) return <Loading />;
  const types = PRODUCT_TYPES.filter((t) => catalog.products.some((p) => p.type === t.id));

  return (
    <Screen onRefresh={() => void refresh()} refreshing={refreshing}>
      <Txt variant="display" style={{ fontSize: 34 }}>
        Shop
      </Txt>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16 }}>
        <Icon name="search" size={19} color={colors.mute} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search anime, cars, lo-fi…"
          placeholderTextColor="#6b6b66"
          selectionColor={colors.lemon}
          returnKeyType="search"
          accessibilityLabel="Search the shop"
          style={{ flex: 1, minHeight: 48, color: colors.paper, fontFamily: fonts.body, fontSize: 16 }}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <Icon name="x" size={18} color={colors.mute} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: space.sm, marginHorizontal: -space.lg }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
          <Chip label="All" on={!type} onPress={() => setType(null)} />
          {types.map((t) => (
            <Chip key={t.id} label={t.label} on={type === t.id} onPress={() => setType(type === t.id ? null : t.id)} />
          ))}
        </ScrollView>
        {catalog.collections.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
            {catalog.collections.map((c) => (
              <Chip key={c.id} label={c.name} on={collection === c.slug || collection === c.id} onPress={() => setCollection(collection === c.slug ? null : c.slug)} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {type ? <Txt style={{ color: colors.paperDim }}>{PRODUCT_TYPES.find((t) => t.id === type)?.blurb}</Txt> : null}

      {list.length ? (
        <ProductGrid products={list} />
      ) : (
        <Empty icon="search" title="Nothing matches" body="Try another word, or clear the filters." action="Clear filters" onAction={() => (setType(null), setCollection(null), setQuery(""))} />
      )}
    </Screen>
  );
}
