import { router } from "expo-router";
import { TastePicker } from "@/components/taste-picker";
import { Button, Screen, Txt } from "@/ui/kit";
import { colors } from "@/ui/theme";

export default function Taste() {
  return (
    <Screen padTop={false} footer={<Button title="Done" onPress={() => router.back()} />}>
      <Txt style={{ color: colors.paperDim }}>Home shows picks for these first. It all stays on this phone.</Txt>
      <TastePicker />
    </Screen>
  );
}
