import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "./theme";

// A few line icons (Lucide shapes, ISC licence) drawn with react-native-svg,
// so the app needs no icon font.

export type IconName =
  | "home"
  | "grid"
  | "sparkle"
  | "bag"
  | "user"
  | "heart"
  | "search"
  | "plus"
  | "minus"
  | "x"
  | "chevron-right"
  | "chevron-left"
  | "camera"
  | "image"
  | "check"
  | "copy"
  | "share"
  | "instagram"
  | "chat"
  | "pin"
  | "calendar"
  | "receipt"
  | "refresh"
  | "wifi-off"
  | "trash"
  | "box"
  | "star";

export function Icon({ name, size = 22, color = colors.paper, filled = false, strokeWidth = 2 }: { name: IconName; size?: number; color?: string; filled?: boolean; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "home" && (
        <>
          <Path {...p} d="M3 10.5 12 3l9 7.5" />
          <Path {...p} d="M5 9.5V21h14V9.5" />
          <Path {...p} d="M9.5 21v-6h5v6" />
        </>
      )}
      {name === "grid" && (
        <>
          <Rect {...p} x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <Rect {...p} x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <Rect {...p} x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <Rect {...p} x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </>
      )}
      {name === "sparkle" && (
        <>
          <Path {...p} fill={filled ? color : "none"} d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
          <Path {...p} d="M19 15v4M17 17h4" />
        </>
      )}
      {name === "bag" && (
        <>
          <Path {...p} d="M5 7h14l-1 14H6z" />
          <Path {...p} d="M9 10V6a3 3 0 0 1 6 0v4" />
        </>
      )}
      {name === "user" && (
        <>
          <Circle {...p} cx="12" cy="8" r="4" />
          <Path {...p} d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </>
      )}
      {name === "star" && <Path {...p} fill={filled ? color : "none"} d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L2.9 9.4l6.3-.9z" />}
      {name === "heart" && (
        <Path {...p} fill={filled ? color : "none"} d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5c-2.2 4.6-9.2 9-9.2 9z" />
      )}
      {name === "search" && (
        <>
          <Circle {...p} cx="11" cy="11" r="7" />
          <Path {...p} d="m20 20-3.5-3.5" />
        </>
      )}
      {name === "plus" && <Path {...p} d="M12 5v14M5 12h14" />}
      {name === "minus" && <Path {...p} d="M5 12h14" />}
      {name === "x" && <Path {...p} d="M6 6l12 12M18 6 6 18" />}
      {name === "chevron-right" && <Path {...p} d="m9 6 6 6-6 6" />}
      {name === "chevron-left" && <Path {...p} d="m15 6-6 6 6 6" />}
      {name === "camera" && (
        <>
          <Path {...p} d="M4 8h3l2-3h6l2 3h3v12H4z" />
          <Circle {...p} cx="12" cy="13.5" r="3.5" />
        </>
      )}
      {name === "image" && (
        <>
          <Rect {...p} x="3" y="4" width="18" height="16" rx="2" />
          <Circle {...p} cx="9" cy="10" r="1.8" />
          <Path {...p} d="m21 16-5-5-9 9" />
        </>
      )}
      {name === "check" && <Path {...p} d="m5 12.5 4.5 4.5L19 7" />}
      {name === "copy" && (
        <>
          <Rect {...p} x="8" y="8" width="13" height="13" rx="2" />
          <Path {...p} d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </>
      )}
      {name === "share" && (
        <>
          <Path {...p} d="M12 3v12" />
          <Path {...p} d="m7 8 5-5 5 5" />
          <Path {...p} d="M5 13v7h14v-7" />
        </>
      )}
      {name === "instagram" && (
        <>
          <Rect {...p} x="3" y="3" width="18" height="18" rx="5" />
          <Circle {...p} cx="12" cy="12" r="4" />
          <Circle cx="17.3" cy="6.7" r="1.1" fill={color} />
        </>
      )}
      {name === "chat" && <Path {...p} d="M4 20l1.5-4A8 8 0 1 1 9 19.3z" />}
      {name === "pin" && (
        <>
          <Path {...p} d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
          <Circle {...p} cx="12" cy="9.5" r="2.5" />
        </>
      )}
      {name === "calendar" && (
        <>
          <Rect {...p} x="3" y="5" width="18" height="16" rx="2" />
          <Path {...p} d="M3 10h18M8 3v4M16 3v4" />
        </>
      )}
      {name === "receipt" && (
        <>
          <Path {...p} d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
          <Path {...p} d="M9 8h6M9 12h6" />
        </>
      )}
      {name === "refresh" && (
        <>
          <Path {...p} d="M20 11a8 8 0 0 0-14.6-4.5L3 9" />
          <Path {...p} d="M3 4v5h5" />
          <Path {...p} d="M4 13a8 8 0 0 0 14.6 4.5L21 15" />
          <Path {...p} d="M21 20v-5h-5" />
        </>
      )}
      {name === "wifi-off" && (
        <>
          <Path {...p} d="M3 3l18 18" />
          <Path {...p} d="M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.3M19 12.5a10 10 0 0 0-2.5-1.7M2 8.8a15 15 0 0 1 4.3-2.6M22 8.8A15 15 0 0 0 11 5" />
          <Circle cx="12" cy="20" r="1" fill={color} />
        </>
      )}
      {name === "trash" && (
        <>
          <Path {...p} d="M4 7h16M10 11v6M14 11v6" />
          <Path {...p} d="M6 7l1 14h10l1-14M9 7V4h6v3" />
        </>
      )}
      {name === "box" && (
        <>
          <Path {...p} d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
          <Path {...p} d="M3 7.5 12 12l9-4.5M12 12v9" />
        </>
      )}
    </Svg>
  );
}
