import { Pressable, StyleSheet, Text } from "react-native";

import { useColors } from "@/hooks/use-colors";

type Props = {
  checked: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
};

export function Checkbox({ checked, label, onPress, testID }: Props) {
  const colors = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      hitSlop={8}
      onPress={onPress}
      style={[
        styles.box,
        { borderColor: checked ? colors.accent : colors.muted },
        checked && { backgroundColor: colors.accent },
      ]}
    >
      {checked ? (
        <Text style={[styles.mark, { color: colors.onAccent }]}>✓</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: { fontSize: 15, fontWeight: "700", lineHeight: 18 },
});
