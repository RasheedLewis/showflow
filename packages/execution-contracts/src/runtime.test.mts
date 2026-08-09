import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import {
  ANIMATION_PRESETS,
  EXECUTION_INSTRUCTION_KINDS,
  SegmentRuntime,
  ProductionExecutionError,
  assertRuntimeTransition,
  createFakeExecutionClock,
  generateSegmentInstructions,
  getAnimationCompletionMs,
  getAnimationDefinition,
  type ExecutionContext,
  type ProductionExecutionAdapter,
  type ResourceExecutionTarget,
  type SegmentExecutionPlan,
} from "./index.js";

const segment = { id: "segment-opening", name: "Opening" };
const hostLayout = { id: "layout-host", name: "Host Layout" };
const videoLayout = { id: "layout-video", name: "Fullscreen Video" };
const clip = { id: "resource-clip", name: "Opening clip", category: "video" };

const productionTypeScriptFiles = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return productionTypeScriptFiles(path);
    return /\.(?:ts|tsx|mts)$/u.test(entry.name) &&
      !/\.(?:test|spec)\./u.test(entry.name)
      ? [path]
      : [];
  });

const plan = (
  patch: Partial<Omit<SegmentExecutionPlan, "segment">> = {},
): SegmentExecutionPlan => ({
  segment,
  prepare: [],
  enter: [],
  active: [
    {
      availableLayouts: [hostLayout, videoLayout],
      defaultLayout: hostLayout,
      kind: "setActiveDefaults",
    },
    { kind: "activateLayout", layout: hostLayout },
  ],
  exit: [],
  cleanup: [{ kind: "clearTemporaryState" }],
  ...patch,
});

interface AdapterHarness {
  readonly adapter: ProductionExecutionAdapter;
  readonly events: string[];
}

const adapterHarness = (
  options: {
    readonly failPreload?: boolean;
    readonly mediaWait?: (
      resource: ResourceExecutionTarget | undefined,
      context: ExecutionContext,
    ) => Promise<void>;
    readonly reducedMotion?: boolean;
  } = {},
): AdapterHarness => {
  const events: string[] = [];
  return {
    events,
    adapter: {
      activateLayout: async (layout) => {
        events.push(`activate:${layout.name}`);
      },
      clearTemporaryState: async () => {
        events.push("clear");
      },
      deactivateLayout: async (layout) => {
        events.push(`deactivate:${layout.name}`);
      },
      playResource: async (resource) => {
        events.push(`play:${resource.name}`);
      },
      preloadResource: async (resource) => {
        events.push(`preload:${resource.name}`);
        if (options.failPreload === true) {
          throw new ProductionExecutionError(
            "Locate or replace this Resource, then retry.",
            resource,
          );
        }
      },
      setActiveDefaults: async () => {
        events.push("active-defaults");
      },
      stopResource: async (resource) => {
        events.push(`stop:${resource.name}`);
      },
      waitForAnimation: async (instruction, context) => {
        events.push(`wait-animation:${instruction.durationMs}`);
        await context.clock.wait(
          options.reducedMotion === true ? 0 : instruction.durationMs,
          context.signal,
        );
      },
      waitForMedia:
        options.mediaWait ??
        (async (resource) => {
          events.push(`wait-media:${resource?.name ?? "active media"}`);
        }),
    },
  };
};

describe("Sprint 12 execution contracts", () => {
  it("12.T1 follows the fixed lifecycle state order", async () => {
    const clock = createFakeExecutionClock();
    const harness = adapterHarness();
    const runtime = new SegmentRuntime(harness.adapter, clock);
    const states: string[] = [];
    runtime.subscribe(({ state }) => states.push(state));

    await runtime.enter(plan());
    await runtime.exit();

    expect(states).toEqual([
      "idle",
      "idle",
      "preparing",
      "entering",
      "entering",
      "active",
      "exiting",
      "exiting",
      "cleaningUp",
      "cleaningUp",
      "stopped",
    ]);
  });

  it("12.T2 rejects impossible lifecycle transitions", () => {
    expect(() => assertRuntimeTransition("idle", "active")).toThrow(
      "cannot move from idle to active",
    );
    expect(() => assertRuntimeTransition("active", "preparing")).toThrow(
      "cannot move from active to preparing",
    );
  });

  it("12.T3 generates an exact normalized instruction list", () => {
    const generated = generateSegmentInstructions({
      components: [
        {
          id: "component-video",
          defaultEnterAnimation: {
            preset: "fade",
            delayMs: 20,
            durationMs: 200,
            easing: "ease",
          },
          defaultExitAnimation: {
            preset: "fade",
            delayMs: 0,
            durationMs: 140,
            easing: "ease",
          },
        },
      ],
      layouts: [
        {
          id: hostLayout.id,
          name: hostLayout.name,
          componentPlacements: [
            {
              componentId: "component-video",
              bindings: {
                media: { kind: "resource", resourceId: clip.id },
              },
            },
          ],
        },
      ],
      resources: [{ id: clip.id, displayName: clip.name, category: "video" }],
      segment: {
        id: segment.id,
        name: segment.name,
        layoutIds: [hostLayout.id],
        lifecycle: {
          prepare: [],
          enter: [
            { kind: "activateLayout", layoutId: hostLayout.id },
            { kind: "waitForAnimationCompletion" },
            { kind: "startMedia", resourceId: clip.id },
          ],
          active: {
            availableLayoutIds: [hostLayout.id],
            defaultLayoutId: hostLayout.id,
          },
          exit: [{ kind: "waitForMediaCompletion", resourceId: clip.id }],
          cleanup: [],
        },
      },
    });

    expect(generated).toEqual({
      segment,
      prepare: [{ kind: "preloadResource", resource: clip }],
      enter: [
        { kind: "activateLayout", layout: hostLayout },
        {
          durationMs: 220,
          kind: "waitForAnimationCompletion",
          layout: hostLayout,
        },
        { kind: "playResource", resource: clip },
      ],
      active: [
        {
          availableLayouts: [hostLayout],
          defaultLayout: hostLayout,
          kind: "setActiveDefaults",
        },
      ],
      exit: [{ kind: "waitForMediaCompletion", resource: clip }],
      cleanup: [
        { kind: "stopResource", resource: clip },
        { kind: "clearTemporaryState" },
      ],
    });
  });

  it("12.T4 prevents Enter and names the missing Resource", async () => {
    const harness = adapterHarness({ failPreload: true });
    const runtime = new SegmentRuntime(
      harness.adapter,
      createFakeExecutionClock(),
    );

    await runtime.enter(
      plan({ prepare: [{ kind: "preloadResource", resource: clip }] }),
    );

    expect(runtime.snapshot).toMatchObject({
      state: "failed",
      failure: {
        affectedObject: clip,
        canRetry: true,
        message: expect.stringContaining(
          "The Opening Segment could not use Opening clip.",
        ),
      },
    });
    expect(harness.events).not.toContain("activate:Host Layout");
  });

  it("12.T5 exits the prior Layout before activating the next one", async () => {
    const harness = adapterHarness();
    const runtime = new SegmentRuntime(
      harness.adapter,
      createFakeExecutionClock(),
    );
    await runtime.enter(plan());
    await runtime.switchLayout(videoLayout);

    expect(harness.events).toEqual([
      "active-defaults",
      "activate:Host Layout",
      "deactivate:Host Layout",
      "activate:Fullscreen Video",
      "wait-animation:0",
    ]);
  });

  it("12.T8 cancels a pending Layout change before starting the next one", async () => {
    const clock = createFakeExecutionClock();
    const harness = adapterHarness();
    const runtime = new SegmentRuntime(harness.adapter, clock);
    await runtime.enter(plan());

    const firstChange = runtime.switchLayout(videoLayout, 500);
    for (
      let index = 0;
      index < 8 && clock.pendingWaitCount() === 0;
      index += 1
    ) {
      await Promise.resolve();
    }
    expect(clock.pendingWaitCount()).toBe(1);

    const secondChange = runtime.switchLayout(hostLayout);
    await Promise.all([firstChange, secondChange]);

    expect(runtime.snapshot).toMatchObject({
      activeLayout: hostLayout,
      state: "active",
    });
    expect(clock.pendingWaitCount()).toBe(0);
    expect(harness.events.slice(-3)).toEqual([
      "deactivate:Fullscreen Video",
      "activate:Host Layout",
      "wait-animation:0",
    ]);
  });

  it("12.T6 waits for animation completion before becoming Active", async () => {
    const clock = createFakeExecutionClock();
    const harness = adapterHarness();
    const runtime = new SegmentRuntime(harness.adapter, clock);
    const entering = runtime.enter(
      plan({
        active: [
          { kind: "activateLayout", layout: hostLayout },
          {
            durationMs: 300,
            kind: "waitForAnimationCompletion",
            layout: hostLayout,
          },
        ],
      }),
    );
    for (
      let index = 0;
      index < 8 && clock.pendingWaitCount() === 0;
      index += 1
    ) {
      await Promise.resolve();
    }
    expect(runtime.snapshot.state).toBe("entering");
    expect(clock.pendingWaitCount()).toBe(1);

    clock.advanceBy(300);
    await entering;
    expect(runtime.snapshot.state).toBe("active");
  });

  it("12.T6 waits for the active Layout exit before Cleanup", async () => {
    let finishExit: (() => void) | undefined;
    const harness = adapterHarness();
    const adapter: ProductionExecutionAdapter = {
      ...harness.adapter,
      deactivateLayout: async (layout) => {
        harness.events.push(`deactivate:${layout.name}`);
        await new Promise<void>((resolve) => {
          finishExit = resolve;
        });
      },
    };
    const runtime = new SegmentRuntime(adapter, createFakeExecutionClock());
    await runtime.enter(plan());
    const exiting = runtime.exit();
    await Promise.resolve();

    expect(runtime.snapshot.state).toBe("exiting");
    expect(harness.events).not.toContain("clear");
    finishExit?.();
    await exiting;
    expect(runtime.snapshot.state).toBe("stopped");
    expect(harness.events.at(-1)).toBe("clear");
  });

  it("12.T7 resolves reduced motion without breaking completion", async () => {
    const clock = createFakeExecutionClock();
    const harness = adapterHarness({ reducedMotion: true });
    const runtime = new SegmentRuntime(harness.adapter, clock);

    await runtime.enter(
      plan({
        active: [
          {
            durationMs: 420,
            kind: "waitForAnimationCompletion",
            layout: hostLayout,
          },
        ],
      }),
    );

    expect(runtime.snapshot.state).toBe("active");
    expect(clock.pendingWaitCount()).toBe(0);
    expect(
      getAnimationCompletionMs(
        { preset: "slideUp", durationMs: 420, delayMs: 40, easing: "ease" },
        true,
      ),
    ).toBe(0);
  });

  it("12.T8 cancels pending media and clears temporary state on Stop", async () => {
    const mediaWait = vi.fn(
      (
        _resource: ResourceExecutionTarget | undefined,
        context: ExecutionContext,
      ) =>
        new Promise<void>((_resolve, reject) => {
          context.signal.addEventListener(
            "abort",
            () => {
              const error = new Error("cancelled");
              error.name = "AbortError";
              reject(error);
            },
            { once: true },
          );
        }),
    );
    const harness = adapterHarness({ mediaWait });
    const runtime = new SegmentRuntime(
      harness.adapter,
      createFakeExecutionClock(),
    );
    const entering = runtime.enter(
      plan({ enter: [{ kind: "waitForMediaCompletion", resource: clip }] }),
    );
    await Promise.resolve();
    await runtime.stop();
    await entering;

    expect(runtime.snapshot).toMatchObject({ state: "stopped" });
    expect(mediaWait).toHaveBeenCalledOnce();
    expect(harness.events.at(-1)).toBe("clear");
  });

  it("12.T9 restarts from clean state and replays the Segment", async () => {
    const harness = adapterHarness();
    const runtime = new SegmentRuntime(
      harness.adapter,
      createFakeExecutionClock(),
    );
    await runtime.enter(plan());
    await runtime.restart();

    expect(runtime.snapshot).toMatchObject({
      activeLayout: hostLayout,
      state: "active",
    });
    expect(harness.events.filter((event) => event === "clear")).toHaveLength(1);
    expect(
      harness.events.filter((event) => event === "activate:Host Layout"),
    ).toHaveLength(2);
  });

  it("12.T8 jumps by cancelling the pending Segment before entering the next one", async () => {
    const clock = createFakeExecutionClock();
    const harness = adapterHarness();
    const runtime = new SegmentRuntime(harness.adapter, clock);
    const firstRun = runtime.enter(
      plan({
        active: [
          { kind: "activateLayout", layout: hostLayout },
          {
            durationMs: 500,
            kind: "waitForAnimationCompletion",
            layout: hostLayout,
          },
        ],
      }),
    );
    for (
      let index = 0;
      index < 8 && clock.pendingWaitCount() === 0;
      index += 1
    ) {
      await Promise.resolve();
    }
    const nextSegment = { id: "segment-interview", name: "Interview" };

    await runtime.jump({
      ...plan({
        active: [{ kind: "activateLayout", layout: videoLayout }],
      }),
      segment: nextSegment,
    });
    await firstRun;

    expect(runtime.snapshot).toMatchObject({
      activeLayout: videoLayout,
      segment: nextSegment,
      state: "active",
    });
    expect(harness.events).toContain("clear");
  });

  it("12.T10 advances only after media completion", async () => {
    let completeMedia: (() => void) | undefined;
    const harness = adapterHarness({
      mediaWait: async () =>
        new Promise<void>((resolve) => {
          completeMedia = resolve;
        }),
    });
    const runtime = new SegmentRuntime(
      harness.adapter,
      createFakeExecutionClock(),
    );
    const entering = runtime.enter(
      plan({ enter: [{ kind: "waitForMediaCompletion", resource: clip }] }),
    );
    await Promise.resolve();
    expect(runtime.snapshot.state).toBe("entering");
    completeMedia?.();
    await entering;
    expect(runtime.snapshot.state).toBe("active");
  });

  it("12.T13 exposes presets and instructions without a user timeline model", () => {
    expect(ANIMATION_PRESETS).toEqual([
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
    ]);
    expect(getAnimationDefinition("wipe")).toMatchObject({ label: "Wipe" });
    expect(EXECUTION_INSTRUCTION_KINDS).toEqual([
      "preloadResource",
      "activateLayout",
      "playResource",
      "stopResource",
      "waitForAnimationCompletion",
      "waitForMediaCompletion",
      "setActiveDefaults",
      "clearTemporaryState",
    ]);
    expect(EXECUTION_INSTRUCTION_KINDS.join(" ")).not.toMatch(
      /keyframe|timeline/iu,
    );
    const architectureSources = [
      resolve(import.meta.dirname, "../../domain/src"),
      resolve(import.meta.dirname, "../../contracts/src"),
      import.meta.dirname,
    ].flatMap(productionTypeScriptFiles);
    const userTimelineDeclarations = architectureSources.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const declaration = source.match(
        /\b(?:class|const|interface|type)\s+\w*(?:Keyframe|Timeline)\w*/u,
      )?.[0];
      return declaration === undefined ? [] : [{ declaration, path }];
    });
    expect(userTimelineDeclarations).toEqual([]);
  });
});
