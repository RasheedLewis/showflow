import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import type { ShowflowDesktopApi } from "@showflow/contracts";

import { App } from "./App";
import { APPLICATION_FOUNDATION_ROUTE } from "./app-routes.mts";
import {
  COMPONENT_GALLERY_ROUTE,
  GALLERY_COMPONENTS,
} from "./development/component-gallery-contract.mts";
import {
  createMockDesktopApi,
  DEFAULT_STUDIO_ID,
} from "../../../../tests/support/mock-desktop-api";

const installDesktopApi = (api: ShowflowDesktopApi): void => {
  Object.defineProperty(window, "showflow", {
    configurable: true,
    value: api,
  });
};

const renderApp = (
  route = APPLICATION_FOUNDATION_ROUTE,
  api = createMockDesktopApi(),
) => {
  installDesktopApi(api);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
};

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

  it("routes first launch to Studio creation", async () => {
    renderApp("/");

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Create your first Studio",
      }),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Studio name" })).toBeVisible();
    expect(
      screen.getByText("You can add a logo later from Studio settings."),
    ).toBeVisible();
  });

  it("creates, selects, and opens a Studio", async () => {
    const api = createMockDesktopApi();
    renderApp("/studio/new", api);

    fireEvent.change(screen.getByRole("textbox", { name: "Studio name" }), {
      target: { value: "  Public Sphere  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Studio" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Public Sphere",
      }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Create your first Show",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Design a reusable production once, then create new Episodes from it.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Shows" })).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "Search Shows" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "New Show" })).toBeEnabled();
    expect(screen.queryByText("Recent Episodes")).not.toBeInTheDocument();
    await expect(api.app.getApplicationSettings()).resolves.toMatchObject({
      ok: true,
      data: {
        lastRoute: "/studio/8d9df01f-2584-4b9a-ad13-a96d673918e9",
        lastStudioId: "8d9df01f-2584-4b9a-ad13-a96d673918e9",
      },
    });
  });

  it("creates a blank Show and opens its empty Blueprint", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    renderApp(`/studio/${DEFAULT_STUDIO_ID}`, api);

    fireEvent.click(await screen.findByRole("button", { name: "New Show" }));
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Show name" }),
      {
        target: { value: "Artist Interviews" },
      },
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: { value: "Weekly artist interviews." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Show" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Artist Interviews",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Design your Show’s default Storyboard",
      }),
    ).toBeVisible();
    await expect(api.app.getApplicationSettings()).resolves.toMatchObject({
      ok: true,
      data: {
        lastStudioId: DEFAULT_STUDIO_ID,
      },
    });
  });

  it("renders Show cards and supports rename, open, and archive", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      studioId: DEFAULT_STUDIO_ID,
      name: "Artist Interviews",
      description: "Weekly artist interviews.",
    });
    renderApp(`/studio/${DEFAULT_STUDIO_ID}`, api);

    expect(
      await screen.findByRole("button", { name: "Artist Interviews" }),
    ).toBeVisible();
    expect(screen.getByText("Weekly artist interviews.")).toBeVisible();
    expect(screen.getByText("0 Episodes")).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Artist Interviews thumbnail placeholder",
      }),
    ).toBeVisible();

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for Artist Interviews" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Show name" }), {
      target: { value: "Artist Conversations" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Rename Show" }));
    expect(
      await screen.findByRole("button", { name: "Artist Conversations" }),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Artist Conversations" }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Artist Conversations",
      }),
    ).toBeVisible();
  });

  it("requires confirmation before deleting a Show card", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      studioId: DEFAULT_STUDIO_ID,
      name: "Artist Interviews",
    });
    renderApp(`/studio/${DEFAULT_STUDIO_ID}`, api);

    fireEvent.pointerDown(
      await screen.findByRole("button", {
        name: "Actions for Artist Interviews",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(
      screen.getByRole("dialog", { name: "Delete Artist Interviews?" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("button", { name: "Artist Interviews" }),
    ).toBeVisible();

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Actions for Artist Interviews" }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Show" }));
    expect(
      await screen.findByRole("heading", { name: "Create your first Show" }),
    ).toBeVisible();
  });

  it("archives a Show card without destructive confirmation", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      studioId: DEFAULT_STUDIO_ID,
      name: "Artist Interviews",
    });
    renderApp(`/studio/${DEFAULT_STUDIO_ID}`, api);

    fireEvent.pointerDown(
      await screen.findByRole("button", {
        name: "Actions for Artist Interviews",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "Archive" }));

    expect(
      await screen.findByRole("heading", { name: "Create your first Show" }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("creates another Studio and switches back through the account-style menu", async () => {
    const api = createMockDesktopApi();
    renderApp("/studio/new", api);

    fireEvent.change(screen.getByRole("textbox", { name: "Studio name" }), {
      target: { value: "Public Sphere" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Studio" }));
    await screen.findByRole("heading", { level: 1, name: "Public Sphere" });

    fireEvent.pointerDown(
      screen.getByRole("button", {
        name: "Switch Studio. Current Studio: Public Sphere",
      }),
      { button: 0, ctrlKey: false },
    );
    expect(screen.getByText("Current Studio")).toBeVisible();
    expect(screen.getByText("Other Studios")).toBeVisible();
    expect(
      screen.getByRole("menuitem", { name: "No other Studios" }),
    ).toHaveAttribute("data-disabled");
    expect(
      screen.getByRole("menuitem", { name: "Studio settings Coming later" }),
    ).toHaveAttribute("data-disabled");
    fireEvent.click(screen.getByRole("menuitem", { name: "Create Studio" }));

    expect(
      await screen.findByRole("heading", { level: 2, name: "Create a Studio" }),
    ).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Studio name" }), {
      target: { value: "Field Notes" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Studio" }));
    await screen.findByRole("heading", { level: 1, name: "Field Notes" });

    fireEvent.pointerDown(
      screen.getByRole("button", {
        name: "Switch Studio. Current Studio: Field Notes",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Public Sphere" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Public Sphere",
      }),
    ).toBeVisible();
    await expect(api.app.getApplicationSettings()).resolves.toMatchObject({
      ok: true,
      data: {
        lastRoute: "/studio/8d9df01f-2584-4b9a-ad13-a96d673918e9",
        lastStudioId: "8d9df01f-2584-4b9a-ad13-a96d673918e9",
      },
    });
  });

  it("keeps the current Studio open when persisting a switch fails", async () => {
    const baseApi = createMockDesktopApi();
    await baseApi.studios.create({ name: "Public Sphere" });
    await baseApi.studios.create({ name: "Field Notes" });
    const api = Object.freeze({
      ...baseApi,
      app: Object.freeze({
        ...baseApi.app,
        updateNavigation: async () => ({
          ok: false as const,
          error: {
            code: "PERSISTENCE_FAILURE" as const,
            message: "Showflow could not save navigation settings.",
          },
        }),
      }),
    }) satisfies ShowflowDesktopApi;
    renderApp(`/studio/${DEFAULT_STUDIO_ID}`, api);

    await screen.findByRole("heading", { level: 1, name: "Public Sphere" });
    fireEvent.pointerDown(
      screen.getByRole("button", {
        name: "Switch Studio. Current Studio: Public Sphere",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Field Notes" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The current Studio remains open. Try again.",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Public Sphere" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { level: 1, name: "Field Notes" }),
    ).not.toBeInTheDocument();
  });

  it("offers a retry when other Studios cannot be loaded", async () => {
    const baseApi = createMockDesktopApi();
    await baseApi.studios.create({ name: "Public Sphere" });
    const api = Object.freeze({
      ...baseApi,
      studios: Object.freeze({
        ...baseApi.studios,
        list: async () => ({
          ok: false as const,
          error: {
            code: "PERSISTENCE_FAILURE" as const,
            message: "Showflow could not load the Studios.",
          },
        }),
      }),
    }) satisfies ShowflowDesktopApi;
    renderApp(`/studio/${DEFAULT_STUDIO_ID}`, api);

    await screen.findByRole("heading", { level: 1, name: "Public Sphere" });
    fireEvent.pointerDown(
      screen.getByRole("button", {
        name: "Switch Studio. Current Studio: Public Sphere",
      }),
      { button: 0, ctrlKey: false },
    );

    expect(
      await screen.findByRole("menuitem", { name: "Retry loading Studios" }),
    ).toBeVisible();
  });

  it("validates the required Studio name without crossing the desktop API", async () => {
    renderApp("/studio/new");

    fireEvent.click(screen.getByRole("button", { name: "Create Studio" }));

    expect(await screen.findByText("Enter a Studio name.")).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "Studio name" }),
    ).toHaveAttribute("aria-invalid", "true");
  });

  it("shows an actionable error when a Studio route cannot be loaded", async () => {
    renderApp("/studio/8d9df01f-2584-4b9a-ad13-a96d673918e9");

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Showflow could not open this Studio",
      }),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This Studio is no longer available",
    );
    expect(
      screen.getByRole("button", { name: "Return to Studio setup" }),
    ).toBeVisible();
  });

  it("does not navigate until Studio selection is saved", async () => {
    const baseApi = createMockDesktopApi();
    const api = Object.freeze({
      ...baseApi,
      app: Object.freeze({
        ...baseApi.app,
        updateNavigation: async () => ({
          ok: false as const,
          error: {
            code: "PERSISTENCE_FAILURE" as const,
            message: "Showflow could not save navigation settings.",
          },
        }),
      }),
    }) satisfies ShowflowDesktopApi;
    renderApp("/studio/new", api);

    fireEvent.change(screen.getByRole("textbox", { name: "Studio name" }), {
      target: { value: "Public Sphere" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Studio" }));

    expect(
      await screen.findByText(
        "The Studio was created, but Showflow could not select it. Try opening it again.",
      ),
    ).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Open Studio" })).toBeEnabled(),
    );
    expect(
      screen.queryByRole("heading", { level: 1, name: "Public Sphere" }),
    ).not.toBeInTheDocument();
  });
});
