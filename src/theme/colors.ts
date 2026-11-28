export type Palette = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  onAccent: string;
  danger: string;
};

export const palettes: Record<"light" | "dark", Palette> = {
  light: {
    background: "#F2F2F7",
    surface: "#FFFFFF",
    text: "#1C1C1E",
    muted: "#6C6C70",
    border: "#D1D1D6",
    accent: "#0A66D8",
    onAccent: "#FFFFFF",
    danger: "#C62828",
  },
  dark: {
    background: "#000000",
    surface: "#1C1C1E",
    text: "#F2F2F7",
    muted: "#AEAEB2",
    border: "#3A3A3C",
    accent: "#4C9AFF",
    onAccent: "#000000",
    danger: "#FF6B6B",
  },
};
