import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { PersonalPreview } from "@/components/personal-preview";
import { ProductRail } from "@/components/product-card";
import { shopLink, track, uploadPhoto, type AppProduct } from "@/lib/api";
import { copyAndDm } from "@/lib/dm";
import { askMessage } from "@/lib/instagram";
import { formatINR } from "@/lib/money";
import { pickPhoto } from "@/lib/photos";
import { canOrder, defaultSelections, isSoldOut, mrpFor, resolveOptions } from "@/lib/pricing";
import type { CustomField } from "@/lib/types";
import { useCart } from "@/state/cart";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Icon } from "@/ui/icon";
import { Button, Chip, Empty, Field, Loading, Note, Pill, QtyStepper, Screen, Txt, tap } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

type Upload = { id: string; preview: string } | { busy: true; preview: string } | { error: string };

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { catalog, status } = useShop();
  const product = catalog?.products.find((p) => p.slug === slug);
  if (!catalog) return <Loading />;
  if (!product)
    return (
      <Screen padTop={false}>
        <Empty title="Not in the shop any more" body={status === "offline" ? "You're offline; this may show up once you're back online." : "It may have sold out for good."} action="Browse the shop" onAction={() => router.replace("/shop")} />
      </Screen>
    );
  return <ProductView key={product.id} product={product} />;
}

function ProductView({ product }: { product: AppProduct }) {
  const { catalog } = useShop();
  const { add } = useCart();
  const { taste, toggleWish, viewed, sourceTag } = useMe();
  const { width } = useWindowDimensions();
  const [selections, setSelections] = useState(() => defaultSelections(product));
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<Record<string, Upload>>({});
  const [qty, setQty] = useState(Math.max(1, product.minQty));
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [page, setPage] = useState(0);
  const seen = useRef(false);

  const settings = catalog!.settings;
  const wished = taste.wishlist.includes(product.id);
  const url = shopLink(`/shop/${product.slug}`);

  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    viewed(product.id);
    void track([{ type: "view", productId: product.id, path: `/shop/${product.slug}`, source: sourceTag }]);
  }, [product.id, product.slug, viewed, sourceTag]);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2500);
    return () => clearTimeout(t);
  }, [added]);

  const resolved = resolveOptions(product, selections);
  const unit = product.pricePaise === null || !resolved ? null : Math.max(0, product.pricePaise + resolved.deltaPaise);
  const mrp = product.status === "live" ? mrpFor(unit, product.compareAtPaise, settings.mrpMarkupPercent) : null;
  const orderable = canOrder(product) && settings.storeOpen;
  const offers = catalog!.offers.filter((o) => o.productType === product.type || o.productType === null).filter((o) => o.kind !== "percent");
  const related = catalog!.products.filter((p) => p.id !== product.id && canOrder(p) && (p.collectionIds.some((c) => product.collectionIds.includes(c)) || p.type === product.type)).slice(0, 8);

  async function attach(field: CustomField, from: "camera" | "library") {
    setError("");
    let photo;
    try {
      photo = await pickPhoto(from);
    } catch (err) {
      setUploads((u) => ({ ...u, [field.id]: { error: (err as Error).message } }));
      return;
    }
    if (!photo) return;
    setUploads((u) => ({ ...u, [field.id]: { busy: true, preview: photo.uri } }));
    try {
      const id = await uploadPhoto(photo);
      setUploads((u) => ({ ...u, [field.id]: { id, preview: photo.uri } }));
      setCustom((c) => ({ ...c, [field.id]: id }));
    } catch (err) {
      setUploads((u) => ({ ...u, [field.id]: { error: (err as Error).message } }));
      setCustom((c) => {
        const next = { ...c };
        delete next[field.id];
        return next;
      });
    }
  }

  function addToCart() {
    setError("");
    if (!resolved || unit === null) return;
    const missing = product.customFields.find((f) => f.required && !custom[f.id]?.trim());
    if (missing) return setError(`Fill in "${missing.label}" first.`);
    if (Object.values(uploads).some((u) => "busy" in u)) return setError("Wait for your photo to finish uploading.");
    const filled = Object.fromEntries(Object.entries(custom).filter(([, v]) => v.trim()));
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        type: product.type,
        image: product.images[0] ?? null,
        unitPricePaise: unit,
        minQty: product.minQty,
        stock: product.stock,
        selections: resolved.selections,
        optionLabels: resolved.labels,
        custom: filled,
        customDisplay: product.customFields
          .filter((f) => filled[f.id])
          .map((f) => ({ label: f.label, kind: f.kind, value: f.kind === "image" ? shopLink(`/u/${filled[f.id]}`) : filled[f.id] })),
      },
      qty,
    );
    void track([{ type: "add_to_cart", productId: product.id, path: `/shop/${product.slug}`, source: sourceTag }]);
    setAdded(true);
    // A personalised item is one of a kind: clear the form for the next one.
    if (product.customFields.length) {
      setCustom({});
      setUploads({});
    }
  }

  const previewPhoto = Object.values(uploads).find((u): u is { id: string; preview: string } => "id" in u)?.preview ?? null;
  const previewText = product.customFields.filter((f) => f.kind === "text" && custom[f.id]?.trim()).map((f) => custom[f.id].trim())[0] ?? "";

  const footer = orderable && unit !== null ? (
    <>
      {error ? <Note tone="danger">{error}</Note> : null}
      <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
        <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, n))} label={product.name} />
        <Button
          title={added ? "Added" : `Add · ${formatINR(unit * qty)}`}
          icon={added ? "check" : "bag"}
          onPress={addToCart}
          style={{ flex: 1 }}
        />
      </View>
      {added ? (
        <Pressable onPress={() => router.push("/cart")} hitSlop={8} style={{ alignSelf: "center" }}>
          <Text style={{ color: colors.lemon, fontFamily: fonts.medium, fontSize: 14 }}>Go to cart →</Text>
        </Pressable>
      ) : null}
    </>
  ) : (
    <Button title="Ask on Instagram" icon="instagram" onPress={() => void (track([{ type: "ask_click", productId: product.id, source: sourceTag }]), copyAndDm(settings.instagramHandle, askMessage(product.name, url)))} />
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 18 }}>
              <Pressable hitSlop={10} onPress={() => void Share.share({ message: `${product.name} on Stix N Vibes ${url}` })} accessibilityLabel="Share">
                <Icon name="share" size={21} />
              </Pressable>
              <Pressable hitSlop={10} onPress={() => (tap(), toggleWish(product.id))} accessibilityLabel={wished ? "Remove from wishlist" : "Save to wishlist"}>
                <Icon name="heart" size={22} color={wished ? colors.lemon : colors.paper} filled={wished} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Screen padTop={false} footer={footer}>
        <View style={{ marginHorizontal: -space.lg }}>
          <FlatList
            data={product.images.length ? product.images : [null]}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(img, i) => `${img}-${i}`}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height: width * 0.9, alignItems: "center", justifyContent: "center", backgroundColor: colors.card }}>
                {item ? <Image source={item} style={{ width: "82%", height: "82%" }} contentFit="contain" transition={200} /> : <Icon name="image" size={40} color={colors.mute} />}
              </View>
            )}
          />
          {product.images.length > 1 ? (
            <View style={s.dots}>
              {product.images.map((img, i) => (
                <View key={`${img}-${i}`} style={[s.dot, i === page && s.dotOn]} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ gap: space.sm }}>
          {product.badge ? <Pill>{product.badge}</Pill> : null}
          <Txt variant="display" style={{ fontSize: 32, lineHeight: 34 }}>
            {product.name}
          </Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, flexWrap: "wrap" }}>
            <Text style={s.price}>{product.status === "upcoming" ? "Coming soon" : unit !== null ? formatINR(unit) : "Ask for price"}</Text>
            {mrp !== null && unit !== null ? (
              <>
                <Text style={s.mrp}>MRP {formatINR(mrp)}</Text>
                <Pill>{`${Math.round(((mrp - unit) / mrp) * 100)}% off`}</Pill>
              </>
            ) : null}
          </View>
          {product.minQty > 1 && product.status === "live" ? <Txt style={{ color: colors.paperDim }}>Minimum {product.minQty} per order. Mix different designs or songs.</Txt> : null}
          {orderable && product.stock !== null && product.stock <= 5 ? <Text style={{ color: colors.warn, fontFamily: fonts.medium }}>Only {product.stock} left.</Text> : null}
          {isSoldOut(product) ? <Note tone="mute">Sold out right now. Message us and we&apos;ll tell you when it&apos;s back.</Note> : null}
          {product.status === "upcoming" ? <Note tone="mute">Dropping soon. Message us to get it first.</Note> : null}
          {offers.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {offers.map((o) => (
                <Pill key={o.id}>{o.name}</Pill>
              ))}
            </View>
          ) : null}
        </View>

        {product.options
          .filter((g) => g.values.length > 1)
          .map((g) => (
            <View key={g.id} style={{ gap: space.sm }}>
              <Txt variant="label">{g.name}</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                {g.values.map((v) => (
                  <Chip
                    key={v.id}
                    on={selections[g.id] === v.id}
                    onPress={() => setSelections((x) => ({ ...x, [g.id]: v.id }))}
                    label={`${v.label}${v.priceDeltaPaise !== 0 && product.pricePaise !== null ? ` ${v.priceDeltaPaise > 0 ? "+" : "−"}${formatINR(Math.abs(v.priceDeltaPaise))}` : ""}`}
                  />
                ))}
              </View>
            </View>
          ))}

        {orderable && product.customFields.length > 0 ? (
          <View style={s.personal}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="sparkle" size={18} color={colors.lemon} filled />
              <Txt variant="label" style={{ color: colors.lemon }}>
                Make it yours
              </Txt>
            </View>
            {product.customFields.map((f) => {
              const up = uploads[f.id];
              if (f.kind === "image")
                return (
                  <View key={f.id} style={{ gap: 8 }}>
                    <Text style={s.fieldLabel}>
                      {f.label}
                      {f.required ? <Text style={{ color: colors.lemon }}> *</Text> : <Text style={{ color: colors.mute }}> (optional)</Text>}
                    </Text>
                    <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
                      {up && "preview" in up ? <Image source={up.preview} style={s.thumb} contentFit="cover" /> : null}
                      <Button small kind="quiet" icon="camera" title="Camera" onPress={() => void attach(f, "camera")} busy={!!up && "busy" in up} />
                      <Button small kind="quiet" icon="image" title="Gallery" onPress={() => void attach(f, "library")} disabled={!!up && "busy" in up} />
                    </View>
                    {up && "busy" in up ? <Txt variant="small">Uploading…</Txt> : null}
                    {up && "id" in up ? <Txt variant="small" style={{ color: colors.lemon }}>Photo added.</Txt> : null}
                    {up && "error" in up ? <Text style={{ color: colors.danger, fontFamily: fonts.body, fontSize: 13 }}>{up.error}</Text> : null}
                    {f.help ? <Txt variant="small">{f.help}</Txt> : null}
                  </View>
                );
              return (
                <Field
                  key={f.id}
                  label={f.required ? `${f.label} *` : f.label}
                  optional={!f.required}
                  help={f.help}
                  value={custom[f.id] ?? ""}
                  onChangeText={(v) => setCustom((c) => ({ ...c, [f.id]: v }))}
                  maxLength={600}
                  multiline={f.kind === "textarea"}
                  keyboardType={f.kind === "link" ? "url" : "default"}
                  autoCapitalize={f.kind === "link" ? "none" : "sentences"}
                  placeholder={f.kind === "link" ? "https://open.spotify.com/track/…" : undefined}
                />
              );
            })}
            {previewPhoto || previewText ? <PersonalPreview product={product} photo={previewPhoto} text={previewText} /> : null}
          </View>
        ) : null}

        {product.description ? <Txt style={{ color: colors.paperDim }}>{product.description}</Txt> : null}
        {settings.deliveryNote ? <Note tone="mute">{settings.deliveryNote}</Note> : null}
        {product.details ? (
          <View style={{ gap: 6 }}>
            <Txt variant="label">Details</Txt>
            <Txt variant="small" style={{ color: colors.paperDim, fontSize: 14.5, lineHeight: 21 }}>
              {product.details}
            </Txt>
          </View>
        ) : null}

        {related.length ? (
          <View style={{ gap: space.md }}>
            <Txt variant="title">You might also like</Txt>
            <ProductRail products={related} />
          </View>
        ) : null}
      </Screen>
    </>
  );
}

const s = StyleSheet.create({
  dots: { flexDirection: "row", gap: 6, justifyContent: "center", paddingTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.lemon, width: 18 },
  price: { fontFamily: fonts.display, fontSize: 30, color: colors.lemon, fontVariant: ["tabular-nums"] },
  mrp: { fontFamily: fonts.body, fontSize: 16, color: colors.mute, textDecorationLine: "line-through" },
  personal: { borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(215,255,63,0.35)", padding: space.lg, gap: space.lg },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.paper },
  thumb: { width: 52, height: 52, borderRadius: 10 },
});
