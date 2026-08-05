declare const UUID_BRAND: unique symbol;
declare const ENTITY_ID_BRAND: unique symbol;

/** A UUID in the canonical lowercase, hyphenated representation. */
export type Uuid = string & { readonly [UUID_BRAND]: "Uuid" };

export type EntityIdKind =
  | "studio"
  | "show"
  | "showBlueprint"
  | "blueprintSegmentPlacement"
  | "showSegment"
  | "segmentDataField"
  | "episode"
  | "episodeSegment"
  | "layout"
  | "slot"
  | "component"
  | "componentPlacement"
  | "resource"
  | "hostCue"
  | "validationIssue";

/** A UUID branded for one domain entity type to prevent cross-entity references. */
export type EntityId<TEntity extends EntityIdKind> = Uuid & {
  readonly [ENTITY_ID_BRAND]: TEntity;
};

export type StudioId = EntityId<"studio">;
export type ShowId = EntityId<"show">;
export type ShowBlueprintId = EntityId<"showBlueprint">;
export type BlueprintSegmentPlacementId = EntityId<"blueprintSegmentPlacement">;
export type ShowSegmentId = EntityId<"showSegment">;
export type SegmentDataFieldId = EntityId<"segmentDataField">;
export type EpisodeId = EntityId<"episode">;
export type EpisodeSegmentId = EntityId<"episodeSegment">;
export type LayoutId = EntityId<"layout">;
export type SlotId = EntityId<"slot">;
export type ComponentId = EntityId<"component">;
export type ComponentPlacementId = EntityId<"componentPlacement">;
export type ResourceId = EntityId<"resource">;
export type HostCueId = EntityId<"hostCue">;
export type ValidationIssueId = EntityId<"validationIssue">;

interface CryptoWithRandomUuid {
  randomUUID(): string;
}

const CANONICAL_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export const isUuid = (value: unknown): value is Uuid =>
  typeof value === "string" && CANONICAL_UUID_PATTERN.test(value);

export const parseUuid = (value: string): Uuid => {
  if (!isUuid(value)) {
    throw new TypeError(
      "Expected a canonical lowercase UUID with a valid version and variant.",
    );
  }

  return value;
};

const getCrypto = (): CryptoWithRandomUuid => {
  const runtimeCrypto = (
    globalThis as typeof globalThis & { crypto?: CryptoWithRandomUuid }
  ).crypto;

  if (runtimeCrypto === undefined) {
    throw new Error("This runtime does not provide crypto.randomUUID().");
  }

  return runtimeCrypto;
};

/** Generates a UUID using the runtime's cryptographically secure UUID source. */
export const createUuid = (): Uuid => parseUuid(getCrypto().randomUUID());

export const parseEntityId = <TEntity extends EntityIdKind>(
  value: string,
): EntityId<TEntity> => parseUuid(value) as EntityId<TEntity>;

export const createEntityId = <
  TEntity extends EntityIdKind,
>(): EntityId<TEntity> => createUuid() as EntityId<TEntity>;
