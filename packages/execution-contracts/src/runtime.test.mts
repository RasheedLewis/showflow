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
const videoLayout = { id: "layout-video", name: "Fullscreen Media" };
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

    expect(
      states.filter((state, index) => state !== states[index - 1]),
    ).toEqual([
      "idle",
      "preparing",
      "entering",
      "active",
      "exiting",
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
      "activate:Fullscreen Media",
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
      "deactivate:Fullscreen Media",
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
      "waitForDuration",
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

describe("Sprint 12A duration execution", () => {
  const waitUntilPending = async (
    clock: ReturnType<typeof createFakeExecutionClock>,
  ): Promise<void> => {
    for (
      let index = 0;
      index < 12 && clock.pendingWaitCount() === 0;
      index += 1
    ) {
      await Promise.resolve();
    }
    expect(clock.pendingWaitCount()).toBe(1);
  };

  it("12A.T3 preserves activation, hold, and Active Layout instruction order", () => {
    const generated = generateSegmentInstructions({
      components: [],
      layouts: [
        { ...hostLayout, componentPlacements: [] },
        { ...videoLayout, componentPlacements: [] },
      ],
      resources: [],
      segment: {
        id: segment.id,
        layoutIds: [hostLayout.id, videoLayout.id],
        lifecycle: {
          prepare: [],
          enter: [
            { kind: "activateLayout", layoutId: hostLayout.id },
            { kind: "waitForDuration", durationMs: 3_000 },
          ],
          active: {
            availableLayoutIds: [hostLayout.id, videoLayout.id],
            defaultLayoutId: videoLayout.id,
          },
          exit: [],
          cleanup: [],
        },
        name: segment.name,
      },
    });

    expect([...generated.enter, ...generated.active]).toEqual([
      { kind: "activateLayout", layout: hostLayout },
      { kind: "waitForDuration", durationMs: 3_000 },
      {
        availableLayouts: [hostLayout, videoLayout],
        defaultLayout: videoLayout,
        kind: "setActiveDefaults",
      },
      { kind: "activateLayout", layout: videoLayout },
      {
        durationMs: 0,
        kind: "waitForAnimationCompletion",
        layout: videoLayout,
      },
    ]);
  });

  it("12A.T4 stays pending before 3000ms and completes at exactly 3000ms", async () => {
    const clock = createFakeExecutionClock();
    const runtime = new SegmentRuntime(adapterHarness().adapter, clock);
    const entering = runtime.enter(
      plan({ enter: [{ kind: "waitForDuration", durationMs: 3_000 }] }),
    );
    await waitUntilPending(clock);

    clock.advanceBy(2_999);
    await Promise.resolve();
    expect(runtime.snapshot.state).toBe("entering");
    expect(runtime.snapshot.progress).toMatchObject({
      actionIndex: 0,
      actionKind: "waitForDuration",
      phase: "enter",
      remainingDurationMs: 1,
    });

    clock.advanceBy(1);
    await entering;
    expect(runtime.snapshot.state).toBe("active");
  });

  it("12A.T5 stop, Segment jump, and Layout change cancel a duration hold", async () => {
    const cancelWith = async (
      operation: (
        runtime: SegmentRuntime,
        entering: Promise<void>,
      ) => Promise<void>,
    ): Promise<void> => {
      const clock = createFakeExecutionClock();
      const runtime = new SegmentRuntime(adapterHarness().adapter, clock);
      const entering = runtime.enter(
        plan({ enter: [{ kind: "waitForDuration", durationMs: 3_000 }] }),
      );
      await waitUntilPending(clock);
      await operation(runtime, entering);
      await entering;
      expect(clock.pendingWaitCount()).toBe(0);
      clock.advanceBy(3_000);
      await Promise.resolve();
    };

    await cancelWith(async (runtime) => runtime.stop());
    await cancelWith(async (runtime) =>
      runtime.jump(
        plan({ active: [{ kind: "activateLayout", layout: videoLayout }] }),
      ),
    );
    await cancelWith(async (runtime) => runtime.switchLayout(videoLayout));
  });

  it("12A.T5 restart cancels the old hold before starting a new run", async () => {
    const clock = createFakeExecutionClock();
    const runtime = new SegmentRuntime(adapterHarness().adapter, clock);
    const firstRun = runtime.enter(
      plan({ enter: [{ kind: "waitForDuration", durationMs: 3_000 }] }),
    );
    await waitUntilPending(clock);
    const restarted = runtime.restart();
    await firstRun;
    await waitUntilPending(clock);
    expect(clock.pendingWaitCount()).toBe(1);
    clock.advanceBy(3_000);
    await restarted;
    expect(runtime.snapshot.state).toBe("active");
  });

  it("12A.T6 does not shorten an explicit hold for reduced motion", async () => {
    const clock = createFakeExecutionClock();
    const runtime = new SegmentRuntime(
      adapterHarness({ reducedMotion: true }).adapter,
      clock,
    );
    const entering = runtime.enter(
      plan({ enter: [{ kind: "waitForDuration", durationMs: 3_000 }] }),
    );
    await waitUntilPending(clock);
    clock.advanceBy(2_999);
    await Promise.resolve();
    expect(runtime.snapshot.state).toBe("entering");
    clock.advanceBy(1);
    await entering;
    expect(runtime.snapshot.state).toBe("active");
  });

  it("12A.T11 emits serializable phase, action, Layout, and remaining-time progress", async () => {
    const clock = createFakeExecutionClock();
    const runtime = new SegmentRuntime(adapterHarness().adapter, clock);
    const snapshots: string[] = [];
    runtime.subscribe((snapshot) => snapshots.push(JSON.stringify(snapshot)));
    const entering = runtime.enter(
      plan({
        enter: [
          { kind: "activateLayout", layout: hostLayout },
          { kind: "waitForDuration", durationMs: 3_000 },
        ],
      }),
    );
    await waitUntilPending(clock);

    expect(runtime.snapshot.progress).toEqual({
      actionIndex: 1,
      actionKind: "waitForDuration",
      activeLayoutId: hostLayout.id,
      phase: "enter",
      remainingDurationMs: 3_000,
    });
    clock.advanceBy(3_000);
    await entering;
    expect(runtime.snapshot.progress).toMatchObject({
      actionIndex: null,
      actionKind: null,
      activeLayoutId: hostLayout.id,
      phase: "active",
      remainingDurationMs: null,
    });
    expect(snapshots.every((snapshot) => JSON.parse(snapshot) !== null)).toBe(
      true,
    );
  });
});
