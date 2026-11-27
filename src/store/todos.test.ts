import type { Todo } from "@/types/todo";

import { initialTodosState, todosReducer } from "./todos";

const milk: Todo = { id: "1", title: "Buy milk", done: false };
const bread: Todo = { id: "2", title: "Buy bread", done: true };

const loaded = (items: Todo[]) =>
  todosReducer(initialTodosState, { type: "loaded", items });

describe("todosReducer", () => {
  it("starts empty and not yet loaded", () => {
    expect(initialTodosState).toEqual({ items: [], loaded: false });
  });

  describe("loaded", () => {
    it("puts the saved items in the list and marks the store loaded", () => {
      expect(loaded([milk, bread])).toEqual({
        items: [milk, bread],
        loaded: true,
      });
    });

    it("keeps items added before loading finished, after the saved ones", () => {
      const early = todosReducer(initialTodosState, {
        type: "add",
        id: "3",
        title: "Call mum",
      });
      const state = todosReducer(early, { type: "loaded", items: [milk] });
      expect(state.items.map((t) => t.id)).toEqual(["1", "3"]);
    });
  });

  describe("add", () => {
    it("adds a new, not-done item at the end", () => {
      const state = todosReducer(loaded([milk]), {
        type: "add",
        id: "3",
        title: "Call mum",
      });
      expect(state.items).toEqual([
        milk,
        { id: "3", title: "Call mum", done: false },
      ]);
    });

    it("trims the title", () => {
      const state = todosReducer(loaded([]), {
        type: "add",
        id: "3",
        title: "  Call mum  ",
      });
      expect(state.items[0]?.title).toBe("Call mum");
    });

    it.each(["", "   "])("ignores a blank title %j", (title) => {
      const before = loaded([milk]);
      expect(todosReducer(before, { type: "add", id: "3", title })).toBe(
        before,
      );
    });
  });

  describe("toggle", () => {
    it("marks an open item done", () => {
      const state = todosReducer(loaded([milk, bread]), {
        type: "toggle",
        id: "1",
      });
      expect(state.items).toEqual([{ ...milk, done: true }, bread]);
    });

    it("marks a done item open again", () => {
      const state = todosReducer(loaded([milk, bread]), {
        type: "toggle",
        id: "2",
      });
      expect(state.items[1]?.done).toBe(false);
    });

    it("leaves the list alone for an unknown id", () => {
      const before = loaded([milk]);
      expect(todosReducer(before, { type: "toggle", id: "9" }).items).toEqual(
        before.items,
      );
    });
  });

  describe("remove", () => {
    it("deletes the item", () => {
      const state = todosReducer(loaded([milk, bread]), {
        type: "remove",
        id: "1",
      });
      expect(state.items).toEqual([bread]);
    });

    it("leaves the list alone for an unknown id", () => {
      const before = loaded([milk]);
      expect(todosReducer(before, { type: "remove", id: "9" }).items).toEqual(
        before.items,
      );
    });
  });

  it("doesn't change the state it was given", () => {
    const before = loaded([milk]);
    const copy = structuredClone(before);
    todosReducer(before, { type: "toggle", id: "1" });
    todosReducer(before, { type: "remove", id: "1" });
    todosReducer(before, { type: "add", id: "3", title: "x" });
    expect(before).toEqual(copy);
  });
});
