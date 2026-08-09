import { describe, expect, test } from "vitest";

import {
  createBuiltInComponent,
  createFixedClock,
  createLayout,
  parseEntityId,
  parseUtcTimestamp,
  type Component,
  type ComponentId,
  type ComponentPlacement,
  type DomainFactoryDependencies,
  type EntityId,
  type EntityIdKind,
  type Layout,
  type LayoutId,
  type Slot,
} from "@showflow/domain";

import { UpdateComponentPlacementCommand } from "./component-commands.mjs";

const id = <TEntity extends EntityIdKind>(suffix: number): EntityId<TEntity> =>
  parseEntityId<TEntity>(
    `01942c1f-ae8f-7e42-b912-${suffix.toString(16).padStart(12, "0")}`,
  );
const createdAt = parseUtcTimestamp("2026-08-09T12:00:00.000Z");
const updatedAt = parseUtcTimestamp("2026-08-09T12:01:00.000Z");
const dependencies: DomainFactoryDependencies = {
  clock: createFixedClock(updatedAt),
  createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
    id<TEntity>(99),
};

describe("Sprint 12 Component Placement commands", () => {
  test("12.7 persists and clears a Placement animation override", async () => {
    const showId = id<"show">(1);
    const component = createBuiltInComponent(
      showId,
      "lowerThird",
      dependencies,
    );
    const baseLayout = createLayout(
      { name: "Interview", showId },
      {
        clock: createFixedClock(createdAt),
        createId: <TEntity extends EntityIdKind>(): EntityId<TEntity> =>
          id<TEntity>(2),
      },
    );
    const slot = {
      alignment: "stretch",
      allowedComponentTypes: ["lowerThird"],
      bounds: { height: 0.2, width: 0.5, x: 0.1, y: 0.7 },
      clipContent: true,
      createdAt,
      id: id<"slot">(3),
      layerOrder: 1,
      layoutId: baseLayout.id,
      name: "Lower third",
      role: "lowerThird",
      safeMargins: { bottom: 0, left: 0, right: 0, top: 0 },
      updatedAt: createdAt,
    } satisfies Slot;
    const placement = {
      bindings: {},
      componentId: component.id,
      createdAt,
      fixedProperties: {},
      id: id<"componentPlacement">(4),
      layoutId: baseLayout.id,
      slotId: slot.id,
      updatedAt: createdAt,
      visibleByDefault: true,
    } satisfies ComponentPlacement;
    const layout = {
      ...baseLayout,
      componentPlacements: [placement],
      slots: [slot],
    } satisfies Layout;
    const components = new Map<ComponentId, Component>([
      [component.id, component],
    ]);
    const layouts = new Map<LayoutId, Layout>([[layout.id, layout]]);
    const repositories = {
      components: {
        getById: async (componentId: ComponentId) =>
          components.get(componentId) ?? null,
        listByShowId: async () => [...components.values()],
        save: async (value: Component) => {
          components.set(value.id, value);
        },
      },
      layouts: {
        getById: async (layoutId: LayoutId) => layouts.get(layoutId) ?? null,
        listByShowId: async () => [...layouts.values()],
        save: async (value: Layout) => {
          layouts.set(value.id, value);
        },
      },
    };
    const command = new UpdateComponentPlacementCommand(
      repositories,
      dependencies,
    );
    const override = {
      delayMs: 50,
      durationMs: 250,
      easing: "ease-in-out",
      preset: "fade" as const,
    };

    const saved = await command.execute({
      bindings: {},
      enterAnimationOverride: override,
      expectedUpdatedAt: createdAt,
      fixedProperties: {},
      layoutId: layout.id,
      placementId: placement.id,
      showId,
      visibleByDefault: true,
    });
    expect(saved.componentPlacements[0]?.enterAnimationOverride).toEqual(
      override,
    );

    const cleared = await command.execute({
      bindings: {},
      enterAnimationOverride: null,
      expectedUpdatedAt: updatedAt,
      fixedProperties: {},
      layoutId: layout.id,
      placementId: placement.id,
      showId,
      visibleByDefault: true,
    });
    expect(
      cleared.componentPlacements[0]?.enterAnimationOverride,
    ).toBeUndefined();
  });
});
