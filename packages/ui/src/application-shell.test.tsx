import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ApplicationShell,
  Button,
  IconButton,
  SaveStateIndicator,
  ScopeLabel,
} from "./index.js";

const renderShell = () =>
  render(
    <ApplicationShell
      breadcrumb={<span>Top 10 Music Videos</span>}
      catalog={<p>Reusable Segments</p>}
      catalogLabel="Segment Catalog"
      historyActions={
        <>
          <IconButton disabled icon="undo" label="Undo" tooltip="Undo" />
          <IconButton disabled icon="redo" label="Redo" tooltip="Redo" />
        </>
      }
      inspector={<p>Context settings</p>}
      notes={<p>Production notes</p>}
      primaryAction={<Button variant="primary">Add Segment</Button>}
      saveState={<SaveStateIndicator state="saved" />}
      scope={<ScopeLabel scope="show" />}
      studioSwitcher={<Button trailingIcon="chevron-down">Demo Studio</Button>}
      title="Show Blueprint"
    >
      <section aria-label="Storyboard">Storyboard canvas</section>
    </ApplicationShell>,
  );

describe("ApplicationShell", () => {
  it("renders the global hierarchy and focusable main workspace", () => {
    renderShell();

    const banner = screen.getByRole("banner", { name: "Showflow application" });
    expect(within(banner).getByText("Showflow")).toBeVisible();
    expect(
      within(banner).getByRole("button", { name: "Demo Studio" }),
    ).toBeVisible();
    expect(within(banner).getByText("Top 10 Music Videos")).toBeVisible();
    expect(
      within(banner).getByRole("heading", { name: "Show Blueprint" }),
    ).toBeVisible();
    expect(within(banner).getByText("Saved")).toBeVisible();
    expect(
      within(banner).getByRole("button", { name: "Add Segment" }),
    ).toBeVisible();
    expect(
      screen.getByText("Changes become the default for future Episodes."),
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Notes" })).toHaveTextContent(
      "Production notes",
    );

    const main = screen.getByRole("main", { name: "Show Blueprint" });
    main.focus();
    expect(main).toHaveFocus();
    expect(
      screen.getByRole("link", { name: "Skip to workspace" }),
    ).toHaveAttribute("href", `#${main.id}`);
    fireEvent.click(screen.getByRole("link", { name: "Skip to workspace" }));
    expect(main).toHaveFocus();
  });

  it("collapses and restores the inspector", () => {
    renderShell();

    expect(
      screen.getByRole("complementary", { name: "Inspector" }),
    ).toBeVisible();
    const toggle = screen.getByRole("button", { name: "Hide Inspector" });
    toggle.focus();
    fireEvent.click(toggle);

    expect(
      screen.queryByRole("complementary", { name: "Inspector" }),
    ).not.toBeInTheDocument();
    const restore = screen.getByRole("button", { name: "Show Inspector" });
    expect(restore).toHaveFocus();
    fireEvent.click(restore);
    expect(
      screen.getByRole("complementary", { name: "Inspector" }),
    ).toBeVisible();
  });

  it("opens the Catalog, closes the inspector, and restores focus after Escape", () => {
    renderShell();

    const trigger = screen.getByRole("button", {
      name: "Open Segment Catalog",
    });
    fireEvent.click(trigger);
    expect(
      screen.getByRole("complementary", { name: "Segment Catalog" }),
    ).toHaveTextContent("Reusable Segments");
    expect(
      screen.queryByRole("complementary", { name: "Inspector" }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("complementary", { name: "Segment Catalog" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Segment Catalog" }),
    ).toHaveFocus();
  });

  it("omits optional support surfaces and their controls", () => {
    render(
      <ApplicationShell
        primaryAction={<Button>Continue</Button>}
        studioSwitcher={<Button>Studio</Button>}
        title="Studio Home"
      >
        Home
      </ApplicationShell>,
    );

    expect(screen.getByRole("main", { name: "Studio Home" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Catalog/u }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Inspector/u }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Notes" }),
    ).not.toBeInTheDocument();
  });
});
