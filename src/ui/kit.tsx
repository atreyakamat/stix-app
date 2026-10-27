import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "./icon";
import { colors, fonts, radius, space } from "./theme";

// The app's building blocks. Screens compose these instead of styling raw
// views, so the look stays the same everywhere.

type TxtVariant = "body" | "small" | "label" | "title" | "display" | "price" | "strong";

const txt = StyleSheet.create({
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.paper },
  small: { fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: colors.mute },
  label: { fontFamily: fonts.semibold, fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", color: colors.mute },
  title: { fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 26, color: colors.paper, letterSpacing: -0.3 },
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 38, color: colors.paper, letterSpacing: -1.2 },
  price: { fontFamily: fonts.semibold, fontSize: 17, color: colors.lemon, fontVariant: ["tabular-nums"] },
  strong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.paper },
});

export function Txt({ variant = "body", style, ...rest }: TextProps & { variant?: TxtVariant }) {
  return <Text {...rest} style={[txt[variant], style]} />;
}

export const tap = () => void Haptics.selectionAsync().catch(() => {});

type ButtonProps = Omit<PressableProps, "style" | "children"> & {
  title: string;
  kind?: "primary" | "ghost" | "quiet" | "danger";
  icon?: IconName;
  busy?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, kind = "primary", icon, busy, small, disabled, style, onPress, ...rest }: ButtonProps) {
  const fg = kind === "primary" ? colors.ink : kind === "danger" ? colors.danger : colors.paper;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      disabled={disabled || busy}
      onPress={(e) => {
        tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        btn.base,
        small && btn.small,
        kind === "primary" && btn.primary,
        kind === "ghost" && btn.ghost,
        kind === "danger" && btn.ghost,
        kind === "quiet" && btn.quiet,
        (disabled || busy) && { opacity: 0.45 },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
        style,
      ]}
      {...rest}
    >
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 16 : 19} color={fg} /> : null}
      <Text style={[btn.text, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

const btn = StyleSheet.create({
  base: { minHeight: 50, borderRadius: radius.pill, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  small: { minHeight: 38, paddingHorizontal: 14 },
  primary: { backgroundColor: colors.lemon },
  ghost: { borderWidth: 1, borderColor: "rgba(245,245,239,0.25)" },
  quiet: { backgroundColor: colors.raised },
  text: { fontFamily: fonts.semibold, fontSize: 16 },
});

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[chip.base, on && chip.on]}
    >
      <Text style={[chip.text, on && { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const chip = StyleSheet.create({
  base: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(245,245,239,0.22)" },
  on: { backgroundColor: colors.lemon, borderColor: colors.lemon },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.paper },
});

export function Pill({ children, tone = "lemon" }: { children: ReactNode; tone?: "lemon" | "danger" | "mute" }) {
  const bg = tone === "lemon" ? colors.lemonSoft : tone === "danger" ? colors.dangerSoft : colors.raised;
  const fg = tone === "lemon" ? colors.lemon : tone === "danger" ? colors.warn : colors.paperDim;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5, alignSelf: "flex-start" }}>
      <Text style={{ color: fg, fontFamily: fonts.medium, fontSize: 13 }}>{children}</Text>
    </View>
  );
}

/** A notice line: offer hints, problems, status. */
export function Note({ children, tone = "lemon" }: { children: ReactNode; tone?: "lemon" | "danger" | "mute" }) {
  const bg = tone === "lemon" ? colors.lemonSoft : tone === "danger" ? colors.dangerSoft : colors.raised;
  const fg = tone === "lemon" ? colors.lemon : tone === "danger" ? colors.warn : colors.paperDim;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 11 }} accessibilityRole={tone === "danger" ? "alert" : undefined}>
      <Text style={{ color: fg, fontFamily: fonts.body, fontSize: 14.5, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.md }, style]}>{children}</View>;
}

type FieldProps = TextInputProps & { label: string; error?: string; optional?: boolean; help?: string };

export function Field({ label, error, optional, help, style, multiline, ...rest }: FieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.paper }}>
        {label}
        {optional ? <Text style={{ color: colors.mute }}> (optional)</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor="#6b6b66"
        selectionColor={colors.lemon}
        multiline={multiline}
        accessibilityLabel={label}
        style={[
          field.input,
          multiline && { minHeight: 92, textAlignVertical: "top", paddingTop: 12 },
          !!error && { borderColor: colors.danger },
          style as StyleProp<TextStyle>,
        ]}
        {...rest}
      />
      {error ? <Text style={field.error}>{error}</Text> : help ? <Text style={field.help}>{help}</Text> : null}
    </View>
  );
}

const field = StyleSheet.create({
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    color: colors.paper,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  error: { color: colors.danger, fontFamily: fonts.body, fontSize: 13 },
  help: { color: colors.mute, fontFamily: fonts.body, fontSize: 12.5 },
});

/** A scrolling screen with the app's padding and pull to refresh. */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  footer,
  padTop = true,
  contentStyle,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Pinned under the scroll area, e.g. an Add to cart bar. */
  footer?: ReactNode;
  padTop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[{ paddingHorizontal: space.lg, paddingTop: padTop ? insets.top + space.md : space.md, paddingBottom: space.xxl * 2, gap: space.xl }, contentStyle]}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.lemon} colors={[colors.ink]} progressBackgroundColor={colors.lemon} /> : undefined}
      >
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: insets.bottom + space.md, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.ink, gap: space.sm }}>{footer}</View> : null}
    </View>
  );
}

export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
      <Txt variant="title">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="link">
          <Text style={{ color: colors.lemon, fontFamily: fonts.medium, fontSize: 14 }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Loading({ label = "Loading the shop…" }: { label?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", gap: space.md }}>
      <ActivityIndicator color={colors.lemon} size="large" />
      <Txt variant="small">{label}</Txt>
    </View>
  );
}

export function Empty({ icon = "box", title, body, action, onAction }: { icon?: IconName; title: string; body?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: space.xxl, gap: space.md }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.raised, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={28} color={colors.lemon} />
      </View>
      <Txt variant="title" style={{ textAlign: "center" }}>
        {title}
      </Txt>
      {body ? (
        <Txt style={{ textAlign: "center", color: colors.paperDim, maxWidth: 300 }}>{body}</Txt>
      ) : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: space.sm }} /> : null}
    </View>
  );
}

/** A tappable list row with a chevron. */
export function Row({ icon, title, sub, onPress, right }: { icon?: IconName; title: string; sub?: string; onPress?: () => void; right?: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 14 }, pressed && { opacity: 0.6 }]}
    >
      {icon ? <Icon name={icon} size={21} color={colors.lemon} /> : null}
      <View style={{ flex: 1 }}>
        <Txt variant="strong">{title}</Txt>
        {sub ? <Txt variant="small">{sub}</Txt> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-right" size={18} color={colors.mute} /> : null)}
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.line }} />;
}

export function QtyStepper({ value, onChange, min = 1, label }: { value: number; onChange: (n: number) => void; min?: number; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line }}>
      <Pressable accessibilityLabel={`One less ${label}`} hitSlop={6} onPress={() => (tap(), onChange(value - 1))} disabled={value <= min - 1} style={{ padding: 11 }}>
        <Icon name={value <= 1 && min === 0 ? "trash" : "minus"} size={17} />
      </Pressable>
      <Text accessibilityLabel={`${value} ${label}`} style={{ minWidth: 26, textAlign: "center", color: colors.paper, fontFamily: fonts.semibold, fontSize: 16, fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
      <Pressable accessibilityLabel={`One more ${label}`} hitSlop={6} onPress={() => (tap(), onChange(value + 1))} style={{ padding: 11 }}>
        <Icon name="plus" size={17} />
      </Pressable>
    </View>
  );
}
