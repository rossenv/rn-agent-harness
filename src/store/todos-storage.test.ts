import Storage from "expo-sqlite/kv-store";

import type { Todo } from "@/types/todo";

import { loadTodos, saveTodos, TODOS_KEY } from "./todos-storage";

jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

const getItem = jest.mocked(Storage.getItem);
const setItem = jest.mocked(Storage.setItem);

const milk: Todo = { id: "1", title: "Buy milk", done: false };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("loadTodos", () => {
  it("reads the saved items", async () => {
    getItem.mockResolvedValue(JSON.stringify([milk]));
    await expect(loadTodos()).resolves.toEqual([milk]);
    expect(getItem).toHaveBeenCalledWith(TODOS_KEY);
  });

  it("returns an empty list when nothing is saved", async () => {
    getItem.mockResolvedValue(null);
    await expect(loadTodos()).resolves.toEqual([]);
  });

  it.each([
    ["not JSON", "{oops"],
    ["not a list", JSON.stringify({ id: "1" })],
  ])(
    "returns an empty list when the saved value is %s",
    async (_label, raw) => {
      getItem.mockResolvedValue(raw);
      await expect(loadTodos()).resolves.toEqual([]);
    },
  );

  it("drops saved entries that aren't todos", async () => {
    getItem.mockResolvedValue(
      JSON.stringify([milk, { id: 2, title: "bad" }, null, "x"]),
    );
    await expect(loadTodos()).resolves.toEqual([milk]);
  });
});

describe("saveTodos", () => {
  it("writes the items as JSON under one key", async () => {
    setItem.mockResolvedValue(undefined);
    await saveTodos([milk]);
    expect(setItem).toHaveBeenCalledWith(TODOS_KEY, JSON.stringify([milk]));
  });
});
