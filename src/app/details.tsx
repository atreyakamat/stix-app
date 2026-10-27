import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useMe, type Details } from "@/state/me";
import { Button, Chip, Field, Screen, Txt } from "@/ui/kit";
import { colors, space } from "@/ui/theme";

export default function DetailsScreen() {
  const { details, saveDetails } = useMe();
  const [d, setD] = useState<Details>(details);
  const set = (p: Partial<Details>) => setD((x) => ({ ...x, ...p }));
  const setAddr = (p: Partial<Details["address"]>) => setD((x) => ({ ...x, address: { ...x.address, ...p } }));
  return (
    <Screen padTop={false} footer={<Button title="Save" onPress={() => (saveDetails(d), router.back())} />}>
      <Txt style={{ color: colors.paperDim }}>Filled in for you at checkout. Kept on this phone only.</Txt>
      <View style={{ gap: space.lg }}>
        <Field label="Your name" value={d.name} onChangeText={(v) => set({ name: v })} maxLength={80} />
        <Field label="Mobile number" value={d.phone} onChangeText={(v) => set({ phone: v })} keyboardType="phone-pad" maxLength={20} />
        <Field label="Instagram username" optional value={d.instagram} onChangeText={(v) => set({ instagram: v })} autoCapitalize="none" autoCorrect={false} />
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Chip label="Deliver to me" on={d.fulfilment === "delivery"} onPress={() => set({ fulfilment: "delivery" })} />
          <Chip label="Stall pickup" on={d.fulfilment === "pickup"} onPress={() => set({ fulfilment: "pickup" })} />
        </View>
        <Field label="Address" optional value={d.address.line} onChangeText={(v) => setAddr({ line: v })} multiline maxLength={200} />
        <View style={{ flexDirection: "row", gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field label="City" value={d.address.city} onChangeText={(v) => setAddr({ city: v })} maxLength={60} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Pincode" value={d.address.pincode} onChangeText={(v) => setAddr({ pincode: v.replace(/\D/g, "") })} keyboardType="number-pad" maxLength={6} />
          </View>
        </View>
        <Field label="State" value={d.address.state} onChangeText={(v) => setAddr({ state: v })} maxLength={40} />
      </View>
    </Screen>
  );
}
