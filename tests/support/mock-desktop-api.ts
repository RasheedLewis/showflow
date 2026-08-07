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
          .map(({ show }) => ({ episodeCount: 0, show })),
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
      const shows = new Map<string, BrowserDesign>();
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
              .map(({ show }) => ({ episodeCount: 0, show })),
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
