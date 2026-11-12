import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { ApiError, requestLoginCode, verifyLoginCode } from "@/lib/api";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Icon } from "@/ui/icon";
import { Button, Empty, Field, Loading, Note, Screen, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

// Optional account: email, then a 6-digit code. No password. Signing in keeps
// details, vibes, wishlist and orders on the account (see AccountSync).

type Step = "email" | "code" | "done";
const RESEND_SECONDS = 45;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Six boxes over one hidden input, so autofill from the SMS or email app works. */
function CodeInput({ value, onChange, disabled, shakeKey }: { value: string; onChange: (v: string) => void; disabled: boolean; shakeKey: number }) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const x = useSharedValue(0);
  // autoFocus alone can miss while the step is still sliding in.
  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (shakeKey) x.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 80 }), withTiming(-8, { duration: 80 }), withTiming(0, { duration: 50 }));
  }, [shakeKey, x]);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel="6-digit code">
      <Animated.View style={[{ flexDirection: "row", gap: space.sm }, shake]}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[s.box, i === value.length && !disabled && s.boxActive, !!value[i] && s.boxFilled]}>
            <Text style={s.boxText}>{value[i] ?? ""}</Text>
          </View>
        ))}
      </Animated.View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={6}
        autoFocus
        editable={!disabled}
        caretHidden
        style={s.hidden}
      />
    </Pressable>
  );
}

export default function SignIn() {
  const me = useMe();
  const { catalog } = useShop();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState(me.details.name.trim().split(/\s+/)[0] ?? "");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // The check mark pops in, then we go back to where they came from.
  const pop = useSharedValue(0);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }], opacity: pop.value }));
  useEffect(() => {
    if (step !== "done") return;
    pop.value = withDelay(100, withSpring(1, { damping: 9, stiffness: 140 }));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(() => router.back(), 1400);
    return () => clearTimeout(t);
  }, [step, pop]);

  const clean = email.trim().toLowerCase();

  async function sendCode() {
    if (!EMAIL_RE.test(clean)) return setError("That doesn't look like an email address.");
    setBusy(true);
    setError("");
    try {
      const r = await requestLoginCode(clean);
      setDemoCode(r.demoCode ?? "");
      setCode("");
      setWait(RESEND_SECONDS);
      setStep("code");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setBusy(true);
    setError("");
    try {
      const r = await verifyLoginCode(clean, value, name.trim());
      me.signIn({ email: r.account.email, name: r.account.name || name.trim(), token: r.token, expiresAt: r.expiresAt }, r.account);
      setStep("done");
    } catch (err) {
      setError((err as Error).message);
      setCode("");
      setShakeKey((k) => k + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // An expired or used-up code can't be retried: start over from the email step's resend.
      if (err instanceof ApiError && (err.status === 410 || err.status === 429)) setWait(0);
    } finally {
      setBusy(false);
    }
  }

  // Sends itself when the sixth digit goes in.
  useEffect(() => {
    if (step === "code" && code.length === 6 && !busy) void verify(code);
    // verify is recreated every render; the code is what triggers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (!catalog) return <Loading />;
  if (catalog.accounts !== true) return <Empty icon="user" title="Accounts aren't open yet" body="You can still order without one. Everything works from the cart." action="Back" onAction={() => router.back()} />;

  if (step === "done")
    return (
      <View style={s.center}>
        <Animated.View style={[s.check, popStyle]}>
          <Icon name="check" size={46} color={colors.ink} strokeWidth={3} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(250).springify()} style={{ alignItems: "center", gap: 6 }}>
          <Txt variant="display" style={{ fontSize: 34 }}>
            You&apos;re in.
          </Txt>
          <Txt variant="small">Your details and orders now follow you.</Txt>
        </Animated.View>
      </View>
    );

  return (
    <Screen padTop={false} footer={step === "email" ? <Button title="Email me a code" busy={busy} disabled={!clean} onPress={() => void sendCode()} /> : undefined}>
      {step === "email" ? (
        <Animated.View key="email" entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft.duration(160)} style={{ gap: space.xl }}>
          <Animated.View entering={FadeInDown.springify()} style={{ gap: space.sm }}>
            <Txt variant="label" style={{ color: colors.lemon }}>
              Your account
            </Txt>
            <Txt variant="display" style={{ fontSize: 38 }}>
              Hop in.
            </Txt>
            <Txt style={{ color: colors.paperDim }}>Keep your details, wishlist and orders on every phone. No password: we email you a code. Ordering works without an account too.</Txt>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(120).springify()} style={{ gap: space.lg }}>
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" maxLength={254} onSubmitEditing={() => void sendCode()} returnKeyType="send" />
            <Field label="First name" optional value={name} onChangeText={setName} autoComplete="given-name" maxLength={60} help="Only needed if you're new here." />
          </Animated.View>
          {error ? <Note tone="danger">{error}</Note> : null}
        </Animated.View>
      ) : (
        <Animated.View key="code" entering={FadeInRight.springify().damping(18)} exiting={FadeOutLeft.duration(160)} style={{ gap: space.xl }}>
          <View style={{ gap: space.sm }}>
            <Txt variant="label" style={{ color: colors.lemon }}>
              Check your inbox
            </Txt>
            <Txt variant="display" style={{ fontSize: 38 }}>
              Type the code.
            </Txt>
            <Txt style={{ color: colors.paperDim }}>
              We sent 6 digits to {clean}. It works for 10 minutes. Check spam if it isn&apos;t there.
            </Txt>
          </View>
          <CodeInput value={code} onChange={setCode} disabled={busy} shakeKey={shakeKey} />
          {demoCode ? (
            <Pressable onPress={() => setCode(demoCode)}>
              <Note>Preview shop: no email is sent. Tap to fill in {demoCode}.</Note>
            </Pressable>
          ) : null}
          <Animated.View entering={FadeIn} style={{ minHeight: 24 }}>
            {busy ? <Txt variant="small">Checking…</Txt> : error ? <Text style={s.error}>{error}</Text> : null}
          </Animated.View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Button small kind="quiet" title="Wrong email?" onPress={() => (setStep("email"), setError(""), setCode(""))} />
            <Button small kind="quiet" title={wait > 0 ? `Send again in ${wait}s` : "Send again"} disabled={wait > 0 || busy} onPress={() => void sendCode()} />
          </View>
        </Animated.View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.xl, backgroundColor: colors.ink },
  check: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.lemon, alignItems: "center", justifyContent: "center" },
  box: { flex: 1, aspectRatio: 0.78, maxWidth: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  boxActive: { borderColor: colors.lemon },
  boxFilled: { borderColor: "rgba(215,255,63,0.5)", backgroundColor: colors.raised },
  boxText: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.paper, fontVariant: ["tabular-nums"] },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 14 },
});
