export const APPLICATION_ERROR_CODES = [
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
] as const;

export type ApplicationErrorCode = (typeof APPLICATION_ERROR_CODES)[number];
export type PersistenceOperation = "read" | "write";

export class ApplicationError extends Error {
  override readonly name: string = "ApplicationError";
  readonly code: ApplicationErrorCode;

  constructor(
    code: ApplicationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.code = code;
  }
}

export class PersistenceFailureError extends ApplicationError {
  override readonly name = "PersistenceFailureError";
  readonly operation: PersistenceOperation;

  constructor(operation: PersistenceOperation, cause: unknown) {
    super(
      "PERSISTENCE_FAILURE",
      "Showflow could not complete a local persistence operation.",
      { cause },
    );
    this.operation = operation;
  }
}
