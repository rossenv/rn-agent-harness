import { Stack } from "expo-router";

import { useColors } from "@/hooks/use-colors";
import { TodosProvider } from "@/store/todos-context";

export default function RootLayout() {
  const colors = useColors();
  return (
    <TodosProvider>
      <Stack
        // Headers follow the device's light or dark setting, like the screens.
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.accent,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Todos" }} />
        <Stack.Screen name="todo/[id]" options={{ title: "Todo" }} />
      </Stack>
    </TodosProvider>
  );
}
