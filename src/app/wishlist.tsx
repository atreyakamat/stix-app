import { router } from "expo-router";
import { Share } from "react-native";
import { ProductGrid } from "@/components/product-card";
import { shareLink } from "@/lib/api";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Button, Empty, Loading, Screen } from "@/ui/kit";

export default function Wishlist() {
  const { catalog } = useShop();
  const { taste } = useMe();
  if (!catalog) return <Loading />;
  const items = taste.wishlist.map((id) => catalog.products.find((p) => p.id === id)).filter((p) => p !== undefined);
  return (
    <Screen padTop={false}>
      {items.length ? (
        <>
          <Button
            kind="ghost"
            icon="share"
            title="Share my wishlist"
            onPress={() => void Share.share({ message: `My Stix N Vibes wishlist:\n${items.slice(0, 12).map((p) => `• ${p.name} ${shareLink(`/shop/${p.slug}`)}`).join("\n")}` })}
          />
          <ProductGrid products={items} />
        </>
      ) : (
        <Empty icon="heart" title="Nothing saved yet" body="Tap the heart on anything you like. It stays here for later." action="Browse the shop" onAction={() => router.push("/shop")} />
      )}
    </Screen>
  );
}
