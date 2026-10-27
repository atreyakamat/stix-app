import { View } from "react-native";
import { vibeChoices } from "@/lib/personal";
import { useMe } from "@/state/me";
import { useShop } from "@/state/shop";
import { Chip, Txt } from "@/ui/kit";
import { space } from "@/ui/theme";

/** College and vibes chips, saved as they're tapped. */
export function TastePicker() {
  const { catalog } = useShop();
  const { taste, setTaste } = useMe();
  if (!catalog) return null;
  const vibes = vibeChoices(catalog);
  const toggle = (id: string) => setTaste({ vibes: taste.vibes.includes(id) ? taste.vibes.filter((v) => v !== id) : [...taste.vibes, id] });

  return (
    <View style={{ gap: space.xl }}>
      {catalog.colleges.length ? (
        <View style={{ gap: space.md }}>
          <Txt variant="label">Your college</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {catalog.colleges.map((c) => (
              <Chip key={c.id} label={c.name} on={taste.collegeId === c.id} onPress={() => setTaste({ collegeId: taste.collegeId === c.id ? null : c.id })} />
            ))}
            <Chip label="Not listed" on={taste.collegeId === null} onPress={() => setTaste({ collegeId: null })} />
          </View>
        </View>
      ) : null}
      {vibes.length ? (
        <View style={{ gap: space.md }}>
          <Txt variant="label">Your vibes (pick a few)</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {vibes.map((v) => (
              <Chip key={v.id} label={v.label} on={taste.vibes.includes(v.id)} onPress={() => toggle(v.id)} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
