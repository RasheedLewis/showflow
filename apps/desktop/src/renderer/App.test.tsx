import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { App } from "./App";
import {
  COMPONENT_GALLERY_ROUTE,
  GALLERY_COMPONENTS,
} from "./development/component-gallery-contract.mts";

const renderApp = (route = "/") =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );

describe("App", () => {
  it("renders the Showflow application shell accessibly", () => {
    renderApp();

    const appBar = screen.getByRole("banner", {
      name: "Showflow application",
    });

    expect(within(appBar).getByText("Showflow")).toBeVisible();
    expect(
      within(appBar).getByRole("button", { name: "Studio switcher" }),
    ).toBeVisible();
    expect(within(appBar).getByText("Desktop foundation")).toBeVisible();
    expect(
      within(appBar).getByRole("heading", {
        level: 1,
        name: "Showflow is ready.",
      }),
    ).toBeVisible();
    expect(within(appBar).getByText("Saved")).toBeVisible();
    expect(
      within(appBar).getByRole("button", { name: "Create Studio" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Production workspace foundation",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("main", { name: "Showflow is ready." }),
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", { name: "Inspector" }),
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Production notes" }),
    ).toBeVisible();
  });

  it("opens and closes shell support panels", () => {
    renderApp();

    fireEvent.click(
      screen.getByRole("button", { name: "Open Workspace navigation" }),
    );
    expect(
      screen.getByRole("complementary", { name: "Workspace navigation" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("complementary", { name: "Inspector" }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("complementary", { name: "Workspace navigation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Workspace navigation" }),
    ).toHaveFocus();
  });

  it("routes to the complete internal component gallery", () => {
    const { container } = renderApp(COMPONENT_GALLERY_ROUTE);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Component development gallery",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("Sprint 3 design-system acceptance surface"),
    ).toBeVisible();
    expect(screen.getByText("Actions and layout")).toBeVisible();
    expect(screen.getByText("Inputs")).toBeVisible();
    expect(screen.getByText("Navigation and overlays")).toBeVisible();
    expect(screen.getByText("Feedback and contexts")).toBeVisible();
    expect(screen.getByText("Production object primitives")).toBeVisible();

    const renderedComponents = Array.from(
      container.querySelectorAll<HTMLElement>("[data-component]"),
      (element) => element.dataset["component"],
    );

    expect(new Set(renderedComponents)).toEqual(new Set(GALLERY_COMPONENTS));
    expect(
      screen.getByRole("button", {
        name: "Add the selected reusable Segment to this Episode Storyboard",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "Invalid Segment name" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByRole("button", { name: "Keyboard focus" }),
    ).toHaveAttribute("data-gallery-focus", "true");
  });
});
