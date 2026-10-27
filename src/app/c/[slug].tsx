import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { View } from "react-native";
import { ProductGrid } from "@/components/product-card";
import { formatStallDate, upcomingStalls } from "@/lib/shop-helpers";
import { useCart } from "@/state/cart";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Icon } from "@/ui/icon";
import { Button, Card, Empty, Loading, Screen, Txt } from "@/ui/kit";
import { colors, radius, space } from "@/ui/theme";

export default function CollegeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { catalog } = useShop();
  const { taste, setTaste } = useMe();
  const { coupon, applyCode } = useCart();
  if (!catalog) return <Loading />;
  const college = catalog.colleges.find((c) => c.slug === slug);
  if (!college)
    return (
      <Screen padTop={false}>
        <Empty icon="pin" title="College not found" />
      </Screen>
    );
  const products = college.productIds.map((id) => catalog.products.find((p) => p.id === id)).filter((p) => p !== undefined);
  const stalls = upcomingStalls(catalog, college.id);
  const photos = catalog.gallery.filter((g) => g.collegeId === college.id).slice(0, 6);
  const mine = taste.collegeId === college.id;
  const codeOn = coupon?.code === college.couponCode;

  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: college.name }} />
      {college.image ? <Image source={college.image} style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg }} contentFit="cover" /> : null}
      <View style={{ gap: space.sm }}>
        {college.area ? <Txt variant="label">{college.area}</Txt> : null}
        {college.description ? <Txt style={{ color: colors.paperDim }}>{college.description}</Txt> : null}
        {!mine ? <Button small kind="ghost" icon="pin" title="This is my college" onPress={() => setTaste({ collegeId: college.id })} style={{ alignSelf: "flex-start" }} /> : null}
      </View>
      {college.couponCode ? (
        <Card style={{ borderColor: "rgba(215,255,63,0.4)" }}>
          <Txt variant="label" style={{ color: colors.lemon }}>
            Campus code
          </Txt>
          <Txt variant="title">{college.couponCode}</Txt>
          <Button small title={codeOn ? "Applied to your cart" : "Apply to my cart"} icon={codeOn ? "check" : "plus"} disabled={codeOn} onPress={() => void applyCode(college.couponCode)} />
        </Card>
      ) : null}
      {stalls.length ? (
        <View style={{ gap: space.sm }}>
          <Txt variant="title">Next stalls here</Txt>
          {stalls.map((st) => (
            <View key={st.id} style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
              <Icon name="calendar" size={19} color={colors.lemon} />
              <Txt>
                {formatStallDate(st.date)} · {st.name}
                {st.venue ? `, ${st.venue}` : ""}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}
      {products.length ? (
        <View style={{ gap: space.md }}>
          <Txt variant="title">Picked for {college.name}</Txt>
          <ProductGrid products={products} />
        </View>
      ) : null}
      {photos.length ? (
        <View style={{ gap: space.md }}>
          <Txt variant="title">From our stalls here</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {photos.map((g) => (
              <Image key={g.id} source={g.image} style={{ width: "48%", aspectRatio: 1, borderRadius: radius.md }} contentFit="cover" accessibilityLabel={g.caption} />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
