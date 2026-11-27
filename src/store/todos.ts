import type { Todo } from "@/types/todo";

export type TodosState = {
  items: Todo[];
  // False until the saved items have been read, so nothing overwrites them first.
  loaded: boolean;
};

export type TodosAction =
  | { type: "loaded"; items: Todo[] }
  | { type: "add"; id: string; title: string }
  | { type: "toggle"; id: string }
  | { type: "remove"; id: string };

export const initialTodosState: TodosState = { items: [], loaded: false };

export function todosReducer(
  state: TodosState,
  action: TodosAction,
): TodosState {
  switch (action.type) {
    case "loaded":
      // Items added while loading stay, after the saved ones.
      return { items: [...action.items, ...state.items], loaded: true };
    case "add": {
      const title = action.title.trim();
      if (title === "") return state;
      return {
        ...state,
        items: [...state.items, { id: action.id, title, done: false }],
      };
    }
    case "toggle":
      return {
        ...state,
        items: state.items.map((todo) =>
          todo.id === action.id ? { ...todo, done: !todo.done } : todo,
        ),
      };
    case "remove":
      return {
        ...state,
        items: state.items.filter((todo) => todo.id !== action.id),
      };
  }
}
