import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { LayoutDto } from "@showflow/contracts";

import { LifecycleActionEditor } from "./LifecycleActionEditor";

const timestamp = "2026-08-09T12:00:00.000Z";
const layout: LayoutDto = {
  archivedAt: null,
  aspectRatio: "16:9",
  canvas: { height: 1080, width: 1920 },
  componentPlacements: [],
  createdAt: timestamp,
  id: "01942c1f-ae8f-7e42-b911-000000000501",
  name: "Host",
  showId: "01942c1f-ae8f-7e42-b911-000000000502",
  slots: [],
  updatedAt: timestamp,
};

describe("LifecycleActionEditor", () => {
  test("12.T10 keeps Enter and Exit actions ordered and editable", () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const onPreview = vi.fn();
    render(
      <LifecycleActionEditor
        actions={[
          { kind: "activateLayout", layoutId: layout.id },
          { kind: "waitForAnimationCompletion" },
        ]}
        components={[]}
        disabled={false}
        layouts={[layout]}
        onChange={onChange}
        onPreview={onPreview}
        phase="enter"
        resources={[]}
      />,
    );

    expect(screen.getByText("Show Host")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Preview Enter" }));
    expect(onPreview).toHaveBeenCalledOnce();
    const moveEarlier = screen.getAllByRole("button", {
      name: "Move earlier",
    })[1];
    if (moveEarlier === undefined)
      throw new Error("Expected a reorder action.");
    fireEvent.click(moveEarlier);
    expect(onChange).toHaveBeenLastCalledWith([
      { kind: "waitForAnimationCompletion" },
      { kind: "activateLayout", layoutId: layout.id },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Wait for animation" }));
    expect(onChange).toHaveBeenLastCalledWith([
      { kind: "activateLayout", layoutId: layout.id },
      { kind: "waitForAnimationCompletion" },
      { kind: "waitForAnimationCompletion" },
    ]);
  });

  test("12A.T7 adds, edits, reorders, and removes an accessible hold", () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const onPreview = vi.fn();
    const { rerender } = render(
      <LifecycleActionEditor
        actions={[]}
        components={[]}
        disabled={false}
        layouts={[layout]}
        onChange={onChange}
        onPreview={onPreview}
        phase="enter"
        resources={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hold for" }));
    expect(onChange).toHaveBeenLastCalledWith([
      { kind: "waitForDuration", durationMs: 3_000 },
    ]);

    rerender(
      <LifecycleActionEditor
        actions={[
          { kind: "activateLayout", layoutId: layout.id },
          { kind: "waitForDuration", durationMs: 3_000 },
        ]}
        components={[]}
        disabled={false}
        layouts={[layout]}
        onChange={onChange}
        onPreview={onPreview}
        phase="enter"
        resources={[]}
      />,
    );
    const duration = screen.getByRole("spinbutton", {
      name: "Action 2 hold duration (seconds)",
    });
    expect(duration).toHaveValue(3);
    fireEvent.change(duration, { target: { value: "0" } });
    expect(duration).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(/must be greater than zero seconds/u),
    ).toBeVisible();
    fireEvent.change(duration, { target: { value: "2.5" } });
    expect(onChange).toHaveBeenLastCalledWith([
      { kind: "activateLayout", layoutId: layout.id },
      { kind: "waitForDuration", durationMs: 2_500 },
    ]);

    const moveEarlier = screen.getAllByRole("button", {
      name: "Move earlier",
    })[1];
    if (moveEarlier === undefined) throw new Error("Expected hold reorder.");
    fireEvent.click(moveEarlier);
    expect(onChange).toHaveBeenLastCalledWith([
      { kind: "waitForDuration", durationMs: 3_000 },
      { kind: "activateLayout", layoutId: layout.id },
    ]);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Remove action" })[1] ??
        (() => {
          throw new Error("Expected hold removal.");
        })(),
    );
    expect(onChange).toHaveBeenLastCalledWith([
      { kind: "activateLayout", layoutId: layout.id },
    ]);
  });

  test("12A.T8 reports effective zero animation timing and exact phase totals", () => {
    render(
      <LifecycleActionEditor
        actions={[
          { kind: "activateLayout", layoutId: layout.id },
          { kind: "waitForAnimationCompletion" },
          { kind: "waitForDuration", durationMs: 3_000 },
        ]}
        components={[]}
        disabled={false}
        layouts={[layout]}
        onChange={vi.fn().mockResolvedValue(undefined)}
        onPreview={() => undefined}
        phase="exit"
        resources={[]}
      />,
    );

    expect(
      screen.getByText(/Effective animation wait: 0 seconds/u),
    ).toBeVisible();
    expect(
      screen.getByText(/resolves to zero and completes immediately/u),
    ).toBeVisible();
    expect(
      screen.getByText("Calculated Exit time before Cleanup: 3 seconds."),
    ).toBeVisible();
    expect(
      screen.getByText(/Cleanup clears temporary audience output/u),
    ).toBeVisible();
  });

  test("12A.T9 saves a Show Layout action immediately after an explicit Layout selection", () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <LifecycleActionEditor
        actions={[]}
        components={[]}
        disabled={false}
        layouts={[layout]}
        onChange={onChange}
        onPreview={() => undefined}
        phase="enter"
        resources={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show Layout" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Preview Enter" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Add Show Layout" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", {
        name: "Layout for new Show Layout action",
      }),
    ).toHaveFocus();
    fireEvent.change(
      screen.getByRole("combobox", {
        name: "Layout for new Show Layout action",
      }),
      { target: { value: layout.id } },
    );
    expect(onChange).toHaveBeenCalledWith([
      { kind: "activateLayout", layoutId: layout.id },
    ]);
    expect(
      screen.queryByRole("combobox", {
        name: "Layout for new Show Layout action",
      }),
    ).not.toBeInTheDocument();
  });

  test("12A.T10 explains disabled media actions visibly and accessibly", () => {
    render(
      <LifecycleActionEditor
        actions={[]}
        components={[]}
        disabled={false}
        layouts={[layout]}
        onChange={vi.fn().mockResolvedValue(undefined)}
        onPreview={() => undefined}
        phase="enter"
        resources={[]}
      />,
    );

    const start = screen.getByRole("button", { name: "Start media" });
    const stop = screen.getByRole("button", { name: "Stop media" });
    expect(start).toBeDisabled();
    expect(stop).toBeDisabled();
    expect(start).toHaveAccessibleDescription(
      /imported audio or video Resource/u,
    );
    expect(stop).toHaveAccessibleDescription(/compatible Layout/u);
  });
});
