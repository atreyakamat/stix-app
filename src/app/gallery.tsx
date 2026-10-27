import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { GalleryItem } from "@/lib/types";
import { useShop } from "@/state/shop";
import { Icon } from "@/ui/icon";
import { Empty, Loading, Screen, Txt } from "@/ui/kit";
import { colors, radius, space } from "@/ui/theme";

export default function Gallery() {
  const { catalog } = useShop();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<GalleryItem | null>(null);
  if (!catalog) return <Loading />;
  const w = (width - space.lg * 2 - space.sm) / 2;
  return (
    <Screen padTop={false}>
      <Txt style={{ color: colors.paperDim }}>Stalls, events and work we&apos;ve done.</Txt>
      {catalog.gallery.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {catalog.gallery.map((g) => (
            <Pressable key={g.id} onPress={() => setOpen(g)} accessibilityLabel={g.caption || "Photo"}>
              <Image source={g.image} style={{ width: w, height: w, borderRadius: radius.md, backgroundColor: colors.card }} contentFit="cover" recyclingKey={g.id} />
            </Pressable>
          ))}
        </View>
      ) : (
        <Empty icon="image" title="No photos yet" />
      )}
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(7,7,7,0.96)", justifyContent: "center", padding: space.lg, gap: space.md }}>
          <Pressable onPress={() => setOpen(null)} style={{ position: "absolute", top: insets.top + space.md, right: space.lg }} hitSlop={12} accessibilityLabel="Close">
            <Icon name="x" size={26} />
          </Pressable>
          {open ? <Image source={open.image} style={{ width: "100%", aspectRatio: 1 }} contentFit="contain" /> : null}
          {open?.caption ? <Txt style={{ textAlign: "center" }}>{open.caption}</Txt> : null}
        </View>
      </Modal>
    </Screen>
  );
}
