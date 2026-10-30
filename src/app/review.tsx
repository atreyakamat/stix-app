import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { shopLink, submitReview, uploadPhoto } from "@/lib/api";
import { pickPhoto } from "@/lib/photos";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Icon } from "@/ui/icon";
import { Button, Empty, Field, Loading, Note, Screen, Txt, tap } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

// Write a review, with up to 3 photos. Reviews show once the shop approves
// them. Opened from a product page, or from a past order (then it's marked
// as a verified buyer).

const MAX_PHOTOS = 3;
const MAX_TEXT = 1000;
const WORDS = ["", "Not great", "Okay", "Good", "Really good", "Love it"];

type PhotoState = { key: string; preview: string; id?: string; error?: string };

export default function ReviewScreen() {
  const { productId, orderNumber, k } = useLocalSearchParams<{ productId: string; orderNumber?: string; k?: string }>();
  const { catalog } = useShop();
  const me = useMe();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [name, setName] = useState(me.details.name.trim().split(/\s+/)[0] ?? "");
  const [instagram, setInstagram] = useState(me.details.instagram);
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (!catalog) return <Loading />;
  const product = catalog.products.find((p) => p.id === productId);
  if (!product) return <Empty icon="search" title="Product not found" body="It may have been taken down." action="Back to the shop" onAction={() => router.replace("/shop")} />;

  async function addPhoto(from: "camera" | "library") {
    setError("");
    let photo;
    try {
      photo = await pickPhoto(from);
    } catch (err) {
      return setError((err as Error).message);
    }
    if (!photo) return;
    const key = `${Date.now()}-${Math.random()}`;
    setPhotos((x) => [...x, { key, preview: photo.uri }]);
    try {
      const id = await uploadPhoto(photo);
      setPhotos((x) => x.map((y) => (y.key === key ? { ...y, id } : y)));
    } catch (err) {
      setPhotos((x) => x.map((y) => (y.key === key ? { ...y, error: (err as Error).message } : y)));
    }
  }

  async function send() {
    setError("");
    if (!rating) return setError("Tap the stars to rate it.");
    if (name.trim().length < 2) return setError("Add your name.");
    if (photos.some((p) => !p.id && !p.error)) return setError("Wait for your photos to finish uploading.");
    setBusy(true);
    try {
      await submitReview({
        productId: product!.id,
        rating,
        text: text.trim(),
        name: name.trim(),
        instagram: instagram.trim(),
        photos: photos.filter((p) => p.id).map((p) => p.id!),
        orderNumber: orderNumber || undefined,
        key: k || undefined,
        source: me.sourceTag,
      });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <Screen padTop={false}>
        <Txt variant="display" style={{ fontSize: 34 }}>
          Thank you!
        </Txt>
        <Txt style={{ color: colors.paperDim }}>We read every review. Yours shows on {product.name} once we&apos;ve had a look, usually within a day.</Txt>
        <Button
          kind="ghost"
          icon="share"
          title="Tell your friends"
          onPress={() => void Share.share({ message: `Got my ${product.name} from Stix N Vibes ${"★".repeat(rating)} ${shopLink(`/shop/${product.slug}?src=app-share`)}` })}
        />
        <Button kind="quiet" title="Back to the product" onPress={() => router.back()} />
      </Screen>
    );

  return (
    <Screen padTop={false} footer={<>{error ? <Note tone="danger">{error}</Note> : null}<Button title="Post review" busy={busy} onPress={() => void send()} /></>}>
      <View style={s.product}>
        <View style={s.thumb}>{product.images[0] ? <Image source={product.images[0]} style={{ width: "86%", height: "86%" }} contentFit="contain" /> : null}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.productName}>{product.name}</Text>
          {orderNumber ? <Txt variant="small">From order {orderNumber}</Txt> : null}
        </View>
      </View>

      <View style={{ gap: space.sm, alignItems: "center" }}>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} hitSlop={6} onPress={() => (tap(), setRating(n))} accessibilityRole="button" accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}>
              <Icon name="star" size={40} color={n <= rating ? colors.lemon : colors.mute} filled={n <= rating} strokeWidth={1.5} />
            </Pressable>
          ))}
        </View>
        <Txt variant="small">{rating ? WORDS[rating] : "Tap to rate"}</Txt>
      </View>

      <Field label="Your review" optional value={text} onChangeText={(v) => setText(v.slice(0, MAX_TEXT))} multiline maxLength={MAX_TEXT} placeholder="How does it look? Where did you stick it?" />

      <View style={{ gap: space.md }}>
        <Txt variant="label">
          Photos ({photos.length}/{MAX_PHOTOS})
        </Txt>
        <Txt variant="small">Show it on your laptop, bottle or wall. Photos help other people pick.</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {photos.map((x) => (
            <View key={x.key} style={s.file}>
              <Image source={x.preview} style={StyleSheet.absoluteFill} contentFit="cover" />
              {!x.id && !x.error ? (
                <View style={s.overlay}>
                  <Text style={s.overlayText}>Uploading…</Text>
                </View>
              ) : null}
              {x.error ? (
                <View style={[s.overlay, { backgroundColor: "rgba(255,122,89,0.8)" }]}>
                  <Text style={s.overlayText}>Failed</Text>
                </View>
              ) : null}
              <Pressable onPress={() => setPhotos((all) => all.filter((y) => y.key !== x.key))} style={s.remove} hitSlop={6} accessibilityLabel="Remove photo">
                <Icon name="x" size={14} />
              </Pressable>
            </View>
          ))}
        </View>
        {photos.length < MAX_PHOTOS ? (
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button small kind="quiet" icon="image" title="From gallery" onPress={() => void addPhoto("library")} />
            <Button small kind="quiet" icon="camera" title="Take a photo" onPress={() => void addPhoto("camera")} />
          </View>
        ) : null}
      </View>

      <Field label="Your name" value={name} onChangeText={setName} maxLength={60} help="Shown with your review." />
      <Field label="Instagram username" optional value={instagram} onChangeText={setInstagram} autoCapitalize="none" autoCorrect={false} placeholder="@yourname" help="Not shown. Lets us reply or feature your photo." />
    </Screen>
  );
}

const s = StyleSheet.create({
  product: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.card },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  productName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.paper },
  file: { width: 92, height: 92, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.card },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(7,7,7,0.6)", alignItems: "center", justifyContent: "center" },
  overlayText: { color: colors.paper, fontFamily: fonts.medium, fontSize: 12 },
  remove: { position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(7,7,7,0.75)", alignItems: "center", justifyContent: "center" },
});
