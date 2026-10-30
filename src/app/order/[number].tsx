import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Qr } from "@/components/qr";
import { ApiError, getOrder, startPayment, type AppOrder } from "@/lib/api";
import { copyAndDm } from "@/lib/dm";
import { addressText, dmLink, orderMessage } from "@/lib/instagram";
import { formatINR } from "@/lib/money";
import { openUpi } from "@/lib/pay";
import { formatPhone } from "@/lib/phone";
import { reorderLines } from "@/lib/reorder";
import { REVIEWABLE } from "@/lib/reviews";
import type { OrderStatus } from "@/lib/types";
import { UPI_APPS, withTxnRef, type UpiOutcome } from "@/lib/upi";
import { useCart } from "@/state/cart";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Icon } from "@/ui/icon";
import { Button, Card, Empty, Loading, Note, Screen, Txt, tap } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

const INDIA_POST_TRACKING_URL = "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "new", label: "Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "paid", label: "Paid" },
  { status: "shipped", label: "On its way" },
  { status: "done", label: "Delivered" },
];

const NEXT: Record<OrderStatus, string> = {
  new: "Send the order to us on Instagram if you haven't yet. We'll reply to confirm it.",
  confirmed: "Confirmed. Pay below (or at the stall for pickups) and we'll start packing.",
  paid: "Paid, thank you. We're packing your order.",
  shipped: "Your order is on its way.",
  done: "Delivered. Enjoy, and tag us @stixnvibes!",
  cancelled: "This order was cancelled. Message us if that's a surprise.",
};

const CHECK_EVERY_MS = 4000;
const CHECK_FOR_MS = 90_000;

export default function OrderScreen() {
  const params = useLocalSearchParams<{ number: string; k?: string; new?: string }>();
  const number = (params.number ?? "").toUpperCase();
  const me = useMe();
  const saved = me.orders.find((o) => o.number === number);
  const key = params.k ?? saved?.key ?? "";
  const { updateOrder } = me;
  const [order, setOrder] = useState<AppOrder | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState<"idle" | "checking" | "gave-up">("idle");
  const checkStart = useRef(0);

  const load = useCallback(async () => {
    if (!key) return setError("This order link is missing its key. Open it from the link we sent you.");
    try {
      const o = await getOrder(number, key);
      setOrder(o);
      setError("");
      updateOrder(o.number, { status: o.status, totalPaise: o.totalPaise });
      return o;
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "We can't find that order. Check the link." : err instanceof Error ? err.message : "Couldn't load the order.");
    }
  }, [number, key, updateOrder]);

  useEffect(() => {
    void load();
  }, [load]);

  // Opened from a link someone else's phone made? Keep it in My orders too.
  const { addOrder } = me;
  useEffect(() => {
    if (!order || saved || !key) return;
    addOrder({ number: order.number, key, totalPaise: order.totalPaise, createdAt: order.createdAt, itemCount: order.lines.reduce((n, l) => n + l.qty, 0), image: order.lines[0]?.image ?? null, status: order.status });
  }, [order, saved, key, addOrder]);

  // After paying in a UPI app, watch for the shop to see the money.
  useEffect(() => {
    if (checking !== "checking") return;
    const t = setInterval(async () => {
      if (Date.now() - checkStart.current > CHECK_FOR_MS) {
        setChecking("gave-up");
        return;
      }
      const o = await load();
      if (o && !o.pay) {
        setChecking("idle");
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, CHECK_EVERY_MS);
    return () => clearInterval(t);
  }, [checking, load]);

  // Coming back to the app (e.g. from the gateway page) refreshes the order.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void load();
    });
    return () => sub.remove();
  }, [load]);

  const startChecking = () => {
    checkStart.current = Date.now();
    setChecking("checking");
  };

  if (!order)
    return error ? (
      <Screen padTop={false}>
        <Empty icon="receipt" title="Order not found" body={error} action="Try again" onAction={() => void load()} />
      </Screen>
    ) : (
      <Loading label="Loading your order…" />
    );

  return <OrderView order={order} viewKey={key} fresh={params.new === "1"} checking={checking} onPaid={startChecking} onRefresh={() => void load()} />;
}

function Steps({ order }: { order: AppOrder }) {
  if (order.status === "cancelled") return null;
  const at = STEPS.findIndex((s) => s.status === order.status);
  const steps = order.fulfilment === "pickup" ? STEPS.map((s) => (s.status === "shipped" ? { ...s, label: "Ready" } : s.status === "done" ? { ...s, label: "Picked up" } : s)) : STEPS;
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel={`Order progress: ${steps[at]?.label ?? order.status}`}>
      {steps.map((s, i) => (
        <View key={s.status} style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: i <= at ? colors.lemon : colors.line }} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: i === at ? colors.lemon : i < at ? colors.paperDim : colors.mute }}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

function OrderView({ order, viewKey, fresh, checking, onPaid, onRefresh }: { order: AppOrder; viewKey: string; fresh: boolean; checking: "idle" | "checking" | "gave-up"; onPaid: () => void; onRefresh: () => void }) {
  const { catalog } = useShop();
  const { add } = useCart();
  const handle = catalog?.settings.instagramHandle ?? "stixnvibes";
  const freeAbove = catalog?.settings.freeShippingAbovePaise ?? null;
  const message = orderMessage({ ...order, freeShippingAbovePaise: freeAbove, link: order.orderUrl });

  // Puts the same things back in the cart at today's prices.
  function orderAgain() {
    if (!catalog) return;
    tap();
    const r = reorderLines(order, catalog.products);
    for (const x of r.items) add(x.item, x.qty);
    const note = r.skipped.length
      ? r.skipped.map((x) => `${x.name}: ${x.why === "personal" ? "personalised, add it again from its page" : x.why === "gone" ? "no longer available" : "options changed, pick them again"}`).join("\n")
      : "";
    if (!r.items.length) return Alert.alert("Nothing to add", note || "These items aren't available right now.");
    router.push("/cart");
    if (note) Alert.alert("Added to your cart", `Prices are today's.\n\nNot added:\n${note}`);
  }

  return (
    <Screen padTop={false} onRefresh={onRefresh}>
      <View style={{ gap: 4 }}>
        <Txt variant="label">Order</Txt>
        <Text style={s.number} selectable>
          {order.number}
        </Text>
        <Txt variant="small">Placed {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</Txt>
      </View>

      <Card>
        <Steps order={order} />
        <Txt style={{ color: colors.paperDim }}>{NEXT[order.status]}</Txt>
        {order.trackingNumber && order.fulfilment === "delivery" ? (
          <Note tone="mute">
            Sent by India Post. Tracking number {order.trackingNumber}. Tap below to copy it and open India Post.
          </Note>
        ) : null}
        {order.trackingNumber && order.fulfilment === "delivery" ? (
          <Button small kind="ghost" icon="box" title="Track on India Post" onPress={() => void Clipboard.setStringAsync(order.trackingNumber).then(() => WebBrowser.openBrowserAsync(INDIA_POST_TRACKING_URL))} />
        ) : null}
        {order.status === "new" ? (
          <>
            {fresh ? <Txt variant="strong" style={{ color: colors.lemon }}>Last step: send it to us on Instagram. We copy your order; paste it in the chat with @{handle}.</Txt> : null}
            <Button title={fresh ? "Copy order & open Instagram" : "Copy order & message us"} kind={fresh ? "primary" : "ghost"} icon="instagram" onPress={() => void copyAndDm(handle, message)} />
          </>
        ) : null}
      </Card>

      {order.pay ? <PayPanel order={order} viewKey={viewKey} checking={checking} onPaid={onPaid} /> : null}

      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        {order.lines.map((l, i) => (
          <View key={`${l.productId}-${i}`} style={s.line}>
            <View style={s.thumb}>{l.image ? <Image source={l.image} style={{ width: "88%", height: "88%" }} contentFit="contain" /> : null}</View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Text style={s.lineName}>
                  {l.qty} × {l.name}
                </Text>
                <Text style={s.lineTotal}>{formatINR(l.lineTotalPaise)}</Text>
              </View>
              {l.options.length ? <Txt variant="small">{l.options.join(" · ")}</Txt> : null}
              {l.custom
                .filter((c) => c.kind !== "image")
                .map((c) => (
                  <Txt key={c.label} variant="small">
                    {c.label}: {c.value}
                  </Txt>
                ))}
              {l.custom.some((c) => c.kind === "image") ? <Txt variant="small">Your photo is with us.</Txt> : null}
              {(REVIEWABLE as readonly string[]).includes(order.status) && l.productId ? (
                <Pressable
                  hitSlop={6}
                  onPress={() => router.push({ pathname: "/review", params: { productId: l.productId, orderNumber: order.number, k: viewKey } })}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}
                  accessibilityRole="button"
                >
                  <Icon name="star" size={14} color={colors.lemon} />
                  <Text style={{ color: colors.lemon, fontFamily: fonts.medium, fontSize: 13.5 }}>Review this</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
        <View style={{ paddingTop: space.md, gap: 4 }}>
          {order.discountPaise > 0 ? (
            <>
              <Row label="Subtotal" value={formatINR(order.subtotalPaise)} />
              {order.offers.map((o) => (
                <Row key={o.offerId} label={o.name} value={`−${formatINR(o.discountPaise)}`} lemon />
              ))}
            </>
          ) : null}
          <Row label="Total" value={formatINR(order.totalPaise)} big />
        </View>
      </Card>

      <Card>
        <View style={{ gap: 2 }}>
          <Txt variant="label">For</Txt>
          <Txt>{order.customerName}</Txt>
          {order.customerPhone ? <Txt variant="small">{formatPhone(order.customerPhone)}</Txt> : null}
        </View>
        <View style={{ gap: 2 }}>
          <Txt variant="label">{order.fulfilment === "pickup" ? "Pickup" : "Deliver to"}</Txt>
          <Txt>{order.fulfilment === "pickup" ? "At a Stix N Vibes stall. We'll tell you where on Instagram." : addressText(order.address)}</Txt>
        </View>
        {order.customerNote ? (
          <View style={{ gap: 2 }}>
            <Txt variant="label">Note</Txt>
            <Txt>{order.customerNote}</Txt>
          </View>
        ) : null}
      </Card>

      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Button kind="ghost" icon="receipt" title="Receipt" style={{ flex: 1 }} onPress={() => void WebBrowser.openBrowserAsync(order.receiptUrl)} />
        <Button kind="ghost" icon="share" title="Share link" style={{ flex: 1 }} onPress={() => void Share.share({ message: `My Stix N Vibes order ${order.number}: ${order.orderUrl}` })} />
      </View>
      <Pressable onPress={() => void Linking.openURL(dmLink(handle))} style={{ flexDirection: "row", gap: 8, alignItems: "center", alignSelf: "center" }}>
        <Icon name="instagram" size={17} color={colors.lemon} />
        <Text style={{ color: colors.lemon, fontFamily: fonts.medium }}>Questions? Message us with {order.number}</Text>
      </Pressable>
      {catalog && order.status !== "new" ? <Button kind="ghost" icon="refresh" title="Order again" onPress={() => orderAgain()} /> : null}
      <Button kind="quiet" title="Keep shopping" onPress={() => router.navigate("/")} />
    </Screen>
  );
}

function Row({ label, value, lemon, big }: { label: string; value: string; lemon?: boolean; big?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.md }}>
      <Txt style={{ color: lemon ? colors.lemon : colors.paperDim, flex: 1 }}>{label}</Txt>
      <Text style={{ color: lemon ? colors.lemon : colors.paper, fontFamily: big ? fonts.display : fonts.medium, fontSize: big ? 26 : 16, fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  );
}

const OUTCOME: Record<UpiOutcome | "missing", { tone: "lemon" | "danger" | "mute"; text: string } | null> = {
  success: { tone: "lemon", text: "Your UPI app says it's paid. We're checking it landed; this updates by itself." },
  submitted: { tone: "lemon", text: "Payment is processing. This updates by itself once it lands." },
  unknown: { tone: "mute", text: "Paid? We're checking; this updates by itself once the money lands." },
  failure: { tone: "danger", text: "That payment didn't go through. Nothing was taken. Try again or use another app." },
  cancelled: { tone: "mute", text: "Payment cancelled. Tap an app to try again." },
  missing: { tone: "danger", text: "That app isn't on this phone. Pick another one." },
};

function PayPanel({ order, viewKey, checking, onPaid }: { order: AppOrder; viewKey: string; checking: "idle" | "checking" | "gave-up"; onPaid: () => void }) {
  const pay = order.pay!;
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<UpiOutcome | "missing" | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = pay.upiLink ? withTxnRef(pay.upiLink, order.number) : null;

  if (!pay.amountFixed)
    return (
      <Card>
        <Txt variant="title">Paying</Txt>
        <Txt style={{ color: colors.paperDim }}>We&apos;ll confirm the delivery charge for your area on Instagram first. Once it&apos;s set, the exact amount shows here and you can pay in one tap.</Txt>
      </Card>
    );

  async function payApp(pkg?: string, id = "any") {
    if (!link) return;
    tap();
    setBusy(id);
    const r = await openUpi(link, pkg);
    setBusy(null);
    setOutcome(r);
    if (r === "success" || r === "submitted" || r === "unknown") onPaid();
  }

  async function payOnline() {
    setBusy("online");
    try {
      const url = await startPayment(order.number, viewKey);
      if (url) {
        await WebBrowser.openBrowserAsync(url);
        onPaid();
      } else setOutcome(null);
    } catch {
      // Gateway trouble: the UPI buttons below still work.
    } finally {
      setBusy(null);
    }
  }

  const status = checking === "checking" ? OUTCOME[outcome && outcome !== "failure" && outcome !== "cancelled" && outcome !== "missing" ? outcome : "unknown"] : outcome ? OUTCOME[outcome] : null;

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <Card style={{ borderColor: "rgba(215,255,63,0.4)" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Txt variant="title">Pay now</Txt>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.lemon, fontVariant: ["tabular-nums"] }}>{pay.amount}</Text>
        </View>

        {pay.online ? <Button title="Pay online" icon="chevron-right" busy={busy === "online"} onPress={() => void payOnline()} /> : null}

        {link ? (
          <>
            <Txt variant="small">{pay.online ? "Or pay straight from your UPI app:" : "Tap your UPI app. The amount and order ref are filled in."}</Txt>
            <View style={s.apps}>
              {UPI_APPS.map((a) => (
                <Pressable key={a.id} onPress={() => void payApp(a.pkg, a.id)} disabled={!!busy} style={({ pressed }) => [s.app, pressed && { opacity: 0.7 }]} accessibilityRole="button" accessibilityLabel={`Pay with ${a.name}`}>
                  <Text style={s.appName}>{busy === a.id ? "Opening…" : a.name}</Text>
                </Pressable>
              ))}
            </View>
            <Button kind="ghost" small title="Another UPI app" onPress={() => void payApp(undefined, "any")} busy={busy === "any"} />
          </>
        ) : !pay.online ? (
          <Txt style={{ color: colors.paperDim }}>We&apos;ll send you payment details on Instagram.</Txt>
        ) : null}

        {status ? <Note tone={status.tone}>{checking === "gave-up" ? "If you paid, it shows here once your bank confirms it, usually within minutes. Still not showing? Send us the screenshot." : status.text}</Note> : null}

        {link ? (
          <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
            <Button small kind="quiet" icon="grid" title={showQr ? "Hide QR" : "Show QR"} onPress={() => setShowQr((x) => !x)} />
            <Button
              small
              kind="quiet"
              icon={copied ? "check" : "copy"}
              title={copied ? "Copied" : "Copy UPI ID"}
              onPress={() => void Clipboard.setStringAsync(pay.upiId).then(() => setCopied(true))}
            />
          </View>
        ) : null}
        {showQr && link ? (
          <View style={{ alignItems: "center", gap: 8, paddingVertical: space.sm }}>
            <View style={{ borderRadius: radius.md, overflow: "hidden" }}>
              <Qr value={link} size={220} />
            </View>
            <Txt variant="small">Scan from another phone. UPI ID {pay.upiId}</Txt>
          </View>
        ) : null}
        {pay.whatsapp ? <Button small kind="ghost" icon="chat" title="Send payment screenshot on WhatsApp" onPress={() => void Linking.openURL(pay.whatsapp!)} /> : null}
      </Card>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  number: { fontFamily: fonts.display, fontSize: 40, color: colors.paper, letterSpacing: 0.5 },
  line: { flexDirection: "row", gap: space.md, paddingVertical: space.sm },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  lineName: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  lineTotal: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper, fontVariant: ["tabular-nums"] },
  apps: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  app: { flexGrow: 1, flexBasis: "45%", minHeight: 52, borderRadius: radius.md, backgroundColor: colors.raised, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line },
  appName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.paper },
});
