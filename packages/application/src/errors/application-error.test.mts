import { describe, expect, test } from "vitest";

import {
  APPLICATION_ERROR_CODES,
  PersistenceFailureError,
} from "./application-error.mjs";

describe("application errors", () => {
  test("publishes the stable error taxonomy", () => {
    expect(APPLICATION_ERROR_CODES).toEqual([
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "CONFLICT",
      "PERSISTENCE_FAILURE",
      "FILE_UNAVAILABLE",
      "UNSUPPORTED_MEDIA",
      "PERMISSION_DENIED",
      "DEVICE_UNAVAILABLE",
      "RUNTIME_FAILURE",
      "INTERNAL_ERROR",
    ]);
  });

  test("keeps a persistence cause internal to a stable application error", () => {
    const cause = new Error(
      "SQLITE_ERROR near SELECT * FROM private_table at database-service.mts:1",
    );
    const error = new PersistenceFailureError("read", cause);

    expect(error).toMatchObject({
      code: "PERSISTENCE_FAILURE",
      message: "Showflow could not complete a local persistence operation.",
      operation: "read",
    });
    expect(error.cause).toBe(cause);
    expect(error.message).not.toMatch(/SELECT|private_table|database-service/u);
  });
});
