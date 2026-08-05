declare const UTC_TIMESTAMP_BRAND: unique symbol;

/** A canonical ISO 8601 instant normalized to UTC with millisecond precision. */
export type UtcTimestamp = string & {
  readonly [UTC_TIMESTAMP_BRAND]: "UtcTimestamp";
};

export interface Clock {
  now(): Date;
}

const CANONICAL_UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export const isUtcTimestamp = (value: unknown): value is UtcTimestamp => {
  if (
    typeof value !== "string" ||
    !CANONICAL_UTC_TIMESTAMP_PATTERN.test(value)
  ) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};

export const parseUtcTimestamp = (value: string): UtcTimestamp => {
  if (!isUtcTimestamp(value)) {
    throw new TypeError(
      "Expected a canonical ISO 8601 UTC timestamp with millisecond precision.",
    );
  }

  return value;
};

export const toUtcTimestamp = (value: Date): UtcTimestamp => {
  if (Number.isNaN(value.getTime())) {
    throw new RangeError("Cannot create a UTC timestamp from an invalid date.");
  }

  return parseUtcTimestamp(value.toISOString());
};

export const currentUtcTimestamp = (clock: Clock): UtcTimestamp =>
  toUtcTimestamp(clock.now());

export const SYSTEM_CLOCK: Clock = Object.freeze({
  now: (): Date => new Date(),
});

/** Creates an immutable test clock that returns a fresh Date on every read. */
export const createFixedClock = (instant: Date | UtcTimestamp): Clock => {
  const epochMilliseconds =
    instant instanceof Date ? instant.getTime() : new Date(instant).getTime();

  if (Number.isNaN(epochMilliseconds)) {
    throw new RangeError("Cannot fix a clock at an invalid instant.");
  }

  return Object.freeze({
    now: (): Date => new Date(epochMilliseconds),
  });
};
