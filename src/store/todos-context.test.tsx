import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Todo } from "@/types/todo";

import { TodosProvider, useTodos } from "./todos-context";
import { loadTodos, saveTodos } from "./todos-storage";

jest.mock("./todos-storage", () => ({
  loadTodos: jest.fn(),
  saveTodos: jest.fn(),
}));

const load = jest.mocked(loadTodos);
const save = jest.mocked(saveTodos);

const milk: Todo = { id: "1", title: "Buy milk", done: false };
const bread: Todo = { id: "2", title: "Buy bread", done: true };

const wrapper = ({ children }: { children: ReactNode }) => (
  <TodosProvider>{children}</TodosProvider>
);

async function renderLoaded(saved: Todo[]) {
  load.mockResolvedValue(saved);
  save.mockResolvedValue(undefined);
  const view = await renderHook(() => useTodos(), { wrapper });
  await waitFor(() => expect(view.result.current.loaded).toBe(true));
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TodosProvider", () => {
  it("loads the saved items", async () => {
    const { result } = await renderLoaded([milk, bread]);
    expect(result.current.items).toEqual([milk, bread]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("doesn't save while loading, or just because it loaded", async () => {
    let finishLoading: (items: Todo[]) => void = () => {};
    load.mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve;
      }),
    );
    const { result } = await renderHook(() => useTodos(), { wrapper });
    expect(result.current.loaded).toBe(false);
    expect(save).not.toHaveBeenCalled();

    await act(() => finishLoading([milk]));
    expect(result.current.items).toEqual([milk]);
    expect(save).not.toHaveBeenCalled();
  });

  it("saves an item added while loading, with the saved ones", async () => {
    let finishLoading: (items: Todo[]) => void = () => {};
    load.mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve;
      }),
    );
    save.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useTodos(), { wrapper });
    await act(() => result.current.add("Call mum"));
    expect(save).not.toHaveBeenCalled();

    await act(() => finishLoading([milk]));
    expect(result.current.items.map((t) => t.title)).toEqual([
      "Buy milk",
      "Call mum",
    ]);
    await waitFor(() =>
      expect(save).toHaveBeenLastCalledWith(result.current.items),
    );
  });

  it("adds an item and saves the list", async () => {
    const { result } = await renderLoaded([milk]);
    await act(() => result.current.add("Call mum"));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[1]).toMatchObject({
      title: "Call mum",
      done: false,
    });
    await waitFor(() =>
      expect(save).toHaveBeenLastCalledWith(result.current.items),
    );
  });

  it("gives each new item its own id", async () => {
    const { result } = await renderLoaded([]);
    await act(() => result.current.add("One"));
    await act(() => result.current.add("Two"));
    const [one, two] = result.current.items;
    expect(one?.id).toBeTruthy();
    expect(one?.id).not.toBe(two?.id);
  });

  it("completes an item and saves the list", async () => {
    const { result } = await renderLoaded([milk]);
    await act(() => result.current.toggle("1"));
    expect(result.current.items[0]?.done).toBe(true);
    await waitFor(() =>
      expect(save).toHaveBeenLastCalledWith([{ ...milk, done: true }]),
    );
  });

  it("deletes an item and saves the list", async () => {
    const { result } = await renderLoaded([milk, bread]);
    await act(() => result.current.remove("1"));
    expect(result.current.items).toEqual([bread]);
    await waitFor(() => expect(save).toHaveBeenLastCalledWith([bread]));
  });

  it("still loads when reading the saved items fails", async () => {
    load.mockRejectedValue(new Error("disk"));
    const { result } = await renderHook(() => useTodos(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.items).toEqual([]);
  });
});

describe("useTodos", () => {
  it("throws outside a TodosProvider", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(renderHook(() => useTodos())).rejects.toThrow("TodosProvider");
  });
});
