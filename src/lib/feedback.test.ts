import { beforeEach, describe, expect, it, vi } from "vitest";

const { toast } = vi.hoisted(() => {
  const toast = Object.assign(vi.fn(), { error: vi.fn() });
  return { toast };
});
vi.mock("sonner", () => ({ toast }));

import { saveFailedToast, undoToast } from "./feedback";

beforeEach(() => vi.clearAllMocks());

describe("undoToast", () => {
  it("lasts 10 s and calls onUndo from its Undo action", () => {
    const onUndo = vi.fn();
    undoToast("Task done", onUndo, "Undo");
    const [message, options] = toast.mock.calls[0];
    expect(message).toBe("Task done");
    expect(options.duration).toBe(10000);
    expect(options.action.label).toBe("Undo");
    options.action.onClick();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});

describe("saveFailedToast", () => {
  it("is a role=alert toast with a Retry action calling onRetry", () => {
    const onRetry = vi.fn();
    saveFailedToast("Couldn't save. Trying again.", onRetry, "Retry");
    const [node, options] = toast.error.mock.calls[0];
    expect(node.props.role).toBe("alert");
    expect(node.props.children).toBe("Couldn't save. Trying again.");
    expect(options.duration).toBe(Infinity);
    expect(options.action.label).toBe("Retry");
    options.action.onClick();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
