import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

type Props = {
  onAdd: (title: string) => void;
};

export function AddTodoForm({ onAdd }: Props) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const blank = title.trim() === "";

  // The submit event carries the field's text; state can still lack the last keystroke.
  const submit = (text: string) => {
    if (text.trim() === "") return;
    onAdd(text.trim());
    setTitle("");
  };

  return (
    <View style={styles.form}>
      <TextInput
        testID="todo-input"
        accessibilityLabel="New item"
        placeholder="What needs doing?"
        placeholderTextColor={colors.muted}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={(event) => submit(event.nativeEvent.text)}
        submitBehavior="submit"
        returnKeyType="done"
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      />
      <Pressable
        testID="todo-add"
        accessibilityRole="button"
        disabled={blank}
        onPress={() => submit(title)}
        style={[
          styles.button,
          { backgroundColor: colors.accent },
          blank && styles.disabled,
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.onAccent }]}>Add</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    fontSize: 17,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  button: {
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  disabled: { opacity: 0.4 },
  buttonText: { fontSize: 17, fontWeight: "600" },
});
