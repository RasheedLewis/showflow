import { z } from "zod";

import { ApiErrorSchema } from "./api-result.ts";

export const COMPONENTS_LIST_CHANNEL = "showflow:v1:components:list" as const;
export const COMPONENTS_ASSIGN_CHANNEL =
  "showflow:v1:components:assign" as const;
export const COMPONENTS_UPDATE_PLACEMENT_CHANNEL =
  "showflow:v1:components:update-placement" as const;
export const COMPONENTS_REMOVE_PLACEMENT_CHANNEL =
  "showflow:v1:components:remove-placement" as const;

const TimestampSchema = z.string().datetime({ offset: true });
export const BuiltInComponentTypeSchema = z.enum([
  "camera",
  "video",
  "image",
  "text",
  "background",
  "logo",
  "lowerThird",
]);
export const AnimationConfigDtoSchema = z
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
export const BindingDtoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("literal"), value: z.json() }).strict(),
  z
    .object({ kind: z.literal("resource"), resourceId: z.string().uuid() })
    .strict(),
  z
    .object({ kind: z.literal("segmentField"), fieldKey: z.string().min(1) })
    .strict(),
  z
    .object({ kind: z.literal("episodeMetadata"), field: z.string().min(1) })
    .strict(),
  z
    .object({ kind: z.literal("showMetadata"), field: z.string().min(1) })
    .strict(),
]);
const PropertySchema = z
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
  .strict();
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
export const ComponentDtoSchema = z
  .object({
    id: z.string().uuid(),
    showId: z.string().uuid(),
    name: z.string().min(1).max(200),
    type: BuiltInComponentTypeSchema,
    propertySchema: z.array(PropertySchema),
    defaultProperties: z.record(z.string(), z.json()),
    defaultEnterAnimation: AnimationConfigDtoSchema,
    defaultExitAnimation: AnimationConfigDtoSchema,
    supportedSlotRoles: z.array(SlotRoleSchema),
    archivedAt: TimestampSchema.nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();
export const ComponentPlacementDtoSchema = z
  .object({
    id: z.string().uuid(),
    layoutId: z.string().uuid(),
    componentId: z.string().uuid(),
    slotId: z.string().uuid(),
    fixedProperties: z.record(z.string(), z.json()),
    bindings: z.record(z.string(), BindingDtoSchema),
    visibleByDefault: z.boolean(),
    layerOverride: z.number().int().nonnegative().nullable(),
    enterAnimationOverride: AnimationConfigDtoSchema.nullable(),
    exitAnimationOverride: AnimationConfigDtoSchema.nullable(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
  .strict();

const ScopeSchema = z
  .object({
    studioId: z.string().uuid(),
    showId: z.string().uuid(),
  })
  .strict();
const PlacementMutationSchema = ScopeSchema.extend({
  layoutId: z.string().uuid(),
  expectedUpdatedAt: TimestampSchema,
}).strict();
export const ListComponentsRequestSchema = ScopeSchema;
export const AssignComponentRequestSchema = PlacementMutationSchema.extend({
  slotId: z.string().uuid(),
  componentType: BuiltInComponentTypeSchema,
}).strict();
export const UpdateComponentPlacementRequestSchema =
  PlacementMutationSchema.extend({
    placementId: z.string().uuid(),
    fixedProperties: z.record(z.string(), z.json()),
    bindings: z.record(z.string(), BindingDtoSchema),
    visibleByDefault: z.boolean(),
  }).strict();
export const RemoveComponentPlacementRequestSchema =
  PlacementMutationSchema.extend({
    placementId: z.string().uuid(),
  }).strict();
export const ComponentListResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.array(ComponentDtoSchema) }).strict(),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }).strict(),
]);

export type BuiltInComponentTypeDto = z.infer<
  typeof BuiltInComponentTypeSchema
>;
export type BindingDto = z.infer<typeof BindingDtoSchema>;
export type ComponentDto = z.infer<typeof ComponentDtoSchema>;
export type ComponentPlacementDto = z.infer<typeof ComponentPlacementDtoSchema>;
export type ListComponentsRequest = z.infer<typeof ListComponentsRequestSchema>;
export type AssignComponentRequest = z.infer<
  typeof AssignComponentRequestSchema
>;
export type UpdateComponentPlacementRequest = z.infer<
  typeof UpdateComponentPlacementRequestSchema
>;
export type RemoveComponentPlacementRequest = z.infer<
  typeof RemoveComponentPlacementRequestSchema
>;
export type ComponentListResult = z.infer<typeof ComponentListResultSchema>;
