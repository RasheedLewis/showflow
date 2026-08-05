import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the Showflow development screen accessibly", () => {
    render(<App />);

    const appBar = screen.getByRole("banner", {
      name: "Showflow application",
    });

    expect(within(appBar).getByText("Showflow")).toBeVisible();
    expect(within(appBar).getByText("Desktop foundation")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Showflow is ready.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Showflow is ready." }),
    ).toBeVisible();
  });
});
