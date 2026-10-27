import { useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { ProductGrid } from "@/components/product-card";
import { useShop } from "@/state/shop";
import { Empty, Loading, Screen, Txt } from "@/ui/kit";
import { colors } from "@/ui/theme";

export default function CollectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { catalog } = useShop();
  if (!catalog) return <Loading />;
  const c = catalog.collections.find((x) => x.slug === slug);
  const products = c ? catalog.products.filter((p) => p.collectionIds.includes(c.id)) : [];
  return (
    <Screen padTop={false}>
      <Stack.Screen options={{ title: c?.name ?? "" }} />
      {c ? (
        <>
          {c.description ? <Txt style={{ color: colors.paperDim }}>{c.description}</Txt> : null}
          <ProductGrid products={products} />
        </>
      ) : (
        <Empty title="Collection not found" />
      )}
    </Screen>
  );
}
