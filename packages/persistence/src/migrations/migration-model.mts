export type MigrationErrorCode =
  | "MIGRATION_APPLY_FAILED"
  | "MIGRATION_HISTORY_INVALID"
  | "MIGRATION_INITIALIZATION_FAILED"
  | "MIGRATION_LOAD_FAILED";

export interface MigrationIdentity {
  readonly name: string;
  readonly version: number;
}

export interface LoadedMigration extends MigrationIdentity {
  readonly checksum: string;
  readonly fileName: string;
  readonly sql: string;
}

export interface AppliedMigration extends MigrationIdentity {
  readonly appliedAt: string;
  readonly checksum: string;
}

export type MigrationLogEvent =
  | {
      readonly migration: MigrationIdentity;
      readonly type: "migration-applying";
    }
  | {
      readonly appliedAt: string;
      readonly migration: MigrationIdentity;
      readonly type: "migration-applied";
    }
  | {
      readonly message: string;
      readonly migration: MigrationIdentity;
      readonly type: "migration-failed";
    }
  | {
      readonly appliedCount: number;
      readonly previouslyAppliedCount: number;
      readonly totalMigrationCount: number;
      readonly type: "migration-run-complete";
    };

export interface MigrationLogger {
  log(event: MigrationLogEvent): void;
}

interface MigrationErrorOptions {
  readonly cause?: unknown;
  readonly code: MigrationErrorCode;
  readonly message: string;
  readonly migration?: MigrationIdentity;
}

export class MigrationError extends Error {
  override readonly name = "MigrationError";
  readonly code: MigrationErrorCode;
  readonly migration: MigrationIdentity | undefined;

  constructor(options: MigrationErrorOptions) {
    super(
      options.message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.code = options.code;
    this.migration = options.migration;
  }
}
