import {
  PersistenceFailureError,
  type PersistenceOperation,
} from "@showflow/application";

export const mapPersistenceError = (
  error: unknown,
  operation: PersistenceOperation,
): PersistenceFailureError => new PersistenceFailureError(operation, error);
