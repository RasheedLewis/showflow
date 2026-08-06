import { expect, test } from "vitest";

import {
  DESKTOP_API_VERSION,
  type ApplicationSettingsResult,
} from "@showflow/contracts";

import { createShowflowDesktopApi } from "./api.mts";

const validResult = {
  ok: true,
  data: {
    applicationVersion: "0.0.0",
    desktopApiVersion: DESKTOP_API_VERSION,
    platform: "darwin",
    architecture: "arm64",
  },
} as const;
const validSettingsResult = {
  ok: true,
  data: {
    lastRoute: "/",
    lastStudioId: null,
    windowPreferences: null,
  },
} as const satisfies ApplicationSettingsResult;
const validStudioResult = {
  ok: true,
  data: {
    archivedAt: null,
    createdAt: "2026-08-06T14:30:00.000Z",
    id: "8d9df01f-2584-4b9a-ad13-a96d673918e9",
    logoResourceId: null,
    name: "Public Sphere",
    updatedAt: "2026-08-06T14:30:00.000Z",
  },
} as const;
const validShowResult = {
  ok: true,
  data: {
    show: {
      archivedAt: null,
      createdAt: "2026-08-06T14:30:00.000Z",
      description: "Weekly artist interviews.",
      id: "514ad6df-710d-4301-9bff-b096e9db3dd4",
      name: "Artist Interviews",
      studioId: validStudioResult.data.id,
      thumbnailResourceId: null,
      updatedAt: "2026-08-06T14:30:00.000Z",
    },
    blueprint: {
      createdAt: "2026-08-06T14:30:00.000Z",
      id: "5da62c88-a25d-450d-bf4d-3809a9f8bd11",
      placementCount: 0,
      showId: "514ad6df-710d-4301-9bff-b096e9db3dd4",
      updatedAt: "2026-08-06T14:30:00.000Z",
    },
  },
} as const;

const createValidTransports = () => ({
  archiveShow: async () => ({ ok: true, data: validShowResult.data.show }),
  createShow: async () => validShowResult,
  createStudio: async () => validStudioResult,
  deleteShow: async () => ({
    ok: true,
    data: { showId: validShowResult.data.show.id },
  }),
  getApplicationSettings: async () => validSettingsResult,
  getRuntimeInfo: async () => validResult,
  getShowDesign: async () => validShowResult,
  getStudio: async () => validStudioResult,
  listShows: async () => ({
    ok: true,
    data: [{ episodeCount: 0, show: validShowResult.data.show }],
  }),
  listStudios: async () => ({ ok: true, data: [validStudioResult.data] }),
  renameShow: async () => ({ ok: true, data: validShowResult.data.show }),
  updateNavigation: async () => validSettingsResult,
});

test("the preload validates Show creation and Design Show responses", async () => {
  const api = createShowflowDesktopApi(createValidTransports());
  const request = {
    studioId: validStudioResult.data.id,
    name: "Artist Interviews",
    description: "Weekly artist interviews.",
  };

  await expect(api.shows.create(request)).resolves.toEqual(validShowResult);
  await expect(
    api.shows.getDesign({
      studioId: validStudioResult.data.id,
      showId: validShowResult.data.show.id,
    }),
  ).resolves.toEqual(validShowResult);
  await expect(api.shows.create({ ...request, name: "   " })).rejects.toThrow();
  await expect(
    api.shows.list({ studioId: validStudioResult.data.id }),
  ).resolves.toMatchObject({ ok: true, data: [{ episodeCount: 0 }] });
  await expect(
    api.shows.rename({
      studioId: validStudioResult.data.id,
      showId: validShowResult.data.show.id,
      name: "Renamed Show",
    }),
  ).resolves.toMatchObject({ ok: true });
});

test("the preload API validates and returns runtime information", async () => {
  const api = createShowflowDesktopApi(createValidTransports());

  await expect(api.app.getRuntimeInfo()).resolves.toEqual(validResult);
});

test("the preload API rejects an invalid runtime response", async () => {
  const api = createShowflowDesktopApi({
    ...createValidTransports(),
    getRuntimeInfo: async () => ({
      ok: true,
      data: { platform: "browser" },
    }),
  });

  await expect(api.app.getRuntimeInfo()).rejects.toThrow();
});

test("the preload validates settings requests and responses", async () => {
  const api = createShowflowDesktopApi(createValidTransports());

  await expect(api.app.getApplicationSettings()).resolves.toEqual(
    validSettingsResult,
  );
  await expect(
    api.app.updateNavigation({
      lastRoute: "https://example.com",
      lastStudioId: null,
    }),
  ).rejects.toThrow();

  const invalidResponseApi = createShowflowDesktopApi({
    ...createValidTransports(),
    getApplicationSettings: async () => ({
      ok: true,
      data: {
        lastRoute: "https://example.com",
        lastStudioId: null,
        windowPreferences: null,
      },
    }),
  });
  await expect(
    invalidResponseApi.app.getApplicationSettings(),
  ).rejects.toThrow();
});

test("the preload validates Studio requests and responses", async () => {
  const api = createShowflowDesktopApi(createValidTransports());

  await expect(api.studios.create({ name: "Public Sphere" })).resolves.toEqual(
    validStudioResult,
  );
  await expect(
    api.studios.get({ studioId: validStudioResult.data.id }),
  ).resolves.toEqual(validStudioResult);
  await expect(api.studios.list()).resolves.toEqual({
    ok: true,
    data: [validStudioResult.data],
  });
  await expect(api.studios.create({ name: "   " })).rejects.toThrow();
  await expect(
    createShowflowDesktopApi({
      ...createValidTransports(),
      getStudio: async () => ({ ok: true, data: { id: "invalid" } }),
    }).studios.get({ studioId: validStudioResult.data.id }),
  ).rejects.toThrow();
  await expect(
    createShowflowDesktopApi({
      ...createValidTransports(),
      listStudios: async () => ({ ok: true, data: [{ id: "invalid" }] }),
    }).studios.list(),
  ).rejects.toThrow();
});

test("the preload exposes no generic invocation surface", () => {
  const api = createShowflowDesktopApi(createValidTransports());

  expect(Object.keys(api)).toEqual(["apiVersion", "app", "studios", "shows"]);
  expect(Object.keys(api.app)).toEqual([
    "getApplicationSettings",
    "getRuntimeInfo",
    "updateNavigation",
  ]);
  expect("invoke" in api).toBe(false);
  expect("invoke" in api.app).toBe(false);
  expect(Object.keys(api.studios)).toEqual(["create", "get", "list"]);
  expect("invoke" in api.studios).toBe(false);
  expect(Object.keys(api.shows)).toEqual([
    "archive",
    "create",
    "delete",
    "getDesign",
    "list",
    "rename",
  ]);
  expect(Object.isFrozen(api)).toBe(true);
  expect(Object.isFrozen(api.app)).toBe(true);
  expect(Object.isFrozen(api.studios)).toBe(true);
  expect(Object.isFrozen(api.shows)).toBe(true);
});
