import {
  DESKTOP_API_VERSION,
  type ApplicationSettingsResult,
  type CreateStudioRequest,
  type CreateShowRequest,
  type CreateSegmentRequest,
  type ArchiveSegmentRequest,
  type AddBlueprintSegmentRequest,
  type BlueprintPlacementMutationRequest,
  type ReorderBlueprintRequest,
  type GetShowDesignRequest,
  type GetRuntimeInfoResult,
  type GetStudioRequest,
  type ListShowsRequest,
  type RenameShowRequest,
  type ShowDeleteResult,
  type ShowflowDesktopApi,
  type ShowDesignDto,
  type ShowDesignResult,
  type ShowDto,
  type ShowMutationRequest,
  type ShowResult,
  type StudioDto,
  type StudioResult,
  type UpdateNavigationSettingsRequest,
  type CreateEpisodeRequest,
  type CreateEpisodeSegmentRequest,
  type EpisodeSegmentMutationRequest,
  type EpisodeSegmentDto,
  type EpisodeStoryboardDto,
  type GetEpisodeRequest,
  type InsertEpisodeSegmentRequest,
  type ListEpisodesRequest,
  type ReorderEpisodeRequest,
  type RestoreEpisodeSegmentRequest,
  type ShowSegmentDto,
  type UpdateEpisodeSegmentRequest,
  type CreateSegmentFieldRequest,
  type DeleteSegmentFieldRequest,
  type GetSegmentEditorRequest,
  type ReorderSegmentFieldsRequest,
  type RestoreSegmentFieldRequest,
  type SegmentDataFieldDto,
  type ShowSegmentEditorDto,
  type UpdateSegmentDetailsRequest,
  type UpdateSegmentFieldRequest,
  type ResourceContext,
  type ResourceDto,
  type UpdateResourceMetadataRequest,
} from "@showflow/contracts";
import type { Page } from "@playwright/test";

export const DEFAULT_RUNTIME_INFO_RESULT = {
  ok: true,
  data: {
    applicationVersion: "0.0.0-test",
    architecture: "arm64",
    desktopApiVersion: DESKTOP_API_VERSION,
    platform: "darwin",
  },
} as const satisfies GetRuntimeInfoResult;
export const DEFAULT_APPLICATION_SETTINGS_RESULT = {
  ok: true,
  data: {
    lastRoute: "/",
    lastStudioId: null,
    windowPreferences: null,
  },
} as const satisfies ApplicationSettingsResult;
export const DEFAULT_STUDIO_ID =
  "8d9df01f-2584-4b9a-ad13-a96d673918e9" as const;
export const SECOND_STUDIO_ID = "f4f47461-e2c8-44a8-a301-5465655aeb36" as const;
export const DEFAULT_SHOW_ID = "514ad6df-710d-4301-9bff-b096e9db3dd4" as const;
export const DEFAULT_BLUEPRINT_ID =
  "5da62c88-a25d-450d-bf4d-3809a9f8bd11" as const;
const DEFAULT_TIMESTAMP = "2026-08-06T14:30:00.000Z" as const;

export const createMockDesktopApi = (
  runtimeInfoResult: GetRuntimeInfoResult = DEFAULT_RUNTIME_INFO_RESULT,
  initialSettingsResult: ApplicationSettingsResult = DEFAULT_APPLICATION_SETTINGS_RESULT,
): ShowflowDesktopApi => {
  let settingsResult = initialSettingsResult;
  const studios = new Map<string, StudioDto>();
  const studioIds = [DEFAULT_STUDIO_ID, SECOND_STUDIO_ID] as const;
  const shows = new Map<string, ShowDesignDto>();
  const episodes = new Map<string, EpisodeStoryboardDto>();
  const segmentEditors = new Map<string, ShowSegmentEditorDto>();
  const resources = new Map<string, ResourceDto>();
  const visibleResources = (context: ResourceContext): ResourceDto[] =>
    [...resources.values()].filter((resource) => {
      if (resource.owner.scope === "studio") {
        return resource.owner.studioId === context.studioId;
      }
      if (resource.owner.scope === "show") {
        return (
          context.scope !== "studio" && resource.owner.showId === context.showId
        );
      }
      return (
        context.scope === "episode" &&
        resource.owner.episodeId === context.episodeId
      );
    });
  const mockResource = (
    context: ResourceContext,
    fileName = "album-artwork.png",
  ): ResourceDto => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const category =
      extension === "mp4" || extension === "webm"
        ? "video"
        : extension === "mp3" ||
            extension === "wav" ||
            extension === "ogg" ||
            extension === "m4a"
          ? "audio"
          : "image";
    const owner =
      context.scope === "studio"
        ? { scope: "studio" as const, studioId: context.studioId }
        : context.scope === "show"
          ? { scope: "show" as const, showId: context.showId }
          : { scope: "episode" as const, episodeId: context.episodeId };
    return {
      availability: "available",
      category,
      contentHash: null,
      createdAt: DEFAULT_TIMESTAMP,
      dimensions: category === "image" ? { height: 1080, width: 1920 } : null,
      displayName: fileName.replace(/\.[^.]+$/u, ""),
      durationMs: category === "image" ? null : 30_000,
      fileSizeBytes: 1_024,
      id: crypto.randomUUID(),
      mimeType:
        category === "image"
          ? "image/png"
          : category === "video"
            ? "video/mp4"
            : "audio/mpeg",
      originalFilename: fileName,
      owner,
      sourceModifiedAt: DEFAULT_TIMESTAMP,
      thumbnailCacheKey: category === "image" ? "mock-thumbnail" : null,
      updatedAt: DEFAULT_TIMESTAMP,
      usage: [],
    };
  };
  const createSegmentEditor = (
    segment: ShowDesignDto["segments"][number]["segment"],
  ): ShowSegmentEditorDto => ({
    ...segment,
    dataFields: [],
    lifecycle: {
      active: {
        availableLayoutIds: [],
        defaultLayoutId: null,
        hostCueIds: [],
      },
      cleanup: [],
      enter: [],
      exit: [],
      prepare: [],
    },
    notesTemplate: "",
    validationIssues: [],
  });
  const segmentEditorNotFound = () => ({
    ok: false as const,
    error: {
      code: "NOT_FOUND" as const,
      message: "This Segment is no longer available. Return to Design Show.",
    },
  });
  const getScopedSegmentEditor = (
    request: GetSegmentEditorRequest,
  ): ShowSegmentEditorDto | undefined => {
    const editor = segmentEditors.get(request.showSegmentId);
    const design = shows.get(request.showId);
    return editor?.showId === request.showId &&
      design?.show.studioId === request.studioId
      ? editor
      : undefined;
  };
  const updateSegmentEditor = (
    editor: ShowSegmentEditorDto,
  ): ShowSegmentEditorDto => {
    segmentEditors.set(editor.id, editor);
    const design = shows.get(editor.showId);
    if (design !== undefined) {
      shows.set(editor.showId, {
        ...design,
        segments: design.segments.map((item) =>
          item.segment.id === editor.id
            ? {
                ...item,
                segment: {
                  ...item.segment,
                  expectedDurationMs: editor.expectedDurationMs,
                  name: editor.name,
                  updatedAt: editor.updatedAt,
                },
              }
            : item,
        ),
      });
    }
    return editor;
  };
  const segmentEditorSuccess = (editor: ShowSegmentEditorDto) => ({
    ok: true as const,
    data: editor,
  });
  const fieldKey = (
    label: string,
    existing: readonly SegmentDataFieldDto[],
  ): string => {
    const base =
      label
        .trim()
        .split(/[^A-Za-z0-9]+/u)
        .filter(Boolean)
        .map((part, index) =>
          index === 0
            ? part.toLowerCase()
            : `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`,
        )
        .join("") || "field";
    let candidate = /^[a-z]/u.test(base) ? base : `field${base}`;
    let suffix = 2;
    while (existing.some(({ key }) => key === candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    return candidate;
  };
  const createPlacement = (
    design: ShowDesignDto,
    showSegmentId: string,
    position = design.blueprint.placements.length,
  ) => ({
    createdAt: DEFAULT_TIMESTAMP,
    defaultData: {},
    defaultDurationMs: null,
    id: crypto.randomUUID(),
    label: null,
    placementOverrides: null,
    position,
    showBlueprintId: design.blueprint.id,
    showSegmentId,
    updatedAt: DEFAULT_TIMESTAMP,
  });
  const withPlacements = (
    design: ShowDesignDto,
    placements: ShowDesignDto["blueprint"]["placements"],
  ): ShowDesignDto => ({
    ...design,
    blueprint: {
      ...design.blueprint,
      placementCount: placements.length,
      placements: placements.map((placement, position) => ({
        ...placement,
        position,
      })),
      updatedAt: DEFAULT_TIMESTAMP,
    },
    segments: design.segments.map((item) => ({
      ...item,
      blueprintUsageCount: placements.filter(
        (placement) => placement.showSegmentId === item.segment.id,
      ).length,
    })),
  });

  const studioNotFound = (): StudioResult => ({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "This Studio is no longer available. Return to Studio setup.",
    },
  });
  const showNotFound = (): ShowDesignResult => ({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "This Show is no longer available. Return to Studio Home.",
    },
  });
  const showMutationNotFound = (): ShowResult => ({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "This Show is no longer available. Return to Studio Home.",
    },
  });
  const showDeleteNotFound = (): ShowDeleteResult => ({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "This Show is no longer available. Return to Studio Home.",
    },
  });
  const episodeNotFound = () => ({
    ok: false as const,
    error: {
      code: "NOT_FOUND" as const,
      message: "This Episode is no longer available. Return to Show Detail.",
    },
  });
  const makeEpisodeItem = (
    episodeSegment: EpisodeSegmentDto,
    sourceSegment: ShowSegmentDto,
  ): EpisodeStoryboardDto["items"][number] => {
    const editor = segmentEditors.get(sourceSegment.id);
    const dataFields =
      editor?.dataFields.map(({ episodeValueUsageCount, ...field }) => {
        void episodeValueUsageCount;
        return field;
      }) ?? [];
    const validationIssues = dataFields.flatMap((field) => {
      const value = episodeSegment.fieldValues[field.key];
      const missing =
        value === undefined ||
        value === null ||
        ((field.type === "shortText" || field.type === "longText") &&
          (typeof value !== "string" || value.trim().length === 0));
      return field.required && missing
        ? [
            {
              code: "EPISODE_FIELD_REQUIRED" as const,
              fieldKey: field.key,
              message: `The ${sourceSegment.name} Segment needs ${field.label}. Add it before rehearsal.`,
              severity: "blocking" as const,
            },
          ]
        : [];
    });
    const summary = dataFields
      .filter(({ type }) => type === "shortText")
      .sort((left, right) => left.position - right.position)
      .map(({ key }) => episodeSegment.fieldValues[key])
      .find((value) => typeof value === "string" && value.trim().length > 0);
    return {
      dataFields,
      episodeSegment,
      expectedDurationMs:
        episodeSegment.expectedDurationOverrideMs ??
        sourceSegment.expectedDurationMs,
      readiness: validationIssues.length === 0 ? "ready" : "needs-content",
      sourceNotesTemplate: editor?.notesTemplate ?? "",
      sourceSegment,
      summary:
        typeof summary === "string" ? summary.trim().slice(0, 160) : null,
      validationIssueCount: validationIssues.length,
      validationIssues,
    };
  };
  const withEpisodeItems = (
    storyboard: EpisodeStoryboardDto,
    items: EpisodeStoryboardDto["items"],
  ): EpisodeStoryboardDto => {
    const positioned = items.map((item, position) =>
      makeEpisodeItem({ ...item.episodeSegment, position }, item.sourceSegment),
    );
    return {
      ...storyboard,
      episode: { ...storyboard.episode, segmentCount: positioned.length },
      items: positioned,
      progress: {
        estimatedRuntimeMs: positioned.reduce(
          (total, item) => total + (item.expectedDurationMs ?? 0),
          0,
        ),
        needsContentCount: positioned.filter(
          ({ readiness }) => readiness === "needs-content",
        ).length,
        readyCount: positioned.filter(({ readiness }) => readiness === "ready")
          .length,
        segmentCount: positioned.length,
      },
    };
  };
  const getScopedEpisode = (
    request: GetEpisodeRequest,
  ): EpisodeStoryboardDto | undefined => {
    const episode = episodes.get(request.episodeId);
    return episode?.episode.showId === request.showId &&
      episode.show.studioId === request.studioId
      ? episode
      : undefined;
  };

  return Object.freeze({
    apiVersion: DESKTOP_API_VERSION,
    app: Object.freeze({
      getApplicationSettings: async () => settingsResult,
      getRuntimeInfo: async () => runtimeInfoResult,
      updateNavigation: async (request: UpdateNavigationSettingsRequest) => {
        if (settingsResult.ok) {
          settingsResult = {
            ok: true,
            data: { ...settingsResult.data, ...request },
          };
        }

        return settingsResult;
      },
    }),
    studios: Object.freeze({
      create: async (request: CreateStudioRequest) => {
        const studioId = studioIds[studios.size] ?? crypto.randomUUID();
        const studio = {
          archivedAt: null,
          createdAt: DEFAULT_TIMESTAMP,
          id: studioId,
          logoResourceId: null,
          name: request.name.trim(),
          updatedAt: DEFAULT_TIMESTAMP,
        } satisfies StudioDto;
        studios.set(studio.id, studio);
        return { ok: true, data: studio } as const;
      },
      get: async (request: GetStudioRequest) => {
        const studio = studios.get(request.studioId);
        return studio === undefined
          ? studioNotFound()
          : ({ ok: true, data: studio } as const);
      },
      list: async () => ({
        ok: true as const,
        data: [...studios.values()],
      }),
    }),
    shows: Object.freeze({
      archive: async (request: ShowMutationRequest) => {
        const design = shows.get(request.showId);
        if (design === undefined || design.show.studioId !== request.studioId)
          return showMutationNotFound();
        const archived = {
          ...design.show,
          archivedAt: DEFAULT_TIMESTAMP,
          updatedAt: DEFAULT_TIMESTAMP,
        } satisfies ShowDto;
        shows.set(request.showId, { ...design, show: archived });
        return { ok: true, data: archived } as const;
      },
      create: async (request: CreateShowRequest) => {
        if (!studios.has(request.studioId)) return showNotFound();
        const showId = shows.size === 0 ? DEFAULT_SHOW_ID : crypto.randomUUID();
        const design = {
          show: {
            archivedAt: null,
            createdAt: DEFAULT_TIMESTAMP,
            description: request.description?.trim() || null,
            id: showId,
            name: request.name.trim(),
            studioId: request.studioId,
            thumbnailResourceId: null,
            updatedAt: DEFAULT_TIMESTAMP,
          },
          blueprint: {
            createdAt: DEFAULT_TIMESTAMP,
            id: shows.size === 0 ? DEFAULT_BLUEPRINT_ID : crypto.randomUUID(),
            placementCount: 0,
            placements: [],
            showId,
            updatedAt: DEFAULT_TIMESTAMP,
          },
          segments: [],
        } satisfies ShowDesignDto;
        shows.set(showId, design);
        return { ok: true, data: design } as const;
      },
      delete: async (request: ShowMutationRequest) => {
        const design = shows.get(request.showId);
        if (design === undefined || design.show.studioId !== request.studioId)
          return showDeleteNotFound();
        shows.delete(request.showId);
        return { ok: true, data: { showId: request.showId } } as const;
      },
      getDesign: async (
        request: GetShowDesignRequest,
      ): Promise<ShowDesignResult> => {
        const design = shows.get(request.showId);
        return design === undefined || design.show.studioId !== request.studioId
          ? {
              ok: false,
              error: {
                code: "NOT_FOUND",
                message:
                  "This Show is no longer available. Return to Studio Home.",
              },
            }
          : { ok: true, data: design };
      },
      list: async (request: ListShowsRequest) => ({
        ok: true as const,
        data: [...shows.values()]
          .filter(
            ({ show }) =>
              show.studioId === request.studioId && show.archivedAt === null,
          )
          .map(({ show }) => ({
            episodeCount: [...episodes.values()].filter(
              ({ episode }) => episode.showId === show.id,
            ).length,
            show,
          })),
      }),
      rename: async (request: RenameShowRequest) => {
        const design = shows.get(request.showId);
        if (design === undefined || design.show.studioId !== request.studioId)
          return showMutationNotFound();
        const renamed = {
          ...design.show,
          name: request.name.trim(),
          updatedAt: DEFAULT_TIMESTAMP,
        } satisfies ShowDto;
        shows.set(request.showId, { ...design, show: renamed });
        return { ok: true, data: renamed } as const;
      },
    }),
    segments: Object.freeze({
      archive: async (request: ArchiveSegmentRequest) => {
        const design = shows.get(request.showId);
        if (design === undefined || design.show.studioId !== request.studioId)
          return showNotFound();
        const item = design.segments.find(
          ({ segment }) => segment.id === request.showSegmentId,
        );
        if (item === undefined) return showNotFound();
        const updated = {
          ...design,
          segments: design.segments.map((candidate) =>
            candidate.segment.id === request.showSegmentId
              ? {
                  ...candidate,
                  segment: {
                    ...candidate.segment,
                    archivedAt: DEFAULT_TIMESTAMP,
                    updatedAt: DEFAULT_TIMESTAMP,
                  },
                }
              : candidate,
          ),
        } satisfies ShowDesignDto;
        shows.set(request.showId, updated);
        return { ok: true, data: updated } as const;
      },
      create: async (request: CreateSegmentRequest) => {
        const design = shows.get(request.showId);
        if (design === undefined || design.show.studioId !== request.studioId)
          return showNotFound();
        const segment = {
          archivedAt: null,
          createdAt: DEFAULT_TIMESTAMP,
          description: request.description?.trim() || null,
          expectedDurationMs: null,
          id: crypto.randomUUID(),
          name: request.name.trim(),
          showId: request.showId,
          updatedAt: DEFAULT_TIMESTAMP,
        };
        segmentEditors.set(segment.id, createSegmentEditor(segment));
        let updated = {
          ...design,
          segments: [...design.segments, { blueprintUsageCount: 0, segment }],
        } satisfies ShowDesignDto;
        if (request.blueprintId !== undefined) {
          const placements = [...updated.blueprint.placements];
          placements.splice(
            request.position ?? placements.length,
            0,
            createPlacement(updated, segment.id, request.position),
          );
          updated = withPlacements(updated, placements);
        }
        shows.set(request.showId, updated);
        return { ok: true, data: updated } as const;
      },
      createField: async (request: CreateSegmentFieldRequest) => {
        const editor = getScopedSegmentEditor(request);
        if (editor === undefined) return segmentEditorNotFound();
        const field = {
          createdAt: DEFAULT_TIMESTAMP,
          defaultValue: null,
          episodeValueUsageCount: 0,
          helpText: null,
          id: crypto.randomUUID(),
          key: fieldKey(request.label, editor.dataFields),
          label: request.label.trim(),
          position: editor.dataFields.length,
          required: false,
          showSegmentId: editor.id,
          type: request.type,
          updatedAt: DEFAULT_TIMESTAMP,
        } satisfies SegmentDataFieldDto;
        return segmentEditorSuccess(
          updateSegmentEditor({
            ...editor,
            dataFields: [...editor.dataFields, field],
            updatedAt: DEFAULT_TIMESTAMP,
          }),
        );
      },
      deleteField: async (request: DeleteSegmentFieldRequest) => {
        const editor = getScopedSegmentEditor(request);
        if (editor === undefined) return segmentEditorNotFound();
        const field = editor.dataFields.find(
          ({ id }) => id === request.fieldId,
        );
        if (field === undefined) return segmentEditorNotFound();
        if (field.episodeValueUsageCount > 0) {
          return {
            ok: false as const,
            error: {
              code: "CONFLICT" as const,
              message: `The ${field.label} field has Episode content. Remove those values before deleting this field.`,
            },
          };
        }
        return segmentEditorSuccess(
          updateSegmentEditor({
            ...editor,
            dataFields: editor.dataFields
              .filter(({ id }) => id !== request.fieldId)
              .map((candidate, position) => ({ ...candidate, position })),
            updatedAt: DEFAULT_TIMESTAMP,
          }),
        );
      },
      getEditor: async (request: GetSegmentEditorRequest) => {
        const editor = getScopedSegmentEditor(request);
        return editor === undefined
          ? segmentEditorNotFound()
          : segmentEditorSuccess(editor);
      },
      reorderFields: async (request: ReorderSegmentFieldsRequest) => {
        const editor = getScopedSegmentEditor(request);
        if (editor === undefined) return segmentEditorNotFound();
        const byId = new Map(
          editor.dataFields.map((field) => [field.id, field]),
        );
        const fields = request.orderedFieldIds.flatMap((id, position) => {
          const field = byId.get(id);
          return field === undefined ? [] : [{ ...field, position }];
        });
        return segmentEditorSuccess(
          updateSegmentEditor({
            ...editor,
            dataFields: fields,
            updatedAt: DEFAULT_TIMESTAMP,
          }),
        );
      },
      restoreField: async (request: RestoreSegmentFieldRequest) => {
        const editor = getScopedSegmentEditor(request);
        if (editor === undefined) return segmentEditorNotFound();
        const fields = [...editor.dataFields];
        fields.splice(request.field.position, 0, {
          ...request.field,
          episodeValueUsageCount: 0,
        });
        return segmentEditorSuccess(
          updateSegmentEditor({
            ...editor,
            dataFields: fields.map((field, position) => ({
              ...field,
              position,
            })),
            updatedAt: DEFAULT_TIMESTAMP,
          }),
        );
      },
      updateDetails: async (request: UpdateSegmentDetailsRequest) => {
        const editor = getScopedSegmentEditor(request);
        if (editor === undefined) return segmentEditorNotFound();
        return segmentEditorSuccess(
          updateSegmentEditor({
            ...editor,
            expectedDurationMs: request.expectedDurationMs,
            name: request.name.trim(),
            notesTemplate: request.notesTemplate,
            updatedAt: DEFAULT_TIMESTAMP,
          }),
        );
      },
      updateField: async (request: UpdateSegmentFieldRequest) => {
        const editor = getScopedSegmentEditor(request);
        if (editor === undefined) return segmentEditorNotFound();
        return segmentEditorSuccess(
          updateSegmentEditor({
            ...editor,
            dataFields: editor.dataFields.map((field) =>
              field.id === request.fieldId
                ? {
                    ...field,
                    defaultValue: request.defaultValue,
                    helpText: request.helpText,
                    label: request.label.trim(),
                    required: request.required,
                    type: request.type,
                    updatedAt: DEFAULT_TIMESTAMP,
                  }
                : field,
            ),
            updatedAt: DEFAULT_TIMESTAMP,
          }),
        );
      },
    }),
    blueprints: Object.freeze({
      addSegment: async (request: AddBlueprintSegmentRequest) => {
        const design = shows.get(request.showId);
        if (design === undefined || design.show.studioId !== request.studioId)
          return showNotFound();
        const placements = [...design.blueprint.placements];
        placements.splice(
          request.position ?? placements.length,
          0,
          createPlacement(design, request.showSegmentId, request.position),
        );
        const updated = withPlacements(design, placements);
        shows.set(request.showId, updated);
        return { ok: true, data: updated } as const;
      },
      duplicatePlacement: async (
        request: BlueprintPlacementMutationRequest,
      ) => {
        const design = shows.get(request.showId);
        if (design === undefined) return showNotFound();
        const index = design.blueprint.placements.findIndex(
          ({ id }) => id === request.placementId,
        );
        if (index < 0) return showNotFound();
        const source = design.blueprint.placements[index];
        if (source === undefined) return showNotFound();
        const placements = [...design.blueprint.placements];
        placements.splice(index + 1, 0, {
          ...source,
          id: crypto.randomUUID(),
          createdAt: DEFAULT_TIMESTAMP,
          updatedAt: DEFAULT_TIMESTAMP,
        });
        const updated = withPlacements(design, placements);
        shows.set(request.showId, updated);
        return { ok: true, data: updated } as const;
      },
      removePlacement: async (request: BlueprintPlacementMutationRequest) => {
        const design = shows.get(request.showId);
        if (design === undefined) return showNotFound();
        const updated = withPlacements(
          design,
          design.blueprint.placements.filter(
            ({ id }) => id !== request.placementId,
          ),
        );
        shows.set(request.showId, updated);
        return { ok: true, data: updated } as const;
      },
      reorder: async (request: ReorderBlueprintRequest) => {
        const design = shows.get(request.showId);
        if (design === undefined) return showNotFound();
        const byId = new Map(
          design.blueprint.placements.map((placement) => [
            placement.id,
            placement,
          ]),
        );
        const placements = request.orderedPlacementIds.flatMap((id) => {
          const placement = byId.get(id);
          return placement === undefined ? [] : [placement];
        });
        const updated = withPlacements(design, placements);
        shows.set(request.showId, updated);
        return { ok: true, data: updated } as const;
      },
    }),
    episodes: Object.freeze({
      create: async (request: CreateEpisodeRequest) => {
        const design = shows.get(request.showId);
        if (design === undefined || design.show.studioId !== request.studioId)
          return episodeNotFound();
        const episodeId = crypto.randomUUID();
        const placements =
          request.source === "blank" ? [] : design.blueprint.placements;
        const items = placements.flatMap((placement, position) => {
          const sourceSegment = design.segments.find(
            ({ segment }) => segment.id === placement.showSegmentId,
          )?.segment;
          if (sourceSegment === undefined) return [];
          const editor = segmentEditors.get(sourceSegment.id);
          const fieldValues = Object.fromEntries(
            (editor?.dataFields ?? []).flatMap((field) =>
              field.defaultValue === null
                ? []
                : [[field.key, field.defaultValue] as const],
            ),
          );
          return [
            makeEpisodeItem(
              {
                createdAt: DEFAULT_TIMESTAMP,
                defaultLayoutOverrideId: null,
                episodeId,
                expectedDurationOverrideMs: placement.defaultDurationMs,
                fieldValues: { ...fieldValues, ...placement.defaultData },
                fixedResourceReplacements: [],
                id: crypto.randomUUID(),
                label: placement.label,
                notes: editor?.notesTemplate ?? "",
                position,
                sourceShowSegmentId: sourceSegment.id,
                updatedAt: DEFAULT_TIMESTAMP,
              },
              sourceSegment,
            ),
          ];
        });
        const storyboard = withEpisodeItems(
          {
            episode: {
              createdAt: DEFAULT_TIMESTAMP,
              description: null,
              episodeNumber: request.episodeNumber ?? null,
              guestNames: [],
              id: episodeId,
              internalNotes: "",
              plannedAt:
                request.plannedDate === undefined
                  ? null
                  : `${request.plannedDate}T12:00:00.000Z`,
              segmentCount: 0,
              showId: request.showId,
              sponsorInformation: null,
              status: "draft",
              subtitle: null,
              title: request.title,
              updatedAt: DEFAULT_TIMESTAMP,
            },
            items: [],
            progress: {
              estimatedRuntimeMs: 0,
              needsContentCount: 0,
              readyCount: 0,
              segmentCount: 0,
            },
            show: design.show,
          },
          items,
        );
        episodes.set(episodeId, storyboard);
        return { ok: true as const, data: storyboard };
      },
      createSegment: async (request: CreateEpisodeSegmentRequest) => {
        const storyboard = getScopedEpisode(request);
        const design = shows.get(request.showId);
        if (storyboard === undefined || design === undefined)
          return episodeNotFound();
        const sourceSegment = {
          archivedAt: null,
          createdAt: DEFAULT_TIMESTAMP,
          description: request.description?.trim() || null,
          expectedDurationMs: null,
          id: crypto.randomUUID(),
          name: request.name.trim(),
          showId: request.showId,
          updatedAt: DEFAULT_TIMESTAMP,
        };
        segmentEditors.set(
          sourceSegment.id,
          createSegmentEditor(sourceSegment),
        );
        shows.set(request.showId, {
          ...design,
          segments: [
            ...design.segments,
            { blueprintUsageCount: 0, segment: sourceSegment },
          ],
        });
        const item = makeEpisodeItem(
          {
            createdAt: DEFAULT_TIMESTAMP,
            defaultLayoutOverrideId: null,
            episodeId: request.episodeId,
            expectedDurationOverrideMs: null,
            fieldValues: {},
            fixedResourceReplacements: [],
            id: crypto.randomUUID(),
            label: null,
            notes: "",
            position: request.position ?? storyboard.items.length,
            sourceShowSegmentId: sourceSegment.id,
            updatedAt: DEFAULT_TIMESTAMP,
          },
          sourceSegment,
        );
        const items = [...storyboard.items];
        items.splice(request.position ?? items.length, 0, item);
        const updated = withEpisodeItems(storyboard, items);
        episodes.set(request.episodeId, updated);
        return { ok: true as const, data: updated };
      },
      duplicateSegment: async (request: EpisodeSegmentMutationRequest) => {
        const storyboard = getScopedEpisode(request);
        if (storyboard === undefined) return episodeNotFound();
        const index = storyboard.items.findIndex(
          ({ episodeSegment }) =>
            episodeSegment.id === request.episodeSegmentId,
        );
        const source = storyboard.items[index];
        if (source === undefined) return episodeNotFound();
        const items = [...storyboard.items];
        items.splice(index + 1, 0, {
          ...source,
          episodeSegment: {
            ...source.episodeSegment,
            id: crypto.randomUUID(),
            fieldValues: { ...source.episodeSegment.fieldValues },
          },
        });
        const updated = withEpisodeItems(storyboard, items);
        episodes.set(request.episodeId, updated);
        return { ok: true as const, data: updated };
      },
      get: async (request: GetEpisodeRequest) => {
        const storyboard = getScopedEpisode(request);
        return storyboard === undefined
          ? episodeNotFound()
          : ({ ok: true as const, data: storyboard } as const);
      },
      insertSegment: async (request: InsertEpisodeSegmentRequest) => {
        const storyboard = getScopedEpisode(request);
        const sourceSegment = shows
          .get(request.showId)
          ?.segments.find(
            ({ segment }) => segment.id === request.showSegmentId,
          )?.segment;
        if (storyboard === undefined || sourceSegment === undefined)
          return episodeNotFound();
        const editor = segmentEditors.get(sourceSegment.id);
        const item = makeEpisodeItem(
          {
            createdAt: DEFAULT_TIMESTAMP,
            defaultLayoutOverrideId: null,
            episodeId: request.episodeId,
            expectedDurationOverrideMs: null,
            fieldValues: Object.fromEntries(
              (editor?.dataFields ?? []).flatMap((field) =>
                field.defaultValue === null
                  ? []
                  : [[field.key, field.defaultValue] as const],
              ),
            ),
            fixedResourceReplacements: [],
            id: crypto.randomUUID(),
            label: null,
            notes: editor?.notesTemplate ?? "",
            position: request.position ?? storyboard.items.length,
            sourceShowSegmentId: sourceSegment.id,
            updatedAt: DEFAULT_TIMESTAMP,
          },
          sourceSegment,
        );
        const items = [...storyboard.items];
        items.splice(request.position ?? items.length, 0, item);
        const updated = withEpisodeItems(storyboard, items);
        episodes.set(request.episodeId, updated);
        return { ok: true as const, data: updated };
      },
      list: async (request: ListEpisodesRequest) => ({
        ok: true as const,
        data: [...episodes.values()]
          .filter(
            ({ episode, show }) =>
              episode.showId === request.showId &&
              show.studioId === request.studioId,
          )
          .map(({ episode, progress }) => ({
            ...episode,
            estimatedRuntimeMs: progress.estimatedRuntimeMs,
          })),
      }),
      removeSegment: async (request: EpisodeSegmentMutationRequest) => {
        const storyboard = getScopedEpisode(request);
        if (storyboard === undefined) return episodeNotFound();
        const updated = withEpisodeItems(
          storyboard,
          storyboard.items.filter(
            ({ episodeSegment }) =>
              episodeSegment.id !== request.episodeSegmentId,
          ),
        );
        episodes.set(request.episodeId, updated);
        return { ok: true as const, data: updated };
      },
      reorder: async (request: ReorderEpisodeRequest) => {
        const storyboard = getScopedEpisode(request);
        if (storyboard === undefined) return episodeNotFound();
        const byId = new Map(
          storyboard.items.map((item) => [item.episodeSegment.id, item]),
        );
        const updated = withEpisodeItems(
          storyboard,
          request.orderedEpisodeSegmentIds.flatMap((id) => {
            const item = byId.get(id);
            return item === undefined ? [] : [item];
          }),
        );
        episodes.set(request.episodeId, updated);
        return { ok: true as const, data: updated };
      },
      restoreSegment: async (request: RestoreEpisodeSegmentRequest) => {
        const storyboard = getScopedEpisode(request);
        const sourceSegment = shows
          .get(request.showId)
          ?.segments.find(
            ({ segment }) => segment.id === request.segment.sourceShowSegmentId,
          )?.segment;
        if (storyboard === undefined || sourceSegment === undefined)
          return episodeNotFound();
        const items = [...storyboard.items];
        items.splice(
          request.segment.position,
          0,
          makeEpisodeItem(request.segment, sourceSegment),
        );
        const updated = withEpisodeItems(storyboard, items);
        episodes.set(request.episodeId, updated);
        return { ok: true as const, data: updated };
      },
      updateSegment: async (request: UpdateEpisodeSegmentRequest) => {
        const storyboard = getScopedEpisode(request);
        if (storyboard === undefined) return episodeNotFound();
        const item = storyboard.items.find(
          ({ episodeSegment }) =>
            episodeSegment.id === request.episodeSegmentId,
        );
        if (
          item === undefined ||
          item.episodeSegment.updatedAt !== request.expectedUpdatedAt
        ) {
          return {
            ok: false as const,
            error: {
              code: "CONFLICT" as const,
              message:
                "This Episode Segment changed while you were editing. Review the saved version and try again.",
            },
          };
        }
        const updatedAt = new Date(
          new Date(item.episodeSegment.updatedAt).getTime() + 1,
        ).toISOString();
        const updated = withEpisodeItems(
          storyboard,
          storyboard.items.map((candidate) =>
            candidate.episodeSegment.id === request.episodeSegmentId
              ? {
                  ...candidate,
                  episodeSegment: {
                    ...candidate.episodeSegment,
                    expectedDurationOverrideMs:
                      request.expectedDurationOverrideMs,
                    fieldValues: request.fieldValues,
                    notes: request.notes,
                    updatedAt,
                  },
                }
              : candidate,
          ),
        );
        episodes.set(request.episodeId, updated);
        return { ok: true as const, data: updated };
      },
    }),
    resources: Object.freeze({
      getUrl: async () => ({
        ok: true as const,
        data: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
      }),
      import: async (request: { context: ResourceContext }) => {
        const resource = mockResource(request.context);
        resources.set(resource.id, resource);
        return { ok: true as const, data: visibleResources(request.context) };
      },
      importDropped: async (
        request: { context: ResourceContext },
        files: readonly { name: string }[],
      ) => {
        for (const file of files) {
          const resource = mockResource(request.context, file.name);
          resources.set(resource.id, resource);
        }
        return { ok: true as const, data: visibleResources(request.context) };
      },
      list: async (request: { context: ResourceContext }) => ({
        ok: true as const,
        data: visibleResources(request.context),
      }),
      locate: async (request: {
        context: ResourceContext;
        resourceId: string;
      }) => {
        const resource = resources.get(request.resourceId);
        if (resource !== undefined) {
          resources.set(resource.id, {
            ...resource,
            availability: "available",
          });
        }
        return { ok: true as const, data: visibleResources(request.context) };
      },
      remove: async (request: {
        context: ResourceContext;
        resourceId: string;
      }) => {
        resources.delete(request.resourceId);
        return { ok: true as const, data: visibleResources(request.context) };
      },
      rename: async (request: {
        context: ResourceContext;
        displayName: string;
        resourceId: string;
      }) => {
        const resource = resources.get(request.resourceId);
        if (resource !== undefined) {
          resources.set(resource.id, {
            ...resource,
            displayName: request.displayName.trim(),
          });
        }
        return { ok: true as const, data: visibleResources(request.context) };
      },
      replace: async (request: {
        context: ResourceContext;
        resourceId: string;
      }) => {
        const resource = resources.get(request.resourceId);
        if (resource !== undefined) {
          resources.set(resource.id, {
            ...resource,
            availability: "available",
          });
        }
        return { ok: true as const, data: visibleResources(request.context) };
      },
      updateMetadata: async (request: UpdateResourceMetadataRequest) => {
        const resource = resources.get(request.resourceId);
        if (resource !== undefined) {
          resources.set(resource.id, {
            ...resource,
            ...(request.dimensions === undefined
              ? {}
              : { dimensions: request.dimensions }),
            ...(request.durationMs === undefined
              ? {}
              : { durationMs: request.durationMs }),
            ...(request.unsupported === true
              ? { availability: "unsupported" as const }
              : {}),
          });
        }
        return { ok: true as const, data: visibleResources(request.context) };
      },
    }),
  });
};

export const installMockDesktopApi = async (
  page: Page,
  api: ShowflowDesktopApi = createMockDesktopApi(),
): Promise<void> => {
  const runtimeInfoResult = await api.app.getRuntimeInfo();
  const applicationSettingsResult = await api.app.getApplicationSettings();
  const studiosResult = await api.studios.list();
  const initialStudios = studiosResult.ok ? studiosResult.data : [];

  await page.addInitScript(
    ({ apiVersion, applicationSettings, initialStudios, runtimeInfo }) => {
      let settingsResult = applicationSettings;
      const studios = new Map(
        initialStudios.map((studio) => [studio.id, studio]),
      );
      const studioIds = [
        "8d9df01f-2584-4b9a-ad13-a96d673918e9",
        "f4f47461-e2c8-44a8-a301-5465655aeb36",
      ];
      const timestamp = "2026-08-06T14:30:00.000Z";
      let browserClock = Date.parse(timestamp);
      const nextTimestamp = (): string =>
        new Date((browserClock += 1)).toISOString();
      type BrowserPlacement = {
        createdAt: string;
        defaultData: Record<string, unknown>;
        defaultDurationMs: number | null;
        id: string;
        label: string | null;
        placementOverrides: Record<string, unknown> | null;
        position: number;
        showBlueprintId: string;
        showSegmentId: string;
        updatedAt: string;
      };
      type BrowserSegment = {
        archivedAt: string | null;
        createdAt: string;
        description: string | null;
        expectedDurationMs: number | null;
        id: string;
        name: string;
        showId: string;
        updatedAt: string;
      };
      type BrowserDesign = {
        blueprint: {
          createdAt: string;
          id: string;
          placementCount: number;
          placements: BrowserPlacement[];
          showId: string;
          updatedAt: string;
        };
        segments: Array<{
          blueprintUsageCount: number;
          segment: BrowserSegment;
        }>;
        show: {
          archivedAt: string | null;
          createdAt: string;
          description: string | null;
          id: string;
          name: string;
          studioId: string;
          thumbnailResourceId: string | null;
          updatedAt: string;
        };
      };
      type BrowserSegmentField = {
        createdAt: string;
        defaultValue: unknown;
        episodeValueUsageCount: number;
        helpText: string | null;
        id: string;
        key: string;
        label: string;
        position: number;
        required: boolean;
        showSegmentId: string;
        type:
          | "shortText"
          | "longText"
          | "number"
          | "imageResource"
          | "videoResource"
          | "audioResource"
          | "boolean";
        updatedAt: string;
      };
      type BrowserSegmentEditor = BrowserSegment & {
        dataFields: BrowserSegmentField[];
        lifecycle: {
          active: {
            availableLayoutIds: string[];
            defaultLayoutId: string | null;
            hostCueIds: string[];
          };
          cleanup: unknown[];
          enter: unknown[];
          exit: unknown[];
          prepare: unknown[];
        };
        notesTemplate: string;
        validationIssues: unknown[];
      };
      type BrowserEpisodeSegment = {
        createdAt: string;
        defaultLayoutOverrideId: string | null;
        episodeId: string;
        expectedDurationOverrideMs: number | null;
        fieldValues: Record<string, unknown>;
        fixedResourceReplacements: Array<{
          componentPlacementId: string;
          propertyKey: string;
          resourceId: string;
        }>;
        id: string;
        label: string | null;
        notes: string;
        position: number;
        sourceShowSegmentId: string;
        updatedAt: string;
      };
      type BrowserEpisodeItem = {
        dataFields: BrowserSegmentField[];
        episodeSegment: BrowserEpisodeSegment;
        expectedDurationMs: number | null;
        readiness:
          "ready" | "needs-content" | "has-warnings" | "blocking-issue";
        sourceNotesTemplate: string;
        sourceSegment: BrowserSegment;
        summary: string | null;
        validationIssueCount: number;
        validationIssues: Array<{
          code: "EPISODE_FIELD_REQUIRED";
          fieldKey: string;
          message: string;
          severity: "blocking";
        }>;
      };
      type BrowserStoryboard = {
        episode: {
          createdAt: string;
          description: string | null;
          episodeNumber: number | null;
          guestNames: string[];
          id: string;
          internalNotes: string;
          plannedAt: string | null;
          segmentCount: number;
          showId: string;
          sponsorInformation: string | null;
          status: "draft" | "ready";
          subtitle: string | null;
          title: string;
          updatedAt: string;
        };
        items: BrowserEpisodeItem[];
        progress: {
          estimatedRuntimeMs: number;
          needsContentCount: number;
          readyCount: number;
          segmentCount: number;
        };
        show: BrowserDesign["show"];
      };
      const shows = new Map<string, BrowserDesign>();
      const episodes = new Map<string, BrowserStoryboard>();
      const segmentEditors = new Map<string, BrowserSegmentEditor>();
      type BrowserResourceContext =
        | { scope: "studio"; studioId: string }
        | { scope: "show"; studioId: string; showId: string }
        | {
            scope: "episode";
            studioId: string;
            showId: string;
            episodeId: string;
          };
      type BrowserResource = {
        availability: "available" | "missing" | "unavailable" | "unsupported";
        category: "image" | "video" | "audio";
        contentHash: string | null;
        createdAt: string;
        dimensions: { height: number; width: number } | null;
        displayName: string;
        durationMs: number | null;
        fileSizeBytes: number | null;
        id: string;
        mimeType: string;
        originalFilename: string | null;
        owner:
          | { scope: "studio"; studioId: string }
          | { scope: "show"; showId: string }
          | { scope: "episode"; episodeId: string };
        sourceModifiedAt: string | null;
        thumbnailCacheKey: string | null;
        updatedAt: string;
        usage: never[];
      };
      const resources = new Map<string, BrowserResource>();
      const visibleResources = (context: BrowserResourceContext) =>
        [...resources.values()].filter((resource) => {
          if (resource.owner.scope === "studio") {
            return resource.owner.studioId === context.studioId;
          }
          if (resource.owner.scope === "show") {
            return (
              context.scope !== "studio" &&
              resource.owner.showId === context.showId
            );
          }
          return (
            context.scope === "episode" &&
            resource.owner.episodeId === context.episodeId
          );
        });
      const createResource = (
        context: BrowserResourceContext,
        name = "album-artwork.png",
      ): BrowserResource => {
        const extension = name.split(".").pop()?.toLowerCase();
        const category =
          extension === "mp4" || extension === "webm"
            ? "video"
            : extension === "mp3" ||
                extension === "wav" ||
                extension === "ogg" ||
                extension === "m4a"
              ? "audio"
              : "image";
        return {
          availability: "available",
          category,
          contentHash: null,
          createdAt: timestamp,
          dimensions:
            category === "image" ? { height: 1080, width: 1920 } : null,
          displayName: name.replace(/\.[^.]+$/u, ""),
          durationMs: category === "image" ? null : 30_000,
          fileSizeBytes: 1024,
          id: crypto.randomUUID(),
          mimeType:
            category === "image"
              ? "image/png"
              : category === "video"
                ? "video/mp4"
                : "audio/mpeg",
          originalFilename: name,
          owner:
            context.scope === "studio"
              ? { scope: "studio", studioId: context.studioId }
              : context.scope === "show"
                ? { scope: "show", showId: context.showId }
                : { scope: "episode", episodeId: context.episodeId },
          sourceModifiedAt: timestamp,
          thumbnailCacheKey: category === "image" ? "mock-thumbnail" : null,
          updatedAt: timestamp,
          usage: [],
        };
      };
      const createEditor = (segment: BrowserSegment): BrowserSegmentEditor => ({
        ...segment,
        dataFields: [],
        lifecycle: {
          active: {
            availableLayoutIds: [],
            defaultLayoutId: null,
            hostCueIds: [],
          },
          cleanup: [],
          enter: [],
          exit: [],
          prepare: [],
        },
        notesTemplate: "",
        validationIssues: [],
      });
      const scopedEditor = (request: {
        showId: string;
        showSegmentId: string;
        studioId: string;
      }): BrowserSegmentEditor | undefined => {
        const editor = segmentEditors.get(request.showSegmentId);
        const design = shows.get(request.showId);
        return editor?.showId === request.showId &&
          design?.show.studioId === request.studioId
          ? editor
          : undefined;
      };
      const editorNotFound = () => ({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message:
            "This Segment is no longer available. Return to Design Show.",
        },
      });
      const setEditor = (editor: BrowserSegmentEditor) => {
        segmentEditors.set(editor.id, editor);
        const design = shows.get(editor.showId);
        if (design !== undefined) {
          shows.set(editor.showId, {
            ...design,
            segments: design.segments.map((item) =>
              item.segment.id === editor.id
                ? {
                    ...item,
                    segment: {
                      ...item.segment,
                      expectedDurationMs: editor.expectedDurationMs,
                      name: editor.name,
                      updatedAt: editor.updatedAt,
                    },
                  }
                : item,
            ),
          });
        }
        return { ok: true, data: editor };
      };
      const browserFieldKey = (
        label: string,
        fields: BrowserSegmentField[],
      ): string => {
        const parts = label
          .trim()
          .split(/[^A-Za-z0-9]+/u)
          .filter(Boolean);
        const raw = parts
          .map((part, index) =>
            index === 0
              ? part.toLowerCase()
              : `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`,
          )
          .join("");
        const base = /^[a-z]/u.test(raw) ? raw : `field${raw || "Value"}`;
        let candidate = base;
        let suffix = 2;
        while (fields.some(({ key }) => key === candidate)) {
          candidate = `${base}${suffix}`;
          suffix += 1;
        }
        return candidate;
      };
      const withPlacements = (
        design: BrowserDesign,
        placements: BrowserPlacement[],
      ): BrowserDesign => ({
        ...design,
        blueprint: {
          ...design.blueprint,
          placementCount: placements.length,
          placements: placements.map((placement, position) => ({
            ...placement,
            position,
          })),
          updatedAt: timestamp,
        },
        segments: design.segments.map((item) => ({
          ...item,
          blueprintUsageCount: placements.filter(
            (placement) => placement.showSegmentId === item.segment.id,
          ).length,
        })),
      });
      const createPlacement = (
        design: BrowserDesign,
        showSegmentId: string,
      ): BrowserPlacement => ({
        createdAt: timestamp,
        defaultData: {},
        defaultDurationMs: null,
        id: crypto.randomUUID(),
        label: null,
        placementOverrides: null,
        position: design.blueprint.placements.length,
        showBlueprintId: design.blueprint.id,
        showSegmentId,
        updatedAt: timestamp,
      });
      const makeEpisodeItem = (
        episodeSegment: BrowserEpisodeSegment,
        sourceSegment: BrowserSegment,
      ): BrowserEpisodeItem => {
        const editor = segmentEditors.get(sourceSegment.id);
        const dataFields = editor?.dataFields ?? [];
        const validationIssues = dataFields.flatMap((field) => {
          const value = episodeSegment.fieldValues[field.key];
          const missing =
            value === undefined ||
            value === null ||
            ((field.type === "shortText" || field.type === "longText") &&
              (typeof value !== "string" || value.trim().length === 0));
          return field.required && missing
            ? [
                {
                  code: "EPISODE_FIELD_REQUIRED" as const,
                  fieldKey: field.key,
                  message: `The ${sourceSegment.name} Segment needs ${field.label}. Add it before rehearsal.`,
                  severity: "blocking" as const,
                },
              ]
            : [];
        });
        const summary = dataFields
          .filter(({ type }) => type === "shortText")
          .sort((left, right) => left.position - right.position)
          .map(({ key }) => episodeSegment.fieldValues[key])
          .find(
            (value) => typeof value === "string" && value.trim().length > 0,
          );
        return {
          dataFields,
          episodeSegment,
          expectedDurationMs:
            episodeSegment.expectedDurationOverrideMs ??
            sourceSegment.expectedDurationMs,
          readiness: validationIssues.length === 0 ? "ready" : "needs-content",
          sourceNotesTemplate: editor?.notesTemplate ?? "",
          sourceSegment,
          summary:
            typeof summary === "string" ? summary.trim().slice(0, 160) : null,
          validationIssueCount: validationIssues.length,
          validationIssues,
        };
      };
      const withEpisodeItems = (
        storyboard: BrowserStoryboard,
        items: BrowserEpisodeItem[],
      ): BrowserStoryboard => {
        const positioned = items.map((item, position) =>
          makeEpisodeItem(
            { ...item.episodeSegment, position },
            item.sourceSegment,
          ),
        );
        return {
          ...storyboard,
          episode: { ...storyboard.episode, segmentCount: positioned.length },
          items: positioned,
          progress: {
            estimatedRuntimeMs: positioned.reduce(
              (total, item) => total + (item.expectedDurationMs ?? 0),
              0,
            ),
            needsContentCount: positioned.filter(
              ({ readiness }) => readiness === "needs-content",
            ).length,
            readyCount: positioned.filter(
              ({ readiness }) => readiness === "ready",
            ).length,
            segmentCount: positioned.length,
          },
        };
      };
      const episodeNotFound = () => ({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message:
            "This Episode is no longer available. Return to Show Detail.",
        },
      });
      const scopedEpisode = (request: {
        episodeId: string;
        showId: string;
        studioId: string;
      }): BrowserStoryboard | undefined => {
        const storyboard = episodes.get(request.episodeId);
        return storyboard?.episode.showId === request.showId &&
          storyboard.show.studioId === request.studioId
          ? storyboard
          : undefined;
      };
      const mockApi = Object.freeze({
        apiVersion,
        app: Object.freeze({
          getApplicationSettings: async () => settingsResult,
          getRuntimeInfo: async () => runtimeInfo,
          updateNavigation: async (request: {
            lastRoute: string;
            lastStudioId: string | null;
          }) => {
            if (settingsResult.ok) {
              settingsResult = {
                ok: true,
                data: { ...settingsResult.data, ...request },
              };
            }

            return settingsResult;
          },
        }),
        studios: Object.freeze({
          create: async (request: { name: string }) => {
            const studioId = studioIds[studios.size] ?? crypto.randomUUID();
            const studio = {
              archivedAt: null,
              createdAt: timestamp,
              id: studioId,
              logoResourceId: null,
              name: request.name.trim(),
              updatedAt: timestamp,
            };
            studios.set(studio.id, studio);
            return { ok: true, data: studio };
          },
          get: async (request: { studioId: string }) => {
            const studio = studios.get(request.studioId);
            return studio === undefined
              ? {
                  ok: false,
                  error: {
                    code: "NOT_FOUND",
                    message:
                      "This Studio is no longer available. Return to Studio setup.",
                  },
                }
              : { ok: true, data: studio };
          },
          list: async () => ({ ok: true, data: [...studios.values()] }),
        }),
        shows: Object.freeze({
          archive: async (request: { studioId: string; showId: string }) => {
            const design = shows.get(request.showId);
            if (
              design === undefined ||
              design.show.studioId !== request.studioId
            ) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Show not found." },
              };
            }
            const archived = {
              ...design.show,
              archivedAt: timestamp,
              updatedAt: timestamp,
            };
            shows.set(request.showId, { ...design, show: archived });
            return { ok: true, data: archived };
          },
          create: async (request: {
            studioId: string;
            name: string;
            description?: string;
          }) => {
            if (!studios.has(request.studioId)) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Studio not found." },
              };
            }
            const showId =
              shows.size === 0
                ? "514ad6df-710d-4301-9bff-b096e9db3dd4"
                : crypto.randomUUID();
            const design = {
              show: {
                archivedAt: null,
                createdAt: timestamp,
                description: request.description?.trim() || null,
                id: showId,
                name: request.name.trim(),
                studioId: request.studioId,
                thumbnailResourceId: null,
                updatedAt: timestamp,
              },
              blueprint: {
                createdAt: timestamp,
                id:
                  shows.size === 0
                    ? "5da62c88-a25d-450d-bf4d-3809a9f8bd11"
                    : crypto.randomUUID(),
                placementCount: 0,
                placements: [],
                showId,
                updatedAt: timestamp,
              },
              segments: [],
            };
            shows.set(showId, design);
            return { ok: true, data: design };
          },
          delete: async (request: { studioId: string; showId: string }) => {
            const design = shows.get(request.showId);
            if (
              design === undefined ||
              design.show.studioId !== request.studioId
            ) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Show not found." },
              };
            }
            shows.delete(request.showId);
            return { ok: true, data: { showId: request.showId } };
          },
          getDesign: async (request: { studioId: string; showId: string }) => {
            const design = shows.get(request.showId);
            return design === undefined ||
              design.show.studioId !== request.studioId
              ? {
                  ok: false,
                  error: {
                    code: "NOT_FOUND",
                    message:
                      "This Show is no longer available. Return to Studio Home.",
                  },
                }
              : { ok: true, data: design };
          },
          list: async (request: { studioId: string }) => ({
            ok: true,
            data: [...shows.values()]
              .filter(
                ({ show }) =>
                  show.studioId === request.studioId &&
                  show.archivedAt === null,
              )
              .map(({ show }) => ({
                episodeCount: [...episodes.values()].filter(
                  (storyboard) => storyboard.episode.showId === show.id,
                ).length,
                show,
              })),
          }),
          rename: async (request: {
            studioId: string;
            showId: string;
            name: string;
          }) => {
            const design = shows.get(request.showId);
            if (
              design === undefined ||
              design.show.studioId !== request.studioId
            ) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Show not found." },
              };
            }
            const renamed = {
              ...design.show,
              name: request.name.trim(),
              updatedAt: timestamp,
            };
            shows.set(request.showId, { ...design, show: renamed });
            return { ok: true, data: renamed };
          },
        }),
        segments: Object.freeze({
          archive: async (request: {
            studioId: string;
            showId: string;
            showSegmentId: string;
          }) => {
            const design = shows.get(request.showId);
            if (design === undefined) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Segment not found." },
              };
            }
            const updated = {
              ...design,
              segments: design.segments.map((item) =>
                item.segment.id === request.showSegmentId
                  ? {
                      ...item,
                      segment: {
                        ...item.segment,
                        archivedAt: timestamp,
                        updatedAt: timestamp,
                      },
                    }
                  : item,
              ),
            };
            shows.set(request.showId, updated);
            return { ok: true, data: updated };
          },
          create: async (request: {
            studioId: string;
            showId: string;
            blueprintId?: string;
            name: string;
            description?: string;
            position?: number;
          }) => {
            const design = shows.get(request.showId);
            if (design === undefined) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Show not found." },
              };
            }
            const segment = {
              archivedAt: null,
              createdAt: timestamp,
              description: request.description?.trim() || null,
              expectedDurationMs: null,
              id: crypto.randomUUID(),
              name: request.name.trim(),
              showId: request.showId,
              updatedAt: timestamp,
            };
            segmentEditors.set(segment.id, createEditor(segment));
            let updated = {
              ...design,
              segments: [
                ...design.segments,
                { blueprintUsageCount: 0, segment },
              ],
            };
            if (request.blueprintId !== undefined) {
              const placements = [...updated.blueprint.placements];
              placements.splice(
                request.position ?? placements.length,
                0,
                createPlacement(updated, segment.id),
              );
              updated = withPlacements(updated, placements);
            }
            shows.set(request.showId, updated);
            return { ok: true, data: updated };
          },
          createField: async (request: {
            label: string;
            showId: string;
            showSegmentId: string;
            studioId: string;
            type: BrowserSegmentField["type"];
          }) => {
            const editor = scopedEditor(request);
            if (editor === undefined) return editorNotFound();
            const field: BrowserSegmentField = {
              createdAt: timestamp,
              defaultValue: null,
              episodeValueUsageCount: 0,
              helpText: null,
              id: crypto.randomUUID(),
              key: browserFieldKey(request.label, editor.dataFields),
              label: request.label.trim(),
              position: editor.dataFields.length,
              required: false,
              showSegmentId: editor.id,
              type: request.type,
              updatedAt: timestamp,
            };
            return setEditor({
              ...editor,
              dataFields: [...editor.dataFields, field],
              updatedAt: timestamp,
            });
          },
          deleteField: async (request: {
            fieldId: string;
            showId: string;
            showSegmentId: string;
            studioId: string;
          }) => {
            const editor = scopedEditor(request);
            if (editor === undefined) return editorNotFound();
            return setEditor({
              ...editor,
              dataFields: editor.dataFields
                .filter(({ id }) => id !== request.fieldId)
                .map((field, position) => ({ ...field, position })),
              updatedAt: timestamp,
            });
          },
          getEditor: async (request: {
            showId: string;
            showSegmentId: string;
            studioId: string;
          }) => {
            const editor = scopedEditor(request);
            return editor === undefined
              ? editorNotFound()
              : { ok: true, data: editor };
          },
          reorderFields: async (request: {
            orderedFieldIds: string[];
            showId: string;
            showSegmentId: string;
            studioId: string;
          }) => {
            const editor = scopedEditor(request);
            if (editor === undefined) return editorNotFound();
            const byId = new Map(
              editor.dataFields.map((field) => [field.id, field]),
            );
            return setEditor({
              ...editor,
              dataFields: request.orderedFieldIds.flatMap((id, position) => {
                const field = byId.get(id);
                return field === undefined ? [] : [{ ...field, position }];
              }),
              updatedAt: timestamp,
            });
          },
          restoreField: async (request: {
            field: Omit<BrowserSegmentField, "episodeValueUsageCount">;
            showId: string;
            showSegmentId: string;
            studioId: string;
          }) => {
            const editor = scopedEditor(request);
            if (editor === undefined) return editorNotFound();
            const fields = [...editor.dataFields];
            fields.splice(request.field.position, 0, {
              ...request.field,
              episodeValueUsageCount: 0,
            });
            return setEditor({
              ...editor,
              dataFields: fields.map((field, position) => ({
                ...field,
                position,
              })),
              updatedAt: timestamp,
            });
          },
          updateDetails: async (request: {
            expectedDurationMs: number | null;
            name: string;
            notesTemplate: string;
            showId: string;
            showSegmentId: string;
            studioId: string;
          }) => {
            const editor = scopedEditor(request);
            if (editor === undefined) return editorNotFound();
            return setEditor({
              ...editor,
              expectedDurationMs: request.expectedDurationMs,
              name: request.name.trim(),
              notesTemplate: request.notesTemplate,
              updatedAt: timestamp,
            });
          },
          updateField: async (request: {
            defaultValue: unknown;
            fieldId: string;
            helpText: string | null;
            label: string;
            required: boolean;
            showId: string;
            showSegmentId: string;
            studioId: string;
            type: BrowserSegmentField["type"];
          }) => {
            const editor = scopedEditor(request);
            if (editor === undefined) return editorNotFound();
            return setEditor({
              ...editor,
              dataFields: editor.dataFields.map((field) =>
                field.id === request.fieldId
                  ? {
                      ...field,
                      defaultValue: request.defaultValue,
                      helpText: request.helpText,
                      label: request.label.trim(),
                      required: request.required,
                      type: request.type,
                      updatedAt: timestamp,
                    }
                  : field,
              ),
              updatedAt: timestamp,
            });
          },
        }),
        blueprints: Object.freeze({
          addSegment: async (request: {
            position?: number;
            showId: string;
            showSegmentId: string;
          }) => {
            const design = shows.get(request.showId);
            if (design === undefined) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Show not found." },
              };
            }
            const placements = [...design.blueprint.placements];
            placements.splice(
              request.position ?? placements.length,
              0,
              createPlacement(design, request.showSegmentId),
            );
            const updated = withPlacements(design, placements);
            shows.set(request.showId, updated);
            return { ok: true, data: updated };
          },
          duplicatePlacement: async (request: {
            placementId: string;
            showId: string;
          }) => {
            const design = shows.get(request.showId);
            const index = design?.blueprint.placements.findIndex(
              (placement) => placement.id === request.placementId,
            );
            if (design === undefined || index === undefined || index < 0) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Placement not found." },
              };
            }
            const placements = [...design.blueprint.placements];
            const source = placements[index];
            if (source === undefined) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Placement not found." },
              };
            }
            placements.splice(index + 1, 0, {
              ...source,
              id: crypto.randomUUID(),
            });
            const updated = withPlacements(design, placements);
            shows.set(request.showId, updated);
            return { ok: true, data: updated };
          },
          removePlacement: async (request: {
            placementId: string;
            showId: string;
          }) => {
            const design = shows.get(request.showId);
            if (design === undefined) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Placement not found." },
              };
            }
            const updated = withPlacements(
              design,
              design.blueprint.placements.filter(
                (placement) => placement.id !== request.placementId,
              ),
            );
            shows.set(request.showId, updated);
            return { ok: true, data: updated };
          },
          reorder: async (request: {
            orderedPlacementIds: string[];
            showId: string;
          }) => {
            const design = shows.get(request.showId);
            if (design === undefined) {
              return {
                ok: false,
                error: { code: "NOT_FOUND", message: "Show not found." },
              };
            }
            const byId = new Map(
              design.blueprint.placements.map((placement) => [
                placement.id,
                placement,
              ]),
            );
            const updated = withPlacements(
              design,
              request.orderedPlacementIds.flatMap((id) => {
                const placement = byId.get(id);
                return placement === undefined ? [] : [placement];
              }),
            );
            shows.set(request.showId, updated);
            return { ok: true, data: updated };
          },
        }),
        episodes: Object.freeze({
          create: async (request: {
            episodeNumber?: number;
            plannedDate?: string;
            showId: string;
            source: "blueprint" | "blank";
            studioId: string;
            title: string;
          }) => {
            const design = shows.get(request.showId);
            if (design === undefined) return episodeNotFound();
            const episodeId = crypto.randomUUID();
            const placements =
              request.source === "blank" ? [] : design.blueprint.placements;
            const items = placements.flatMap((placement, position) => {
              const sourceSegment = design.segments.find(
                (item) => item.segment.id === placement.showSegmentId,
              )?.segment;
              if (sourceSegment === undefined) return [];
              const editor = segmentEditors.get(sourceSegment.id);
              const fieldValues = Object.fromEntries(
                (editor?.dataFields ?? []).flatMap((field) =>
                  field.defaultValue === null
                    ? []
                    : [[field.key, field.defaultValue] as const],
                ),
              );
              return [
                makeEpisodeItem(
                  {
                    createdAt: timestamp,
                    defaultLayoutOverrideId: null,
                    episodeId,
                    expectedDurationOverrideMs: placement.defaultDurationMs,
                    fieldValues: { ...fieldValues, ...placement.defaultData },
                    fixedResourceReplacements: [],
                    id: crypto.randomUUID(),
                    label: placement.label,
                    notes: editor?.notesTemplate ?? "",
                    position,
                    sourceShowSegmentId: sourceSegment.id,
                    updatedAt: timestamp,
                  },
                  sourceSegment,
                ),
              ];
            });
            const storyboard = withEpisodeItems(
              {
                episode: {
                  createdAt: timestamp,
                  description: null,
                  episodeNumber: request.episodeNumber ?? null,
                  guestNames: [],
                  id: episodeId,
                  internalNotes: "",
                  plannedAt:
                    request.plannedDate === undefined
                      ? null
                      : `${request.plannedDate}T12:00:00.000Z`,
                  segmentCount: 0,
                  showId: request.showId,
                  sponsorInformation: null,
                  status: "draft",
                  subtitle: null,
                  title: request.title,
                  updatedAt: timestamp,
                },
                items: [],
                progress: {
                  estimatedRuntimeMs: 0,
                  needsContentCount: 0,
                  readyCount: 0,
                  segmentCount: 0,
                },
                show: design.show,
              },
              items,
            );
            episodes.set(episodeId, storyboard);
            return { ok: true, data: storyboard };
          },
          createSegment: async (request: {
            description?: string;
            episodeId: string;
            name: string;
            position?: number;
            showId: string;
            studioId: string;
          }) => {
            const storyboard = scopedEpisode(request);
            const design = shows.get(request.showId);
            if (storyboard === undefined || design === undefined)
              return episodeNotFound();
            const sourceSegment: BrowserSegment = {
              archivedAt: null,
              createdAt: timestamp,
              description: request.description?.trim() || null,
              expectedDurationMs: null,
              id: crypto.randomUUID(),
              name: request.name.trim(),
              showId: request.showId,
              updatedAt: timestamp,
            };
            segmentEditors.set(sourceSegment.id, createEditor(sourceSegment));
            shows.set(request.showId, {
              ...design,
              segments: [
                ...design.segments,
                { blueprintUsageCount: 0, segment: sourceSegment },
              ],
            });
            const item = makeEpisodeItem(
              {
                createdAt: timestamp,
                defaultLayoutOverrideId: null,
                episodeId: request.episodeId,
                expectedDurationOverrideMs: null,
                fieldValues: {},
                fixedResourceReplacements: [],
                id: crypto.randomUUID(),
                label: null,
                notes: "",
                position: request.position ?? storyboard.items.length,
                sourceShowSegmentId: sourceSegment.id,
                updatedAt: timestamp,
              },
              sourceSegment,
            );
            const items = [...storyboard.items];
            items.splice(request.position ?? items.length, 0, item);
            const updated = withEpisodeItems(storyboard, items);
            episodes.set(request.episodeId, updated);
            return { ok: true, data: updated };
          },
          duplicateSegment: async (request: {
            episodeId: string;
            episodeSegmentId: string;
            showId: string;
            studioId: string;
          }) => {
            const storyboard = scopedEpisode(request);
            if (storyboard === undefined) return episodeNotFound();
            const index = storyboard.items.findIndex(
              (item) => item.episodeSegment.id === request.episodeSegmentId,
            );
            const source = storyboard.items[index];
            if (source === undefined) return episodeNotFound();
            const items = [...storyboard.items];
            items.splice(index + 1, 0, {
              ...source,
              episodeSegment: {
                ...source.episodeSegment,
                id: crypto.randomUUID(),
              },
            });
            const updated = withEpisodeItems(storyboard, items);
            episodes.set(request.episodeId, updated);
            return { ok: true, data: updated };
          },
          get: async (request: {
            episodeId: string;
            showId: string;
            studioId: string;
          }) => {
            const storyboard = scopedEpisode(request);
            return storyboard === undefined
              ? episodeNotFound()
              : { ok: true, data: storyboard };
          },
          insertSegment: async (request: {
            episodeId: string;
            position?: number;
            showId: string;
            showSegmentId: string;
            studioId: string;
          }) => {
            const storyboard = scopedEpisode(request);
            const sourceSegment = shows
              .get(request.showId)
              ?.segments.find(
                (item) => item.segment.id === request.showSegmentId,
              )?.segment;
            if (storyboard === undefined || sourceSegment === undefined)
              return episodeNotFound();
            const editor = segmentEditors.get(sourceSegment.id);
            const item = makeEpisodeItem(
              {
                createdAt: timestamp,
                defaultLayoutOverrideId: null,
                episodeId: request.episodeId,
                expectedDurationOverrideMs: null,
                fieldValues: Object.fromEntries(
                  (editor?.dataFields ?? []).flatMap((field) =>
                    field.defaultValue === null
                      ? []
                      : [[field.key, field.defaultValue] as const],
                  ),
                ),
                fixedResourceReplacements: [],
                id: crypto.randomUUID(),
                label: null,
                notes: editor?.notesTemplate ?? "",
                position: request.position ?? storyboard.items.length,
                sourceShowSegmentId: sourceSegment.id,
                updatedAt: timestamp,
              },
              sourceSegment,
            );
            const items = [...storyboard.items];
            items.splice(request.position ?? items.length, 0, item);
            const updated = withEpisodeItems(storyboard, items);
            episodes.set(request.episodeId, updated);
            return { ok: true, data: updated };
          },
          list: async (request: { showId: string; studioId: string }) => ({
            ok: true,
            data: [...episodes.values()]
              .filter(
                (storyboard) =>
                  storyboard.episode.showId === request.showId &&
                  storyboard.show.studioId === request.studioId,
              )
              .map((storyboard) => ({
                ...storyboard.episode,
                estimatedRuntimeMs: storyboard.progress.estimatedRuntimeMs,
              })),
          }),
          removeSegment: async (request: {
            episodeId: string;
            episodeSegmentId: string;
            showId: string;
            studioId: string;
          }) => {
            const storyboard = scopedEpisode(request);
            if (storyboard === undefined) return episodeNotFound();
            const updated = withEpisodeItems(
              storyboard,
              storyboard.items.filter(
                (item) => item.episodeSegment.id !== request.episodeSegmentId,
              ),
            );
            episodes.set(request.episodeId, updated);
            return { ok: true, data: updated };
          },
          reorder: async (request: {
            episodeId: string;
            orderedEpisodeSegmentIds: string[];
            showId: string;
            studioId: string;
          }) => {
            const storyboard = scopedEpisode(request);
            if (storyboard === undefined) return episodeNotFound();
            const byId = new Map(
              storyboard.items.map((item) => [item.episodeSegment.id, item]),
            );
            const updated = withEpisodeItems(
              storyboard,
              request.orderedEpisodeSegmentIds.flatMap((id) => {
                const item = byId.get(id);
                return item === undefined ? [] : [item];
              }),
            );
            episodes.set(request.episodeId, updated);
            return { ok: true, data: updated };
          },
          restoreSegment: async (request: {
            episodeId: string;
            segment: BrowserEpisodeSegment;
            showId: string;
            studioId: string;
          }) => {
            const storyboard = scopedEpisode(request);
            const sourceSegment = shows
              .get(request.showId)
              ?.segments.find(
                (item) =>
                  item.segment.id === request.segment.sourceShowSegmentId,
              )?.segment;
            if (storyboard === undefined || sourceSegment === undefined)
              return episodeNotFound();
            const items = [...storyboard.items];
            items.splice(request.segment.position, 0, {
              ...makeEpisodeItem(request.segment, sourceSegment),
            });
            const updated = withEpisodeItems(storyboard, items);
            episodes.set(request.episodeId, updated);
            return { ok: true, data: updated };
          },
          updateSegment: async (request: {
            episodeId: string;
            episodeSegmentId: string;
            expectedDurationOverrideMs: number | null;
            expectedUpdatedAt: string;
            fieldValues: Record<string, unknown>;
            notes: string;
            showId: string;
            studioId: string;
          }) => {
            const storyboard = scopedEpisode(request);
            if (storyboard === undefined) return episodeNotFound();
            const item = storyboard.items.find(
              (candidate) =>
                candidate.episodeSegment.id === request.episodeSegmentId,
            );
            if (
              item === undefined ||
              item.episodeSegment.updatedAt !== request.expectedUpdatedAt
            ) {
              return {
                ok: false,
                error: {
                  code: "CONFLICT",
                  message:
                    "This Episode Segment changed while you were editing. Review the saved version and try again.",
                },
              };
            }
            const updated = withEpisodeItems(
              storyboard,
              storyboard.items.map((candidate) =>
                candidate.episodeSegment.id === request.episodeSegmentId
                  ? {
                      ...candidate,
                      episodeSegment: {
                        ...candidate.episodeSegment,
                        expectedDurationOverrideMs:
                          request.expectedDurationOverrideMs,
                        fieldValues: request.fieldValues,
                        notes: request.notes,
                        updatedAt: nextTimestamp(),
                      },
                    }
                  : candidate,
              ),
            );
            episodes.set(request.episodeId, updated);
            return { ok: true, data: updated };
          },
        }),
        resources: Object.freeze({
          getUrl: async () => ({
            ok: true,
            data: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
          }),
          import: async (request: { context: BrowserResourceContext }) => {
            const resource = createResource(request.context);
            resources.set(resource.id, resource);
            return { ok: true, data: visibleResources(request.context) };
          },
          importDropped: async (
            request: { context: BrowserResourceContext },
            files: Array<{ name: string }>,
          ) => {
            for (const file of files) {
              const resource = createResource(request.context, file.name);
              resources.set(resource.id, resource);
            }
            return { ok: true, data: visibleResources(request.context) };
          },
          list: async (request: { context: BrowserResourceContext }) => ({
            ok: true,
            data: visibleResources(request.context),
          }),
          locate: async (request: {
            context: BrowserResourceContext;
            resourceId: string;
          }) => {
            const resource = resources.get(request.resourceId);
            if (resource !== undefined)
              resources.set(resource.id, {
                ...resource,
                availability: "available",
              });
            return { ok: true, data: visibleResources(request.context) };
          },
          remove: async (request: {
            context: BrowserResourceContext;
            resourceId: string;
          }) => {
            resources.delete(request.resourceId);
            return { ok: true, data: visibleResources(request.context) };
          },
          rename: async (request: {
            context: BrowserResourceContext;
            displayName: string;
            resourceId: string;
          }) => {
            const resource = resources.get(request.resourceId);
            if (resource !== undefined)
              resources.set(resource.id, {
                ...resource,
                displayName: request.displayName.trim(),
              });
            return { ok: true, data: visibleResources(request.context) };
          },
          replace: async (request: {
            context: BrowserResourceContext;
            resourceId: string;
          }) => {
            const resource = resources.get(request.resourceId);
            if (resource !== undefined)
              resources.set(resource.id, {
                ...resource,
                availability: "available",
              });
            return { ok: true, data: visibleResources(request.context) };
          },
          updateMetadata: async (request: {
            context: BrowserResourceContext;
            dimensions?: { height: number; width: number };
            durationMs?: number;
            resourceId: string;
            unsupported?: boolean;
          }) => {
            const resource = resources.get(request.resourceId);
            if (resource !== undefined) {
              resources.set(resource.id, {
                ...resource,
                ...(request.dimensions === undefined
                  ? {}
                  : { dimensions: request.dimensions }),
                ...(request.durationMs === undefined
                  ? {}
                  : { durationMs: request.durationMs }),
                ...(request.unsupported === true
                  ? { availability: "unsupported" }
                  : {}),
              });
            }
            return { ok: true, data: visibleResources(request.context) };
          },
        }),
      });

      Object.defineProperty(window, "showflow", {
        configurable: false,
        enumerable: true,
        value: mockApi,
        writable: false,
      });
    },
    {
      apiVersion: api.apiVersion,
      applicationSettings: applicationSettingsResult,
      initialStudios,
      runtimeInfo: runtimeInfoResult,
    },
  );
};
