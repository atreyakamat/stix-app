import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import * as WebBrowser from "expo-web-browser";
import { Fragment } from "react";
import { Text, View } from "react-native";
import { shopLink } from "@/lib/api";
import { parseMarkdown, type Inline } from "@/lib/markdown";
import { useShop } from "@/state/shop";
import { Empty, Loading, Screen, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

// Posts are Markdown parsed to plain data (lib/markdown.ts, same as the
// website), so nothing in a post can run as code.

function openLink(href: string) {
  const m = href.match(/^\/shop\/([^/?#]+)/);
  if (m) return router.push({ pathname: "/shop/[slug]", params: { slug: m[1] } });
  void WebBrowser.openBrowserAsync(href.startsWith("/") ? shopLink(href) : href);
}

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.kind === "text") return <Fragment key={i}>{n.text}</Fragment>;
        if (n.kind === "code") return <Text key={i} style={{ fontFamily: "monospace", color: colors.lemon }}>{n.text}</Text>;
        if (n.kind === "strong") return <Text key={i} style={{ fontFamily: fonts.semibold }}><Inlines nodes={n.children} /></Text>;
        if (n.kind === "em") return <Text key={i} style={{ fontStyle: "italic" }}><Inlines nodes={n.children} /></Text>;
        return (
          <Text key={i} style={{ color: colors.lemon, textDecorationLine: "underline" }} onPress={() => openLink(n.href)}>
            <Inlines nodes={n.children} />
          </Text>
        );
      })}
    </>
  );
}

const body = { fontFamily: fonts.body, fontSize: 16.5, lineHeight: 26, color: colors.paperDim } as const;

export default function Post() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { catalog } = useShop();
  if (!catalog) return <Loading />;
  const post = catalog.posts.find((p) => p.slug === slug);
  if (!post)
    return (
      <Screen padTop={false}>
        <Empty title="Post not found" />
      </Screen>
    );
  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: "" }} />
      {post.cover ? <Image source={post.cover} style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg }} contentFit="cover" /> : null}
      <Txt variant="display" style={{ fontSize: 32, lineHeight: 34 }}>
        {post.title}
      </Txt>
      <View style={{ gap: space.lg }}>
        {parseMarkdown(post.body).map((b, i) => {
          if (b.kind === "heading") return <Text key={i} style={{ fontFamily: fonts.displayBold, fontSize: b.level === 2 ? 24 : 20, color: colors.paper }}><Inlines nodes={b.children} /></Text>;
          if (b.kind === "paragraph") return <Text key={i} style={body}><Inlines nodes={b.children} /></Text>;
          if (b.kind === "quote") return <View key={i} style={{ borderLeftWidth: 3, borderLeftColor: colors.lemon, paddingLeft: space.md }}><Text style={[body, { color: colors.paper }]}><Inlines nodes={b.children} /></Text></View>;
          if (b.kind === "rule") return <View key={i} style={{ height: 1, backgroundColor: colors.line }} />;
          if (b.kind === "image") return <Image key={i} source={b.src.startsWith("/") ? shopLink(b.src) : b.src} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.md }} contentFit="cover" accessibilityLabel={b.alt} />;
          return (
            <View key={i} style={{ gap: 6 }}>
              {b.items.map((item, j) => (
                <View key={j} style={{ flexDirection: "row", gap: 10 }}>
                  <Text style={[body, { color: colors.lemon }]}>{b.ordered ? `${j + 1}.` : "•"}</Text>
                  <Text style={[body, { flex: 1 }]}><Inlines nodes={item} /></Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
