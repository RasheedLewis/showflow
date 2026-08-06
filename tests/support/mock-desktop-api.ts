import {
  DESKTOP_API_VERSION,
  type ApplicationSettingsResult,
  type CreateStudioRequest,
  type CreateShowRequest,
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
            showId,
            updatedAt: DEFAULT_TIMESTAMP,
          },
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
      const shows = new Map();
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
                showId,
                updatedAt: timestamp,
              },
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
