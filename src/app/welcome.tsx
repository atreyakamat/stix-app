import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { TastePicker } from "@/components/taste-picker";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Button, Loading, Screen, Txt } from "@/ui/kit";
import { colors, fonts, space } from "@/ui/theme";

export default function Welcome() {
  const { catalog } = useShop();
  const { finishOnboarding } = useMe();
  const done = () => {
    finishOnboarding();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };
  if (!catalog) return <Loading />;
  return (
    <Screen footer={<Button title="Show me my shop" icon="sparkle" onPress={done} />}>
      <Animated.View entering={FadeInDown.duration(500)} style={{ gap: space.md, paddingTop: space.xl }}>
        <Txt variant="label" style={{ color: colors.lemon }}>
          Stix N Vibes
        </Txt>
        <Txt variant="display" style={{ fontSize: 46, lineHeight: 44 }}>
          Your stickers.{"\n"}Your <Text style={{ color: colors.lemon }}>vibe.</Text>
        </Txt>
        <Txt style={{ color: colors.paperDim }}>Tell us what you&apos;re into and where you study. We&apos;ll lead with designs that fit, and your college&apos;s stalls and codes.</Txt>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(150).duration(500)}>
        <TastePicker />
      </Animated.View>
      <Pressable onPress={done} style={{ alignSelf: "center" }} hitSlop={10}>
        <Text style={{ color: colors.mute, fontFamily: fonts.body, textDecorationLine: "underline" }}>Skip for now</Text>
      </Pressable>
    </Screen>
  );
}
