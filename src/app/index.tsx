import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AddTodoForm } from "@/components/add-todo-form";
import { TodoRow } from "@/components/todo-row";
import { useColors } from "@/hooks/use-colors";
import { useTodos } from "@/store/todos-context";

export default function TodosScreen() {
  const colors = useColors();
  const { items, loaded, add, toggle, remove } = useTodos();

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator testID="todos-loading" />
      </View>
    );
  }

  return (
    <FlatList
      testID="todos-screen"
      data={items}
      keyExtractor={(todo) => todo.id}
      renderItem={({ item }) => (
        <TodoRow
          todo={item}
          onToggle={toggle}
          onRemove={remove}
          onOpen={(id) =>
            router.push({ pathname: "/todo/[id]", params: { id } })
          }
        />
      )}
      ListHeaderComponent={<AddTodoForm onAdd={add} />}
      ListEmptyComponent={
        <Text
          testID="todos-empty"
          style={[styles.empty, { color: colors.muted }]}
        >
          Nothing to do yet. Add an item above.
        </Text>
      }
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      style={{ backgroundColor: colors.background }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 8 },
  empty: { fontSize: 15, textAlign: "center", marginTop: 24 },
});
