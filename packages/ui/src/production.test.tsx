import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  Button,
  InspectorSection,
  NotesPanel,
  ObjectCard,
  PropertyRow,
  ScopeLabel,
  StatusBadge,
  StoryboardCard,
  TextInput,
  ValidationItem,
} from "./index.js";

describe("production object cards", () => {
  it("renders the complete object-card anatomy and opens from the keyboard", () => {
    const onOpen = vi.fn();
    render(
      <ObjectCard
        actions={<Button size="small">More</Button>}
        description="Reusable opening sequence"
        metadata={<span>Used in 4 Episodes</span>}
        onOpen={onOpen}
        preview={<span>Opening preview</span>}
        selected
        status={<StatusBadge status="ready" />}
        title="Opening"
      />,
    );

    const card = screen.getByRole("article", { name: "Opening" });
    expect(card).toHaveAttribute("data-selected", "true");
    expect(screen.getByText("Reusable opening sequence")).toBeVisible();
    expect(screen.getByText("Used in 4 Episodes")).toBeVisible();
    const open = screen.getByRole("button", { name: "Opening" });
    open.focus();
    expect(open).toHaveFocus();
    fireEvent.keyDown(open, { key: "Enter" });
    fireEvent.click(open);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("exposes dragging, disabled, invalid, archived, and current states", () => {
    render(
      <>
        <ObjectCard title="Default" />
        <ObjectCard dragging title="Dragging" />
        <ObjectCard
          actions={<Button>Hidden action</Button>}
          disabled
          onOpen={vi.fn()}
          title="Disabled"
        />
        <ObjectCard invalid title="Invalid" />
        <ObjectCard archived title="Archived" />
        <ObjectCard current title="Current" />
      </>,
    );

    expect(
      screen.getByRole("article", { name: "Default" }),
    ).not.toHaveAttribute("data-selected");
    expect(screen.getByRole("article", { name: "Dragging" })).toHaveAttribute(
      "data-dragging",
      "true",
    );
    expect(screen.getByRole("article", { name: "Disabled" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Hidden action" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Invalid" })).toHaveAttribute(
      "data-invalid",
      "true",
    );
    expect(screen.getByRole("article", { name: "Archived" })).toHaveAttribute(
      "data-archived",
      "true",
    );
    expect(screen.getByRole("article", { name: "Current" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("renders Storyboard-specific preview, placement, timing, reuse, and validation data", () => {
    render(
      <StoryboardCard
        duration="01:30"
        issueCount={2}
        placementLabel="Cold Open"
        preview={<span>Audience preview</span>}
        readiness="has-warnings"
        reuseCount={2}
        sequenceNumber={1}
        summary="Guest: Jane Doe"
        timelineState="next"
        title="Interview"
      />,
    );

    const card = screen.getByRole("article", { name: "Interview — Cold Open" });
    expect(card).toHaveAttribute("data-timeline-state", "next");
    expect(
      screen.getByText("Storyboard position").parentElement,
    ).toHaveTextContent("1");
    expect(screen.getByText("Guest: Jane Doe")).toBeVisible();
    expect(screen.getByText("01:30")).toHaveClass("sf-duration");
    expect(screen.getByText("Used 2 times")).toBeVisible();
    expect(screen.getByText("2 issues")).toBeVisible();
    expect(screen.getByText("Has warnings")).toBeVisible();
    expect(screen.getByText("Next")).toBeVisible();
  });

  it.each([
    ["ready", "Ready"],
    ["needs-content", "Needs content"],
    ["has-warnings", "Has warnings"],
    ["blocking-issue", "Blocking issue"],
  ] as const)("uses canonical %s readiness copy", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeVisible();
  });
});

describe("production context primitives", () => {
  it.each([
    ["show", "Design Show", "Changes become the default for future Episodes."],
    ["episode", "Produce Episode", "Changes apply only to this Episode."],
    [
      "show-segment",
      "Show Segment",
      "Changes affect future uses of this Segment.",
    ],
    [
      "episode-segment",
      "Episode Segment",
      "Changes apply only to this Episode.",
    ],
  ] as const)("renders the canonical %s scope", (scope, label, description) => {
    render(<ScopeLabel scope={scope} />);
    expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByText(description)).toBeVisible();
  });

  it("groups inspector properties and labels limited Episode overrides", () => {
    render(
      <InspectorSection
        description="Current Segment settings"
        heading="Content"
      >
        <PropertyRow
          control={
            <TextInput label="Expected duration" value="01:30" readOnly />
          }
          label="Duration"
          overridden
          resetAction={<Button size="small">Reset to Show default</Button>}
          source="Show default"
        />
      </InspectorSection>,
    );

    expect(screen.getByRole("region", { name: "Content" })).toBeVisible();
    expect(screen.getByText("Current Segment settings")).toBeVisible();
    expect(screen.getByText("Episode override")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Reset to Show default" }),
    ).toBeVisible();
  });

  it("provides editable and disabled plain-text notes states", () => {
    const onChange = vi.fn();
    render(
      <NotesPanel
        onChange={onChange}
        prompt="Notes begin from the Show Segment template."
        value="Introduce the guest after the video."
      />,
    );

    const notes = screen.getByRole("textbox", { name: "Notes" });
    expect(notes).toHaveValue("Introduce the guest after the video.");
    fireEvent.change(notes, { target: { value: "Updated host note" } });
    expect(onChange).toHaveBeenCalledOnce();

    render(
      <NotesPanel
        disabled
        heading="Locked notes"
        value="Read only during export."
      />,
    );
    expect(
      screen.getByRole("textbox", { name: "Locked notes" }),
    ).toBeDisabled();
  });

  it("presents validation severity, affected object, and a direct action", () => {
    render(
      <ValidationItem
        action={<Button size="small">Add artwork</Button>}
        affectedObject="Ranking Reveal · Album artwork"
        message="The Ranking Reveal Segment needs album artwork."
        severity="blocking"
      />,
    );

    const item = screen.getByRole("article");
    expect(item).toHaveTextContent("Blocking issue");
    expect(item).toHaveTextContent(
      "The Ranking Reveal Segment needs album artwork.",
    );
    expect(item).toHaveTextContent("Ranking Reveal · Album artwork");
    expect(screen.getByRole("button", { name: "Add artwork" })).toBeVisible();
  });
});
