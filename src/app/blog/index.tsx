import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { readingMinutes } from "@/lib/markdown";
import { useShop } from "@/state/shop";
import { Empty, Loading, Screen, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function Blog() {
  const { catalog } = useShop();
  if (!catalog) return <Loading />;
  return (
    <Screen padTop={false}>
      {catalog.posts.length ? (
        catalog.posts.map((p) => (
          <Pressable key={p.id} onPress={() => router.push({ pathname: "/blog/[slug]", params: { slug: p.slug } })} style={({ pressed }) => [{ gap: space.sm }, pressed && { opacity: 0.85 }]}>
            {p.cover ? <Image source={p.cover} style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg }} contentFit="cover" /> : null}
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: colors.paper }}>{p.title}</Text>
            {p.excerpt ? <Txt style={{ color: colors.paperDim }}>{p.excerpt}</Txt> : null}
            <Txt variant="small">
              {p.publishedAt ? `${day.format(new Date(p.publishedAt))} · ` : ""}
              {readingMinutes(p.body)} min read
            </Txt>
            <View style={{ height: 1, backgroundColor: colors.line, marginTop: space.md }} />
          </Pressable>
        ))
      ) : (
        <Empty icon="receipt" title="No posts yet" />
      )}
    </Screen>
  );
}
