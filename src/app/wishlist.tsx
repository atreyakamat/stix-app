import { router } from "expo-router";
import { ProductGrid } from "@/components/product-card";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Empty, Loading, Screen } from "@/ui/kit";

export default function Wishlist() {
  const { catalog } = useShop();
  const { taste } = useMe();
  if (!catalog) return <Loading />;
  const items = taste.wishlist.map((id) => catalog.products.find((p) => p.id === id)).filter((p) => p !== undefined);
  return (
    <Screen padTop={false}>
      {items.length ? (
        <ProductGrid products={items} />
      ) : (
        <Empty icon="heart" title="Nothing saved yet" body="Tap the heart on anything you like. It stays here for later." action="Browse the shop" onAction={() => router.push("/shop")} />
      )}
    </Screen>
  );
}
