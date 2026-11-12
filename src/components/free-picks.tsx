import { View } from "react-native";
import type { AppProduct } from "@/lib/api";
import { Button, Chip, Txt } from "@/ui/kit";
import { colors, space } from "@/ui/theme";

/** Pick up to `count` free stickers by tapping (a sticker can be picked more than once). */
export function FreePicks({ count, stickers, picks, onChange }: { count: number; stickers: AppProduct[]; picks: string[]; onChange: (ids: string[]) => void }) {
  const left = count - picks.length;
  const times = (id: string) => picks.filter((p) => p === id).length;
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="label">Pick your {count} free stickers</Txt>
      <Txt variant="small" style={{ color: colors.paperDim }}>
        {left > 0 ? `${picks.length} of ${count} picked. Skip the rest and we choose for you.` : "All picked. Tap Clear to change them."}
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {stickers.map((p) => (
          <Chip
            key={p.id}
            label={times(p.id) > 0 ? `${p.name} ×${times(p.id)}` : p.name}
            on={times(p.id) > 0}
            onPress={() => {
              if (left > 0) onChange([...picks, p.id]);
            }}
          />
        ))}
      </View>
      {picks.length > 0 ? <Button title="Clear picks" kind="quiet" onPress={() => onChange([])} /> : null}
    </View>
  );
}
