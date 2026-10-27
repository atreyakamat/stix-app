import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import type { AppProduct } from "@/lib/api";
import { colors, fonts, radius, space } from "@/ui/theme";

/**
 * A quick mock-up of what the customer is making: their photo (or the
 * product shot) with their words on it, styled like a die-cut sticker.
 * It's a guide, not a proof; the real print is set up by hand.
 */
export function PersonalPreview({ product, photo, text }: { product: AppProduct; photo: string | null; text: string }) {
  const image = photo ?? product.images[0] ?? null;
  const music = product.type === "music-card";
  return (
    <Animated.View entering={FadeIn.duration(250)} style={{ gap: 8 }}>
      <Text style={s.label}>Preview</Text>
      <View style={[s.sticker, music && { aspectRatio: 0.72 }]}>
        {image ? <Image source={image} style={[s.photo, music && { aspectRatio: 1 }]} contentFit={photo ? "cover" : "contain"} /> : null}
        {music ? (
          <View style={s.code}>
            {Array.from({ length: 23 }, (_, i) => (
              <View key={i} style={[s.bar, { height: 6 + ((i * 7) % 17) }]} />
            ))}
          </View>
        ) : null}
        {text ? (
          <Text style={[s.text, music && { color: colors.ink, marginTop: 0 }]} numberOfLines={2}>
            {text}
          </Text>
        ) : null}
      </View>
      <Text style={s.note}>A rough preview. We set up the print by hand and message you if anything needs a tweak.</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: fonts.semibold, fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", color: colors.mute },
  sticker: {
    alignSelf: "center",
    width: 220,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
    alignItems: "center",
    gap: space.sm,
    transform: [{ rotate: "-3deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  photo: { width: "100%", aspectRatio: 1, borderRadius: radius.sm, backgroundColor: "#e6e6de" },
  code: { flexDirection: "row", alignItems: "center", gap: 3, height: 26 },
  bar: { width: 4, borderRadius: 2, backgroundColor: colors.ink },
  text: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, textAlign: "center", letterSpacing: -0.4 },
  note: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mute, textAlign: "center" },
});
