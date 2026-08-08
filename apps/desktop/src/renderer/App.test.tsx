import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import type { ShowDesignResult, ShowflowDesktopApi } from "@showflow/contracts";

import { App } from "./App";
import { APPLICATION_FOUNDATION_ROUTE } from "./app-routes.mts";
import {
  COMPONENT_GALLERY_ROUTE,
  GALLERY_COMPONENTS,
} from "./development/component-gallery-contract.mts";
import {
  createMockDesktopApi,
  DEFAULT_BLUEPRINT_ID,
  DEFAULT_SHOW_ID,
  DEFAULT_STUDIO_ID,
  SECOND_STUDIO_ID,
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

const createSegmentEditorFixture = async () => {
  const api = createMockDesktopApi();
  await api.studios.create({ name: "Public Sphere" });
  await api.shows.create({
    name: "Artist Interviews",
    studioId: DEFAULT_STUDIO_ID,
  });
  const result = await api.segments.create({
    blueprintId: DEFAULT_BLUEPRINT_ID,
    name: "Opening",
    position: 0,
    showId: DEFAULT_SHOW_ID,
    studioId: DEFAULT_STUDIO_ID,
  });
  if (!result.ok) throw new Error(result.error.message);
  const segment = result.data.segments.at(-1)?.segment;
  if (segment === undefined) throw new Error("Expected a created Segment.");
  return {
    api,
    route: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/segments/${segment.id}`,
    segmentId: segment.id,
  };
};

const createEpisodeSegmentEditorFixture = async () => {
  const api = createMockDesktopApi();
  await api.studios.create({ name: "Public Sphere" });
  await api.shows.create({
    name: "Artist Interviews",
    studioId: DEFAULT_STUDIO_ID,
  });
  const created = await api.segments.create({
    blueprintId: DEFAULT_BLUEPRINT_ID,
    name: "Interview",
    position: 0,
    showId: DEFAULT_SHOW_ID,
    studioId: DEFAULT_STUDIO_ID,
  });
  if (!created.ok) throw new Error(created.error.message);
  const segment = created.data.segments.at(-1)?.segment;
  const placement = created.data.blueprint.placements[0];
  if (segment === undefined || placement === undefined) {
    throw new Error("Expected a Segment and Blueprint placement.");
  }
  let editorResult = await api.segments.getEditor({
    showId: DEFAULT_SHOW_ID,
    showSegmentId: segment.id,
    studioId: DEFAULT_STUDIO_ID,
  });
  if (!editorResult.ok) throw new Error(editorResult.error.message);
  let editor = editorResult.data;
  editorResult = await api.segments.updateDetails({
    expectedDurationMs: 60_000,
    expectedUpdatedAt: editorResult.data.updatedAt,
    name: "Interview",
    notesTemplate: "Introduce the guest.",
    showId: DEFAULT_SHOW_ID,
    showSegmentId: segment.id,
    studioId: DEFAULT_STUDIO_ID,
  });
  if (!editorResult.ok) throw new Error(editorResult.error.message);

  const addField = async (
    label: string,
    type:
      | "shortText"
      | "longText"
      | "number"
      | "boolean"
      | "imageResource"
      | "videoResource"
      | "audioResource",
    required: boolean,
    defaultValue: string | number | boolean | null,
  ): Promise<void> => {
    const added = await api.segments.createField({
      expectedUpdatedAt: editor.updatedAt,
      label,
      showId: DEFAULT_SHOW_ID,
      showSegmentId: segment.id,
      studioId: DEFAULT_STUDIO_ID,
      type,
    });
    if (!added.ok) throw new Error(added.error.message);
    const field = added.data.dataFields.at(-1);
    if (field === undefined) throw new Error("Expected a Segment field.");
    const updated = await api.segments.updateField({
      defaultValue,
      expectedUpdatedAt: added.data.updatedAt,
      fieldId: field.id,
      helpText: null,
      label,
      required,
      showId: DEFAULT_SHOW_ID,
      showSegmentId: segment.id,
      studioId: DEFAULT_STUDIO_ID,
      type,
    });
    if (!updated.ok) throw new Error(updated.error.message);
    editor = updated.data;
  };

  await addField("Guest name", "shortText", true, null);
  await addField("Talking points", "longText", false, null);
  await addField("Rank", "number", true, 1);
  await addField("Approved", "boolean", true, false);
  await addField("Artwork", "imageResource", false, null);
  await addField("Clip", "videoResource", false, null);
  await addField("Theme music", "audioResource", false, null);
  const duplicated = await api.blueprints.duplicatePlacement({
    blueprintId: DEFAULT_BLUEPRINT_ID,
    placementId: placement.id,
    showId: DEFAULT_SHOW_ID,
    studioId: DEFAULT_STUDIO_ID,
  });
  if (!duplicated.ok) throw new Error(duplicated.error.message);
  const episodeResult = await api.episodes.create({
    showId: DEFAULT_SHOW_ID,
    source: "blueprint",
    studioId: DEFAULT_STUDIO_ID,
    title: "Episode 24",
  });
  if (!episodeResult.ok) throw new Error(episodeResult.error.message);
  const first = episodeResult.data.items[0];
  const second = episodeResult.data.items[1];
  if (first === undefined || second === undefined) {
    throw new Error("Expected two Episode Segment occurrences.");
  }
  return {
    api,
    firstId: first.episodeSegment.id,
    route: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/episodes/${episodeResult.data.episode.id}/segments/${first.episodeSegment.id}`,
    secondId: second.episodeSegment.id,
    segmentId: segment.id,
  };
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
    expect(
      within(appBar).getByRole("heading", {
        level: 1,
        name: "Showflow is ready.",
      }),
    ).toHaveFocus();
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

  it("opens the selected persisted Studio instead of Studio creation", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.studios.create({ name: "Field Notes" });
    await api.app.updateNavigation({
      lastRoute: `/studio/${SECOND_STUDIO_ID}`,
      lastStudioId: SECOND_STUDIO_ID,
    });
    renderApp("/", api);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Shows" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Switch Studio. Current Studio: Field Notes",
      }),
    ).toBeVisible();
    fireEvent.pointerDown(
      screen.getByRole("button", {
        name: "Switch Studio. Current Studio: Field Notes",
      }),
      { button: 0, ctrlKey: false },
    );
    expect(
      await screen.findByRole("menuitem", { name: "Public Sphere" }),
    ).toBeVisible();
  });

  it("falls back to the first persisted Studio and saves its selection", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    renderApp("/", api);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Shows",
      }),
    ).toBeVisible();
    await expect(api.app.getApplicationSettings()).resolves.toMatchObject({
      ok: true,
      data: {
        lastRoute: `/studio/${DEFAULT_STUDIO_ID}`,
        lastStudioId: DEFAULT_STUDIO_ID,
      },
    });
  });

  it("restores a persisted Show Detail route", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.app.updateNavigation({
      lastRoute: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}`,
      lastStudioId: DEFAULT_STUDIO_ID,
    });
    renderApp("/", api);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Artist Interviews",
      }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Create New Episode",
      }),
    ).toBeVisible();
    await expect(api.app.getApplicationSettings()).resolves.toMatchObject({
      ok: true,
      data: {
        lastRoute: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}`,
        lastStudioId: DEFAULT_STUDIO_ID,
      },
    });
  });

  it("restores a persisted Design Show route", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.app.updateNavigation({
      lastRoute: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design`,
      lastStudioId: DEFAULT_STUDIO_ID,
    });
    renderApp("/", api);

    expect(
      await screen.findByRole("heading", {
        name: "Design your Show’s default Storyboard",
      }),
    ).toBeVisible();
    await expect(api.app.getApplicationSettings()).resolves.toMatchObject({
      ok: true,
      data: {
        lastRoute: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/blueprint`,
        lastStudioId: DEFAULT_STUDIO_ID,
      },
    });
    fireEvent.click(
      screen.getByRole("link", { name: "Back to Show overview" }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Create New Episode",
      }),
    ).toBeVisible();
  });

  it("creates a reusable Segment from the empty Blueprint and keeps scope visible", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design`,
      api,
    );

    expect(await screen.findByRole("tab", { name: "Blueprint" })).toBeVisible();
    expect(
      screen.getAllByText("Changes become the default for future Episodes.")[0],
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: "Segments" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Layouts" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Add Segment" }));
    const picker = await screen.findByRole("dialog", { name: "Add Segment" });
    fireEvent.change(
      within(picker).getByRole("textbox", { name: /Segment name/ }),
      {
        target: { value: "Opening" },
      },
    );
    fireEvent.change(
      within(picker).getByRole("textbox", { name: "Description (optional)" }),
      { target: { value: "Welcome the audience." } },
    );
    fireEvent.click(
      within(picker).getByRole("button", { name: "Create and Add" }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Opening" }),
    ).toBeVisible();
    expect(screen.getByText("Welcome the audience.")).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Back to Blueprint" }));
    const storyboard = await screen.findByRole("list", {
      name: "Show Blueprint Storyboard",
    });
    expect(within(storyboard).getByText("Opening")).toBeVisible();
    expect(screen.getByText("Saved")).toBeVisible();
  });

  it("keeps Design Show sections durable and exposes one contextual primary command", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    const view = renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/segments`,
      api,
    );

    expect(
      await screen.findByRole("tab", { name: "Segments" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("button", { name: "New Segment" })).toHaveLength(
      1,
    );
    await waitFor(async () =>
      expect(await api.app.getApplicationSettings()).toMatchObject({
        ok: true,
        data: {
          lastRoute: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/segments`,
        },
      }),
    );

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Layouts" }), {
      button: 0,
      ctrlKey: false,
    });
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Layouts" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    expect(
      screen.queryByRole("button", { name: "New Layout" }),
    ).not.toBeInTheDocument();
    await waitFor(async () =>
      expect(await api.app.getApplicationSettings()).toMatchObject({
        ok: true,
        data: {
          lastRoute: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/layouts`,
        },
      }),
    );

    view.unmount();
    renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/layouts`,
      api,
    );
    expect(await screen.findByRole("tab", { name: "Layouts" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("returns a Show Segment editor to the Segment Catalog origin", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.segments.create({
      blueprintId: DEFAULT_BLUEPRINT_ID,
      name: "Opening",
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/segments`,
      api,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Open" }));
    expect(
      await screen.findByRole("link", { name: "Back to Segments" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Return/u }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Back to Segments" }));
    expect(
      await screen.findByRole("tab", { name: "Segments" }),
    ).toHaveAttribute("aria-selected", "true");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Open" })).toHaveFocus(),
    );
  });

  it("duplicates, removes, and persistently undoes Blueprint structure", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.segments.create({
      blueprintId: DEFAULT_BLUEPRINT_ID,
      name: "Opening",
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design`,
      api,
    );

    const storyboard = await screen.findByRole("list", {
      name: "Show Blueprint Storyboard",
    });
    const more = within(storyboard).getByRole("button", {
      name: "More actions for Opening",
    });
    fireEvent.pointerDown(more, { button: 0, ctrlKey: false });
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Duplicate placement" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(2),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Undo Blueprint change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(1),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Redo Blueprint change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(2),
    );

    const duplicateItems = within(storyboard).getAllByRole("listitem");
    const secondDuplicate = duplicateItems[1];
    if (secondDuplicate === undefined) {
      throw new Error("Expected the duplicate Blueprint placement.");
    }
    fireEvent.pointerDown(
      within(secondDuplicate).getByRole("button", {
        name: "More actions for Opening",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove from Blueprint" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(1),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Undo Blueprint change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(2),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Redo Blueprint change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(1),
    );

    const addSegmentButton = screen.getAllByRole("button", {
      name: "Add Segment",
    })[0];
    if (addSegmentButton === undefined) {
      throw new Error("Expected the Add Segment action.");
    }
    fireEvent.click(addSegmentButton);
    const picker = await screen.findByRole("dialog", { name: "Add Segment" });
    fireEvent.click(within(picker).getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(2),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Undo Blueprint change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(1),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Redo Blueprint change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(2),
    );

    const refreshed = await api.shows.getDesign({
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    expect(refreshed).toMatchObject({
      ok: true,
      data: { blueprint: { placementCount: 2 } },
    });
  });

  it("reorders without pointer input and persistently undoes and redoes the order", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.segments.create({
      blueprintId: DEFAULT_BLUEPRINT_ID,
      name: "Opening",
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.segments.create({
      blueprintId: DEFAULT_BLUEPRINT_ID,
      name: "Interview",
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design`,
      api,
    );

    const storyboard = await screen.findByRole("list", {
      name: "Show Blueprint Storyboard",
    });
    const orderedNames = (): string[] =>
      within(storyboard)
        .getAllByRole("listitem")
        .map(
          (item) =>
            within(item).getByRole("heading", { level: 3 }).textContent ?? "",
        );
    expect(orderedNames()).toEqual(["Opening", "Interview"]);

    const more = within(storyboard).getByRole("button", {
      name: "More actions for Opening",
    });
    more.focus();
    fireEvent.keyDown(more, { key: "Enter" });
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Move later" }),
    );
    await waitFor(() =>
      expect(orderedNames()).toEqual(["Interview", "Opening"]),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Undo Blueprint change" }),
    );
    await waitFor(() =>
      expect(orderedNames()).toEqual(["Opening", "Interview"]),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Redo Blueprint change" }),
    );
    await waitFor(() =>
      expect(orderedNames()).toEqual(["Interview", "Opening"]),
    );

    const refreshed = await api.shows.getDesign({
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    expect(
      refreshed.ok
        ? refreshed.data.blueprint.placements.map(
            ({ showSegmentId }) =>
              refreshed.data.segments.find(
                ({ segment }) => segment.id === showSegmentId,
              )?.segment.name,
          )
        : [],
    ).toEqual(["Interview", "Opening"]);
  });

  it("holds the dropped visual order while the reorder save is pending", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.segments.create({
      blueprintId: DEFAULT_BLUEPRINT_ID,
      name: "Opening",
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.segments.create({
      blueprintId: DEFAULT_BLUEPRINT_ID,
      name: "Interview",
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    let completeReorder: (() => void) | undefined;
    const delayedApi = {
      ...api,
      blueprints: Object.freeze({
        ...api.blueprints,
        reorder: (request) =>
          new Promise<ShowDesignResult>((resolve) => {
            completeReorder = () => {
              void api.blueprints.reorder(request).then(resolve);
            };
          }),
      }),
    } satisfies ShowflowDesktopApi;
    renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design`,
      delayedApi,
    );

    const storyboard = await screen.findByRole("list", {
      name: "Show Blueprint Storyboard",
    });
    const orderedNames = (): string[] =>
      within(storyboard)
        .getAllByRole("listitem")
        .map(
          (item) =>
            within(item).getByRole("heading", { level: 3 }).textContent ?? "",
        );
    fireEvent.pointerDown(
      within(storyboard).getByRole("button", {
        name: "More actions for Opening",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Move later" }),
    );

    await waitFor(() =>
      expect(orderedNames()).toEqual(["Interview", "Opening"]),
    );
    expect(screen.getByText("Saving…")).toBeVisible();
    const stillSaved = await api.shows.getDesign({
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    expect(
      stillSaved.ok
        ? stillSaved.data.blueprint.placements.map(
            ({ showSegmentId }) =>
              stillSaved.data.segments.find(
                ({ segment }) => segment.id === showSegmentId,
              )?.segment.name,
          )
        : [],
    ).toEqual(["Opening", "Interview"]);

    if (completeReorder === undefined) {
      throw new Error("Expected the pending reorder save.");
    }
    completeReorder();
    await waitFor(() => expect(screen.getByText("Saved")).toBeVisible());
    expect(orderedNames()).toEqual(["Interview", "Opening"]);
  });

  it("keeps the saved order visible and reports a failed reorder", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.segments.create({
      blueprintId: DEFAULT_BLUEPRINT_ID,
      name: "Opening",
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.segments.create({
      blueprintId: DEFAULT_BLUEPRINT_ID,
      name: "Interview",
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    const failingApi = {
      ...api,
      blueprints: Object.freeze({
        ...api.blueprints,
        reorder: async () => ({
          ok: false as const,
          error: {
            code: "PERSISTENCE_FAILURE" as const,
            message:
              "Showflow could not save the Blueprint change. Your saved Storyboard was not changed. Try again.",
          },
        }),
      }),
    } satisfies ShowflowDesktopApi;
    renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design`,
      failingApi,
    );

    const storyboard = await screen.findByRole("list", {
      name: "Show Blueprint Storyboard",
    });
    fireEvent.pointerDown(
      within(storyboard).getByRole("button", {
        name: "More actions for Opening",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Move later" }),
    );

    expect(await screen.findByText("Could not save")).toBeVisible();
    expect(
      screen.getByText(/Your saved Storyboard was not changed/u),
    ).toBeVisible();
    expect(
      within(storyboard)
        .getAllByRole("listitem")
        .map(
          (item) => within(item).getByRole("heading", { level: 3 }).textContent,
        ),
    ).toEqual(["Opening", "Interview"]);
  });

  it("falls back to Studio Home when the persisted Show no longer exists", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.app.updateNavigation({
      lastRoute: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}`,
      lastStudioId: DEFAULT_STUDIO_ID,
    });
    renderApp("/", api);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Shows",
      }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Create your first Show",
      }),
    ).toBeVisible();
    await expect(api.app.getApplicationSettings()).resolves.toMatchObject({
      ok: true,
      data: {
        lastRoute: `/studio/${DEFAULT_STUDIO_ID}`,
        lastStudioId: DEFAULT_STUDIO_ID,
      },
    });
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
        name: "Shows",
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
        name: "Design Show",
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
    expect(
      screen.getByRole("heading", { level: 2, name: "Create New Episode" }),
    ).toBeVisible();
    await expect(api.app.getApplicationSettings()).resolves.toMatchObject({
      ok: true,
      data: {
        lastRoute: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}`,
        lastStudioId: DEFAULT_STUDIO_ID,
      },
    });
  });

  it("searches Show names only within the current Studio", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.studios.create({ name: "Field Notes" });
    await api.shows.create({
      studioId: DEFAULT_STUDIO_ID,
      name: "Artist Interviews",
    });
    await api.shows.create({
      studioId: DEFAULT_STUDIO_ID,
      name: "Weekly Commentary",
    });
    await api.shows.create({
      studioId: SECOND_STUDIO_ID,
      name: "Field Interviews",
    });
    renderApp(`/studio/${DEFAULT_STUDIO_ID}`, api);

    const search = await screen.findByRole("searchbox", {
      name: "Search Shows",
    });
    expect(search).toBeEnabled();
    fireEvent.change(search, { target: { value: "INTERVIEW" } });

    expect(
      screen.getByRole("button", { name: "Artist Interviews" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Weekly Commentary" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Field Interviews" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 Show found");

    fireEvent.change(search, { target: { value: "missing" } });
    expect(screen.getByRole("status")).toHaveTextContent("0 Shows found");
    expect(
      screen.getByRole("heading", { name: "No Shows found" }),
    ).toBeVisible();
    expect(screen.getByText(/No Shows in Public Sphere match/u)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Clear Search" }));
    expect(search).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Artist Interviews" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Weekly Commentary" }),
    ).toBeVisible();
  });

  it("prioritizes Show Detail actions and exposes empty Episode placeholders", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      studioId: DEFAULT_STUDIO_ID,
      name: "Artist Interviews",
      description: "Weekly artist interviews.",
    });
    renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/514ad6df-710d-4301-9bff-b096e9db3dd4`,
      api,
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Artist Interviews",
      }),
    ).toBeVisible();
    const createEpisode = screen.getByRole("heading", {
      level: 2,
      name: "Create New Episode",
    });
    const designShow = screen.getByRole("heading", {
      level: 2,
      name: "Design Show",
    });
    const recentEpisodes = screen.getByRole("heading", {
      level: 2,
      name: "Recent Episodes",
    });

    expect(
      createEpisode.compareDocumentPosition(designShow) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      designShow.compareDocumentPosition(recentEpisodes) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("0 Segment placements")).toBeVisible();
    expect(screen.getByText("0 Layouts")).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "No Episodes yet" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Create New Episode" }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Open Design Show" }));
    expect(
      await screen.findByRole("heading", {
        name: "Design your Show’s default Storyboard",
      }),
    ).toBeVisible();
    await expect(api.app.getApplicationSettings()).resolves.toMatchObject({
      ok: true,
      data: {
        lastRoute: `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/design/blueprint`,
        lastStudioId: DEFAULT_STUDIO_ID,
      },
    });
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
    await screen.findByRole("heading", { level: 1, name: "Shows" });

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
    await screen.findByRole("heading", { level: 1, name: "Shows" });

    fireEvent.pointerDown(
      screen.getByRole("button", {
        name: "Switch Studio. Current Studio: Field Notes",
      }),
      { button: 0, ctrlKey: false },
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Public Sphere" }));

    expect(
      await screen.findByRole("button", {
        name: "Switch Studio. Current Studio: Public Sphere",
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

    const studioSwitcher = await screen.findByRole("button", {
      name: "Switch Studio. Current Studio: Public Sphere",
    });
    fireEvent.pointerDown(studioSwitcher, { button: 0, ctrlKey: false });
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Field Notes" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The current Studio remains open. Try again.",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Shows" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: "Switch Studio. Current Studio: Field Notes",
      }),
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

    const studioSwitcher = await screen.findByRole("button", {
      name: "Switch Studio. Current Studio: Public Sphere",
    });
    fireEvent.pointerDown(studioSwitcher, { button: 0, ctrlKey: false });

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
    expect(screen.getByRole("button", { name: "Studio setup" })).toBeVisible();
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

  it("6.T8 opens Design Show from an empty Blueprint choice", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/episodes/new`,
      api,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Design Show" }));
    expect(
      await screen.findByRole("heading", { level: 2, name: "Show Blueprint" }),
    ).toBeVisible();
  });

  it("6.T8 and 6.T9 creates an explicit blank Episode and keeps Episode scope visible", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Artist Interviews",
      studioId: DEFAULT_STUDIO_ID,
    });
    renderApp(
      `/studio/${DEFAULT_STUDIO_ID}/show/${DEFAULT_SHOW_ID}/episodes/new`,
      api,
    );

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Create a new Episode",
      }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Design Show" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Create Blank Episode" }),
    ).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Episode title" }), {
      target: { value: "Week 32" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create Blank Episode" }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Week 32" }),
    ).toBeVisible();
    expect(
      screen.getByText("Artist Interviews", { selector: "strong" }),
    ).toBeVisible();
    expect(
      screen.getAllByText("Changes apply only to this Episode.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: "Build this Episode’s Storyboard",
      }),
    ).toBeVisible();
  });

  it("6.T11 and 6.T12 creates from Blueprint and persistently undoes every structural change", async () => {
    const api = createMockDesktopApi();
    await api.studios.create({ name: "Public Sphere" });
    await api.shows.create({
      name: "Top 10 Music Videos",
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.segments.create({
      blueprintId: DEFAULT_BLUEPRINT_ID,
      name: "Opening",
      position: 0,
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    await api.segments.create({
      blueprintId: DEFAULT_BLUEPRINT_ID,
      name: "Closing",
      position: 1,
      showId: DEFAULT_SHOW_ID,
      studioId: DEFAULT_STUDIO_ID,
    });
    renderApp(`/studio/${DEFAULT_STUDIO_ID}`, api);
    expect(await screen.findByText("0 Episodes")).toBeVisible();
    fireEvent.click(
      await screen.findByRole("button", { name: "Top 10 Music Videos" }),
    );
    const createEpisodeButton = (
      await screen.findAllByRole("button", { name: "Create New Episode" })
    )[0];
    if (createEpisodeButton === undefined) {
      throw new Error("Expected a Create New Episode action.");
    }
    fireEvent.click(createEpisodeButton);
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Episode title" }),
      { target: { value: "Episode 24" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Episode" }));

    const storyboard = await screen.findByRole("list", {
      name: "Episode Storyboard",
    });
    const names = (): string[] =>
      within(storyboard)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent ?? "");
    const openActions = (name: string): void => {
      fireEvent.pointerDown(
        screen.getByRole("button", { name: `More actions for ${name}` }),
        { button: 0, ctrlKey: false },
      );
    };
    expect(within(storyboard).getAllByRole("listitem")).toHaveLength(2);
    expect(names()).toEqual(["Opening", "Closing"]);

    openActions("Opening");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Move later" }),
    );
    await waitFor(() => expect(names()).toEqual(["Closing", "Opening"]));
    fireEvent.click(
      screen.getByRole("button", { name: "Undo Episode change" }),
    );
    await waitFor(() => expect(names()).toEqual(["Opening", "Closing"]));
    fireEvent.click(
      screen.getByRole("button", { name: "Redo Episode change" }),
    );
    await waitFor(() => expect(names()).toEqual(["Closing", "Opening"]));
    fireEvent.click(
      screen.getByRole("button", { name: "Undo Episode change" }),
    );
    await waitFor(() => expect(names()).toEqual(["Opening", "Closing"]));

    openActions("Opening");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Duplicate Segment" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(3),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Undo Episode change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(2),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Redo Episode change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(3),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Undo Episode change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(2),
    );

    openActions("Opening");
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Remove from Episode" }),
    );
    await waitFor(() => expect(names()).toEqual(["Closing"]));
    fireEvent.click(
      screen.getByRole("button", { name: "Undo Episode change" }),
    );
    await waitFor(() => expect(names()).toEqual(["Opening", "Closing"]));
    fireEvent.click(
      screen.getByRole("button", { name: "Redo Episode change" }),
    );
    await waitFor(() => expect(names()).toEqual(["Closing"]));
    fireEvent.click(
      screen.getByRole("button", { name: "Undo Episode change" }),
    );
    await waitFor(() => expect(names()).toEqual(["Opening", "Closing"]));

    const firstAddSegmentButton = screen.getAllByRole("button", {
      name: "Add Segment",
    })[0];
    if (firstAddSegmentButton === undefined) {
      throw new Error("Expected an Add Segment action.");
    }
    fireEvent.click(firstAddSegmentButton);
    const picker = await screen.findByRole("dialog", { name: "Add Segment" });
    const firstCatalogAddButton = within(picker).getAllByRole("button", {
      name: "Add",
    })[0];
    if (firstCatalogAddButton === undefined) {
      throw new Error("Expected a Catalog Segment to add.");
    }
    fireEvent.click(firstCatalogAddButton);
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(3),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Undo Episode change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(2),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Redo Episode change" }),
    );
    await waitFor(() =>
      expect(within(storyboard).getAllByRole("listitem")).toHaveLength(3),
    );

    fireEvent.click(
      screen.getByRole("link", { name: "Back to Show overview" }),
    );
    expect(
      await screen.findByRole("button", { name: "Episode 24" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Back to Shows" }));
    expect(await screen.findByText("1 Episode")).toBeVisible();
  });

  it("7.T5 and 7.T6 opens the Show-scoped editor with exactly five phases and Active selected", async () => {
    const fixture = await createSegmentEditorFixture();
    renderApp(fixture.route, fixture.api);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Opening" }),
    ).toBeVisible();
    expect(
      screen.getByText("Changes affect future uses of this Segment."),
    ).toBeVisible();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Prepare",
      "Enter",
      "Active",
      "Exit",
      "Cleanup",
    ]);
    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByText("Choose the default Layout in Sprint 10"),
    ).toBeVisible();

    expect(screen.getByRole("tab", { name: "Prepare" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Cleanup" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("7.T6, 7.T7, and 7.T10 autosaves coalesced details and persistently undoes them", async () => {
    const fixture = await createSegmentEditorFixture();
    const updateDetails = vi.fn(fixture.api.segments.updateDetails);
    const api: ShowflowDesktopApi = {
      ...fixture.api,
      segments: { ...fixture.api.segments, updateDetails },
    };
    renderApp(fixture.route, api);

    fireEvent.click(
      await screen.findByRole("button", { name: "Show Segment inspector" }),
    );
    const name = await screen.findByRole("textbox", { name: "Segment name" });
    fireEvent.change(name, { target: { value: "Opening interview" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Minutes" }), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Seconds" }), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Notes template" }), {
      target: { value: "Welcome the guest.\nConfirm pronunciation." },
    });

    await waitFor(() => expect(updateDetails).toHaveBeenCalledTimes(1), {
      timeout: 2_000,
    });
    const saved = await api.segments.getEditor({
      showId: DEFAULT_SHOW_ID,
      showSegmentId: fixture.segmentId,
      studioId: DEFAULT_STUDIO_ID,
    });
    expect(saved).toMatchObject({
      ok: true,
      data: {
        expectedDurationMs: 150_000,
        name: "Opening interview",
        notesTemplate: "Welcome the guest.\nConfirm pronunciation.",
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Undo Segment change" }),
    );
    await waitFor(async () => {
      const undone = await api.segments.getEditor({
        showId: DEFAULT_SHOW_ID,
        showSegmentId: fixture.segmentId,
        studioId: DEFAULT_STUDIO_ID,
      });
      expect(undone).toMatchObject({
        ok: true,
        data: { expectedDurationMs: null, name: "Opening", notesTemplate: "" },
      });
    });
    await waitFor(() => expect(name).toHaveValue("Opening"));
  });

  it("shows a saved Show Segment duration on its Blueprint card", async () => {
    const fixture = await createSegmentEditorFixture();
    renderApp(fixture.route, fixture.api);

    fireEvent.click(
      await screen.findByRole("button", { name: "Show Segment inspector" }),
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "Minutes" }), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Seconds" }), {
      target: { value: "30" },
    });
    await waitFor(
      async () => {
        const saved = await fixture.api.segments.getEditor({
          showId: DEFAULT_SHOW_ID,
          showSegmentId: fixture.segmentId,
          studioId: DEFAULT_STUDIO_ID,
        });
        expect(saved).toMatchObject({
          ok: true,
          data: { expectedDurationMs: 150_000 },
        });
      },
      { timeout: 2_000 },
    );

    fireEvent.click(screen.getByRole("link", { name: "Back to Segments" }));
    fireEvent.mouseDown(await screen.findByRole("tab", { name: "Blueprint" }), {
      button: 0,
      ctrlKey: false,
    });
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Blueprint" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );

    expect(await screen.findByText("150 sec", { exact: true })).toBeVisible();
  });

  it("7.T9 serializes autosaves so an older response cannot replace the newest edit", async () => {
    const fixture = await createSegmentEditorFixture();
    const baseUpdateDetails = fixture.api.segments.updateDetails;
    let requestNumber = 0;
    const updateDetails = vi.fn(
      async (request: Parameters<typeof baseUpdateDetails>[0]) => {
        requestNumber += 1;
        if (requestNumber === 1) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 700);
          });
        }
        return baseUpdateDetails(request);
      },
    );
    const api: ShowflowDesktopApi = {
      ...fixture.api,
      segments: { ...fixture.api.segments, updateDetails },
    };
    renderApp(fixture.route, api);
    fireEvent.click(
      await screen.findByRole("button", { name: "Show Segment inspector" }),
    );
    const name = await screen.findByRole("textbox", { name: "Segment name" });

    fireEvent.change(name, { target: { value: "Older name" } });
    await waitFor(() => expect(updateDetails).toHaveBeenCalledTimes(1), {
      timeout: 1_500,
    });
    fireEvent.change(name, { target: { value: "Newest name" } });
    await waitFor(() => expect(updateDetails).toHaveBeenCalledTimes(2), {
      timeout: 2_500,
    });
    await waitFor(
      async () => {
        const saved = await api.segments.getEditor({
          showId: DEFAULT_SHOW_ID,
          showSegmentId: fixture.segmentId,
          studioId: DEFAULT_STUDIO_ID,
        });
        expect(saved).toMatchObject({
          ok: true,
          data: { name: "Newest name" },
        });
      },
      { timeout: 2_500 },
    );
  });

  it("7.T1 through 7.T4 creates, edits, reorders, and deletes fields without changing their keys", async () => {
    const fixture = await createSegmentEditorFixture();
    renderApp(fixture.route, fixture.api);
    await screen.findByRole("heading", { level: 1, name: "Opening" });
    fireEvent.click(
      screen.getByRole("button", { name: "Show Segment inspector" }),
    );

    const newFieldLabel = screen.getByRole("textbox", {
      name: "New field label",
    });
    fireEvent.change(newFieldLabel, { target: { value: "Guest name" } });
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    expect(await screen.findByText("guestName")).toBeVisible();

    const fieldLabel = screen.getByRole("textbox", { name: "Field label" });
    fireEvent.change(fieldLabel, { target: { value: "Featured guest" } });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Required for every Episode" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Help text" }), {
      target: { value: "Use the guest's preferred on-air name." },
    });
    await waitFor(() => expect(fieldLabel).toHaveValue("Featured guest"));
    await waitFor(
      async () => {
        const saved = await fixture.api.segments.getEditor({
          showId: DEFAULT_SHOW_ID,
          showSegmentId: fixture.segmentId,
          studioId: DEFAULT_STUDIO_ID,
        });
        expect(saved).toMatchObject({
          ok: true,
          data: {
            dataFields: [
              {
                helpText: "Use the guest's preferred on-air name.",
                key: "guestName",
                label: "Featured guest",
                required: true,
              },
            ],
          },
        });
      },
      { timeout: 2_000 },
    );

    fireEvent.change(newFieldLabel, { target: { value: "Pronouns" } });
    fireEvent.click(screen.getByRole("button", { name: "Add field" }));
    expect(await screen.findByText("pronouns")).toBeVisible();
    const secondMoveUp = screen.getAllByRole("button", { name: "Move up" })[1];
    if (secondMoveUp === undefined) throw new Error("Expected a second field.");
    fireEvent.click(secondMoveUp);
    await waitFor(() => {
      const keys = screen.getAllByText(/guestName|pronouns/);
      expect(keys.map((key) => key.textContent)).toEqual([
        "pronouns",
        "guestName",
      ]);
    });
    const firstDelete = screen.getAllByRole("button", {
      name: "Delete field",
    })[0];
    if (firstDelete === undefined)
      throw new Error("Expected a field to delete.");
    fireEvent.click(firstDelete);
    await waitFor(() =>
      expect(screen.queryByText("pronouns")).not.toBeInTheDocument(),
    );
  });

  it("8.T3, 8.T4, 8.T5, 8.T6, and 8.T10 renders dynamic content, saves it, and focuses validation", async () => {
    const fixture = await createEpisodeSegmentEditorFixture();
    renderApp(fixture.route, fixture.api);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Interview" }),
    ).toBeVisible();
    expect(
      screen.getAllByText("Changes apply only to this Episode.").length,
    ).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole("button", { name: "Show Episode Segment inspector" }),
    );
    const validationIssue = screen.getByRole("button", {
      name: "The Interview Segment needs Guest name. Add it before rehearsal.",
    });
    fireEvent.click(validationIssue);
    expect(
      await screen.findByRole("textbox", { name: /Guest name/u }),
    ).toHaveFocus();

    fireEvent.change(screen.getByRole("textbox", { name: /Guest name/u }), {
      target: { value: "<script>Ada</script>" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Talking points" }), {
      target: { value: "Discuss the new record." },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Rank" }), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Approved" }), {
      target: { value: "true" },
    });
    expect(screen.getByRole("button", { name: "Choose image" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Choose video" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Choose audio" })).toBeEnabled();
    const notes = screen.getByRole("textbox", { name: "Episode notes" });
    expect(notes).toHaveValue("Introduce the guest.");
    fireEvent.change(notes, { target: { value: "Ask about the tour." } });

    await waitFor(
      () => expect(screen.getByText("Saved", { exact: true })).toBeVisible(),
      { timeout: 2_000 },
    );
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    const source = await fixture.api.segments.getEditor({
      showId: DEFAULT_SHOW_ID,
      showSegmentId: fixture.segmentId,
      studioId: DEFAULT_STUDIO_ID,
    });
    expect(source).toMatchObject({
      ok: true,
      data: { notesTemplate: "Introduce the guest." },
    });
  });

  it("8.T7, 8.T8, and 8.T9 resets overrides and flushes before Previous/Next navigation", async () => {
    const fixture = await createEpisodeSegmentEditorFixture();
    renderApp(fixture.route, fixture.api);
    await screen.findByRole("heading", { level: 1, name: "Interview" });
    fireEvent.click(
      screen.getByRole("button", { name: "Open Episode content" }),
    );

    expect(
      screen.getByRole("button", { name: "Previous Segment" }),
    ).toBeDisabled();
    expect(screen.getByText("Segment 1 of 2")).toBeVisible();
    const guest = screen.getByRole("textbox", { name: /Guest name/u });
    fireEvent.change(guest, { target: { value: "First guest" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Show Episode Segment inspector" }),
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "Minutes" }), {
      target: { value: "2" },
    });
    const resetDuration = screen
      .getAllByRole("button", { name: "Reset to Show default" })
      .at(-1);
    if (resetDuration === undefined) {
      throw new Error("Expected a duration reset action.");
    }
    fireEvent.click(resetDuration);
    fireEvent.click(
      screen.getByRole("button", { name: "Next Segment: Interview" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Previous Segment: Interview" }),
      ).toBeEnabled(),
    );
    expect(screen.getByRole("button", { name: "Next Segment" })).toBeDisabled();
    expect(screen.getByText("Segment 2 of 2")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Previous Segment: Interview" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Open Episode content" }),
    );
    expect(
      await screen.findByRole("textbox", { name: /Guest name/u }),
    ).toHaveValue("First guest");
  });
});
