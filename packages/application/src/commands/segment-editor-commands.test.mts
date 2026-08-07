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
  type ShowSegment,
  type ShowSegmentId,
} from "@showflow/domain";

import {
  CreateSegmentDataFieldCommand,
  DeleteSegmentDataFieldCommand,
  ReorderSegmentDataFieldsCommand,
  UpdateSegmentDataFieldCommand,
  UpdateSegmentLifecycleActionsCommand,
  UpdateShowSegmentDetailsCommand,
} from "./segment-editor-commands.mjs";
import type {
  SegmentDataFieldUsageRepository,
  ShowSegmentRepository,
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

  constructor(segment: ShowSegment) {
    this.segment = segment;
  }

  async countEpisodeFieldValues(): Promise<number> {
    return this.usageCount;
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

  it("persists the limited Enter and Exit action APIs", async () => {
    await new UpdateSegmentLifecycleActionsCommand(
      repository,
      dependencies,
    ).execute({
      ...scope(),
      actions: [{ kind: "waitForAnimationCompletion" }],
      phase: "enter",
    });
    expect(repository.segment.lifecycle.enter).toEqual([
      { kind: "waitForAnimationCompletion" },
    ]);
    expect(repository.segment.lifecycle.prepare).toEqual([]);
    expect(repository.segment.lifecycle.cleanup).toEqual([]);
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
