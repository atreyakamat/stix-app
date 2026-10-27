// The core encoder only: qrcode's main entry pulls in Node and canvas code.
import { create } from "qrcode/lib/core/qrcode";
import { useMemo } from "react";
import Svg, { Path, Rect } from "react-native-svg";

/** A QR code drawn from qrcode's module grid (no canvas needed). */
export function Qr({ value, size = 220 }: { value: string; size?: number }) {
  const { n, d } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: "M" });
    let path = "";
    for (let y = 0; y < modules.size; y++)
      for (let x = 0; x < modules.size; x++) if (modules.get(y, x)) path += `M${x} ${y}h1v1h-1z`;
    return { n: modules.size, d: path };
  }, [value]);
  const margin = 3;
  return (
    <Svg width={size} height={size} viewBox={`${-margin} ${-margin} ${n + margin * 2} ${n + margin * 2}`} accessibilityLabel="UPI QR code">
      <Rect x={-margin} y={-margin} width={n + margin * 2} height={n + margin * 2} fill="#ffffff" />
      <Path d={d} fill="#000000" />
    </Svg>
  );
}
