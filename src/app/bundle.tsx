import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { track, type AppProduct } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { defaultSelections, isSoldOut, resolveOptions } from "@/lib/pricing";
import { useCart } from "@/state/cart";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Button, Chip, Empty, Loading, Note, Screen, Txt, tap } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

// Same as the website's /bundle: the sticker buy-X-get-Y offer sets the pack
// size, and the cart applies the deal.

export default function Bundle() {
  const { catalog } = useShop();
  if (!catalog) return <Loading />;
  const stickers = catalog.products.filter((p) => p.type === "sticker" && p.status === "live" && p.pricePaise !== null && p.customFields.every((f) => !f.required));
  const offer = catalog.offers.filter((o) => o.kind === "bxgy" && (o.productType === "sticker" || o.productType === null)).sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const deal = offer ? { buy: offer.buy, free: offer.free, name: offer.name } : null;
  if (!stickers.some((p) => !isSoldOut(p)))
    return (
      <Screen padTop={false}>
        <Empty title="Stickers are being restocked" body="Check back soon, or message us for what's in hand." />
      </Screen>
    );
  return <Builder stickers={stickers} deal={deal} />;
}

function Builder({ stickers, deal }: { stickers: AppProduct[]; deal: { buy: number; free: number; name: string } | null }) {
  const { add } = useCart();
  const { sourceTag } = useMe();
  const { width } = useWindowDimensions();
  const size = deal ? deal.buy + deal.free : 5;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const shared = stickers[0]?.options.find((g) => g.values.length > 1 && stickers.every((p) => p.options.some((o) => o.id === g.id && o.values.length === g.values.length)));
  const [choice, setChoice] = useState(shared?.values[0]?.id ?? "");

  const picked = Object.values(counts).reduce((n, c) => n + c, 0);
  const packs = Math.floor(picked / size);
  const toNext = picked === 0 ? size : (size - (picked % size)) % size;
  const unit = (p: AppProduct) => {
    const r = resolveOptions(p, { ...defaultSelections(p), ...(shared ? { [shared.id]: choice } : {}) });
    return r && p.pricePaise !== null ? { price: Math.max(0, p.pricePaise + r.deltaPaise), r } : null;
  };
  const subtotal = stickers.reduce((n, p) => n + (unit(p)?.price ?? 0) * (counts[p.id] ?? 0), 0);
  const prices = stickers.flatMap((p) => Array.from({ length: counts[p.id] ?? 0 }, () => unit(p)?.price ?? 0)).sort((a, b) => a - b);
  const freeValue = deal ? prices.slice(0, packs * deal.free).reduce((n, x) => n + x, 0) : 0;
  const bump = (id: string, d: number) => {
    tap();
    setCounts((c) => ({ ...c, [id]: Math.max(0, Math.min(99, (c[id] ?? 0) + d)) }));
  };

  function surprise() {
    const room = toNext || size;
    const pool = stickers.filter((p) => !isSoldOut(p));
    setCounts((c) => {
      const next = { ...c };
      for (let i = 0; i < room && pool.length; i++) {
        const p = pool[Math.floor(Math.random() * pool.length)];
        next[p.id] = (next[p.id] ?? 0) + 1;
      }
      return next;
    });
  }

  function addAll() {
    for (const p of stickers) {
      const qty = counts[p.id] ?? 0;
      const u = unit(p);
      if (!qty || !u) continue;
      add({ productId: p.id, slug: p.slug, name: p.name, type: p.type, image: p.images[0] ?? null, unitPricePaise: u.price, minQty: p.minQty, stock: p.stock, selections: u.r.selections, optionLabels: u.r.labels, custom: {}, customDisplay: [] }, qty);
    }
    void track(stickers.filter((p) => counts[p.id]).slice(0, 20).map((p) => ({ type: "add_to_cart" as const, productId: p.id, path: "/bundle", source: sourceTag })));
    setCounts({});
    router.push("/cart");
  }

  const cols = width > 700 ? 5 : 3;
  const w = (width - space.lg * 2 - space.sm * (cols - 1)) / cols;

  return (
    <Screen
      padTop={false}
      footer={
        <>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Txt variant="small">
              {picked} picked{deal && packs > 0 ? ` · ${packs * deal.free} free` : ""}
            </Txt>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.paper, fontVariant: ["tabular-nums"] }}>{formatINR(subtotal - freeValue)}</Text>
          </View>
          {picked > 0 && toNext > 0 && deal ? <Note>Add {toNext} more for the next free sticker.</Note> : null}
          <Button title={picked ? `Add ${picked} to cart` : "Tap stickers to pick"} disabled={!picked} onPress={addAll} />
        </>
      }
    >
      <Txt style={{ color: colors.paperDim }}>{deal ? `Pick any ${size}: ${deal.name.toLowerCase()}. ` : "Pick the stickers you want. "}Tap a sticker to add it, tap again for another copy.</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignItems: "center" }}>
        {shared ? shared.values.map((v) => <Chip key={v.id} label={v.label} on={choice === v.id} onPress={() => setChoice(v.id)} />) : null}
        <Chip label="Surprise me" onPress={surprise} />
        {picked ? <Chip label="Start over" onPress={() => setCounts({})} /> : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {stickers.map((p) => {
          const n = counts[p.id] ?? 0;
          const out = isSoldOut(p);
          return (
            <Pressable key={p.id} accessibilityRole="button" disabled={out} onPress={() => bump(p.id, 1)} style={[s.cell, { width: w }, n > 0 && { borderColor: colors.lemon }, out && { opacity: 0.35 }]} accessibilityLabel={`Add ${p.name} to the pack${n ? `, ${n} picked` : ""}`}>
              <View style={{ width: "100%", aspectRatio: 1, alignItems: "center", justifyContent: "center" }}>{p.images[0] ? <Image source={p.images[0]} style={{ width: "84%", height: "84%" }} contentFit="contain" recyclingKey={p.id} /> : null}</View>
              <Text style={s.name} numberOfLines={1}>
                {p.name}
              </Text>
              {n > 0 ? (
                <Pressable accessibilityRole="button" onPress={() => bump(p.id, -1)} style={s.count} hitSlop={6} accessibilityLabel={`One less ${p.name}`}>
                  <Text style={s.countText}>− {n}</Text>
                </Pressable>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  cell: { borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, padding: 6 },
  name: { fontFamily: fonts.body, fontSize: 12, color: colors.paperDim, marginTop: 2 },
  count: { position: "absolute", top: 5, right: 5, backgroundColor: colors.lemon, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  countText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
});
