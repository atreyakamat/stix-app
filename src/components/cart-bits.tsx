import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatINR } from "@/lib/money";
import { useCart, type CartItem } from "@/state/cart";
import { Icon } from "@/ui/icon";
import { Button, Note, QtyStepper, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";
import { openProduct } from "./product-card";

export function CartLine({ item, editable = true }: { item: CartItem; editable?: boolean }) {
  const { setQty } = useCart();
  return (
    <View style={s.line}>
      <Pressable onPress={() => openProduct(item)} style={s.thumb}>
        {item.image ? <Image source={item.image} style={{ width: "88%", height: "88%" }} contentFit="contain" /> : null}
      </Pressable>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
          <Text style={s.name} numberOfLines={2}>
            {editable ? item.name : `${item.qty} × ${item.name}`}
          </Text>
          <Text style={s.total}>{formatINR(item.unitPricePaise * item.qty)}</Text>
        </View>
        {item.optionLabels.length ? <Txt variant="small">{item.optionLabels.join(" · ")}</Txt> : null}
        {item.customDisplay.map((c) => (
          <Txt key={c.label} variant="small" numberOfLines={2}>
            {c.label}: {c.kind === "image" ? "your photo ✓" : c.value}
          </Txt>
        ))}
        {editable ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <QtyStepper value={item.qty} min={0} onChange={(n) => setQty(item.key, n)} label={item.name} />
            <Txt variant="small">{formatINR(item.unitPricePaise)} each</Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function Nudges() {
  const { hints, shortfalls } = useCart();
  return (
    <>
      {shortfalls.map((sf) => (
        <Note key={`${sf.productId}-${sf.stock ?? "min"}`} tone="danger">
          {sf.stock !== undefined ? `${sf.name}: only ${sf.stock} left. Lower the quantity to check out.` : `${sf.name}: minimum ${sf.minQty} per order. Add ${sf.need} more to check out.`}
        </Note>
      ))}
      {hints.map((h) => (
        <Note key={h}>{h}</Note>
      ))}
    </>
  );
}

export function Totals() {
  const { subtotalPaise, discountPaise, totalPaise, applied, shipping } = useCart();
  return (
    <View style={{ gap: 6 }}>
      {discountPaise > 0 ? (
        <>
          <View style={s.row}>
            <Txt style={{ color: colors.paperDim }}>Subtotal</Txt>
            <Txt style={s.num}>{formatINR(subtotalPaise)}</Txt>
          </View>
          {applied.map((a) => (
            <View key={a.offerId} style={s.row}>
              <Txt style={{ color: colors.lemon, flex: 1 }}>
                {a.name}
                {a.freeUnits > 0 ? <Text style={{ color: colors.mute }}> ({a.freeUnits} free)</Text> : null}
              </Txt>
              <Txt style={[s.num, { color: colors.lemon }]}>−{formatINR(a.discountPaise)}</Txt>
            </View>
          ))}
        </>
      ) : null}
      <View style={[s.row, { alignItems: "baseline" }]}>
        <Txt style={{ color: colors.paperDim }}>Total</Txt>
        <Text style={s.grand}>{formatINR(totalPaise)}</Text>
      </View>
      {shipping ? (
        <View style={s.row}>
          <Txt variant="small">Shipping</Txt>
          <Txt variant="small" style={shipping.free ? { color: colors.lemon } : undefined}>
            {shipping.free ? "Free" : `Add ${formatINR(shipping.needPaise)} more for free shipping`}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

export function CouponField() {
  const { coupon, couponCode, couponProblem, applyCode, removeCode } = useCart();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (coupon)
    return (
      <View style={s.code}>
        <View style={{ flex: 1 }}>
          <Txt>
            Code <Text style={{ fontFamily: fonts.semibold }}>{coupon.code}</Text>
            {couponCode ? <Text style={{ color: colors.lemon }}> applied</Text> : null}
          </Txt>
          {!couponCode && couponProblem ? <Txt variant="small" style={{ color: colors.warn }}>{couponProblem}</Txt> : null}
        </View>
        <Pressable onPress={removeCode} hitSlop={10} accessibilityLabel={`Remove code ${coupon.code}`}>
          <Icon name="x" size={18} color={colors.mute} />
        </Pressable>
      </View>
    );
  if (!open)
    return (
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={{ alignSelf: "flex-start" }}>
        <Text style={{ color: colors.paperDim, fontFamily: fonts.medium, textDecorationLine: "underline" }}>Have a code?</Text>
      </Pressable>
    );

  async function apply() {
    setBusy(true);
    setError((await applyCode(value)) ?? "");
    setBusy(false);
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <TextInput
          value={value}
          onChangeText={(v) => setValue(v.toUpperCase())}
          onSubmitEditing={() => void apply()}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={20}
          placeholder="CODE"
          placeholderTextColor="#6b6b66"
          accessibilityLabel="Discount code"
          style={s.codeInput}
        />
        <Button title="Apply" kind="ghost" busy={busy} disabled={!value.trim()} onPress={() => void apply()} />
      </View>
      {error ? <Text style={{ color: colors.danger, fontFamily: fonts.body, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  line: { flexDirection: "row", gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  name: { flex: 1, fontFamily: fonts.medium, fontSize: 15.5, color: colors.paper },
  total: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.paper, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  num: { fontVariant: ["tabular-nums"] },
  grand: { fontFamily: fonts.display, fontSize: 30, color: colors.paper, fontVariant: ["tabular-nums"] },
  code: { flexDirection: "row", alignItems: "center", gap: space.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md },
  codeInput: { flex: 1, minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 14, color: colors.paper, fontFamily: fonts.semibold, fontSize: 16, letterSpacing: 1.5 },
});
