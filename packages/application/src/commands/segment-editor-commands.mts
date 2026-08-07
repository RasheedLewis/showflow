import {
  assertValidSegmentDataFieldDefault,
  createSegmentDataField,
  currentUtcTimestamp,
  defineSegmentLifecycle,
  normalizeExpectedDurationMs,
  normalizeSegmentDataFieldLabel,
  reorderSegmentDataFields,
  validateShowSegmentDefinition,
  type DomainFactoryDependencies,
  type JsonValue,
  type LifecycleAction,
  type SegmentDataField,
  type SegmentDataFieldId,
  type SegmentDataFieldType,
  type ShowId,
  type ShowSegment,
  type ShowSegmentId,
  type UtcTimestamp,
} from "@showflow/domain";

import {
  DEFAULT_COMMAND_DEPENDENCIES,
  requireEntity,
  touchEntity,
} from "./command-support.mjs";
import { normalizeShowSegmentName } from "./catalog-commands.mjs";
import { ApplicationError } from "../errors/application-error.mjs";
import type {
  SegmentDataFieldUsageRepository,
  ShowSegmentRepository,
} from "../repositories/repositories.mjs";

type SegmentEditorRepository = ShowSegmentRepository &
  SegmentDataFieldUsageRepository;

interface SegmentMutationScope {
  readonly expectedUpdatedAt: UtcTimestamp;
  readonly showId: ShowId;
  readonly showSegmentId: ShowSegmentId;
}

const requireCurrentSegment = async (
  repository: SegmentEditorRepository,
  input: SegmentMutationScope,
): Promise<ShowSegment> => {
  const segment = requireEntity(
    await repository.getById(input.showSegmentId),
    "Show Segment",
  );
  if (segment.showId !== input.showId) {
    throw new ApplicationError("NOT_FOUND", "Show Segment was not found.");
  }
  if (segment.updatedAt !== input.expectedUpdatedAt) {
    throw new ApplicationError(
      "CONFLICT",
      "This Segment changed while you were editing. Showflow kept the newer saved version; review it and try again.",
    );
  }
  return segment;
};

const saveValidSegment = async (
  repository: SegmentEditorRepository,
  segment: ShowSegment,
): Promise<ShowSegment> => {
  const issue = validateShowSegmentDefinition(segment)[0];
  if (issue !== undefined) {
    throw new ApplicationError("VALIDATION_ERROR", issue.message);
  }
  await repository.save(segment);
  return segment;
};

export interface UpdateShowSegmentDetailsInput extends SegmentMutationScope {
  readonly expectedDurationMs?: number;
  readonly name: string;
  readonly notesTemplate: string;
}

export class UpdateShowSegmentDetailsCommand {
  constructor(
    readonly repository: SegmentEditorRepository,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: UpdateShowSegmentDetailsInput): Promise<ShowSegment> {
    const current = await requireCurrentSegment(this.repository, input);
    const expectedDurationMs =
      input.expectedDurationMs === undefined
        ? undefined
        : normalizeExpectedDurationMs(input.expectedDurationMs);
    const { expectedDurationMs: currentDuration, ...withoutDuration } = current;
    void currentDuration;
    const updated = touchEntity(
      {
        ...withoutDuration,
        name: normalizeShowSegmentName(input.name),
        notesTemplate: input.notesTemplate,
        ...(expectedDurationMs === undefined ? {} : { expectedDurationMs }),
      },
      this.dependencies,
    );
    return saveValidSegment(this.repository, updated);
  }
}

export interface CreateSegmentDataFieldCommandInput extends SegmentMutationScope {
  readonly label: string;
  readonly type: SegmentDataFieldType;
}

export class CreateSegmentDataFieldCommand {
  constructor(
    readonly repository: SegmentEditorRepository,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(
    input: CreateSegmentDataFieldCommandInput,
  ): Promise<ShowSegment> {
    const current = await requireCurrentSegment(this.repository, input);
    const field = createSegmentDataField(
      {
        existingKeys: current.dataFields.map(({ key }) => key),
        label: input.label,
        position: current.dataFields.length,
        showSegmentId: current.id,
        type: input.type,
      },
      this.dependencies,
    );
    return saveValidSegment(
      this.repository,
      touchEntity(
        { ...current, dataFields: [...current.dataFields, field] },
        this.dependencies,
      ),
    );
  }
}

export interface UpdateSegmentDataFieldCommandInput extends SegmentMutationScope {
  readonly defaultValue?: JsonValue;
  readonly fieldId: SegmentDataFieldId;
  readonly helpText?: string;
  readonly label: string;
  readonly required: boolean;
  readonly type: SegmentDataFieldType;
}

export class UpdateSegmentDataFieldCommand {
  constructor(
    readonly repository: SegmentEditorRepository,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(
    input: UpdateSegmentDataFieldCommandInput,
  ): Promise<ShowSegment> {
    const current = await requireCurrentSegment(this.repository, input);
    const existing = requireEntity(
      current.dataFields.find(({ id }) => id === input.fieldId) ?? null,
      "Segment field",
    );
    assertValidSegmentDataFieldDefault(input.type, input.defaultValue);
    const helpText = input.helpText?.trim();
    const {
      defaultValue: currentDefault,
      helpText: currentHelpText,
      ...requiredField
    } = existing;
    void currentDefault;
    void currentHelpText;
    const updatedField: SegmentDataField = touchEntity(
      {
        ...requiredField,
        label: normalizeSegmentDataFieldLabel(input.label),
        type: input.type,
        required: input.required,
        ...(input.defaultValue === undefined
          ? {}
          : { defaultValue: input.defaultValue }),
        ...(helpText === undefined || helpText.length === 0
          ? {}
          : { helpText }),
      },
      this.dependencies,
    );
    return saveValidSegment(
      this.repository,
      touchEntity(
        {
          ...current,
          dataFields: current.dataFields.map((field) =>
            field.id === existing.id ? updatedField : field,
          ),
        },
        this.dependencies,
      ),
    );
  }
}

export interface DeleteSegmentDataFieldCommandInput extends SegmentMutationScope {
  readonly fieldId: SegmentDataFieldId;
}

export class DeleteSegmentDataFieldCommand {
  constructor(
    readonly repository: SegmentEditorRepository,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(
    input: DeleteSegmentDataFieldCommandInput,
  ): Promise<ShowSegment> {
    const current = await requireCurrentSegment(this.repository, input);
    const field = requireEntity(
      current.dataFields.find(({ id }) => id === input.fieldId) ?? null,
      "Segment field",
    );
    const usageCount = await this.repository.countEpisodeFieldValues(
      current.id,
      field.key,
    );
    if (usageCount > 0) {
      throw new ApplicationError(
        "CONFLICT",
        `The ${field.label} field has content in ${usageCount} Episode ${usageCount === 1 ? "Segment" : "Segments"}. Remove those values before deleting this field.`,
      );
    }
    const remaining = current.dataFields
      .filter(({ id }) => id !== field.id)
      .map((candidate, position) => ({ ...candidate, position }));
    return saveValidSegment(
      this.repository,
      touchEntity({ ...current, dataFields: remaining }, this.dependencies),
    );
  }
}

export interface RestoreSegmentDataFieldCommandInput extends SegmentMutationScope {
  readonly field: SegmentDataField;
}

export class RestoreSegmentDataFieldCommand {
  constructor(
    readonly repository: SegmentEditorRepository,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(
    input: RestoreSegmentDataFieldCommandInput,
  ): Promise<ShowSegment> {
    const current = await requireCurrentSegment(this.repository, input);
    if (
      input.field.showSegmentId !== current.id ||
      current.dataFields.some(
        ({ id, key }) => id === input.field.id || key === input.field.key,
      )
    ) {
      throw new ApplicationError(
        "CONFLICT",
        "Showflow could not restore this Segment field because its identity is already in use.",
      );
    }
    assertValidSegmentDataFieldDefault(
      input.field.type,
      input.field.defaultValue,
    );
    const fields = [...current.dataFields];
    fields.splice(input.field.position, 0, input.field);
    return saveValidSegment(
      this.repository,
      touchEntity(
        {
          ...current,
          dataFields: fields.map((field, position) => ({ ...field, position })),
        },
        this.dependencies,
      ),
    );
  }
}

export interface ReorderSegmentDataFieldsCommandInput extends SegmentMutationScope {
  readonly orderedFieldIds: readonly SegmentDataFieldId[];
}

export class ReorderSegmentDataFieldsCommand {
  constructor(
    readonly repository: SegmentEditorRepository,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(
    input: ReorderSegmentDataFieldsCommandInput,
  ): Promise<ShowSegment> {
    const current = await requireCurrentSegment(this.repository, input);
    let reordered: readonly SegmentDataField[];
    try {
      reordered = reorderSegmentDataFields(
        current.dataFields,
        input.orderedFieldIds,
      );
    } catch (error) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Choose every Segment field once when changing the field order.",
        { cause: error },
      );
    }
    return saveValidSegment(
      this.repository,
      touchEntity({ ...current, dataFields: reordered }, this.dependencies),
    );
  }
}

export interface UpdateSegmentLifecycleActionsCommandInput extends SegmentMutationScope {
  readonly actions: readonly LifecycleAction[];
  readonly phase: "enter" | "exit";
}

export class UpdateSegmentLifecycleActionsCommand {
  constructor(
    readonly repository: SegmentEditorRepository,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(
    input: UpdateSegmentLifecycleActionsCommandInput,
  ): Promise<ShowSegment> {
    const current = await requireCurrentSegment(this.repository, input);
    const updatedAt = currentUtcTimestamp(this.dependencies.clock);
    const lifecycle = defineSegmentLifecycle({
      ...current.lifecycle,
      [input.phase]: [...input.actions],
      updatedAt,
    });
    return saveValidSegment(
      this.repository,
      touchEntity({ ...current, lifecycle }, this.dependencies),
    );
  }
}
