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
  type EpisodeStoryboardDto,
  type GetEpisodeRequest,
  type InsertEpisodeSegmentRequest,
  type ListEpisodesRequest,
  type ReorderEpisodeRequest,
  type RestoreEpisodeSegmentRequest,
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
  const withEpisodeItems = (
    storyboard: EpisodeStoryboardDto,
    items: EpisodeStoryboardDto["items"],
  ): EpisodeStoryboardDto => {
    const positioned = items.map((item, position) => ({
      ...item,
      episodeSegment: { ...item.episodeSegment, position },
    }));
    return {
      ...storyboard,
      episode: { ...storyboard.episode, segmentCount: positioned.length },
      items: positioned,
      progress: {
        estimatedRuntimeMs: positioned.reduce(
          (total, item) => total + (item.expectedDurationMs ?? 0),
          0,
        ),
        needsContentCount: positioned.length,
        readyCount: 0,
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
          return [
            {
              episodeSegment: {
                createdAt: DEFAULT_TIMESTAMP,
                defaultLayoutOverrideId: null,
                episodeId,
                expectedDurationOverrideMs: placement.defaultDurationMs,
                fieldValues: placement.defaultData,
                fixedResourceReplacements: [],
                id: crypto.randomUUID(),
                label: placement.label,
                notes: "",
                position,
                sourceShowSegmentId: sourceSegment.id,
                updatedAt: DEFAULT_TIMESTAMP,
              },
              expectedDurationMs:
                placement.defaultDurationMs ?? sourceSegment.expectedDurationMs,
              readiness: "needs-content" as const,
              sourceSegment,
              summary: placement.label,
              validationIssueCount: 0,
            },
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
        shows.set(request.showId, {
          ...design,
          segments: [
            ...design.segments,
            { blueprintUsageCount: 0, segment: sourceSegment },
          ],
        });
        const item = {
          episodeSegment: {
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
          expectedDurationMs: null,
          readiness: "needs-content" as const,
          sourceSegment,
          summary: null,
          validationIssueCount: 0,
        };
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
        const item = {
          episodeSegment: {
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
          expectedDurationMs: sourceSegment.expectedDurationMs,
          readiness: "needs-content" as const,
          sourceSegment,
          summary: null,
          validationIssueCount: 0,
        };
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
        items.splice(request.segment.position, 0, {
          episodeSegment: request.segment,
          expectedDurationMs:
            request.segment.expectedDurationOverrideMs ??
            sourceSegment.expectedDurationMs,
          readiness: "needs-content",
          sourceSegment,
          summary: request.segment.label,
          validationIssueCount: 0,
        });
        const updated = withEpisodeItems(storyboard, items);
        episodes.set(request.episodeId, updated);
        return { ok: true as const, data: updated };
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
        episodeSegment: BrowserEpisodeSegment;
        expectedDurationMs: number | null;
        readiness: "needs-content";
        sourceSegment: BrowserSegment;
        summary: string | null;
        validationIssueCount: number;
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
      const withEpisodeItems = (
        storyboard: BrowserStoryboard,
        items: BrowserEpisodeItem[],
      ): BrowserStoryboard => {
        const positioned = items.map((item, position) => ({
          ...item,
          episodeSegment: { ...item.episodeSegment, position },
        }));
        return {
          ...storyboard,
          episode: { ...storyboard.episode, segmentCount: positioned.length },
          items: positioned,
          progress: {
            estimatedRuntimeMs: positioned.reduce(
              (total, item) => total + (item.expectedDurationMs ?? 0),
              0,
            ),
            needsContentCount: positioned.length,
            readyCount: 0,
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
              return [
                {
                  episodeSegment: {
                    createdAt: timestamp,
                    defaultLayoutOverrideId: null,
                    episodeId,
                    expectedDurationOverrideMs: placement.defaultDurationMs,
                    fieldValues: placement.defaultData,
                    fixedResourceReplacements: [],
                    id: crypto.randomUUID(),
                    label: placement.label,
                    notes: "",
                    position,
                    sourceShowSegmentId: sourceSegment.id,
                    updatedAt: timestamp,
                  },
                  expectedDurationMs:
                    placement.defaultDurationMs ??
                    sourceSegment.expectedDurationMs,
                  readiness: "needs-content" as const,
                  sourceSegment,
                  summary: placement.label,
                  validationIssueCount: 0,
                },
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
            shows.set(request.showId, {
              ...design,
              segments: [
                ...design.segments,
                { blueprintUsageCount: 0, segment: sourceSegment },
              ],
            });
            const item: BrowserEpisodeItem = {
              episodeSegment: {
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
              expectedDurationMs: null,
              readiness: "needs-content",
              sourceSegment,
              summary: null,
              validationIssueCount: 0,
            };
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
            const item: BrowserEpisodeItem = {
              episodeSegment: {
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
              expectedDurationMs: sourceSegment.expectedDurationMs,
              readiness: "needs-content",
              sourceSegment,
              summary: null,
              validationIssueCount: 0,
            };
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
              episodeSegment: request.segment,
              expectedDurationMs:
                request.segment.expectedDurationOverrideMs ??
                sourceSegment.expectedDurationMs,
              readiness: "needs-content",
              sourceSegment,
              summary: request.segment.label,
              validationIssueCount: 0,
            });
            const updated = withEpisodeItems(storyboard, items);
            episodes.set(request.episodeId, updated);
            return { ok: true, data: updated };
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
