import {
  createLayoutFromPreset,
  createSlotFromDraft,
  currentUtcTimestamp,
  validateSlotDraft,
  type CanvasAspectRatio,
  type DomainFactoryDependencies,
  type Episode,
  type EpisodeId,
  type EpisodeSegmentId,
  type Layout,
  type LayoutId,
  type LayoutPresetId,
  type ShowId,
  type Slot,
  type SlotDraft,
  type UtcTimestamp,
} from "@showflow/domain";

import {
  DEFAULT_COMMAND_DEPENDENCIES,
  requireEntity,
  resolveShowScope,
  touchEntity,
  type ShowScopeContext,
} from "./command-support.mjs";
import { ApplicationError } from "../errors/application-error.mjs";
import type { TransactionRepositories } from "../repositories/repositories.mjs";
import type { LayoutEpisodeCreationRepository } from "../repositories/repositories.mjs";

type LayoutRepositories = Pick<
  TransactionRepositories,
  "episodes" | "layouts" | "shows"
>;

export const normalizeLayoutName = (value: string): string => {
  const name = value.trim();
  if (name.length === 0 || name.length > 200) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Layout name must contain between 1 and 200 characters.",
    );
  }
  return name;
};

const requireOwnedLayout = async (
  repositories: Pick<LayoutRepositories, "layouts">,
  showId: ShowId,
  layoutId: LayoutId,
): Promise<Layout> => {
  const layout = requireEntity(
    await repositories.layouts.getById(layoutId),
    "Layout",
  );
  if (layout.showId !== showId) {
    throw new ApplicationError("NOT_FOUND", "Layout was not found.");
  }
  return layout;
};

export interface CreateLayoutFromPresetCommandInput {
  readonly context: ShowScopeContext;
  readonly expectedShowId?: ShowId;
  readonly name: string;
  readonly aspectRatio?: CanvasAspectRatio;
  readonly presetId: LayoutPresetId;
}

export class CreateLayoutFromPresetCommand {
  constructor(
    readonly repositories: LayoutRepositories,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: CreateLayoutFromPresetCommandInput): Promise<Layout> {
    const showId = await resolveShowScope(input.context, this.repositories);
    if (input.expectedShowId !== undefined && showId !== input.expectedShowId) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Episode was not found in this Show.",
      );
    }
    const layout = createLayoutFromPreset(
      {
        showId,
        name: normalizeLayoutName(input.name),
        presetId: input.presetId,
        ...(input.aspectRatio === undefined
          ? {}
          : { aspectRatio: input.aspectRatio }),
      },
      this.dependencies,
    );
    await this.repositories.layouts.save(layout);
    return layout;
  }
}

export interface CreateEpisodeLayoutCommandInput {
  readonly episodeId: EpisodeId;
  readonly episodeSegmentId: EpisodeSegmentId;
  readonly expectedShowId: ShowId;
  readonly name: string;
  readonly aspectRatio?: CanvasAspectRatio;
  readonly presetId: LayoutPresetId;
}

export class CreateEpisodeLayoutCommand {
  constructor(
    readonly repositories: Pick<LayoutRepositories, "episodes"> & {
      readonly creation: LayoutEpisodeCreationRepository;
    },
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: CreateEpisodeLayoutCommandInput): Promise<Layout> {
    const episode = requireEntity(
      await this.repositories.episodes.getById(input.episodeId),
      "Episode",
    );
    if (episode.showId !== input.expectedShowId) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Episode was not found in this Show.",
      );
    }
    const target = requireEntity(
      episode.segments.find(({ id }) => id === input.episodeSegmentId) ?? null,
      "Episode Segment",
    );
    const layout = createLayoutFromPreset(
      {
        showId: episode.showId,
        name: normalizeLayoutName(input.name),
        presetId: input.presetId,
        ...(input.aspectRatio === undefined
          ? {}
          : { aspectRatio: input.aspectRatio }),
      },
      this.dependencies,
    );
    const updatedEpisode = touchEntity(
      {
        ...episode,
        segments: episode.segments.map((segment) =>
          segment.id === target.id
            ? touchEntity(
                { ...segment, defaultLayoutOverrideId: layout.id },
                this.dependencies,
              )
            : segment,
        ),
      },
      this.dependencies,
    );
    await this.repositories.creation.create(layout, updatedEpisode);
    return layout;
  }
}

export interface RenameLayoutCommandInput {
  readonly showId: ShowId;
  readonly layoutId: LayoutId;
  readonly name: string;
}

export class RenameLayoutCommand {
  constructor(
    readonly repositories: Pick<LayoutRepositories, "layouts">,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: RenameLayoutCommandInput): Promise<Layout> {
    const current = await requireOwnedLayout(
      this.repositories,
      input.showId,
      input.layoutId,
    );
    const updated = touchEntity(
      { ...current, name: normalizeLayoutName(input.name) },
      this.dependencies,
    );
    await this.repositories.layouts.save(updated);
    return updated;
  }
}

export interface ArchiveLayoutCommandInput {
  readonly showId: ShowId;
  readonly layoutId: LayoutId;
}

export class ArchiveLayoutCommand {
  constructor(
    readonly repositories: Pick<LayoutRepositories, "layouts">,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: ArchiveLayoutCommandInput): Promise<Layout> {
    const current = await requireOwnedLayout(
      this.repositories,
      input.showId,
      input.layoutId,
    );
    const archivedAt = currentUtcTimestamp(this.dependencies.clock);
    const updated = touchEntity({ ...current, archivedAt }, this.dependencies);
    await this.repositories.layouts.save(updated);
    return updated;
  }
}

export interface DuplicateLayoutCommandInput {
  readonly showId: ShowId;
  readonly layoutId: LayoutId;
}

export class DuplicateLayoutCommand {
  constructor(
    readonly repositories: Pick<LayoutRepositories, "layouts">,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: DuplicateLayoutCommandInput): Promise<Layout> {
    const source = await requireOwnedLayout(
      this.repositories,
      input.showId,
      input.layoutId,
    );
    const createdAt = currentUtcTimestamp(this.dependencies.clock);
    const id = this.dependencies.createId("layout");
    const duplicate: Layout = {
      ...source,
      id,
      name: normalizeLayoutName(`${source.name} copy`),
      slots: source.slots.map((slot) => ({
        ...slot,
        id: this.dependencies.createId("slot"),
        layoutId: id,
        bounds: { ...slot.bounds },
        safeMargins: { ...slot.safeMargins },
        allowedComponentTypes: [...slot.allowedComponentTypes],
        createdAt,
        updatedAt: createdAt,
      })),
      componentPlacements: [],
      createdAt,
      updatedAt: createdAt,
    };
    delete (duplicate as { archivedAt?: UtcTimestamp }).archivedAt;
    await this.repositories.layouts.save(duplicate);
    return duplicate;
  }
}

export interface UpdateLayoutCommandInput {
  readonly expectedUpdatedAt: UtcTimestamp;
  readonly layoutId: LayoutId;
  readonly name: string;
  readonly showId: ShowId;
  readonly slots: readonly SlotDraft[];
}

export class UpdateLayoutCommand {
  constructor(
    readonly repositories: Pick<LayoutRepositories, "layouts">,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(input: UpdateLayoutCommandInput): Promise<Layout> {
    const current = await requireOwnedLayout(
      this.repositories,
      input.showId,
      input.layoutId,
    );
    if (current.updatedAt !== input.expectedUpdatedAt) {
      throw new ApplicationError(
        "CONFLICT",
        "This Layout changed while you were editing. Showflow kept the newer saved version; review it and try again.",
      );
    }
    const layers = new Set<number>();
    const ids = new Set<string>();
    const currentSlots = new Map(current.slots.map((slot) => [slot.id, slot]));
    const slots: Slot[] = input.slots.map((draft) => {
      try {
        validateSlotDraft(draft);
      } catch (error) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Keep every Slot inside the audience frame and use valid inspector values.",
          { cause: error },
        );
      }
      if (layers.has(draft.layerOrder)) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "Each Slot must have a unique layer.",
        );
      }
      layers.add(draft.layerOrder);
      if (draft.id === undefined) {
        return createSlotFromDraft(current.id, draft, this.dependencies);
      }
      const existing = currentSlots.get(draft.id);
      if (existing === undefined || ids.has(draft.id)) {
        throw new ApplicationError(
          "CONFLICT",
          "Showflow could not match one of the edited Slots.",
        );
      }
      ids.add(draft.id);
      return touchEntity(
        {
          ...existing,
          name: draft.name.trim(),
          role: draft.role,
          bounds: { ...draft.bounds },
          alignment: draft.alignment,
          safeMargins: { ...draft.safeMargins },
          layerOrder: draft.layerOrder,
          clipContent: draft.clipContent,
          allowedComponentTypes: [...draft.allowedComponentTypes],
        },
        this.dependencies,
      );
    });
    const updated = touchEntity(
      { ...current, name: normalizeLayoutName(input.name), slots },
      this.dependencies,
    );
    await this.repositories.layouts.save(updated);
    return updated;
  }
}

export interface AssignEpisodeSegmentLayoutCommandInput {
  readonly episodeId: EpisodeId;
  readonly episodeSegmentId: EpisodeSegmentId;
  readonly layoutId: LayoutId;
}

export class AssignEpisodeSegmentLayoutCommand {
  constructor(
    readonly repositories: Pick<LayoutRepositories, "episodes" | "layouts">,
    readonly dependencies: DomainFactoryDependencies = DEFAULT_COMMAND_DEPENDENCIES,
  ) {}

  async execute(
    input: AssignEpisodeSegmentLayoutCommandInput,
  ): Promise<Episode> {
    const episode = requireEntity(
      await this.repositories.episodes.getById(input.episodeId),
      "Episode",
    );
    const layout = await requireOwnedLayout(
      this.repositories,
      episode.showId,
      input.layoutId,
    );
    const target = requireEntity(
      episode.segments.find(({ id }) => id === input.episodeSegmentId) ?? null,
      "Episode Segment",
    );
    void layout;
    const updated = touchEntity(
      {
        ...episode,
        segments: episode.segments.map((segment) =>
          segment.id === target.id
            ? touchEntity(
                { ...segment, defaultLayoutOverrideId: input.layoutId },
                this.dependencies,
              )
            : segment,
        ),
      },
      this.dependencies,
    );
    await this.repositories.episodes.save(updated);
    return updated;
  }
}
