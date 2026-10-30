import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { PublicReview } from "@/lib/api";
import { ratingSummary } from "@/lib/reviews";
import { Icon } from "@/ui/icon";
import { Button, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }} accessibilityLabel={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} color={n <= Math.round(rating) ? colors.lemon : colors.mute} filled={n <= Math.round(rating)} strokeWidth={1.5} />
      ))}
    </View>
  );
}

/** "★★★★★ 4.8 · 12 reviews", or nothing when there are none. */
export function RatingLine({ reviews }: { reviews: PublicReview[] }) {
  const sum = ratingSummary(reviews);
  if (!sum) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Stars rating={sum.average} />
      <Txt variant="small">
        {sum.average.toFixed(1)} · {sum.count} review{sum.count === 1 ? "" : "s"}
      </Txt>
    </View>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function ReviewCard({ review, onPhoto }: { review: PublicReview; onPhoto: (url: string) => void }) {
  return (
    <View style={s.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Stars rating={review.rating} />
        <Txt variant="small">{day(review.createdAt)}</Txt>
      </View>
      <Text style={s.name}>
        {review.name}
        {review.verified ? <Text style={s.verified}>  ✓ Verified buyer</Text> : null}
      </Text>
      {review.text ? <Txt style={{ color: colors.paperDim }}>{review.text}</Txt> : null}
      {review.photos.length ? (
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {review.photos.map((url) => (
            <Pressable key={url} onPress={() => onPhoto(url)} style={s.photo} accessibilityRole="imagebutton" accessibilityLabel={`Photo from ${review.name}`}>
              <Image source={url} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}
      {review.reply ? (
        <View style={s.reply}>
          <Text style={s.replyHead}>Stix N Vibes replied</Text>
          <Txt variant="small" style={{ color: colors.paper }}>
            {review.reply}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

/** Reviews on a product page: summary, the first few, a photo viewer and "Write a review". */
export function ProductReviews({ productId, reviews }: { productId: string; reviews: PublicReview[] }) {
  const [all, setAll] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const shown = all ? reviews : reviews.slice(0, 3);
  const photos = reviews.flatMap((r) => r.photos);

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 4 }}>
        <Txt variant="title">Reviews</Txt>
        {reviews.length ? <RatingLine reviews={reviews} /> : <Txt variant="small">No reviews yet. Bought this? Tell people what you think.</Txt>}
      </View>
      {photos.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {photos.slice(0, 12).map((url) => (
            <Pressable key={url} onPress={() => setPhoto(url)} style={s.strip} accessibilityRole="imagebutton" accessibilityLabel="Customer photo">
              <Image source={url} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {shown.map((r) => (
        <ReviewCard key={r.id} review={r} onPhoto={setPhoto} />
      ))}
      {reviews.length > 3 && !all ? <Button kind="quiet" title={`See all ${reviews.length} reviews`} onPress={() => setAll(true)} /> : null}
      <Button kind="ghost" icon="star" title="Write a review" onPress={() => router.push({ pathname: "/review", params: { productId } })} />

      <Modal visible={photo !== null} transparent animationType="fade" onRequestClose={() => setPhoto(null)}>
        <Pressable style={s.viewer} onPress={() => setPhoto(null)} accessibilityLabel="Close photo">
          {photo ? <Image source={photo} style={{ width: "100%", height: "80%" }} contentFit="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  card: { gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.card },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper },
  verified: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.lemon },
  photo: { width: 72, height: 72, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.raised },
  strip: { width: 96, height: 96, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.raised },
  reply: { gap: 4, padding: space.md, borderRadius: radius.sm, backgroundColor: colors.raised, borderLeftWidth: 3, borderLeftColor: colors.lemon },
  replyHead: { fontFamily: fonts.semibold, fontSize: 13, color: colors.lemon },
  viewer: { flex: 1, backgroundColor: "rgba(7,7,7,0.94)", alignItems: "center", justifyContent: "center", padding: space.lg },
});
