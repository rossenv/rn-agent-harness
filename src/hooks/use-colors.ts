import { useColorScheme } from "react-native";

import { palettes, type Palette } from "@/theme/colors";

// The palette for the device's light or dark setting.
export function useColors(): Palette {
  return useColorScheme() === "dark" ? palettes.dark : palettes.light;
}
