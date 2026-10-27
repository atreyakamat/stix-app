import { router } from "expo-router";
import { View } from "react-native";
import { useShop } from "@/state/shop";
import { Divider, Empty, Loading, Row, Screen, Txt } from "@/ui/kit";
import { colors } from "@/ui/theme";

export default function Colleges() {
  const { catalog } = useShop();
  if (!catalog) return <Loading />;
  return (
    <Screen padTop={false}>
      <Txt style={{ color: colors.paperDim }}>Designs, codes and stall dates for each campus we pop up at.</Txt>
      {catalog.colleges.length ? (
        <View>
          {catalog.colleges.map((c, i) => (
            <View key={c.id}>
              {i ? <Divider /> : null}
              <Row icon="pin" title={c.name} sub={c.area} onPress={() => router.push({ pathname: "/c/[slug]", params: { slug: c.slug } })} />
            </View>
          ))}
        </View>
      ) : (
        <Empty icon="pin" title="No colleges yet" body="We'll add campuses as we book stalls." />
      )}
    </Screen>
  );
}
