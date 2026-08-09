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
});
