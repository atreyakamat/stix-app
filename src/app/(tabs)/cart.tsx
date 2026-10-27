import { router } from "expo-router";
import { View } from "react-native";
import { CartLine, CouponField, Nudges, Totals } from "@/components/cart-bits";
import { copyAndDm } from "@/lib/dm";
import { orderMessage } from "@/lib/instagram";
import { useCart } from "@/state/cart";
import { useShop } from "@/state/shop";
import { Button, Empty, Note, Screen, Txt } from "@/ui/kit";
import { colors, space } from "@/ui/theme";

export default function Cart() {
  const cart = useCart();
  const { catalog } = useShop();
  const settings = catalog?.settings;

  if (!cart.items.length)
    return (
      <Screen>
        <Txt variant="display" style={{ fontSize: 34 }}>
          Cart
        </Txt>
        <Empty icon="bag" title="Your cart is empty" body="Stickers from ₹10. Buy 4, get the 5th free." action="Start shopping" onAction={() => router.push("/shop")} />
      </Screen>
    );

  const open = settings?.storeOpen ?? true;
  const blocked = cart.shortfalls.length > 0;

  return (
    <Screen
      footer={
        open ? (
          <Button title="Checkout" icon="chevron-right" disabled={blocked} onPress={() => router.push("/checkout")} />
        ) : (
          <Button
            title="Send this order on Instagram"
            icon="instagram"
            onPress={() =>
              void copyAndDm(
                settings?.instagramHandle ?? "stixnvibes",
                orderMessage({
                  lines: cart.items.map((i) => ({ name: i.name, options: i.optionLabels, custom: i.customDisplay, qty: i.qty, unitPricePaise: i.unitPricePaise, lineTotalPaise: i.unitPricePaise * i.qty })),
                  subtotalPaise: cart.subtotalPaise,
                  discountPaise: cart.discountPaise,
                  totalPaise: cart.totalPaise,
                  offers: cart.applied,
                  freeShippingAbovePaise: settings?.freeShippingAbovePaise ?? null,
                }),
              )
            }
          />
        )
      }
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Txt variant="display" style={{ fontSize: 34 }}>
          Cart
        </Txt>
        <Txt variant="small">
          {cart.count} item{cart.count === 1 ? "" : "s"}
        </Txt>
      </View>
      {!open ? <Note tone="danger">Online orders are paused. Send us the order on Instagram and we&apos;ll sort it out.</Note> : null}
      <View>
        {cart.items.map((i) => (
          <CartLine key={i.key} item={i} />
        ))}
      </View>
      <View style={{ gap: space.md }}>
        <Nudges />
        <Totals />
        <CouponField />
        {settings?.orderNote ? <Txt variant="small" style={{ color: colors.paperDim }}>{settings.orderNote}</Txt> : null}
      </View>
    </Screen>
  );
}
