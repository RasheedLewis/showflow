import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, test, vi } from "vitest";

import type { ShowflowDesktopApi } from "@showflow/contracts";

import { createMockDesktopApi } from "../../../../../../tests/support/mock-desktop-api";
import { ResourcePicker } from "./ResourcePicker";

const studioId = "01942c1f-ae8f-7e42-b911-000000000701";
const showId = "01942c1f-ae8f-7e42-b911-000000000702";

describe("ResourcePicker", () => {
  test("12A.T13 auto-selects a contextual image import and confirms it visibly", async () => {
    const baseApi = createMockDesktopApi();
    const getUrl = vi.fn(baseApi.resources.getUrl);
    const importResource = vi.fn(baseApi.resources.import);
    Object.defineProperty(window, "showflow", {
      configurable: true,
      value: Object.freeze({
        ...baseApi,
        resources: Object.freeze({
          ...baseApi.resources,
          getUrl,
          import: importResource,
        }),
      }) satisfies ShowflowDesktopApi,
    });
    const onSelect = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ResourcePicker
          category="image"
          context={{ scope: "show", showId, studioId }}
          inputId="hero-image"
          label="Hero image"
          onSelect={onSelect}
          required
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose image" }));
    const confirm = await screen.findByRole("button", {
      name: "Use selected image",
    });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Import image" }));

    await waitFor(() => expect(confirm).toBeEnabled());
    expect(importResource).toHaveBeenCalledWith({
      context: { scope: "show", showId, studioId },
    });
    await waitFor(() => expect(getUrl).toHaveBeenCalled());
    fireEvent.click(confirm);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(expect.any(String));
  });
});
