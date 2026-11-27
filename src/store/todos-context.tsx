import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import type { Todo } from "@/types/todo";
import { createId } from "@/utils/id";

import { initialTodosState, todosReducer } from "./todos";
import { loadTodos, saveTodos } from "./todos-storage";

export type TodosStore = {
  items: Todo[];
  loaded: boolean;
  add: (title: string) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
};

const TodosContext = createContext<TodosStore | null>(null);

// Holds the TODO list for the screens below it: loads the saved items once, then saves every change.
export function TodosProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(todosReducer, initialTodosState);
  // How many items the load read, and the list last saved or loaded, so a save happens only on a change.
  const loadedCount = useRef(0);
  const persisted = useRef<Todo[] | null>(null);

  useEffect(() => {
    let active = true;
    loadTodos()
      .catch(() => [])
      .then((items) => {
        if (!active) return;
        loadedCount.current = items.length;
        dispatch({ type: "loaded", items });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Saving before the load finishes would overwrite the saved items with an empty list.
    if (!state.loaded || persisted.current === state.items) return;
    const firstAfterLoad = persisted.current === null;
    persisted.current = state.items;
    // Right after loading, the list is what's on disk, unless items were added while it loaded.
    if (firstAfterLoad && state.items.length === loadedCount.current) return;
    saveTodos(state.items).catch(() => {});
  }, [state.items, state.loaded]);

  const store = useMemo<TodosStore>(
    () => ({
      items: state.items,
      loaded: state.loaded,
      add: (title) => dispatch({ type: "add", id: createId(), title }),
      toggle: (id) => dispatch({ type: "toggle", id }),
      remove: (id) => dispatch({ type: "remove", id }),
    }),
    [state],
  );

  return (
    <TodosContext.Provider value={store}>{children}</TodosContext.Provider>
  );
}

export function useTodos(): TodosStore {
  const store = useContext(TodosContext);
  if (store === null)
    throw new Error("useTodos must be used inside a TodosProvider.");
  return store;
}
