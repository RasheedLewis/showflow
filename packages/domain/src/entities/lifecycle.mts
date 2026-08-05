import type {
  ActiveSegmentConfiguration,
  LifecycleAction,
  SegmentLifecycle,
} from "./segment.mjs";
import type { EntityMetadata } from "./entity-metadata.mjs";
import type { ShowSegmentId } from "../identity/entity-id.mjs";

export const SEGMENT_LIFECYCLE_PHASES = Object.freeze([
  "prepare",
  "enter",
  "active",
  "exit",
  "cleanup",
] as const);

export type SegmentLifecyclePhase = (typeof SEGMENT_LIFECYCLE_PHASES)[number];

export interface SegmentLifecycleDefinition extends EntityMetadata {
  readonly showSegmentId: ShowSegmentId;
  readonly prepare: readonly LifecycleAction[];
  readonly enter: readonly LifecycleAction[];
  readonly active: ActiveSegmentConfiguration;
  readonly exit: readonly LifecycleAction[];
  readonly cleanup: readonly LifecycleAction[];
}

export const isSegmentLifecyclePhase = (
  value: unknown,
): value is SegmentLifecyclePhase =>
  SEGMENT_LIFECYCLE_PHASES.some((phase) => phase === value);

export const parseSegmentLifecyclePhase = (
  value: unknown,
): SegmentLifecyclePhase => {
  if (!isSegmentLifecyclePhase(value)) {
    throw new TypeError(
      "Expected one of the five canonical Segment lifecycle phases.",
    );
  }

  return value;
};

export const getNextSegmentLifecyclePhase = (
  phase: SegmentLifecyclePhase,
): SegmentLifecyclePhase | undefined => {
  const phaseIndex = SEGMENT_LIFECYCLE_PHASES.indexOf(phase);
  return SEGMENT_LIFECYCLE_PHASES[phaseIndex + 1];
};

const freezeActions = (
  actions: readonly LifecycleAction[],
): readonly LifecycleAction[] => Object.freeze([...actions]);

const freezeActiveConfiguration = (
  active: ActiveSegmentConfiguration,
): ActiveSegmentConfiguration =>
  Object.freeze({
    ...active,
    availableLayoutIds: Object.freeze([...active.availableLayoutIds]),
    hostCueIds: Object.freeze([...active.hostCueIds]),
  });

const LIFECYCLE_DEFINITION_KEYS = Object.freeze([
  "showSegmentId",
  ...SEGMENT_LIFECYCLE_PHASES,
  "createdAt",
  "updatedAt",
] as const);

const assertNoCustomLifecycleFields = (
  definition: SegmentLifecycleDefinition,
): void => {
  const customField = Object.keys(definition).find(
    (key) =>
      !LIFECYCLE_DEFINITION_KEYS.some((allowedKey) => allowedKey === key),
  );

  if (customField !== undefined) {
    throw new TypeError(
      `Segment lifecycle cannot define custom phase or field "${customField}".`,
    );
  }
};

/**
 * Constructs the lifecycle from fixed fields and rejects additional runtime
 * keys, so persisted domain state cannot gain custom phases.
 */
export const defineSegmentLifecycle = (
  definition: SegmentLifecycleDefinition,
): SegmentLifecycle => {
  assertNoCustomLifecycleFields(definition);

  return Object.freeze({
    showSegmentId: definition.showSegmentId,
    prepare: freezeActions(definition.prepare),
    enter: freezeActions(definition.enter),
    active: freezeActiveConfiguration(definition.active),
    exit: freezeActions(definition.exit),
    cleanup: freezeActions(definition.cleanup),
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
  });
};
