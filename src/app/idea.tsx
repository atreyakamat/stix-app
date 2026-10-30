import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { ApiError, drawIdea, keepIdea, shareLink, type Idea, type IdeaKind } from "@/lib/api";
import { copyAndDm } from "@/lib/dm";
import { useShop } from "@/state/shop";
import { Button, Chip, Field, Note, Screen, Txt } from "@/ui/kit";
import { colors, fonts, radius, space } from "@/ui/theme";

// AI sticker ideas. The shop checks the idea and hands back a Pollinations
// link; the picture loads straight from Pollinations (free, no account). If
// the customer likes it, the shop keeps a copy and it goes into a custom
// request, where we quote and redraw it for print.

const EXAMPLES = ["a cat drinking cutting chai", "Goa sunset on a scooter", "a samosa wearing sunglasses", "a sleepy panda studying for exams"];
const MAX = 200;

type Shot = Idea & { state: "loading" | "ready" | "failed" };

export default function IdeaScreen() {
  const { catalog } = useShop();
  const handle = catalog?.settings.instagramHandle ?? "stixnvibes";
  const [text, setText] = useState("");
  const [kind, setKind] = useState<IdeaKind>("sticker");
  const [shots, setShots] = useState<Shot[]>([]);
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [keeping, setKeeping] = useState(false);
  const [error, setError] = useState("");
  const shot = shots[current];
  const mark = (url: string, state: Shot["state"]) => setShots((all) => all.map((x) => (x.url === url ? { ...x, state } : x)));

  async function draw(again = false) {
    setError("");
    const idea = again && shot ? shot.idea : text;
    if (idea.trim().length < 3) return setError("Describe your idea in a few words.");
    setBusy(true);
    try {
      const r = await drawIdea(idea, again && shot ? shot.kind : kind);
      setShots((all) => [{ ...r, state: "loading" as const }, ...all].slice(0, 8));
      setCurrent(0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function makeIt() {
    if (!shot) return;
    setError("");
    setKeeping(true);
    try {
      const id = await keepIdea(shot);
      router.push({ pathname: "/custom", params: { ideaId: id, ideaPreview: shot.url, ideaKind: shot.kind, ideaNote: `AI idea: ${shot.idea}` } });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 0 ? err.message : "Couldn't save the picture. Try again, or DM us the idea.");
    } finally {
      setKeeping(false);
    }
  }

  const failed = shot?.state === "failed";

  return (
    <Screen padTop={false}>
      <Txt style={{ color: colors.paperDim }}>Describe a sticker or poster you wish existed. We draw a quick AI version, then our team makes it print-ready.</Txt>

      <View style={{ gap: space.md }}>
        <Field label="Your idea" value={text} onChangeText={(v) => setText(v.slice(0, MAX))} multiline maxLength={MAX} placeholder="a cat drinking cutting chai" help={`${text.length}/${MAX}`} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {EXAMPLES.map((e) => (
            <Chip key={e} label={e} onPress={() => setText(e)} />
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Chip label="Sticker" on={kind === "sticker"} onPress={() => setKind("sticker")} />
          <Chip label="Poster" on={kind === "poster"} onPress={() => setKind("poster")} />
        </View>
        <Button title={shots.length ? "Draw this idea" : "Draw it"} icon="sparkle" busy={busy} onPress={() => void draw()} />
      </View>

      {error ? <Note tone="danger">{error}</Note> : null}

      {shot ? (
        <View style={{ gap: space.md }}>
          <View style={[s.frame, { aspectRatio: shot.kind === "poster" ? 768 / 1088 : 1 }]}>
            {!failed ? (
              <Image
                key={shot.url}
                source={shot.url}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                transition={250}
                onLoad={() => mark(shot.url, "ready")}
                onError={() => mark(shot.url, "failed")}
                accessibilityLabel={`AI drawing of ${shot.idea}`}
              />
            ) : null}
            {shot.state === "loading" ? (
              <View style={s.overlay}>
                <Text style={s.overlayTitle}>Drawing…</Text>
                <Text style={s.overlayBody}>Usually 10 to 30 seconds.</Text>
              </View>
            ) : null}
            {failed ? (
              <View style={s.overlay}>
                <Text style={s.overlayTitle}>The drawing service is busy</Text>
                <Text style={s.overlayBody}>Try again in a minute, or send us the idea and we&apos;ll sketch it.</Text>
              </View>
            ) : null}
          </View>

          {failed ? (
            <View style={{ gap: space.sm }}>
              <Button title="Try again" icon="refresh" busy={busy} onPress={() => void draw(true)} />
              <Button kind="ghost" title="DM us the idea" icon="instagram" onPress={() => void copyAndDm(handle, `Hi Stix N Vibes! Sticker idea: ${shot.idea}`)} />
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <Button title="Get this made" busy={keeping} disabled={shot.state !== "ready"} onPress={() => void makeIt()} />
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <Button kind="ghost" title="Another version" icon="refresh" busy={busy} disabled={shot.state === "loading"} style={{ flex: 1 }} onPress={() => void draw(true)} />
                <Button kind="ghost" title="Share" icon="share" disabled={shot.state !== "ready"} style={{ flex: 1 }} onPress={() => void Share.share({ message: `I dreamed up a sticker: "${shot.idea}" ${shot.url}\nMake yours with Stix N Vibes ${shareLink("/")}` })} />
              </View>
            </View>
          )}

          {shots.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {shots.map((x, i) => (
                <Pressable key={x.url} onPress={() => setCurrent(i)} style={[s.thumb, i === current && { borderColor: colors.lemon }]} accessibilityRole="button" accessibilityLabel={`Version ${shots.length - i}`}>
                  {x.state !== "failed" ? <Image source={x.url} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      <Txt variant="small">AI drafts are a starting point. We check every idea and redraw it for print. No brands, logos or famous characters.</Txt>
    </Screen>
  );
}

const s = StyleSheet.create({
  frame: { width: "100%", borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: space.lg, gap: 6 },
  overlayTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.paper, textAlign: "center" },
  overlayBody: { fontFamily: fonts.body, fontSize: 14, color: colors.paperDim, textAlign: "center" },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line },
});
