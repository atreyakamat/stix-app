// Brand tokens from the shop (src/app/globals.css): black + lemon.

export const colors = {
  ink: "#070707",
  card: "#111110",
  raised: "#1a1a18",
  line: "#292929",
  lemon: "#d7ff3f",
  lemonDeep: "#b8e000",
  lemonSoft: "rgba(215,255,63,0.12)",
  paper: "#f5f5ef",
  paperDim: "rgba(245,245,239,0.72)",
  mute: "#9a9a94",
  danger: "#ff7a59",
  dangerSoft: "rgba(255,122,89,0.12)",
  warn: "#ffb59f",
} as const;

export const fonts = {
  display: "BricolageGrotesque_800ExtraBold",
  displayBold: "BricolageGrotesque_700Bold",
  body: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
