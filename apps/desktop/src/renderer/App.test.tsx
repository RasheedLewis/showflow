import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the Showflow application shell accessibly", () => {
    render(<App />);

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
    render(<App />);

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
});
