import Storage from "expo-sqlite/kv-store";

import type { Todo } from "@/types/todo";

// The whole list is saved as one JSON value under this key.
export const TODOS_KEY = "todos";

function isTodo(value: unknown): value is Todo {
  if (typeof value !== "object" || value === null) return false;
  const todo = value as Record<string, unknown>;
  return (
    typeof todo.id === "string" &&
    typeof todo.title === "string" &&
    typeof todo.done === "boolean"
  );
}

// The saved items, or an empty list when nothing usable is saved.
export async function loadTodos(): Promise<Todo[]> {
  const raw = await Storage.getItem(TODOS_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTodo) : [];
  } catch {
    return [];
  }
}

export async function saveTodos(items: Todo[]): Promise<void> {
  await Storage.setItem(TODOS_KEY, JSON.stringify(items));
}
