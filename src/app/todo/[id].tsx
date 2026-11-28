import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Checkbox } from "@/components/checkbox";
import { useColors } from "@/hooks/use-colors";
import { useTodos } from "@/store/todos-context";

export default function TodoScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, loaded, toggle, remove } = useTodos();
  const todo = items.find((item) => item.id === id);

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator testID="todo-detail-loading" />
      </View>
    );
  }

  if (!todo) {
    return (
      <View
        testID="todo-detail-screen"
        style={[styles.center, { backgroundColor: colors.background }]}
      >
        <Text
          testID="todo-not-found"
          style={[styles.message, { color: colors.muted }]}
        >
          This item doesn’t exist. It may have been deleted.
        </Text>
      </View>
    );
  }

  const deleteAndLeave = () => {
    remove(todo.id);
    // Opened from a link, there's no list screen underneath to go back to.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View
      testID="todo-detail-screen"
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <Text
        testID="todo-detail-title"
        style={[styles.title, { color: colors.text }]}
      >
        {todo.title}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Checkbox
          testID="todo-detail-toggle"
          checked={todo.done}
          label="Done"
          onPress={() => toggle(todo.id)}
        />
        <Text style={[styles.status, { color: colors.text }]}>
          {todo.done ? "Done" : "Not done"}
        </Text>
      </View>
      <Pressable
        testID="todo-detail-delete"
        accessibilityRole="button"
        onPress={deleteAndLeave}
        style={[styles.delete, { borderColor: colors.danger }]}
      >
        <Text style={[styles.deleteText, { color: colors.danger }]}>
          Delete item
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 16 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  message: { fontSize: 17, textAlign: "center" },
  title: { fontSize: 28, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 10,
  },
  status: { fontSize: 17 },
  delete: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteText: { fontSize: 17, fontWeight: "600" },
});
