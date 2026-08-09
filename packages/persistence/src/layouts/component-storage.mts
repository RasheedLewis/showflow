import { z } from "zod";

import {
  BUILT_IN_COMPONENT_TYPES,
  parseEntityId,
  parseUtcTimestamp,
  type Component,
  type JsonObject,
  type JsonValue,
} from "@showflow/domain";

import type { DatabaseExecutor } from "../database/database-service.mjs";
import { StoredLayoutError } from "./layout-storage.mjs";

const AnimationSchema = z
  .object({
    preset: z.enum([
      "none",
      "fade",
      "slideUp",
      "slideDown",
      "slideLeft",
      "slideRight",
      "scaleIn",
      "scaleOut",
      "pop",
      "wipe",
    ]),
    durationMs: z.number().int().nonnegative(),
    delayMs: z.number().int().nonnegative(),
    easing: z.string().min(1),
  })
  .strict();
const PropertySchema = z.array(
  z
    .object({
      key: z.string().min(1),
      label: z.string().min(1),
      type: z.enum([
        "string",
        "number",
        "boolean",
        "cameraResource",
        "imageResource",
        "videoResource",
        "audioResource",
      ]),
      required: z.boolean(),
      defaultValue: z.json().optional(),
    })
    .strict(),
);
const SlotRoleSchema = z.enum([
  "background",
  "hostCamera",
  "guestCamera",
  "mainVideo",
  "pictureInPicture",
  "logo",
  "lowerThird",
  "banner",
  "chat",
  "center",
  "topCenter",
  "bottomCenter",
  "upperLeft",
  "upperRight",
  "lowerLeft",
  "lowerRight",
]);
const ValidationRuleSchema = z
  .object({
    code: z.string().min(1),
    propertyKey: z.string().optional(),
    configuration: z.record(z.string(), z.json()),
  })
  .strict();
const ComponentRowSchema = z
  .object({
    id: z.string(),
    showId: z.string(),
    name: z.string().trim().min(1).max(200),
    type: z.enum(BUILT_IN_COMPONENT_TYPES),
    propertySchemaJson: z.string(),
    defaultPropertiesJson: z.string(),
    defaultEnterAnimationJson: z.string(),
    defaultExitAnimationJson: z.string(),
    supportedSlotRolesJson: z.string(),
    validationRulesJson: z.string(),
    archivedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

const parseJsonObject = (value: string): JsonObject =>
  z.record(z.string(), z.json()).parse(JSON.parse(value) as unknown);

const parseComponentRow = (value: unknown): Component => {
  try {
    const row = ComponentRowSchema.parse(value);
    const createdAt = parseUtcTimestamp(row.createdAt);
    const updatedAt = parseUtcTimestamp(row.updatedAt);
    const archivedAt =
      row.archivedAt === null ? null : parseUtcTimestamp(row.archivedAt);
    if (
      updatedAt < createdAt ||
      (archivedAt !== null && archivedAt < createdAt)
    ) {
      throw new RangeError("Invalid Component timestamps.");
    }
    return {
      id: parseEntityId<"component">(row.id),
      showId: parseEntityId<"show">(row.showId),
      name: row.name,
      type: row.type,
      propertySchema: PropertySchema.parse(
        JSON.parse(row.propertySchemaJson) as unknown,
      ).map(({ defaultValue, ...property }) =>
        defaultValue === undefined
          ? property
          : { ...property, defaultValue: defaultValue as JsonValue },
      ),
      defaultProperties: parseJsonObject(row.defaultPropertiesJson),
      defaultEnterAnimation: AnimationSchema.parse(
        JSON.parse(row.defaultEnterAnimationJson) as unknown,
      ),
      defaultExitAnimation: AnimationSchema.parse(
        JSON.parse(row.defaultExitAnimationJson) as unknown,
      ),
      supportedSlotRoles: z
        .array(SlotRoleSchema)
        .parse(JSON.parse(row.supportedSlotRolesJson) as unknown),
      validationRules: z
        .array(ValidationRuleSchema)
        .parse(JSON.parse(row.validationRulesJson) as unknown)
        .map(({ propertyKey, configuration, ...rule }) => ({
          ...rule,
          configuration: configuration as JsonObject,
          ...(propertyKey === undefined ? {} : { propertyKey }),
        })),
      ...(archivedAt === null ? {} : { archivedAt }),
      createdAt,
      updatedAt,
    };
  } catch (error) {
    throw new StoredLayoutError(error);
  }
};

export const ComponentRowParser = { parse: parseComponentRow };
export const COMPONENT_COLUMNS = `
  id,
  show_id AS showId,
  name,
  component_type AS type,
  property_schema_json AS propertySchemaJson,
  default_properties_json AS defaultPropertiesJson,
  default_enter_animation_json AS defaultEnterAnimationJson,
  default_exit_animation_json AS defaultExitAnimationJson,
  supported_slot_roles_json AS supportedSlotRolesJson,
  validation_rules_json AS validationRulesJson,
  archived_at AS archivedAt,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const writeComponent = (
  database: DatabaseExecutor,
  component: Component,
): void => {
  const valid = parseComponentRow({
    id: component.id,
    showId: component.showId,
    name: component.name,
    type: component.type,
    propertySchemaJson: JSON.stringify(component.propertySchema),
    defaultPropertiesJson: JSON.stringify(component.defaultProperties),
    defaultEnterAnimationJson: JSON.stringify(component.defaultEnterAnimation),
    defaultExitAnimationJson: JSON.stringify(component.defaultExitAnimation),
    supportedSlotRolesJson: JSON.stringify(component.supportedSlotRoles),
    validationRulesJson: JSON.stringify(component.validationRules),
    archivedAt: component.archivedAt ?? null,
    createdAt: component.createdAt,
    updatedAt: component.updatedAt,
  });
  database.run(
    `INSERT INTO components (
       id, show_id, name, component_type, property_schema_json,
       default_properties_json, default_enter_animation_json,
       default_exit_animation_json, supported_slot_roles_json,
       validation_rules_json, archived_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       show_id = excluded.show_id,
       name = excluded.name,
       component_type = excluded.component_type,
       property_schema_json = excluded.property_schema_json,
       default_properties_json = excluded.default_properties_json,
       default_enter_animation_json = excluded.default_enter_animation_json,
       default_exit_animation_json = excluded.default_exit_animation_json,
       supported_slot_roles_json = excluded.supported_slot_roles_json,
       validation_rules_json = excluded.validation_rules_json,
       archived_at = excluded.archived_at,
       updated_at = excluded.updated_at`,
    [
      valid.id,
      valid.showId,
      valid.name,
      valid.type,
      JSON.stringify(valid.propertySchema),
      JSON.stringify(valid.defaultProperties),
      JSON.stringify(valid.defaultEnterAnimation),
      JSON.stringify(valid.defaultExitAnimation),
      JSON.stringify(valid.supportedSlotRoles),
      JSON.stringify(valid.validationRules),
      valid.archivedAt ?? null,
      valid.createdAt,
      valid.updatedAt,
    ],
  );
};
