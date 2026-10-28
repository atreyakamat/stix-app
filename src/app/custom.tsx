import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { sendCustomRequest, uploadPhoto } from "@/lib/api";
import { copyAndDm } from "@/lib/dm";
import { normalizePhone } from "@/lib/phone";
import { pickPhoto } from "@/lib/photos";
import { CUSTOM_KINDS, PRODUCT_TYPES, type CustomKind } from "@/lib/types";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Icon } from "@/ui/icon";
import { Button, Chip, Field, Note, Screen, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

const MAX_FILES = 6;
const kindLabel = (k: string) => PRODUCT_TYPES.find((t) => t.id === k)?.one ?? (k === "other" ? "Something else" : k);

type FileState = { key: string; preview: string; id?: string; error?: string };

export default function Custom() {
  const me = useMe();
  const { catalog } = useShop();
  // Arriving from an AI idea: its picture is already kept on the shop.
  const idea = useLocalSearchParams<{ ideaId?: string; ideaPreview?: string; ideaKind?: string; ideaNote?: string }>();
  const fromIdea = Boolean(idea.ideaId && idea.ideaPreview);
  const handle = catalog?.settings.instagramHandle ?? "stixnvibes";
  const [files, setFiles] = useState<FileState[]>(() => (fromIdea ? [{ key: "idea", preview: idea.ideaPreview!, id: idea.ideaId }] : []));
  const [f, setF] = useState({
    name: me.details.name,
    phone: me.details.phone,
    instagram: me.details.instagram,
    kind: (idea.ideaKind === "poster" ? "poster" : "sticker") as CustomKind,
    size: "",
    qty: fromIdea ? "10" : "50",
    note: idea.ideaNote?.slice(0, 1500) ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  async function addFile(from: "camera" | "library") {
    setError("");
    let photo;
    try {
      photo = await pickPhoto(from);
    } catch (err) {
      return setError((err as Error).message);
    }
    if (!photo) return;
    const key = `${Date.now()}-${Math.random()}`;
    setFiles((x) => [...x, { key, preview: photo.uri }]);
    try {
      const id = await uploadPhoto(photo);
      setFiles((x) => x.map((y) => (y.key === key ? { ...y, id } : y)));
    } catch (err) {
      setFiles((x) => x.map((y) => (y.key === key ? { ...y, error: (err as Error).message } : y)));
    }
  }

  async function submit() {
    setError("");
    if (f.name.trim().length < 2) return setError("Add your name.");
    if (!normalizePhone(f.phone)) return setError("Add a 10-digit mobile number.");
    const ids = files.filter((x) => x.id).map((x) => x.id!);
    if (files.some((x) => !x.id && !x.error)) return setError("Wait for your designs to finish uploading.");
    if (!ids.length) return setError("Add at least one design.");
    const qty = Number(f.qty);
    if (!Number.isInteger(qty) || qty < 1) return setError("Quantity is at least 1.");
    setBusy(true);
    try {
      const r = await sendCustomRequest({ customerName: f.name, customerPhone: f.phone, instagram: f.instagram, kind: f.kind, size: f.size, qty, note: f.note, files: ids, source: me.sourceTag });
      setDone(r.number);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Screen padTop={false}>
        <Txt variant="label">Request sent</Txt>
        <Text style={{ fontFamily: fonts.display, fontSize: 44, color: colors.lemon }} selectable>
          {done}
        </Text>
        <Txt style={{ color: colors.paperDim }}>We&apos;ve got your designs. We&apos;ll reply with a price, usually within a day. To hear back faster, DM us the ref on Instagram.</Txt>
        <Button title="Copy ref & open Instagram" icon="instagram" onPress={() => void copyAndDm(handle, `Hi Stix N Vibes! I just sent custom request ${done} (${f.qty} × ${kindLabel(f.kind)}).`)} />
      </Screen>
    );

  return (
    <Screen padTop={false} footer={<>{error ? <Note tone="danger">{error}</Note> : null}<Button title="Send for a quote" busy={busy} onPress={() => void submit()} /></>}>
      <Txt style={{ color: colors.paperDim }}>Your art, your photos, your logo. Send them over and we quote on Instagram. PNG with a clear background prints best.</Txt>

      <View style={{ gap: space.md }}>
        <Txt variant="label">Your designs ({files.length}/{MAX_FILES})</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {files.map((x) => (
            <View key={x.key} style={s.file}>
              <Image source={x.preview} style={StyleSheet.absoluteFill} contentFit="cover" />
              {!x.id && !x.error ? <View style={s.overlay}><Text style={s.overlayText}>Uploading…</Text></View> : null}
              {x.error ? <View style={[s.overlay, { backgroundColor: "rgba(255,122,89,0.8)" }]}><Text style={s.overlayText}>Failed</Text></View> : null}
              <Pressable onPress={() => setFiles((all) => all.filter((y) => y.key !== x.key))} style={s.remove} hitSlop={6} accessibilityLabel="Remove design">
                <Icon name="x" size={14} />
              </Pressable>
            </View>
          ))}
        </View>
        {files.length < MAX_FILES ? (
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button small kind="quiet" icon="image" title="From gallery" onPress={() => void addFile("library")} />
            <Button small kind="quiet" icon="camera" title="Take a photo" onPress={() => void addFile("camera")} />
          </View>
        ) : null}
      </View>

      <View style={{ gap: space.md }}>
        <Txt variant="label">What should we make?</Txt>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {CUSTOM_KINDS.map((k) => (
            <Chip key={k} label={kindLabel(k)} on={f.kind === k} onPress={() => set({ kind: k })} />
          ))}
        </View>
      </View>

      <View style={{ gap: space.lg }}>
        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field label="How many" value={f.qty} onChangeText={(v) => set({ qty: v.replace(/\D/g, "").slice(0, 5) })} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 2 }}>
            <Field label="Size and cut" optional value={f.size} onChangeText={(v) => set({ size: v })} maxLength={80} placeholder="5 cm, die cut" />
          </View>
        </View>
        <Field label="Anything else" optional value={f.note} onChangeText={(v) => set({ note: v })} multiline maxLength={1500} placeholder="Finish, colours, deadline, event…" />
        <Field label="Your name" value={f.name} onChangeText={(v) => set({ name: v })} maxLength={80} />
        <Field label="Mobile number" value={f.phone} onChangeText={(v) => set({ phone: v })} keyboardType="phone-pad" maxLength={16} placeholder="98765 43210" />
        <Field label="Instagram username" optional value={f.instagram} onChangeText={(v) => set({ instagram: v })} autoCapitalize="none" autoCorrect={false} placeholder="@yourname" />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  file: { width: 92, height: 92, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.card },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(7,7,7,0.6)", alignItems: "center", justifyContent: "center" },
  overlayText: { color: colors.paper, fontFamily: fonts.medium, fontSize: 12 },
  remove: { position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(7,7,7,0.75)", alignItems: "center", justifyContent: "center" },
});
