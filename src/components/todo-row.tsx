import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import type { Todo } from "@/types/todo";

import { Checkbox } from "./checkbox";

type Props = {
  todo: Todo;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
};

export function TodoRow({ todo, onToggle, onRemove, onOpen }: Props) {
  const colors = useColors();
  return (
    <View
      testID={`todo-item-${todo.id}`}
      style={[styles.row, { backgroundColor: colors.surface }]}
    >
      <Checkbox
        testID={`todo-toggle-${todo.id}`}
        checked={todo.done}
        label={todo.title}
        onPress={() => onToggle(todo.id)}
      />
      <Pressable
        testID={`todo-open-${todo.id}`}
        accessibilityRole="button"
        accessibilityHint="Opens the item"
        onPress={() => onOpen(todo.id)}
        style={styles.titleArea}
      >
        <Text
          numberOfLines={2}
          style={[
            styles.title,
            { color: todo.done ? colors.muted : colors.text },
            todo.done && styles.done,
          ]}
        >
          {todo.title}
        </Text>
      </Pressable>
      <Pressable
        testID={`todo-delete-${todo.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${todo.title}`}
        hitSlop={8}
        onPress={() => onRemove(todo.id)}
      >
        <Text style={[styles.delete, { color: colors.danger }]}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  titleArea: { flex: 1, paddingVertical: 4 },
  title: { fontSize: 17 },
  done: { textDecorationLine: "line-through" },
  delete: { fontSize: 15, fontWeight: "600" },
});
