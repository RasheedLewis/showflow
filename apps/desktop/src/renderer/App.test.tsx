import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the Showflow development screen accessibly", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Showflow" }),
    ).toBeVisible();
    expect(screen.getByText("Showflow is ready.")).toBeVisible();
    expect(screen.getByRole("region", { name: "Showflow" })).toBeVisible();
  });
});
