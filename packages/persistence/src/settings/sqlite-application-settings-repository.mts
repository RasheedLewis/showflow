import { z } from "zod";

import type {
  ApplicationSettings,
  ApplicationSettingsRepository,
  UpdateNavigationSettings,
  WindowPreferences,
} from "@showflow/application";

import type {
  DatabaseExecutor,
  ShowflowDatabase,
} from "../database/database-service.mjs";
import { mapPersistenceError } from "../errors/persistence-error-mapper.mjs";

export class StoredApplicationSettingsError extends Error {
  override readonly name = "StoredApplicationSettingsError";
  readonly code = "STORED_SETTINGS_INVALID" as const;

  constructor(cause: unknown) {
    super("Stored application settings are invalid.", { cause });
  }
}

const ApplicationRouteSchema = z
  .string()
  .min(1)
  .max(2_048)
  .regex(/^\/(?!\/)[^\s#]*$/u);
const WindowPreferencesSchema = z
  .object({
    height: z.number().int().min(640).max(16_384),
    isMaximized: z.boolean(),
    width: z.number().int().min(960).max(16_384),
  })
  .strict();
const StoredSettingsRowSchema = z
  .object({
    lastRoute: ApplicationRouteSchema,
    lastStudioId: z.string().uuid().nullable(),
    windowPreferencesJson: z.string().nullable(),
  })
  .strict();
const NavigationSchema = z
  .object({
    lastRoute: ApplicationRouteSchema,
    lastStudioId: z.string().uuid().nullable(),
  })
  .strict();

const SETTINGS_QUERY = `
  SELECT
    last_studio_id AS lastStudioId,
    last_route AS lastRoute,
    window_preferences_json AS windowPreferencesJson
  FROM app_settings
  WHERE id = 1
`;

const parseStoredSettings = (value: unknown): ApplicationSettings => {
  try {
    const row = StoredSettingsRowSchema.parse(value);
    const windowPreferences =
      row.windowPreferencesJson === null
        ? null
        : WindowPreferencesSchema.parse(JSON.parse(row.windowPreferencesJson));

    return {
      lastRoute: row.lastRoute,
      lastStudioId: row.lastStudioId,
      windowPreferences,
    };
  } catch (error) {
    throw new StoredApplicationSettingsError(error);
  }
};

const StoredSettingsParser = { parse: parseStoredSettings };

const readSettings = (database: DatabaseExecutor): ApplicationSettings =>
  database.queryRequired(SETTINGS_QUERY, StoredSettingsParser);

const assertUpdatedSingleton = (changes: bigint | number): void => {
  if (changes !== 1 && changes !== 1n) {
    throw new Error("The application settings singleton row is missing.");
  }
};

export class SqliteApplicationSettingsRepository implements ApplicationSettingsRepository {
  readonly #database: ShowflowDatabase;

  constructor(database: ShowflowDatabase) {
    this.#database = database;
  }

  async get(): Promise<ApplicationSettings> {
    try {
      return readSettings(this.#database);
    } catch (error) {
      throw mapPersistenceError(error, "read");
    }
  }

  async updateNavigation(
    navigation: UpdateNavigationSettings,
  ): Promise<ApplicationSettings> {
    const validNavigation = NavigationSchema.parse(navigation);

    try {
      return this.#database.transaction((database) => {
        const result = database.run(
          `
            UPDATE app_settings
            SET last_studio_id = ?, last_route = ?
            WHERE id = 1
          `,
          [validNavigation.lastStudioId, validNavigation.lastRoute],
        );
        assertUpdatedSingleton(result.changes);
        return readSettings(database);
      });
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }

  async updateWindowPreferences(
    windowPreferences: WindowPreferences,
  ): Promise<ApplicationSettings> {
    const validWindowPreferences =
      WindowPreferencesSchema.parse(windowPreferences);

    try {
      return this.#database.transaction((database) => {
        const result = database.run(
          `
            UPDATE app_settings
            SET window_preferences_json = ?
            WHERE id = 1
          `,
          [JSON.stringify(validWindowPreferences)],
        );
        assertUpdatedSingleton(result.changes);
        return readSettings(database);
      });
    } catch (error) {
      throw mapPersistenceError(error, "write");
    }
  }
}
