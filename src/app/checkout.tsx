import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Switch, View } from "react-native";
import { CartLine, CouponField, Nudges, Totals } from "@/components/cart-bits";
import { ApiError, parseOrderPath, placeOrder, track } from "@/lib/api";
import { copyAndDm } from "@/lib/dm";
import { cleanHandle, INSTAGRAM_HANDLE_RE, orderMessage } from "@/lib/instagram";
import { normalizePhone } from "@/lib/phone";
import { useCart } from "@/state/cart";
import { useMe, type Details } from "@/state/me";
import { useShop } from "@/state/shop";
import { Button, Chip, Empty, Field, Note, Screen, Txt } from "@/ui/kit";
import { colors, space } from "@/ui/theme";

/** Same rules as the shop's order API, so the server rarely says no. */
function check(d: Details): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.name.trim().length < 2) e.name = "Add your name.";
  if (!normalizePhone(d.phone)) e.phone = "Add a 10-digit mobile number.";
  const ig = cleanHandle(d.instagram);
  if (ig && !INSTAGRAM_HANDLE_RE.test(ig)) e.instagram = "That doesn't look like an Instagram username.";
  if (d.fulfilment === "delivery") {
    if (d.address.line.trim().length < 5) e.line = "Add your delivery address.";
    if (d.address.city.trim().length < 2) e.city = "Add your city.";
    if (!/^[1-9]\d{5}$/.test(d.address.pincode.trim())) e.pincode = "Add a 6-digit pincode.";
  }
  return e;
}

export default function Checkout() {
  const cart = useCart();
  const me = useMe();
  const { catalog } = useShop();
  const settings = catalog?.settings;
  const [d, setD] = useState<Details>(me.details);
  const [note, setNote] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState<string | null>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    void track([{ type: "checkout", path: "/checkout", source: me.sourceTag }]);
  }, [me.sourceTag]);

  const set = (patch: Partial<Details>) => setD((x) => ({ ...x, ...patch }));
  const setAddr = (patch: Partial<Details["address"]>) => setD((x) => ({ ...x, address: { ...x.address, ...patch } }));

  if (!cart.items.length && !fallback)
    return (
      <Screen padTop={false}>
        <Empty icon="bag" title="Your cart is empty" action="Start shopping" onAction={() => router.replace("/shop")} />
      </Screen>
    );

  const pickup = d.fulfilment === "pickup";

  async function submit() {
    const found = check(d);
    setErrors(found);
    if (Object.keys(found).length) return setError("Check the details marked in red.");
    setBusy(true);
    setError("");
    if (remember) me.saveDetails(d);
    try {
      const r = await placeOrder({
        lines: cart.items.map((i) => ({ productId: i.productId, qty: i.qty, selections: i.selections, custom: i.custom })),
        customerName: d.name,
        customerPhone: d.phone,
        fulfilment: d.fulfilment,
        address: d.address,
        customerNote: note,
        instagram: d.instagram,
        couponCode: cart.coupon?.code ?? "",
        source: me.sourceTag,
      });
      const ref = parseOrderPath(r.orderPath);
      if (!ref) throw new ApiError("Order placed, but we couldn't open it. Check Instagram for our reply.", 500);
      me.addOrder({
        number: r.number,
        key: ref.key,
        totalPaise: r.totalPaise,
        createdAt: new Date().toISOString(),
        itemCount: cart.count,
        image: cart.items[0]?.image ?? null,
        status: "new",
      });
      cart.clear();
      if (cart.coupon) cart.removeCode();
      router.replace({ pathname: "/order/[number]", params: { number: r.number, k: ref.key, new: "1" } });
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && [400, 409, 429].includes(err.status)) return setError(err.message);
      // Network or server trouble: the order still goes through on Instagram.
      void track([{ type: "order_click", path: "/checkout", source: me.sourceTag }]);
      setFallback(
        orderMessage({
          lines: cart.items.map((i) => ({ name: i.name, options: i.optionLabels, custom: i.customDisplay, qty: i.qty, unitPricePaise: i.unitPricePaise, lineTotalPaise: i.unitPricePaise * i.qty })),
          subtotalPaise: cart.subtotalPaise,
          discountPaise: cart.discountPaise,
          totalPaise: cart.totalPaise,
          offers: cart.applied,
          customerName: d.name.trim(),
          customerPhone: normalizePhone(d.phone) ?? d.phone.trim(),
          fulfilment: d.fulfilment,
          address: d.address,
          customerNote: note.trim(),
          freeShippingAbovePaise: settings?.freeShippingAbovePaise ?? null,
        }),
      );
    }
  }

  if (fallback)
    return (
      <Screen padTop={false}>
        <Txt variant="title">We couldn&apos;t reach the shop</Txt>
        <Txt style={{ color: colors.paperDim }}>Send your order straight to us on Instagram instead. We copy it for you; paste it in the chat.</Txt>
        <Button title="Copy order & open Instagram" icon="instagram" onPress={() => void copyAndDm(settings?.instagramHandle ?? "stixnvibes", fallback)} />
        <Button title="Sent it, clear my cart" kind="ghost" onPress={() => (cart.clear(), router.replace("/"))} />
        <Button title="Try again" kind="quiet" icon="refresh" onPress={() => setFallback(null)} />
      </Screen>
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen
        padTop={false}
        footer={
          <>
            {error ? <Note tone="danger">{error}</Note> : null}
            <Button title={busy ? "Placing order…" : "Place order"} busy={busy} disabled={cart.shortfalls.length > 0} onPress={() => void submit()} />
          </>
        }
      >
        <View style={{ gap: space.md }}>
          <Txt variant="label">How do you want it?</Txt>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Chip label="Deliver to me" on={!pickup} onPress={() => set({ fulfilment: "delivery" })} />
            <Chip label="Pick up at a stall" on={pickup} onPress={() => set({ fulfilment: "pickup" })} />
          </View>
          {pickup ? (
            <Txt variant="small">We&apos;ll tell you where and when on Instagram. Pickups can be paid right away.</Txt>
          ) : settings?.deliveryNote ? (
            <Txt variant="small">{settings.deliveryNote}</Txt>
          ) : null}
        </View>

        <View style={{ gap: space.lg }}>
          <Field label="Your name" value={d.name} onChangeText={(v) => set({ name: v })} error={errors.name} autoComplete="name" textContentType="name" maxLength={80} />
          <Field label="Mobile number" value={d.phone} onChangeText={(v) => set({ phone: v })} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" maxLength={20} placeholder="98765 43210" />
          <Field label="Instagram username" optional value={d.instagram} onChangeText={(v) => set({ instagram: v })} error={errors.instagram} autoCapitalize="none" autoCorrect={false} placeholder="@you" help="So we can reply in your DMs. Otherwise we WhatsApp you." />
          {!pickup ? (
            <>
              <Field label="Address" value={d.address.line} onChangeText={(v) => setAddr({ line: v })} error={errors.line} multiline autoComplete="street-address" maxLength={200} placeholder="House, street, area" />
              <View style={{ flexDirection: "row", gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Field label="City" value={d.address.city} onChangeText={(v) => setAddr({ city: v })} error={errors.city} maxLength={60} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Pincode" value={d.address.pincode} onChangeText={(v) => setAddr({ pincode: v.replace(/\D/g, "") })} error={errors.pincode} keyboardType="number-pad" maxLength={6} autoComplete="postal-code" />
                </View>
              </View>
              <Field label="State" value={d.address.state} onChangeText={(v) => setAddr({ state: v })} maxLength={40} />
            </>
          ) : null}
          <Field label="Note for us" optional value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Anything we should know" />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md }}>
            <Txt style={{ flex: 1 }}>Remember my details on this phone</Txt>
            <Switch value={remember} onValueChange={setRemember} trackColor={{ true: colors.lemon, false: colors.line }} thumbColor={colors.paper} />
          </View>
        </View>

        <View>
          <Txt variant="label" style={{ marginBottom: 4 }}>
            Your order
          </Txt>
          {cart.items.map((i) => (
            <CartLine key={i.key} item={i} editable={false} />
          ))}
        </View>
        <View style={{ gap: space.md }}>
          <Nudges />
          <Totals />
          <CouponField />
          {settings?.orderNote ? <Txt variant="small">{settings.orderNote}</Txt> : null}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
