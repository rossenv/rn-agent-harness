import { fireEvent, userEvent } from "@testing-library/react-native";
import Storage from "expo-sqlite/kv-store";
import { renderRouter, screen, testRouter } from "expo-router/testing-library";

import type { Todo } from "@/types/todo";

jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

const getItem = jest.mocked(Storage.getItem);
const setItem = jest.mocked(Storage.setItem);

const milk: Todo = { id: "1", title: "Buy milk", done: false };
const bread: Todo = { id: "2", title: "Buy bread", done: true };

// Renders the real routes in src/app with these items saved, and waits for the list to load.
async function openApp(saved: Todo[], initialUrl = "/") {
  getItem.mockResolvedValue(JSON.stringify(saved));
  await renderRouter("./src/app", { initialUrl });
  await screen.findByTestId(
    initialUrl === "/" ? "todos-screen" : "todo-detail-screen",
  );
}

// The list as last written to storage.
function lastSaved(): Todo[] {
  const calls = setItem.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return JSON.parse(String(calls[calls.length - 1][1]));
}

beforeEach(() => {
  jest.clearAllMocks();
  setItem.mockResolvedValue(undefined);
});

describe("the TODO list screen", () => {
  it("shows a loading indicator until the saved items are read", async () => {
    getItem.mockReturnValue(new Promise(() => {}));
    await renderRouter("./src/app");
    expect(screen.getByTestId("todos-loading")).toBeOnTheScreen();
    expect(screen.queryByTestId("todos-empty")).not.toBeOnTheScreen();
  });

  it("says so when there are no items", async () => {
    await openApp([]);
    expect(screen.getByTestId("todos-empty")).toBeOnTheScreen();
  });

  it("shows the saved items, with done ones checked", async () => {
    await openApp([milk, bread]);
    expect(screen.getByText("Buy milk")).toBeOnTheScreen();
    expect(screen.getByText("Buy bread")).toBeOnTheScreen();
    expect(screen.getByTestId("todo-toggle-1")).not.toBeChecked();
    expect(screen.getByTestId("todo-toggle-2")).toBeChecked();
    expect(screen.queryByTestId("todos-empty")).not.toBeOnTheScreen();
  });

  it("adds an item, clears the field and saves the list", async () => {
    const user = userEvent.setup();
    await openApp([milk]);

    await user.type(screen.getByTestId("todo-input"), "  Walk the dog ");
    await user.press(screen.getByTestId("todo-add"));

    expect(screen.getByText("Walk the dog")).toBeOnTheScreen();
    expect(screen.getByTestId("todo-input")).toHaveDisplayValue("");
    expect(lastSaved()).toEqual([
      milk,
      { id: expect.any(String), title: "Walk the dog", done: false },
    ]);
  });

  it("adds an item when the keyboard's submit key is pressed", async () => {
    const user = userEvent.setup();
    await openApp([]);

    await user.type(screen.getByTestId("todo-input"), "Call mum", {
      submitEditing: true,
    });

    expect(screen.getByText("Call mum")).toBeOnTheScreen();
  });

  it("adds the field's text from the submit event, even before the last keystroke renders", async () => {
    await openApp([]);
    const input = screen.getByTestId("todo-input");

    // On a device, return can arrive before the last onChangeText has re-rendered the form.
    await fireEvent.changeText(input, "Buy mil");
    await fireEvent(input, "submitEditing", {
      nativeEvent: { text: "Buy milk" },
    });

    expect(screen.getByText("Buy milk")).toBeOnTheScreen();
    expect(screen.getByTestId("todo-input")).toHaveDisplayValue("");
  });

  it("disables the add button while the title is blank", async () => {
    const user = userEvent.setup();
    await openApp([]);

    expect(screen.getByTestId("todo-add")).toBeDisabled();
    await user.type(screen.getByTestId("todo-input"), "   ");
    expect(screen.getByTestId("todo-add")).toBeDisabled();
    await user.press(screen.getByTestId("todo-add"));

    expect(screen.getByTestId("todos-empty")).toBeOnTheScreen();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("completes an item and saves the list", async () => {
    const user = userEvent.setup();
    await openApp([milk]);

    await user.press(screen.getByTestId("todo-toggle-1"));

    expect(screen.getByTestId("todo-toggle-1")).toBeChecked();
    expect(lastSaved()).toEqual([{ ...milk, done: true }]);
  });

  it("deletes an item and saves the list", async () => {
    const user = userEvent.setup();
    await openApp([milk, bread]);

    await user.press(screen.getByTestId("todo-delete-1"));

    expect(screen.queryByText("Buy milk")).not.toBeOnTheScreen();
    expect(screen.getByText("Buy bread")).toBeOnTheScreen();
    expect(lastSaved()).toEqual([bread]);
  });

  it("opens an item's screen", async () => {
    const user = userEvent.setup();
    await openApp([milk, bread]);

    await user.press(screen.getByTestId("todo-open-2"));

    expect(screen).toHavePathname("/todo/2");
    expect(screen.getByTestId("todo-detail-title")).toHaveTextContent(
      "Buy bread",
    );
  });
});

describe("the TODO item screen", () => {
  it("completes the item, and the list shows it", async () => {
    const user = userEvent.setup();
    await openApp([milk]);
    await testRouter.push("/todo/1");

    const toggle = screen.getByTestId("todo-detail-toggle");
    expect(toggle).not.toBeChecked();
    await user.press(toggle);
    expect(screen.getByTestId("todo-detail-toggle")).toBeChecked();
    expect(lastSaved()).toEqual([{ ...milk, done: true }]);

    await testRouter.back();
    expect(screen).toHavePathname("/");
    expect(screen.getByTestId("todo-toggle-1")).toBeChecked();
  });

  it("deletes the item and goes back to the list", async () => {
    const user = userEvent.setup();
    await openApp([milk, bread]);
    await testRouter.push("/todo/1");

    await user.press(screen.getByTestId("todo-detail-delete"));

    expect(screen).toHavePathname("/");
    expect(screen.queryByText("Buy milk")).not.toBeOnTheScreen();
    expect(lastSaved()).toEqual([bread]);
  });

  it("goes to the list after a delete when opened from a link", async () => {
    const user = userEvent.setup();
    await openApp([milk], "/todo/1");

    await user.press(screen.getByTestId("todo-detail-delete"));

    expect(screen).toHavePathname("/");
    expect(screen.getByTestId("todos-empty")).toBeOnTheScreen();
  });

  it("says so when the item doesn't exist", async () => {
    await openApp([milk], "/todo/nope");
    expect(screen.getByTestId("todo-not-found")).toBeOnTheScreen();
    expect(screen.queryByTestId("todo-detail-delete")).not.toBeOnTheScreen();
  });

  it("waits for the saved items before saying an item doesn't exist", async () => {
    getItem.mockReturnValue(new Promise(() => {}));
    await renderRouter("./src/app", { initialUrl: "/todo/1" });
    expect(screen.getByTestId("todo-detail-loading")).toBeOnTheScreen();
    expect(screen.queryByTestId("todo-not-found")).not.toBeOnTheScreen();
  });
});
