import { beforeEach, describe, expect, it } from "vitest";

import {
  createFixedClock,
  createShowSegment,
  parseEntityId,
  parseUtcTimestamp,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type ShowId,
  type Layout,
  type LayoutId,
  type Resource,
  type ResourceId,
  type Show,
  type ShowSegment,
  type ShowSegmentId,
} from "@showflow/domain";

import {
  CreateSegmentDataFieldCommand,
  DeleteSegmentDataFieldCommand,
  ReorderSegmentDataFieldsCommand,
  UpdateSegmentDataFieldCommand,
  UpdateSegmentLifecycleActionsCommand,
  UpdateSegmentActiveLayoutsCommand,
  UpdateShowSegmentDetailsCommand,
} from "./segment-editor-commands.mjs";
import type {
  SegmentDataFieldUsageRepository,
  SegmentFieldBindingUsage,
  LayoutRepository,
  ResourceRepository,
  ShowSegmentRepository,
  ShowRepository,
} from "../repositories/repositories.mjs";

const timestamp = parseUtcTimestamp("2026-08-07T12:00:00.000Z");
const laterTimestamp = parseUtcTimestamp("2026-08-07T12:01:00.000Z");
let idCounter = 10;
const entityId = <TEntity extends EntityIdKind>(
  suffix: number,
): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b900-${suffix.toString(16).padStart(12, "0")}`,
  );
const dependencies: DomainFactoryDependencies = {
  clock: createFixedClock(laterTimestamp),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    entityId<TEntity>(idCounter++),
};

class MemorySegmentEditorRepository
  implements ShowSegmentRepository, SegmentDataFieldUsageRepository
{
  segment: ShowSegment;
  usageCount = 0;
  bindingUsages: readonly SegmentFieldBindingUsage[] = [];

  constructor(segment: ShowSegment) {
    this.segment = segment;
  }

  async countEpisodeFieldValues(): Promise<number> {
    return this.usageCount;
  }
  async listLayoutBindingUsages() {
    return this.bindingUsages;
  }

  async getById(id: ShowSegmentId): Promise<ShowSegment | null> {
    return id === this.segment.id ? this.segment : null;
  }

  async listByShowId(showId: ShowId): Promise<readonly ShowSegment[]> {
    return showId === this.segment.showId ? [this.segment] : [];
  }

  async save(segment: ShowSegment): Promise<void> {
    this.segment = segment;
  }
}

describe("Segment editor commands", () => {
  let repository: MemorySegmentEditorRepository;

  beforeEach(() => {
    idCounter = 10;
    repository = new MemorySegmentEditorRepository(
      createShowSegment(
        { showId: entityId<"show">(1), name: "Interview" },
        {
          clock: createFixedClock(timestamp),
          createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
            entityId<TEntity>(2),
        },
      ),
    );
  });

  const scope = () => ({
    expectedUpdatedAt: repository.segment.updatedAt,
    showId: repository.segment.showId,
    showSegmentId: repository.segment.id,
  });

  it("7.T1 keeps a field key stable when its label changes", async () => {
    await new CreateSegmentDataFieldCommand(repository, dependencies).execute({
      ...scope(),
      label: "Guest name",
      type: "shortText",
    });
    const created = repository.segment.dataFields[0];
    if (created === undefined) throw new Error("Expected a Segment field.");

    await new UpdateSegmentDataFieldCommand(repository, dependencies).execute({
      ...scope(),
      fieldId: created.id,
      label: "Featured guest",
      type: "shortText",
      required: true,
      defaultValue: "Jane Doe",
      helpText: "Name shown in the introduction.",
    });

    expect(repository.segment.dataFields[0]).toMatchObject({
      key: "guestName",
      label: "Featured guest",
      required: true,
      defaultValue: "Jane Doe",
    });
  });

  it("7.T3 and 7.T4 persist exact field ordering and required metadata", async () => {
    const create = new CreateSegmentDataFieldCommand(repository, dependencies);
    await create.execute({
      ...scope(),
      label: "Guest name",
      type: "shortText",
    });
    await create.execute({
      ...scope(),
      label: "Artwork",
      type: "imageResource",
    });
    const [first, second] = repository.segment.dataFields;
    if (first === undefined || second === undefined) {
      throw new Error("Expected two Segment fields.");
    }
    await new UpdateSegmentDataFieldCommand(repository, dependencies).execute({
      ...scope(),
      fieldId: second.id,
      label: second.label,
      type: second.type,
      required: true,
    });
    await new ReorderSegmentDataFieldsCommand(repository, dependencies).execute(
      {
        ...scope(),
        orderedFieldIds: [second.id, first.id],
      },
    );

    expect(
      repository.segment.dataFields.map(({ id, position }) => [id, position]),
    ).toEqual([
      [second.id, 0],
      [first.id, 1],
    ]);
    expect(repository.segment.dataFields[0]?.required).toBe(true);
  });

  it("7.T6 and 7.T7 normalize duration and persist multiline notes", async () => {
    await new UpdateShowSegmentDetailsCommand(repository, dependencies).execute(
      {
        ...scope(),
        expectedDurationMs: 90_000.4,
        name: "Interview",
        notesTemplate: "Introduce the guest.\nAsk the opening question.",
      },
    );
    expect(repository.segment).toMatchObject({
      expectedDurationMs: 90_000,
      notesTemplate: "Introduce the guest.\nAsk the opening question.",
    });
    await expect(
      new UpdateShowSegmentDetailsCommand(repository, dependencies).execute({
        ...scope(),
        expectedDurationMs: -1,
        name: "Interview",
        notesTemplate: "",
      }),
    ).rejects.toThrow("zero or a positive");
  });

  it("persists the limited Enter and Exit action APIs within the Show boundary", async () => {
    const studioId = entityId<"studio">(30);
    const show = {
      createdAt: timestamp,
      id: repository.segment.showId,
      name: "Show",
      studioId,
      styleDefaults: {},
      updatedAt: timestamp,
    } satisfies Show;
    const layout = {
      aspectRatio: "16:9",
      canvas: { height: 1080, width: 1920 },
      componentPlacements: [],
      createdAt: timestamp,
      id: entityId<"layout">(31),
      name: "Host",
      showId: show.id,
      slots: [],
      updatedAt: timestamp,
    } satisfies Layout;
    const resource = {
      availability: "available",
      category: "audio",
      createdAt: timestamp,
      displayName: "Intro sting",
      id: entityId<"resource">(32),
      mimeType: "audio/mpeg",
      owner: { scope: "show", showId: show.id },
      updatedAt: timestamp,
    } satisfies Resource;
    const layouts = new Map<LayoutId, Layout>([[layout.id, layout]]);
    const resources = new Map<ResourceId, Resource>([[resource.id, resource]]);
    const layoutRepository = {
      getById: async (id: LayoutId) => layouts.get(id) ?? null,
      listByShowId: async () => [...layouts.values()],
      save: async (value: Layout) => {
        layouts.set(value.id, value);
      },
    } satisfies LayoutRepository;
    const resourceRepository = {
      delete: async (id: ResourceId) => {
        resources.delete(id);
      },
      getById: async (id: ResourceId) => resources.get(id) ?? null,
      listByOwner: async () => [...resources.values()],
      listUsage: async () => [],
      save: async (value: Resource) => {
        resources.set(value.id, value);
      },
    } satisfies ResourceRepository;
    const showRepository = {
      getById: async () => show,
      listByStudioId: async () => [show],
      save: async () => undefined,
    } satisfies ShowRepository;
    const command = new UpdateSegmentLifecycleActionsCommand(
      {
        layouts: layoutRepository,
        resources: resourceRepository,
        segments: repository,
        shows: showRepository,
      },
      dependencies,
    );
    await command.execute({
      ...scope(),
      actions: [
        { kind: "activateLayout", layoutId: layout.id },
        { kind: "waitForAnimationCompletion" },
        { kind: "startMedia", resourceId: resource.id },
      ],
      phase: "enter",
    });
    expect(repository.segment.lifecycle.enter).toEqual([
      { kind: "activateLayout", layoutId: layout.id },
      { kind: "waitForAnimationCompletion" },
      { kind: "startMedia", resourceId: resource.id },
    ]);
    expect(repository.segment.lifecycle.prepare).toEqual([]);
    expect(repository.segment.lifecycle.cleanup).toEqual([]);

    const foreignShowId = entityId<"show">(33);
    const foreignResource = {
      ...resource,
      id: entityId<"resource">(34),
      owner: { scope: "show", showId: foreignShowId },
    } satisfies Resource;
    resources.set(foreignResource.id, foreignResource);
    await expect(
      command.execute({
        ...scope(),
        actions: [{ kind: "startMedia", resourceId: foreignResource.id }],
        phase: "exit",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const foreignLayout = {
      ...layout,
      id: entityId<"layout">(35),
      showId: foreignShowId,
    } satisfies Layout;
    layouts.set(foreignLayout.id, foreignLayout);
    await expect(
      command.execute({
        ...scope(),
        actions: [{ kind: "activateLayout", layoutId: foreignLayout.id }],
        phase: "exit",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(repository.segment.lifecycle.exit).toEqual([]);
  });

  it("blocks deletion when Episode content uses the field", async () => {
    await new CreateSegmentDataFieldCommand(repository, dependencies).execute({
      ...scope(),
      label: "Guest name",
      type: "shortText",
    });
    const field = repository.segment.dataFields[0];
    if (field === undefined) throw new Error("Expected a Segment field.");
    repository.usageCount = 2;
    await expect(
      new DeleteSegmentDataFieldCommand(repository, dependencies).execute({
        ...scope(),
        fieldId: field.id,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(repository.segment.dataFields).toHaveLength(1);
  });

  it("11.T14 blocks bound field deletion and identifies every Layout usage", async () => {
    await new CreateSegmentDataFieldCommand(repository, dependencies).execute({
      ...scope(),
      label: "Guest name",
      type: "shortText",
    });
    const field = repository.segment.dataFields[0];
    if (field === undefined) throw new Error("Expected a Segment field.");
    repository.bindingUsages = [
      {
        componentName: "Lower Third",
        layoutName: "Interview close",
        placementId: entityId<"componentPlacement">(40),
        propertyKey: "title",
      },
      {
        componentName: "Title",
        layoutName: "Guest full screen",
        placementId: entityId<"componentPlacement">(41),
        propertyKey: "text",
      },
    ];

    await expect(
      new DeleteSegmentDataFieldCommand(repository, dependencies).execute({
        ...scope(),
        fieldId: field.id,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining(
        "Interview close — Lower Third (title), Guest full screen — Title (text)",
      ),
    });
    expect(repository.segment.dataFields).toHaveLength(1);
  });

  it("11.T12 assigns one default Layout and a reusable available set", async () => {
    const defaultLayout = {
      id: entityId<"layout">(50),
      showId: repository.segment.showId,
      name: "Interview close",
      aspectRatio: "16:9",
      canvas: { width: 1920, height: 1080 },
      slots: [],
      componentPlacements: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies Layout;
    const alternateLayout = {
      ...defaultLayout,
      id: entityId<"layout">(51),
      name: "Guest full screen",
    } satisfies Layout;
    const layouts = new Map<LayoutId, Layout>([
      [defaultLayout.id, defaultLayout],
      [alternateLayout.id, alternateLayout],
    ]);
    const layoutRepository: LayoutRepository = {
      async getById(id) {
        return layouts.get(id) ?? null;
      },
      async listByShowId() {
        return [...layouts.values()];
      },
      async save(layout) {
        layouts.set(layout.id, layout);
      },
    };

    await new UpdateSegmentActiveLayoutsCommand(
      { layouts: layoutRepository, segments: repository },
      dependencies,
    ).execute({
      ...scope(),
      defaultLayoutId: defaultLayout.id,
      availableLayoutIds: [alternateLayout.id],
    });

    expect(repository.segment.lifecycle.active).toMatchObject({
      defaultLayoutId: defaultLayout.id,
      availableLayoutIds: [alternateLayout.id, defaultLayout.id],
    });
    expect(repository.segment.layoutIds).toEqual([
      alternateLayout.id,
      defaultLayout.id,
    ]);
  });

  it("7.T9 rejects a stale autosave instead of overwriting a newer value", async () => {
    const command = new UpdateShowSegmentDetailsCommand(
      repository,
      dependencies,
    );
    const staleVersion = repository.segment.updatedAt;
    await command.execute({
      ...scope(),
      name: "Newest interview",
      notesTemplate: "Newest notes",
    });
    await expect(
      command.execute({
        expectedUpdatedAt: staleVersion,
        showId: repository.segment.showId,
        showSegmentId: repository.segment.id,
        name: "Older interview",
        notesTemplate: "Older notes",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(repository.segment.name).toBe("Newest interview");
  });
});
